'use client';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';
import { useHasHydrated } from '@/store/useHasHydrated';
import { useAuthStore } from '@/store/useAuthStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const hydrated = useHasHydrated();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!hydrated) return;               // 수화 전에는 판단하지 않음
    
    // 인증 상태나 사용자 정보가 없으면 로그인 페이지로
    if (!isAuthenticated || !user) {
      router.replace('/auth/login');
    }
  }, [hydrated, isAuthenticated, user, router]);

  // 수화되지 않았거나 인증되지 않았으면 아무것도 표시하지 않음
  if (!hydrated || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return <>{children}</>;
}