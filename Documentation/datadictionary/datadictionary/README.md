# Data Dictionary

## Purpose

This document describes every table in the SplitSync database: what it represents, its columns, and the business rules or design reasoning behind non-obvious decisions & deliberate exemptions. 

## Conventions

- **PK** = Primary Key, **FK** = Foreign Key
- All surrogate IDs are UUIDs unless noted otherwise
- Monetary values are `decimal(10,2)`
- **Derived/cache** = data that is reconstructable from other tables, stored for read performance, and kept in sync transactionally with its source
- **Snapshot** = data captured at a point in time and intentionally never updated afterward, even if the source record later changes

## Tables

- [Users](./users.md)
- [Groups](./groups.md)
- [GroupMembers](./group_members.md)
- [Expenses](./expenses.md)
- [ExpenseParticipants](./expense_participants.md)
- [ExpenseSplitValues](./expense_split_values.md)
- [ExpenseReceipts](./expense_receipts.md)
- [RecurringExpenses](./recurring_expenses.md)
- [RecurringExpenseParticipants & RecurringExpenseSplitValues](./recurring_expense_splits.md)
- [Settlements](./settlements.md)
- [Balances](./balances.md)
- [Activities](./activities.md)

See also: [Cross-cutting notes](./cross_cutting_notes.md) — summary of all denormalized/snapshot fields and rejected columns, for report writing.
