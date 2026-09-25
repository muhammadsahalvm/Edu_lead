from django.db.models import QuerySet, Q
from django.utils import timezone
from apps.leads.models import Lead, FollowUp, FollowUpStatus

class FollowUpService:
    """
    Reusable domain service for Follow-Up lifecycle queries and calculations.
    
    OVERDUE BUSINESS RULE:
    A follow-up is overdue if and only if:
    - scheduled_at is strictly in the past (< timezone.now())
    - status is PENDING
    Completed, Missed, or Cancelled tasks are NEVER considered overdue.
    """

    @classmethod
    def is_overdue(cls, follow_up: FollowUp, now=None) -> bool:
        current_time = now or timezone.now()
        return follow_up.status == FollowUpStatus.PENDING and follow_up.scheduled_at < current_time

    @classmethod
    def get_overdue_followups(cls, user=None, now=None) -> QuerySet[FollowUp]:
        """
        Returns all currently overdue pending follow-ups.
        If user is provided and not a manager, scopes to user's assigned tasks/leads.
        """
        current_time = now or timezone.now()
        queryset = FollowUp.objects.filter(
            status=FollowUpStatus.PENDING,
            scheduled_at__lt=current_time
        ).select_related('lead', 'assigned_to')

        if user and not user.is_manager:
            queryset = queryset.filter(Q(assigned_to=user) | Q(lead__counsellor=user))

        return queryset.order_by('scheduled_at')

    @classmethod
    def get_upcoming_followups(cls, user=None, now=None) -> QuerySet[FollowUp]:
        """
        Returns all upcoming pending follow-ups scheduled for the future.
        """
        current_time = now or timezone.now()
        queryset = FollowUp.objects.filter(
            status=FollowUpStatus.PENDING,
            scheduled_at__gte=current_time
        ).select_related('lead', 'assigned_to')

        if user and not user.is_manager:
            queryset = queryset.filter(Q(assigned_to=user) | Q(lead__counsellor=user))

        return queryset.order_by('scheduled_at')

    @classmethod
    def has_overdue_followup(cls, lead: Lead, now=None) -> bool:
        """
        Checks whether a lead has at least one overdue pending follow-up.
        """
        current_time = now or timezone.now()
        return lead.follow_ups.filter(
            status=FollowUpStatus.PENDING,
            scheduled_at__lt=current_time
        ).exists()

    @classmethod
    def recalculate_lead_next_followup(cls, lead: Lead) -> FollowUp | None:
        """
        Handles multiple pending follow-ups on a lead by finding the earliest 
        pending follow-up and caching it in lead.next_followup_at.
        """
        earliest_pending = lead.follow_ups.filter(
            status=FollowUpStatus.PENDING
        ).order_by('scheduled_at').first()

        next_time = earliest_pending.scheduled_at if earliest_pending else None
        if lead.next_followup_at != next_time:
            lead.next_followup_at = next_time
            lead.save(update_fields=['next_followup_at', 'updated_at'])

        return earliest_pending
