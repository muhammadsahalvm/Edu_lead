from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.leads.models import Lead, LeadStatus, ActivityLog, ActivityType, LossReason

# Allowed forward & lateral transitions for active stages
VALID_TRANSITIONS = {
    LeadStatus.NEW: {
        LeadStatus.CONTACTED,
        LeadStatus.NO_RESPONSE,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
    LeadStatus.CONTACTED: {
        LeadStatus.INTERESTED,
        LeadStatus.COUNSELLING_SCHEDULED,
        LeadStatus.NO_RESPONSE,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
    LeadStatus.INTERESTED: {
        LeadStatus.COUNSELLING_SCHEDULED,
        LeadStatus.APPLICATION_STARTED,
        LeadStatus.NO_RESPONSE,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
    LeadStatus.COUNSELLING_SCHEDULED: {
        LeadStatus.APPLICATION_STARTED,
        LeadStatus.INTERESTED,
        LeadStatus.NO_RESPONSE,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
    LeadStatus.APPLICATION_STARTED: {
        LeadStatus.APPLICATION_SUBMITTED,
        LeadStatus.NO_RESPONSE,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
    LeadStatus.APPLICATION_SUBMITTED: {
        LeadStatus.CONVERTED,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
    LeadStatus.NO_RESPONSE: {
        LeadStatus.CONTACTED,
        LeadStatus.INTERESTED,
        LeadStatus.NOT_INTERESTED,
        LeadStatus.LOST,
    },
}

TERMINAL_STATUSES = {
    LeadStatus.CONVERTED,
    LeadStatus.NOT_INTERESTED,
    LeadStatus.LOST,
}


class LifecycleService:
    """
    Deterministic domain service governing Lead lifecycle status transitions.
    Enforces business rules, terminal state locks, and mandatory loss reasons.
    """

    @classmethod
    def can_transition(cls, current_status: str, new_status: str, is_manager: bool = False) -> tuple[bool, str]:
        """
        Validates whether a transition from current_status to new_status is permitted.
        Returns (is_allowed, error_message).
        """
        if current_status == new_status:
            return False, f"Lead is already in '{current_status}' status."

        # Terminal state lock check
        if current_status in TERMINAL_STATUSES:
            if not is_manager:
                return False, (
                    f"Lead is in terminal state '{current_status}'. "
                    f"Only admissions managers are authorized to reopen or modify terminal leads."
                )
            # Managers are allowed to reopen terminal leads to an active stage
            return True, ""

        # Validate normal progression
        allowed_targets = VALID_TRANSITIONS.get(current_status, set())
        if new_status in allowed_targets:
            return True, ""

        # Specific user-friendly rejection messages
        if current_status == LeadStatus.NEW and new_status == LeadStatus.CONVERTED:
            return False, (
                "Cannot jump directly from 'New' to 'Converted'. "
                "The prospective student must progress through qualification and application submission first."
            )

        return False, (
            f"Invalid status transition from '{current_status}' to '{new_status}'. "
            f"Allowed next stages: {', '.join(sorted(allowed_targets)) or 'None'}."
        )

    @classmethod
    def transition_status(
        cls,
        lead: Lead,
        new_status: str,
        actor,
        loss_reason: str = None,
        loss_notes: str = None,
        remarks: str = None,
    ) -> Lead:
        """
        Executes a validated status transition.
        Updates timestamps, loss reasons, and creates an immutable ActivityLog.
        """
        is_manager = actor.is_manager if hasattr(actor, 'is_manager') else False
        allowed, error_msg = cls.can_transition(lead.status, new_status, is_manager=is_manager)

        if not allowed:
            raise ValidationError({'status': error_msg})

        # Require loss_reason if transitioning to LOST or NOT_INTERESTED
        if new_status in [LeadStatus.LOST, LeadStatus.NOT_INTERESTED]:
            if not loss_reason:
                raise ValidationError({
                    'loss_reason': f"A valid loss reason is mandatory when transitioning to '{new_status}'."
                })
            lead.loss_reason = loss_reason
            lead.loss_notes = loss_notes or ""

        old_status = lead.status
        lead.status = new_status

        # Timestamp handling
        if new_status == LeadStatus.CONVERTED:
            lead.converted_at = timezone.now()
        elif old_status == LeadStatus.CONVERTED and new_status != LeadStatus.CONVERTED:
            # Reopened from converted: reset converted timestamp
            lead.converted_at = None

        # If lead was uncontacted and moved to CONTACTED or beyond, update last_contacted_at
        if old_status == LeadStatus.NEW and new_status != LeadStatus.NEW and not lead.last_contacted_at:
            lead.last_contacted_at = timezone.now()

        with transaction.atomic():
            lead.save()

            # Audit log creation
            details_text = remarks or f"Status transitioned from {old_status} to {new_status}"
            if loss_reason:
                details_text += f" | Loss Reason: {loss_reason}"
            if loss_notes:
                details_text += f" | Notes: {loss_notes}"

            ActivityLog.objects.create(
                lead=lead,
                actor=actor if actor and actor.is_authenticated else None,
                activity_type=ActivityType.STATUS_CHANGED,
                old_value=old_status,
                new_value=new_status,
                details=details_text
            )

        return lead

    @classmethod
    def recover_lost_lead(cls, lead: Lead, actor, target_status: str = LeadStatus.NEW, recovery_notes: str = None) -> Lead:
        """
        Manager action to recover a previously LOST or NOT_INTERESTED lead back into an active pipeline.
        Clears loss reason, resets status, and records an auditable recovery event.
        """
        is_manager = actor.is_manager if hasattr(actor, 'is_manager') else False
        if not is_manager:
            raise ValidationError({'status': 'Only managers are authorized to recover lost or dropped leads.'})

        if lead.status not in [LeadStatus.LOST, LeadStatus.NOT_INTERESTED]:
            raise ValidationError({'status': f"Cannot recover lead from '{lead.status}'. Recovery is only applicable to Lost or Not Interested leads."})

        old_status = lead.status
        old_loss_reason = lead.loss_reason
        lead.status = target_status
        lead.loss_reason = None
        lead.loss_notes = ""
        with transaction.atomic():
            lead.save()

            details = f"Lead recovered from {old_status} by {actor.username}. Reason: {recovery_notes or 'Prospective re-engagement'}. Prior loss reason: {old_loss_reason}"
            ActivityLog.objects.create(
                lead=lead,
                actor=actor,
                activity_type=ActivityType.STATUS_CHANGED,
                old_value=old_status,
                new_value=target_status,
                details=details
            )
        return lead
