**1. What does a Business Analyst do, and how does the role differ across industries?**
A BA bridges business needs and technical solutions — gathering requirements, modeling processes, and making sure the right problem is being solved before a solution is built. The core skill set (elicitation, documentation, stakeholder communication) stays constant, but focus shifts by industry: a BA in finance leans into compliance/risk; in tech, closer to product/systems requirements; in operations, closer to process improvement.

**2. How do you gather requirements from stakeholders? What techniques do you use?**
Interviews, workshops, surveys, and document/process analysis, chosen based on stakeholder availability and how well-defined the problem already is. Documented requirements are then validated back with stakeholders to confirm accuracy before development starts — the validation step matters as much as the gathering itself.

**3. What's the difference between a BRD, an SRS, and an FRS?**
- **BRD (Business Requirements Document)** — high-level business needs and objectives, the "why."
- **SRS (Software Requirements Specification)** — detailed functional and non-functional requirements, the "what," from a system perspective.
- **FRS (Functional Requirements Specification)** — specific features and functions in fine detail, the "how it behaves."

**4. What's the difference between a use case, a user story, and acceptance criteria?**
- **Use case** — describes an interaction between a user and the system, often with steps/flows (including alternate/error paths).
- **User story** — a short statement of what a user wants and why (commonly "As a [user], I want [goal], so that [reason]").
- **Acceptance criteria** — the specific, testable conditions that must be true for that story to be considered done.

**5. How do you handle conflicting priorities or requirements from different stakeholders?**
Assess each request's impact on the overall project goal first, not just its individual merit — then bring stakeholders together (or facilitate individually) to negotiate toward a solution that protects the essential objectives, documenting the trade-off made and why.

**6. How do you prevent scope creep on a project?**
Document requirements clearly and get explicit stakeholder sign-off early. When a change is requested afterward, assess its impact on timeline/budget *before* approving it, rather than absorbing it silently — scope creep usually happens when changes go unassessed, not when they're refused outright.

**7. How do you prioritize requirements when you can't do everything?**
The MoSCoW method — Must have, Should have, Could have, Won't have (this time) — gives a shared vocabulary with stakeholders for what's truly essential vs. nice-to-have. A requirements traceability matrix helps track each requirement through the project lifecycle so nothing silently drops.

**8. Walk me through a project you worked on — your contribution, and the measurable outcome.** 
I was given a fairly open-ended task — 'improve logging' — with no further specification of what that meant. Looking at our repos, the actual problem was that each one had copied and slightly diverged its own near-identical logging setup, so any shared fix had to be repeated everywhere, and often wasn't. I built a single reusable logging module to replace those, but deliberately designed it to behave the same way the existing setups did, with enhancements layered on top — the goal was for the migration to be invisible to other engineers' day-to-day work, not something that broke their flow. I then migrated all existing repos to it myself, and set it up so new repos would default to using it going forward. The clearest payoff came later, when we were required to change a header in our New Relic logging setup — instead of updating that across every repo individually, it was a single change in the shared module that every repo picked up. That's the kind of result that's hard to put a number on, but it's exactly the maintenance cost the whole initiative was meant to remove.


**9. What's the difference between Agile and Waterfall?**
Waterfall is linear and sequential — each phase (requirements, design, build, test) completes before the next starts, with one delivery at the end. Agile is iterative — work happens in short cycles (sprints) with frequent, incremental releases and built-in room to adapt as requirements evolve.

**10. How do you present a complex analysis or report to non-technical stakeholders/management?**
Lead with the takeaway, not the method — what does this mean for a decision they need to make. Break the detail into digestible chunks, use visuals over raw tables, and come prepared for follow-up questions rather than trying to pre-empt every one in the main presentation.

**11. Describe a time requirements changed unexpectedly mid-project. What did you do?** 
In my experience, requirement changes mid-sprint usually come from a stakeholder who didn't fully see the capacity constraint when they asked. What I've seen work is: first, compare the change against what's already committed — does it genuinely need to land this cycle, or can it wait. If it can wait, we keep the current plan and pick it up formally next cycle. If it can't, we take a short, focused meeting specifically to reassess: what's already committed that we can defer to make room, rather than trying to silently absorb everything. Sometimes there's no clean trade — if everything really is critical, the team absorbs the overrun rather than quietly dropping something without a conversation. What I take from that isn't a magic process — it's that having an explicit, fast triage step (even an informal one) is what prevents a change from just becoming chaos; the alternative is nobody making the trade-off decision out loud, and work quietly slipping instead.


**12. What software/tools have you used for requirements, diagramming, or data work?**
Requirements/collaboration: Jira, Confluence. Diagramming: Lucidchart, Visio, or C4-style diagrams for system-level work. Data/reporting: SQL, Excel, Power BI or Tableau.

---
Sources consulted: [DataCamp — Business Analyst Interview Questions](https://www.datacamp.com/blog/business-analyst-interview-questions-and-answers)