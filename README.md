# Event Management System

## Team E7

**Project:** Event Management System  
**Course:** Software Engineering  
**Team Members:**
- Saketh Narayanam – PES1UG24CS292
- Neeraj R Gowda – PES1UG24CS295
- Likhith Reddy M – PES1UG24CS282
- N. Adil Ahmed – PES1UG24CS285

---

## 1. Project Overview

The Event Management System is a web-based system designed to support event discovery, registration, event management, participant management, and administrative activities.

The system provides different functionality based on the user's role:

- Visitor
- User / Attendee
- Organizer
- Administrator

---

## 2. Main Features

### User / Attendee
- Create an account
- Login
- Browse events
- Search and filter events
- View event details
- Register for events
- Cancel registrations
- View registered events
- Receive event updates

### Organizer
- Create events
- Edit event details
- Cancel events
- Set event capacity
- View registered participants
- Monitor registrations
- Send event updates
- Generate registration reports

### Administrator
- Manage user accounts
- Manage organizer accounts
- View and manage events
- Remove inappropriate events
- View system-level registration information

---

## 3. Documentation

The `source_documents` folder contains the project documentation for Part 1.

| Document | Description |
|---|---|
| `01_Problem_Statement.docx` | Defines the problem addressed by the system |
| `02_Feasibility_Analysis.docx` | Describes the feasibility of the proposed system |
| `03_Project_Scope.docx` | Defines the scope and boundaries of the project |
| `04_Software_Requirements_Specification.docx` | Contains the software requirements and UML use-case model |
| `05_Security_Objectives_and_Requirements.docx` | Defines security objectives and security requirements |
| `06_Use_Case_Model.docx` | Describes the system use cases and actors |
| `08_Software_Test_Plan.docx` | Defines the testing approach and test planning |
| `09_Software_Architecture.docx` | Describes the software architecture and components |
| `10_Detailed_Design_Sequence_Diagrams.docx` | Contains detailed design and sequence diagrams |
| `11_API_and_Error_Handling.docx` | Describes API design and error handling |
| `12_Test_Cases.docx` | Contains functional and security test cases |
| `13_Requirements_Traceability_Matrix.docx` | Maps requirements to use cases and test cases |
| `14_Validation_and_Testing_Summary.docx` | Summarizes requirements validation and testing |

---

## 4. Requirements Structure

The project requirements are organized into:

- Functional Requirements (FR)
- Non-Functional Requirements (NFR)
- Security Requirements (SEC)
- User Requirements (UR)
- Organizer Requirements (OR)
- Administrator Requirements (AR)

The Requirements Traceability Matrix provides the mapping between requirements, use cases, and test cases.

---

## 5. Use Case Model

The system has four primary actors:

- **Visitor**
- **User / Attendee**
- **Organizer**
- **Administrator**

The complete UML use-case diagram is provided in:

`Use_Case_Diagram.png`

The detailed use-case descriptions are provided in:

`06_Use_Case_Model.docx`

---

## 6. Testing

Testing covers:

- Functional requirements
- Non-functional requirements
- Security requirements
- Authentication and authorization
- Event registration
- Capacity validation
- Registration cancellation
- Event management
- Participant management
- Registration reporting
- Administrator functions

The test cases are documented in:

`12_Test_Cases.docx`

The testing approach is documented in:

`08_Software_Test_Plan.docx`

---

## 7. Security

The system defines security requirements covering:

- Password protection
- Authentication
- Role-based authorization
- Input validation
- Session security
- Administrator access control

Security objectives and requirements are documented in:

`05_Security_Objectives_and_Requirements.docx`

---

## 8. Requirements Traceability

Requirements are traced through the project documentation to maintain consistency between:

**Requirements → Use Cases → Architecture/Design → Test Cases**

The complete traceability mapping is provided in:

`13_Requirements_Traceability_Matrix.docx`

---

## 9. Project Structure

```text
Event-Management-System-TEAM-E7/
│
├── README.md
├── Use_Case_Diagram.png
│
└── source_documents/
    ├── 01_Problem_Statement.docx
    ├── 02_Feasibility_Analysis.docx
    ├── 03_Project_Scope.docx
    ├── 04_Software_Requirements_Specification.docx
    ├── 05_Security_Objectives_and_Requirements.docx
    ├── 06_Use_Case_Model.docx
    ├── 08_Software_Test_Plan.docx
    ├── 09_Software_Architecture.docx
    ├── 10_Detailed_Design_Sequence_Diagrams.docx
    ├── 11_API_and_Error_Handling.docx
    ├── 12_Test_Cases.docx
    ├── 13_Requirements_Traceability_Matrix.docx
    └── 14_Validation_and_Testing_Summary.docx
