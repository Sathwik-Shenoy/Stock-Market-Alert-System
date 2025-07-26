import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance for admin operations
const adminAPI = axios.create({
  baseURL: `${API_BASE_URL}/admin`,
  timeout: 15000,
});

// Add auth token to requests
adminAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Admin Service for alert monitoring and management
 */
class AdminService {
  /**
   * Get alert monitor status
   * @returns {Promise} Monitor status data
   */
  static async getMonitorStatus() {
    try {
      const response = await adminAPI.get('/alert-monitor/status');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check alert monitor (GET)
   * @returns {Promise} Monitor check result
   */
  static async checkMonitor() {
    try {
      const response = await adminAPI.get('/alert-monitor/check');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Manually trigger alert check
   * @param {string} alertId - Optional specific alert ID
   * @returns {Promise} Check result
   */
  static async triggerAlertCheck(alertId = null) {
    try {
      const data = alertId ? { alertId } : {};
      const response = await adminAPI.post('/alert-monitor/check', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle API errors
   * @param {Error} error - Axios error
   * @returns {Error} Formatted error
   */
  static handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.data?.error || 'Request failed';
      const status = error.response.status;
      
      const formattedError = new Error(message);
      formattedError.status = status;
      formattedError.data = error.response.data;
      
      return formattedError;
    } else if (error.request) {
      // Request made but no response received
      return new Error('Network error - please check your connection');
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

export default AdminService;
