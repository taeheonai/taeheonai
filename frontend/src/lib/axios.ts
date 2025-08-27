import axios from 'axios';

// 기본 axios 인스턴스 생성
const api = axios.create({
  // Next.js 프록시를 통해 API 호출 (CORS 문제 해결)
  baseURL: '/api/gri',
  timeout: 10000,
  withCredentials: true, // 쿠키 인증이면 켜기 (서버 CORS도 allow_credentials=True)
});

// 응답은 JSON으로 받고 싶다
api.defaults.headers.common['Accept'] = 'application/json';

// 요청 인터셉터 (요청 전 처리)
api.interceptors.request.use(
  (config) => {
    // 🚨 동적 Content-Type 설정: 바디가 있는 메서드에서만 설정
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
    
    // 로딩 상태 관리 등을 위한 처리
    console.log('🚀 API 요청:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    console.error('❌ 요청 인터셉터 오류:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (응답 후 처리)
api.interceptors.response.use(
  (response) => {
    // 성공 응답 처리
    console.log('✅ API 응답:', response.status, response.config.url);
    return response;
  },
  (error) => {
    // 에러 응답 처리
    console.error('❌ API 응답 오류:', error.response?.status, error.config?.url);
    
    // 에러 메시지 표준화
    if (error.response?.data?.detail) {
      error.message = error.response.data.detail;
    } else if (error.response?.status === 404) {
      error.message = '요청한 리소스를 찾을 수 없습니다.';
    } else if (error.response?.status === 500) {
      error.message = '서버 내부 오류가 발생했습니다.';
    } else if (error.code === 'ECONNABORTED') {
      error.message = '요청 시간이 초과되었습니다.';
    } else if (!error.response) {
      error.message = '네트워크 연결을 확인해주세요.';
    }
    
    return Promise.reject(error);
  }
);

export default api;
