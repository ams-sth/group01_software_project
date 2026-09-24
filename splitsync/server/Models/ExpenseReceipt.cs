namespace SplitSync.Api.Models;

// Kept in its own table (rather than columns on Expense) so listing expenses
// never drags the image bytes along with it.
public class ExpenseReceipt
{
    public Guid ExpenseId { get; set; }
    public Expense Expense { get; set; } = null!;

    public byte[] Data { get; set; } = [];
    public string ContentType { get; set; } = string.Empty;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
