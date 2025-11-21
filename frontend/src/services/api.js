import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Response received:`, response.data);
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error);
    
    if (error.response) {
      // Server responded with error status
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// API methods
export const menuAPI = {
  // Get all menu items
  getAll: () => api.get('/menu'),
  
  // Get all categories
  getCategories: () => api.get('/menu/categories'),
  
  // Get menu by category
  getByCategory: (categoryId) => api.get(`/menu/category/${categoryId}`),
  
  // Create new menu item
  create: (data) => api.post('/menu', data),
  
  // Update menu item
  update: (id, data) => api.put(`/menu/${id}`, data),
  
  // Delete menu item
  delete: (id) => api.delete(`/menu/${id}`),
};

export const ordersAPI = {
  // Get all orders
  getAll: () => api.get('/orders'),
  
  // Create new order
  create: (data) => api.post('/orders', data),
  
  // Update order status
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  
  // Get order by ID
  getById: (id) => api.get(`/orders/${id}`),
};

export const dashboardAPI = {
  // Get dashboard statistics
  getStats: () => api.get('/dashboard/stats'),
};

// Health check
export const healthCheck = () => api.get('/health');

export default api;