import axios from 'axios';

// 환경별 API URL 자동 감지
const getApiBaseUrl = () => {
  console.log('🔍 === getApiBaseUrl() 호출 ===');
  console.log('🔍 process.env.NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  console.log('🔍 process.env.VERCEL:', process.env.VERCEL);
  console.log('🔍 process.env.NODE_ENV:', process.env.NODE_ENV);
  console.log('🔍 window.location.hostname:', typeof window !== 'undefined' ? window.location.hostname : 'SSR');
  
  // 🚨 Vercel 환경에서는 무조건 Gateway URL 사용 (환경변수 완전 무시)
  if (process.env.VERCEL === '1' || process.env.VERCEL === 'true') {
    console.log('🔍 Vercel 환경 감지, Gateway URL 강제 사용');
    console.log('🔍 환경변수 완전 무시하고 Gateway로 요청');
    return 'https://taeheonai-production-2130.up.railway.app/api';
  }
  
  // 🚨 도메인 기반 환경 감지 (Vercel 환경변수가 제대로 설정되지 않은 경우)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'taeheonai.com' || hostname === 'www.taeheonai.com' || hostname.endsWith('.vercel.app')) {
      console.log('🔍 도메인 기반 Vercel 환경 감지:', hostname);
      console.log('🔍 Gateway URL 강제 사용');
      console.log('🔍 환경변수 무시하고 Gateway로 요청');
      return 'https://taeheonai-production-2130.up.railway.app/api';
    }
  }
  
  // 🚨 Railway 환경 감지
  if (process.env.RAILWAY === '1') {
    return 'https://taeheonai-production-2130.up.railway.app/api';
  }
  
  // 1. 환경변수가 설정된 경우 (Vercel이 아닌 환경에서만)
  // 🚨 Vercel 환경에서는 환경변수 완전 무시
  if (process.env.VERCEL !== '1' && process.env.VERCEL !== 'true' && process.env.NEXT_PUBLIC_API_URL) {
    console.log('🔍 환경변수 감지됨 (Vercel이 아님):', process.env.NEXT_PUBLIC_API_URL);
    // 환경변수 값 검증 및 수정
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // 🚨 HTTP URL 감지 시 HTTPS로 강제 변환
    if (envUrl.startsWith('http://')) {
      console.warn('⚠️ HTTP 환경변수 감지, HTTPS로 강제 변환');
      const httpsUrl = envUrl.replace('http://', 'https://');
      console.warn('⚠️ 원래 값:', envUrl);
      console.warn('⚠️ 수정된 값:', httpsUrl);
      return httpsUrl;
    }
    
    if (envUrl.includes('disciplined-imagination-production-df5c.up.railway.app')) {
      console.warn('⚠️ 잘못된 환경변수 감지, Gateway URL로 수정');
      console.warn('⚠️ 원래 값:', envUrl);
      console.warn('⚠️ 수정된 값:', 'https://taeheonai-production-2130.up.railway.app/api');
      return 'https://taeheonai-production-2130.up.railway.app/api';
    }
    console.log('🔍 환경변수 사용:', envUrl);
    return envUrl;
  }
  
  // 2. Railway 환경 감지
  if (process.env.RAILWAY === '1') {
    return 'https://taeheonai-production-2130.up.railway.app/api';
  }
  
  // 3. 로컬 개발 환경
  console.log('🔍 로컬 개발 환경으로 판단, localhost:8080 사용');
  // 🚨 HTTP 대신 HTTPS 사용 (Mixed Content 방지)
  return 'https://localhost:8080/api';
};

// axios 인스턴스를 동적으로 생성하는 함수
const createApiInstance = () => {
  return axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

// 기본 api 인스턴스
let api = createApiInstance();

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
    console.log('🔍 URL 구성 분석:');
    console.log('  - baseURL:', config.baseURL);
    console.log('  - url:', config.url);
    console.log('  - 최종 URL:', `${config.baseURL}${config.url}`);
    
    // 🚨 URL 프로토콜 상세 분석
    if (config.baseURL) {
      console.log('🔍 baseURL 프로토콜 분석:');
      console.log('  - 원본:', config.baseURL);
      console.log('  - 프로토콜:', new URL(config.baseURL).protocol);
      console.log('  - startsWith https:', config.baseURL.startsWith('https://'));
      console.log('  - startsWith http:', config.baseURL.startsWith('http://'));
      console.log('  - includes http://:', config.baseURL.includes('http://'));
    }
    
    if (config.url) {
      console.log('🔍 url 프로토콜 분석:');
      console.log('  - 원본:', config.url);
      console.log('  - startsWith https:', config.url.startsWith('https://'));
      console.log('  - startsWith http:', config.url.startsWith('http://'));
      console.log('  - includes http://:', config.url.includes('http://'));
    }
    
    // 🚨 잘못된 URL 감지 시 경고
    if (config.baseURL && config.baseURL.includes('disciplined-imagination-production-d5c.up.railway.app')) {
      console.error('❌ 잘못된 API URL 감지! Auth Service로 직접 요청 중');
      console.error('❌ 올바른 URL:', 'https://taeheonai-production-2130.up.railway.app/api');
    }
    
    // 🚨 HTTP URL 감지 시 HTTPS로 강제 수정
    if (config.baseURL && config.baseURL.startsWith('http://')) {
      console.error('🚨 HTTP URL 감지! HTTPS로 강제 수정');
      config.baseURL = config.baseURL.replace('http://', 'https://');
      console.log('✅ 수정된 baseURL:', config.baseURL);
      console.log('✅ 수정된 최종 URL:', `${config.baseURL}${config.url}`);
    }
    
    // 🚨 Vercel 환경에서 잘못된 URL 사용 시 강제 수정
    if (process.env.VERCEL === '1' && config.baseURL && config.baseURL.includes('disciplined-imagination-production-df5c.up.railway.app')) {
      console.error('🚨 Vercel에서 잘못된 URL 감지! 즉시 수정');
      config.baseURL = 'https://taeheonai-production-2130.up.railway.app/api';
      console.log('✅ 수정된 baseURL:', config.baseURL);
      console.log('✅ 수정된 최종 URL:', `${config.baseURL}${config.url}`);
    }
    
    // 🚨 최종 URL이 Gateway를 거치는지 확인
    if (config.baseURL && config.baseURL.includes('taeheonai-production-2130.up.railway.app')) {
      console.log('✅ Gateway를 통한 요청 확인됨');
    } else if (config.baseURL && config.baseURL.includes('disciplined-imagination-production-df5c.up.railway.app')) {
      console.error('❌ Auth Service로 직접 요청 중! Gateway를 거쳐야 함');
    }
    
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

// 강력한 HTTPS 강제 적용 인터셉터
api.interceptors.request.use(
  (config) => {
    // 🚨 모든 HTTP URL을 HTTPS로 강제 변환
    if (config.url && config.url.startsWith('http://')) {
      console.warn(`🚨 HTTP URL 감지! 강제 변환: ${config.url}`);
      config.url = config.url.replace('http://', 'https://');
      console.log(`✅ HTTPS로 변환됨: ${config.url}`);
    }
    
    // 🚨 baseURL도 HTTPS 강제 적용
    if (config.baseURL && config.baseURL.startsWith('http://')) {
      console.warn(`🚨 HTTP baseURL 감지! 강제 변환: ${config.baseURL}`);
      config.baseURL = config.baseURL.replace('http://', 'https://');
      console.log(`✅ baseURL HTTPS로 변환됨: ${config.baseURL}`);
    }
    
    // 🚨 최종 URL 검증
    const finalUrl = config.url || config.baseURL;
    if (finalUrl && !finalUrl.startsWith('https://')) {
      console.error(`❌ 최종 URL이 여전히 안전하지 않음: ${finalUrl}`);
      throw new Error(`보안상 HTTPS가 필요합니다: ${finalUrl}`);
    }
    
    return config;
  },
  (error) => {
    console.error('🚨 HTTPS 강제 적용 중 오류:', error);
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

// 동적으로 새로운 인스턴스 생성 함수 export
export const refreshApiInstance = () => {
  api = createApiInstance();
  return api;
}; 

// ===== Helpers for gateway auth logging =====
export async function postSignupPayload(payload: {
  corporation_id?: number | null;
  industry?: string | null;
  email?: string | null;
  name?: string | null;
  birth?: string | null;
  auth_id: string;
  auth_pw: string;
}) {
  return api.post('/v1/auth/signup', payload);  // Gateway를 통한 요청
}

export async function postLoginPayload(payload: {
  auth_id: string;
  auth_pw: string;
}) {
  return api.post('/v1/auth/login', payload);  // Gateway를 통한 요청
}