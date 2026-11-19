# Non-Functional and Security Requirements

This readable extract is based on the formal SRS at [`01_SRS_WBS/04_Software_Requirements_Specification.docx`](../01_SRS_WBS/04_Software_Requirements_Specification.docx). The SRS remains the authoritative source; this file does not independently claim that every requirement is implemented.

## Non-functional requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | The event listing page shall load within 3 seconds under normal operating conditions. |
| NFR-02 | Performance | The system shall process a valid event-registration request within 2 seconds under normal system load. |
| NFR-03 | Security | User passwords shall not be stored in plain text. |
| NFR-04 | Security | Only authenticated and authorized users shall be allowed to access protected functions. |
| NFR-05 | Usability | The system shall provide a clear, user-friendly, and responsive interface on desktop and mobile devices. |
| NFR-06 | Reliability | The system shall maintain accurate and consistent event, registration, and capacity information. |
| NFR-07 | Maintainability | The system shall use modular components so future maintenance can be performed without unnecessary changes to unrelated modules. |

## Security requirements

| ID | Requirement |
|---|---|
| SEC-01 | Passwords shall be stored using secure one-way password hashing and shall never be stored as plain text. |
| SEC-02 | Protected functions shall require authentication and role-based authorization. |
| SEC-03 | The system shall validate user input before processing or storing it. |
| SEC-04 | The system shall manage sessions securely and reject unauthorized or expired access. |
| SEC-05 | Administrative actions shall be restricted to authorized administrator accounts. |

## Traceability and evidence

The [Requirements Traceability Matrix](13_Requirements_Traceability_Matrix.docx) maps these requirements to use cases and test cases. Measured performance results, security findings, and test limitations are recorded in the [project-wide testing audit](../02_Test_Planning/Project_Wide_Testing_Audit_Report.md).
