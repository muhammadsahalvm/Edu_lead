import re
from rest_framework import serializers
from .models import (
    Lead,
    FollowUp,
    ActivityLog,
    LeadStatus,
    LeadSource,
    LeadPriority,
    LossReason,
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
)
from apps.courses.models import Course
from apps.authentication.models import User, UserRole
from .services.duplicate_service import DuplicateService
from .services.lifecycle_service import LifecycleService

class LeadListSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    counsellor_name = serializers.SerializerMethodField()
    ageing_category = serializers.CharField(read_only=True)
    ageing_days = serializers.FloatField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)

    class Meta:
        model = Lead
        fields = [
            'id',
            'lead_number',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone',
            'city',
            'state',
            'course',
            'course_name',
            'source',
            'source_display',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'counsellor',
            'counsellor_name',
            'ageing_category',
            'ageing_days',
            'created_at',
            'last_contacted_at',
            'next_followup_at',
            'converted_at',
        ]
        read_only_fields = ['id', 'lead_number', 'created_at', 'converted_at']

    def get_counsellor_name(self, obj):
        if obj.counsellor:
            return obj.counsellor.get_full_name() or obj.counsellor.username
        return 'Unassigned'


class LeadDetailSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    counsellor_name = serializers.SerializerMethodField()
    ageing_category = serializers.CharField(read_only=True)
    ageing_days = serializers.FloatField(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    loss_reason_display = serializers.CharField(source='get_loss_reason_display', read_only=True)
    potential_duplicates = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            'id',
            'lead_number',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone',
            'city',
            'state',
            'course',
            'course_name',
            'source',
            'source_display',
            'status',
            'status_display',
            'priority',
            'priority_display',
            'counsellor',
            'counsellor_name',
            'notes',
            'loss_reason',
            'loss_reason_display',
            'loss_notes',
            'ageing_category',
            'ageing_days',
            'created_at',
            'updated_at',
            'last_contacted_at',
            'next_followup_at',
            'converted_at',
            'potential_duplicates',
        ]
        read_only_fields = ['id', 'lead_number', 'created_at', 'updated_at', 'converted_at', 'potential_duplicates']

    def get_counsellor_name(self, obj):
        if obj.counsellor:
            return obj.counsellor.get_full_name() or obj.counsellor.username
        return 'Unassigned'

    def get_potential_duplicates(self, obj):
        return DuplicateService.find_potential_duplicates(
            email=obj.email,
            phone=obj.phone,
            exclude_lead_id=obj.id
        )

    def validate_phone(self, value):
        digits = re.sub(r'\D', '', value)
        if len(digits) < 7 or len(digits) > 15:
            raise serializers.ValidationError("Phone number must contain between 7 and 15 digits.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None

        # Prevent privilege escalation: Counsellor cannot reassign lead via standard update
        if self.instance and 'counsellor' in attrs:
            if user and not user.is_manager:
                if attrs['counsellor'] != self.instance.counsellor:
                    raise serializers.ValidationError({
                        'counsellor': 'Access forbidden. Only managers are permitted to reassign counsellors.'
                    })

        # Validate status change if present in update payload
        if self.instance and 'status' in attrs:
            new_status = attrs['status']
            if new_status != self.instance.status:
                is_mgr = user.is_manager if user else False
                can_trans, err_msg = LifecycleService.can_transition(
                    self.instance.status,
                    new_status,
                    is_manager=is_mgr
                )
                if not can_trans:
                    raise serializers.ValidationError({'status': err_msg})

                if new_status in [LeadStatus.LOST, LeadStatus.NOT_INTERESTED] and not attrs.get('loss_reason', self.instance.loss_reason):
                    raise serializers.ValidationError({
                        'loss_reason': f"A loss reason is mandatory when setting status to '{new_status}'."
                    })

        return attrs


class LeadCreateSerializer(serializers.ModelSerializer):
    auto_assign = serializers.BooleanField(write_only=True, required=False, default=True)

    class Meta:
        model = Lead
        fields = [
            'id',
            'lead_number',
            'first_name',
            'last_name',
            'email',
            'phone',
            'city',
            'state',
            'course',
            'source',
            'priority',
            'counsellor',
            'notes',
            'auto_assign',
        ]
        read_only_fields = ['id', 'lead_number']

    def validate_first_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("First name is required.")
        return value.strip()

    def validate_phone(self, value):
        digits = re.sub(r'\D', '', value)
        if len(digits) < 7 or len(digits) > 15:
            raise serializers.ValidationError("Phone number must contain between 7 and 15 digits.")
        return value

    def validate_course(self, value):
        if value and not value.is_active:
            raise serializers.ValidationError("Selected course is currently inactive and cannot accept new enquiries.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None

        # If created by a counsellor and counsellor field is specified, enforce self-assignment
        if user and user.is_counsellor:
            if 'counsellor' in attrs and attrs['counsellor'] != user:
                raise serializers.ValidationError({
                    'counsellor': 'Counsellors cannot create leads directly assigned to other counsellors.'
                })
        return attrs


class StatusTransitionSerializer(serializers.Serializer):
    """
    Serializer for controlled status state-machine transitions.
    """
    status = serializers.ChoiceField(choices=LeadStatus.choices)
    loss_reason = serializers.ChoiceField(choices=LossReason.choices, required=False, allow_null=True)
    loss_notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    remarks = serializers.CharField(required=False, allow_blank=True, max_length=500)

    def validate(self, attrs):
        new_status = attrs['status']
        loss_reason = attrs.get('loss_reason')
        if new_status in [LeadStatus.LOST, LeadStatus.NOT_INTERESTED] and not loss_reason:
            raise serializers.ValidationError({
                'loss_reason': f"A valid loss reason is mandatory when transitioning to '{new_status}'."
            })
        return attrs


class ReassignLeadSerializer(serializers.Serializer):
    """
    Manager-only serializer for reassigning a lead to a new counsellor.
    """
    counsellor_id = serializers.IntegerField(required=True)
    reason = serializers.CharField(required=True, min_length=3, max_length=500)

    def validate_counsellor_id(self, value):
        try:
            counsellor = User.objects.get(id=value, role=UserRole.COUNSELLOR, is_active=True)
        except User.DoesNotExist:
            raise serializers.ValidationError("Valid active counsellor with this ID does not exist.")
        return counsellor


class FollowUpSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    assigned_to_name = serializers.SerializerMethodField()
    lead_number = serializers.CharField(source='lead.lead_number', read_only=True)
    lead_name = serializers.CharField(source='lead.full_name', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    followup_type_display = serializers.CharField(source='get_followup_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)

    class Meta:
        model = FollowUp
        fields = [
            'id',
            'lead',
            'lead_number',
            'lead_name',
            'assigned_to',
            'assigned_to_name',
            'scheduled_at',
            'followup_type',
            'followup_type_display',
            'status',
            'status_display',
            'outcome',
            'outcome_display',
            'notes',
            'is_overdue',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['completed_at', 'created_at', 'updated_at']

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() or obj.assigned_to.username

    def validate_lead(self, value):
        request = self.context.get('request')
        user = request.user if request else None
        if user and not user.is_manager:
            if value.counsellor_id != user.id:
                raise serializers.ValidationError("Access forbidden. You can only schedule follow-ups for your own assigned leads.")
        return value


class FollowUpCompleteSerializer(serializers.Serializer):
    """
    Serializer to complete a follow-up with mandatory outcome.
    Optionally schedules the next follow-up seamlessly.
    """
    outcome = serializers.ChoiceField(choices=FollowUpOutcome.choices, required=True)
    notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)
    next_followup_at = serializers.DateTimeField(required=False, allow_null=True)
    next_followup_type = serializers.ChoiceField(choices=FollowUpType.choices, required=False, default=FollowUpType.CALL)


class FollowUpCancelSerializer(serializers.Serializer):
    """
    Serializer to cancel a follow-up with mandatory reason.
    """
    reason = serializers.CharField(required=True, min_length=3, max_length=1000)


class FollowUpMissedSerializer(serializers.Serializer):
    """
    Serializer to flag a follow-up as missed.
    """
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)


class ActivityLogSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    activity_type_display = serializers.CharField(source='get_activity_type_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = [
            'id',
            'lead',
            'actor',
            'actor_name',
            'activity_type',
            'activity_type_display',
            'old_value',
            'new_value',
            'details',
            'created_at',
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.get_full_name() or obj.actor.username
        return 'System'
