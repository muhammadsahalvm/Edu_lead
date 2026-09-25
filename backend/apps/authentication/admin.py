from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_available_for_assignment', 'is_active', 'is_staff')
    list_filter = ('role', 'is_available_for_assignment', 'is_active', 'is_staff')
    search_fields = ('username', 'first_name', 'last_name', 'email', 'phone')
    ordering = ('username',)

    fieldsets = BaseUserAdmin.fieldsets + (
        (_('EduLead Role & Workflow Details'), {
            'fields': ('role', 'phone', 'is_available_for_assignment'),
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        (_('EduLead Role & Workflow Details'), {
            'fields': ('role', 'phone', 'is_available_for_assignment'),
        }),
    )
