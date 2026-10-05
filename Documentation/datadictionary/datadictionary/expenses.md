# Expenses

A single shared expense within a group.

| Column | Type | Null? | Key | Description |
|---|---|---|---|---|
| ID | uuid | No | PK | |
| GroupID | uuid | No | FK → Groups.ID | |
| PayerID | uuid | No | FK → Users.ID | The member who paid (UC-06).|
| Name | varchar | No | | User-provided short label (UC-06). |
| Notes | text | Yes | | User-provided free-text description. |
| ExpenseDate | date | No | | User-editable transaction date. |
| Amount | decimal(10,2) | No | | Total expense amount. |
| SplitType | enum(Equal, Unequal, Percentage) | No | | Discriminator controlling how `ExpenseSplitValues` is interpreted. |
| HasReceipt | boolean | No | | True if the expense has a receipt photo in `ExpenseReceipts`. Kept here so listing expenses doesn't have to check the receipts table for each one. |

## Business rules

- Split validation: unequal amounts must sum to `Amount`; percentages must sum to 100% (UC-06).

## Rejected / not modeled

- `RecurringExpenseID` FK: no current FR that requires a link between an `Expense` occurence & `RecurringExpense`, instead provenance is captured in `Notes` at generation time.
- `AttachmentPath` column: the plan was to save receipt photos as files and store the path here, but Render's free tier deletes files on every restart/redeploy. Photos are stored in the database instead, see [ExpenseReceipts](./expense_receipts.md).
