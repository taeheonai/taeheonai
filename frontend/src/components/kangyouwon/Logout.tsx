'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface LogoutProps {
  className?: string;
  variant?: 'button' | 'link';
}

export default function Logout({ className = '', variant = 'button' }: LogoutProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // 로그아웃 API 호출
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        // 로컬 스토리지 정리
        localStorage.removeItem('user');
        sessionStorage.clear();
        
        // 쿠키 정리 (필요한 경우)
        document.cookie.split(";").forEach((c) => {
          document.cookie = c
            .replace(/^ +/, "")
            .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });

        // 홈페이지로 리다이렉트
        router.push('/');
      } else {
        console.error('로그아웃 실패');
        // 강제로 홈페이지로 이동
        router.push('/');
      }
    } catch (error) {
      console.error('로그아웃 중 오류:', error);
      // 오류가 발생해도 홈페이지로 이동
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className={`text-gray-600 hover:text-red-600 transition-colors duration-200 ${className}`}
      >
        {isLoading ? '로그아웃 중...' : '로그아웃'}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={`px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg transition-colors duration-200 font-medium ${className}`}
    >
      {isLoading ? '로그아웃 중...' : '로그아웃'}
    </button>
  );
}
