# ExpenseReceipts

The receipt photo for an expense. Each expense can have at most one (1:1 with `Expenses`).

| Column | Type | Null? | Key | Description |
|---|---|---|---|---|
| ExpenseID | uuid | No | PK, FK → Expenses.ID | The expense this receipt belongs to. Also the primary key since it's 1:1. |
| Data | bytea | No | | The image itself. Compressed in the browser before upload, so usually a few hundred KB. |
| ContentType | text | No | | `image/jpeg`, `image/png` or `image/webp`. Worked out from the file bytes on the server, not from what the browser says. |
| UploadedAt | timestamptz | No | | When the photo was last uploaded or replaced. |

## Business rules

- Only the payer of the expense can upload, replace or remove the receipt. Any group member can view it.
- Max size is 5 MB. Only JPEG, PNG and WebP are accepted.
- Deleting the expense deletes the receipt too (cascade).
- `Expenses.HasReceipt` has to be kept in sync: set to true on upload, false on remove.

## Why a separate table

- Render's free tier doesn't keep files on disk between restarts, so the original plan of saving files and storing a path (`AttachmentPath`) wouldn't work.
- Keeping the bytes out of `Expenses` means loading a group's expense list doesn't pull every image with it.
- The API reads/writes receipts through an `IReceiptStorage` interface, so this could be swapped for cloud storage (e.g. Cloudinary or S3) later without changing the rest of the code.
