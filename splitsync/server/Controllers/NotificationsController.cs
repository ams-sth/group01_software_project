using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Dtos;

namespace SplitSync.Api.Controllers;

// Manages in-app notifications for the signed-in user.
// Notifications are created by other controllers (GroupsController, ExpensesController,
// SettlementsController) via NotificationService whenever a relevant action occurs.
// All endpoints require authentication and only return/modify the current user's notifications.
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(AppDbContext db) : ControllerBase
{
    // GET /api/notifications
    // Returns the 50 most recent notifications for the signed-in user, newest first.
    // Capped at 50 to keep the response size predictable — older notifications are still
    // in the database but not surfaced in the UI.
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

    // GET /api/notifications/unread-count
    // Returns the number of unread notifications for the bell badge in the header.
    // Separate from the full list endpoint so the client can poll this cheaply
    // without fetching all notification messages.
    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountResponse>> UnreadCount()
    {
        var userId = User.FindFirst("sub")!.Value;

        var count = await db.Notifications.CountAsync(n => n.RecipientUserId == userId && !n.IsRead);

        return Ok(new UnreadCountResponse(count));
    }

    // POST /api/notifications/{id}/read
    // Marks a single notification as read. Checks that the notification belongs to
    // the signed-in user before updating it — users cannot mark other people's notifications.
    [HttpPost("{id}/read")]
    public async Task<IActionResult> MarkRead(Guid id)
    {
        var userId = User.FindFirst("sub")!.Value;

        var notification = await db.Notifications.FirstOrDefaultAsync(n => n.Id == id);
        if (notification is null)
        {
            return NotFound();
        }

        // Ownership check — a valid notification ID belonging to someone else should be Forbidden, not NotFound.
        if (notification.RecipientUserId != userId)
        {
            return Forbid();
        }

        notification.IsRead = true;
        await db.SaveChangesAsync();

        return NoContent();
    }

    // POST /api/notifications/read-all
    // Marks all of the signed-in user's unread notifications as read in one request,
    // used by the "Mark all read" button in the notification dropdown.
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
