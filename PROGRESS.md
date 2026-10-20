# Section progress

Work through MASTER_CONTEXT sections one at a time, in order.
Status: todo / in progress / done / skip. Line ranges live in MASTER_INDEX.md.

| # | File | Status | Done on | Outcome (one line) |
|---|---|---|---|---|
| 01 | business-twin-os-architecture.md | todo | | |
| 02 | business-twin-os-roadmap-and-engineering-rules.md | todo | | |
| 03 | COMPANION_ANSWERS.md | todo | | |
| 04 | COMPANION_QUESTIONS.md | todo | | |
| 05 | COMPANION_QUESTIONS1.md | skip | | exact duplicate of 04 |
| 06 | jodi-patch-notes.md | todo | | |
| 07 | martial-arts-os-vnext-part2-ui-and-experiences.md | todo | | |
| 08 | martial-arts-os-vnext.md | todo | | |
| 09 | ODOO_AUDIT_REPLY.md | todo | | |
| 10 | ODOO_AUDIT_REPLY2.md | todo | | |
| 11 | ODOO_AUDIT_REQUEST.md | todo | | |
| 12 | ROSTER-PORT-HANDOFF.md | in progress | | porting screens; see checklist below and ROSTER_PORT_GUIDE.md |
| 13 | SESSION_HANDOFF_2.md | todo | | |
| 14 | SESSION_HANDOFF_3.md | todo | | |
| 15 | SESSION_HANDOFF_4.md | skip | | exact duplicate of 14 |
| 16 | SESSION_HANDOFF_5.md | todo | | |
| 17 | SESSION_HANDOFF_6.md | todo | | |
| 18 | SESSION_HANDOFF_7.md | todo | | |
| 19 | SESSION_HANDOFF_8.md | todo | | |
| 20 | V1_VS_ROSTER.md | todo | | |

## Row 12 checklist: unported screens

From the "Remaining" table in ROSTER-PORT-HANDOFF.md. Screens 1 (Attendance review) and 2 (Member management) were built in an earlier session and are committed, but still need a full click-test. How each screen was built, test setup and open questions: `ROSTER_PORT_GUIDE.md`.

- [x] 3. Member booking (`MemberBooking.tsx`), gate: bookings.write (2026-10-17: works; Book button on member page)
- [x] 4. Instructor & timesheets (`InstructorWorkspace.tsx`), gate: instructor.use (2026-10-17: panel on Instructor Focus; correction needs company attendance_validation ≠ no_validation)
- [x] 5. Reports & rosters (`OperationsWorkspace.tsx`), gate: reports.read (2026-10-17: works; new page Reports → Operations reports, printable roster)
- [x] 6. New student (`StudentIntake.tsx`), gate: students.create (2026-10-17: works; Members → New student, `/dashboard/contacts/new`)
- [x] 7. Sales/CRM + trials (`CrmWorkspace.tsx`, `TrialPanel.tsx`, `CrmIntelligence.tsx`), gate: leads.write (2026-10-17: works; CRM → Sales + lead page with trial panel)
- [x] 8. Course rosters (`CourseAssignments.tsx`), gate: courses.manage (2026-10-17: works; Classes → Course rosters, `/dashboard/courses`)
- [x] 9. Archived students (`ArchivedMembers.tsx`), gate: members.archive (2026-10-17: works; Members → Archived, `/dashboard/contacts/archived`)
- [x] 10. Belt testing (`TestingWorkspace.tsx`), gate: testing.manage (2026-10-17: works; People → Belt testing, `/dashboard/testing`)
- [x] 11. Messaging & consent (`CommunicationsWorkspace.tsx`), gate: messaging.manage (2026-10-17: works; Engage → Messaging & consent, `/dashboard/messaging`; outbound ownership question logged for Jodi)
- [x] 12. School setup (`SetupChecklist.tsx`), gate: setup.read (2026-10-17: works; Platform → School setup, `/dashboard/setup`; checklist shared with member onboarding)
- [x] 13. AI settings (`AiSettings.tsx`), gate: ai.manage (2026-10-17: works read-only; Platform → AI settings, `/dashboard/ai-settings`; activation untested: local Odoo has no OpenAI key, needs owner login)
- [x] 14. Inbox / parent messages (`hub/page.tsx` MessageCard + Recent actions), gate: inbox.use (2026-10-17: works; replaces the Prisma inbox at `/dashboard/inbox`; approve-and-queue untested, no outbound provider)
- [x] 15. Member directory filter (#43), gate: members.read (2026-10-17: covered by existing Members page search + state filter; that page reads Odoo via ORM, logged in open questions)
- [x] 16. Kiosk (its own phase), gate: device pairing (2026-10-17: works; coworker's kiosk-odoo applied + `/kiosk/pair` like v1 (`?key=` auto-connect); live Odoo check-in confirmed on local class #12; uncommitted)
- [x] 17. Member page Hub summary (`ConnectedMemberDetails.tsx`, op `member_workspace`; Jodi #26–29), gate: members.read (2026-10-17: works; Hub panels on Member 360 Timeline/Family/Messages/Documents + new Safety tab)
- [x] 18. "New student" entry from the member directory (`MemberDirectory.tsx`; Jodi #29), folded into #6 (2026-10-17: done with #6)
- [x] 19. Follow-ups page: queue + composer (`components/ai/follow-up/*`; Jodi #17) (2026-10-17: works; Engage → Follow-ups, `/dashboard/follow-ups`; composer already in Companion panel; uses kiosk gateway, not Hub, logged for Jodi)
- [ ] 20. (skipped for now with #16) Kiosk extras with #16: concierge schedule questions (#24), public mode (#26–28), parent check-in (#32–38), roster grid (#41). Follow `KIOSK.md`.