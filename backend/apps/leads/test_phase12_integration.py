from datetime import timedelta
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
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
)


class Phase12IntegrationTests(APITestCase):
    """
    Comprehensive end-to-end integration tests for all 6 flows and error scenarios
    specified in Phase 12.
    """

    def setUp(self):
        # 1. Create Course
        self.course = Course.objects.create(
            code="BTECH-CS",
            name="B.Tech Computer Science",
            department="Engineering",
            duration_years=4,
            fee_per_year=150000.00,
            is_active=True,
        )

        # 2. Create Users (Manager and Counsellor)
        self.manager = User.objects.create_user(
            username="manager_test",
            email="manager@edulead.edu",
            password="TestPassword@123",
            role=UserRole.MANAGER,
            first_name="Priya",
            last_name="Sharma",
        )

        self.counsellor = User.objects.create_user(
            username="counsellor_test",
            email="counsellor@edulead.edu",
            password="TestPassword@123",
            role=UserRole.COUNSELLOR,
            first_name="Amit",
            last_name="Verma",
            is_available_for_assignment=True,
        )

        self.counsellor_two = User.objects.create_user(
            username="counsellor_two",
            email="counsellor2@edulead.edu",
            password="TestPassword@123",
            role=UserRole.COUNSELLOR,
            first_name="Neha",
            last_name="Gupta",
            is_available_for_assignment=True,
        )

    # =========================================================================
    # FLOW 1: Manager login -> Dashboard -> Create lead -> Assign counsellor -> View lead
    # =========================================================================
    def test_flow_1_manager_complete_flow(self):
        # Step 1: Manager Login
        login_resp = self.client.post(
            "/api/v1/auth/token/",
            {"username": "manager_test", "password": "TestPassword@123"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        access_token = login_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Step 2: Access Dashboard Metrics
        dashboard_resp = self.client.get("/api/v1/analytics/dashboard/")
        self.assertEqual(dashboard_resp.status_code, status.HTTP_200_OK)
        self.assertIn("summary", dashboard_resp.data)

        # Step 3: Create Lead
        lead_payload = {
            "first_name": "Rohan",
            "last_name": "Deshmukh",
            "email": "rohan.deshmukh@example.com",
            "phone": "+919876543210",
            "source": LeadSource.WEBSITE,
            "priority": LeadPriority.HIGH,
            "course": self.course.id,
            "notes": "Interested in merit scholarship",
        }
        create_resp = self.client.post("/api/v1/leads/", lead_payload)
        self.assertEqual(create_resp.status_code, status.HTTP_201_CREATED)
        lead_id = create_resp.data["id"]
        lead_number = create_resp.data["lead_number"]
        self.assertTrue(lead_number.startswith("LED-"))

        # Step 4: Reassign / Assign Counsellor explicitly
        reassign_resp = self.client.post(
            f"/api/v1/leads/{lead_id}/reassign/",
            {"counsellor_id": self.counsellor.id, "reason": "Allocating to CS specialist"},
        )
        self.assertEqual(reassign_resp.status_code, status.HTTP_200_OK)

        # Step 5: View Lead Details & Activity Log
        detail_resp = self.client.get(f"/api/v1/leads/{lead_id}/")
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_resp.data["counsellor"], self.counsellor.id)
        self.assertEqual(detail_resp.data["first_name"], "Rohan")

        # Verify Activity Log contains creation and reassignment
        timeline_resp = self.client.get(f"/api/v1/leads/{lead_id}/timeline/")
        self.assertEqual(timeline_resp.status_code, status.HTTP_200_OK)
        activities = [item["activity_type"] for item in timeline_resp.data]
        self.assertIn(ActivityType.LEAD_CREATED, activities)
        self.assertIn(ActivityType.COUNSELLOR_CHANGED, activities)

    # =========================================================================
    # FLOW 2: Counsellor login -> View assigned leads -> Open lead -> Change status -> Schedule follow-up
    # =========================================================================
    def test_flow_2_counsellor_complete_flow(self):
        # Setup: Create lead assigned to counsellor
        lead = Lead.objects.create(
            first_name="Ananya",
            last_name="Roy",
            email="ananya.roy@example.com",
            phone="+919876512345",
            source=LeadSource.WALK_IN,
            course=self.course,
            counsellor=self.counsellor,
            status=LeadStatus.NEW,
        )

        # Create another lead assigned to counsellor_two
        other_lead = Lead.objects.create(
            first_name="Vikram",
            last_name="Singh",
            email="vikram.singh@example.com",
            phone="+919876554321",
            source=LeadSource.PHONE,
            course=self.course,
            counsellor=self.counsellor_two,
            status=LeadStatus.NEW,
        )

        # Step 1: Counsellor Login
        login_resp = self.client.post(
            "/api/v1/auth/token/",
            {"username": "counsellor_test", "password": "TestPassword@123"},
        )
        self.assertEqual(login_resp.status_code, status.HTTP_200_OK)
        access_token = login_resp.data["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

        # Step 2: View Assigned Leads (Authorization check: should NOT see other counsellor's lead)
        leads_resp = self.client.get("/api/v1/leads/")
        self.assertEqual(leads_resp.status_code, status.HTTP_200_OK)
        lead_ids = [l["id"] for l in leads_resp.data["results"]]
        self.assertIn(lead.id, lead_ids)
        self.assertNotIn(other_lead.id, lead_ids)

        # Step 3: Open Lead
        detail_resp = self.client.get(f"/api/v1/leads/{lead.id}/")
        self.assertEqual(detail_resp.status_code, status.HTTP_200_OK)

        # Step 4: Change Status via controlled lifecycle endpoint (NEW -> CONTACTED)
        status_resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.CONTACTED, "remarks": "First call conducted"},
        )
        self.assertEqual(status_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(status_resp.data["status"], LeadStatus.CONTACTED)

        # Step 5: Schedule Follow-up
        tomorrow = timezone.now() + timedelta(days=1)
        followup_resp = self.client.post(
            "/api/v1/leads/follow-ups/",
            {
                "lead": lead.id,
                "followup_type": FollowUpType.CALL,
                "scheduled_at": tomorrow.isoformat(),
                "notes": "Discuss brochure and campus tour",
            },
        )
        self.assertEqual(followup_resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(followup_resp.data["lead"], lead.id)
        self.assertEqual(followup_resp.data["status"], FollowUpStatus.PENDING)

    # =========================================================================
    # FLOW 3: Follow-up -> Upcoming -> Completed
    # =========================================================================
    def test_flow_3_followup_upcoming_to_completed(self):
        self.client.force_authenticate(user=self.counsellor)
        lead = Lead.objects.create(
            first_name="Kabir",
            last_name="Mehta",
            email="kabir.mehta@example.com",
            phone="+919876599999",
            source=LeadSource.WEBSITE,
            counsellor=self.counsellor,
        )

        future_time = timezone.now() + timedelta(days=2)
        followup = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor,
            followup_type=FollowUpType.WHATSAPP,
            scheduled_at=future_time,
            status=FollowUpStatus.PENDING,
        )

        # 1. Verify it is in upcoming queue
        upcoming_resp = self.client.get("/api/v1/leads/follow-ups/?is_upcoming=true")
        self.assertEqual(upcoming_resp.status_code, status.HTTP_200_OK)
        upcoming_ids = [f["id"] for f in upcoming_resp.data["results"]]
        self.assertIn(followup.id, upcoming_ids)

        # 2. Mark as completed with valid outcome
        complete_resp = self.client.post(
            f"/api/v1/leads/follow-ups/{followup.id}/complete/",
            {
                "outcome": FollowUpOutcome.CONNECTED_POSITIVE,
                "notes": "Candidate confirmed interest in B.Tech",
            },
        )
        self.assertEqual(complete_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(complete_resp.data["status"], FollowUpStatus.COMPLETED)
        self.assertIsNotNone(complete_resp.data["completed_at"])

        # 3. Verify it is no longer in upcoming queue
        upcoming_after = self.client.get("/api/v1/leads/follow-ups/?is_upcoming=true")
        upcoming_after_ids = [f["id"] for f in upcoming_after.data["results"]]
        self.assertNotIn(followup.id, upcoming_after_ids)

    # =========================================================================
    # FLOW 4: Follow-up -> Pending -> Past due -> Overdue
    # =========================================================================
    def test_flow_4_followup_overdue_detection(self):
        self.client.force_authenticate(user=self.counsellor)
        lead = Lead.objects.create(
            first_name="Sneha",
            last_name="Nair",
            email="sneha.nair@example.com",
            phone="+919876588888",
            source=LeadSource.CAMPAIGN,
            counsellor=self.counsellor,
        )

        # Create a past-due pending follow-up (3 hours ago)
        past_time = timezone.now() - timedelta(hours=3)
        past_followup = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor,
            followup_type=FollowUpType.CALL,
            scheduled_at=past_time,
            status=FollowUpStatus.PENDING,
        )

        # Verify it appears in overdue queue
        overdue_resp = self.client.get("/api/v1/leads/follow-ups/?is_overdue=true")
        self.assertEqual(overdue_resp.status_code, status.HTTP_200_OK)
        overdue_ids = [f["id"] for f in overdue_resp.data["results"]]
        self.assertIn(past_followup.id, overdue_ids)

        # Now mark as missed
        missed_resp = self.client.post(
            f"/api/v1/leads/follow-ups/{past_followup.id}/mark-missed/",
            {"notes": "Call not answered after multiple rings"},
        )
        self.assertEqual(missed_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(missed_resp.data["status"], FollowUpStatus.MISSED)

        # Verify it leaves overdue queue (overdue is strictly for PENDING status)
        overdue_after = self.client.get("/api/v1/leads/follow-ups/?is_overdue=true")
        overdue_after_ids = [f["id"] for f in overdue_after.data["results"]]
        self.assertNotIn(past_followup.id, overdue_after_ids)

    # =========================================================================
    # FLOW 5: Lead -> Interested -> Application Started -> Application Submitted -> Converted
    # =========================================================================
    def test_flow_5_lead_full_lifecycle_conversion(self):
        self.client.force_authenticate(user=self.counsellor)
        lead = Lead.objects.create(
            first_name="Deepak",
            last_name="Kulkarni",
            email="deepak.kulkarni@example.com",
            phone="+919876577777",
            source=LeadSource.REFERRAL,
            counsellor=self.counsellor,
            status=LeadStatus.NEW,
        )

        # Step 1: NEW -> CONTACTED
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.CONTACTED, "remarks": "Introduced programs"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Step 2: CONTACTED -> INTERESTED
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.INTERESTED, "remarks": "Wants B.Tech CS admission"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Step 3: INTERESTED -> APPLICATION_STARTED
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.APPLICATION_STARTED, "remarks": "Initiated portal registration"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Step 4: APPLICATION_STARTED -> APPLICATION_SUBMITTED
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.APPLICATION_SUBMITTED, "remarks": "Documents uploaded"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Step 5: APPLICATION_SUBMITTED -> CONVERTED
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.CONVERTED, "remarks": "Admission fee paid"},
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["status"], LeadStatus.CONVERTED)
        self.assertIsNotNone(resp.data["converted_at"])

        # Verify activity timeline recorded the journey
        timeline_resp = self.client.get(f"/api/v1/leads/{lead.id}/timeline/")
        self.assertEqual(timeline_resp.status_code, status.HTTP_200_OK)
        activities = [e["activity_type"] for e in timeline_resp.data]
        self.assertIn(ActivityType.STATUS_CHANGED, activities)

    # =========================================================================
    # FLOW 6: Manager -> Dashboard metrics update
    # =========================================================================
    def test_flow_6_manager_dashboard_metrics_update(self):
        self.client.force_authenticate(user=self.manager)

        # 1. Initial dashboard metrics
        initial_dash = self.client.get("/api/v1/analytics/dashboard/").data["summary"]
        initial_total = initial_dash["total_leads"]
        initial_converted = initial_dash["converted_leads"]

        # 2. Add a new lead
        Lead.objects.create(
            first_name="Tanvi",
            last_name="Sen",
            email="tanvi.sen@example.com",
            phone="+919876566666",
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            course=self.course,
        )

        # 3. Add a converted lead
        Lead.objects.create(
            first_name="Gaurav",
            last_name="Rao",
            email="gaurav.rao@example.com",
            phone="+919876555555",
            source=LeadSource.WALK_IN,
            status=LeadStatus.CONVERTED,
            converted_at=timezone.now(),
            course=self.course,
        )

        # 4. Verify dashboard metrics reflect the updates accurately
        updated_dash = self.client.get("/api/v1/analytics/dashboard/").data["summary"]
        self.assertEqual(updated_dash["total_leads"], initial_total + 2)
        self.assertEqual(updated_dash["converted_leads"], initial_converted + 1)
        self.assertGreater(updated_dash["conversion_rate"], 0.0)

    # =========================================================================
    # ERROR SCENARIOS:
    # 400 validation error, 401 unauthorized, 403 forbidden, 404 not found, invalid token
    # =========================================================================
    def test_error_scenario_401_unauthorized(self):
        # No credentials provided
        self.client.credentials()
        resp = self.client.get("/api/v1/leads/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_error_scenario_invalid_token(self):
        # Corrupt or forged JWT token
        self.client.credentials(HTTP_AUTHORIZATION="Bearer invalid.token.signature")
        resp = self.client.get("/api/v1/leads/")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_error_scenario_403_forbidden_role_restriction(self):
        # Counsellor attempts manager-only reassignment endpoint
        self.client.force_authenticate(user=self.counsellor)
        lead = Lead.objects.create(
            first_name="Test",
            last_name="Lead",
            email="test.lead@example.com",
            phone="+919876511111",
            counsellor=self.counsellor,
        )
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/reassign/",
            {"counsellor_id": self.counsellor_two.id, "reason": "Unauthorized attempt"},
        )
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_error_scenario_404_not_found(self):
        self.client.force_authenticate(user=self.manager)
        resp = self.client.get("/api/v1/leads/999999/")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_error_scenario_400_validation_errors(self):
        self.client.force_authenticate(user=self.manager)
        # Attempt to create lead with empty required fields and invalid phone
        resp = self.client.post(
            "/api/v1/leads/",
            {
                "first_name": "",
                "phone": "invalid_phone_letters",
                "email": "not-an-email",
            },
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("first_name", resp.data)
        self.assertIn("phone", resp.data)
        self.assertIn("email", resp.data)

    def test_error_scenario_invalid_lifecycle_transition(self):
        self.client.force_authenticate(user=self.counsellor)
        lead = Lead.objects.create(
            first_name="Rishi",
            last_name="Kapoor",
            email="rishi.kapoor@example.com",
            phone="+919876522222",
            counsellor=self.counsellor,
            status=LeadStatus.NEW,
        )
        # Attempt invalid jump: NEW directly to APPLICATION_SUBMITTED without required steps
        resp = self.client.post(
            f"/api/v1/leads/{lead.id}/transition-status/",
            {"status": LeadStatus.APPLICATION_SUBMITTED, "remarks": "Invalid skip"},
        )
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
