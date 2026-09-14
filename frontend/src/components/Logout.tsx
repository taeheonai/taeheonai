'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';

interface LogoutProps {
  className?: string;
  variant?: 'button' | 'link';
}

export default function Logout({ className = '', variant = 'button' }: LogoutProps) {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clear);

  // 서버에 세션/토큰이 없어 로그인 상태는 전적으로 클라이언트에만 존재한다.
  const handleLogout = () => {
    clearAuth();
    localStorage.removeItem('user');
    sessionStorage.clear();
    router.push('/');
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleLogout}
        className={`text-gray-600 hover:text-red-600 transition-colors duration-200 ${className}`}
      >
        로그아웃
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 font-medium ${className}`}
    >
      로그아웃
    </button>
  );
}
