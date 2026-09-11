namespace SplitSync.Api.Models;

public class ExpenseShare
{
    public Guid ExpenseId { get; set; }
    public Expense Expense { get; set; } = null!;

    public string UserId { get; set; } = string.Empty;
    public AppUser User { get; set; } = null!;

    public decimal Amount { get; set; }
}
