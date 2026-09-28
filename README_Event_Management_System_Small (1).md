# Event Management System

## Software Engineering Mini-Project – Part 1

### Team E7

| Name | SRN |
|---|---|
| Saketh Narayanam | PES1UG24CS292 |
| Neeraj R Gowda | PES1UG24CS295 |
| Likhith Reddy M | PES1UG24CS282 |
| N. Adil Ahmed | PES1UG24CS285 |

---

## 1. Project Overview

The **Event Management System** is a web-based application designed to make event management easier for both organizers and participants.

The system brings event details, registrations, participant information, and administrative activities into one place. Instead of depending on separate spreadsheets, forms, messages, or manual records, the system provides a single platform for handling the main event-management process.

Users can browse events, search or filter events, view event details, register for events, cancel registrations, and view their registered events. Organizers can create and manage events, set event capacity, view participants, and send event updates. Administrators can manage users, organizers, and events.

The project is being documented as a Software Engineering mini-project with separate documents for each major deliverable.

---

## 2. Problem Being Addressed

Managing events manually can become difficult when the number of events and participants increases.

Some common problems are:

- Manual registration takes time.
- Participant details can be duplicated or difficult to maintain.
- Organizers may have to manually count registrations.
- Keeping track of event capacity can be difficult.
- Event information may not be updated everywhere at the same time.
- Managing multiple events increases the amount of repetitive work.
- Participants may miss important event updates.
- Preparing reports from manual records takes additional effort.

The proposed system addresses these problems by keeping event and registration information together and making the main workflow easier to manage.

---

## 3. Main Objectives

The main objectives of the project are:

- Provide one place for managing event information and registrations.
- Make event discovery simple for users.
- Allow users to register for events online.
- Prevent registrations after an event reaches its capacity.
- Prevent duplicate registrations.
- Allow users to cancel their registrations.
- Help organizers manage events and participants.
- Allow event updates to be sent to registered participants.
- Give administrators controlled access to users, organizers, and events.
- Keep event and registration information accurate and secure.
- Reduce repetitive manual work.

---

## 4. Main Features

### For Visitors

- Browse available events.
- Search and filter events.
- View event details.
- Create an account.

### For Users / Attendees

- Log in securely.
- View and update their profile.
- Register for events.
- Cancel registrations.
- View registered events.
- Receive event notifications and updates.

### For Organizers

- Create events.
- Edit event details.
- Cancel events.
- Set event capacity.
- View registered participants.
- Monitor registration counts.
- Send event updates.
- Generate registration reports.

### For Administrators

- Manage user accounts.
- Manage organizer accounts.
- View and manage events.
- Remove inappropriate events.
- View system-level registration information.
- Access administrator-only functions.

---

## 5. Project Scope

The first version of the system focuses on the core event-management workflow.

### Included

- User registration and login
- Profile management
- Event creation and modification
- Event cancellation
- Event search and filtering
- Event registration
- Registration cancellation
- Event-capacity management
- Participant management
- Notifications and event updates
- Administrator management
- Event and registration reports

### Not Included in This Version

- Physical venue management
- Catering management
- Transportation management
- Advanced financial accounting
- Live event streaming
- AI-based event recommendations

These features are outside the current project scope so that the team can focus on implementing and testing the main system properly.

---

## 6. Technology Stack

The proposed technology stack is:

- **Frontend:** React.js
- **Backend:** Node.js and Express.js
- **Database:** MongoDB or MySQL
- **API:** REST-style backend APIs
- **Development:** Local development environment or project server
- **Browser Support:** Chrome, Edge, and Firefox

The final database choice can depend on the implementation version of the project.

---

## 7. System Architecture

The system follows a simple **layered client-server architecture**.

### Presentation Layer

This layer contains the React.js pages, forms, navigation, validation messages, and responsive user interface.

### Application / API Layer

This layer uses Node.js and Express.js to handle:

- Authentication
- Authorization
- Business rules
- Event management
- Registration logic
- Capacity checking
- Notifications
- API requests and responses

### Data Access Layer

This layer handles database queries, models, validation, and storage operations.

### Database Layer

The database stores:

- User accounts
- User roles
- Event information
- Registration records
- Participant information
- Report-related data

Keeping these layers separate makes the system easier to understand, develop, test, and maintain.

---

## 8. Security

Security is treated as an important part of the system because the application handles user accounts, event information, and registration records.

The main security requirements include:

- Passwords must not be stored as plain text.
- Passwords should use secure one-way hashing.
- Protected functions must require authentication.
- Role-based authorization should be used.
- User input should be validated before processing.
- Expired or unauthorized sessions should not be allowed to access protected functions.
- Administrator operations should be restricted to authorized administrators.

The project also includes planned security validation for authentication, authorization, password protection, input validation, session handling, access control, injection-related issues, and cross-site scripting.

---

## 9. Software Engineering Deliverables

The project documents are divided into separate files so that each deliverable can be submitted or reviewed independently.

### 01. Problem Statement

Describes the main problem, existing problems, proposed solution, and project objectives.

### 02. Feasibility Analysis

Covers technical, economic, operational, schedule, legal/security, and usability feasibility.

### 03. Project Scope

Defines what is included in the current system and what is outside the scope.

### 04. Software Requirements Specification

Contains:

- Purpose
- Overall description
- User requirements
- Organizer requirements
- Administrator requirements
- Functional requirements
- Non-functional requirements

### 05. Security Objectives and Requirements

Contains security objectives, security requirements, and planned security validation.

### 06. Use Case Model

Defines the system actors and the use cases associated with each actor.

### 07. UML Use Case Diagram

Provides the UML representation of the actors and major system interactions.

### 08. Software Test Plan

Describes the testing approach, test environment, test items, test strategy, security validation, entry and exit criteria, and defect handling.

### 09. Software Architecture

Contains the architecture pattern, system layers, component diagram, component descriptions, architecture traceability, and security architecture.

### 10. Detailed Design and Sequence Diagrams

Contains sequence diagrams for major workflows such as:

- User Login
- Event Registration

### 11. API and Error Handling

Contains the main API endpoints, common response codes, and the approach used for handling errors.

### 12. Test Cases

Contains the initial functional, security, performance, usability, reliability, and maintainability test cases.

### 13. Requirements Traceability Matrix

Connects the system requirements with their related use cases and test cases.

### 14. Validation and Testing Summary

Provides the overall validation approach for functional, non-functional, security, and penetration testing.

---

## 10. Requirements Summary

The project currently defines:

- **9 User Requirements**
- **8 Organizer Requirements**
- **6 Administrator Requirements**
- **10 Functional Requirements**
- **7 Non-Functional Requirements**
- **5 Security Requirements**
- **20 Use Cases**
- **14 Initial Test Cases**

The requirements are connected to the relevant use cases and test cases through the Requirements Traceability Matrix.

---

## 11. Testing Approach

Testing is based on the requirements of the system.

The project includes:

### Functional Testing

Checks whether the system performs the required actions correctly, such as:

- Account creation
- Login
- Event search
- Event viewing
- Event registration
- Registration cancellation
- Event creation
- Capacity management
- User and administrator functions

### Boundary Testing

Special attention is given to cases such as:

- Event capacity being reached
- Registration attempts after capacity is full
- Duplicate registration attempts
- Invalid or incomplete inputs

### Security Testing

Checks authentication, authorization, password protection, access control, session handling, and input validation.

### Performance Testing

Checks whether:

- Event listing loads within the defined time.
- Valid registration requests are processed within the defined time under normal conditions.

### Usability Testing

Checks whether the system is understandable, responsive, and usable on desktop and mobile screens.

### Reliability Testing

Checks whether registration and cancellation operations keep event capacity and registration counts consistent.

### Maintainability Checking

Reviews whether major functions are separated into modular components that can be maintained and extended.

---

## 12. Traceability

The Requirements Traceability Matrix is used to connect:

**Requirement → Use Case → Test Case**

For example:

`FR-04 → UC-06 → TC-04 / TC-05`

This helps the team check that each important requirement is represented in the system design and covered by testing.

---

## 13. Expected Outcome

The expected outcome of the project is a simple and practical event-management platform that can handle the main workflow from event discovery to registration and participant management.

The project also aims to demonstrate proper Software Engineering practices through:

- Clear requirements
- UML modelling
- Structured architecture
- Detailed design
- API planning
- Security planning
- Test planning
- Test cases
- Requirements traceability

---

## 14. Project Status

This README and the attached documents represent the **Part-1 documentation stage** of the project.

The documents describe the planned system, requirements, architecture, design, security considerations, and validation approach. The actual implementation and execution of all planned tests will be completed during the later development stages of the project.

---

## 15. Team

**Team E7**

**Members:**

1. Saketh Narayanam — PES1UG24CS292
2. Neeraj R Gowda — PES1UG24CS295
3. Likhith Reddy M — PES1UG24CS282
4. N. Adil Ahmed — PES1UG24CS285

---

## 16. Document Structure

The complete Part-1 submission is organized as follows:

```text
Event Management System
│
├── 01_Problem_Statement.docx
├── 02_Feasibility_Analysis.docx
├── 03_Project_Scope.docx
├── 04_Software_Requirements_Specification.docx
├── 05_Security_Objectives_and_Requirements.docx
├── 06_Use_Case_Model.docx
├── 07_UML_Use_Case_Diagram.docx
├── 08_Software_Test_Plan.docx
├── 09_Software_Architecture.docx
├── 10_Detailed_Design_Sequence_Diagrams.docx
├── 11_API_and_Error_Handling.docx
├── 12_Test_Cases.docx
├── 13_Requirements_Traceability_Matrix.docx
├── 14_Validation_and_Testing_Summary.docx
└── README_Event_Management_System_Small.md
```

---

## Conclusion

The Event Management System is designed as a straightforward platform for managing events and registrations. The Part-1 documentation covers the problem, scope, requirements, security, UML model, testing, architecture, detailed design, APIs, test cases, and traceability in separate documents.

The documents are kept separate to make the submission easier to organize, review, and update as the project moves into implementation.
