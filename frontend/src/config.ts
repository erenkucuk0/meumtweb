const env = import.meta.env;

const defaultConfig = {
  apiUrl: '/api',
  apiTimeout: 30000,
  development: {
    apiLogging: true,
    mockData: false
  }
};

const productionConfig = {
  apiUrl: env.VITE_API_URL || 'https://api.meumt.com',
  apiTimeout: 30000,
  development: {
    apiLogging: false,
    mockData: false
  }
};

export const DEFAULT_IMAGE = '/images/default.jpg';

export const CONFIG = {
  API_URL: import.meta.env.VITE_API_URL || '/api',
  DEBUG: import.meta.env.MODE === 'development',
  defaultImage: '/images/default-avatar.jpg',
  tokenRefreshInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  apiTimeout: 10000 // 10 seconds
};

export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const SOCKET_URL = '/socket'; 