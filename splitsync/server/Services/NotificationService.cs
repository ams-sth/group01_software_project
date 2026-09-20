using SplitSync.Api.Data;
using SplitSync.Api.Models;

namespace SplitSync.Api.Services;

public class NotificationService(AppDbContext db)
{
    public async Task NotifyAsync(string recipientUserId, string message, Guid? groupId = null)
    {
        db.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            RecipientUserId = recipientUserId,
            Message = message,
            GroupId = groupId,
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();
    }

    public async Task NotifyManyAsync(IEnumerable<string> recipientUserIds, string message, Guid? groupId = null)
    {
        var now = DateTime.UtcNow;
        foreach (var recipientUserId in recipientUserIds.Distinct())
        {
            db.Notifications.Add(new Notification
            {
                Id = Guid.NewGuid(),
                RecipientUserId = recipientUserId,
                Message = message,
                GroupId = groupId,
                CreatedAt = now,
            });
        }
        await db.SaveChangesAsync();
    }
}
