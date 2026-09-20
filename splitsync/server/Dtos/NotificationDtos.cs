namespace SplitSync.Api.Dtos;

public record NotificationResponse(Guid Id, string Message, Guid? GroupId, bool IsRead, DateTime CreatedAt);
public record UnreadCountResponse(int Count);
