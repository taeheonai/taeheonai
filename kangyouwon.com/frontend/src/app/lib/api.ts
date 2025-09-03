import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API__URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(async (config) => {
  // 토큰이 필요한 경우 여기에 추가
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // 401 에러 처리가 필요한 경우 여기에 추가
    }
    return Promise.reject(error);
  }
);

export default api;
