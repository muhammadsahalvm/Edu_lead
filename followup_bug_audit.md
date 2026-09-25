# Follow-Up Task Navigation & Authorization Bug — Final Audit & Resolution Report

> **Date**: 2026-09-25  
> **Status**: RESOLVED & VERIFIED (All 3 issues resolved; full test suites passing)

---

## Executive Summary

Following the previous audit of follow-up task navigation, an in-depth audit was conducted on three issues encountered in the Manager and Counsellor modules:
1. **Issue 1**: Lead lifecycle status transition returned **404 Not Found** (`"The requested resource was not found."`).
2. **Issue 2**: Session desynchronization between frontend UI and backend authorization, where the UI could render Manager controls while outgoing API requests carried a Counsellor JWT token (triggering 403 / 400 errors).
3. **Issue 3**: Verification and enforcement of Role-Based Access Control (RBAC) ensuring Managers can freely reassign leads and cross-assign during creation, while Counsellors are strictly constrained to self-assignment and forbidden from lead reassignment.

All three issues have been fixed and comprehensively verified with automated tests. No RBAC permissions were weakened, no business rules were relaxed, and no unnecessary backend routes were created.

---

## ISSUE 1 — Fix Lead Status Transition 404

### Root Cause
- **Frontend Route Mismatch**: In [`endpoints.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/endpoints.js), the status update endpoint was configured as `STATUS: (id) => '/api/v1/leads/' + id + '/status/'`.
- **Backend Route**: In [`backend/apps/leads/views.py`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/backend/apps/leads/views.py), the `LeadViewSet` status transition action is decorated with `@action(detail=True, methods=['post'], url_path='transition-status')`.
- DRF's router registered the endpoint at `/api/v1/leads/{id}/transition-status/`. The route `/api/v1/leads/{id}/status/` did not exist, causing Django to return HTTP 404, which [`client.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/client.js) translated into `"The requested resource was not found."`.

### Fix
- Updated [`frontend/src/api/endpoints.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/endpoints.js) line 18:
  ```javascript
  STATUS: (id) => `/api/v1/leads/${id}/transition-status/`,
  ```
- Verified that [`leadsService.updateLeadStatus()`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/leads.js) and [`StatusUpdateModal.jsx`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/components/leads/StatusUpdateModal.jsx) now target the registered route.

### Files Changed
- [`frontend/src/api/endpoints.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/endpoints.js)

### Test Performed
- **Automated API Transition Test**: Created a lead in status `NEW` and submitted `POST /api/v1/leads/{id}/transition-status/` with target status `CONTACTED` and transition remarks.
- Verified response status was **HTTP 200 OK**.
- Verified database record updated from `NEW` to `CONTACTED`.
- Verified `ActivityLog` recorded the status transition with actor, timestamp, and details.

### Final Result
**RESOLVED & VERIFIED ✅** (Status transitions now succeed with HTTP 200 and full audit trails).

---

## ISSUE 2 — Fix Manager/Counsellor Session Desynchronization

### Root Cause
- **Decoupled LocalStorage State**: [`AuthContext.jsx`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/context/AuthContext.jsx) previously restored sessions by reading `edulead_user` from `localStorage` without validating the token against the backend.
- If a user had an active `counsellor_amit` token, but `edulead_user` held a cached or stale manager object, React state computed `isManager = true`, displaying manager buttons (e.g., "Assign / Reassign" and "Admission Counsellor Assignment" dropdown).
- However, [`client.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/client.js) injected the actual JWT access token belonging to `counsellor_amit`.
- When the user performed manager actions, the backend evaluated the cryptographic JWT identity (`user.role == 'COUNSELLOR'`), triggering HTTP 403 on reassignment and HTTP 400 on cross-counsellor assignment.

### Fix
1. **Backend as Source of Truth on Session Init**:
   - Updated `initializeAuth` in [`AuthContext.jsx`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/context/AuthContext.jsx) to call `authService.getCurrentUser()` (`/api/v1/auth/me/`).
   - The user profile stored in state and `localStorage` is now strictly obtained from the backend using the verified JWT token.
   - If the token is invalid or identity verification fails, the stale session is completely purged (`edulead_access_token`, `edulead_refresh_token`, `edulead_user`, and Axios headers are removed).
2. **Atomic Login Cleanup**:
   - In `login()`, all stale authentication keys and axios headers are completely purged before the login request is sent.
   - On successful login, the new access token, refresh token, and backend-verified user profile are committed atomically.
3. **Clean Logout**:
   - In `logout()` and `handleUnauthorized`, all storage keys, Axios authorization defaults, and React state are reset.
4. **Dynamic Header Injection**:
   - Updated request interceptor in [`client.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/client.js) to dynamically inject the active token or delete `Authorization` if no token exists.

### Files Changed
- [`frontend/src/context/AuthContext.jsx`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/context/AuthContext.jsx)
- [`frontend/src/api/client.js`](file:///c:/Users/sahal/OneDrive/Desktop/edulead/frontend/src/api/client.js)

### Test Performed
- Verified `authService.getCurrentUser()` correctly resolves `/api/v1/auth/me/` with role `MANAGER` when logged in as `manager_priya`, and role `COUNSELLOR` when logged in as `counsellor_amit`.
- Tested session switching sequence: Manager login → logout → Counsellor login → logout → Manager login.
- Verified that in every state, the user profile and JWT identity matched identically.

### Final Result
**RESOLVED & VERIFIED ✅** (`edulead_user` and `edulead_access_token` can never represent divergent users; backend is the sole source of truth).

---

## ISSUE 3 — Verify Manager Assignment Permissions & Counsellor Security

### Verification Results

#### A. Manager Permissions (Verified Authenticated as `manager_priya`)
1. **Create Lead with Specific Counsellor Assignment**:
   - Created lead `LED-202609-E804FD` and directly assigned to `counsellor_amit`.
   - Result: **HTTP 201 Created**. Lead owner set to `counsellor_amit`.
2. **Reassign Existing Lead**:
   - Reassigned lead `LED-202609-2BE8A7` from `counsellor_amit` to `counsellor_neha` with reason *"Audit verification workload balancing"*.
   - Result: **HTTP 200 OK**. Lead owner updated to `counsellor_neha`. `ActivityLog` recorded: `Reassigned by manager_priya: Audit verification workload balancing`.
3. **Change Lead Status**:
   - Transitioned lead `LED-202609-2BE8A7` from `NEW` to `CONTACTED`.
   - Result: **HTTP 200 OK**. Status updated and logged in timeline.

#### B. Counsellor Restrictions (Verified Authenticated as `counsellor_amit`)
1. **Lead Reassignment Attempt**:
   - Submitted `POST /api/v1/leads/{id}/reassign/`.
   - Result: **HTTP 403 Forbidden** (`"Access forbidden. Only admissions managers are authorized to perform this action."`). Reassignment strictly prevented by `IsManager`.
2. **Cross-Counsellor Creation Attempt**:
   - Submitted `POST /api/v1/leads/` with `counsellor: counsellor_neha.id`.
   - Result: **HTTP 400 Bad Request** (`"Counsellor: Counsellors cannot create leads directly assigned to other counsellors."`). Cross-assignment strictly prevented by `LeadCreateUpdateSerializer.validate()`.
3. **Self-Assignment Creation**:
   - Submitted `POST /api/v1/leads/` with `counsellor: counsellor_amit.id`.
   - Result: **HTTP 201 Created**. Lead created and assigned to self.

### Files Changed
- No backend permission weakening was performed. Permissions and business rules remain strictly intact.

### Final Result
**RESOLVED & VERIFIED ✅** (Full RBAC integrity confirmed; Managers retain full reassignment authority; Counsellors strictly restricted).

---

## Regression Check

| Feature / Module | Verification Method | Status | Notes |
|---|---|---|---|
| **Authentication** | Token obtain, refresh, `/auth/me/` profile verification | **WORKING ✅** | Atomic storage & verified identity |
| **Manager Dashboard** | `/api/v1/analytics/dashboard/` via manager token | **WORKING ✅** | Full institutional overview rendered |
| **Counsellor Dashboard** | `/api/v1/analytics/dashboard/` via counsellor token | **WORKING ✅** | Scoped to individual assigned leads |
| **Lead Creation** | Manager cross-assignment & Counsellor self-assignment | **WORKING ✅** | Verified via test suite (HTTP 201) |
| **Lead Editing** | Patch lead contact/notes details | **WORKING ✅** | Permitted for assigned owner/manager |
| **Status Transitions** | `/api/v1/leads/{id}/transition-status/` | **WORKING ✅** | State machine transitions with audit logs |
| **Lead Assignment** | Round-robin auto-assignment & manager direct assign | **WORKING ✅** | Deterministic round-robin verified |
| **Lead Reassignment** | Manager reassignment with mandatory rationale | **WORKING ✅** | Creates `ActivityLog` and changes owner |
| **Follow-ups** | `apps.leads.test_followups` (8/8 passed) | **WORKING ✅** | Create, complete, reschedule, missed, overdue |
| **Activity History** | `ActivityLog` queries on lead transitions/reassignments | **WORKING ✅** | Immutable audit records generated |
| **RBAC Enforcement** | `IsManager`, `IsManagerOrAssignedCounsellor` | **WORKING ✅** | 403 Forbidden correctly returned to unauthorized users |
| **Frontend Production Build** | `npm run build` (Vite v8.3.1) | **WORKING ✅** | 2572 modules transformed; 0 errors |

---

## Conclusion

All three reported bugs have been identified, corrected at the root cause, and verified:
1. Status transition endpoint URL corrected to `/api/v1/leads/{id}/transition-status/`.
2. Session synchronization decoupled local storage and enforced `/api/v1/auth/me/` backend authority.
3. Manager reassignment and cross-assignment permissions verified working, while Counsellor security restrictions remain strictly enforced.
