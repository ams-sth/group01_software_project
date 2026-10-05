# SplitSync Reporting Dataset (seed data)

Synthetic data (fixed random seed 42) covering 2026-01-01 to 2026-09-24. No real users. Regenerate with `generate_seed_data.py`.
All CSVs are UTF-8, comma separated, one header row, ISO dates (`YYYY-MM-DD`), timestamps `YYYY-MM-DD HH:MM:SS`, booleans `True/False`, money in dollars with 2 decimals.

## Tables and relationships

| Table | Grain (one row per...) | Rows | Type |
|---|---|---|---|
| users | user | 24 | Dimension |
| groups | group | 6 | Dimension |
| group_members | user in a group | 33 | Bridge |
| dim_date | calendar day (2026) | 365 | Dimension |
| recurring_templates | recurring expense rule | 6 | Dimension |
| expenses | expense | 350 | Fact |
| expense_splits | person's share of an expense | 1504 | Fact |
| settlements | payment between two members | 98 | Fact |
| activity_log | create/edit/delete event | 502 | Fact (events) |

Relationships (many-to-one unless stated):
- expenses.group_id -> groups.group_id; expenses.payer_id -> users.user_id; expenses.template_id -> recurring_templates.template_id (optional); expenses.transaction_date -> dim_date.date
- expense_splits.expense_id -> expenses.expense_id; expense_splits.user_id -> users.user_id
- settlements.group_id -> groups.group_id; settlements.payer_id / recipient_id -> users.user_id (role-playing; make one inactive in Power BI); settlements.transaction_date -> dim_date.date
- group_members.group_id -> groups; group_members.user_id -> users
- activity_log.group_id -> groups; actor_id -> users; entity_id -> expenses.expense_id or settlements.settlement_id depending on entity_type

## Columns

### users
user_id (PK, U001..); display_name (anonymised accounts show "Deleted User"); signup_method (email_password | google); email_reminders_enabled (bool); created_date; is_deleted (bool, anonymised account)

### groups
group_id (PK); group_name; group_type (household | travel | social); creator_id (FK users); created_date

### group_members
group_id, user_id (composite PK); joined_date; is_creator (bool)

### dim_date
date (PK); year; month (1-12); month_name; year_month (YYYY-MM); week_of_year (ISO); day_of_week; is_weekend (bool)

### recurring_templates
template_id (PK); group_id; description; amount; frequency (monthly | weekly | interval_days); recurrence_day (monthly: day of month, clamped to month end; weekly: 0=Mon..6=Sun; interval_days: number of days); start_date; end_date (blank = ongoing); split_method

### expenses
expense_id (PK); group_id; payer_id; expense_name; category; total_amount; transaction_date; split_method (equal | unequal | percentage); num_participants; has_receipt (bool); is_recurring_generated (bool); template_id (blank for one-off); created_at
Deleted expenses are not present here (they appear only as `delete` events in activity_log).

### expense_splits
expense_id, user_id (composite PK); group_id (denormalised for convenience); share_amount (what that person owes for the expense; sums exactly to expenses.total_amount); share_percentage (only for percentage splits; sums to 100)
Note: the payer can also appear as a participant (their own share is not owed to anyone).

### settlements
settlement_id (PK); group_id; payer_id (person paying back); recipient_id; amount; transaction_date; created_at

### activity_log
event_id (PK, chronological); group_id; actor_id; event_type (create | edit | delete); entity_type (expense | settlement); entity_id; entity_name; amount_at_event; event_timestamp

## Suggested KPIs / report questions
1. Total spend per group per month (expenses.total_amount by groups x dim_date.year_month)
2. Spend by category, and category mix per group type
3. Average expense size and number of expenses per group
4. Split method usage (equal vs unequal vs percentage)
5. Recurring vs one-off spend share (is_recurring_generated)
6. Net balance per member per group = amounts paid (expenses.payer_id) + settlements paid - share_amount owed - settlements received. Unsettled balance is the headline metric.
7. Settlement rate: total settled / total owed, and average days between expense and settlement
8. Receipt attachment rate (has_receipt)
9. Activity volume over time; edit and delete rate per group
10. Top payers / heaviest debtors per group; member participation (expenses per member)

## Notes for the analyst
- Amounts are AUD-style decimals with no currency column (single currency assumed).
- Dataset is synthetic and small (about 350 expenses); patterns such as the June Bali trip cluster are intentional so charts are not flat.
- Some balances are intentionally left unsettled or partly settled so the balance KPI has content.
