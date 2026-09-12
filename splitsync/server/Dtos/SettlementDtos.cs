namespace SplitSync.Api.Dtos;

// IPaid = true means the signed-in user paid Username; false means Username paid the signed-in user.
public record CreateSettlementRequest(string Username, decimal Amount, bool IPaid);

public record SettlementResponse(Guid Id, string FromUsername, string ToUsername, decimal Amount, DateTime CreatedAt);

// NetAmount is from the signed-in user's perspective: positive = they owe you, negative = you owe them.
public record MemberBalance(string Username, decimal NetAmount);

public record GroupBalancesResponse(decimal YouAreOwedTotal, decimal YouOweTotal, List<MemberBalance> Balances);
