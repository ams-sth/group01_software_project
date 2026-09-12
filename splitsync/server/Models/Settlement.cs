namespace SplitSync.Api.Models;

// Records that FromUser paid ToUser Amount to settle up part of what they owed
// within a group. This offsets balances computed from Expense/ExpenseShare —
// it isn't itself a debt.
public class Settlement
{
    public Guid Id { get; set; }

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = null!;

    public string FromUserId { get; set; } = string.Empty;
    public AppUser FromUser { get; set; } = null!;

    public string ToUserId { get; set; } = string.Empty;
    public AppUser ToUser { get; set; } = null!;

    public decimal Amount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
