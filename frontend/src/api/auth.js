import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';

export const authService = {
  /**
   * Authenticates user and returns access token, refresh token, and user profile.
   */
  async login(username, password) {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.TOKEN, {
      username,
      password,
    });
    return response.data;
  },

  /**
   * Fetches fresh profile data for authenticated user.
   */
  async getCurrentUser() {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  /**
   * Updates current user profile details (e.g. availability).
   */
  async updateProfile(data) {
    const response = await apiClient.patch(API_ENDPOINTS.AUTH.ME, data);
    return response.data;
  },

  /**
   * Fetches list of active counsellors (for assignment dropdowns).
   */
  async getCounsellors() {
    const response = await apiClient.get(API_ENDPOINTS.AUTH.COUNSELLORS);
    return response.data;
  },
};
