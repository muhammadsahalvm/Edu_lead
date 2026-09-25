# EduLead API Documentation

This document outlines the RESTful API endpoints for the **EduLead Admissions Lead Management System**.

- **Base URL**: `http://127.0.0.1:8000/api/v1`
- **Format**: JSON (`Content-Type: application/json`)
- **Authentication**: JWT Bearer token passed in the `Authorization` header:
  ```http
  Authorization: Bearer <access_token>
  ```

---

## Table of Contents
1. [Authentication Endpoints](#1-authentication-endpoints)
2. [Lead Management Endpoints](#2-lead-management-endpoints)
3. [Follow-up Task Endpoints](#3-follow-up-task-endpoints)
4. [Analytics & Reporting Endpoints](#4-analytics--reporting-endpoints)
5. [Academic Courses Endpoints](#5-academic-courses-endpoints)
6. [Global Error Responses](#6-global-error-responses)

---

## 1. Authentication Endpoints

### 1.1 User Login & Token Obtain
- **Method**: `POST`
- **URL**: `/auth/token/`
- **Authentication**: None (Public)
- **Permissions**: None
- **Request Body**:
  ```json
  {
    "username": "manager_priya",
    "password": "Password@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "manager_priya",
      "email": "priya.sharma@edulead.edu",
      "first_name": "Priya",
      "last_name": "Sharma",
      "role": "MANAGER",
      "is_available_for_assignment": true
    }
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Invalid credentials.
    ```json
    { "detail": "No active account found with the given credentials" }
    ```

---

### 1.2 Refresh Access Token
- **Method**: `POST`
- **URL**: `/auth/token/refresh/`
- **Authentication**: None
- **Request Body**:
  ```json
  {
    "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### 1.3 Toggle Counsellor Assignment Availability
- **Method**: `POST`
- **URL**: `/auth/toggle-availability/`
- **Authentication**: Bearer Token
- **Permissions**: Authenticated user (`COUNSELLOR` or `MANAGER`)
- **Request Body**: None
- **Success Response (200 OK)**:
  ```json
  {
    "status": "success",
    "is_available_for_assignment": false,
    "user": {
      "id": 2,
      "username": "counsellor_amit",
      "is_available_for_assignment": false
    }
  }
  ```

---

## 2. Lead Management Endpoints

### 2.1 List Leads
- **Method**: `GET`
- **URL**: `/leads/`
- **Authentication**: Bearer Token
- **Permissions**:
  - `MANAGER`: Retrieves all leads across the institution.
  - `COUNSELLOR`: Strictly filtered to leads where `counsellor == request.user`.
- **Query Parameters**:
  - `search` (string): Searches `first_name`, `last_name`, `email`, `phone`, `lead_number`.
  - `status` (string): Filter by enum (`NEW`, `CONTACTED`, `INTERESTED`, etc.).
  - `course` (int): Filter by Course ID.
  - `source` (string): Filter by acquisition channel (`WEBSITE`, `WALK_IN`, etc.).
  - `counsellor` (int | 'unassigned'): Filter by assigned Counsellor ID or unassigned leads.
  - `ageing` (string): Filter by tier (`FRESH`, `AGEING`, `STALE`).
  - `ordering` (string): Sort field (e.g. `-created_at`, `status`).
  - `page` (int), `page_size` (int): Pagination controls.
- **Success Response (200 OK)**:
  ```json
  {
    "count": 142,
    "next": "http://127.0.0.1:8000/api/leads/?page=2",
    "previous": null,
    "results": [
      {
        "id": 12,
        "lead_number": "LED-202609-0012",
        "first_name": "Aarav",
        "last_name": "Patel",
        "email": "aarav.patel@gmail.com",
        "phone": "+919876543210",
        "course": 1,
        "course_name": "B.Tech in Computer Science & AI",
        "source": "WEBSITE",
        "source_display": "Website Enquiry",
        "status": "NEW",
        "status_display": "New Enquiry",
        "priority": "HIGH",
        "counsellor": 2,
        "counsellor_name": "Amit Verma",
        "ageing_category": "FRESH",
        "next_followup_at": "2026-09-26T10:00:00Z",
        "created_at": "2026-09-25T08:30:00Z"
      }
    ]
  }
  ```

---

### 2.2 Create New Lead
- **Method**: `POST`
- **URL**: `/leads/`
- **Authentication**: Bearer Token
- **Permissions**: Authenticated user.
- **Behavior**: If `counsellor` is omitted or `null`, automatically triggers atomic round-robin assignment among active available counsellors.
- **Request Body**:
  ```json
  {
    "first_name": "Rohan",
    "last_name": "Mehta",
    "phone": "+919811122233",
    "email": "rohan.mehta@yahoo.com",
    "course": 1,
    "source": "WALK_IN",
    "priority": "MEDIUM",
    "city": "Mumbai",
    "state": "Maharashtra",
    "notes": "Interested in AI lab facilities."
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "id": 13,
    "lead_number": "LED-202609-0013",
    "first_name": "Rohan",
    "last_name": "Mehta",
    "counsellor": 3,
    "counsellor_name": "Neha Sen",
    "status": "NEW",
    "ageing_category": "FRESH",
    "created_at": "2026-09-25T11:00:00Z",
    "potential_duplicates": []
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Field validation error (e.g., missing first name or invalid phone number).
    ```json
    { "phone": ["Phone number must contain between 7 and 15 digits."] }
    ```

---

### 2.3 Check Duplicates (Non-blocking)
- **Method**: `GET`
- **URL**: `/leads/check-duplicate/?phone=+919876543210&email=test@gmail.com`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  {
    "has_duplicate": true,
    "duplicates": [
      {
        "id": 12,
        "lead_number": "LED-202609-0012",
        "first_name": "Aarav",
        "last_name": "Patel",
        "status": "NEW",
        "counsellor_name": "Amit Verma"
      }
    ]
  }
  ```

---

### 2.4 Update Lead Status (Lifecycle Transition)
- **Method**: `POST`
- **URL**: `/leads/{id}/update-status/`
- **Authentication**: Bearer Token
- **Permissions**: Manager or assigned Counsellor. (Counsellors cannot update closed leads).
- **Request Body (Advancing Lifecycle)**:
  ```json
  {
    "status": "CONTACTED",
    "remarks": "Spoke via phone call; candidate confirmed eligibility."
  }
  ```
- **Request Body (Terminal Drop-off)**:
  ```json
  {
    "status": "LOST",
    "loss_reason": "FEES_HIGH",
    "loss_notes": "Candidate opted for local state college due to tuition cost.",
    "remarks": "Candidate requested file closure."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "id": 12,
    "status": "CONTACTED",
    "status_display": "Contacted",
    "converted_at": null,
    "loss_reason": null
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid transition attempted.
    ```json
    { "error": "Invalid transition from NEW to APPLICATION_SUBMITTED. Allowed: ['CONTACTED', 'NOT_INTERESTED', 'LOST']" }
    ```
  - `400 Bad Request`: Missing mandatory loss reason for `LOST` status.
    ```json
    { "error": "A loss reason is mandatory when marking a lead as Lost or Not Interested." }
    ```

---

### 2.5 Reassign Counsellor
- **Method**: `POST`
- **URL**: `/leads/{id}/reassign/`
- **Authentication**: Bearer Token
- **Permissions**: `MANAGER` role strictly required.
- **Request Body**:
  ```json
  {
    "counsellor_id": 4,
    "reason": "Specialized in Computer Science scholarships."
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "detail": "Lead successfully reassigned to Rahul Roy.",
    "counsellor_id": 4,
    "counsellor_name": "Rahul Roy"
  }
  ```
- **Error Responses**:
  - `403 Forbidden`: Attempted by a Counsellor user.
    ```json
    { "detail": "You do not have permission to perform this action." }
    ```

---

### 2.6 Lead Activity Timeline
- **Method**: `GET`
- **URL**: `/leads/{id}/timeline/`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 105,
      "activity_type": "COUNSELLOR_CHANGED",
      "activity_type_display": "Counsellor Reassigned",
      "actor_name": "Priya Sharma (Manager)",
      "old_value": "Amit Verma",
      "new_value": "Rahul Roy",
      "description": "Reassigned lead from Amit Verma to Rahul Roy. Reason: Specialized in CS scholarships.",
      "created_at": "2026-09-25T09:15:00Z"
    },
    {
      "id": 101,
      "activity_type": "CREATED",
      "activity_type_display": "Lead Created",
      "actor_name": "System",
      "description": "Lead registered via Website Enquiry and auto-assigned to Amit Verma.",
      "created_at": "2026-09-25T08:30:00Z"
    }
  ]
  ```

---

## 3. Follow-up Task Endpoints

### 3.1 List Follow-ups
- **Method**: `GET`
- **URL**: `/follow-ups/`
- **Authentication**: Bearer Token
- **Query Parameters**:
  - `status` (`PENDING`, `COMPLETED`, `MISSED`, `CANCELLED`)
  - `followup_type` (`CALL`, `WHATSAPP`, `COUNSELLING`, `MEETING`, `EMAIL`)
  - `scheduled_at__date` (YYYY-MM-DD)
  - `assigned_to` (int, Manager only)
- **Success Response (200 OK)**: List of follow-up objects.

---

### 3.2 Get Overdue Follow-ups
- **Method**: `GET`
- **URL**: `/follow-ups/overdue/`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**: Returns all follow-ups where `status == PENDING` and `scheduled_at < now`.

---

### 3.3 Complete Follow-up
- **Method**: `POST`
- **URL**: `/follow-ups/{id}/complete/`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "outcome": "CONNECTED_POSITIVE",
    "notes": "Discussed scholarship eligibility; student will submit documents.",
    "next_followup_at": "2026-09-28T14:00:00Z",
    "next_followup_type": "CALL"
  }
  ```
- **Success Response (200 OK)**: Returns completed follow-up and automatically updates the parent lead's `next_followup_at`.

---

### 3.4 Cancel Follow-up
- **Method**: `POST`
- **URL**: `/follow-ups/{id}/cancel/`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "reason": "Candidate opted to reschedule directly with campus."
  }
  ```
- **Success Response (200 OK)**: Marks status `CANCELLED` and logs event in activity history.

---

### 3.5 Reschedule Follow-up
- **Method**: `POST`
- **URL**: `/follow-ups/{id}/reschedule/`
- **Authentication**: Bearer Token
- **Request Body**:
  ```json
  {
    "scheduled_at": "2026-09-29T16:00:00Z",
    "followup_type": "COUNSELLING",
    "notes": "Candidate requested afternoon session."
  }
  ```
- **Success Response (200 OK)**: Updates task and recalculates parent lead follow-up date.

---

## 4. Analytics & Reporting Endpoints

### 4.1 Executive Dashboard Metrics
- **Method**: `GET`
- **URL**: `/analytics/dashboard/`
- **Authentication**: Bearer Token
- **Permissions**: Authenticated user.
- **Success Response (200 OK)**:
  ```json
  {
    "summary": {
      "total_leads": 150,
      "new_leads": 24,
      "unassigned_leads": 0,
      "todays_followups": 18,
      "overdue_followups": 3,
      "converted_leads": 32,
      "conversion_rate": 21.33
    },
    "funnel": [
      { "stage": "NEW", "label": "New Enquiries", "count": 24 },
      { "stage": "CONTACTED", "label": "Contacted", "count": 30 },
      { "stage": "INTERESTED", "label": "Qualified Interest", "count": 25 },
      { "stage": "COUNSELLING_SCHEDULED", "label": "Counselling Scheduled", "count": 18 },
      { "stage": "APPLICATION_STARTED", "label": "App Started", "count": 12 },
      { "stage": "APPLICATION_SUBMITTED", "label": "App Submitted", "count": 9 },
      { "stage": "CONVERTED", "label": "Enrolled", "count": 32 }
    ],
    "source_analysis": [
      { "source": "WEBSITE", "label": "Website Enquiry", "count": 65 },
      { "source": "WALK_IN", "label": "Walk-in Campus Visit", "count": 35 }
    ],
    "course_analysis": [
      { "course_id": 1, "course_code": "BTECH_CS", "course_name": "B.Tech CS", "count": 80 }
    ],
    "ageing": {
      "fresh": 52,
      "ageing": 48,
      "stale": 18,
      "closed": 32
    },
    "counsellor_workload": [
      {
        "counsellor_id": 2,
        "full_name": "Amit Verma",
        "email": "amit.verma@edulead.edu",
        "is_available_for_assignment": true,
        "assigned_leads_count": 50,
        "pending_followups_count": 12,
        "overdue_followups_count": 1
      }
    ]
  }
  ```

---

## 5. Academic Courses Endpoints

### 5.1 List Courses
- **Method**: `GET`
- **URL**: `/courses/`
- **Authentication**: Bearer Token
- **Success Response (200 OK)**:
  ```json
  [
    {
      "id": 1,
      "code": "BTECH_CS",
      "name": "B.Tech in Computer Science & AI",
      "department": "School of Computing",
      "degree_level": "UNDERGRADUATE",
      "duration_years": "4.0",
      "fee_per_year": "320000.00",
      "is_active": true
    }
  ]
  ```

---

## 6. Global Error Responses

| HTTP Status | Description | Sample JSON Body |
|---|---|---|
| `400 Bad Request` | Validation failed or business rule violation | `{"field_name": ["Specific validation error message"]}` |
| `401 Unauthorized` | Missing, expired, or invalid JWT token | `{"detail": "Authentication credentials were not provided."}` |
| `403 Forbidden` | Role permission restriction (e.g. Counsellor accessing manager route) | `{"detail": "You do not have permission to perform this action."}` |
| `404 Not Found` | Requested entity does not exist or has been soft-deleted | `{"detail": "Not found."}` |
| `500 Server Error` | Unexpected backend runtime failure | `{"detail": "An internal server error occurred."}` |
