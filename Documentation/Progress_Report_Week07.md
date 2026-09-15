# SplitSync — Development Progress Report

*Reporting period: Week 02 – Week 07 (as of 15 Sept 2026). Team Component below is shared;
Individual Component and Feedback Report are Amsh Shrestha's only — Shanti and Devi each
write their own.*

## 1. Overview

This report tracks SplitSync's development progress to date, to confirm the team is on track
and to surface risks early. Content below is drawn directly from the GitHub commit history and
the team's Trello board, not reconstructed from memory.

## 2. Team Component

### a. Project Details

**i. Team info**

| Member | Student ID | Role |
|---|---|---|
| Amsh Shrestha | S394695 | Developer / Report Writer |
| Shanti Moktan | S395240 | DBA / Tester |
| Devi Maya | S388017 | Business Analyst / Data Analyst |

**ii. URLs**

- GitHub repo: https://github.com/ams-sth/splitsync
- Trello board: https://trello.com/b/11CVnhSH/prt585-software-engineering-practice
- Live deployment: none yet — no staging/production URL found in the repo (see Risks).

### b. Summary of progress

**i. Tasks/Components progress (group)**

Trello board totals 31 cards: ~21 Done, 2 In Progress, 5 Review/Blocked, 2 To Do.

Completed (Weeks 02–06):
- Project selection, scope and functional/non-functional requirements finalised (Devi)
- ER diagram, DB naming conventions, layered diagram, activity diagrams (Devi/Shanti)
- GitHub repo + branching strategy, .NET Web API scaffold, React PWA scaffold (Amsh)
- Kinde auth integration setup, authentication page, profile page, homepage (Amsh)
- Group creation/joining/members (Amsh)
- Frontend e2e/unit test suites for auth, signup, groups, expenses, settlements (Shanti)
- Backend unit/integration tests for HealthController/HealthEndpoint (Shanti)

Shipped since (commits 9–11 Sept, not yet reflected on the board — see Risks):
- Expense splitting (equal / unequal / percentage), settle-up balances, group
  rename/delete/leave, member kick-out, account deletion, UI polish (Amsh)

In Progress / Blocked:
- "Wire Continue with Google to real OAuth" — currently a stub, sitting in Review/Blocked
- Test project scaffolding, test plan, Cypress integration — Review/Blocked (Shanti)
- Chatbot scope confirmation — Review/Blocked (Devi)

### c. Potential Risks and proposed solutions

1. **Trello board lags actual delivery.** The "Week07 – Add expenses and split features" and
   "Week07 – update/rename/delete groups" cards are still in *To Do*, but the corresponding
   code was already merged (commits `7d7f438`, `bb515f9`, 11 Sept). Risk: progress looks behind
   schedule to anyone reading only the board. Fix: move cards the same day a PR merges.
2. **Google OAuth is still a stub.** Its card is marked complete but parked in Review/Blocked.
   Risk: features that assume a real authenticated identity (expenses, settle-up) are being
   built on top of an incomplete auth flow. Fix: prioritise finishing real OAuth before adding
   more identity-dependent features.
3. **No deployment target set up.** Risk: deployment issues (env vars, DB migrations, CORS)
   surface for the first time right before the Week 10 submission deadline. Fix: stand up a
   staging environment now, even a minimal one, and deploy early and often.
4. **Test coverage doesn't reach the newest, highest-risk code.** Shanti's tests cover auth,
   groups, and a health endpoint, but the expense-splitting and settle-up calculation logic
   added 11 Sept has no visible backend tests yet. This is the code most likely to have
   money-math bugs. Fix: prioritise unit tests for split/settle-up calculations next sprint.
5. **Implementation is concentrated in one contributor.** Of 69 commits to date, 28 are
   Amsh's and most recent feature commits are his alone. Risk: single point of failure /
   bottleneck. Fix: explicitly redistribute upcoming feature work across the team.

### d. Lessons Learned

*(Drafted from visible evidence — please adjust to match what the team actually experienced.)*

- Assigning one owner per Trello card in Week 04 made early requirements/setup work easy to
  track; that discipline slipped once implementation sped up in Weeks 6–7.
- Frontend and backend test scaffolding set up early (Week 04) paid off — Shanti was able to
  add substantial test coverage in Week 05 without re-scaffolding.
- Stubbing third-party auth (Google OAuth) to unblock other feature work was a reasonable
  short-term call, but it needs an explicit follow-up task so it doesn't get forgotten.

## 3. Individual Component — Amsh Shrestha

**Work completed (research / learning / implementation / management):**

- **Implementation (~70%):** Scaffolded the .NET Web API and React PWA (Week 04); built
  authentication, profile, and home pages (Week 05–06); built group creation/join/membership
  (Week 06); built expense splitting (equal/unequal/percentage), settle-up balances, group
  rename/delete/leave, member kick-out, and account deletion (Week 07); UI polish pass.
- **Management (~20%):** Set up the GitHub repo and branching strategy (Week 04); wrote
  Week 04 meeting minutes and progress report section; maintains own timesheet weekly.
- **Learning (~10%):** Kinde account/auth integration setup; Zed editor C# language server
  configuration for the team's .NET codebase.

**Links:**
- Trello (assigned cards): https://trello.com/b/11CVnhSH/prt585-software-engineering-practice
  — filter by member "Amsh Shrestha"
- GitHub commits: https://github.com/ams-sth/splitsync/commits/main/?author=ams-sth

## 4. Feedback Report

### a. Challenges & Solutions

*(TODO — fill in from your own experience, e.g. any blockers you personally hit and how you
resolved them.)*

### b. Partners & Feedback (≥3 improvements per teammate)

*(TODO — this needs your honest assessment, not a generated one. Suggested prompts: What
would help Shanti's testing work land faster? What would help Devi's BA/DA output plug more
directly into your implementation work?)*

### c. Team collaboration issues + 3 improvements

*(TODO — e.g. the Trello/GitHub sync gap identified in section 2c is a legitimate, evidence-
based starting point if it matches your experience.)*

### d. Assistance needs + 3 improvements to class learning experience

*(TODO — your own reflection.)*

### e. Self-realisation: 3 improvements to improve yourself

*(TODO — your own reflection.)*
