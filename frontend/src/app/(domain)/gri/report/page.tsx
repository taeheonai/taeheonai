'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { type GRIReportStructure, type SavedAnswers } from '@/lib/griApi';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useMGStore } from '@/store/mgStore';
import { useIntakeStore } from '@/store/intakeStore';
import { 
  integrateReportData, 
  getDisplayText, 
  getSourceBadge,
  type IntegratedAnswers 
} from '@/lib/reportDataIntegrator';

// 안전한 데이터 표시 컴포넌트
function SafeDataDisplay({ integratedData }: { integratedData: IntegratedAnswers }) {
  try {
    // 데이터가 없으면 빈 화면 표시
    if (!integratedData || typeof integratedData !== 'object' || Object.keys(integratedData).length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">로컬에 저장된 윤문 데이터가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">MG 페이지에서 윤문을 진행해보세요.</p>
        </div>
      );
    }

    // 데이터가 있으면 안전하게 렌더링
    const dataKeys = Object.keys(integratedData);
    console.log('🔍 SafeDataDisplay 렌더링 시작:', dataKeys);
    
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">로컬 저장 데이터</h2>
        <div className="text-sm text-gray-600 mb-4">
          로컬에 저장된 윤문 데이터를 표시합니다.
        </div>
        
        <div className="space-y-4">
          {dataKeys.map((griIndex) => {
            try {
              console.log(`🔍 GRI ${griIndex} 렌더링 시작`);
              const indexData = integratedData[griIndex];
              if (!indexData || typeof indexData !== 'object') {
                console.warn(`⚠️ GRI ${griIndex} 데이터가 유효하지 않음:`, indexData);
                return null;
              }
              
              const questionKeys = Object.keys(indexData);
              console.log(`🔍 GRI ${griIndex} 질문 키들:`, questionKeys);
              
              return (
                <div key={griIndex} className="border rounded p-4">
                  <h3 className="font-medium text-gray-900 mb-2">GRI {griIndex}</h3>
                  <div className="space-y-2">
                    {questionKeys.map((questionKey) => {
                      try {
                        console.log(`🔍 Q${questionKey} 렌더링 시작`);
                        const answer = indexData[questionKey];
                        if (!answer || typeof answer !== 'object') {
                          console.warn(`⚠️ Q${questionKey} 답변이 유효하지 않음:`, answer);
                          return null;
                        }
                        
                        console.log(`🔍 Q${questionKey} 답변 데이터:`, answer);
                        
                                                 // getDisplayText 함수 안전하게 호출
                         let displayText = '데이터 로드 중...';
                         try {
                           if (getDisplayText && typeof getDisplayText === 'function') {
                             displayText = getDisplayText(answer);
                           } else {
                             // 함수가 없으면 직접 데이터에서 추출
                             displayText = answer.polished_text || answer.answer_text || '텍스트 없음';
                           }
                         } catch (error) {
                           console.warn(`⚠️ getDisplayText 호출 오류:`, error);
                           // 오류 발생 시 직접 데이터에서 추출
                           displayText = answer.polished_text || answer.answer_text || '텍스트 로드 실패';
                         }
                         
                         // getSourceBadge 함수 안전하게 호출
                         let sourceBadge = 'Unknown';
                         try {
                           if (getSourceBadge && typeof getSourceBadge === 'function') {
                             sourceBadge = getSourceBadge(answer);
                           } else {
                             // 함수가 없으면 직접 데이터에서 추출
                             sourceBadge = answer.source || 'Unknown';
                           }
                         } catch (error) {
                           console.warn(`⚠️ getSourceBadge 호출 오류:`, error);
                           // 오류 발생 시 직접 데이터에서 추출
                           sourceBadge = answer.source || 'Unknown';
                         }
                        
                        return (
                          <div key={questionKey} className="text-sm">
                            <span className="font-medium text-gray-700">Q{questionKey}:</span>
                            <span className="ml-2 text-gray-600">{displayText}</span>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              answer.source === 'mg' ? 'bg-blue-100 text-blue-800' :
                              answer.source === 'intake' ? 'bg-green-100 text-green-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {sourceBadge}
                            </span>
                          </div>
                        );
                      } catch (error) {
                        console.error(`❌ Q${questionKey} 렌더링 오류:`, error);
                        return (
                          <div key={questionKey} className="text-sm text-red-500">
                            Q{questionKey}: 렌더링 오류
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            } catch (error) {
              console.error(`❌ GRI ${griIndex} 렌더링 오류:`, error);
              return (
                <div key={griIndex} className="border rounded p-4 text-red-500">
                  GRI {griIndex}: 렌더링 오류
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ SafeDataDisplay 전체 렌더링 오류:', error);
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-red-500">데이터 표시 중 오류가 발생했습니다.</p>
        <p className="text-sm text-gray-400 mt-2">오류: {error instanceof Error ? error.message : '알 수 없는 오류'}</p>
        <p className="text-sm text-gray-400 mt-2">페이지를 새로고침해주세요.</p>
      </div>
    );
  }
}

// 안전한 통계 표시 컴포넌트
function SafeStatsDisplay({ integratedData }: { integratedData: IntegratedAnswers }) {
  try {
    const safeData = integratedData || {};
    const dataKeys = Object.keys(safeData);
    
    const mgCount = dataKeys.filter(idx => {
      try {
        const indexData = safeData[idx];
        return indexData && typeof indexData === 'object' && 
               Object.values(indexData).some(answer => answer?.source === 'mg');
      } catch {
        return false;
      }
    }).length;
    
    const intakeCount = dataKeys.filter(idx => {
      try {
        const indexData = safeData[idx];
        return indexData && typeof indexData === 'object' && 
               Object.values(indexData).some(answer => answer?.source === 'intake');
      } catch {
        return false;
      }
    }).length;
    
    const serverCount = dataKeys.filter(idx => {
      try {
        const indexData = safeData[idx];
        return indexData && typeof indexData === 'object' && 
               Object.values(indexData).some(answer => answer?.source === 'server');
      } catch {
        return false;
      }
    }).length;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span className="text-sm text-gray-700">
            MG (Materiality→GRI): {mgCount}개 인덱스
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-sm text-gray-700">
            GRI Intake: {intakeCount}개 인덱스
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
          <span className="text-sm text-gray-700">
            Server (기존): {serverCount}개 인덱스
          </span>
        </div>
      </div>
    );
  } catch (error) {
    console.error('SafeStatsDisplay 렌더링 오류:', error);
    return (
      <div className="text-sm text-gray-500">
        통계 계산 중 오류가 발생했습니다.
      </div>
    );
  }
}

export default function GriReportPage() {
  const { user } = useAuthStore();
  const corpId = Number(user?.corporation_id);
  const { ensureSession } = useSessionStore();

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

  // 최초 로드: 로컬 데이터만 사용 (서버 API 호출 제거)
  useEffect(() => {
    if (!corpId) return;

    setLoading(true);
    setErr(null);
    
    try {
      // 로컬 데이터 기반으로 기본 구조 생성
      const fallbackStructure = {
        corporation_id: corpId,
        companyname: user?.companyname || 'Unknown Company',
        environmental: [],
        social: [],
        governance: []
      };
      
      setStructure(fallbackStructure);
      setSavedAnswers({}); // 서버 데이터 사용하지 않음
      
      console.log('✅ 로컬 데이터만 사용하여 Report 페이지 로드');
      
    } catch (e: unknown) {
      console.error('로컬 데이터 처리 오류:', e);
      setErr('로컬 데이터 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [corpId, user?.companyname]);

  // 로컬 스토리지와 서버 데이터 통합
  useEffect(() => {
    try {
      if (mgData && intakeData) {
        const integrated = integrateReportData(mgData, intakeData, savedAnswers);
        
        // 데이터 검증: integrated가 유효한 객체인지 확인
        if (integrated && typeof integrated === 'object' && !Array.isArray(integrated)) {
          // 데이터 구조 상세 로깅
          console.log('🔍 통합된 데이터 구조 분석:');
          console.log('전체 데이터:', integrated);
          
                     // 데이터 구조 검증 및 정규화
           const normalizedData: IntegratedAnswers = {};
           
           Object.entries(integrated).forEach(([griIndex, indexData]) => {
             console.log(`GRI ${griIndex}:`, indexData);
             
             if (indexData && typeof indexData === 'object') {
               normalizedData[griIndex] = {};
               
               Object.entries(indexData).forEach(([questionKey, answer]) => {
                 console.log(`  Q${questionKey}:`, answer);
                 
                                                                                  // 답변 데이터 정규화 - 로컬 데이터 구조에 맞춤
                         if (answer && typeof answer === 'object') {
                           // 안전한 데이터 추출을 위한 헬퍼 함수
                           const safeGetAnswerText = (obj: unknown, key: string): string => {
                             if (obj && typeof obj === 'object' && obj !== null) {
                               const value = (obj as Record<string, unknown>)[key];
                               return value !== undefined && value !== null ? String(value) : '';
                             }
                             return '';
                           };
                           
                           // 로컬 데이터에서 실제 존재하는 필드들 추출
                           const normalizedAnswer = {
                             source: answer.source || 'mg', // 기본값을 'mg'으로 설정 (MG 페이지에서 온 데이터)
                             answer_text: String(answer.answer_text || safeGetAnswerText(answer.answers, questionKey) || ''),
                             polished_text: String(answer.polished_text || ''),
                             display_mode: answer.display_mode || 'prose',
                             last_modified: answer.last_modified || new Date().toISOString(),
                             // 추가 필드들도 보존
                             gri_index: answer.gri_index || griIndex,
                             category_id: answer.category_id,
                             answers: answer.answers || {},
                             version: answer.version
                           };
                   
                   console.log(`  🔍 정규화된 답변:`, normalizedAnswer);
                   normalizedData[griIndex][questionKey] = normalizedAnswer;
                 }
               });
             }
           });
          
          console.log('🔍 정규화된 데이터:', normalizedData);
          setIntegratedData(normalizedData);
          console.log('✅ 데이터 통합 및 정규화 성공:', Object.keys(normalizedData).length, '개 인덱스');
        } else {
          console.warn('⚠️ 통합된 데이터가 유효하지 않음:', integrated);
          setIntegratedData({});
        }
      }
    } catch (error) {
      console.error('❌ 데이터 통합 중 오류:', error);
      setIntegratedData({});
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
            
            {/* 로컬 데이터 전용 사용 안내 */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm text-green-800">
                  <strong>로컬 데이터 전용 모드:</strong> 서버 API 호출 없이 로컬 데이터만 사용
                </span>
              </div>
              <div className="mt-2 text-xs text-green-700">
                빠른 응답 속도와 안정성을 위해 로컬 스토리지의 데이터만 사용합니다.
              </div>
            </div>
            
            <SafeStatsDisplay integratedData={integratedData} />
          </div>

          {/* 로컬 데이터 전용 표시 (서버 구조 사용하지 않음) */}
          <SafeDataDisplay integratedData={integratedData} />
        </div>
      </div>
    </ProtectedRoute>
  );
}