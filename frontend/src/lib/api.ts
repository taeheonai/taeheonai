import axios from 'axios';

// 환경별 API URL 자동 감지
const getApiBaseUrl = () => {
  // 1. 환경변수가 설정된 경우 우선 사용
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // 2. Vercel 환경 감지
  if (process.env.VERCEL === '1') {
    return 'https://taeheonai-production-2130.up.railway.app/api';
  }
  
  // 3. Railway 환경 감지
  if (process.env.RAILWAY === '1') {
    return 'https://taeheonai-production-2130.up.railway.app/api';
  }
  
  // 4. 로컬 개발 환경
  return 'http://localhost:8080/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
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
    console.log('🔍 환경변수 상태:');
    console.log('  - NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('  - VERCEL:', process.env.VERCEL);
    console.log('  - RAILWAY:', process.env.RAILWAY);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
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
  return api.post('/v1/auth/signup', payload);  // /api 제거 (baseURL에 이미 포함)
}

export async function postLoginPayload(payload: {
  auth_id: string;
  auth_pw: string;
}) {
  return api.post('/v1/auth/login', payload);  // /api 제거 (baseURL에 이미 포함)
}