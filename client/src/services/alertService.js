import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance for alerts
const alertAPI = axios.create({
  baseURL: `${API_BASE_URL}/alerts`,
  timeout: 15000,
});

// Add auth token to requests
alertAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
alertAPI.interceptors.response.use(
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
 * Alert Service for managing stock alerts
 */
class AlertService {
  /**
   * Get all user alerts with pagination
   * @param {Object} params - Query parameters
   * @returns {Promise} Alert list with pagination
   */
  static async getAlerts(params = {}) {
    try {
      const response = await alertAPI.get('/', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get a specific alert by ID
   * @param {string} alertId - Alert ID
   * @returns {Promise} Alert data
   */
  static async getAlert(alertId) {
    try {
      const response = await alertAPI.get(`/${alertId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new alert
   * @param {Object} alertData - Alert data
   * @returns {Promise} Created alert
   */
  static async createAlert(alertData) {
    try {
      const response = await alertAPI.post('/', alertData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing alert
   * @param {string} alertId - Alert ID
   * @param {Object} alertData - Updated alert data
   * @returns {Promise} Updated alert
   */
  static async updateAlert(alertId, alertData) {
    try {
      const response = await alertAPI.put(`/${alertId}`, alertData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Toggle alert active/inactive status
   * @param {string} alertId - Alert ID
   * @returns {Promise} Updated alert
   */
  static async toggleAlert(alertId) {
    try {
      const response = await alertAPI.patch(`/${alertId}/toggle`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete an alert
   * @param {string} alertId - Alert ID
   * @returns {Promise} Success message
   */
  static async deleteAlert(alertId) {
    try {
      const response = await alertAPI.delete(`/${alertId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Test an alert manually
   * @param {string} alertId - Alert ID
   * @returns {Promise} Test result
   */
  static async testAlert(alertId) {
    try {
      const response = await alertAPI.post(`/${alertId}/test`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get alert statistics
   * @returns {Promise} Alert statistics
   */
  static async getAlertStats() {
    try {
      const response = await alertAPI.get('/stats');
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

export default AlertService;
