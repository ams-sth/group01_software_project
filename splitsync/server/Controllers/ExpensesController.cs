using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;
using SplitSync.Api.Models;
using SplitSync.Api.Services;

namespace SplitSync.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId}/expenses")]
[Authorize]
public class ExpensesController(AppDbContext db, NotificationService notifications) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<ExpenseResponse>>> List(Guid groupId)
    {
        var userId = User.FindFirst("sub")!.Value;

        var isMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
        if (!isMember)
        {
            return Forbid();
        }

        var expenses = await db.Expenses
            .Where(e => e.GroupId == groupId)
            .Include(e => e.PaidByUser)
            .Include(e => e.Shares).ThenInclude(s => s.User)
            .OrderByDescending(e => e.CreatedAt)
            .ToListAsync();

        return Ok(expenses.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseResponse>> Create(Guid groupId, CreateExpenseRequest request)
    {
        var userId = User.FindFirst("sub")!.Value;

        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than zero." });
        }

        var group = await db.Groups
            .Include(g => g.Members).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(g => g.Id == groupId);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (!group.Members.Any(m => m.UserId == userId))
        {
            return Forbid();
        }

        var memberIdsByUsername = group.Members.ToDictionary(m => m.User.UserName!, m => m.UserId, StringComparer.OrdinalIgnoreCase);

        var (error, splitMethod, shares) = ValidateAndComputeShares(request.Amount, request.SplitMethod, request.Splits, memberIdsByUsername);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        var expense = new Expense
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            Description = request.Description,
            Amount = request.Amount,
            SplitMethod = splitMethod,
            PaidByUserId = userId,
            CreatedAt = DateTime.UtcNow,
        };

        foreach (var (memberId, shareAmount) in shares)
        {
            expense.Shares.Add(new ExpenseShare { ExpenseId = expense.Id, UserId = memberId, Amount = shareAmount });
        }

        db.Expenses.Add(expense);
        await db.SaveChangesAsync();

        var actorUsername = User.FindFirst("unique_name")!.Value;
        var otherMemberIds = group.Members.Select(m => m.UserId).Where(id => id != userId);
        await notifications.NotifyManyAsync(
            otherMemberIds,
            $"{actorUsername} added \"{expense.Description}\" (${expense.Amount:0.00}) in \"{group.Name}\"",
            group.Id
        );

        return Ok(await ToResponseAsync(expense.Id));
    }

    [HttpPatch("{expenseId}")]
    public async Task<ActionResult<ExpenseResponse>> Update(Guid groupId, Guid expenseId, CreateExpenseRequest request)
    {
        var userId = User.FindFirst("sub")!.Value;

        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than zero." });
        }

        var expense = await db.Expenses
            .Include(e => e.Shares)
            .FirstOrDefaultAsync(e => e.Id == expenseId && e.GroupId == groupId);
        if (expense is null)
        {
            return NotFound(new { message = "Expense not found." });
        }

        if (expense.PaidByUserId != userId)
        {
            return Forbid();
        }

        var group = await db.Groups
            .Include(g => g.Members).ThenInclude(m => m.User)
            .FirstAsync(g => g.Id == groupId);
        var memberIdsByUsername = group.Members.ToDictionary(m => m.User.UserName!, m => m.UserId, StringComparer.OrdinalIgnoreCase);

        var (error, splitMethod, shares) = ValidateAndComputeShares(request.Amount, request.SplitMethod, request.Splits, memberIdsByUsername);
        if (error is not null)
        {
            return BadRequest(new { message = error });
        }

        expense.Description = request.Description;
        expense.Amount = request.Amount;
        expense.SplitMethod = splitMethod;

        db.ExpenseShares.RemoveRange(expense.Shares);
        expense.Shares.Clear();
        foreach (var (memberId, shareAmount) in shares)
        {
            expense.Shares.Add(new ExpenseShare { ExpenseId = expense.Id, UserId = memberId, Amount = shareAmount });
        }

        await db.SaveChangesAsync();

        return Ok(await ToResponseAsync(expense.Id));
    }

    [HttpDelete("{expenseId}")]
    public async Task<IActionResult> Delete(Guid groupId, Guid expenseId)
    {
        var userId = User.FindFirst("sub")!.Value;

        var expense = await db.Expenses.FirstOrDefaultAsync(e => e.Id == expenseId && e.GroupId == groupId);
        if (expense is null)
        {
            return NotFound(new { message = "Expense not found." });
        }

        if (expense.PaidByUserId != userId)
        {
            return Forbid();
        }

        db.Expenses.Remove(expense);
        await db.SaveChangesAsync();

        return NoContent();
    }

    // Validates the split request and computes the resulting per-member shares.
    // Shared by Create and Update so the equal/unequal/percentage rules (and the
    // cent-accurate splitting) can't drift between the two.
    private static (string? Error, string SplitMethod, List<(string UserId, decimal Amount)> Shares) ValidateAndComputeShares(
        decimal amount, string? splitMethodRaw, List<ExpenseSplitInput> splits, Dictionary<string, string> memberIdsByUsername)
    {
        var splitMethod = splitMethodRaw?.Trim().ToLowerInvariant() ?? "";
        if (splitMethod is not ("equal" or "unequal" or "percentage"))
        {
            return ("Split method must be 'equal', 'unequal', or 'percentage'.", splitMethod, []);
        }

        if (splits is null || splits.Count == 0)
        {
            return ("Select at least one member to split with.", splitMethod, []);
        }

        var usernames = splits.Select(s => s.Username).ToList();
        if (usernames.Distinct(StringComparer.OrdinalIgnoreCase).Count() != usernames.Count)
        {
            return ("Each member can only appear once in the split.", splitMethod, []);
        }

        var resolvedUserIds = new List<string>();
        foreach (var username in usernames)
        {
            if (!memberIdsByUsername.TryGetValue(username, out var memberUserId))
            {
                return ($"{username} isn't a member of this group.", splitMethod, []);
            }
            resolvedUserIds.Add(memberUserId);
        }

        List<(string UserId, decimal Amount)> shares;
        switch (splitMethod)
        {
            case "equal":
                shares = SplitEqually(amount, resolvedUserIds);
                break;

            case "unequal":
                if (splits.Any(s => s.Amount is null or <= 0))
                {
                    return ("Enter an amount greater than zero for each selected member.", splitMethod, []);
                }
                var amountSum = splits.Sum(s => s.Amount!.Value);
                if (Math.Round(amountSum, 2) != Math.Round(amount, 2))
                {
                    return ($"Split amounts must add up to the total (${amount:0.00}), but they add up to ${amountSum:0.00}.", splitMethod, []);
                }
                shares = splits
                    .Select((s, i) => (resolvedUserIds[i], Math.Round(s.Amount!.Value, 2)))
                    .ToList();
                break;

            case "percentage":
                if (splits.Any(s => s.Percentage is null or <= 0))
                {
                    return ("Enter a percentage greater than zero for each selected member.", splitMethod, []);
                }
                var percentageSum = splits.Sum(s => s.Percentage!.Value);
                if (Math.Round(percentageSum, 2) != 100m)
                {
                    return ($"Percentages must add up to 100%, but they add up to {percentageSum:0.##}%.", splitMethod, []);
                }
                shares = SplitByPercentage(
                    amount,
                    splits.Select((s, i) => (resolvedUserIds[i], s.Percentage!.Value)).ToList()
                );
                break;

            default:
                return ("Unknown split method.", splitMethod, []);
        }

        return (null, splitMethod, shares);
    }

    // Splits in integer cents so the shares always add back up to the original
    // amount exactly (dividing decimals directly can lose or invent a cent).
    // Any leftover cent(s) go to the first members in the list.
    private static List<(string UserId, decimal Amount)> SplitEqually(decimal amount, List<string> memberIds)
    {
        var totalCents = (long)Math.Round(amount * 100, MidpointRounding.AwayFromZero);
        var memberCount = memberIds.Count;
        var baseCents = totalCents / memberCount;
        var remainderCents = totalCents % memberCount;

        var shares = new List<(string, decimal)>();
        for (var i = 0; i < memberCount; i++)
        {
            var cents = baseCents + (i < remainderCents ? 1 : 0);
            shares.Add((memberIds[i], cents / 100m));
        }
        return shares;
    }

    // Largest-remainder method: floor each person's proportional cents, then
    // hand out the leftover cents (lost to flooring) to whoever's fractional
    // cent was largest, so the shares always add back up to the exact total.
    private static List<(string UserId, decimal Amount)> SplitByPercentage(decimal amount, List<(string UserId, decimal Percentage)> splits)
    {
        var totalCents = (long)Math.Round(amount * 100, MidpointRounding.AwayFromZero);

        var withRaw = splits
            .Select((s, index) =>
            {
                var rawCents = totalCents * s.Percentage / 100m;
                var floorCents = (long)Math.Floor(rawCents);
                return (s.UserId, floorCents, remainder: rawCents - floorCents, index);
            })
            .ToList();

        var leftover = totalCents - withRaw.Sum(w => w.floorCents);

        var byLargestRemainder = withRaw
            .OrderByDescending(w => w.remainder)
            .ThenBy(w => w.index)
            .ToList();

        var cents = withRaw.ToDictionary(w => w.index, w => w.floorCents);
        for (var i = 0; i < leftover; i++)
        {
            cents[byLargestRemainder[i].index] += 1;
        }

        return withRaw.Select(w => (w.UserId, cents[w.index] / 100m)).ToList();
    }

    private async Task<ExpenseResponse> ToResponseAsync(Guid expenseId)
    {
        var expense = await db.Expenses
            .Include(e => e.PaidByUser)
            .Include(e => e.Shares).ThenInclude(s => s.User)
            .FirstAsync(e => e.Id == expenseId);

        return ToResponse(expense);
    }

    private static ExpenseResponse ToResponse(Expense expense)
    {
        return new ExpenseResponse(
            expense.Id,
            expense.Description,
            expense.Amount,
            expense.PaidByUser.UserName!,
            expense.SplitMethod,
            expense.CreatedAt,
            expense.Shares.Select(s => new ExpenseShareResponse(s.User.UserName!, s.Amount)).ToList()
        );
    }
}
