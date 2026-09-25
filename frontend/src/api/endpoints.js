/**
 * Centralized API endpoints for EduLead backend.
 */
export const API_ENDPOINTS = {
  AUTH: {
    TOKEN: '/api/v1/auth/token/',
    REFRESH: '/api/v1/auth/token/refresh/',
    ME: '/api/v1/auth/me/',
    COUNSELLORS: '/api/v1/auth/counsellors/',
  },
  COURSES: {
    LIST: '/api/v1/courses/',
    DETAIL: (id) => `/api/v1/courses/${id}/`,
  },
  LEADS: {
    LIST: '/api/v1/leads/',
    DETAIL: (id) => `/api/v1/leads/${id}/`,
    STATUS: (id) => `/api/v1/leads/${id}/transition-status/`,
    REASSIGN: (id) => `/api/v1/leads/${id}/reassign/`,
    TIMELINE: (id) => `/api/v1/leads/${id}/timeline/`,
    FOLLOWUPS: (id) => `/api/v1/leads/${id}/followups/`,
  },
  FOLLOWUPS: {
    LIST: '/api/v1/leads/follow-ups/',
    DETAIL: (id) => `/api/v1/leads/follow-ups/${id}/`,
    COMPLETE: (id) => `/api/v1/leads/follow-ups/${id}/complete/`,
    CANCEL: (id) => `/api/v1/leads/follow-ups/${id}/cancel/`,
    MISSED: (id) => `/api/v1/leads/follow-ups/${id}/mark-missed/`,
    UPCOMING: '/api/v1/leads/follow-ups/upcoming/',
    OVERDUE: '/api/v1/leads/follow-ups/overdue/',
  },
  ANALYTICS: {
    DASHBOARD: '/api/v1/analytics/dashboard/',
    SUMMARY: '/api/v1/analytics/summary/',
    FUNNEL: '/api/v1/analytics/funnel/',
    SOURCES: '/api/v1/analytics/sources/',
    COURSES: '/api/v1/analytics/courses/',
    COUNSELLOR_WORKLOAD: '/api/v1/analytics/counsellor-workload/',
    AGEING: '/api/v1/analytics/ageing/',
  },
};
