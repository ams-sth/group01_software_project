using Microsoft.EntityFrameworkCore;
using SplitSync.Api.Data;
using SplitSync.Api.Models;

namespace SplitSync.Api.Services;

public class DbReceiptStorage(AppDbContext db) : IReceiptStorage
{
    public async Task SaveAsync(Guid expenseId, byte[] data, string contentType)
    {
        var receipt = await db.ExpenseReceipts.FindAsync(expenseId);
        if (receipt is null)
        {
            receipt = new ExpenseReceipt { ExpenseId = expenseId };
            db.ExpenseReceipts.Add(receipt);
        }

        receipt.Data = data;
        receipt.ContentType = contentType;
        receipt.UploadedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
    }

    public async Task<StoredReceipt?> GetAsync(Guid expenseId)
    {
        return await db.ExpenseReceipts
            .Where(r => r.ExpenseId == expenseId)
            .Select(r => new StoredReceipt(r.Data, r.ContentType))
            .FirstOrDefaultAsync();
    }

    public async Task DeleteAsync(Guid expenseId)
    {
        var receipt = await db.ExpenseReceipts.FindAsync(expenseId);
        if (receipt is not null)
        {
            db.ExpenseReceipts.Remove(receipt);
            await db.SaveChangesAsync();
        }
    }
}
