# Week 6 — Shanti (Tester/DBA)

Started writing backend test scripts for the SplitSync API and set up the initial integration-test structure.

- Created the `splitsync/server.Tests/` project for backend API testing
- Added the initial test setup for running API requests against the application
- Started testing authentication endpoints such as user registration and login
- Began testing group-related endpoints, including creating and retrieving groups
- Used an in-memory Entity Framework Core database so the tests can run without relying on a separate Postgres database

This established the foundation for expanding backend test coverage for expenses, settlements, and other API features in the following weeks.
