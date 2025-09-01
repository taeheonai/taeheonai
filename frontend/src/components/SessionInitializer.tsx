'use client';

import { useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';

export default function SessionInitializer() {
  const ensureSession = useSessionStore((s) => s.ensureSession);

  useEffect(() => {
    ensureSession();
  }, [ensureSession]);

  return null;
}
