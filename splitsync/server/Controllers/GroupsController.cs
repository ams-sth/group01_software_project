using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;
using SplitSync.Api.Models;

namespace SplitSync.Api.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class GroupsController(AppDbContext db, UserManager<AppUser> userManager) : ControllerBase
{
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
        group.Members.Add(new GroupMember { GroupId = group.Id, UserId = userId });

        db.Groups.Add(group);
        await db.SaveChangesAsync();

        return Ok(await ToResponse(group.Id));
    }

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

        db.Groups.Remove(group);
        await db.SaveChangesAsync();

        return NoContent();
    }

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

        return Ok(await ToResponse(id));
    }

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

        return Ok(await ToResponse(id));
    }

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
