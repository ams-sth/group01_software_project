using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<List<NotificationResponse>>> List()
    {
        var userId = User.FindFirst("sub")!.Value;

        var notifications = await db.Notifications
            .Where(n => n.RecipientUserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        return Ok(notifications.Select(n => new NotificationResponse(n.Id, n.Message, n.GroupId, n.IsRead, n.CreatedAt)).ToList());
    }

    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountResponse>> UnreadCount()
    {
        var userId = User.FindFirst("sub")!.Value;

        var count = await db.Notifications.CountAsync(n => n.RecipientUserId == userId && !n.IsRead);

        return Ok(new UnreadCountResponse(count));
    }

    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = User.FindFirst("sub")!.Value;

        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id);
        if (notification is null)
        {
            return NotFound();
        }

        if (notification.RecipientUserId != userId)
        {
            return Forbid();
        }

        notification.IsRead = true;
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpPost("read-all")]
    public async Task<IActionResult> MarkAllRead()
    {
        var userId = User.FindFirst("sub")!.Value;

        var unread = await db.Notifications
            .Where(n => n.RecipientUserId == userId && !n.IsRead)
            .ToListAsync();

        foreach (var notification in unread)
        {
            notification.IsRead = true;
        }
        await db.SaveChangesAsync();

        return NoContent();
    }
}
