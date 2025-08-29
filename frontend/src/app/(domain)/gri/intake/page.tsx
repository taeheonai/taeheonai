// app/(domain)/gri/intake/page.tsx
import { PolishResult } from '@/components/PolishResult';

export default function Page({
  searchParams,
}: {
  searchParams?: { gri?: string; session?: string };
}) {
  const griIndex = searchParams?.gri ?? '302-3';
  const sessionKey = searchParams?.session ?? '';

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">GRI 윤문 결과</h1>
      <PolishResult sessionKey={sessionKey} griIndex={griIndex} />
    </main>
  );
}