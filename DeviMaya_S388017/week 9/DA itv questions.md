**1. Walk me through your general process for approaching a data analysis project.**
Understand the business question first — what decision this analysis needs to support. Then gather and clean the data, do exploratory analysis to find patterns, and present findings with visualizations tied back to a recommendation, not just a description of the data.

**2. What's the difference between INNER JOIN and OUTER JOIN?**
`INNER JOIN` returns only rows with a match in both tables. `OUTER JOIN` (LEFT/RIGHT/FULL) returns all rows from one (or both) side(s), with NULLs filled in where there's no match on the other side.

**3. What does GROUP BY do, and how is HAVING different from WHERE?**
`GROUP BY` collapses rows sharing the same value(s) in specified columns into aggregated groups (e.g. `SUM`, `COUNT` per group). `WHERE` filters individual rows *before* grouping; `HAVING` filters *after* grouping, on the aggregated result (e.g. "only show groups with COUNT > 5").

**4. What is a SQL view, and why would you use one?**
A virtual table defined by a stored query — it doesn't hold data itself, just presents the result of running that query. Useful for encapsulating a complex query behind a simple name, restricting access to specific columns/rows for security, or presenting the same underlying data shaped differently for different consumers.

**5. How do you handle NULL values in a query?**
Filter with `IS NULL` / `IS NOT NULL` (never `= NULL`, which doesn't work in SQL). Use `COALESCE(col, default)` to substitute a fallback value when a column is NULL, useful in both display and aggregate calculations where NULLs would otherwise be silently dropped or skew results.

**6. What are window functions, and when would you use one?**
Functions that compute a value across a set of related rows *without* collapsing them into one row (unlike `GROUP BY`) — e.g. `ROW_NUMBER()`, `RANK()`, or a running total via `SUM(...) OVER (...)`. Useful when you need both the detail row and an aggregate context around it, like "this row's value, plus its rank within its category."

**7. What is data warehousing, in your own words?**
The practice of collecting and consolidating structured data from multiple source systems into one central repository, via an ETL (extract, transform, load) process, specifically structured to support reporting and decision-making rather than day-to-day transactional operations.

**8. How do you handle missing or incomplete data in a dataset?**
Depends on how much is missing and why: imputation (fill with mean/median or a modeled estimate) for small, random gaps; exclusion when the missing data would bias the result if guessed at; or going back to the source/stakeholder to get the real value when accuracy actually matters for the conclusion.

**9. How would you design a dashboard for a given audience/goal?**
Start from the audience's actual decisions, not the available data — identify the KPIs that matter to *them*, choose visualizations that match the data's shape (trend → line, comparison → bar, composition → limited use of pie), and keep layout scannable at a glance rather than dense. Iterate based on feedback once it's in use.

**10. Explain a statistical concept you've used and what business insight it gave you.** 
The concept I ended up applying most directly was the distinction between different kinds of missing data, not just 'missing data' as one bucket. Some values were missing at random relative to another feature, which meant I could reasonably impute them from that relationship. Others were missing in a pattern tied to time, which meant imputing them would have been guessing rather than estimating. And one feature's missingness wasn't really 'missing' at all — it represented a case where the underlying question didn't apply to that row, since the customer had never been contacted before. Treating all three the same way — filling every gap the same way — would have either introduced false signal or destroyed a real one. The insight was that the right handling of a missing value depends on why it's missing, not just how much of it is missing.

**11. How do you explain a technical finding to a non-technical audience?**
Lead with the conclusion in plain language, then support it with just enough detail to be credible — visuals over statistics, and an analogy where useful. Save methodology for if/when someone asks "how do you know."

**12. What's the difference between data mining and data profiling? Quantitative vs. qualitative data?**
- **Data mining** — discovering patterns/relationships in data (e.g. clustering, association rules). **Data profiling** — examining data to understand its structure, quality, and content (e.g. checking for nulls, duplicates, value ranges) — profiling usually happens *before* mining, as a data-quality step.
- **Quantitative** — numeric, measurable data (sales figures, counts). **Qualitative** — descriptive, categorical data (customer feedback text, survey categories).

**13. Tell me about the largest or most complex dataset you've worked with.** 
The largest dataset I've worked with was around 45,000 rows for a bank marketing campaign classification task. The complexity wasn't really about size — it was that the target class was heavily imbalanced (about 88% no, 12% yes), which meant accuracy alone would be a misleading measure of any model built on it. Missingness was also a real problem, but not a uniform one — I had to treat several columns completely differently depending on why they were missing. One feature with a small number of gaps I imputed using a domain-informed mapping from job type to typical education level, rather than a naive statistical fill. Another feature had around 30% missing values concentrated in specific months, which told me the missingness wasn't random — it was tied to something structural about data collection at that time, and there was no other feature I could confidently impute it from, so I left it as-is rather than force a fill. A third feature was missing in over 80% of rows, and closer analysis showed that wasn't a data quality issue at all — it represented customers who'd never been contacted in a previous campaign, so there was genuinely no true value to recover for those rows.

**14. Describe a time your analysis produced an unexpected result. What did you do?** 
I expected a column like 'previous campaign outcome' to be a straightforward binary field with some ordinary missing values to clean up. What I found was that the missing values weren't noise — they represented customers who'd never been contacted in a previous campaign at all, meaning the field was really a three-state variable (yes, no, not applicable) encoded as binary-plus-NaN. Once I confirmed that by checking it against contact history, I chose not to impute it, since there was no true value to estimate for those rows — treating the absence itself as a meaningful category was the more accurate choice than trying to fill it in.

---
Sources consulted: [Coursera — Data Analyst Interview Questions](https://www.coursera.org/articles/data-analyst-interview-questions-and-answers)
