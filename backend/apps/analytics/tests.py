from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.authentication.models import User, UserRole
from apps.courses.models import Course
from apps.leads.models import (
    Lead,
    FollowUp,
    LeadStatus,
    LeadSource,
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
)
from apps.analytics.services import DashboardAnalyticsService


class DashboardAnalyticsTests(APITestCase):
    """
    Test suite for Phase 7: Management Dashboard and Operational Insights.
    Covers:
    1. Summary Metrics & Conversion Rate calculation definition
    2. Zero lead edge-case handling (0.0% conversion rate)
    3. 7-Stage Lead Funnel counts
    4. Source Analysis breakdown and percentage calculation
    5. Course Demand Analysis breakdown and percentage calculation
    6. Counsellor Workload operational metrics (no simplistic scores)
    7. Ageing Breakdown (Fresh, Ageing, Stale, Closed)
    8. Role-based visibility scoping (Manager vs Counsellor)
    9. REST API endpoints authentication and authorization
    """

    def setUp(self):
        # Users
        self.manager = User.objects.create_user(
            username='manager_raj',
            email='raj@edulead.edu',
            password='Password@123',
            role=UserRole.MANAGER,
            first_name='Raj',
            last_name='Verma'
        )

        self.counsellor_1 = User.objects.create_user(
            username='counsellor_anita',
            email='anita@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Anita',
            last_name='Desai'
        )

        self.counsellor_2 = User.objects.create_user(
            username='counsellor_vikram',
            email='vikram@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Vikram',
            last_name='Seth'
        )

        # Courses
        self.course_btech = Course.objects.create(
            name='Bachelor of Technology in CS',
            code='BTECH-CS',
            department='Engineering',
            duration_years=4,
            fee_per_year=320000.00
        )
        self.course_mba = Course.objects.create(
            name='Master of Business Administration',
            code='MBA-GEN',
            department='Management',
            duration_years=2,
            fee_per_year=450000.00
        )

        # Current benchmark time
        self.now = timezone.now()

        # Seed test leads
        # Anita's leads:
        # Lead 1: NEW, Website, BTech
        self.lead_1 = Lead.objects.create(
            first_name='Aarav',
            last_name='Patel',
            email='aarav@example.com',
            phone='+919876543210',
            course=self.course_btech,
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            counsellor=self.counsellor_1,
        )
        # Lead 2: CONTACTED, Walk-in, MBA
        self.lead_2 = Lead.objects.create(
            first_name='Diya',
            last_name='Mehta',
            email='diya@example.com',
            phone='+919876543211',
            course=self.course_mba,
            source=LeadSource.WALK_IN,
            status=LeadStatus.CONTACTED,
            counsellor=self.counsellor_1,
        )
        # Lead 3: CONVERTED, Website, BTech
        self.lead_3 = Lead.objects.create(
            first_name='Kabir',
            last_name='Kapoor',
            email='kabir@example.com',
            phone='+919876543212',
            course=self.course_btech,
            source=LeadSource.WEBSITE,
            status=LeadStatus.CONVERTED,
            counsellor=self.counsellor_1,
            converted_at=self.now,
        )

        # Vikram's leads:
        # Lead 4: INTERESTED, Campaign, BTech
        self.lead_4 = Lead.objects.create(
            first_name='Neha',
            last_name='Sharma',
            email='neha@example.com',
            phone='+919876543213',
            course=self.course_btech,
            source=LeadSource.CAMPAIGN,
            status=LeadStatus.INTERESTED,
            counsellor=self.counsellor_2,
        )
        # Lead 5: APPLICATION_STARTED, WhatsApp, MBA
        self.lead_5 = Lead.objects.create(
            first_name='Rohan',
            last_name='Iyer',
            email='rohan@example.com',
            phone='+919876543214',
            course=self.course_mba,
            source=LeadSource.WHATSAPP,
            status=LeadStatus.APPLICATION_STARTED,
            counsellor=self.counsellor_2,
        )

        # Unassigned lead:
        # Lead 6: NEW, Website, MBA, unassigned
        self.lead_6 = Lead.objects.create(
            first_name='Simran',
            last_name='Kaur',
            email='simran@example.com',
            phone='+919876543215',
            course=self.course_mba,
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            counsellor=None,
        )

        # Seed Follow-ups:
        # Anita:
        # 1 overdue follow-up (yesterday, pending)
        FollowUp.objects.create(
            lead=self.lead_1,
            assigned_to=self.counsellor_1,
            scheduled_at=self.now - timedelta(days=1),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING,
        )
        # 1 today follow-up (today, pending)
        FollowUp.objects.create(
            lead=self.lead_2,
            assigned_to=self.counsellor_1,
            scheduled_at=self.now,
            followup_type=FollowUpType.WHATSAPP,
            status=FollowUpStatus.PENDING,
        )
        # 1 completed follow-up (yesterday, completed - should NOT count as overdue)
        FollowUp.objects.create(
            lead=self.lead_3,
            assigned_to=self.counsellor_1,
            scheduled_at=self.now - timedelta(days=2),
            followup_type=FollowUpType.MEETING,
            status=FollowUpStatus.COMPLETED,
            outcome=FollowUpOutcome.MEETING_COMPLETED,
        )

        # Vikram:
        # 1 future follow-up (tomorrow, pending)
        FollowUp.objects.create(
            lead=self.lead_4,
            assigned_to=self.counsellor_2,
            scheduled_at=self.now + timedelta(days=1),
            followup_type=FollowUpType.CALL,
            status=FollowUpStatus.PENDING,
        )

    def test_summary_metrics_manager_calculation(self):
        """
        Manager should see total institution metrics:
        Total leads: 6
        New leads: 2 (lead 1, lead 6)
        Unassigned leads: 1 (lead 6)
        Today's follow-ups: 1
        Overdue follow-ups: 1
        Converted leads: 1 (lead 3)
        Conversion rate: (1 / 6) * 100 = 16.7%
        """
        metrics = DashboardAnalyticsService.get_summary_metrics(self.manager, now=self.now)
        self.assertEqual(metrics['total_leads'], 6)
        self.assertEqual(metrics['new_leads'], 2)
        self.assertEqual(metrics['unassigned_leads'], 1)
        self.assertEqual(metrics['today_followups'], 1)
        self.assertEqual(metrics['todays_followups'], 1)
        self.assertEqual(metrics['overdue_followups'], 1)
        self.assertEqual(metrics['converted_leads'], 1)
        self.assertEqual(metrics['conversion_rate'], 16.7)
        self.assertIn('converted_leads / total_leads * 100', metrics['calculation_definition'])

    def test_summary_metrics_counsellor_scoping(self):
        """
        Counsellor should only see metrics for their assigned leads:
        Anita's leads: 3 total (lead 1, 2, 3)
        New leads: 1 (lead 1)
        Unassigned leads: 0 (restricted/hidden for counsellor)
        Today's follow-ups: 1
        Overdue follow-ups: 1
        Converted leads: 1 (lead 3)
        Conversion rate: (1 / 3) * 100 = 33.3%
        """
        metrics = DashboardAnalyticsService.get_summary_metrics(self.counsellor_1, now=self.now)
        self.assertEqual(metrics['total_leads'], 3)
        self.assertEqual(metrics['new_leads'], 1)
        self.assertEqual(metrics['unassigned_leads'], 0)
        self.assertEqual(metrics['today_followups'], 1)
        self.assertEqual(metrics['overdue_followups'], 1)
        self.assertEqual(metrics['converted_leads'], 1)
        self.assertEqual(metrics['conversion_rate'], 33.3)

    def test_conversion_rate_zero_leads(self):
        """
        When there are zero leads, conversion rate should safely return 0.0 without ZeroDivisionError.
        """
        Lead.objects.all().delete()
        metrics = DashboardAnalyticsService.get_summary_metrics(self.manager, now=self.now)
        self.assertEqual(metrics['total_leads'], 0)
        self.assertEqual(metrics['converted_leads'], 0)
        self.assertEqual(metrics['conversion_rate'], 0.0)

    def test_lead_funnel_all_stages(self):
        """
        Funnel should return exact counts across all 7 ordered stages:
        NEW, CONTACTED, INTERESTED, COUNSELLING_SCHEDULED, APPLICATION_STARTED,
        APPLICATION_SUBMITTED, CONVERTED.
        """
        funnel = DashboardAnalyticsService.get_lead_funnel(self.manager)
        stage_map = {item['stage']: item['count'] for item in funnel}

        self.assertEqual(len(funnel), 7)
        self.assertEqual(stage_map[LeadStatus.NEW], 2)
        self.assertEqual(stage_map[LeadStatus.CONTACTED], 1)
        self.assertEqual(stage_map[LeadStatus.INTERESTED], 1)
        self.assertEqual(stage_map[LeadStatus.COUNSELLING_SCHEDULED], 0)
        self.assertEqual(stage_map[LeadStatus.APPLICATION_STARTED], 1)
        self.assertEqual(stage_map[LeadStatus.APPLICATION_SUBMITTED], 0)
        self.assertEqual(stage_map[LeadStatus.CONVERTED], 1)

    def test_source_analysis_grouping_and_percentages(self):
        """
        Sources:
        WEBSITE: 3 leads (50.0%)
        WALK_IN: 1 lead (16.7%)
        CAMPAIGN: 1 lead (16.7%)
        WHATSAPP: 1 lead (16.7%)
        Total: 6 leads
        """
        sources = DashboardAnalyticsService.get_source_analysis(self.manager)
        source_dict = {item['source']: item for item in sources}

        self.assertEqual(source_dict[LeadSource.WEBSITE]['count'], 3)
        self.assertEqual(source_dict[LeadSource.WEBSITE]['percentage'], 50.0)
        self.assertEqual(source_dict[LeadSource.WALK_IN]['count'], 1)
        self.assertEqual(source_dict[LeadSource.WALK_IN]['percentage'], 16.7)

    def test_course_analysis_grouping(self):
        """
        Courses:
        BTECH-CS: 3 leads (50.0%)
        MBA-GEN: 3 leads (50.0%)
        """
        courses = DashboardAnalyticsService.get_course_analysis(self.manager)
        course_dict = {item['course_code']: item for item in courses}

        self.assertEqual(course_dict['BTECH-CS']['count'], 3)
        self.assertEqual(course_dict['BTECH-CS']['percentage'], 50.0)
        self.assertEqual(course_dict['MBA-GEN']['count'], 3)
        self.assertEqual(course_dict['MBA-GEN']['percentage'], 50.0)

    def test_counsellor_workload_operational_visibility(self):
        """
        Workload analysis must provide operational visibility without simplistic ranking scores:
        Anita: 3 assigned leads, 2 pending follow-ups (1 overdue, 1 today), 1 overdue follow-up
        Vikram: 2 assigned leads, 1 pending follow-up (tomorrow), 0 overdue follow-ups
        """
        workload = DashboardAnalyticsService.get_counsellor_workload(self.manager, now=self.now)
        workload_dict = {item['username']: item for item in workload}

        self.assertIn('counsellor_anita', workload_dict)
        self.assertIn('counsellor_vikram', workload_dict)

        anita_work = workload_dict['counsellor_anita']
        self.assertEqual(anita_work['assigned_leads_count'], 3)
        self.assertEqual(anita_work['pending_followups_count'], 2)
        self.assertEqual(anita_work['overdue_followups_count'], 1)
        self.assertNotIn('score', anita_work)
        self.assertNotIn('rank', anita_work)

        vikram_work = workload_dict['counsellor_vikram']
        self.assertEqual(vikram_work['assigned_leads_count'], 2)
        self.assertEqual(vikram_work['pending_followups_count'], 1)
        self.assertEqual(vikram_work['overdue_followups_count'], 0)

    def test_counsellor_workload_counsellor_self_scoping(self):
        """
        When a counsellor requests workload, only their own metrics should be returned.
        """
        workload = DashboardAnalyticsService.get_counsellor_workload(self.counsellor_1, now=self.now)
        self.assertEqual(len(workload), 1)
        self.assertEqual(workload[0]['username'], 'counsellor_anita')

    def test_ageing_breakdown(self):
        """
        Ageing categories:
        0-2 days = Fresh
        3-7 days = Ageing
        8+ days = Stale
        Closed leads (CONVERTED, LOST, NOT_INTERESTED) are separated into 'closed'.
        """
        # Manually alter created_at to simulate different age tiers
        # Lead 1: created today -> Fresh
        # Lead 2: created 4 days ago -> Ageing
        Lead.objects.filter(id=self.lead_2.id).update(created_at=self.now - timedelta(days=4))
        # Lead 4: created 10 days ago -> Stale
        Lead.objects.filter(id=self.lead_4.id).update(created_at=self.now - timedelta(days=10))
        # Lead 3: CONVERTED -> Closed
        # Lead 5: created today -> Fresh
        # Lead 6: created today -> Fresh

        ageing = DashboardAnalyticsService.get_ageing_breakdown(self.manager, now=self.now)
        self.assertEqual(ageing['fresh'], 3)    # leads 1, 5, 6
        self.assertEqual(ageing['ageing'], 1)   # lead 2 (4 days old)
        self.assertEqual(ageing['stale'], 1)    # lead 4 (10 days old)
        self.assertEqual(ageing['closed'], 1)   # lead 3 (CONVERTED)

    def test_dashboard_api_endpoints_permissions(self):
        """
        Ensure unauthenticated requests receive 401 Unauthorized,
        and authenticated requests successfully return 200 OK.
        """
        endpoints = [
            '/api/v1/analytics/dashboard/',
            '/api/v1/analytics/summary/',
            '/api/v1/analytics/funnel/',
            '/api/v1/analytics/sources/',
            '/api/v1/analytics/courses/',
            '/api/v1/analytics/counsellor-workload/',
            '/api/v1/analytics/ageing/',
        ]

        # Unauthenticated
        for ep in endpoints:
            response = self.client.get(ep)
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED, f"Failed for {ep}")

        # Authenticated as Manager
        self.client.force_authenticate(user=self.manager)
        for ep in endpoints:
            response = self.client.get(ep)
            self.assertEqual(response.status_code, status.HTTP_200_OK, f"Failed for {ep}")

        # Overview response payload validation
        overview_res = self.client.get('/api/v1/analytics/dashboard/')
        self.assertEqual(overview_res.status_code, status.HTTP_200_OK)
        data = overview_res.data
        self.assertIn('summary', data)
        self.assertIn('funnel', data)
        self.assertIn('source_analysis', data)
        self.assertIn('course_analysis', data)
        self.assertIn('counsellor_workload', data)
        self.assertIn('ageing', data)
        self.assertEqual(data['user_role'], UserRole.MANAGER)
