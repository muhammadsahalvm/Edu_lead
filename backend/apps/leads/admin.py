from django.contrib import admin
from .models import Lead, FollowUp, ActivityLog, AssignmentState

class FollowUpInline(admin.TabularInline):
    model = FollowUp
    extra = 0
    fields = ('followup_type', 'scheduled_at', 'status', 'outcome', 'assigned_to', 'completed_at')
    readonly_fields = ('completed_at',)

class ActivityLogInline(admin.TabularInline):
    model = ActivityLog
    extra = 0
    can_delete = False
    readonly_fields = ('activity_type', 'actor', 'old_value', 'new_value', 'details', 'created_at')

    def has_add_permission(self, request, obj=None):
        return False

@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        'lead_number',
        'full_name',
        'phone',
        'email',
        'course',
        'source',
        'status',
        'priority',
        'counsellor',
        'ageing_display',
        'created_at',
    )
    list_filter = ('status', 'source', 'priority', 'counsellor', 'course', 'is_deleted')
    search_fields = ('lead_number', 'first_name', 'last_name', 'email', 'phone', 'city')
    readonly_fields = ('lead_number', 'created_at', 'updated_at', 'ageing_display', 'last_contacted_at', 'converted_at')
    inlines = [FollowUpInline, ActivityLogInline]
    ordering = ('-created_at',)

    @admin.display(description='Ageing')
    def ageing_display(self, obj):
        return f"{obj.ageing_category} ({obj.ageing_days}d)"

@admin.register(FollowUp)
class FollowUpAdmin(admin.ModelAdmin):
    list_display = ('lead', 'assigned_to', 'followup_type', 'scheduled_at', 'status', 'outcome', 'completed_at')
    list_filter = ('status', 'followup_type', 'outcome', 'assigned_to')
    search_fields = ('lead__lead_number', 'lead__first_name', 'lead__last_name', 'notes')
    ordering = ('-scheduled_at',)

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('lead', 'activity_type', 'actor', 'old_value', 'new_value', 'created_at')
    list_filter = ('activity_type', 'actor')
    search_fields = ('lead__lead_number', 'details')
    readonly_fields = ('lead', 'actor', 'activity_type', 'old_value', 'new_value', 'details', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

@admin.register(AssignmentState)
class AssignmentStateAdmin(admin.ModelAdmin):
    list_display = ('id', 'last_assigned_counsellor', 'updated_at')
