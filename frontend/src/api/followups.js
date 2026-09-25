import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

export const followupsService = {
  /**
   * Fetches paginated or filtered list of follow-up tasks.
   */
  async getFollowUps(params = {}) {
    const response = await apiClient.get(API_ENDPOINTS.FOLLOWUPS.LIST, { params });
    return response.data;
  },

  /**
   * Schedules a new follow-up interaction.
   */
  async createFollowUp(data) {
    const response = await apiClient.post(API_ENDPOINTS.FOLLOWUPS.LIST, data);
    return response.data;
  },

  /**
   * Marks a follow-up as completed with mandatory outcome and optional notes.
   */
  async completeFollowUp(id, data) {
    const response = await apiClient.post(API_ENDPOINTS.FOLLOWUPS.COMPLETE(id), data);
    return response.data;
  },

  /**
   * Flags a scheduled follow-up as missed.
   */
  async markMissed(id, data = {}) {
    const response = await apiClient.post(API_ENDPOINTS.FOLLOWUPS.MISSED(id), data);
    return response.data;
  },

  /**
   * Cancels a scheduled follow-up with mandatory reason.
   */
  async cancelFollowUp(id, data) {
    const response = await apiClient.post(API_ENDPOINTS.FOLLOWUPS.CANCEL(id), data);
    return response.data;
  },

  /**
   * Reschedules an existing follow-up date/time.
   */
  async rescheduleFollowUp(id, data) {
    const response = await apiClient.patch(API_ENDPOINTS.FOLLOWUPS.DETAIL(id), data);
    return response.data;
  },

  /**
   * Quick list of overdue follow-ups.
   */
  async getOverdue() {
    const response = await apiClient.get(API_ENDPOINTS.FOLLOWUPS.OVERDUE);
    return response.data;
  },

  /**
   * Quick list of upcoming follow-ups.
   */
  async getUpcoming() {
    const response = await apiClient.get(API_ENDPOINTS.FOLLOWUPS.UPCOMING);
    return response.data;
  },
};
