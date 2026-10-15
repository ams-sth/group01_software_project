using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;
using SplitSync.Api.Models;
using SplitSync.Api.Services;

namespace SplitSync.Api.Controllers;

// Manages spending groups and their membership. All endpoints require authentication.
// Only the group creator can rename, delete, add members or remove members —
// regular members can only list, join by ID, or leave.
[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController(AppDbContext db, UserManager<AppUser> userManager, NotificationService notifications) : ControllerBase
{
    // POST /api/groups
    // Creates a new group and automatically adds the creator as the first member.
    [HttpPost]
    public async Task<ActionResult<GroupResponse>> Create(CreateGroupRequest request)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = new Group
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            CreatorId = userId,
        };
        // Creator is added as a member immediately so they can start adding expenses.
        group.Members.Add(new GroupMember { GroupId = group.Id, UserId = userId });

        db.Groups.Add(group);
        await db.SaveChangesAsync();

        return Ok(await ToResponse(group.Id));
    }

    // GET /api/groups
    // Returns all groups the signed-in user belongs to (looked up via GroupMembers join table).
    [HttpGet]
    public async Task<ActionResult<List<GroupResponse>>> List()
    {
        var userId = User.FindFirst("sub")!.Value;

        var groupIds = await db.GroupMembers
            .Where(gm => gm.UserId == userId)
            .Select(gm => gm.GroupId)
            .ToListAsync();

        var groups = new List<GroupResponse>();
        foreach (var id in groupIds)
        {
            groups.Add(await ToResponse(id));
        }
        return Ok(groups);
    }

    // PATCH /api/groups/{id}
    // Renames a group. Creator only — regular members cannot rename.
    [HttpPatch("{id}")]
    public async Task<ActionResult<GroupResponse>> Rename(Guid id, RenameGroupRequest request)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (group.CreatorId != userId)
        {
            return Forbid();
        }

        group.Name = request.Name;
        await db.SaveChangesAsync();

        return Ok(await ToResponse(id));
    }

    // DELETE /api/groups/{id}
    // Deletes the group and notifies all other members. Creator only.
    // Cascade deletes in the database remove all related expenses, shares, settlements
    // and notifications when the group row is removed.
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (group.CreatorId != userId)
        {
            return Forbid();
        }

        // Collect other member IDs and the group name before deleting,
        // since we need them for notifications after the group is gone.
        var otherMemberIds = await db.GroupMembers
            .Where(gm => gm.GroupId == id && gm.UserId != userId)
            .Select(gm => gm.UserId)
            .ToListAsync();
        var groupName = group.Name;

        db.Groups.Remove(group);
        await db.SaveChangesAsync();

        // Notify everyone else that the group was deleted. GroupId is null in the
        // notification because the group no longer exists — the message text carries enough context.
        var actorUsername = User.FindFirst("unique_name")!.Value;
        await notifications.NotifyManyAsync(otherMemberIds, $"{actorUsername} deleted \"{groupName}\"");

        return NoContent();
    }

    // DELETE /api/groups/{id}/members/{username}
    // Removes a member from the group. Creator only — and the creator cannot remove themselves.
    // The removed member receives a notification.
    [HttpDelete("{id}/members/{username}")]
    public async Task<ActionResult<GroupResponse>> RemoveMember(Guid id, string username)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (group.CreatorId != userId)
        {
            return Forbid();
        }

        var targetUser = await userManager.FindByNameAsync(username);
        if (targetUser is null)
        {
            return NotFound(new { message = "No user with that username." });
        }

        // The creator cannot be removed — the group must be deleted instead.
        // This prevents the group from being left in an ownerless state.
        if (targetUser.Id == group.CreatorId)
        {
            return BadRequest(new { message = "The group creator can't be removed. Delete the group instead." });
        }

        var membership = await db.GroupMembers.FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == targetUser.Id);
        if (membership is null)
        {
            return NotFound(new { message = "That user isn't in this group." });
        }

        db.GroupMembers.Remove(membership);
        await db.SaveChangesAsync();

        var actorUsername = User.FindFirst("unique_name")!.Value;
        await notifications.NotifyAsync(targetUser.Id, $"{actorUsername} removed you from \"{group.Name}\"", group.Id);

        return Ok(await ToResponse(id));
    }

    // POST /api/groups/{id}/leave
    // Lets a member leave a group voluntarily. The creator cannot leave — they must
    // delete the group instead so it is never left without an owner.
    [HttpPost("{id}/leave")]
    public async Task<IActionResult> Leave(Guid id)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (group.CreatorId == userId)
        {
            return BadRequest(new { message = "The group creator can't leave. Delete the group instead." });
        }

        var membership = await db.GroupMembers.FirstOrDefaultAsync(gm => gm.GroupId == id && gm.UserId == userId);
        if (membership is null)
        {
            return NotFound(new { message = "You're not in this group." });
        }

        db.GroupMembers.Remove(membership);
        await db.SaveChangesAsync();

        return NoContent();
    }

    // GET /api/groups/{id}/member-candidates?q=
    // Searches usernames to suggest when adding a member. Creator only.
    // Requires at least 2 characters to avoid returning the entire user table.
    // Uses ILike (Postgres case-insensitive LIKE) — this won't run on the in-memory
    // test database, which is why this endpoint is not covered by the integration tests.
    [HttpGet("{id}/member-candidates")]
    public async Task<ActionResult<List<string>>> SearchMemberCandidates(Guid id, [FromQuery] string q)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (group.CreatorId != userId)
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
        {
            return Ok(new List<string>());
        }

        // Fetch current members first so we can exclude them from the results.
        var existingUsernames = await db.GroupMembers
            .Where(gm => gm.GroupId == id)
            .Select(gm => gm.User.UserName!)
            .ToListAsync();

        var trimmedQuery = q.Trim();
        var matches = await userManager.Users
            .Where(u => u.UserName != null && EF.Functions.ILike(u.UserName, $"%{trimmedQuery}%"))
            .OrderBy(u => u.UserName)
            .Select(u => u.UserName!)
            .Take(10)
            .ToListAsync();

        // Return at most 5 results, excluding people who are already in the group.
        return Ok(matches.Where(username => !existingUsernames.Contains(username)).Take(5).ToList());
    }

    // POST /api/groups/{id}/members
    // Adds a member to the group by username. Creator only.
    // The added user receives a notification.
    [HttpPost("{id}/members")]
    public async Task<ActionResult<GroupResponse>> AddMember(Guid id, AddMemberRequest request)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "Group not found." });
        }

        if (group.CreatorId != userId)
        {
            return Forbid();
        }

        var targetUser = await userManager.FindByNameAsync(request.Username);
        if (targetUser is null)
        {
            return NotFound(new { message = "No user with that username." });
        }

        var alreadyMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == id && gm.UserId == targetUser.Id);
        if (alreadyMember)
        {
            return Conflict(new { message = "That user is already in this group." });
        }

        db.GroupMembers.Add(new GroupMember { GroupId = id, UserId = targetUser.Id });
        await db.SaveChangesAsync();

        var actorUsername = User.FindFirst("unique_name")!.Value;
        await notifications.NotifyAsync(targetUser.Id, $"{actorUsername} added you to \"{group.Name}\"", group.Id);

        return Ok(await ToResponse(id));
    }

    // POST /api/groups/{id}/join
    // Lets any authenticated user join a group using its ID (shared out-of-band, e.g. via chat).
    // Anyone can join — no creator approval required.
    [HttpPost("{id}/join")]
    public async Task<ActionResult<GroupResponse>> Join(Guid id)
    {
        var userId = User.FindFirst("sub")!.Value;

        var group = await db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null)
        {
            return NotFound(new { message = "No group with that ID." });
        }

        var alreadyMember = await db.GroupMembers.AnyAsync(gm => gm.GroupId == id && gm.UserId == userId);
        if (alreadyMember)
        {
            return Conflict(new { message = "You're already in this group." });
        }

        db.GroupMembers.Add(new GroupMember { GroupId = id, UserId = userId });
        await db.SaveChangesAsync();

        return Ok(await ToResponse(id));
    }

    // Loads the full group with creator and member usernames from the database.
    // Used by every endpoint that returns a GroupResponse so the mapping logic
    // lives in one place.
    private async Task<GroupResponse> ToResponse(Guid groupId)
    {
        var group = await db.Groups
            .Include(g => g.Creator)
            .Include(g => g.Members)
            .ThenInclude(gm => gm.User)
            .FirstAsync(g => g.Id == groupId);

        return new GroupResponse(
            group.Id,
            group.Name,
            group.Creator.UserName!,
            group.Members.Select(gm => gm.User.UserName!).ToList()
        );
    }
}
