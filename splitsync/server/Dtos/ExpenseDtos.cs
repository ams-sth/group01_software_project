namespace SplitSync.Api.Dtos;

// Amount is used for "unequal" splits, Percentage for "percentage" splits.
// Both are ignored for "equal" — that method just needs the list of usernames.
public record ExpenseSplitInput(string Username, decimal? Amount, decimal? Percentage);

public record CreateExpenseRequest(string Description, decimal Amount, string SplitMethod, List<ExpenseSplitInput> Splits);

public record ExpenseShareResponse(string Username, decimal Amount);

public record ExpenseResponse(
    Guid Id,
    string Description,
    decimal Amount,
    string PaidByUsername,
    string SplitMethod,
    DateTime CreatedAt,
    List<ExpenseShareResponse> Shares
);
