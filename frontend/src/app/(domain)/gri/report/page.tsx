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
          setIntegratedData(integrated);
          console.log('✅ 데이터 통합 성공:', Object.keys(integrated).length, '개 인덱스');
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

  // 로컬 데이터 전용 모드에서는 renderSection 함수가 필요하지 않음

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
            
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="flex items-center space-x-2">
                 <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                 <span className="text-sm text-gray-700">
                   MG (Materiality→GRI): {(() => {
                     try {
                       return Object.keys(integratedData || {}).filter(idx => {
                         const indexData = integratedData[idx];
                         return indexData && typeof indexData === 'object' && 
                                Object.values(indexData).some(answer => answer?.source === 'mg');
                       }).length;
                     } catch {
                       return 0;
                     }
                   })()}개 인덱스
                 </span>
               </div>
               <div className="flex items-center space-x-2">
                 <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                 <span className="text-sm text-gray-700">
                   GRI Intake: {(() => {
                     try {
                       return Object.keys(integratedData || {}).filter(idx => {
                         const indexData = integratedData[idx];
                         return indexData && typeof indexData === 'object' && 
                                Object.values(indexData).some(answer => answer?.source === 'intake');
                       }).length;
                     } catch {
                       return 0;
                     }
                   })()}개 인덱스
                 </span>
               </div>
               <div className="flex items-center space-x-2">
                 <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                 <span className="text-sm text-gray-700">
                   Server (기존): {(() => {
                     try {
                       return Object.keys(integratedData || {}).filter(idx => {
                         const indexData = integratedData[idx];
                         return indexData && typeof indexData === 'object' && 
                                Object.values(indexData).some(answer => answer?.source === 'server');
                       }).length;
                     } catch {
                       return 0;
                     }
                   })()}개 인덱스
                 </span>
               </div>
             </div>
          </div>

                     {/* 로컬 데이터 전용 표시 (서버 구조 사용하지 않음) */}
           {(() => {
             try {
               const dataKeys = Object.keys(integratedData || {});
               if (dataKeys.length > 0) {
                 return (
                   <div className="bg-white rounded-lg shadow p-6">
                     <h2 className="text-xl font-semibold mb-4">로컬 저장 데이터</h2>
                     <div className="text-sm text-gray-600 mb-4">
                       로컬에 저장된 윤문 데이터를 표시합니다.
                     </div>
                     
                     {/* 로컬 데이터 요약 표시 */}
                     <div className="space-y-4">
                       {dataKeys.map((griIndex) => {
                         try {
                           const indexData = integratedData[griIndex];
                           if (!indexData || typeof indexData !== 'object') {
                             return null;
                           }
                           
                           const questionKeys = Object.keys(indexData);
                           return (
                             <div key={griIndex} className="border rounded p-4">
                               <h3 className="font-medium text-gray-900 mb-2">GRI {griIndex}</h3>
                               <div className="space-y-2">
                                 {questionKeys.map((questionKey) => {
                                   try {
                                     const answer = indexData[questionKey];
                                     if (!answer || typeof answer !== 'object') {
                                       return null;
                                     }
                                     
                                     return (
                                       <div key={questionKey} className="text-sm">
                                         <span className="font-medium text-gray-700">Q{questionKey}:</span>
                                         <span className="ml-2 text-gray-600">
                                           {getDisplayText ? getDisplayText(answer) : '데이터 로드 중...'}
                                         </span>
                                         <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                           answer.source === 'mg' ? 'bg-blue-100 text-blue-800' :
                                           answer.source === 'intake' ? 'bg-green-100 text-green-800' :
                                           'bg-gray-100 text-gray-800'
                                         }`}>
                                           {getSourceBadge ? getSourceBadge(answer) : 'Unknown'}
                                         </span>
                                       </div>
                                     );
                                   } catch (error) {
                                     console.warn(`질문 ${questionKey} 렌더링 오류:`, error);
                                     return null;
                                   }
                                 })}
                               </div>
                             </div>
                           );
                         } catch (error) {
                           console.warn(`GRI 인덱스 ${griIndex} 렌더링 오류:`, error);
                           return null;
                         }
                       })}
                     </div>
                   </div>
                 );
               } else {
                 return (
                   <div className="bg-white rounded-lg shadow p-6 text-center">
                     <p className="text-gray-500">로컬에 저장된 윤문 데이터가 없습니다.</p>
                     <p className="text-sm text-gray-400 mt-2">MG 페이지에서 윤문을 진행해보세요.</p>
                   </div>
                 );
               }
             } catch (error) {
               console.error('데이터 렌더링 중 오류:', error);
               return (
                 <div className="bg-white rounded-lg shadow p-6 text-center">
                   <p className="text-red-500">데이터 표시 중 오류가 발생했습니다.</p>
                   <p className="text-sm text-gray-400 mt-2">페이지를 새로고침해주세요.</p>
                 </div>
               );
             }
           })()}
        </div>
      </div>
    </ProtectedRoute>
  );
}