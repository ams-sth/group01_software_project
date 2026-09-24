namespace SplitSync.Api.Services;

public record StoredReceipt(byte[] Data, string ContentType);

// Where receipt images physically live. The Postgres-backed implementation is
// the default because Render's free tier has no persistent disk; swapping to
// cloud object storage later only means adding another implementation of this.
public interface IReceiptStorage
{
    Task SaveAsync(Guid expenseId, byte[] data, string contentType);
    Task<StoredReceipt?> GetAsync(Guid expenseId);
    Task DeleteAsync(Guid expenseId);
}
