namespace SplitSync.Api.Dtos;

public record CreateGroupRequest(string Name);

public record GroupResponse(Guid Id, string Name, string CreatorUsername, List<string> MemberUsernames);

public record AddMemberRequest(string Username);

public record RenameGroupRequest(string Name);
