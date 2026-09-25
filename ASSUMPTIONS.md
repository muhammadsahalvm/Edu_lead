# EduLead Project Assumptions & Design Rationale

This document documents all foundational assumptions, product trade-offs, and technical design decisions made throughout the architecture and implementation of **EduLead**.

To provide full transparency, assumptions are categorized into:
1. **Assessment Requirements**: Inviolable constraints mandated by the functional specifications.
2. **Product Assumptions**: Domain assumptions regarding higher education admissions operations.
3. **Engineering Decisions**: Architectural, database, and algorithmic choices made to implement requirements robustly.

---

## 1. Categorized Assumptions Matrix

### A. Lead Statuses & Lifecycle Transitions

| Category | Assumption & Decision Details |
|---|---|
| **Assessment Requirement** | The lifecycle must support structured stages (`NEW`, `CONTACTED`, `INTERESTED`, `COUNSELLING_SCHEDULED`, `APPLICATION_STARTED`, `APPLICATION_SUBMITTED`, `CONVERTED`). Direct illegal jumps must be blocked. |
| **Product Assumption** | In a real admissions office, candidates do not jump from an initial website enquiry directly to enrolled without qualification, counselling, and submitting a formal application. However, candidates can drop out at *any* intermediate stage due to financial constraints, choosing another college, or non-responsiveness. |
| **Engineering Decision** | Implemented a finite state machine inside `LifecycleService`: <br>1. Non-linear forward qualification requires advancing through intermediate milestones.<br>2. Terminal drop-outs (`LOST` or `NOT_INTERESTED`) are reachable from any active state provided a mandatory `loss_reason` is supplied.<br>3. Once a lead is marked `CONVERTED`, `LOST`, or `NOT_INTERESTED`, it is locked against further counsellor updates. Only managers can reopen or reassign a closed record. |

---

### B. Ageing Thresholds & Calculation

| Category | Assumption & Decision Details |
|---|---|
| **Assessment Requirement** | Ageing must be dynamically calculated from `created_at`: `0–2 days = Fresh`, `3–7 days = Ageing`, `8+ days = Stale`. Do not permanently store ageing labels if they can be dynamically derived. |
| **Product Assumption** | Admissions velocity matters: prospective students contacted within 48 hours have a 4x higher enrollment rate. Stale leads (8+ days old) represent critical operational debt requiring manager escalation. Closed/converted candidates should not be flagged as "Stale" as their lifecycle is finalized. |
| **Engineering Decision** | Ageing is computed dynamically in Python via `LifecycleService.calculate_ageing(created_at, status)`: <br>1. `elapsed_days <= 2` ➔ `FRESH`<br>2. `3 <= elapsed_days <= 7` ➔ `AGEING`<br>3. `elapsed_days >= 8` ➔ `STALE`<br>4. Any lead with status in `[CONVERTED, NOT_INTERESTED, LOST]` returns `CLOSED`.<br>5. Thresholds are configurable via environment variables (`LEAD_FRESH_DAYS_MAX=2`, `LEAD_AGEING_DAYS_MAX=7`). Storing computed labels in the DB was intentionally avoided to prevent cache invalidation anomalies and nightly cron overhead. |

---

### C. Round-Robin Counsellor Assignment

| Category | Assumption & Decision Details |
|---|---|
| **Assessment Requirement** | Implement deterministic round-robin assignment. Only active counsellors receive leads. Handle cases where no active counsellor exists. Record every assignment in `ActivityLog`. |
| **Product Assumption** | Admissions teams experience fluid availability: counsellors take leave, conduct campus tours, or hold private counselling sessions. If all counsellors are unavailable, new enquiries should *not* fail with server errors; they must be ingested into an "Unassigned" pool for manager triage. |
| **Engineering Decision** | Implemented in `AssignmentService`: <br>1. Active pool filter: `User.objects.filter(role=UserRole.COUNSELLOR, is_active=True, is_available_for_assignment=True).order_by('id')`.<br>2. Deterministic indexing: The service queries the last assigned lead's counsellor, finds their index in the ordered list, and selects `(index + 1) % len(pool)`.<br>3. Concurrency safety: Utilized database transactions with row-level locks (`select_for_update`) to prevent race conditions during concurrent enquiry ingestion.<br>4. Fallback: If `pool` is empty, the lead is safely saved with `counsellor=None` and flagged as `Unassigned`. |

---

### D. Duplicate Detection

| Category | Assumption & Decision Details |
|---|---|
| **Assessment Requirement** | Check for duplicate leads based on contact coordinates without prematurely blocking legitimate new enquiries. |
| **Product Assumption** | In educational admissions, duplicate enquiries are frequent: a student might enquire on the website, visit a campus fair two weeks later, and then call via WhatsApp. Furthermore, siblings or parents might submit enquiries for different family members using the same contact phone number or family email address. Therefore, hard-blocking submissions with 400 errors would cause severe lead loss. |
| **Engineering Decision** | Implemented non-blocking duplicate detection via `DuplicateService`: <br>1. The API exposes `/api/leads/check-duplicate/?phone=...&email=...`.<br>2. When creating a lead via the UI or API, existing leads sharing either the phone number (normalized) or email are returned in the response metadata as `potential_duplicates`.<br>3. The UI warns the intake staff with full context (existing lead number, status, assigned counsellor) while permitting submission if confirmed to be a distinct intake term or family member. |

---

### E. Conversion Definition

| Category | Assumption & Decision Details |
|---|---|
| **Assessment Requirement** | Clearly define conversion rate calculation and document the chosen definition. |
| **Product Assumption** | Conversion in admissions represents paid enrollment or formal registration into an academic cohort. It is a terminal success milestone. |
| **Engineering Decision** | Conversion rate is explicitly calculated as:
$$\text{Conversion Rate} = \left(\frac{\text{Total Converted Leads}}{\text{Total Leads Ingested}}\right) \times 100$$
1. Calculated to 2 decimal places.<br>2. When `Total Leads == 0`, conversion rate returns `0.00%` rather than raising a divide-by-zero exception.<br>3. `converted_at` timestamp is populated automatically when status switches to `CONVERTED` and cleared if a manager rolls back the status. |

---

### F. Follow-up & Task SLA Rules

| Category | Assumption & Decision Details |
|---|---|
| **Assessment Requirement** | Reusable logic for identifying overdue pending follow-ups. Support follow-up statuses: upcoming, today, overdue, completed, and missed. |
| **Product Assumption** | A scheduled interaction (e.g. phone call or counselling meeting) remains *Pending* until a counsellor executes it and logs the outcome. If the scheduled time passes and the task is still *Pending*, it is *Overdue*. Cancelled or completed tasks must never be classified as overdue. |
| **Engineering Decision** | Implemented in `FollowUp` model and service queries: <br>1. **Overdue Criteria**: `status == PENDING and scheduled_at < current_time`.<br>2. **Today Criteria**: `status == PENDING and scheduled_at__date == current_date`.<br>3. **Upcoming Criteria**: `status == PENDING and scheduled_at > current_time`.<br>4. **Completion**: Mandates selecting an outcome from an enumerated set (`CONNECTED_POSITIVE`, `MEETING_COMPLETED`, etc.) and automatically recalculates the parent lead's `last_contacted_at` and `next_followup_at`.<br>5. **Cancellation & Missed**: Mandates recording an operational reason to maintain queue audit integrity. |

---

## 2. Summary of Engineering Trade-offs

1. **MySQL with SQLite Test Support**: Selected MySQL 8.0 with InnoDB as the production standard to guarantee ACID row-level locking during round-robin distribution, while preserving SQLite capability for fast local CI test runner execution.
2. **Dynamic Ageing vs. Cron Jobs**: Avoided storing ageing categories in database columns updated by nightly cron jobs. Derived computation in serializers and single-pass SQL aggregations eliminates stale cache bugs and database write spikes.
3. **Soft Deletes vs. Hard Cascades**: Leads implement soft-delete (`is_deleted=True`). This guarantees that audit trails, past counsellor workloads, and compliance records remain fully reconstructible.
4. **Accessible Vanilla Tailwind vs. UI Kits**: Selected Tailwind CSS v4 without third-party component libraries (e.g., MUI or Ant Design) to achieve maximum performance, zero layout bloat, and complete control over WCAG 2.1 AA focus rings and high-density layouts.
