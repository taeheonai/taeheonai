import axios from 'axios';

// 요청 인터셉터: X-Request-ID 추가
axios.interceptors.request.use((config) => {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  if (config.headers) {
    config.headers.set('X-Request-ID', id);
  }
  return config;
});

// 응답 인터셉터: 에러 로깅
axios.interceptors.response.use(
  response => response,
  (error) => {
    const { config, response } = error;
    console.groupCollapsed(
      `❌ API ${response?.status || ''} ${config?.method?.toUpperCase()} ${config?.url || ''}`
    );
    console.log('request headers', config?.headers);
    console.log('request payload', (() => {
      try {
        return JSON.parse(config?.data as any);
      } catch {
        return config?.data;
      }
    })());
    console.log('response headers', response?.headers);
    console.log('response data', response?.data);
    console.groupEnd();
    return Promise.reject(error);
  }
);

export default axios;