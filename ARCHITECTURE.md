# EduLead System Architecture

This document provides a comprehensive architectural breakdown of the **EduLead Admissions Lead Management System**, detailing the frontend, backend, database design, security boundaries, and core business services.

---

## 1. High-Level System Architecture

EduLead is engineered as an enterprise-grade, decoupled client-server web application adhering to the **Separation of Concerns (SoC)** principle:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                              │
│  React 19 SPA (Vite, Tailwind CSS v4, React Router 7, Recharts)        │
│  • AuthContext & Role-Based Route Guards                               │
│  • High-Density Dashboard & Accessible Modals                          │
│  • Global Axios Client with Auto-Refresh & Error Interception          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST (JSON)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION API LAYER                          │
│  Django REST Framework (DRF)                                           │
│  • SimpleJWT Authentication Middleware                                 │
│  • Permission Matrix (`IsManager`, `IsOwnerOrManager`)                 │
│  • Serializers with Strict Field-Level Validation                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          DOMAIN SERVICE LAYER                          │
│  Encapsulated Business Logic & Deterministic Services:                 │
│  • AssignmentService (Atomic Round-Robin Engine)                       │
│  • LifecycleService (State Machine & Dynamic Ageing Engine)            │
│  • DuplicateService (Trigram / Coordinate Matching)                    │
│  • ActivityService (Immutable Chronological Audit Logging)             │
│  • AnalyticsService (Single-Pass SQL Aggregation)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Django ORM / ACID Transactions
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                           PERSISTENCE LAYER                            │
│  MySQL 8.0 (InnoDB Storage Engine)                                     │
│  • Normalized Schema: Users, Leads, Courses, FollowUps, ActivityLogs   │
│  • Row-Level Locking (`select_for_update`) for Race Prevention         │
│  • Multi-Column Indices on `status`, `counsellor`, `created_at`        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture (React 19 + Vite)

### Directory Structure
```
frontend/src/
├── api/                  # API client, endpoints, and domain service wrappers
│   ├── client.js         # Axios instance, token interceptors, error formatters
│   ├── endpoints.js      # Centralized REST route catalog
│   ├── followups.js      # Follow-up task operations
│   └── leads.js          # Lead CRUD, assignment, and status operations
├── components/
│   ├── common/           # Atomic UI primitives (Button, Input, Badge, Card, etc.)
│   ├── dashboard/        # Executive charts & operational task widgets
│   ├── followups/        # Follow-up creation and action modals
│   ├── layout/           # Sidebar, Header, Breadcrumbs, Responsive Layout Shell
│   ├── leads/            # Status transition and reassignment modals
│   └── timeline/         # Chronological activity timeline
├── context/
│   ├── AuthContext.jsx   # Authentication state, login/logout, availability toggle
│   └── ToastContext.jsx  # Non-blocking notification queue
├── pages/                # Route views (Dashboard, LeadsList, LeadDetail, Create, Edit, FollowUps, Reports, Login)
└── App.jsx               # Application routing and error boundary configuration
```

### Architectural Highlights
1. **Unidirectional State Flow**: Global authentication state and active token tokens reside in `AuthContext`. Page components orchestrate local query states, filters, and modal toggles, delegating mutations to modular API client services.
2. **Global Error Normalization**: The API client (`client.js`) intercepts all HTTP error responses (400, 401, 403, 404, 500, network offline). The helper function `formatApiError()` cleans raw server payloads into user-friendly prose, preventing raw Python stack traces from leaking into the UI.
3. **Optimized Network Interception**: JWT access tokens are stored in `localStorage` and automatically injected into outbound `Authorization: Bearer <token>` headers. On encountering 401 Unauthorized errors, the client triggers a background refresh request using the stored refresh token before retrying the original request.
4. **Accessible Component Primitives**: All UI components (`Button`, `Input`, `Select`, `ConfirmDialog`) adhere to WCAG 2.1 AA guidelines. Interactive elements utilize `:focus-visible` styling, explicit ARIA roles, and keyboard `Escape` dismissal handlers.

---

## 3. Backend Architecture (Django 5 + DRF)

### App Modularization
```
backend/apps/
├── authentication/       # Custom User model, roles, JWT token views, availability toggle
├── courses/              # Academic degree catalog, departments, fees, and requirements
├── leads/                # Lead entity, follow-ups, activity logs, serializers, viewsets
│   └── services/         # Decoupled domain service layer
└── analytics/            # Aggregations, pipeline funnel queries, workload reports
```

### Decoupled Service-Layer Pattern
Rather than stuffing business rules into Django model methods or fat DRF viewsets, all business logic is isolated within dedicated domain service modules:
- **`AssignmentService`**: Governs round-robin allocation, handles unavailable staff, and logs reassignments.
- **`LifecycleService`**: Validates lifecycle state transitions, computes dynamic ageing, and sets conversion timestamps.
- **`DuplicateService`**: Performs real-time candidate duplicate checks based on normalized phone and email coordinates.
- **`ActivityService`**: Appends immutable audit records whenever state, assignments, or follow-ups change.

This architectural separation guarantees that business rules can be verified via unit tests without mocking HTTP request contexts.

---

## 4. Database Architecture & Schema Design

EduLead uses MySQL 8.0 with InnoDB to guarantee ACID compliance across concurrent multi-user admissions environments.

### Core Tables & Relationships

```
┌──────────────────┐           1:N           ┌──────────────────┐
│ authentication_  │────────────────────────<│   leads_lead     │
│       user       │ (counsellor)            │                  │
└────────┬─────────┘                         └────────┬─────────┘
         │                                            │
         │ 1:N (assigned_to)                          │ 1:N (lead)
         ▼                                            ▼
┌──────────────────┐                         ┌──────────────────┐
│  leads_followup  │                         │ leads_activitylog│
└──────────────────┘                         └──────────────────┘
         ▲                                            │
         │ 1:N (lead)                                 │
         └────────────────────────────────────────────┘
```

#### Key Schemas
1. **`User` (`authentication_user`)**:
   - `role`: Enum (`MANAGER`, `COUNSELLOR`).
   - `is_available_for_assignment`: Boolean flag allowing counsellors to pause intake during meetings/tours.
   - Standard audit fields (`date_joined`, `is_active`).

2. **`Lead` (`leads_lead`)**:
   - `lead_number`: Unique institutional candidate identifier (e.g. `LED-202609-0001`), generated deterministically.
   - `first_name`, `last_name`, `email` (nullable for walk-ins), `phone` (indexed).
   - `status`: Enum (`NEW`, `CONTACTED`, `INTERESTED`, `COUNSELLING_SCHEDULED`, `APPLICATION_STARTED`, `APPLICATION_SUBMITTED`, `CONVERTED`, `NO_RESPONSE`, `NOT_INTERESTED`, `LOST`).
   - `priority`: Enum (`HIGH`, `MEDIUM`, `LOW`).
   - `source`: Enum (`WEBSITE`, `WALK_IN`, `PHONE`, `WHATSAPP`, `EDUCATION_FAIR`, `CAMPAIGN`, `REFERRAL`, `OTHER`).
   - `converted_at`: Nullable timestamp populated atomically upon reaching `CONVERTED`.
   - `loss_reason`: Mandatory enum when reaching `LOST` or `NOT_INTERESTED`.
   - `is_deleted`: Soft-delete flag preserving historical audit records.

3. **`FollowUp` (`leads_followup`)**:
   - `followup_type`: Enum (`CALL`, `WHATSAPP`, `COUNSELLING`, `MEETING`, `EMAIL`).
   - `status`: Enum (`PENDING`, `COMPLETED`, `MISSED`, `CANCELLED`).
   - `outcome`: Logged outcome upon completion (`CONNECTED_POSITIVE`, `MEETING_COMPLETED`, etc.).
   - `scheduled_at`: Scheduled UTC timestamp.
   - `completed_at`: Completion UTC timestamp.
   - `is_overdue`: Dynamically computed property evaluated against current system time.

4. **`ActivityLog` (`leads_activitylog`)**:
   - Append-only immutable log with foreign keys to `lead` and `actor`.
   - `activity_type`: Enum (`CREATED`, `STATUS_CHANGED`, `COUNSELLOR_CHANGED`, `NOTE_ADDED`, `FOLLOWUP_SCHEDULED`, `FOLLOWUP_COMPLETED`, etc.).
   - `old_value`, `new_value`, `description`, `created_at`.

### Concurrency & Indexing Strategy
- **Row-Level Locking**: `select_for_update()` is employed during round-robin counsellor assignment to prevent race conditions when two web enquiries arrive simultaneously.
- **Database Indices**:
  - `leads_lead(status)`: Optimizes pipeline funnel and filter queries.
  - `leads_lead(counsellor_id)`: Accelerates counsellor queue isolation.
  - `leads_lead(created_at)`: Accelerates ageing sorting and date-range metrics.
  - `leads_followup(scheduled_at, status)`: Accelerates today/overdue follow-up queries.

---

## 5. Authentication & Authorization Security Architecture

### Authentication
- Uses standard JWT Bearer token authentication via `rest_framework_simplejwt`.
- Access token lifetime: 60 minutes.
- Refresh token lifetime: 7 days.
- Tokens encode `user_id`, `username`, `email`, and `role`.

### Authorization & RBAC Matrix
EduLead enforces role-based access control at the Django ViewSet query-level and serializer-level:

```python
class LeadViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.MANAGER:
            return Lead.objects.all()
        # Counsellors can strictly only query their assigned records
        return Lead.objects.filter(counsellor=user)
```

- **Manager Only**: Reassignment (`POST /api/leads/{id}/reassign/`), manager dashboard analytics (`/api/analytics/dashboard/`), reopening closed leads.
- **Object Ownership**: Counsellors cannot update, schedule follow-ups for, or view details of leads assigned to peer counsellors (enforced via `IsOwnerOrManager` DRF permission).

---

## 6. Business Logic Engine

### 1. Deterministic Round-Robin Counsellor Assignment
- **Goal**: Equitable, deterministic lead distribution among active counsellors.
- **Algorithm**:
  1. Retrieve all active users with `role=COUNSELLOR` and `is_available_for_assignment=True` ordered deterministically by `id`.
  2. If no active counsellor exists, create the lead with `counsellor=None` (flagged as `Unassigned` for manager triage).
  3. Query the most recently assigned lead that has an assigned counsellor.
  4. Find the index of the last-assigned counsellor in the ordered active list.
  5. Assign the new lead to `active_counsellors[(last_index + 1) % len(active_counsellors)]`.
  6. Execute within an atomic transaction (`@transaction.atomic`) to guarantee no two concurrent threads assign to the same counsellor out of turn.
  7. Record an `ActivityLog` entry documenting the auto-assignment.

### 2. Dynamic Ageing Engine
- **Goal**: Prevent leads from becoming stale without running risky scheduled batch jobs to update database columns.
- **Algorithm**:
  - Ageing is computed on the fly based on elapsed calendar time from `created_at` relative to current system time:
    - **Fresh**: 0 to 2 days elapsed (`elapsed <= timedelta(days=2)`).
    - **Ageing**: 3 to 7 days elapsed (`2 < elapsed <= 7 days`).
    - **Stale**: 8 or more days elapsed (`elapsed > 7 days`).
    - **Closed**: Any lead with status `CONVERTED`, `NOT_INTERESTED`, or `LOST` is categorized as `Closed`.
  - Ageing thresholds are configurable via backend environment variables (`LEAD_FRESH_DAYS_MAX`, `LEAD_AGEING_DAYS_MAX`).

### 3. Lifecycle State Machine
- **Goal**: Guard admission pipeline integrity by preventing invalid jumps.
- **Allowed Transitions**:
  ```
  NEW ───────────────► CONTACTED ───────────────► INTERESTED
                            │                          │
                            ▼                          ▼
                       NO_RESPONSE            COUNSELLING_SCHEDULED
                                                       │
                                                       ▼
                                              APPLICATION_STARTED
                                                       │
                                                       ▼
                                             APPLICATION_SUBMITTED
                                                       │
                                                       ▼
                                                   CONVERTED
  ```
- Any non-terminal state may transition to `LOST` or `NOT_INTERESTED` provided a valid `loss_reason` is supplied.
- Direct jumps skipping intermediate qualification stages (e.g., `NEW` directly to `CONVERTED`) are rejected with HTTP 400.
- Closed leads (`CONVERTED`, `NOT_INTERESTED`, `LOST`) cannot be altered or reopened by counsellors; only managers possess pipeline recovery rights.

---

## 7. Activity Logging Strategy

EduLead enforces an append-only audit trail via `ActivityService`:
- Every state mutation triggers an `ActivityLog` record inside the same database transaction.
- If the primary update fails or rolls back, no orphan log is created.
- Logs capture:
  - `lead`: Parent lead reference.
  - `actor`: User who initiated the action (or `None` for system auto-assignment).
  - `activity_type`: Enumerated event type.
  - `old_value` and `new_value`: Before-and-after states for full diff reconstruction.
  - `description`: Human-readable summary for the visual timeline.
  - `created_at`: Immutable timestamp.

---

## 8. Dashboard Aggregation Architecture

To prevent N+1 query bottlenecks and slow dashboard load times, the `AnalyticsService` utilizes single-pass SQL aggregations (`django.db.models.Count`, `Case`, `When`):

```python
# Single query aggregates all 7 core summary KPIs simultaneously
summary = Lead.objects.aggregate(
    total_leads=Count('id'),
    new_leads=Count('id', filter=Q(status=LeadStatus.NEW)),
    unassigned_leads=Count('id', filter=Q(counsellor__isnull=True)),
    converted_leads=Count('id', filter=Q(status=LeadStatus.CONVERTED)),
)
```

- **Conversion Rate Definition**: Defined as `(converted_leads / total_leads) * 100`, rounded to two decimal places. If `total_leads == 0`, rate defaults safely to `0.0%`.
- **Counsellor Workload Balancing**: Calculates assigned lead count, pending follow-up count, and overdue follow-up count per counsellor in a single annotated query, providing capacity balancing visibility without crude gamification.
