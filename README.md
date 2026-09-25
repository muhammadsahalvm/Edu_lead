# EduLead — Admissions Lead Management System

**EduLead** is an enterprise-grade admissions Customer Relationship Management (CRM) and lead lifecycle management platform built specifically for higher education institutions, universities, and professional training academies.

---

## 1. Problem Statement

Educational institutions face complex operational bottlenecks during admissions cycles:
1. **Lead Leakage & Delayed Outreach**: Prospective student enquiries originating from multiple acquisition channels (web forms, walk-ins, digital marketing, education expos, and referrals) are frequently misplaced, unassigned, or contacted after interest cools.
2. **Arbitrary & Biased Counsellor Allocation**: Manual lead allocation leads to counsellor cherry-picking, unbalanced operational workloads, and lack of accountability.
3. **Pipeline Invisibility**: Institution leaders and admissions deans lack real-time visibility into enquiry conversion funnels, channel yield, and counsellor responsiveness.
4. **Follow-up SLA Breaches**: Scheduled campus visits, phone callbacks, and counselling sessions frequently slip through the cracks without overdue detection or escalation.
5. **Audit Trail Deficits**: Critical lifecycle transitions, reassignments, and drop-out reasons are lost when managed via disparate spreadsheets.

---

## 2. Solution Overview

**EduLead** solves these challenges by combining a deterministic Django REST Framework backend engine with a high-density, accessible React operational dashboard. It automates:
- **Fair Round-Robin Assignment**: Automatically distributes new prospective student enquiries among active, available counsellors using atomic database transactions.
- **Dynamic Ageing Calculations**: Classifies leads in real-time as *Fresh* (0–2 days), *Ageing* (3–7 days), or *Stale* (8+ days) without fragile batch database updates.
- **Strict Lifecycle State Machine**: Enforces verified institutional progression (`NEW` → `CONTACTED` → `INTERESTED` → `COUNSELLING_SCHEDULED` → `APPLICATION_STARTED` → `APPLICATION_SUBMITTED` → `CONVERTED`), preventing illegitimate stage skipping while mandating structured loss reasons for attrition.
- **Overdue Task Tracking**: Tracks follow-up interactions across phone, WhatsApp, campus meetings, and email with automated SLA monitoring and outcome tracking.
- **Executive & Operational Analytics**: Provides managers with single-pass SQL aggregated metrics, funnel drop-off analysis, source ROI yield, and capacity balancing data.

---

## 3. Key Features

- **Role-Based Workspaces**: Tailored interfaces for Admissions Managers/Directors versus Front-line Admissions Counsellors.
- **Real-time Duplicate Detection**: Non-blocking duplicate detection on candidate phone numbers and emails to alert counsellors of repeat applicants without discarding valid entries.
- **Lead Intake & Multi-Dimensional Search**: Fast full-text candidate searching, course filtering, source attribution, and ageing filters with URL query persistence.
- **Interactive Operational Follow-up Center**: Dedicated task queue divided into *Today*, *Overdue*, *Upcoming*, *Completed*, and *Missed* interactions with one-click completion and reschedule modals.
- **Complete Chronological Activity Timeline**: Append-only audit logging capturing every lifecycle jump, counsellor reassignment, note append, and interaction outcome with actor attribution.
- **Counsellor Availability Toggle**: Counsellors can pause their availability queue when conducting tours or in meetings, dynamically updating round-robin distribution.
- **Zero-Friction Reassignment**: Managers can reassign single leads or batches with mandatory operational reasoning.

---

## 4. User Roles & Permissions

| Role | Scope | Permitted Actions | Restricted Actions |
|---|---|---|---|
| **Manager** (`MANAGER`) | Institution-wide | • View all leads and institution metrics<br>• Manually assign and reassign counsellors<br>• View counsellor capacity and workload tables<br>• Reopen terminal/closed leads<br>• Export operational reports | Cannot delete immutable activity audit records |
| **Counsellor** (`COUNSELLOR`) | Assigned Queue | • View own assigned leads<br>• Update candidate contact details and notes<br>• Progress permitted lifecycle stages<br>• Schedule and log follow-up outcomes<br>• Toggle own assignment availability | Cannot view unassigned leads<br>• Cannot reassign leads to peers<br>• Cannot view overall manager workload balance table<br>• Cannot reopen closed leads |

---

## 5. Technology Stack

### Backend
- **Framework**: Django 5.x with Django REST Framework (DRF)
- **Language**: Python 3.11+
- **Database**: MySQL 8.0+ (InnoDB storage engine with ACID transactional safety; SQLite supported as automated test fallback)
- **Authentication**: JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **Filtering & Search**: `django-filter` with custom database expressions
- **CORS**: `django-cors-headers`

### Frontend
- **Framework**: React 19 (functional components with hooks)
- **Build Tool**: Vite 8
- **Styling**: Tailwind CSS v4 (vanilla utility styling, institutional palette, no bloated component frameworks)
- **Routing**: React Router DOM v7
- **HTTP Client**: Axios with interceptors for token refresh, 401 handling, and global error normalization
- **Visualizations**: Recharts (accessible SVG responsive charts)
- **Icons**: Lucide React
- **Linter**: Oxlint

---

## 6. Architecture Overview

EduLead utilizes a decoupled Client-Server architecture:

```
[ Prospective Enquiries ]
          │ (Web / Walk-in / Campaign / Fair)
          ▼
┌────────────────────────────────────────────────────────┐
│               Frontend: React 19 + Vite                │
│  - Auth Context & Route Guards                         │
│  - Responsive 12-Column Dashboard                      │
│  - WCAG AA Keyboard Accessibility & Modals             │
└─────────────────────────┬──────────────────────────────┘
                          │ (REST APIs over HTTPS + JWT)
                          ▼
┌────────────────────────────────────────────────────────┐
│            Backend: Django REST Framework              │
│  - JWT Bearer Authentication                           │
│  - Role-Based Permissions (IsManager / IsOwner)        │
│  - Service Layer:                                      │
│      * AssignmentService (Atomic Round-Robin)          │
│      * LifecycleService (State Machine & Ageing)       │
│      * DuplicateService (Phone/Email Matching)         │
│      * ActivityService (Immutable Audit Logs)          │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                  Database: MySQL 8.0                   │
│  - Tables: users, leads, courses, followups, logs      │
│  - Row-Level Locking (`select_for_update`)             │
│  - Database Indices on status, counsellor, created_at  │
└────────────────────────────────────────────────────────┘
```

---

## 7. Setup & Installation Instructions

### Prerequisites
- Python 3.11 or higher
- Node.js 18.x or higher & npm
- MySQL Server 8.0+ (running locally on port 3306)
- Git

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/edulead.git
cd edulead
```

---

### Step 2: Backend Setup

1. **Create and Activate Virtual Environment**:
   ```bash
   # Windows PowerShell
   python -m venv env
   .\env\Scripts\activate

   # macOS / Linux
   python3 -m venv env
   source env/bin/activate
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r backend/requirements.txt
   ```

3. **Configure Environment Variables**:
   Copy the example environment configuration into `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Update `backend/.env` with your local MySQL database credentials:
   ```ini
   SECRET_KEY=django-insecure-edulead-admission-management-dev-key-2026-change-in-prod
   DEBUG=True
   ALLOWED_HOSTS=localhost,127.0.0.1

   DB_ENGINE=django.db.backends.mysql
   DB_NAME=edulead_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=127.0.0.1
   DB_PORT=3306

   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
   ACCESS_TOKEN_LIFETIME_MINUTES=60
   REFRESH_TOKEN_LIFETIME_DAYS=7
   LEAD_FRESH_DAYS_MAX=2
   LEAD_AGEING_DAYS_MAX=7
   ```

4. **Initialize MySQL Database**:
   Log into MySQL and create the database:
   ```sql
   CREATE DATABASE edulead_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

5. **Run Migrations**:
   ```bash
   cd backend
   python manage.py migrate
   ```

6. **Seed Realistic Demonstration Data**:
   Populate the database with courses, counsellors, manager, sample leads across all lifecycle stages, follow-ups, and audit history:
   ```bash
   python manage.py seed_demo_data
   ```

7. **Start Backend Server**:
   ```bash
   python manage.py runserver 8000
   ```
   The backend API will be live at `http://127.0.0.1:8000/`.

---

### Step 3: Frontend Setup

1. **Open a new terminal window** and navigate to the frontend directory:
   ```bash
   cd edulead/frontend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Start Frontend Dev Server**:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173/`.

---

## 8. Demo Credentials

The `seed_demo_data` command creates institutional testing accounts:

| Role | Username | Password | Email | Purpose |
|---|---|---|---|---|
| **Admissions Manager** | `manager_priya` | `Password@123` | `priya.sharma@edulead.edu` | Full institutional access, reassignment, reporting |
| **Counsellor 1** | `counsellor_amit` | `Password@123` | `amit.verma@edulead.edu` | High-load queue testing, follow-up execution |
| **Counsellor 2** | `counsellor_neha` | `Password@123` | `neha.sen@edulead.edu` | Balanced queue, scheduling tests |
| **Counsellor 3** | `counsellor_rahul`| `Password@123` | `rahul.roy@edulead.edu` | Active assignment queue testing |

---

## 9. Running Tests

### Backend Test Suites
Run the test suites using Django's test runner:

```bash
cd backend

# Run the comprehensive Phase 13 QA regression suite (15 tests)
python manage.py test apps.leads.test_phase13_qa_suite

# Run the full integration test suite (12 tests)
python manage.py test apps.leads.test_phase12_integration

# Run business rules & assignment unit tests
python manage.py test apps.leads.test_business_rules

# Run follow-up task unit tests
python manage.py test apps.leads.test_followups

# Run authentication & permissions tests
python manage.py test apps.authentication.tests

# Run analytics aggregation tests
python manage.py test apps.analytics.tests
```

### Frontend Build & Lint Verification
```bash
cd frontend

# Verify zero lint errors
npm run lint

# Verify clean production bundle build
npm run build
```

---

## 10. Known Limitations & Future Roadmap

1. **Telephony & Messaging Integration**: Currently, logging phone calls and WhatsApp messages records manual interaction summaries. Future phases will integrate Twilio and WhatsApp Business Cloud API for automated click-to-dial and message templating.
2. **Bulk File Import**: Leads are currently ingested via API or single-record registration. A CSV/Excel bulk intake wizard with validation previews is slated for the next release.
3. **Automated SLA Webhooks**: Overdue follow-ups are surfaced in real-time on the UI; background Celery workers can be attached to dispatch Slack/email alerts to managers when SLA thresholds (e.g., 4 hours past scheduled time) are violated.
4. **Reports Page**: The `/reports` route renders a placeholder layout. All analytics data (funnel, source attribution, ageing, counsellor workload) is fully computed by the backend `DashboardAnalyticsService` and displayed on the Dashboard. The dedicated reports page with date-range filtering and CSV export is planned for the next phase.
5. **CSV Export**: The export button on the Reports page is not yet wired. Data export via the Django admin or direct API (`/api/v1/leads/?format=json`) is available as a workaround.

