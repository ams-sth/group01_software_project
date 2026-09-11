using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;
using SplitSync.Api.Models;

namespace SplitSync.Api.Controllers;

[ApiController]
[Route("api/groups/{groupId}")]
[Authorize]
public class SettlementsController(AppDbContext db, UserManager<AppUser> userManager) : ControllerBase
{
    // Balances shown are pairwise and only versus members who share a debt
    // with the signed-in user — balances between two OTHER members are
    // intentionally excluded, since they aren't this user's business.
    [HttpGet("balances")]
    public async Task<ActionResult<GroupBalancesResponse>> GetBalances(Guid groupId)
    {
        var userId = User.FindFirst("sub")!.Value;

        var isMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
        if (!isMember)
        {
            return Forbid();
        }

        // Positive = that user owes the signed-in user; negative = the signed-in user owes them.
        var netByUserId = new Dictionary<string, decimal>();
        void Adjust(string otherUserId, decimal delta)
        {
            netByUserId[otherUserId] = netByUserId.GetValueOrDefault(otherUserId) + delta;
        }

        var expenses = await db.Expenses
            .Where(e => e.GroupId == groupId)
            .Include(e => e.Shares)
            .ToListAsync();

        foreach (var expense in expenses)
        {
            foreach (var share in expense.Shares)
            {
                if (share.UserId == expense.PaidByUserId)
                {
                    continue; // the payer's own share isn't a debt to anyone
                }

                if (expense.PaidByUserId == userId)
                {
                    Adjust(share.UserId, share.Amount); // they owe the signed-in user
                }
                else if (share.UserId == userId)
                {
                    Adjust(expense.PaidByUserId, -share.Amount); // the signed-in user owes the payer
                }
            }
        }

        var settlements = await db.Settlements.Where(s => s.GroupId == groupId).ToListAsync();
        foreach (var settlement in settlements)
        {
            if (settlement.FromUserId == userId)
            {
                Adjust(settlement.ToUserId, settlement.Amount); // paying someone reduces what's owed to them
            }
            else if (settlement.ToUserId == userId)
            {
                Adjust(settlement.FromUserId, -settlement.Amount); // being paid reduces what they owe
            }
        }

        var otherUserIds = netByUserId
            .Where(kv => Math.Round(kv.Value, 2) != 0)
            .Select(kv => kv.Key)
            .ToList();

        var usernamesById = await db.Users
            .Where(u => otherUserIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UserName!);

        var balances = otherUserIds
            .Select(id => new MemberBalance(usernamesById[id], Math.Round(netByUserId[id], 2)))
            .OrderByDescending(b => b.NetAmount)
            .ToList();

        var youAreOwedTotal = balances.Where(b => b.NetAmount > 0).Sum(b => b.NetAmount);
        var youOweTotal = balances.Where(b => b.NetAmount < 0).Sum(b => -b.NetAmount);

        return Ok(new GroupBalancesResponse(youAreOwedTotal, youOweTotal, balances));
    }

    [HttpGet("settlements")]
    public async Task<ActionResult<List<SettlementResponse>>> List(Guid groupId)
    {
        var userId = User.FindFirst("sub")!.Value;

        var isMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
        if (!isMember)
        {
            return Forbid();
        }

        var settlements = await db.Settlements
            .Where(s => s.GroupId == groupId)
            .Include(s => s.FromUser)
            .Include(s => s.ToUser)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync();

        return Ok(settlements.Select(s => new SettlementResponse(s.Id, s.FromUser.UserName!, s.ToUser.UserName!, s.Amount, s.CreatedAt)).ToList());
    }

    [HttpPost("settlements")]
    public async Task<ActionResult<SettlementResponse>> Record(Guid groupId, CreateSettlementRequest request)
    {
        var userId = User.FindFirst("sub")!.Value;

        if (request.Amount <= 0)
        {
            return BadRequest(new { message = "Amount must be greater than zero." });
        }

        var isMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == userId);
        if (!isMember)
        {
            return Forbid();
        }

        var otherUser = await userManager.FindByNameAsync(request.Username);
        if (otherUser is null)
        {
            return NotFound(new { message = "No user with that username." });
        }

        if (otherUser.Id == userId)
        {
            return BadRequest(new { message = "You can't record a settlement with yourself." });
        }

        var otherIsMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == groupId && gm.UserId == otherUser.Id);
        if (!otherIsMember)
        {
            return BadRequest(new { message = $"{request.Username} isn't a member of this group." });
        }

        var settlement = new Settlement
        {
            Id = Guid.NewGuid(),
            GroupId = groupId,
            FromUserId = request.IPaid ? userId : otherUser.Id,
            ToUserId = request.IPaid ? otherUser.Id : userId,
            Amount = request.Amount,
            CreatedAt = DateTime.UtcNow,
        };

        db.Settlements.Add(settlement);
        await db.SaveChangesAsync();

        var currentUsername = User.FindFirst("unique_name")!.Value;
        return Ok(new SettlementResponse(
            settlement.Id,
            request.IPaid ? currentUsername : otherUser.UserName!,
            request.IPaid ? otherUser.UserName! : currentUsername,
            settlement.Amount,
            settlement.CreatedAt
        ));
    }
}
