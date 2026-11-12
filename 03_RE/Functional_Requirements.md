# Functional Requirements

This readable extract is based on the formal SRS at [`01_SRS_WBS/04_Software_Requirements_Specification.docx`](../01_SRS_WBS/04_Software_Requirements_Specification.docx). The SRS remains the authoritative source; this file does not independently claim that every requirement is implemented.

## User requirements

| ID | Requirement |
|---|---|
| UR-01 | Users shall be able to create an account. |
| UR-02 | Users shall be able to log into the system. |
| UR-03 | Users shall be able to browse available events. |
| UR-04 | Users shall be able to search and filter events. |
| UR-05 | Users shall be able to view event details. |
| UR-06 | Users shall be able to register for an event. |
| UR-07 | Users shall be able to cancel their registration. |
| UR-08 | Users shall be able to view their registered events. |
| UR-09 | Users shall receive confirmation after a successful registration. |

## Organizer requirements

| ID | Requirement |
|---|---|
| OR-01 | Organizers shall be able to create events. |
| OR-02 | Organizers shall be able to edit event details. |
| OR-03 | Organizers shall be able to cancel events. |
| OR-04 | Organizers shall be able to define maximum event capacity. |
| OR-05 | Organizers shall be able to view registered participants. |
| OR-06 | Organizers shall be able to monitor registration counts. |
| OR-07 | Organizers shall be able to send event updates to registered participants. |
| OR-08 | Organizers shall be able to generate registration reports. |

## Administrator requirements

| ID | Requirement |
|---|---|
| AR-01 | Administrators shall be able to log into the admin panel. |
| AR-02 | Administrators shall be able to manage user accounts. |
| AR-03 | Administrators shall be able to manage organizer accounts. |
| AR-04 | Administrators shall be able to view all events. |
| AR-05 | Administrators shall be able to remove inappropriate events. |
| AR-06 | Administrators shall be able to view system-level registration information. |

## Functional requirements

| ID | Requirement |
|---|---|
| FR-01 | The system shall allow users to create an account and log in. |
| FR-02 | The system shall allow visitors and users to browse, search, and filter events. |
| FR-03 | The system shall display event details including date, time, location, description, organizer, and capacity. |
| FR-04 | The system shall allow authenticated users to register for an event and reject registration when capacity is full. |
| FR-05 | The system shall prevent duplicate registration and allow users to cancel an existing registration. |
| FR-06 | The system shall allow users to view their registered events. |
| FR-07 | The system shall allow organizers to create, edit, and cancel events. |
| FR-08 | The system shall allow organizers to set capacity and view registered participants. |
| FR-09 | The system shall allow organizers to send event updates and view registration information. |
| FR-10 | The system shall allow organizers to generate registration reports. |
| FR-11 | The system shall allow administrators to manage users, organizers, and events. |

## Traceability

The [Requirements Traceability Matrix](13_Requirements_Traceability_Matrix.docx) maps requirements to use cases and test cases. Validation status and current test evidence are maintained separately in the test-planning documents.
