# Tester & DBA Role Report — SplitSync

**Author:** Shanti Moktan (S395240) · **Role:** Tester and Database Administrator

## 1. Introduction

SplitSync is a web app that helps housemates split shared bills, built with ASP.NET Core, React and PostgreSQL. As Tester, I wrote the test cases and automated tests and reported defects. As DBA, I wrote the database standards and set up the database.

## 2. Tools Used

| Tool | Purpose |
|---|---|
| xUnit | Automated backend (API) tests |
| In-memory database | Lets tests run without PostgreSQL |
| Cypress | Automated browser (end-to-end) tests |
| PostgreSQL and EF Core | The database and its schema migrations |
| CSV files | Manual test cases |
| Git, GitHub and Trello | Version control and task tracking |

## 3. How Testing Was Done

**Manual testing:** 52 test cases, written from the wireframes before features were built. Each has steps and an expected result, stored in `Documentation/Test Cases/`.

**Automated backend testing:** 61 xUnit tests, all passing. They send real requests to the API and check things like correct bill splits, permissions and receipt uploads. They run in seconds with `dotnet test`.

**Automated browser testing:** 31 Cypress tests that click through the website like a real user. They are written but not yet run successfully, because Cypress crashes on my computer.

| | Manual | Automated |
|---|---|---|
| Speed | Slow | Fast |
| Best for | New features and usability | Re-checking after every change |
| In this project | 52 test cases | 61 xUnit + 31 Cypress tests |

## 4. Database Work

- Wrote the naming conventions: plural table names, `ID` primary keys, `EntityID` foreign keys, and exact decimals for money.
- Set up PostgreSQL locally and applied the migrations.
- Kept database passwords out of GitHub using user-secrets.

## 5. Issues Found

- The password length check didn't work on the website. The server still blocks short passwords.
- Member search can't be tested with the in-memory database.
- Account deletion removes expenses instead of anonymising them, as the design intended.

## 6. Conclusion

I built three levels of testing: 52 manual test cases, 61 passing backend tests and 31 browser tests. Manual tests defined what to check, and automated tests checked it quickly after every change. Testing found real problems, and reporting gaps honestly gave the team a true picture of quality.

**Next steps:** run tests against real PostgreSQL, get Cypress running automatically, and fix the account-deletion issue.
