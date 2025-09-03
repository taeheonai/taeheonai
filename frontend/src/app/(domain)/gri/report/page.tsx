'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { GRIApiService, type GRIReportStructure, type SavedAnswers } from '@/lib/griApi';
import { PolishResult } from '@/components/PolishResult';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useMGStore } from '@/store/mgStore';
import { useIntakeStore } from '@/store/intakeStore';
import { 
  integrateReportData, 
  getBestAnswer, 
  getDisplayText, 
  getSourceBadge,
  type IntegratedAnswers 
} from '@/lib/reportDataIntegrator';

export default function GriReportPage() {
  const { user } = useAuthStore();
  const corpId = Number(user?.corporation_id);
  const { sessionKey, ensureSession } = useSessionStore();

  // 로컬 스토리지 데이터
  const mgData = useMGStore((state) => ({ resultsByIndex: state.resultsByIndex }));
  const intakeData = useIntakeStore((state) => ({ savedItems: state.savedItems }));

  const [structure, setStructure] = useState<GRIReportStructure | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswers>({});
  const [integratedData, setIntegratedData] = useState<IntegratedAnswers>({});
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
        console.error('GRI 리포트 구조 조회 오류:', e);
        // 사용자 메시지
        const error = e as { response?: { data?: { detail?: string } }; message?: string };
        const detail = error?.response?.data?.detail || error?.message || '서버 오류';
        setErr(`구조 조회 실패: ${detail}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [corpId]);

  // 로컬 스토리지와 서버 데이터 통합
  useEffect(() => {
    if (mgData && intakeData) {
      const integrated = integrateReportData(mgData, intakeData, savedAnswers);
      setIntegratedData(integrated);
      
      // 디버깅: 통합된 데이터 구조 로깅
      console.log('=== Report 페이지 데이터 통합 결과 ===');
      console.log('MG 데이터:', mgData);
      console.log('Intake 데이터:', intakeData);
      console.log('서버 데이터:', savedAnswers);
      console.log('통합된 데이터:', integrated);
    }
  }, [mgData, intakeData, savedAnswers]);



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
                  const questionKey = qa.key_alpha || String(qa.id);
                  const bestAnswer = getBestAnswer(integratedData, idx, questionKey);
                  const displayText = getDisplayText(bestAnswer);
                  const sourceBadge = getSourceBadge(bestAnswer);

                  return (
                    <div key={`${idx}_${qa.id}`} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-sm text-gray-500">Q{qa.id}</div>
                        {sourceBadge && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            sourceBadge === 'MG' ? 'bg-blue-100 text-blue-800' :
                            sourceBadge === 'Intake' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {sourceBadge}
                          </span>
                        )}
                      </div>
                      
                      {/* 폴리시 결과 위젯: 세션/인덱스가 있으면 표기 (선택) */}
                      {sessionKey ? (
                        <PolishResult sessionKey={sessionKey} griIndex={idx} />
                      ) : (
                        <p className="whitespace-pre-wrap text-gray-900">{displayText}</p>
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

          {/* 데이터 소스별 섹션 구분 */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">데이터 소스별 구분</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                <span className="text-sm text-gray-700">
                  MG (Materiality→GRI): {Object.keys(integratedData).filter(idx => 
                    Object.values(integratedData[idx]).some(answer => answer.source === 'mg')
                  ).length}개 인덱스
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span className="text-sm text-gray-700">
                  GRI Intake: {Object.keys(integratedData).filter(idx => 
                    Object.values(integratedData[idx]).some(answer => answer.source === 'intake')
                  ).length}개 인덱스
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                <span className="text-sm text-gray-700">
                  Server (기존): {Object.keys(integratedData).filter(idx => 
                    Object.values(integratedData[idx]).some(answer => answer.source === 'server')
                  ).length}개 인덱스
                </span>
              </div>
            </div>
          </div>

          {renderSection('Environmental', structure.environmental)}
          {renderSection('Social',        structure.social)}
          {renderSection('Governance',    structure.governance)}
        </div>
      </div>
    </ProtectedRoute>
  );
}