'use client';

import React, { useEffect, useState } from 'react';
import { normalizeSurveyKey } from '@/lib/surveyKey';
import { ExcelRow } from '@/store/excelDataStore';

interface Category {
  category: string;
  selected_base_issue_pool?: string;
  esg_classification?: string;
  final_score?: number;
  rank: number;
  // 선택적: 아래 점수들은 서버로 보낼 때 포함될 수 있음
  frequency_score?: number;
  relevance_score?: number;
  recent_score?: number;
  rank_score?: number;
  reference_score?: number;
  negative_score?: number;
}

// 설문 내용의 해시값을 생성하는 함수
const generateSurveyContentHash = (categories: Category[], excelData: ExcelRow[]): string => {
  // 카테고리 데이터를 정규화하여 해시 생성
  const normalizedCategories = categories
    .map((cat) => ({
    category: cat.category || '',
    selected_base_issue_pool: cat.selected_base_issue_pool || '',
    esg_classification: cat.esg_classification || '',
    final_score: cat.final_score || 0,
      rank: cat.rank,
    }))
    .sort((a, b) => a.rank - b.rank); // 순위로 정렬하여 일관성 보장

  // 엑셀 데이터도 정규화 (현재 해시에 사용하지 않지만, 인터페이스 유지)
  const normalizedExcelData = excelData
    .map((row) => ({
    name: row.name,
    position: row.position,
    company: row.company,
    stakeholderType: row.stakeholderType,
      email: row.email,
    }))
    .sort((a, b) => (a.email || '').localeCompare(b.email || ''));

  // JSON 문자열로 변환하여 해시 생성
  const contentString = JSON.stringify({
    categories: normalizedCategories,
    excelData: normalizedExcelData,
  });

  // 간단한 해시 함수 (프로덕션에서는 crypto 모듈 권장)
  let hash = 0;
  for (let i = 0; i < contentString.length; i++) {
    const char = contentString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit 정수
  }
  return Math.abs(hash).toString(36);
};

interface SurveyResult {
  survey_id: string;
  content_hash?: string;
  created_at: string;
  is_active: boolean;
}

type SurveyCreateProps = {
  companyId: string;
  assessmentResult: any;
  excelData: any[];
  displayCategoryCount: number;
};

// ─────────────────────────────────────────────────────────────
// 🔧 회사별 설문 리스트(LocalStorage) 관리 헬퍼
// 키: surveyList_${companyId}  (최대 3개 유지, 맨앞이 최신/활성)
// ─────────────────────────────────────────────────────────────
type StoredSurvey = {
  id: string;
  contentHash?: string;
  timestamp: string; // ISO
  categoryCount: number;
  isActive: boolean;
};

const SURVEY_LIST_KEY = (companyId: string) => `surveyList_${companyId}`;

const getSurveyList = (companyId: string): StoredSurvey[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SURVEY_LIST_KEY(companyId));
    return raw ? (JSON.parse(raw) as StoredSurvey[]) : [];
  } catch {
    return [];
  }
};

const saveSurveyList = (companyId: string, list: StoredSurvey[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SURVEY_LIST_KEY(companyId), JSON.stringify(list));
};

const setActiveSurvey = (companyId: string, surveyId: string) => {
  const list = getSurveyList(companyId).map((s) => ({ ...s, isActive: s.id === surveyId }));
  saveSurveyList(companyId, list);
};

const upsertSurveyEntry = (companyId: string, entry: StoredSurvey) => {
  let list = getSurveyList(companyId);
  // 동일 id 또는 동일 contentHash는 제거(중복 방지)
  list = list.filter((s) => s.id !== entry.id && s.contentHash !== entry.contentHash);
  // 새 항목을 활성으로, 나머지는 비활성
  entry.isActive = true;
  list.forEach((s) => (s.isActive = false));
  // 맨 앞에 추가
  list.unshift(entry);
  // 최대 3개 유지
  if (list.length > 3) list = list.slice(0, 3);
  saveSurveyList(companyId, list);
};

const canCreateNewSurvey = (companyId: string, contentHash: string) => {
  const list = getSurveyList(companyId);
  // 동일 내용 있으면 새로 안 만들고 재사용 가능 → true
  if (list.some((s) => s.contentHash === contentHash)) return true;
  // 새로 만들 건데 이미 3개면 불가 (하지만 3개까지는 허용)
  return list.length < 3;
};

// ✅ 선택된 설문을 활성화로 표시(나머지는 비활성)
const markActiveSurvey = (companyId: string, activeId: string) => {
  if (typeof window === 'undefined') return;
  const list = getSurveyList(companyId);
  if (!list.length) return;
  const next = list.map(s => ({ ...s, isActive: s.id === activeId }));
  saveSurveyList(companyId, next);
  console.log('🔄 활성 설문 변경:', { companyId, activeId, updatedList: next });
};

// 3개 설문이 생성된 상태를 시뮬레이션하는 함수
const simulateThreeSurveys = (companyId: string) => {
  const mockSurveys: StoredSurvey[] = [
    {
      id: 'survey_001',
      contentHash: 'abc1',
      timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2일 전
      categoryCount: 15,
      isActive: false,
    },
    {
      id: 'survey_002', 
      contentHash: 'def2',
      timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1일 전
      categoryCount: 12,
      isActive: false,
    },
    {
      id: 'survey_003',
      contentHash: 'ghi3', 
      timestamp: new Date().toISOString(), // 현재
      categoryCount: 18,
      isActive: true,
    },
  ];
  saveSurveyList(companyId, mockSurveys);
};

const SurveyCreate: React.FC<SurveyCreateProps> = ({
  companyId,
  assessmentResult,
  excelData,
  displayCategoryCount,
}) => {
  const [generatedSurveyId, setGeneratedSurveyId] = useState<string | null>(null);
  const [isDataHidden, setIsDataHidden] = useState(true);
  const [surveyResult, setSurveyResult] = useState<SurveyResult | null>(null);

  // 컴포넌트 마운트 시 사용자 활동 여부 확인
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (hasUserActivity === 'true') {
        setIsDataHidden(false);
      } else {
        setIsDataHidden(true);
      }
    }
  }, []);

  // 컴포넌트 마운트 시 기존 설문 정보 확인
  useEffect(() => {
    const checkExistingSurvey = async () => {
      if (typeof window === 'undefined') return;

      console.log('🔍 설문 정보 복원 시작:', { companyId });

      // 1. 설문 리스트 기반 복원 (우선순위)
      try {
        const list = getSurveyList(companyId);
        console.log('📋 저장된 설문 리스트:', list);
        
        if (list.length > 0) {
          // hasUserActivity 상태와 관계없이 설문이 있으면 표시
          const hasUserActivity = localStorage.getItem('hasUserActivity');
          if (hasUserActivity) {
            setIsDataHidden(false);
          }
          
          const active = list.find((s) => s.isActive) || list[0];
          console.log('🎯 활성 설문 선택:', active);
          
          setGeneratedSurveyId(active.id);
          setSurveyResult({
            survey_id: active.id,
            content_hash: active.contentHash,
            created_at: active.timestamp,
            is_active: true,
          });
          
          // 활성 설문을 localStorage에도 저장 (전역 상태 동기화)
          localStorage.setItem('surveyResult', JSON.stringify({
            survey_id: active.id,
            content_hash: active.contentHash,
            created_at: active.timestamp,
            is_active: true,
          }));
          
          return;
        }
      } catch (error) {
        console.error('설문 리스트 복원 실패:', error);
      }

      // 2. 기존 호환 키 기반 복원 (fallback)
      const existingSurveyKey = `surveyData_${companyId}`;
      const existingSurvey = localStorage.getItem(existingSurveyKey);
      
      if (existingSurvey) {
        try {
          const surveyData = JSON.parse(existingSurvey);
          if (surveyData.surveyId) {
            console.log('📋 기존 설문 ID 복원 (호환 키):', surveyData.surveyId);
            
            const hasUserActivity = localStorage.getItem('hasUserActivity');
            if (hasUserActivity) {
              setIsDataHidden(false);
            }
            
            setGeneratedSurveyId(surveyData.surveyId);

            // 백엔드에서 설문 정보 가져오기
            try {
              const response = await fetch(`/api/v1/materiality-service/surveys/${surveyData.surveyId}`);
              if (response.ok) {
                const surveyInfo = await response.json();
                setSurveyResult({
                  survey_id: surveyData.surveyId,
                  content_hash: surveyInfo.content_hash,
                  created_at: surveyInfo.created_at || surveyData.timestamp,
                  is_active: surveyInfo.is_active !== false,
                });
                console.log('📊 설문 정보 로드 완료:', surveyInfo);
              }
            } catch (error) {
              console.error('설문 정보 로드 실패:', error);
            }
          }
        } catch (error) {
          console.error('기존 설문 데이터 파싱 실패:', error);
        }
      }

      // 3. 설문이 없으면 hasUserActivity 확인하여 초기 상태 결정
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (!hasUserActivity) {
        setIsDataHidden(true);
        console.log('🆕 처음 접속: 화면에 데이터를 표시하지 않습니다.');
      }
    };
    
    checkExistingSurvey();
  }, [companyId]);

  // 설문 ID 변경 시(활성 설문) 단건 호환 키에도 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (generatedSurveyId) {
      const activeList = getSurveyList(companyId);
      const active = activeList.find((s) => s.id === generatedSurveyId) || activeList[0];
      const surveyKey = `surveyData_${companyId}`;
      const surveyData = {
        surveyId: generatedSurveyId,
        companyId,
        timestamp: new Date().toISOString(),
        assessmentResult,
        contentHash: active?.contentHash,
        categoryCount: active?.categoryCount,
      };
      
      try {
        localStorage.setItem(surveyKey, JSON.stringify(surveyData));
        console.log('💾 설문 ID localStorage 저장(단건) 완료:', generatedSurveyId);
      } catch (error) {
        console.error('설문 ID 저장 실패:', error);
      }
    }
  }, [generatedSurveyId, companyId, assessmentResult]);

  const handleCreate = async () => {
    // 설문이 이미 생성된 경우 확인
    if (generatedSurveyId) {
      if (
        confirm(
          '이미 설문이 생성되어 있습니다.\n\n새로운 설문을 생성하시겠습니까?\n\n기존 설문은 유지되지만, 새로운 설문 ID가 생성됩니다.'
        )
      ) {
        // 기존 설문 초기화
        setGeneratedSurveyId(null);
        localStorage.removeItem(`surveyData_${companyId}`);
        console.log('🗑️ 기존 설문 데이터 제거 완료');
        
        setTimeout(() => {
          if (assessmentResult) {
            createNewSurvey();
          } else {
            alert('❌ 새로운 설문을 생성할 수 없습니다.\n\n먼저 중대성 평가를 완료해주세요.');
          }
        }, 100);
        return;
      } else {
        return;
      }
    }

    createNewSurvey();
  };

  // 실제 설문 생성 로직
  const createNewSurvey = async () => {
    console.log('🚀 설문 생성 시작:', { assessmentResult, displayCategoryCount });
    
    const resultData = assessmentResult?.data || assessmentResult;
    const categories = resultData?.matched_categories || [];

    console.log('📊 중대성 평가 결과 데이터:', {
      resultData,
      categoriesLength: categories.length,
      categories: categories
    });

    if (categories.length <= 0) {
      alert('❌ 설문을 진행할 수 있는 카테고리 데이터가 없습니다.\n\n먼저 중대성 평가를 완료해주세요.');
      return;
    }

      try {
        // 디버깅: 카테고리 정보 확인
        console.log('🔍 설문 생성 시 카테고리 정보:', {
          categoriesLength: categories.length,
          displayCategoryCount: displayCategoryCount,
          categories: categories
        });
        
        // 선택된 개수만큼만 사용 (0이면 전체)
        const selectedCategories: Category[] = (displayCategoryCount > 0 
          ? categories.slice(0, displayCategoryCount)
        : categories
      ).map((cat: any) => ({
            category: cat.category || '',
            selected_base_issue_pool: cat.selected_base_issue_pool || '',
            esg_classification: cat.esg_classification || '',
            final_score: cat.final_score || 0,
        rank: cat.rank || 0,
        frequency_score: cat.frequency_score || 0,
        relevance_score: cat.relevance_score || 0,
        recent_score: cat.recent_score || 0,
        rank_score: cat.rank_score || 0,
        reference_score: cat.reference_score || 0,
        negative_score: cat.negative_score || 0,
      }));
      
      // 디버깅: 선택된 카테고리 정보 확인
      console.log('🔍 선택된 카테고리 정보:', {
        selectedCategoriesLength: selectedCategories.length,
        selectedCategories: selectedCategories
      });

      // 설문 내용 해시값 생성 (현재는 카테고리만 반영)
      const contentHash = generateSurveyContentHash(selectedCategories, []);

      // ---- 최대 3개 제한 & 동일 내용 재사용 판단 ----
      if (!canCreateNewSurvey(companyId, contentHash)) {
        // 3개 설문이 이미 있는 상태를 시뮬레이션하여 보여줌
        simulateThreeSurveys(companyId);
        
        // UI 상태 업데이트 (3개 설문 중 가장 최근 것을 활성으로 설정)
        const list = getSurveyList(companyId);
        const activeSurvey = list.find(s => s.isActive) || list[0];
        if (activeSurvey) {
          setGeneratedSurveyId(activeSurvey.id);
          const newSurveyResult = {
            survey_id: activeSurvey.id,
            content_hash: activeSurvey.contentHash,
            created_at: activeSurvey.timestamp,
            is_active: true,
          };
          setSurveyResult(newSurveyResult);
          localStorage.setItem('surveyResult', JSON.stringify(newSurveyResult));
          markActiveSurvey(companyId, activeSurvey.id); // ✅ 활성 상태 동기화
        }
        
        alert('❌ 설문은 회사별 최대 3개까지만 생성할 수 있습니다.\n\n이전에 생성한 설문을 삭제한 후 다시 시도해주세요.');
            return;
      }

      // ---- 동일 내용 설문 재사용 ----
      {
        const list = getSurveyList(companyId);
        const same = list.find((s) => s.contentHash === contentHash);
        if (same) {
          // 재사용: 활성으로 승격하고 UI 반영
          setGeneratedSurveyId(same.id);
          const newSurveyResult = {
            survey_id: same.id,
            content_hash: same.contentHash,
            created_at: same.timestamp,
            is_active: true,
          };
          setSurveyResult(newSurveyResult);
          localStorage.setItem('surveyResult', JSON.stringify(newSurveyResult));
          setActiveSurvey(companyId, same.id);
          markActiveSurvey(companyId, same.id); // ✅ 활성 상태 동기화

          const surveyLink = `${window.location.origin}/survey?id=${same.id}`;
          alert(
            `✅ 동일한 내용의 설문이 이미 존재합니다!\n\n📊 총 ${selectedCategories.length}개 문항\n🔗 기존 설문 링크가 클립보드에 복사되었습니다.\n\n링크: ${surveyLink}`
          );
          navigator.clipboard.writeText(surveyLink).catch(() => {});
          return; // 새로 만들지 않음
        }
      }

      // UI 순서대로 질문 번호 부여
        const categoriesWithQuestionNumbers = selectedCategories.map((cat: any, index: number) => ({
        question_number: index + 1,
          rank: cat.rank,
          category: cat.category || '카테고리명 없음',
          selected_base_issue_pool: cat.selected_base_issue_pool || '',
          esg_classification: cat.esg_classification || '미분류',
          final_score: cat.final_score || 0,
          frequency_score: cat.frequency_score || 0,
          relevance_score: cat.relevance_score || 0,
          recent_score: cat.recent_score || 0,
          rank_score: cat.rank_score || 0,
          reference_score: cat.reference_score || 0,
        negative_score: cat.negative_score || 0,
        }));

      // 백엔드 요청 페이로드
      const corpId = '1'; // TODO: 실제 corporation 테이블의 id 사용
        const surveyRequest = {
          corporation_id: corpId,
          categories: categoriesWithQuestionNumbers,
        excel_data:
          excelData.length > 0
            ? {
            total_companies: excelData.length,
            companies: excelData.map((row: any) => ({
              name: row.name || '',
              position: row.position || '',
              company: row.company || '',
              stakeholder_type: row.stakeholderType || '',
                  email: row.email || '',
                })),
              }
            : null,
        content_hash: contentHash,
        };

        // Gateway를 통해 materiality-service로 전송
        const response = await fetch('/api/v1/materiality-service/surveys', {
          method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(surveyRequest),
        });

        if (!response.ok) {
          throw new Error(`설문 생성 실패: ${response.status} ${response.statusText}`);
        }

        const surveyResponse = await response.json();
        const rawSurveyId = surveyResponse.survey_id;
        const surveyId = normalizeSurveyKey(rawSurveyId);
        
        console.log('✅ 설문 데이터 백엔드 저장 완료:', {
        surveyId,
          categories: surveyResponse.total_categories,
          companyId: surveyResponse.company_id,
        contentHash: surveyResponse.content_hash,
        });
        
      // 화면 상태 업데이트
        setGeneratedSurveyId(surveyId);
      const newSurveyResult = {
          survey_id: surveyId,
          content_hash: surveyResponse.content_hash,
          created_at: new Date().toISOString(),
        is_active: true,
      };
      setSurveyResult(newSurveyResult);
      
      // localStorage에 저장하여 page.tsx에서 사용할 수 있도록 함
      localStorage.setItem('surveyResult', JSON.stringify(newSurveyResult));

      // (호환) 단건 키 저장
      localStorage.setItem(
        `surveyData_${companyId}`,
        JSON.stringify({
          surveyId,
          contentHash,
          timestamp: new Date().toISOString(),
          categoryCount: selectedCategories.length,
        })
      );

            // 리스트(최대 3) 업데이트: 현재 항목을 활성으로 업서트
      console.log('💾 설문 리스트에 저장할 정보:', {
        surveyId,
        categoryCount: selectedCategories.length,
        selectedCategories: selectedCategories
      });
      
      const surveyEntry = {
        id: surveyId,
        contentHash,
        timestamp: new Date().toISOString(),
        categoryCount: selectedCategories.length,
        isActive: true,
      };
      
      upsertSurveyEntry(companyId, surveyEntry);
      
      // 설문 리스트 저장 후 확인
      const savedList = getSurveyList(companyId);
      console.log('💾 설문 리스트 저장 완료:', {
        companyId,
        savedListLength: savedList.length,
        savedList: savedList.map(s => ({ id: s.id, categoryCount: s.categoryCount, isActive: s.isActive }))
      });
      
      // 활성 상태 동기화
      markActiveSurvey(companyId, surveyId);
      
      // 화면에 데이터 표시
      setIsDataHidden(false);
      
      // localStorage에 사용자 활동 저장
      localStorage.setItem('hasUserActivity', 'true');

      // 링크 복사 & 알림
      const surveyLink = `${window.location.origin}/survey?id=${surveyId}`;
      try {
        await navigator.clipboard.writeText(surveyLink);
        alert(
          `✅ 설문이 생성되었습니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 설문 링크가 클립보드에 복사되었습니다.\n\n링크: ${surveyLink}\n\n💡 설문 관리 페이지에서 이메일 발송을 진행하세요.`
        );
      } catch {
        alert(
          `✅ 설문이 생성되었습니다!\n\n📊 총 ${selectedCategories.length}개 카테고리\n🔗 설문 링크:\n${surveyLink}\n\n위 링크를 복사하여 공유하세요.\n\n💡 설문 관리 페이지에서 이메일 발송을 진행하세요.`
        );
      }
      } catch (error) {
        console.error('❌ 설문 생성 실패:', error);
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다';
        alert(`❌ 설문 생성에 실패했습니다.\n\n오류: ${errorMessage}\n\n다시 시도해주세요.`);
    }
  };

  const handlePreview = () => {
    if (generatedSurveyId) {
      window.location.href = `/survey?id=${generatedSurveyId}`;
    } else {
      alert('❌ 먼저 "설문 생성하기" 버튼을 눌러 설문을 생성해주세요.');
    }
  };

  // 데이터가 숨겨진 상태일 때 표시
  if (isDataHidden) {
    return (
      <div id="survey-create" className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">설문 생성</h3>
          <p className="text-gray-500 mb-6">중대성 평가를 완료하면 여기서 설문을 생성할 수 있습니다.</p>
          
          <button
            onClick={() => {
              localStorage.setItem('hasUserActivity', 'true');
              setIsDataHidden(false);
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            설문 생성 시작하기
          </button>
        </div>
      </div>
    );
  }

  // 활성 설문 배지용 hash 계산(리스트 우선)
  const activeBadgeHash =
    typeof window !== 'undefined'
      ? (() => {
          const list = getSurveyList(companyId);
          const active = list.find((s) => s.isActive && s.id === generatedSurveyId);
          return (active?.contentHash || surveyResult?.content_hash || '').substring(0, 4) || '0000';
        })()
      : surveyResult?.content_hash?.substring(0, 4) || '0000';

  // 현재 문항수 표기 (설문 생성 시점의 정보 사용)
  const currentQuestionCount = (() => {
    // 설문이 생성된 경우, 해당 설문의 categoryCount 사용
    if (generatedSurveyId && surveyResult) {
      const list = getSurveyList(companyId);
      const activeSurvey = list.find(s => s.id === generatedSurveyId);
      if (activeSurvey) {
        return activeSurvey.categoryCount;
      }
    }
    
    // 설문이 생성되지 않은 경우, 현재 displayCategoryCount 또는 전체 카테고리 수 사용
    return displayCategoryCount ||
      (assessmentResult?.data?.matched_categories || assessmentResult?.matched_categories || []).length ||
      0;
  })();

  return (
    <div id="survey-create" className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* 왼쪽: 버튼들 */}
        <div className="flex-1 text-center">
          <button
            onClick={handleCreate}
            disabled={!assessmentResult && !generatedSurveyId}
            className={`inline-flex items-center px-8 py-4 border-2 text-lg font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${
              assessmentResult || generatedSurveyId
                ? 'border-blue-500 text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-600'
                : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
            }`}
          >
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            설문 생성하기
          </button>
          <p className="text-sm text-gray-600 mt-3">
            {generatedSurveyId 
              ? '이미 설문이 생성되어 있습니다. 새로운 설문을 생성하려면 버튼을 클릭하세요.'
              : '중간 중대성 평가 결과를 바탕으로 설문을 생성합니다'}
          </p>
          <p className="text-xs text-blue-600 mt-2">💡 설문 생성 후 "설문 관리" 페이지에서 이메일 발송을 진행하세요</p>
          <div className="mt-4">
            <button
              onClick={handlePreview}
              disabled={!generatedSurveyId}
              className={`inline-flex items-center px-6 py-3 border-2 text-base font-semibold rounded-lg transition-all duration-200 ${
                generatedSurveyId
                  ? 'border-green-500 text-green-700 bg-white hover:bg-green-50 hover:border-green-600'
                  : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
              }`}
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              설문 미리보기
            </button>
          </div>
        </div>

                      {/* 오른쪽: URL 표시 및 복사 기능 */}
        {generatedSurveyId && (
          <div className="flex-1 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
              설문 URL
            </h3>
            
            <div className="space-y-4">
              {/* 현재 활성 설문 URL */}
              <div className="bg-white rounded-lg p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col">
                    <span className="font-medium text-blue-900">현재 활성 설문</span>
                    <span className="text-sm text-blue-700">{currentQuestionCount}개 문항</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">v{activeBadgeHash}</span>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">활성</span>
                  </div>
                </div>
                <div className="font-mono text-sm text-blue-700 break-all bg-blue-50 p-2 rounded border border-blue-200">
                  {`${typeof window !== 'undefined' ? window.location.origin : ''}/survey?id=${generatedSurveyId}`}
                </div>
                <div className="mt-2 text-xs text-blue-600">
                  생성일시:{' '}
                  {new Date(surveyResult?.created_at || Date.now()).toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                <button
                  onClick={() => {
                    const surveyLink = `${window.location.origin}/survey?id=${generatedSurveyId}`;
                    navigator.clipboard
                      .writeText(surveyLink)
                      .then(() => alert('✅ 설문 URL이 클립보드에 복사되었습니다!'))
                      .catch(() => alert('❌ URL 복사에 실패했습니다. 위 링크를 직접 복사해주세요.'));
                  }}
                  className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  URL 복사하기
                </button>
              </div>

              {/* 이전 설문 목록 (활성 포함, 최대 3개) */}
              <div className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                <h4 className="font-medium text-gray-800 mb-3">설문 버전 관리</h4>
                <div className="space-y-3">
                  {(() => {
                    // localStorage에서 설문 리스트 가져오기 (SSR 대응)
                    let list: StoredSurvey[] = [];
                    if (typeof window !== 'undefined') {
                      try {
                        list = getSurveyList(companyId)
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .slice(0, 3);
                        console.log('📋 설문 버전 관리 목록 로드:', list);
                      } catch (error) {
                        console.error('설문 리스트 로드 실패:', error);
                      }
                    }

                    if (list.length === 0) {
                      return <div className="text-sm text-gray-500 text-center py-3">이전에 생성한 설문이 없습니다</div>;
                    }

                    return list.map((survey) => {
                      const link = `${window.location.origin}/survey?id=${survey.id}`;
                      return (
                        <div key={survey.id} className="bg-white rounded-lg p-3 border border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-gray-700">{survey.categoryCount}개 문항</span>
                              <span className="text-xs text-gray-500">
                                {new Date(survey.timestamp).toLocaleDateString('ko-KR', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              v{survey.contentHash?.substring(0, 4) || '0000'}
                            </span>
                              {survey.isActive && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">활성</span>
                              )}
                          </div>
                          </div>

                          <div className="font-mono text-xs text-gray-600 break-all bg-gray-50 p-2 rounded">{link}</div>

                          <div className="mt-2 flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                navigator.clipboard
                                  .writeText(link)
                                  .then(() => alert('✅ 설문 URL이 복사되었습니다!'));
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              URL 복사
                            </button>

                            <button
                                                                            onClick={async () => {
                                if (!confirm('이 설문을 삭제하시겠습니까?\n연결된 응답 데이터도 함께 삭제됩니다.')) return;
                                
                                try {
                                  console.log('🗑️ 설문 삭제 시작:', survey.id);
                                  
                                  // 시뮬레이션된 설문인지 확인 (survey_001, survey_002, survey_003)
                                  const isSimulatedSurvey = survey.id.startsWith('survey_00');
                                  
                                  if (isSimulatedSurvey) {
                                    console.log('📝 시뮬레이션 설문 삭제 처리');
                                    // 시뮬레이션된 설문은 로컬에서만 삭제
                                    let listNow = getSurveyList(companyId).filter((s) => s.id !== survey.id);
                                    
                                    // 삭제한 항목이 활성 설문이었으면, 남아있는 첫 항목을 활성으로
                                    if (survey.isActive && listNow.length > 0) {
                                      listNow[0].isActive = true;
                                      // UI 상태도 업데이트
                                      setGeneratedSurveyId(listNow[0].id);
                                      setSurveyResult({
                                        survey_id: listNow[0].id,
                                        content_hash: listNow[0].contentHash,
                                        created_at: listNow[0].timestamp,
                                        is_active: true,
                                      });
                                    } else if (survey.isActive && listNow.length === 0) {
                                      // 모든 설문이 삭제된 경우
                                      setGeneratedSurveyId(null);
                                      setSurveyResult(null);
                                    }
                                    
                                    saveSurveyList(companyId, listNow);

                                    // (호환) 단건 키가 해당 설문을 가리키면 제거
                                    const single = localStorage.getItem(`surveyData_${companyId}`);
                                    if (single) {
                                      const data = JSON.parse(single);
                                      if (data?.surveyId === survey.id) {
                                        localStorage.removeItem(`surveyData_${companyId}`);
                                      }
                                    }

                                    alert('✅ 시뮬레이션 설문이 삭제되었습니다.');
                                    // 페이지 새로고침 대신 상태만 업데이트
                                    return;
                                  } else {
                                    console.log('🌐 실제 설문 백엔드 삭제 처리');
                                    // 실제 설문은 백엔드에서 삭제
                                    const resp = await fetch(`/api/v1/materiality-service/surveys/${survey.id}`, {
                                      method: 'DELETE',
                                    });
                                    
                                    console.log('📡 삭제 응답:', resp.status, resp.statusText);
                                    
                                    if (resp.ok) {
                                      // 리스트에서 제거
                                      let listNow = getSurveyList(companyId).filter((s) => s.id !== survey.id);
                                      
                                      // 삭제한 항목이 활성 설문이었으면, 남아있는 첫 항목을 활성으로
                                      if (survey.isActive && listNow.length > 0) {
                                        listNow[0].isActive = true;
                                        // UI 상태도 업데이트
                                        setGeneratedSurveyId(listNow[0].id);
                                        setSurveyResult({
                                          survey_id: listNow[0].id,
                                          content_hash: listNow[0].contentHash,
                                          created_at: listNow[0].timestamp,
                                          is_active: true,
                                        });
                                      } else if (survey.isActive && listNow.length === 0) {
                                        // 모든 설문이 삭제된 경우
                                        setGeneratedSurveyId(null);
                                        setSurveyResult(null);
                                      }
                                      
                                      saveSurveyList(companyId, listNow);

                                      // (호환) 단건 키가 해당 설문을 가리키면 제거
                                      const single = localStorage.getItem(`surveyData_${companyId}`);
                                      if (single) {
                                        const data = JSON.parse(single);
                                        if (data?.surveyId === survey.id) {
                                          localStorage.removeItem(`surveyData_${companyId}`);
                                        }
                                      }

                                      alert('✅ 설문이 삭제되었습니다.');
                                      // 페이지 새로고침 대신 상태만 업데이트
                                      return;
                                    } else {
                                      const errorText = await resp.text();
                                      console.error('❌ 삭제 실패:', resp.status, errorText);
                                      alert(`❌ 설문 삭제 중 오류가 발생했습니다.\n상태: ${resp.status}\n오류: ${errorText}`);
                                    }
                                  }
                                } catch (e) {
                                  console.error('❌ 설문 삭제 중 예외 발생:', e);
                                  alert(`❌ 설문 삭제 중 오류가 발생했습니다.\n오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
                                }
                              }}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              삭제
                            </button>
                          </div>
                      </div>
                    );
                    });
                  })()}
                </div>
              </div>

              {/* 설문 참여 안내 */}
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <div className="text-sm text-yellow-900">
                  <p className="font-bold mb-2">📋 설문 참여 안내</p>
                  <ul className="text-sm space-y-1 text-yellow-900 font-semibold">
                    <li>• 같은 이메일 주소로는 한 번만 응답 가능합니다</li>
                    <li>• 다른 사람이 참여하려면 다른 이메일 주소를 사용해야 합니다</li>
                    <li>• 설문 링크를 공유하여 여러 응답을 받을 수 있습니다</li>
                    <li>• 동일한 내용의 설문은 자동으로 응답이 통합됩니다</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurveyCreate;
