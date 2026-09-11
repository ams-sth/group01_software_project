namespace SplitSync.Api.Models;

public class Expense
{
    public Guid Id { get; set; }

    public Guid GroupId { get; set; }
    public Group Group { get; set; } = null!;

    public string Description { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string SplitMethod { get; set; } = "equal";

    public string PaidByUserId { get; set; } = string.Empty;
    public AppUser PaidByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ExpenseShare> Shares { get; set; } = new List<ExpenseShare>();
}
