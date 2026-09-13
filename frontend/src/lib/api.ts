import axios from 'axios';

const PRODUCTION_GATEWAY_URL = 'https://taeheonai-production-2130.up.railway.app/api';
const LOCAL_GATEWAY_URL = 'http://localhost:8080/api';

// 환경별 API URL 자동 감지
export const getApiBaseUrl = () => {
  // 1. 환경변수가 명시적으로 설정된 경우 최우선
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 2. 프로덕션 도메인(taeheonai.com, *.vercel.app)에서는 운영 Gateway 사용
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'taeheonai.com' || hostname === 'www.taeheonai.com' || hostname.endsWith('.vercel.app')) {
      return PRODUCTION_GATEWAY_URL;
    }
  }

  // 3. Railway 배포 환경
  if (process.env.RAILWAY === '1') {
    return PRODUCTION_GATEWAY_URL;
  }

  // 4. 로컬 개발 환경 (기본값)
  return LOCAL_GATEWAY_URL;
};

// axios 인스턴스를 동적으로 생성하는 함수
const createApiInstance = () => {
  return axios.create({
    baseURL: getApiBaseUrl(),
    timeout: 30000, // 30초로 상향 (LLM 요청은 개별적으로 더 긴 타임아웃 설정)
    withCredentials: true, // 쿠키 인증이면 켜기 (서버 CORS도 allow_credentials=True)
  });
};

// 기본 api 인스턴스
let api = createApiInstance();

// 응답은 JSON으로 받고 싶다
api.defaults.headers.common['Accept'] = 'application/json';

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // 동적 Content-Type 설정: 바디가 있는 메서드에서만 설정
    const method = (config.method || 'get').toLowerCase();

    if (['post', 'put', 'patch'].includes(method)) {
      const isForm = typeof FormData !== 'undefined' && config.data instanceof FormData;
      if (!isForm && !config.headers?.['Content-Type']) {
        config.headers.set('Content-Type', 'application/json');
      }
    } else {
      // GET/DELETE/HEAD 등엔 굳이 Content-Type 넣지 않기 (프리플라이트 방지)
      if (config.headers && config.headers.has('Content-Type')) {
        config.headers.delete('Content-Type');
      }
    }

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

// ===== 기업 관련 API =====
export async function fetchCorporations(limit?: number) {
  // ✅ corporation 서비스로 요청
  // Gateway에서 corporation → corporation-service로 라우팅
  const params = limit ? `?limit=${limit}` : '?limit=3000';  // 기본값 3000개
  return api.get(`/v1/corporation${params}`);
}

export async function searchCorporations(query: string, limit: number = 20) {
  // ✅ 기업명으로 검색
  return api.get(`/v1/corporation/search?query=${encodeURIComponent(query)}&limit=${limit}`);
}

// ===== GRI 윤문 API =====
export async function polishGriAnswer(payload: {
  session_key: string;
  gri_index: string;
  answers: Array<{
    question_id: number;
    key_alpha: string;
    text: string;
  }>;
  
}) {
  return api.post('/v1/gri/polish', payload);  // Gateway를 통한 요청
}