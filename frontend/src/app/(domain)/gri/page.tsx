'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthStore } from '@/store/useAuthStore';

export default function GriPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  // GRI Intake 페이지로 자동 리다이렉트
  useEffect(() => {
    router.push('/gri/intake');
  }, [router]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">GRI 페이지로 이동 중...</p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
