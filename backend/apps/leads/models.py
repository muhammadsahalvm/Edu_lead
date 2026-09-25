import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from apps.courses.models import Course

class LeadSource(models.TextChoices):
    WEBSITE = 'WEBSITE', _('Website Enquiry')
    WALK_IN = 'WALK_IN', _('Walk-In / Campus Visit')
    PHONE = 'PHONE', _('Phone Call')
    WHATSAPP = 'WHATSAPP', _('WhatsApp')
    EDUCATION_FAIR = 'EDUCATION_FAIR', _('Education Fair / Expo')
    CAMPAIGN = 'CAMPAIGN', _('Digital Campaign (Ads)')
    REFERRAL = 'REFERRAL', _('Student / Alumni Referral')
    OTHER = 'OTHER', _('Other Source')

class LeadStatus(models.TextChoices):
    NEW = 'NEW', _('New')
    CONTACTED = 'CONTACTED', _('Contacted')
    INTERESTED = 'INTERESTED', _('Interested')
    COUNSELLING_SCHEDULED = 'COUNSELLING_SCHEDULED', _('Counselling Scheduled')
    APPLICATION_STARTED = 'APPLICATION_STARTED', _('Application Started')
    APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED', _('Application Submitted')
    CONVERTED = 'CONVERTED', _('Converted')
    NO_RESPONSE = 'NO_RESPONSE', _('No Response')
    NOT_INTERESTED = 'NOT_INTERESTED', _('Not Interested')
    LOST = 'LOST', _('Lost')

class LeadPriority(models.TextChoices):
    HIGH = 'HIGH', _('High Priority')
    MEDIUM = 'MEDIUM', _('Medium Priority')
    LOW = 'LOW', _('Low Priority')

class LossReason(models.TextChoices):
    FEES_HIGH = 'FEES_HIGH', _('Tuition / Fee Constraint')
    DISTANCE_LOCATION = 'DISTANCE_LOCATION', _('Distance / Relocation Constraint')
    CHOSE_COMPETITOR = 'CHOSE_COMPETITOR', _('Admitted to Another Institution')
    INELIGIBLE_ACADEMICS = 'INELIGIBLE_ACADEMICS', _('Academic Ineligibility / Minimum Marks')
    COURSE_NOT_OFFERED = 'COURSE_NOT_OFFERED', _('Desired Specialization Not Offered')
    UNRESPONSIVE_EXHAUSTED = 'UNRESPONSIVE_EXHAUSTED', _('Unresponsive After Maximum Attempts')
    OTHER = 'OTHER', _('Other / Personal Reason')

class AgeingCategory(models.TextChoices):
    FRESH = 'FRESH', _('Fresh (0-2 days)')
    AGEING = 'AGEING', _('Ageing (3-7 days)')
    STALE = 'STALE', _('Stale (8+ days)')
    CLOSED = 'CLOSED', _('Closed / Terminal')

class Lead(models.Model):
    """
    Central admission lead entity representing prospective student applicants.
    """
    lead_number = models.CharField(
        max_length=32,
        unique=True,
        db_index=True,
        editable=False,
        help_text=_('System-generated unique identifier (e.g. LED-YYYYMM-XXXXX).')
    )
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True, db_index=True)
    phone = models.CharField(max_length=25, db_index=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    
    course = models.ForeignKey(
        Course,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='leads',
        help_text=_('Primary academic program preference.')
    )
    source = models.CharField(
        max_length=30,
        choices=LeadSource.choices,
        default=LeadSource.WEBSITE,
        db_index=True
    )
    status = models.CharField(
        max_length=30,
        choices=LeadStatus.choices,
        default=LeadStatus.NEW,
        db_index=True
    )
    priority = models.CharField(
        max_length=10,
        choices=LeadPriority.choices,
        default=LeadPriority.MEDIUM,
        db_index=True,
        help_text=_('Operational priority for outreach.')
    )
    counsellor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_leads',
        limit_choices_to={'role': 'COUNSELLOR'},
        help_text=_('Assigned admission counsellor.')
    )
    notes = models.TextField(blank=True, help_text=_('General counsellor remarks and background context.'))
    loss_reason = models.CharField(
        max_length=50,
        choices=LossReason.choices,
        null=True,
        blank=True,
        help_text=_('Mandatory reason if status is LOST or NOT_INTERESTED.')
    )
    loss_notes = models.TextField(blank=True, help_text=_('Additional context on loss or rejection.'))

    # Key Lifecycle Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_contacted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    next_followup_at = models.DateTimeField(null=True, blank=True, db_index=True)
    converted_at = models.DateTimeField(null=True, blank=True, db_index=True)

    is_deleted = models.BooleanField(
        default=False,
        db_index=True,
        help_text=_('Soft-delete flag preserving historical records.')
    )

    class Meta:
        verbose_name = _('Lead')
        verbose_name_plural = _('Leads')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'counsellor'], name='idx_lead_status_counsellor'),
            models.Index(fields=['status', 'created_at'], name='idx_lead_status_created'),
            models.Index(fields=['phone', 'email'], name='idx_lead_phone_email'),
            models.Index(fields=['source', 'status'], name='idx_lead_source_status'),
            models.Index(fields=['next_followup_at', 'status'], name='idx_lead_next_followup'),
        ]

    @property
    def full_name(self) -> str:
        if self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.first_name

    @property
    def is_terminal(self) -> bool:
        return self.status in [LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED, LeadStatus.LOST]

    @property
    def ageing_days(self) -> float:
        """
        Calculates elapsed days since lead creation based on created_at.
        """
        from apps.leads.services.ageing_service import AgeingService
        return AgeingService.calculate_ageing_days(self)

    @property
    def ageing_category(self) -> str:
        """
        Dynamically classifies lead into Fresh (0-2d), Ageing (3-7d), Stale (8+d), or Closed.
        """
        from apps.leads.services.ageing_service import AgeingService
        return AgeingService.get_ageing_category(self)

    def clean(self):
        super().clean()
        # Ensure email or phone is provided
        if not self.email and not self.phone:
            raise ValidationError(_('Either an email address or phone number must be provided.'))

        # Enforce loss reason on terminal non-converted leads
        if self.status in [LeadStatus.LOST, LeadStatus.NOT_INTERESTED] and not self.loss_reason:
            raise ValidationError({'loss_reason': _('A loss reason is mandatory when marking a lead as Lost or Not Interested.')})

        # Set converted_at automatically if converted
        if self.status == LeadStatus.CONVERTED and not self.converted_at:
            self.converted_at = timezone.now()

    def save(self, *args, **kwargs):
        # Generate readable unique lead_number if not assigned
        if not self.lead_number:
            now_prefix = timezone.now().strftime('%Y%m')
            random_suffix = uuid.uuid4().hex[:6].upper()
            self.lead_number = f"LED-{now_prefix}-{random_suffix}"

        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.lead_number} - {self.full_name} ({self.get_status_display()})"


class FollowUpType(models.TextChoices):
    CALL = 'CALL', _('Phone Call')
    WHATSAPP = 'WHATSAPP', _('WhatsApp')
    EMAIL = 'EMAIL', _('Email')
    COUNSELLING = 'COUNSELLING', _('Counselling Session')
    MEETING = 'MEETING', _('In-Person Meeting')
    # Backward compatibility aliases
    PHONE_CALL = 'PHONE_CALL', _('Phone Call (Legacy)')
    CAMPUS_TOUR = 'CAMPUS_TOUR', _('Campus Tour (Legacy)')

class FollowUpStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    COMPLETED = 'COMPLETED', _('Completed')
    MISSED = 'MISSED', _('Missed')
    CANCELLED = 'CANCELLED', _('Cancelled')

class FollowUpOutcome(models.TextChoices):
    CONNECTED_POSITIVE = 'CONNECTED_POSITIVE', _('Connected - Positive Interest')
    CONNECTED_BUSY_CALL_BACK = 'CONNECTED_BUSY_CALL_BACK', _('Connected - Requested Callback')
    RINGING_NO_ANSWER = 'RINGING_NO_ANSWER', _('Ringing - No Answer')
    NUMBER_INVALID = 'NUMBER_INVALID', _('Invalid / Unreachable Number')
    WHATSAPP_SENT = 'WHATSAPP_SENT', _('WhatsApp Info Sent')
    EMAIL_SENT = 'EMAIL_SENT', _('Email Prospectus Sent')
    MEETING_COMPLETED = 'MEETING_COMPLETED', _('Session / Meeting Completed')
    MEETING_NO_SHOW = 'MEETING_NO_SHOW', _('Candidate Missed Session (No-Show)')

class FollowUp(models.Model):
    """
    Scheduled and completed interaction tasks for a lead.
    """
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name='follow_ups',
        help_text=_('Associated lead.')
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_follow_ups',
        help_text=_('Counsellor responsible for conducting the interaction.')
    )
    scheduled_at = models.DateTimeField(
        db_index=True,
        help_text=_('Scheduled date and time for the follow-up.')
    )
    followup_type = models.CharField(
        max_length=30,
        choices=FollowUpType.choices,
        default=FollowUpType.CALL
    )
    status = models.CharField(
        max_length=20,
        choices=FollowUpStatus.choices,
        default=FollowUpStatus.PENDING,
        db_index=True
    )
    outcome = models.CharField(
        max_length=50,
        choices=FollowUpOutcome.choices,
        null=True,
        blank=True,
        help_text=_('Recorded result once follow-up is completed.')
    )
    notes = models.TextField(blank=True, help_text=_('Interaction summary notes.'))
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Follow-up')
        verbose_name_plural = _('Follow-ups')
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['status', 'scheduled_at'], name='idx_followup_status_sched'),
            models.Index(fields=['lead', 'status'], name='idx_followup_lead_status'),
            models.Index(fields=['assigned_to', 'status', 'scheduled_at'], name='idx_followup_user_sched'),
        ]

    @property
    def is_overdue(self) -> bool:
        if self.status == FollowUpStatus.PENDING:
            return self.scheduled_at < timezone.now()
        return False

    def clean(self):
        super().clean()
        if self.status == FollowUpStatus.COMPLETED:
            if not self.completed_at:
                self.completed_at = timezone.now()
            if not self.outcome:
                raise ValidationError({'outcome': _('An outcome must be specified when completing a follow-up.')})
        elif self.status in [FollowUpStatus.CANCELLED, FollowUpStatus.MISSED]:
            if self.status == FollowUpStatus.CANCELLED and not self.notes:
                raise ValidationError({'notes': _('Cancellation reason must be specified in notes when cancelling a follow-up.')})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.get_followup_type_display()} for {self.lead.lead_number} at {self.scheduled_at.strftime('%Y-%m-%d %H:%M')}"


class ActivityType(models.TextChoices):
    LEAD_CREATED = 'LEAD_CREATED', _('Lead Created')
    LEAD_ASSIGNED = 'LEAD_ASSIGNED', _('Lead Assigned')
    COUNSELLOR_CHANGED = 'COUNSELLOR_CHANGED', _('Counsellor Reassigned')
    STATUS_CHANGED = 'STATUS_CHANGED', _('Status Changed')
    FOLLOWUP_CREATED = 'FOLLOWUP_CREATED', _('Follow-up Scheduled')
    FOLLOWUP_COMPLETED = 'FOLLOWUP_COMPLETED', _('Follow-up Completed')
    FOLLOWUP_MISSED = 'FOLLOWUP_MISSED', _('Follow-up Marked Missed')
    FOLLOWUP_CANCELLED = 'FOLLOWUP_CANCELLED', _('Follow-up Cancelled')
    COURSE_CHANGED = 'COURSE_CHANGED', _('Course Preference Changed')
    LEAD_UPDATED = 'LEAD_UPDATED', _('Lead Details Updated')
    NOTE_ADDED = 'NOTE_ADDED', _('Counsellor Note Added')

class ActivityLog(models.Model):
    """
    Immutable chronological audit trail recording every significant event in a lead's lifecycle.
    """
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name='activities',
        db_index=True
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='logged_activities',
        help_text=_('Staff member who performed this action (null if automated system action).')
    )
    activity_type = models.CharField(
        max_length=50,
        choices=ActivityType.choices,
        db_index=True
    )
    old_value = models.CharField(max_length=255, blank=True)
    new_value = models.CharField(max_length=255, blank=True)
    details = models.TextField(blank=True, help_text=_('Human-readable summary or remarks.'))
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('Activity Log')
        verbose_name_plural = _('Activity Logs')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['lead', 'created_at'], name='idx_actlog_lead_created'),
            models.Index(fields=['activity_type', 'created_at'], name='idx_actlog_type_created'),
        ]

    def __str__(self) -> str:
        actor_name = self.actor.username if self.actor else 'System'
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M')}] {self.get_activity_type_display()} on {self.lead.lead_number} by {actor_name}"


class AssignmentState(models.Model):
    """
    Single-row state tracker storing pointer for deterministic round-robin assignment.
    Prevents race conditions under concurrent webhook ingestion.
    """
    last_assigned_counsellor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text=_('Last counsellor to receive an automated lead assignment.')
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Assignment State')
        verbose_name_plural = _('Assignment State')

    def __str__(self) -> str:
        last = self.last_assigned_counsellor.username if self.last_assigned_counsellor else 'None'
        return f"Last Assigned Counsellor: {last} (Updated: {self.updated_at.strftime('%Y-%m-%d %H:%M:%S')})"
