import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('pulsevote_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Response interceptor to catch backend error payloads cleanly
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.data) {
      return Promise.resolve(error.response);
    }
    return Promise.reject(error);
  }
);

// Helper to get cookie value by name
const getCookie = (name: string): string | null => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
};

// Helper to set cookie
const setCookie = (name: string, value: string, days = 365) => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${date.toUTCString()};path=/;SameSite=Lax`;
};

// Cryptographically random voter UUID stored in Cookie + LocalStorage fallback
export const getVoterIdentifier = (): string => {
  let voterId = getCookie('pulsevote_voter_id') || localStorage.getItem('pulsevote_voter_id');

  if (!voterId) {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      voterId = 'voter_' + crypto.randomUUID();
    } else {
      voterId = 'voter_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    setCookie('pulsevote_voter_id', voterId);
    localStorage.setItem('pulsevote_voter_id', voterId);
  }

  return voterId;
};
