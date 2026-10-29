# Event Management System - Implementation (Team E7)

## Overview

This document describes the implementation of the **Event Management System (Team E7)**, developed in accordance with the Software Requirements Specification (SRS), architecture design, and test plan.

The system is a web-based application that supports event discovery, registration, event management, participant management, and administrative operations.

### Team Members

- **Saketh Narayanam** — PES1UG24CS292
- **Neeraj R Gowda** — PES1UG24CS295
- **Likhith Reddy M** — PES1UG24CS282
- **N. Adil Ahmed** — PES1UG24CS285

---

## Implemented Modules and Requirements Traceability

| ID | Module / Requirement | Implementation File | Status |
|---|---|---|---|
| **FR-01** | Account Registration and Secure Login | `server/routes/auth.js`, `server/middleware/auth.js` | Implemented; authentication and password hashing covered by automated tests |
| **FR-02** | Event Browsing, Search, and Filtering | `server/routes/events.js`, `client/js/app.js` | Implemented |
| **FR-03** | Event Details and Capacity View | `server/routes/events.js`, `client/js/app.js` | Implemented |
| **FR-04** | Capacity Validation on Registration | `server/routes/events.js` (`POST /api/events/:id/register`) | Implemented; full-capacity and concurrent-registration tests pass |
| **FR-05** | Duplicate Prevention and Registration Cancellation | `server/routes/events.js` | Implemented; registration lifecycle tests pass |
| **FR-06** | Attendee Dashboard and Registered Events | `server/routes/users.js` (`GET /api/users/me/events`) | Implemented |
| **FR-07** | Organizer Event Creation, Modification, and Cancellation | `server/routes/events.js` | Implemented |
| **FR-08** | Organizer Participant Roster and Capacity Tracking | `server/routes/events.js` (`GET /api/events/:id/participants`) | Implemented |
| **FR-09** | Organizer Broadcast Updates and Notifications | `server/routes/events.js` (`POST /api/events/:id/updates`) | Implemented |
| **FR-10** | Administration: User Roles, Event Moderation, and Reports | `server/routes/admin.js`, `client/js/app.js` | Implemented |
| **NFR-03** | Passwords Not Stored as Plain Text | `server/db.js`, `server/routes/auth.js` | Bcrypt password hashing; verified by an automated test |
| **NFR-04** | Role-Based Authorization | `server/middleware/auth.js` | Role-based access controls; authorization tests pass |

---

## Project Structure

```text
Event-Management-System-TEAM-E7/
├── .github/
│   └── workflows/
│       └── api-tests.yml       # GitHub Actions API test workflow
├── client/
│   ├── index.html              # Web application interface
│   ├── css/
│   │   └── style.css           # Interface styling and responsive layouts
│   └── js/
│       └── app.js              # Frontend logic and API integration
├── server/
│   ├── db.js                   # SQLite database schema and seed data
│   ├── server.js               # Express application and static file server
│   ├── middleware/
│   │   └── auth.js             # JWT authentication and role authorization
│   ├── routes/
│   │   ├── auth.js             # Authentication endpoints
│   │   ├── events.js           # Event and registration endpoints
│   │   ├── users.js            # User and registration endpoints
│   │   └── admin.js            # Administrative endpoints
│   ├── tests/
│   │   └── api.test.js         # Automated API and security tests
│   ├── package.json            # Backend dependencies and scripts
│   └── package-lock.json       # Locked dependency versions
├── docs/                       # Project documentation
├── JIRA/                       # Backlog and sprint planning evidence
├── README.md                   # Project overview and setup instructions
├── IMPLEMENTATION.md           # Implementation and testing details
├── BACKLOG.md                  # Product backlog
├── IEEE_Event_Management_System.pdf
└── Use_Case_Diagram.png
```

The structure above describes the main application and documentation files. Other repository files may be present.

---

## How to Run the Application

### 1. Install Dependencies

From the repository root:

```bash
cd server
npm ci
```

### 2. Start the Server and Web Application

From the `server` directory:

```bash
node server.js
```

The server should display its startup message and listen at:

```text
http://localhost:5000
```

### 3. Access the Application

Open the local URL in a web browser:

```text
http://localhost:5000
```

### 4. Preconfigured Test Accounts

The application includes seeded development accounts for testing.

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@ems.com` | `Admin@123` |
| Organizer | `organizer@ems.com` | `Org@123` |
| Attendee | `likhith@ems.com` | `User@123` |

These credentials are for the seeded development environment only. They must not be used for a production deployment.

---

## Automated API Testing

**Test file:** `server/tests/api.test.js`

Run the automated API suite from the `server` directory:

```bash
node --test ./tests/api.test.js
```

### Latest Recorded Local Test Result

| Metric | Result |
|---|---:|
| Total tests | 19 |
| Passed | 19 |
| Failed | 0 |
| Skipped | 0 |
| Cancelled | 0 |

The suite covers:

- Account registration and invalid login
- Event search and details
- Registration, duplicate prevention, cancellation, and re-registration
- Capacity validation and concurrent registration limits
- Organizer event creation
- Missing, invalid, expired, and revoked authentication tokens
- Password hashing
- SQL injection and malformed-input rejection
- Administrator role changes and non-administrator access denial
- Database integrity after failed validation and authorization requests

The recorded test run completed successfully. Results apply to the automated cases in this suite and do not establish that every planned test case or non-functional requirement has been verified.

---

## Continuous Integration

GitHub Actions is configured in:

```text
.github/workflows/api-tests.yml
```

The workflow:

- Runs on pushes to `main`.
- Runs on pull requests targeting `main`.
- Sets up Node.js 22.
- Installs backend dependencies using `npm ci`.
- Executes `node --test ./tests/api.test.js`.

The workflow was merged into `main` through pull request **#57**, and the GitHub Actions check passed.

---

## Remaining Verification Activities

The following activities require their own evidence and should not be considered complete solely because the API suite passes:

- Cross-browser verification using Chrome, Edge, and Firefox.
- Desktop and mobile responsive-layout checks.
- Usability and navigation verification.
- Measured response times for event listing and registration under the test plan's specified conditions.
- Completion and traceability of all planned test cases, including cases that require manual execution.
- Additional security checks specified in the test plan but not covered by the current automated suite.

Record the actual results, environment, and supporting evidence for each activity before marking it complete in the test report.

---

## Requirements Traceability

The implementation is organized around the functional requirements (FR), non-functional requirements (NFR), and security requirements (SEC) defined in the project documentation.

The requirements traceability matrix connects the requirements to the corresponding use cases, architecture and design components, and test cases.

Refer to the requirements traceability matrix and test plan in the `docs/` directory for the detailed mappings.
