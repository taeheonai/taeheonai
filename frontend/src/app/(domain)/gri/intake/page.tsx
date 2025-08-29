import dynamic from 'next/dynamic';

// named export를 사용하는 컴포넌트를 dynamic import
const PolishResult = dynamic(
  () => import('@/components/PolishResult').then(m => m.PolishResult),
  { ssr: false }
);

export default function Page({
  searchParams,
}: {
  searchParams: { gri?: string; session?: string }
}) {
  const griIndex = searchParams?.gri ?? '302-3';
  const sessionKey = searchParams?.session ?? '';

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">GRI Intake</h1>
      <PolishResult 
        sessionKey={sessionKey} 
        griIndex={griIndex}
        showSaveHint={true}
      />
    </main>
  );
}

