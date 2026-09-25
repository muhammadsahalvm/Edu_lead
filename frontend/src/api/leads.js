import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

export const leadsService = {
  /**
   * Fetches paginated list of leads with multi-criteria filtering and sorting.
   */
  async getLeads(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.LEADS.LIST, { params });
    return response.data;
  },

  /**
   * Fetches full lead detail by ID.
   */
  async getLead(id) {
    const response = await apiClient.get(API_ENDPOINTS.LEADS.DETAIL(id));
    return response.data;
  },

  /**
   * Creates a new admission lead.
   */
  async createLead(data) {
    const response = await apiClient.post(API_ENDPOINTS.LEADS.LIST, data);
    return response.data;
  },

  /**
   * Updates lead profile coordinates (partial or full).
   */
  async updateLead(id, data) {
    const response = await apiClient.patch(API_ENDPOINTS.LEADS.DETAIL(id), data);
    return response.data;
  },

  /**
   * Controlled state-machine status transition.
   */
  async updateLeadStatus(id, data) {
    const response = await apiClient.post(API_ENDPOINTS.LEADS.STATUS(id), data);
    return response.data;
  },

  /**
   * Manager-only action: Reassign lead to a new counsellor.
   */
  async reassignLead(id, data) {
    const response = await apiClient.post(API_ENDPOINTS.LEADS.REASSIGN(id), data);
    return response.data;
  },

  /**
   * Fetches chronological activity audit log for a lead.
   */
  async getLeadTimeline(id) {
    const response = await apiClient.get(API_ENDPOINTS.LEADS.TIMELINE(id));
    return response.data;
  },

  /**
   * Fetches follow-ups scheduled for this lead.
   */
  async getLeadFollowups(id) {
    const response = await apiClient.get(`${API_ENDPOINTS.FOLLOWUPS.LIST}?lead=${id}`);
    return response.data;
  },

  /**
   * Schedules a new follow-up interaction.
   */
  async scheduleFollowup(data) {
    const response = await apiClient.post(API_ENDPOINTS.FOLLOWUPS.LIST, data);
    return response.data;
  },

  /**
   * Real-time duplicate enquiry check.
   */
  async checkDuplicate(params) {
    const response = await apiClient.get('/api/v1/leads/check-duplicate/', { params });
    return response.data;
  },

  /**
   * Fetches active courses for preference selectors.
   */
  async getCourses() {
    const response = await apiClient.get(API_ENDPOINTS.COURSES.LIST);
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },

  /**
   * Fetches active counsellors for assignment dropdowns.
   */
  async getCounsellors() {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.COUNSELLORS);
    const data = response.data;
    return Array.isArray(data) ? data : data.results || [];
  },
};
