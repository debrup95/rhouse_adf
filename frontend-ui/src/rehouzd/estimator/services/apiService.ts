import config from '../../../config';

export const API_BASE_URL = config.apiUrl;

/**
 * API Service for making HTTP requests to the backend
 */
class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Make a GET request
   */
  async get(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  }

  /**
   * Make a POST request
   */
  async post(endpoint: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a PUT request
   */
  async put(endpoint: string, data?: any, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  /**
   * Make a DELETE request
   */
  async delete(endpoint: string, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
  }

  /**
   * Upload files using FormData
   */
  async uploadFiles(endpoint: string, formData: FormData, options: RequestInit = {}): Promise<Response> {
    return fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      body: formData,
      ...options,
      // Don't set Content-Type header for FormData, let browser set it with boundary
    });
  }
}

const apiService = new ApiService();
export default apiService; 