'use client';

import { useState, useEffect } from 'react';

export default function PWAStatus() {
  const [isPWA, setIsPWA] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // PWA 환경인지 확인
    const checkPWAStatus = () => {
      // standalone 모드로 실행 중인지 확인
      const standalone = window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);
      
      // PWA 기능 지원 여부 확인
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasPushManager = 'PushManager' in window;
      setIsPWA(hasServiceWorker && hasPushManager);
    };

    // 온라인/오프라인 상태 확인
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // 초기 상태 확인
    checkPWAStatus();
    setIsOnline(navigator.onLine);

    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isPWA && !isStandalone) return null;

  return (
    <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-40">
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {isStandalone ? '📱 PWA' : '🌐 웹앱'}
        </span>
        <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
          {isOnline ? '온라인' : '오프라인'}
        </span>
      </div>
    </div>
  );
}
