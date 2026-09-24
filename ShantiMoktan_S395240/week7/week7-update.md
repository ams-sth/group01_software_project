# Week 7 — Shanti (Tester/DBA)

Backend test coverage for the features that had landed since the initial scaffolding (Groups, Expenses, Settlements, and the account lifecycle on Auth).

- `splitsync/server.Tests/Integration/Auth/AuthEndpointTests.cs` — register, login, `/me`, account deletion
- `splitsync/server.Tests/Integration/Groups/GroupsEndpointTests.cs` — create, list, rename, delete, members, join/leave
- `splitsync/server.Tests/Integration/Expenses/ExpensesEndpointTests.cs` — equal/unequal/percentage split validation and rounding
- `splitsync/server.Tests/Integration/Settlements/SettlementsEndpointTests.cs` — balances and recording settlements
- `splitsync/server.Tests/Integration/CustomWebApplicationFactory.cs` — swaps the API to an in-memory EF Core database for tests, so the suite runs without a live Postgres instance

Also moved the frontend test case CSVs into `Documentation/Test Cases/` so they sit with the rest of the shared docs instead of my personal folder.
