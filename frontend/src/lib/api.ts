import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // 디버깅 로깅 추가
    console.log('🚀 === API 요청 시작 ===');
    console.log('📋 Method:', config.method?.toUpperCase());
    console.log('🔗 URL:', config.url);
    console.log('🌐 Base URL:', config.baseURL);
    console.log('🎯 Full URL:', `${config.baseURL}${config.url}`);
    console.log('📦 Data:', config.data);
    console.log('🔑 Headers:', config.headers);
    console.log('🚀 === API 요청 끝 ===');
    
    // Add auth token if available
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('❌ API 요청 인터셉터 오류:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

export default api; 

// ===== Helpers for gateway auth logging =====
export async function postSignupPayload(payload: {
  company_id?: string | null;
  industry?: string | null;
  email?: string | null;
  name?: string | null;
  age?: string | null;
  auth_id: string;
  auth_pw: string;
}) {
  return api.post('/api/v1/auth/signup', payload);
}

export async function postLoginPayload(payload: {
  auth_id: string;
  auth_pw: string;
}) {
  return api.post('/api/v1/auth/login', payload);
}