from django.db import transaction
from apps.authentication.models import User, UserRole
from apps.leads.models import Lead, AssignmentState, ActivityLog, ActivityType

class AssignmentService:
    """
    Deterministic Round-Robin counsellor assignment service.
    Features:
    - Atomically updates AssignmentState pointer using select_for_update() inside a transaction.
    - Filters out inactive counsellors and counsellors marked unavailable.
    - Handles empty pool gracefully without throwing unhandled exceptions.
    """

    @classmethod
    def get_next_counsellor(cls) -> User | None:
        """
        Determines the next counsellor in round-robin order with row-level database locking.
        """
        active_counsellors = list(
            User.objects.filter(
                role=UserRole.COUNSELLOR,
                is_active=True,
                is_available_for_assignment=True
            ).order_by('id')
        )

        if not active_counsellors:
            return None

        with transaction.atomic():
            state, _ = AssignmentState.objects.select_for_update().get_or_create(id=1)
            last_counsellor = state.last_assigned_counsellor

            next_counsellor = active_counsellors[0]
            if last_counsellor:
                counsellor_ids = [c.id for c in active_counsellors]
                if last_counsellor.id in counsellor_ids:
                    current_idx = counsellor_ids.index(last_counsellor.id)
                    next_idx = (current_idx + 1) % len(active_counsellors)
                    next_counsellor = active_counsellors[next_idx]
                else:
                    # Last counsellor is no longer in active pool; restart from index 0
                    next_counsellor = active_counsellors[0]

            state.last_assigned_counsellor = next_counsellor
            state.save()

            return next_counsellor

    @classmethod
    def assign_lead(
        cls,
        lead: Lead,
        counsellor: User = None,
        actor=None,
        reason: str = None
    ) -> Lead:
        """
        Assigns or reassigns a lead to a counsellor and records an ActivityLog.
        """
        if counsellor is None:
            counsellor = cls.get_next_counsellor()

        old_counsellor = lead.counsellor
        lead.counsellor = counsellor
        with transaction.atomic():
            lead.save(update_fields=['counsellor', 'updated_at'])

            old_name = old_counsellor.get_full_name() or old_counsellor.username if old_counsellor else 'Unassigned'
            new_name = counsellor.get_full_name() or counsellor.username if counsellor else 'Unassigned'
            details = reason or f"Lead assigned to {new_name}"

            ActivityLog.objects.create(
                lead=lead,
                actor=actor if actor and actor.is_authenticated else None,
                activity_type=ActivityType.COUNSELLOR_CHANGED if old_counsellor else ActivityType.LEAD_ASSIGNED,
                old_value=old_name,
                new_value=new_name,
                details=details
            )

        return lead

    @classmethod
    def reassign_lead(
        cls,
        lead: Lead,
        new_counsellor: User,
        actor=None,
        reason: str = None
    ) -> Lead:
        """
        Manager action to reassign a lead to a specific active counsellor with reason.
        """
        if new_counsellor and new_counsellor.role != UserRole.COUNSELLOR:
            from django.core.exceptions import ValidationError
            raise ValidationError({'counsellor': 'Leads can only be assigned to users with the COUNSELLOR role.'})

        reason_text = f"Reassigned by {actor.username if actor else 'System'}. Reason: {reason or 'Workload rebalancing'}"
        return cls.assign_lead(lead, counsellor=new_counsellor, actor=actor, reason=reason_text)
