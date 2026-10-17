# Event Management System - Implementation (Team E7)

## Overview
This directory contains the full implementation of the **Event Management System (Team E7)** following the Software Requirements Specification (SRS), Architecture Design, and Test Plan in `PHASE_01`.

### Team Members
- **Saketh Narayanam** — PES1UG24CS292
- **Neeraj R Gowda** — PES1UG24CS295
- **Likhith Reddy M** — PES1UG24CS282
- **N. Adil Ahmed** — PES1UG24CS285

---

## Implemented Modules & Requirements Traceability

| ID | Module / Requirement | Implementation File | Status |
|---|---|---|---|
| **FR-01** | Account Registration & Secure Login | `server/routes/auth.js`, `server/middleware/auth.js` | ✅ Implemented (Bcrypt + JWT) |
| **FR-02** | Event Browsing, Search & Filter | `server/routes/events.js`, `client/js/app.js` | ✅ Implemented |
| **FR-03** | Event Detail & Real-time Capacity View | `server/routes/events.js`, `client/js/app.js` | ✅ Implemented |
| **FR-04** | Capacity Validation on Registration | `server/routes/events.js` (`POST /api/events/:id/register`) | ✅ Implemented (Rejects when full) |
| **FR-05** | Duplicate Prevention & Registration Cancellation | `server/routes/events.js` (`DELETE /api/events/:id/register`) | ✅ Implemented (UNIQUE constraint) |
| **FR-06** | Attendee Dashboard & Registered Events | `server/routes/users.js` (`GET /api/users/me/events`) | ✅ Implemented |
| **FR-07** | Organizer Event Creation, Modification & Cancellation | `server/routes/events.js` (POST, PUT, DELETE) | ✅ Implemented |
| **FR-08** | Organizer Participant Roster & Capacity Tracking | `server/routes/events.js` (`GET /api/events/:id/participants`) | ✅ Implemented |
| **FR-09** | Organizer Broadcast Updates & Notifications | `server/routes/events.js` (`POST /api/events/:id/updates`) | ✅ Implemented |
| **FR-10** | Admin Panel: User Roles, Event Moderation, Reports | `server/routes/admin.js`, `client/js/app.js` | ✅ Implemented |
| **NFR-03** | Passwords Not Stored as Plain Text | `server/db.js`, `server/routes/auth.js` (Bcrypt salt rounds 10) | ✅ Implemented |
| **NFR-04** | Role-Based Authorization | `server/middleware/auth.js` (`authorizeRoles`) | ✅ Implemented |

---

## Project Structure
```
SE_MINI_PROJECT/
├── client/                      # Modern, Responsive User Interface
│   ├── index.html               # Single-Page Application (Home, Attendee, Organizer, Admin)
│   ├── css/
│   │   └── style.css            # Custom CSS with responsive layouts & cards
│   └── js/
│       └── app.js               # Frontend router, modal manager, API connectors
├── server/                      # Node.js + Express API Backend
│   ├── db.js                    # SQLite database schema, constraints & auto-seeder
│   ├── server.js                # Express app entry point & static file server
│   ├── middleware/
│   │   └── auth.js              # JWT authentication & role-based access control
│   ├── routes/
│   │   ├── auth.js              # Login, Register, Profile endpoints
│   │   ├── events.js            # Event discovery, capacity, registration, updates
│   │   ├── users.js             # User registrations & organized events
│   │   └── admin.js             # Platform users, reports & moderation
│   ├── tests/
│   │   └── api.test.js          # Automated test suite (TC-01 to TC-09)
│   └── package.json             # Backend dependencies
├── PHASE_01/                    # Phase 1 SRS, UML, Architecture, and Test Plans
└── JIRA/                        # Sprint planning, backlog, and task logs
```

---

## How to Run the Application

### 1. Start the Server & Web App
From the `server` directory:
```bash
cd server
node server.js
```

### 2. Access the Application
Open your web browser and navigate to:
```
http://localhost:5000
```

### 3. Pre-configured Test Accounts
| Role | Email | Password | Access / Capabilities |
|---|---|---|---|
| **Administrator** | `admin@ems.com` | `Admin@123` | Full Admin Console, user role updates, account suspension, system reports |
| **Organizer** | `organizer@ems.com` | `Org@123` | Organizer Studio, create/edit/cancel events, view rosters, broadcast updates |
| **Attendee (User)** | `likhith@ems.com` | `User@123` | Browse events, register, view registrations, cancel registrations |
