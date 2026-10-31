# Event Management System — Product Backlog & Sprint Execution Plan

**Team E7:**
- Saketh Narayanam – PES1UG24CS292 (@saketh1506-ux)
- Neeraj R Gowda – PES1UG24CS295 (@neerajrgowda8558-arch)
- Likhith Reddy M – PES1UG24CS282 (@52likhith)
- N. Adil Ahmed – PES1UG24CS285 (@adilahmed55)

**Course:** Software Engineering Mini-Project Deliverables Part-2  
**GitHub Repository:** [saketh1506-ux/Event-Management-System-TEAM-E7](https://github.com/saketh1506-ux/Event-Management-System-TEAM-E7)  
**Live GitHub Project Board:** [Event Management System - Team E7 Project #2](https://github.com/users/saketh1506-ux/projects/2)

---

## 1. Product Epics Overview

The requirements from the formal Software Requirements Specification (SRS), Software Architecture Document (SAD), and Software Test Plan are structured into 6 core Epics:

1. **Epic 1: User Management & Authentication** (epic:user-mgmt-auth)  
   Covers account creation, login, password encryption, session lifecycle, and route authorization.
2. **Epic 2: Event Management & Discovery** (epic:event-mgmt)  
   Covers public catalog browsing, keyword search, category filtering, event details view, and organizer event CRUD with capacity configuration.
3. **Epic 3: Registration & Capacity Management** (epic:registration)  
   Covers attendee one-click registration, automated full-capacity rejection, duplicate registration prevention, registration cancellation, and transactional data integrity.
4. **Epic 4: Communication, Notifications & Reporting** (epic:notifications-reporting)  
   Covers organizer broadcast announcements to registered participants and registration reports generation/export.
5. **Epic 5: Administrator Management & Governance** (epic:admin-controls)  
   Covers administrative moderation of users, organizers, and inappropriate events, with strict privilege elevation guards.
6. **Epic 6: System Architecture & Quality Engineering** (epic:architecture-quality)  
   Covers 3-tier modular scaffolding, API input sanitization, responsive layout, catalog and registration performance tuning, CI/CD automation, and execution of all 18 test cases.

---

## 2. Sprint Allocation Summary

- **Total Backlog Items:** 24
- **Total Story Points:** 83 points (using relative Fibonacci scale: 1, 2, 3, 5, 8)
- **Sprint 1 (19–23 Oct 2026):** 16 items | 54 story points
- **Sprint 2 (26–30 Oct 2026):** 8 items | 29 story points
- **Sprint Dry Run Period:** 12th Oct to 16th Oct 2026

### Workload Distribution Across Team Members:
| Team Member | GitHub Handle | PRN | Sprint 1 Pts | Sprint 2 Pts | Total Pts | Assigned Focus Area |
|---|---|---|---|---|---|---|
| **Saketh Narayanam** | @saketh1506-ux | PES1UG24CS292 | 13 | 6 | 19 | Authentication, Password Security, Session Handling, Reports |
| **Neeraj R Gowda** | @neerajrgowda8558-arch | PES1UG24CS295 | 16 | 8 | 24 | Event Discovery, Search/Filter, Organizer CRUD, Admin Module |
| **Likhith Reddy M** | @52likhith | PES1UG24CS282 | 14 | 7 | 21 | Registration Engine, Capacity Validation, E2E Test Suite |
| **N. Adil Ahmed** | @adilahmed55 | PES1UG24CS285 | 11 | 8 | 19 | Modular Architecture, Security Guards, Responsive UI, CI/CD |

---

## 3. Requirements Traceability Matrix (RTM)

| SRS Req ID | Requirement Description | Related Use Cases | Test Case ID | Backlog / Issue ID | Epic |
|---|---|---|---|---|---|
| **FR-01** | Create account & login | UC-04, UC-05 | TC-01, TC-02 | Issue #2 ([FR-01]) | Epic 1 |
| **FR-02** | Browse & search/filter events | UC-01, UC-02 | TC-03 | Issue #6 ([FR-02]) | Epic 2 |
| **FR-03** | View event details | UC-03 | TC-03 | Issue #7 ([FR-03]) | Epic 2 |
| **FR-04** | Register & check capacity | UC-06 | TC-04, TC-05 | Issue #10 ([FR-04]) | Epic 3 |
| **FR-05** | Prevent duplicate & cancel registration | UC-06, UC-07 | TC-06, TC-07 | Issue #11 ([FR-05]) | Epic 3 |
| **FR-06** | View registered events dashboard | UC-08 | TC-07 | Issue #12 ([FR-06]) | Epic 3 |
| **FR-07** | Create, edit, cancel events | UC-11, UC-12, UC-13 | TC-08 | Issue #8 ([FR-07]) | Epic 2 |
| **FR-08** | Set capacity & view participants | UC-14, UC-15 | TC-08, TC-13 | Issue #9 ([FR-08]) | Epic 2 |
| **FR-09** | Send updates & broadcast notifications | UC-10, UC-16 | TC-17 | Issue #18 ([FR-09]) | Epic 4 |
| **FR-10** | Generate organizer registration reports | UC-20 | TC-15 | Issue #19 ([FR-10]) | Epic 4 |
| **FR-11** | Manage users, organizers & events | UC-17, UC-18, UC-19 | TC-09, TC-18 | Issue #20 ([FR-11]) | Epic 5 |
| **NFR-01** | Event listing loads within 3s | UC-01 | TC-10 | Issue #17 ([NFR-01]) | Epic 6 |
| **NFR-02** | Registration completes within 2s | UC-06 | TC-10 | Issue #22 ([NFR-02]) | Epic 6 |
| **NFR-03** | Passwords never stored in plain text | UC-04, UC-05 | TC-11 | Issue #3 ([SEC-01]) | Epic 1 |
| **NFR-04** | Protected functions require authorization | Protected UCs | TC-02, TC-09, TC-15 | Issue #4 ([SEC-02]) | Epic 1 |
| **NFR-05** | Responsive & accessible interface | All UI UCs | TC-12 | Issue #16 ([NFR-05]) | Epic 6 |
| **NFR-06** | Consistent event & registration data | UC-06, UC-07 | TC-13 | Issue #13 ([NFR-06]) | Epic 3 |
| **NFR-07** | Modular client-server components | System Arch | TC-14 | Issue #14 ([NFR-07]) | Epic 6 |
| **SEC-01** | Secure password hashing (bcrypt) | UC-04, UC-05 | TC-11 | Issue #3 ([SEC-01]) | Epic 1 |
| **SEC-02** | Role-based access control (RBAC) | UC-05, Protected UCs | TC-02, TC-09 | Issue #4 ([SEC-02]) | Epic 1 |
| **SEC-03** | Inbound payload validation/sanitization | All API mutations | TC-16 | Issue #37 ([SEC-03]) | Epic 6 |
| **SEC-04** | Secure session handling & token expiry | UC-05, Protected UCs | TC-02, TC-16 | Issue #5 ([SEC-04]) | Epic 1 |
| **SEC-05** | Admin access & privilege restriction | UC-17, UC-18, UC-19 | TC-09, TC-18 | Issue #21 ([SEC-05]) | Epic 5 |
