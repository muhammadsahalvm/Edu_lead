from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.authentication.models import User, UserRole
from apps.courses.models import Course
from apps.leads.models import Lead, LeadSource, LeadStatus

class AuthenticationAndAuthorizationTests(APITestCase):
    """
    Test suite for Phase 3: Secure Authentication and Role-Based Authorization.
    Verifies:
    1. Valid manager login
    2. Invalid manager login
    3. Valid counsellor login
    4. Invalid counsellor login
    5. Manager accessing manager-only endpoint
    6. Counsellor attempting manager-only endpoint
    7. Counsellor attempting to access another counsellor's lead
    8. Unauthenticated request
    """

    def setUp(self):
        # 1. Create Manager
        self.manager = User.objects.create_user(
            username='priya_manager',
            email='priya@edulead.edu',
            password='Password@123',
            role=UserRole.MANAGER,
            first_name='Priya',
            last_name='Sharma'
        )

        # 2. Create Counsellor A
        self.counsellor_a = User.objects.create_user(
            username='amit_counsellor',
            email='amit@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Amit',
            last_name='Verma'
        )

        # 3. Create Counsellor B
        self.counsellor_b = User.objects.create_user(
            username='sarah_counsellor',
            email='sarah@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Sarah',
            last_name='Khan'
        )

        # 4. Create Course
        self.course = Course.objects.create(
            code='BTECH_CSE',
            name='B.Tech Computer Science & Engineering',
            degree_level='UNDERGRADUATE',
            duration_years=4.0,
            fee_per_year=150000.00,
            is_active=True
        )

        # 5. Create Lead assigned to Counsellor A
        self.lead_a = Lead.objects.create(
            first_name='Rohan',
            last_name='Mehta',
            email='rohan@example.com',
            phone='9876543210',
            course=self.course,
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            counsellor=self.counsellor_a
        )

        # 6. Create Lead assigned to Counsellor B
        self.lead_b = Lead.objects.create(
            first_name='Sneha',
            last_name='Patel',
            email='sneha@example.com',
            phone='9876543211',
            course=self.course,
            source=LeadSource.WALK_IN,
            status=LeadStatus.CONTACTED,
            counsellor=self.counsellor_b
        )

        self.login_url = reverse('authentication:token_obtain_pair')
        self.leads_list_url = reverse('leads:lead-list')
        self.courses_url = reverse('courses:course-list')

    def get_jwt_token(self, username, password):
        response = self.client.post(self.login_url, {'username': username, 'password': password})
        if response.status_code == status.HTTP_200_OK:
            return response.data['access']
        return None

    # Test 1: Valid Manager Login
    def test_01_valid_manager_login(self):
        response = self.client.post(self.login_url, {
            'username': 'priya_manager',
            'password': 'Password@123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], UserRole.MANAGER)
        self.assertEqual(response.data['user']['username'], 'priya_manager')

    # Test 2: Invalid Manager Login
    def test_02_invalid_manager_login(self):
        response = self.client.post(self.login_url, {
            'username': 'priya_manager',
            'password': 'WrongPassword123'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)

    # Test 3: Valid Counsellor Login
    def test_03_valid_counsellor_login(self):
        response = self.client.post(self.login_url, {
            'username': 'amit_counsellor',
            'password': 'Password@123'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['role'], UserRole.COUNSELLOR)
        self.assertEqual(response.data['user']['username'], 'amit_counsellor')

    # Test 4: Invalid Counsellor Login
    def test_04_invalid_counsellor_login(self):
        response = self.client.post(self.login_url, {
            'username': 'amit_counsellor',
            'password': 'IncorrectPassword'
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)

    # Test 5: Manager accessing Manager-Only Endpoints
    def test_05_manager_accessing_manager_only_endpoint(self):
        token = self.get_jwt_token('priya_manager', 'Password@123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 5a. Manager can create new course
        course_payload = {
            'code': 'MBA_HR',
            'name': 'Master of Business Administration (HR)',
            'degree_level': 'POSTGRADUATE',
            'duration_years': '2.0',
            'fee_per_year': '200000.00',
            'is_active': True
        }
        res_course = self.client.post(self.courses_url, course_payload)
        self.assertEqual(res_course.status_code, status.HTTP_201_CREATED)

        # 5b. Manager can reassign lead
        reassign_url = reverse('leads:lead-reassign', kwargs={'pk': self.lead_a.id})
        reassign_payload = {
            'counsellor_id': self.counsellor_b.id,
            'reason': 'Workload balancing by admissions manager.'
        }
        res_reassign = self.client.post(reassign_url, reassign_payload)
        self.assertEqual(res_reassign.status_code, status.HTTP_200_OK)
        self.assertEqual(res_reassign.data['counsellor_id'], self.counsellor_b.id)

        # 5c. Manager can view ALL leads (sees both Lead A and Lead B)
        res_leads = self.client.get(self.leads_list_url)
        self.assertEqual(res_leads.status_code, status.HTTP_200_OK)
        lead_ids = [lead['id'] for lead in res_leads.data['results']]
        self.assertIn(self.lead_a.id, lead_ids)
        self.assertIn(self.lead_b.id, lead_ids)

    # Test 6: Counsellor attempting Manager-Only Endpoint
    def test_06_counsellor_attempting_manager_only_endpoint(self):
        token = self.get_jwt_token('amit_counsellor', 'Password@123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 6a. Counsellor attempting to create a course -> 403 Forbidden
        course_payload = {
            'code': 'DIPLOMA_AI',
            'name': 'Diploma in Artificial Intelligence',
            'degree_level': 'DIPLOMA',
            'duration_years': '1.0',
            'fee_per_year': '80000.00',
            'is_active': True
        }
        res_course = self.client.post(self.courses_url, course_payload)
        self.assertEqual(res_course.status_code, status.HTTP_403_FORBIDDEN)

        # 6b. Counsellor attempting to reassign a lead -> 403 Forbidden
        reassign_url = reverse('leads:lead-reassign', kwargs={'pk': self.lead_a.id})
        reassign_payload = {
            'counsellor_id': self.counsellor_b.id,
            'reason': 'Attempting unauthorized reassignment.'
        }
        res_reassign = self.client.post(reassign_url, reassign_payload)
        self.assertEqual(res_reassign.status_code, status.HTTP_403_FORBIDDEN)

    # Test 7: Counsellor attempting to access another Counsellor's Lead
    def test_07_counsellor_attempting_to_access_another_counsellors_lead(self):
        token = self.get_jwt_token('amit_counsellor', 'Password@123')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')

        # 7a. Counsellor A lists leads: must ONLY see Lead A, NEVER Lead B
        res_list = self.client.get(self.leads_list_url)
        self.assertEqual(res_list.status_code, status.HTTP_200_OK)
        lead_ids = [lead['id'] for lead in res_list.data['results']]
        self.assertIn(self.lead_a.id, lead_ids)
        self.assertNotIn(self.lead_b.id, lead_ids)

        # 7b. Counsellor A attempts direct URL access to Lead B (/api/v1/leads/{lead_b.id}/)
        lead_b_url = reverse('leads:lead-detail', kwargs={'pk': self.lead_b.id})
        res_direct = self.client.get(lead_b_url)
        # In Django DRF, row-level queryset isolation filters out lead_b, returning 404 Not Found
        # or 403 Forbidden. Either way, data is completely protected!
        self.assertIn(res_direct.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

        # 7c. Counsellor A attempts to update Lead B
        res_update = self.client.patch(lead_b_url, {'notes': 'Malicious modification'})
        self.assertIn(res_update.status_code, [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN])

    # Test 8: Unauthenticated Request
    def test_08_unauthenticated_request(self):
        self.client.credentials()  # Clear credentials

        # 8a. Accessing leads list without token -> 401 Unauthorized
        res_leads = self.client.get(self.leads_list_url)
        self.assertEqual(res_leads.status_code, status.HTTP_401_UNAUTHORIZED)

        # 8b. Accessing courses without token -> 401 Unauthorized
        res_courses = self.client.get(self.courses_url)
        self.assertEqual(res_courses.status_code, status.HTTP_401_UNAUTHORIZED)

        # 8c. Accessing current user profile without token -> 401 Unauthorized
        profile_url = reverse('authentication:current_user_profile')
        res_profile = self.client.get(profile_url)
        self.assertEqual(res_profile.status_code, status.HTTP_401_UNAUTHORIZED)
