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
        // 1단계: 서버에서 GRI 리포트 구조 조회 시도
        try {
          const s = await GRIApiService.fetchReportStructure(corpId);
          setStructure(s);
        } catch (structureError) {
          console.warn('GRI 리포트 구조 조회 실패, 로컬 데이터로 대체:', structureError);
          // 구조 조회 실패 시 기본 구조 생성 (로컬 데이터 기반)
          setStructure({
            corporation_id: corpId,
            companyname: user?.companyname || 'Unknown Company',
            environmental: [],
            social: [],
            governance: []
          });
        }

        // 2단계: 서버에서 저장된 답변 조회 시도 (선택적)
        try {
          const a = await GRIApiService.fetchReportAnswers(corpId);
          setSavedAnswers(a || {});
        } catch (answersError) {
          console.warn('저장된 답변 조회 실패, 로컬 데이터만 사용:', answersError);
          setSavedAnswers({});
        }
      } catch (e: unknown) {
        console.error('GRI 리포트 데이터 조회 오류:', e);
        // 사용자 메시지
        const error = e as { response?: { data?: { detail?: string } }; message?: string };
        const detail = error?.response?.data?.detail || error?.message || '서버 오류';
        
        // 로컬 데이터가 있으면 에러를 표시하지 않고 계속 진행
        if (mgData && Object.keys(mgData.resultsByIndex).length > 0) {
          console.log('서버 오류 발생했지만 로컬 데이터가 있어 계속 진행');
          setErr(null);
        } else {
          setErr(`데이터 조회 실패: ${detail}`);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [corpId, user?.companyname, mgData]);

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
    // 구조가 없어도 로컬 데이터가 있으면 계속 진행
    if (mgData && Object.keys(mgData.resultsByIndex).length > 0) {
      console.log('서버 구조 없지만 로컬 데이터가 있어 계속 진행');
      // 기본 구조 생성하여 계속 진행
      const fallbackStructure = {
        corporation_id: corpId,
        companyname: user?.companyname || 'Unknown Company',
        environmental: [],
        social: [],
        governance: []
      };
      setStructure(fallbackStructure);
      return null; // 다음 렌더링에서 구조가 설정됨
    } else {
      return null;
    }
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
            
            {/* 데이터 동기화 상태 표시 */}
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-blue-600">ℹ️</span>
                <span className="text-sm text-blue-800">
                  <strong>데이터 우선순위:</strong> 로컬 데이터 (MG/Intake) → 서버 데이터
                </span>
              </div>
              <div className="mt-2 text-xs text-blue-700">
                서버 데이터가 없어도 로컬에 저장된 윤문 결과를 표시합니다.
              </div>
            </div>
            
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

          {/* 서버 구조가 있을 때: 기존 섹션 렌더링 */}
          {structure.environmental.length > 0 && renderSection('Environmental', structure.environmental)}
          {structure.social.length > 0 && renderSection('Social', structure.social)}
          {structure.governance.length > 0 && renderSection('Governance', structure.governance)}
          
          {/* 서버 구조가 없을 때: 로컬 데이터만 표시 */}
          {structure.environmental.length === 0 && structure.social.length === 0 && structure.governance.length === 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">로컬 저장 데이터</h2>
              <div className="text-sm text-gray-600 mb-4">
                서버 구조 정보가 없어 로컬에 저장된 데이터만 표시합니다.
              </div>
              
              {/* 로컬 데이터 요약 표시 */}
              <div className="space-y-4">
                {Object.entries(integratedData).map(([griIndex, indexData]) => (
                  <div key={griIndex} className="border rounded p-4">
                    <h3 className="font-medium text-gray-900 mb-2">GRI {griIndex}</h3>
                    <div className="space-y-2">
                      {Object.entries(indexData).map(([questionKey, answer]) => (
                        <div key={questionKey} className="text-sm">
                          <span className="font-medium text-gray-700">Q{questionKey}:</span>
                          <span className="ml-2 text-gray-600">{getDisplayText(answer)}</span>
                          <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                            answer.source === 'mg' ? 'bg-blue-100 text-blue-800' :
                            answer.source === 'intake' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getSourceBadge(answer)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}