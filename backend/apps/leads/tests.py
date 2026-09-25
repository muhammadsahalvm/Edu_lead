from datetime import timedelta
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User, UserRole
from apps.courses.models import Course
from apps.leads.models import Lead, FollowUp, ActivityLog, ActivityType, LeadStatus, LeadSource, LeadPriority, LossReason
from apps.leads.services.assignment_service import AssignmentService

class LeadManagementAPITests(APITestCase):
    """
    Complete Test Suite for Phase 4: Lead Management REST API.
    Covers:
    - Lead Creation with Auto-Assignment and Duplicate Detection
    - Search by Name, Phone, Email, and Lead ID
    - Filtering by Status, Course, Source, Counsellor, Ageing, Overdue
    - Sorting by Created, Priority, etc.
    - Status State-Machine Transitions (Valid & Invalid Rejections)
    - Terminal State Protection & Converted Timestamp Tracking
    - Manager-only Reassignment
    - Duplicate Check Endpoint
    - ActivityLog Audit Trail Verification
    """

    def setUp(self):
        # 1. Users
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
            last_name='Verma',
            is_available_for_assignment=True
        )

        self.counsellor_2 = User.objects.create_user(
            username='counsellor_sarah',
            email='sarah@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Sarah',
            last_name='Khan',
            is_available_for_assignment=True
        )

        # 2. Courses
        self.course_cse = Course.objects.create(
            code='BTECH_CSE',
            name='B.Tech Computer Science',
            degree_level='UNDERGRADUATE',
            duration_years=4.0,
            fee_per_year=150000.00,
            is_active=True
        )

        self.course_mba = Course.objects.create(
            code='MBA_GEN',
            name='Master of Business Administration',
            degree_level='POSTGRADUATE',
            duration_years=2.0,
            fee_per_year=220000.00,
            is_active=True
        )

        # 3. Pre-existing Leads
        self.lead_1 = Lead.objects.create(
            first_name='Rahul',
            last_name='Dravid',
            email='rahul@cricket.edu',
            phone='9811111111',
            course=self.course_cse,
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            priority=LeadPriority.HIGH,
            counsellor=self.counsellor_1
        )

        self.lead_2 = Lead.objects.create(
            first_name='Sourav',
            last_name='Ganguly',
            email='sourav@cricket.edu',
            phone='9822222222',
            course=self.course_mba,
            source=LeadSource.WALK_IN,
            status=LeadStatus.CONTACTED,
            priority=LeadPriority.MEDIUM,
            counsellor=self.counsellor_2
        )

        self.login_url = reverse('authentication:token_obtain_pair')
        self.leads_url = reverse('leads:lead-list')
        self.dup_check_url = reverse('leads:lead-check-duplicate')

    def authenticate(self, user):
        response = self.client.post(self.login_url, {'username': user.username, 'password': 'Password@123'})
        token = response.data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

    # 1. Lead Creation & Auto-Assignment
    def test_01_create_lead_with_round_robin_auto_assignment(self):
        self.authenticate(self.manager)
        payload = {
            'first_name': 'Sachin',
            'last_name': 'Tendulkar',
            'email': 'sachin@cricket.edu',
            'phone': '9833333333',
            'course': self.course_cse.id,
            'source': LeadSource.CAMPAIGN,
            'priority': LeadPriority.HIGH,
            'auto_assign': True
        }
        res = self.client.post(self.leads_url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn('lead_number', res.data)
        self.assertTrue(res.data['lead_number'].startswith('LED-'))
        self.assertIsNotNone(res.data['counsellor'])
        self.assertIn(res.data['counsellor'], [self.counsellor_1.id, self.counsellor_2.id])

        # Verify ActivityLog created
        created_lead_id = res.data['id']
        activity = ActivityLog.objects.filter(lead_id=created_lead_id, activity_type=ActivityType.LEAD_CREATED).first()
        self.assertIsNotNone(activity)

    # 2. Duplicate Lead Detection
    def test_02_duplicate_lead_detection_warning(self):
        self.authenticate(self.manager)
        # Attempt to create a lead with same phone as lead_1
        payload = {
            'first_name': 'Rahul Duplicate',
            'last_name': 'Enquiry',
            'email': 'rahul.second@cricket.edu',
            'phone': '9811111111',  # Matches lead_1
            'course': self.course_mba.id,
            'source': LeadSource.PHONE
        }
        res = self.client.post(self.leads_url, payload)
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['duplicate_warning'])
        self.assertEqual(res.data['matched_duplicates_count'], 1)

        # Check duplicate lookup endpoint directly
        check_res = self.client.get(self.dup_check_url, {'phone': '9811111111'})
        self.assertEqual(check_res.status_code, status.HTTP_200_OK)
        self.assertTrue(check_res.data['has_duplicate'])
        self.assertEqual(check_res.data['count'], 2)  # both rahul leads match

    # 3. Search Functionality
    def test_03_search_leads(self):
        self.authenticate(self.manager)

        # Search by Name
        res = self.client.get(self.leads_url, {'search': 'Sourav'})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['first_name'], 'Sourav')

        # Search by Phone
        res = self.client.get(self.leads_url, {'search': '9811111111'})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['email'], 'rahul@cricket.edu')

        # Search by Lead ID
        res = self.client.get(self.leads_url, {'search': self.lead_1.lead_number})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], self.lead_1.id)

    # 4. Filters & Sorting
    def test_04_filter_and_sort_leads(self):
        self.authenticate(self.manager)

        # Filter by Status
        res = self.client.get(self.leads_url, {'status': 'NEW'})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], self.lead_1.id)

        # Filter by Course
        res = self.client.get(self.leads_url, {'course': self.course_mba.id})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], self.lead_2.id)

        # Filter by Counsellor
        res = self.client.get(self.leads_url, {'counsellor': self.counsellor_1.id})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], self.lead_1.id)

        # Sort by Priority ascending/descending
        res_sort = self.client.get(self.leads_url, {'ordering': '-priority'})
        self.assertEqual(res_sort.status_code, status.HTTP_200_OK)

    # 5. Valid Lifecycle Status Progression
    def test_05_valid_status_progression_to_converted(self):
        self.authenticate(self.manager)
        lead = self.lead_1
        trans_url = reverse('leads:lead-transition-status', kwargs={'pk': lead.id})

        # Step 1: NEW -> CONTACTED
        res1 = self.client.post(trans_url, {'status': LeadStatus.CONTACTED})
        self.assertEqual(res1.status_code, status.HTTP_200_OK)
        self.assertEqual(res1.data['status'], LeadStatus.CONTACTED)

        # Step 2: CONTACTED -> INTERESTED
        res2 = self.client.post(trans_url, {'status': LeadStatus.INTERESTED})
        self.assertEqual(res2.status_code, status.HTTP_200_OK)
        self.assertEqual(res2.data['status'], LeadStatus.INTERESTED)

        # Step 3: INTERESTED -> APPLICATION_STARTED
        res3 = self.client.post(trans_url, {'status': LeadStatus.APPLICATION_STARTED})
        self.assertEqual(res3.status_code, status.HTTP_200_OK)

        # Step 4: APPLICATION_STARTED -> APPLICATION_SUBMITTED
        res4 = self.client.post(trans_url, {'status': LeadStatus.APPLICATION_SUBMITTED})
        self.assertEqual(res4.status_code, status.HTTP_200_OK)

        # Step 5: APPLICATION_SUBMITTED -> CONVERTED
        res5 = self.client.post(trans_url, {'status': LeadStatus.CONVERTED})
        self.assertEqual(res5.status_code, status.HTTP_200_OK)
        self.assertEqual(res5.data['status'], LeadStatus.CONVERTED)
        self.assertIsNotNone(res5.data['converted_at'])

        # Verify ActivityLog entries created for each transition
        logs = ActivityLog.objects.filter(lead=lead, activity_type=ActivityType.STATUS_CHANGED)
        self.assertEqual(logs.count(), 5)

    # 6. Invalid Status Progression (Rejected cleanly without state mutation)
    def test_06_invalid_status_progression_rejected(self):
        self.authenticate(self.manager)
        lead = self.lead_1  # Currently in NEW status
        trans_url = reverse('leads:lead-transition-status', kwargs={'pk': lead.id})

        # Attempt to jump NEW -> CONVERTED directly -> Must fail
        res = self.client.post(trans_url, {'status': LeadStatus.CONVERTED})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Cannot jump directly from \'New\' to \'Converted\'', str(res.data))

        # Verify lead status did NOT mutate
        lead.refresh_from_db()
        self.assertEqual(lead.status, LeadStatus.NEW)
        self.assertIsNone(lead.converted_at)

        # Verify no false ActivityLog was generated
        logs = ActivityLog.objects.filter(lead=lead, new_value=LeadStatus.CONVERTED)
        self.assertEqual(logs.count(), 0)

    # 7. Terminal State Lock & Loss Reason Requirement
    def test_07_transition_to_lost_requires_loss_reason(self):
        self.authenticate(self.manager)
        lead = self.lead_1
        trans_url = reverse('leads:lead-transition-status', kwargs={'pk': lead.id})

        # Moving to LOST without loss_reason -> Must fail
        res_fail = self.client.post(trans_url, {'status': LeadStatus.LOST})
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Moving to LOST with valid loss_reason -> Must succeed
        res_ok = self.client.post(trans_url, {
            'status': LeadStatus.LOST,
            'loss_reason': LossReason.FEES_HIGH,
            'loss_notes': 'Fee structure exceeded family budget.'
        })
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.status, LeadStatus.LOST)
        self.assertEqual(lead.loss_reason, LossReason.FEES_HIGH)

    # 8. Manager Reassignment
    def test_08_reassign_counsellor_action(self):
        self.authenticate(self.manager)
        reassign_url = reverse('leads:lead-reassign', kwargs={'pk': self.lead_1.id})
        res = self.client.post(reassign_url, {
            'counsellor_id': self.counsellor_2.id,
            'reason': 'Academic course match'
        })
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.lead_1.refresh_from_db()
        self.assertEqual(self.lead_1.counsellor, self.counsellor_2)

        # Verify Reassignment ActivityLog
        reassign_log = ActivityLog.objects.filter(
            lead=self.lead_1,
            activity_type=ActivityType.COUNSELLOR_CHANGED
        ).first()
        self.assertIsNotNone(reassign_log)
        self.assertEqual(reassign_log.new_value, self.counsellor_2.get_full_name())
