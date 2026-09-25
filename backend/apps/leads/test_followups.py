from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User, UserRole
from apps.courses.models import Course
from apps.leads.models import (
    Lead,
    FollowUp,
    ActivityLog,
    LeadStatus,
    LeadSource,
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
    ActivityType,
)

class FollowUpWorkflowTests(APITestCase):
    """
    Complete Test Suite for Phase 5: Follow-Up Workflow and Activity History.
    Verifies:
    1. Create follow-up (types: CALL, WHATSAPP, EMAIL, COUNSELLING, MEETING)
    2. View follow-ups (role-scoped)
    3. Update follow-up (reschedule & notes)
    4. Complete follow-up (with outcome, sets completed_at, auto-advances NEW to CONTACTED)
    5. Mark missed follow-up
    6. Cancel follow-up (with mandatory reason, removes from overdue)
    7. View upcoming follow-ups
    8. View overdue follow-ups (and verifies completed/cancelled never appear as overdue)
    9. Cross-counsellor access restrictions (row-level security)
    10. Activity log creation for every event with actor, lead, and description
    """

    def setUp(self):
        # Users
        self.manager = User.objects.create_user(
            username='manager_priya',
            email='priya@edulead.edu',
            password='Password@123',
            role=UserRole.MANAGER,
            first_name='Priya',
            last_name='Sharma'
        )

        self.counsellor_1 = User.objects.create_user(
            username='counsellor_amit',
            email='amit@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Amit',
            last_name='Verma'
        )

        self.counsellor_2 = User.objects.create_user(
            username='counsellor_sarah',
            email='sarah@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Sarah',
            last_name='Khan'
        )

        # Course
        self.course = Course.objects.create(
            code='BTECH_CSE',
            name='B.Tech Computer Science',
            degree_level='UNDERGRADUATE',
            duration_years=4.0,
            fee_per_year=150000.00
        )

        # Lead for Counsellor 1
        self.lead_1 = Lead.objects.create(
            first_name='Ananya',
            last_name='Roy',
            email='ananya@example.com',
            phone='9876500001',
            course=self.course,
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            counsellor=self.counsellor_1
        )

        # Lead for Counsellor 2
        self.lead_2 = Lead.objects.create(
            first_name='Karan',
            last_name='Kapoor',
            email='karan@example.com',
            phone='9876500002',
            course=self.course,
            source=LeadSource.PHONE,
            status=LeadStatus.CONTACTED,
            counsellor=self.counsellor_2
        )

        self.login_url = reverse('authentication:token_obtain_pair')
        self.followup_list_url = reverse('leads:followup-list')
        self.upcoming_url = reverse('leads:followup-upcoming')
        self.overdue_url = reverse('leads:followup-overdue')

    def authenticate(self, user):
        response = self.client.post(self.login_url, {'username': user.username, 'password': 'Password@123'})
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # 1. Create Follow-up
    def test_01_create_followup_and_update_lead_next_followup(self):
        self.authenticate(self.counsellor_1)
        sched_time = timezone.now() + timedelta(days=2)
        payload = {
            'lead': self.lead_1.id,
            'scheduled_at': sched_time.isoformat(),
            'followup_type': FollowUpType.CALL,
            'notes': 'Initial consultation call to discuss eligibility.'
        }
        res = self.client.post(self.followup_list_url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['assigned_to'], self.counsellor_1.id)
        self.assertEqual(res.data['status'], FollowUpStatus.PENDING)

        # Verify parent lead next_followup_at updated
        self.lead_1.refresh_from_db()
        self.assertIsNotNone(self.lead_1.next_followup_at)

        # Verify ActivityLog created
        log = ActivityLog.objects.filter(lead=self.lead_1, activity_type=ActivityType.FOLLOWUP_CREATED).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.actor, self.counsellor_1)

    # 2. View Follow-ups (Scoped by Role)
    def test_02_followup_list_role_scoping(self):
        # Create follow-up for Lead 1
        fu1 = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=timezone.now() + timedelta(days=1),
            followup_type=FollowUpType.WHATSAPP
        )
        # Create follow-up for Lead 2
        fu2 = FollowUp.objects.create(
            lead=self.lead_2,
            assigned_to=self.counsellor_2,
            scheduled_at=timezone.now() + timedelta(days=1),
            followup_type=FollowUpType.EMAIL
        )

        # Counsellor 1 should only see fu1, NOT fu2
        self.authenticate(self.counsellor_1)
        res_c1 = self.client.get(self.followup_list_url)
        c1_ids = [item['id'] for item in res_c1.data['results']]
        self.assertIn(fu1.id, c1_ids)
        self.assertNotIn(fu2.id, c1_ids)

        # Manager should see both fu1 and fu2
        self.authenticate(self.manager)
        res_mgr = self.client.get(self.followup_list_url)
        mgr_ids = [item['id'] for item in res_mgr.data['results']]
        self.assertIn(fu1.id, mgr_ids)
        self.assertIn(fu2.id, mgr_ids)

    # 3. Update / Reschedule Follow-up
    def test_03_update_and_reschedule_followup(self):
        self.authenticate(self.counsellor_1)
        fu = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=timezone.now() + timedelta(days=1),
            followup_type=FollowUpType.CALL
        )
        detail_url = reverse('leads:followup-detail', kwargs={'pk': fu.id})
        new_time = timezone.now() + timedelta(days=4)

        res = self.client.patch(detail_url, {
            'scheduled_at': new_time.isoformat(),
            'notes': 'Rescheduled at student request.'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        fu.refresh_from_db()
        self.lead_1.refresh_from_db()
        self.assertEqual(fu.notes, 'Rescheduled at student request.')
        self.assertEqual(self.lead_1.next_followup_at, fu.scheduled_at)

    # 4. Complete Follow-up
    def test_04_complete_followup_with_outcome_and_auto_contact_advancement(self):
        self.authenticate(self.counsellor_1)
        fu = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=timezone.now() + timedelta(hours=2),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING
        )
        complete_url = reverse('leads:followup-complete', kwargs={'pk': fu.id})
        next_date = timezone.now() + timedelta(days=3)

        payload = {
            'outcome': FollowUpOutcome.CONNECTED_POSITIVE,
            'notes': 'Student interested in scholarship details.',
            'next_followup_at': next_date.isoformat(),
            'next_followup_type': FollowUpType.COUNSELLING
        }
        res = self.client.post(complete_url, payload)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], FollowUpStatus.COMPLETED)
        self.assertIsNotNone(res.data['completed_at'])

        # Verify Lead state changed from NEW to CONTACTED automatically
        self.lead_1.refresh_from_db()
        self.assertEqual(self.lead_1.status, LeadStatus.CONTACTED)
        self.assertIsNotNone(self.lead_1.last_contacted_at)

        # Verify chained next follow-up created
        self.assertIn('next_scheduled_followup', res.data)
        chained_id = res.data['next_scheduled_followup']['id']
        chained_fu = FollowUp.objects.get(id=chained_id)
        self.assertEqual(chained_fu.followup_type, FollowUpType.COUNSELLING)
        self.assertEqual(chained_fu.status, FollowUpStatus.PENDING)

        # Verify ActivityLog entries: FOLLOWUP_COMPLETED, STATUS_CHANGED, FOLLOWUP_CREATED
        completed_log = ActivityLog.objects.filter(lead=self.lead_1, activity_type=ActivityType.FOLLOWUP_COMPLETED).first()
        self.assertIsNotNone(completed_log)
        self.assertIn('Connected - Positive Interest', completed_log.details)

    # 5. Mark Missed Follow-up
    def test_05_mark_followup_missed(self):
        self.authenticate(self.counsellor_1)
        fu = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=timezone.now() - timedelta(hours=3),
            followup_type=FollowUpType.COUNSELLING,
            status=FollowUpStatus.PENDING
        )
        missed_url = reverse('leads:followup-mark-missed', kwargs={'pk': fu.id})
        res = self.client.post(missed_url, {'notes': 'Student did not arrive for campus session.'})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['status'], FollowUpStatus.MISSED)

        fu.refresh_from_db()
        self.assertEqual(fu.status, FollowUpStatus.MISSED)
        self.assertIn('Student did not arrive', fu.notes)

        # Verify ActivityLog
        log = ActivityLog.objects.filter(lead=self.lead_1, activity_type=ActivityType.FOLLOWUP_MISSED).first()
        self.assertIsNotNone(log)

    # 6. Cancel Follow-up
    def test_06_cancel_followup_requires_reason(self):
        self.authenticate(self.counsellor_1)
        fu = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=timezone.now() + timedelta(days=1),
            followup_type=FollowUpType.MEETING,
            status=FollowUpStatus.PENDING
        )
        cancel_url = reverse('leads:followup-cancel', kwargs={'pk': fu.id})

        # Cancel without reason -> Must fail
        res_fail = self.client.post(cancel_url, {'reason': ''})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Cancel with valid reason -> Must succeed
        res_ok = self.client.post(cancel_url, {'reason': 'Student postponed visit due to exams.'})
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok.data['status'], FollowUpStatus.CANCELLED)

        fu.refresh_from_db()
        self.assertEqual(fu.status, FollowUpStatus.CANCELLED)

        # Verify ActivityLog
        log = ActivityLog.objects.filter(lead=self.lead_1, activity_type=ActivityType.FOLLOWUP_CANCELLED).first()
        self.assertIsNotNone(log)

    # 7. Overdue Rule Verification
    def test_07_overdue_rule_and_cancelled_completed_exclusion(self):
        self.authenticate(self.counsellor_1)
        now = timezone.now()

        # Overdue task: PENDING and scheduled in past -> MUST be in overdue list
        fu_overdue = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=now - timedelta(days=1),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING
        )

        # Completed task scheduled in past -> MUST NOT be in overdue list
        fu_completed = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=now - timedelta(days=2),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.COMPLETED,
            completed_at=now - timedelta(days=2),
            outcome=FollowUpOutcome.CONNECTED_POSITIVE
        )

        # Cancelled task scheduled in past -> MUST NOT be in overdue list
        fu_cancelled = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=now - timedelta(days=3),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.CANCELLED,
            notes='Cancelled earlier'
        )

        # Upcoming task -> MUST NOT be in overdue list
        fu_upcoming = FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=now + timedelta(days=2),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING
        )

        # Fetch overdue endpoint
        res = self.client.get(self.overdue_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        overdue_ids = [item['id'] for item in res.data['results']]

        self.assertIn(fu_overdue.id, overdue_ids)
        self.assertNotIn(fu_completed.id, overdue_ids)
        self.assertNotIn(fu_cancelled.id, overdue_ids)
        self.assertNotIn(fu_upcoming.id, overdue_ids)

        # Fetch upcoming endpoint
        res_up = self.client.get(self.upcoming_url)
        self.assertEqual(res_up.status_code, status.HTTP_200_OK)
        upcoming_ids = [item['id'] for item in res_up.data['results']]

        self.assertIn(fu_upcoming.id, upcoming_ids)
        self.assertNotIn(fu_overdue.id, upcoming_ids)

    # 8. Cross-Counsellor Permission Restriction
    def test_08_counsellor_cannot_manage_another_counsellors_followup(self):
        # Counsellor 2's follow-up
        fu_c2 = FollowUp.objects.create(
            lead=self.lead_2,
            assigned_to=self.counsellor_2,
            scheduled_at=timezone.now() + timedelta(days=1),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING
        )

        # Counsellor 1 tries to complete Counsellor 2's follow-up -> Must be blocked (404/403)
        self.authenticate(self.counsellor_1)
        c2_complete_url = reverse('leads:followup-complete', kwargs={'pk': fu_c2.id})
        res = self.client.post(c2_complete_url, {'outcome': FollowUpOutcome.CONNECTED_POSITIVE})
        self.assertIn(res.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # Counsellor 1 tries to create follow-up on Counsellor 2's lead -> Must be blocked
        res_create = self.client.post(self.followup_list_url, {
            'lead': self.lead_2.id,
            'scheduled_at': (timezone.now() + timedelta(days=1)).isoformat(),
            'followup_type': FollowUpType.CALL
        })
        self.assertEqual(res_create.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Access forbidden', str(res_create.data))
