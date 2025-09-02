'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { GRIApiService, type GRIReportStructure, type SavedAnswers } from '@/lib/griApi';
import { PolishResult } from '@/components/PolishResult';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/useAuthStore';

export default function GriReportPage() {
  const { user } = useAuthStore();
  const corpId = Number(user?.corporation_id);
  const { sessionKey, ensureSession } = useSessionStore();

  const [structure, setStructure] = useState<GRIReportStructure | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswers>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 세션 보장(폴리시 컴포넌트가 세션키 필요하면)
  useEffect(() => {
    ensureSession?.();
  }, [ensureSession]);

  // 최초 로드: 구조 + 저장된 답변
  useEffect(() => {
    if (!corpId) return;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const s = await GRIApiService.fetchReportStructure(corpId);
        setStructure(s);

        // answers는 선택적. 실패해도 구조는 보여주자.
        try {
          const a = await GRIApiService.fetchReportAnswers(corpId);
          setSavedAnswers(a || {});
        } catch {
          setSavedAnswers({});
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'GRI 데이터를 불러오지 못했습니다.';
        setErr(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, [corpId]);



  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">GRI 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (err) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-3xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold text-red-600">로드 실패</h1>
            <p className="mt-2 text-gray-700">{err}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!structure) {
    return null;
  }

  // 화면 카드: 섹션 → 아이템 → 문항
  const renderSection = (title: string, items: Array<GRIReportStructure['environmental'][number]>) => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {items.map(item => {
        const idx = item.index_no;
        const saved = savedAnswers[idx] || {}; // { [question_id]: { ... } }

        return (
          <div key={idx} className="bg-white rounded-lg shadow">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {idx} · {item.title}
                </h3>
              </div>

              <div className="mt-4 space-y-4">
                {item.questions.map((qa) => {
                  // 우선순위: saved → item.polished_text → item.answer_text
                  const savedOne = (saved[qa.key_alpha || ''] || {}) as { polished_text?: string | null; answer_text?: string };
                  const polished = savedOne.polished_text;
                  const answer = polished || savedOne.answer_text || qa.question_text;

                                     return (
                     <div key={`${idx}_${qa.id}`} className="border rounded p-4">
                       <div className="text-sm text-gray-500 mb-1">Q{qa.id}</div>
                      {/* 폴리시 결과 위젯: 세션/인덱스가 있으면 표기 (선택) */}
                      {sessionKey ? (
                        <PolishResult sessionKey={sessionKey} griIndex={idx} />
                      ) : (
                        <p className="whitespace-pre-wrap text-gray-900">{answer || '—'}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">GRI Report</h1>
            <p className="mt-2 text-gray-600">
              {structure.companyname} (ID: {structure.corporation_id})
            </p>
          </header>

          {renderSection('Environmental', structure.environmental)}
          {renderSection('Social',        structure.social)}
          {renderSection('Governance',    structure.governance)}
        </div>
      </div>
    </ProtectedRoute>
  );
}