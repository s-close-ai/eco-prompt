import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1',
  withCredentials: true,
  timeout: 600000, // 10분
  headers: {
    'Content-Type': 'application/json',
  },
});
