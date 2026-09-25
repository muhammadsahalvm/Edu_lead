from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase

from apps.authentication.models import User, UserRole
from apps.courses.models import Course
from apps.leads.models import (
    Lead,
    FollowUp,
    ActivityLog,
    AssignmentState,
    LeadStatus,
    LeadSource,
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
    LossReason,
    AgeingCategory,
    ActivityType,
)
from apps.leads.services.assignment_service import AssignmentService
from apps.leads.services.ageing_service import AgeingService
from apps.leads.services.lifecycle_service import LifecycleService
from apps.leads.services.followup_service import FollowUpService

class BusinessRulesAndEdgeCasesTests(APITestCase):
    """
    Test suite for Phase 6: Deterministic Business Rules and Edge Cases.
    Covers:
    1. Counsellor Assignment (Round-robin, active-only, inactive skipping, empty pool)
    2. Pointer Recovery when last counsellor becomes inactive
    3. Ageing calculation based on created_at (Fresh, Ageing, Stale, Closed)
    4. Overdue Follow-up evaluation (pending vs completed/cancelled)
    5. Multiple pending follow-ups ordering
    6. Lead Lifecycle & State Machine (valid, invalid, loss reason requirement)
    7. No Response handling (not deleted or hidden)
    8. Converted lead timestamp tracking & update preservation
    9. Lost lead recovery by manager
    """

    def setUp(self):
        # Clear assignment state
        AssignmentState.objects.all().delete()

        # Manager
        self.manager = User.objects.create_user(
            username='manager_priya',
            email='priya@edulead.edu',
            password='Password@123',
            role=UserRole.MANAGER,
            first_name='Priya',
            last_name='Sharma'
        )

        # Counsellors
        self.counsellor_1 = User.objects.create_user(
            username='counsellor_amit',
            email='amit@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Amit',
            last_name='Verma',
            is_active=True,
            is_available_for_assignment=True
        )

        self.counsellor_2 = User.objects.create_user(
            username='counsellor_sarah',
            email='sarah@edulead.edu',
            password='Password@123',
            role=UserRole.COUNSELLOR,
            first_name='Sarah',
            last_name='Khan',
            is_active=True,
            is_available_for_assignment=True
        )

        # Course
        self.course = Course.objects.create(
            code='BTECH_CSE',
            name='B.Tech Computer Science',
            degree_level='UNDERGRADUATE',
            duration_years=4.0,
            fee_per_year=150000.00
        )

    # 1. Round-Robin Counsellor Assignment
    def test_01_round_robin_deterministic_rotation(self):
        # 1st assignment -> Counsellor 1
        c1 = AssignmentService.get_next_counsellor()
        self.assertEqual(c1.id, self.counsellor_1.id)

        # 2nd assignment -> Counsellor 2
        c2 = AssignmentService.get_next_counsellor()
        self.assertEqual(c2.id, self.counsellor_2.id)

        # 3rd assignment -> Wraps back to Counsellor 1
        c3 = AssignmentService.get_next_counsellor()
        self.assertEqual(c3.id, self.counsellor_1.id)

    # 2. Assignment Edge Case: Inactive / Unavailable Counsellor Skipped
    def test_02_inactive_or_unavailable_counsellor_skipped(self):
        # Put Counsellor 1 on leave
        self.counsellor_1.is_available_for_assignment = False
        self.counsellor_1.save()

        # Both consecutive assignments must go to Counsellor 2
        assigned_1 = AssignmentService.get_next_counsellor()
        self.assertEqual(assigned_1.id, self.counsellor_2.id)

        assigned_2 = AssignmentService.get_next_counsellor()
        self.assertEqual(assigned_2.id, self.counsellor_2.id)

    # 3. Assignment Edge Case: No Active Counsellors
    def test_03_no_active_counsellors_handled_gracefully(self):
        # Deactivate all counsellors
        User.objects.filter(role=UserRole.COUNSELLOR).update(is_active=False)

        next_counsellor = AssignmentService.get_next_counsellor()
        self.assertIsNone(next_counsellor)

        # Assign lead with empty pool
        lead = Lead.objects.create(
            first_name='Aarav',
            phone='9812345678',
            email='aarav@example.com',
            source=LeadSource.WEBSITE
        )
        assigned_lead = AssignmentService.assign_lead(lead, counsellor=None, actor=self.manager)
        self.assertIsNone(assigned_lead.counsellor)

        # Verify ActivityLog
        log = ActivityLog.objects.filter(lead=lead, activity_type=ActivityType.LEAD_ASSIGNED).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.new_value, 'Unassigned')

    # 4. Assignment Edge Case: Pointer Recovery when last counsellor deactivated
    def test_04_pointer_recovery_on_counsellor_deactivation(self):
        # Set pointer to Counsellor 2
        state, _ = AssignmentState.objects.get_or_create(id=1)
        state.last_assigned_counsellor = self.counsellor_2
        state.save()

        # Now deactivate Counsellor 2
        self.counsellor_2.is_active = False
        self.counsellor_2.save()

        # Next call must recover gracefully and assign to Counsellor 1 without crashing
        next_counsellor = AssignmentService.get_next_counsellor()
        self.assertEqual(next_counsellor.id, self.counsellor_1.id)

    # 5. Ageing Logic: Fresh, Ageing, Stale based on created_at
    def test_05_lead_ageing_calculation_based_on_created_at(self):
        now = timezone.now()
        lead = Lead.objects.create(
            first_name='Riya',
            phone='9870001111',
            email='riya@example.com',
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW
        )

        # Case A: Created 1 day ago -> FRESH (0-2 days)
        lead.created_at = now - timedelta(days=1)
        lead.save(update_fields=['created_at'])
        self.assertEqual(AgeingService.get_ageing_category(lead, now=now), AgeingCategory.FRESH)
        self.assertEqual(AgeingService.calculate_ageing_days(lead, now=now), 1.0)

        # Case B: Created 5 days ago -> AGEING (3-7 days)
        lead.created_at = now - timedelta(days=5)
        lead.save(update_fields=['created_at'])
        self.assertEqual(AgeingService.get_ageing_category(lead, now=now), AgeingCategory.AGEING)
        self.assertEqual(AgeingService.calculate_ageing_days(lead, now=now), 5.0)

        # Case C: Created 10 days ago -> STALE (8+ days)
        lead.created_at = now - timedelta(days=10)
        lead.save(update_fields=['created_at'])
        self.assertEqual(AgeingService.get_ageing_category(lead, now=now), AgeingCategory.STALE)
        self.assertEqual(AgeingService.calculate_ageing_days(lead, now=now), 10.0)

        # Case D: Converted lead -> CLOSED
        lead.status = LeadStatus.CONVERTED
        lead.converted_at = now
        lead.save(update_fields=['status', 'converted_at'])
        self.assertEqual(AgeingService.get_ageing_category(lead, now=now), AgeingCategory.CLOSED)

    # 6. Reusable Overdue Follow-up Logic
    def test_06_overdue_followup_evaluation(self):
        now = timezone.now()
        lead = Lead.objects.create(
            first_name='Deepak',
            phone='9870002222',
            email='deepak@example.com',
            source=LeadSource.PHONE,
            counsellor=self.counsellor_1
        )

        # Task 1: Pending & in past -> OVERDUE
        fu_overdue = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_1,
            scheduled_at=now - timedelta(days=1),
            status=FollowUpStatus.PENDING
        )
        self.assertTrue(FollowUpService.is_overdue(fu_overdue, now=now))
        self.assertTrue(FollowUpService.has_overdue_followup(lead, now=now))

        # Task 2: Completed in past -> NOT overdue
        fu_completed = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_1,
            scheduled_at=now - timedelta(days=2),
            status=FollowUpStatus.COMPLETED,
            completed_at=now - timedelta(days=2),
            outcome=FollowUpOutcome.CONNECTED_POSITIVE
        )
        self.assertFalse(FollowUpService.is_overdue(fu_completed, now=now))

        # Task 3: Cancelled in past -> NOT overdue
        fu_cancelled = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_1,
            scheduled_at=now - timedelta(days=3),
            status=FollowUpStatus.CANCELLED,
            notes='Cancelled'
        )
        self.assertFalse(FollowUpService.is_overdue(fu_cancelled, now=now))

    # 7. Multiple Pending Follow-ups Ordering
    def test_07_multiple_pending_followups_sets_earliest_next_followup(self):
        now = timezone.now()
        lead = Lead.objects.create(
            first_name='Manish',
            phone='9870003333',
            email='manish@example.com',
            source=LeadSource.WEBSITE,
            counsellor=self.counsellor_1
        )

        # Create later task (in 5 days)
        fu_later = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_1,
            scheduled_at=now + timedelta(days=5),
            status=FollowUpStatus.PENDING
        )
        FollowUpService.recalculate_lead_next_followup(lead)
        lead.refresh_from_db()
        self.assertEqual(lead.next_followup_at, fu_later.scheduled_at)

        # Create earlier task (in 2 days)
        fu_earlier = FollowUp.objects.create(
            lead=lead,
            assigned_to=self.counsellor_1,
            scheduled_at=now + timedelta(days=2),
            status=FollowUpStatus.PENDING
        )
        FollowUpService.recalculate_lead_next_followup(lead)
        lead.refresh_from_db()
        # Must point to earlier task
        self.assertEqual(lead.next_followup_at, fu_earlier.scheduled_at)

        # Complete earlier task -> must advance next_followup_at to later task
        fu_earlier.status = FollowUpStatus.COMPLETED
        fu_earlier.outcome = FollowUpOutcome.CONNECTED_POSITIVE
        fu_earlier.save()
        FollowUpService.recalculate_lead_next_followup(lead)
        lead.refresh_from_db()
        self.assertEqual(lead.next_followup_at, fu_later.scheduled_at)

    # 8. Conversion Timestamp & Preserved Lead Updates
    def test_08_converted_status_timestamp_and_update_preservation(self):
        lead = Lead.objects.create(
            first_name='Vikram',
            phone='9870004444',
            email='vikram@example.com',
            source=LeadSource.WEBSITE,
            status=LeadStatus.APPLICATION_SUBMITTED,
            counsellor=self.counsellor_1
        )

        # Transition to CONVERTED
        LifecycleService.transition_status(lead, LeadStatus.CONVERTED, actor=self.counsellor_1)
        lead.refresh_from_db()
        self.assertEqual(lead.status, LeadStatus.CONVERTED)
        self.assertIsNotNone(lead.converted_at)
        initial_converted_at = lead.converted_at

        # Verify activity logged
        log = ActivityLog.objects.filter(lead=lead, new_value=LeadStatus.CONVERTED).first()
        self.assertIsNotNone(log)

        # Update contact info on converted lead -> converted_at must be preserved
        lead.notes = 'Additional documents received'
        lead.save()
        lead.refresh_from_db()
        self.assertEqual(lead.converted_at, initial_converted_at)

    # 9. Lost Lead Recovery by Manager
    def test_09_lost_lead_recovery_workflow(self):
        lead = Lead.objects.create(
            first_name='Ankit',
            phone='9870005555',
            email='ankit@example.com',
            source=LeadSource.WEBSITE,
            status=LeadStatus.CONTACTED,
            counsellor=self.counsellor_1
        )

        # Step 1: Lead becomes LOST (requires loss reason)
        LifecycleService.transition_status(
            lead,
            LeadStatus.LOST,
            actor=self.counsellor_1,
            loss_reason=LossReason.FEES_HIGH,
            loss_notes='Family requested discount'
        )
        lead.refresh_from_db()
        self.assertEqual(lead.status, LeadStatus.LOST)
        self.assertEqual(lead.loss_reason, LossReason.FEES_HIGH)
        # Lead is NOT deleted
        self.assertFalse(lead.is_deleted)

        # Step 2: Counsellor cannot arbitrarily reopen terminal lead
        with self.assertRaises(ValidationError):
            LifecycleService.transition_status(lead, LeadStatus.NEW, actor=self.counsellor_1)

        # Step 3: Manager recovers the lost lead
        LifecycleService.recover_lost_lead(
            lead,
            actor=self.manager,
            target_status=LeadStatus.NEW,
            recovery_notes='Scholarship approved; prospective student re-enquired'
        )
        lead.refresh_from_db()
        self.assertEqual(lead.status, LeadStatus.NEW)
        self.assertIsNone(lead.loss_reason)

        # Verify Recovery ActivityLog
        recovery_log = ActivityLog.objects.filter(lead=lead, new_value=LeadStatus.NEW).first()
        self.assertIsNotNone(recovery_log)
        self.assertIn('Lead recovered', recovery_log.details)

    # 10. NO_RESPONSE Does Not Delete or Hide Lead
    def test_10_no_response_lead_preserved_in_pipeline(self):
        lead = Lead.objects.create(
            first_name='Suresh',
            phone='9870006666',
            email='suresh@example.com',
            source=LeadSource.PHONE,
            status=LeadStatus.CONTACTED,
            counsellor=self.counsellor_1
        )
        LifecycleService.transition_status(lead, LeadStatus.NO_RESPONSE, actor=self.counsellor_1)
        lead.refresh_from_db()
        self.assertEqual(lead.status, LeadStatus.NO_RESPONSE)
        self.assertFalse(lead.is_deleted)
        # Still queryable by counsellor
        self.assertEqual(Lead.objects.filter(counsellor=self.counsellor_1, status=LeadStatus.NO_RESPONSE).count(), 1)
