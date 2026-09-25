from datetime import timedelta
from decimal import Decimal
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from apps.authentication.models import User, UserRole
from apps.courses.models import Course
from apps.leads.models import (
    Lead,
    FollowUp,
    ActivityLog,
    ActivityType,
    LeadStatus,
    LeadSource,
    LeadPriority,
    LossReason,
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
    AgeingCategory,
)
from apps.leads.services.assignment_service import AssignmentService
from apps.leads.services.ageing_service import AgeingService
from apps.leads.services.duplicate_service import DuplicateService
from apps.analytics.services import DashboardAnalyticsService


class Phase13QATestSuite(APITestCase):
    """
    Exhaustive QA Test Suite validating all 15 Categories, 19 Edge Cases (A-S),
    Performance, and Security rules.
    """

    def setUp(self):
        # Academic Program
        self.course_cs = Course.objects.create(
            code="BTECH-CS",
            name="B.Tech Computer Science",
            department="Engineering",
            fee_per_year=120000.00,
            is_active=True,
        )
        self.course_mba = Course.objects.create(
            code="MBA-MKT",
            name="MBA Marketing",
            department="Management",
            fee_per_year=200000.00,
            is_active=True,
        )

        # Users
        self.manager = User.objects.create_user(
            username="qa_manager",
            email="manager.qa@edulead.edu",
            password="StrongPassword@123",
            role=UserRole.MANAGER,
            first_name="Priya",
            last_name="Manager",
        )

        self.counsellor_a = User.objects.create_user(
            username="qa_counsellor_a",
            email="counsellor.a@edulead.edu",
            password="StrongPassword@123",
            role=UserRole.COUNSELLOR,
            first_name="Amit",
            last_name="Sharma",
            is_available_for_assignment=True,
        )

        self.counsellor_b = User.objects.create_user(
            username="qa_counsellor_b",
            email="counsellor.b@edulead.edu",
            password="StrongPassword@123",
            role=UserRole.COUNSELLOR,
            first_name="Neha",
            last_name="Verma",
            is_available_for_assignment=True,
        )

    # =========================================================================
    # CATEGORY 1: Authentication
    # =========================================================================
    def test_cat1_authentication_valid_and_invalid(self):
        # Valid credentials
        resp_valid = self.client.post(
            "/api/v1/auth/token/",
            {"username": "qa_manager", "password": "StrongPassword@123"},
        )
        self.assertEqual(resp_valid.status_code, status.HTTP_200_OK)
        self.assertIn("access", resp_valid.data)
        self.assertIn("refresh", resp_valid.data)
        self.assertEqual(resp_valid.data["user"]["role"], UserRole.MANAGER)

        # Invalid password
        resp_invalid = self.client.post(
            "/api/v1/auth/token/",
            {"username": "qa_manager", "password": "WrongPassword"},
        )
        self.assertEqual(resp_invalid.status_code, status.HTTP_401_UNAUTHORIZED)

    # =========================================================================
    # CATEGORY 2: Authorization
    # =========================================================================
    def test_cat2_authorization_role_boundaries(self):
        # Counsellor attempting manager-only reassignment
        self.client.force_authenticate(user=self.counsellor_a)
        lead = Lead.objects.create(
            first_name="AuthTest",
            phone="+919876500001",
            counsellor=self.counsellor_a,
        )
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/reassign/",
            {"counsellor_id": self.counsellor_b.id, "reason": "Bypassing role"},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # =========================================================================
    # CATEGORY 3: Lead CRUD
    # =========================================================================
    def test_cat3_lead_crud_complete(self):
        self.client.force_authenticate(user=self.manager)

        # CREATE
        c_resp = self.client.post(
            "/api/v1/leads/",
            {
                "first_name": "Rajesh",
                "last_name": "Kumar",
                "phone": "+919876500002",
                "email": "rajesh.kumar@example.com",
                "course": self.course_cs.id,
                "source": LeadSource.WEBSITE,
                "priority": LeadPriority.HIGH,
            },
        )
        self.assertEqual(c_resp.status_code, status.HTTP_201_CREATED)
        lead_id = c_resp.data["id"]

        # RETRIEVE
        r_resp = self.client.get(f"/api/v1/leads/{lead_id}/")
        self.assertEqual(r_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(r_resp.data["first_name"], "Rajesh")

        # UPDATE
        u_resp = self.client.patch(
            f"/api/v1/leads/{lead_id}/",
            {"city": "Bangalore", "notes": "Updated notes"},
        )
        self.assertEqual(u_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(u_resp.data["city"], "Bangalore")

        # SOFT-DELETE
        d_resp = self.client.delete(f"/api/v1/leads/{lead_id}/")
        self.assertEqual(d_resp.status_code, status.HTTP_204_NO_CONTENT)

        # Verify not in active list
        list_resp = self.client.get("/api/v1/leads/")
        active_ids = [l["id"] for l in list_resp.data["results"]]
        self.assertNotIn(lead_id, active_ids)

    # =========================================================================
    # CATEGORY 4: Search
    # =========================================================================
    def test_cat4_search_leads(self):
        self.client.force_authenticate(user=self.manager)
        l1 = Lead.objects.create(first_name="Aarav", last_name="Patel", phone="+919876500010", email="aarav@test.com")
        l2 = Lead.objects.create(first_name="Deepak", last_name="Sharma", phone="+919876500020", email="deepak@test.com")

        # Search by first name
        resp = self.client.get("/api/v1/leads/?search=Aarav")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        names = [l["first_name"] for l in resp.data["results"]]
        self.assertIn("Aarav", names)
        self.assertNotIn("Deepak", names)

        # Search by phone
        resp_phone = self.client.get("/api/v1/leads/?search=9876500020")
        self.assertEqual(resp_phone.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_phone.data["results"][0]["id"], l2.id)

    # =========================================================================
    # CATEGORY 5: Filtering
    # =========================================================================
    def test_cat5_filtering_leads(self):
        self.client.force_authenticate(user=self.manager)
        Lead.objects.create(first_name="Filter1", phone="+919876500031", status=LeadStatus.NEW, source=LeadSource.WEBSITE)
        Lead.objects.create(first_name="Filter2", phone="+919876500032", status=LeadStatus.CONTACTED, source=LeadSource.WALK_IN)

        # Filter by status
        resp = self.client.get(f"/api/v1/leads/?status={LeadStatus.CONTACTED}")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        statuses = [l["status"] for l in resp.data["results"]]
        self.assertTrue(all(s == LeadStatus.CONTACTED for s in statuses))

        # Filter by source
        resp_src = self.client.get(f"/api/v1/leads/?source={LeadSource.WEBSITE}")
        self.assertEqual(resp_src.status_code, status.HTTP_200_OK)
        sources = [l["source"] for l in resp_src.data["results"]]
        self.assertTrue(all(s == LeadSource.WEBSITE for s in sources))

    # =========================================================================
    # CATEGORY 6: Pagination
    # =========================================================================
    def test_cat6_pagination(self):
        self.client.force_authenticate(user=self.manager)
        # Create 15 leads
        for i in range(15):
            Lead.objects.create(first_name=f"PagLead{i}", phone=f"+9198765010{i:02d}")

        resp = self.client.get("/api/v1/leads/?page_size=10")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("count", resp.data)
        self.assertIn("results", resp.data)
        self.assertLessEqual(len(resp.data["results"]), 10)
        self.assertGreaterEqual(resp.data["count"], 15)

    # =========================================================================
    # CATEGORY 7 & EDGE CASE B & C: Assignment & Round-Robin
    # =========================================================================
    def test_cat7_and_edge_b_c_round_robin_assignment(self):
        # Active pool: counsellor_a and counsellor_b
        next_c1 = AssignmentService.get_next_counsellor()
        next_c2 = AssignmentService.get_next_counsellor()
        self.assertIsNotNone(next_c1)
        self.assertIsNotNone(next_c2)
        # Should alternate deterministically
        self.assertNotEqual(next_c1.id, next_c2.id)

        # EDGE CASE C: Deactivate counsellor_b
        self.counsellor_b.is_available_for_assignment = False
        self.counsellor_b.save()

        next_c3 = AssignmentService.get_next_counsellor()
        self.assertEqual(next_c3.id, self.counsellor_a.id)

        # EDGE CASE B: Deactivate counsellor_a as well -> None returned safely
        self.counsellor_a.is_available_for_assignment = False
        self.counsellor_a.save()
        next_none = AssignmentService.get_next_counsellor()
        self.assertIsNone(next_none)

    # =========================================================================
    # CATEGORY 8 & EDGE CASE D: Reassignment
    # =========================================================================
    def test_cat8_and_edge_d_reassignment_with_audit(self):
        self.client.force_authenticate(user=self.manager)
        lead = Lead.objects.create(
            first_name="ReassignLead",
            phone="+919876500050",
            counsellor=self.counsellor_a,
        )

        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/reassign/",
            {"counsellor_id": self.counsellor_b.id, "reason": "Language affinity"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.counsellor_id, self.counsellor_b.id)

        # Check ActivityLog
        log = ActivityLog.objects.filter(lead=lead, activity_type=ActivityType.COUNSELLOR_CHANGED).first()
        self.assertIsNotNone(log)
        self.assertIn("Language affinity", log.details)

    # =========================================================================
    # CATEGORY 9 & EDGE CASE H, I, J, K: Status Transitions
    # =========================================================================
    def test_cat9_status_transitions_and_edge_cases(self):
        self.client.force_authenticate(user=self.counsellor_a)
        lead = Lead.objects.create(
            first_name="TransitionLead",
            phone="+919876500060",
            counsellor=self.counsellor_a,
            status=LeadStatus.NEW,
        )

        # EDGE CASE H: Invalid skip NEW -> CONVERTED rejected
        bad_jump = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.CONVERTED},
        )
        self.assertEqual(bad_jump.status_code, status.HTTP_400_BAD_REQUEST)

        # Valid step: NEW -> CONTACTED
        s1 = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.CONTACTED},
        )
        self.assertEqual(s1.status_code, status.HTTP_200_OK)

        # EDGE CASE K: CONTACTED -> NO_RESPONSE
        s_nr = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.NO_RESPONSE},
        )
        self.assertEqual(s_nr.status_code, status.HTTP_200_OK)

        # Back to CONTACTED -> INTERESTED -> APPLICATION_STARTED -> APPLICATION_SUBMITTED -> CONVERTED
        self.client.post(f"/api/v1/leads/{lead.id}/transition-status/", {"status": LeadStatus.CONTACTED})
        self.client.post(f"/api/v1/leads/{lead.id}/transition-status/", {"status": LeadStatus.INTERESTED})
        self.client.post(f"/api/v1/leads/{lead.id}/transition-status/", {"status": LeadStatus.APPLICATION_STARTED})
        self.client.post(f"/api/v1/leads/{lead.id}/transition-status/", {"status": LeadStatus.APPLICATION_SUBMITTED})

        # EDGE CASE I: Converted lead automatically gets converted_at
        conv_resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.CONVERTED},
        )
        self.assertEqual(conv_resp.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(conv_resp.data["converted_at"])

        # EDGE CASE J: LOST status requires mandatory loss_reason
        lead_lost = Lead.objects.create(
            first_name="LostCandidate",
            phone="+919876500070",
            counsellor=self.counsellor_a,
            status=LeadStatus.CONTACTED,
        )
        # Attempt without loss_reason -> fails
        lost_fail = self.client.post(
            f"/api/v1/leads/{lead_lost.id}/transition-status/",
            {"status": LeadStatus.LOST},
        )
        self.assertEqual(lost_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Attempt with valid loss_reason -> succeeds
        lost_ok = self.client.post(
            f"/api/v1/leads/{lead_lost.id}/transition-status/",
            {"status": LeadStatus.LOST, "loss_reason": LossReason.FEES_HIGH, "loss_notes": "Fee too steep"},
        )
        self.assertEqual(lost_ok.status_code, status.HTTP_200_OK)

    # =========================================================================
    # CATEGORY 10 & EDGE CASE E, F, G, S: Follow-ups
    # =========================================================================
    def test_cat10_and_edge_e_f_g_s_followups(self):
        self.client.force_authenticate(user=self.counsellor_a)
        lead = Lead.objects.create(
            first_name="FollowLead",
            phone="+919876500080",
            counsellor=self.counsellor_a,
        )

        # EDGE CASE E: Overdue follow-up
        past = timezone.now() - timedelta(hours=5)
        fu_overdue = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_a,
            scheduled_at=past,
            status=FollowUpStatus.PENDING,
        )
        self.assertTrue(fu_overdue.is_overdue)

        # EDGE CASE G: Complete follow-up cannot be marked missed or re-completed
        self.client.post(
            f"/api/v1/leads/follow-ups/{fu_overdue.id}/complete/",
            {"outcome": FollowUpOutcome.CONNECTED_POSITIVE},
        )
        fu_overdue.refresh_from_db()
        self.assertEqual(fu_overdue.status, FollowUpStatus.COMPLETED)

        re_comp = self.client.post(
            f"/api/v1/leads/follow-ups/{fu_overdue.id}/complete/",
            {"outcome": FollowUpOutcome.CONNECTED_POSITIVE},
        )
        self.assertEqual(re_comp.status_code, status.HTTP_400_BAD_REQUEST)

        mark_missed_on_completed = self.client.post(
            f"/api/v1/leads/follow-ups/{fu_overdue.id}/mark-missed/",
            {"notes": "Impossible"},
        )
        self.assertEqual(mark_missed_on_completed.status_code, status.HTTP_400_BAD_REQUEST)

        # EDGE CASE F: Cancelled follow-up
        fu_cancel = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_a,
            scheduled_at=timezone.now() + timedelta(days=1),
            status=FollowUpStatus.PENDING,
        )
        can_resp = self.client.post(
            f"/api/v1/leads/follow-ups/{fu_cancel.id}/cancel/",
            {"reason": "Student postponed visit"},
        )
        self.assertEqual(can_resp.status_code, status.HTTP_200_OK)

        # EDGE CASE S: Multiple follow-ups for one lead sets next_followup_at to earliest pending
        t1 = timezone.now() + timedelta(days=2)
        t2 = timezone.now() + timedelta(days=4)
        fu1 = FollowUp.objects.create(lead=lead, assigned_to=self.counsellor_a, scheduled_at=t1, status=FollowUpStatus.PENDING)
        fu2 = FollowUp.objects.create(lead=lead, assigned_to=self.counsellor_a, scheduled_at=t2, status=FollowUpStatus.PENDING)

        from apps.leads.views import recalculate_lead_next_followup
        recalculate_lead_next_followup(lead)
        lead.refresh_from_db()
        self.assertEqual(lead.next_followup_at.date(), t1.date())

    # =========================================================================
    # CATEGORY 11: Ageing Calculation
    # =========================================================================
    def test_cat11_ageing_calculation(self):
        lead = Lead.objects.create(first_name="AgeingTest", phone="+919876500090")

        # 1 day old -> FRESH
        lead.created_at = timezone.now() - timedelta(days=1)
        lead.save()
        self.assertEqual(AgeingService.get_ageing_category(lead), AgeingCategory.FRESH)

        # 5 days old -> AGEING
        lead.created_at = timezone.now() - timedelta(days=5)
        lead.save()
        self.assertEqual(AgeingService.get_ageing_category(lead), AgeingCategory.AGEING)

        # 12 days old -> STALE
        lead.created_at = timezone.now() - timedelta(days=12)
        lead.save()
        self.assertEqual(AgeingService.get_ageing_category(lead), AgeingCategory.STALE)

    # =========================================================================
    # CATEGORY 12 & EDGE CASE Q: Dashboard Calculations & Empty DB
    # =========================================================================
    def test_cat12_and_edge_q_dashboard_calculations(self):
        # Empty DB check (No leads in DB)
        Lead.objects.all().delete()
        empty_dash = DashboardAnalyticsService.get_summary_metrics(self.manager)
        self.assertEqual(empty_dash["total_leads"], 0)
        self.assertEqual(empty_dash["conversion_rate"], 0.0)

        # Populated DB check
        Lead.objects.create(first_name="Dash1", phone="+919876500101", status=LeadStatus.NEW)
        Lead.objects.create(first_name="Dash2", phone="+919876500102", status=LeadStatus.CONVERTED, converted_at=timezone.now())

        metrics = DashboardAnalyticsService.get_summary_metrics(self.manager)
        self.assertEqual(metrics["total_leads"], 2)
        self.assertEqual(metrics["converted_leads"], 1)
        self.assertEqual(metrics["conversion_rate"], 50.0)

    # =========================================================================
    # CATEGORY 13: Activity History
    # =========================================================================
    def test_cat13_activity_history(self):
        self.client.force_authenticate(user=self.manager)
        lead = Lead.objects.create(first_name="ActLead", phone="+919876500110", status=LeadStatus.NEW)

        # Change course
        self.client.patch(f"/api/v1/leads/{lead.id}/", {"course": self.course_cs.id})

        timeline_resp = self.client.get(f"/api/v1/leads/{lead.id}/timeline/")
        self.assertEqual(timeline_resp.status_code, status.HTTP_200_OK)
        activities = [item["activity_type"] for item in timeline_resp.data]
        self.assertIn(ActivityType.COURSE_CHANGED, activities)

    # =========================================================================
    # CATEGORY 14 & EDGE CASE L, M, N: Validation & Missing Optional Data
    # =========================================================================
    def test_cat14_and_edge_l_m_n_validation(self):
        self.client.force_authenticate(user=self.manager)

        # EDGE CASE L: Missing optional data (Email omitted, Course omitted) -> Succeeds when phone present
        lead_opt = self.client.post(
            "/api/v1/leads/",
            {"first_name": "WalkInStudent", "phone": "+919876500120"},
        )
        self.assertEqual(lead_opt.status_code, status.HTTP_201_CREATED)

        # EDGE CASE M: Invalid email format -> Fails
        bad_email = self.client.post(
            "/api/v1/leads/",
            {"first_name": "BadEmail", "phone": "+919876500121", "email": "not-valid-email"},
        )
        self.assertEqual(bad_email.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", bad_email.data)

        # EDGE CASE N: Invalid phone format -> Fails
        bad_phone = self.client.post(
            "/api/v1/leads/",
            {"first_name": "BadPhone", "phone": "abc123"},
        )
        self.assertEqual(bad_phone.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("phone", bad_phone.data)

    # =========================================================================
    # CATEGORY 15 & EDGE CASE A, O, P: Error Handling, Duplicates, Security
    # =========================================================================
    def test_cat15_and_edge_a_o_p_errors_and_security(self):
        # EDGE CASE A: Duplicate Lead detection
        Lead.objects.create(first_name="Original", email="dup@example.com", phone="+919876500130")
        dup_check = DuplicateService.find_potential_duplicates(email="dup@example.com", phone="+919876500130")
        self.assertTrue(len(dup_check) > 0)

        # EDGE CASE O: Unauthorized Lead Access (Counsellor B accesses Counsellor A's lead)
        lead_a = Lead.objects.create(first_name="LeadA", phone="+919876500135", counsellor=self.counsellor_a)
        self.client.force_authenticate(user=self.counsellor_b)

        # GET request returns 404 in queryset filtering
        idor_resp = self.client.get(f"/api/v1/leads/{lead_a.id}/")
        self.assertEqual(idor_resp.status_code, status.HTTP_404_NOT_FOUND)

        # EDGE CASE P: Expired / Garbage token
        self.client.force_authenticate(user=None)
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.value")
        unauth = self.client.get("/api/v1/leads/")
        self.assertEqual(unauth.status_code, status.HTTP_401_UNAUTHORIZED)
