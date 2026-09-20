namespace SplitSync.Api.Models;

// A message for one recipient about something that happened in a group they're
// in (added/removed as a member, group deleted, expense added, settlement
// recorded). GroupId is left null when the referenced group no longer exists
// (e.g. it was just deleted) — the Message is composed at creation time and
// already carries whatever context is needed, so the row stays meaningful on
// its own even without a live group to link to.
public class Notification
{
    public Guid Id { get; set; }

    public string RecipientUserId { get; set; } = string.Empty;
    public AppUser RecipientUser { get; set; } = null!;

    public string Message { get; set; } = string.Empty;

    public Guid? GroupId { get; set; }
    public Group? Group { get; set; }

    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
