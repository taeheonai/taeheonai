import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { handleViewReport } from '../handle_view_report';
import { loadAssessmentResult } from '../load_assessment_result';
import { fetchAllCategories } from '../fetch_all_categories';
import { addNewCategory } from '../add_new_category';
import { WeightConfig, DEFAULT_WEIGHTS } from '../../../types/weights';
import WeightSettingsPanel from './WeightSettingsPanel';

// 뉴스 데이터에서 추출된 카테고리를 기존 API와 연결하는 함수
const connectWithExistingCategories = async (rawCategories: any[]) => {
  try {
    console.log('🔗 뉴스 카테고리를 기존 API와 연결 시작');
    
    // 1. 기존 카테고리 API에서 모든 카테고리 정보 가져오기
    const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
    const response = await fetch(`${gatewayUrl}/api/v1/materiality-service/category/categories/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        include_base_issue_pools: true,
        include_esg_classification: true
      })
    });

    if (!response.ok) {
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const apiData = await response.json();
    if (!apiData.success) {
      throw new Error(`API 응답 실패: ${apiData.message}`);
    }

    const existingCategories = apiData.categories || [];
    console.log('🔍 기존 카테고리 수:', existingCategories.length);

    // 2. 뉴스 카테고리와 기존 카테고리 매칭
    const matchedCategories = [];
    
    for (const newsCategory of rawCategories) {
      const categoryName = newsCategory.category;
      
      // 기존 카테고리에서 매칭되는 것 찾기
      const matchedExisting = existingCategories.find((existing: any) => 
        existing.category_name === categoryName
      );

      if (matchedExisting) {
        // 매칭된 경우: 기존 카테고리 정보 사용
        const connectedCategory = {
          ...newsCategory, // 뉴스 데이터의 점수 정보 유지
          esg_classification: matchedExisting.esg_classification?.esg || '미분류',
          esg_classification_id: matchedExisting.esg_classification?.id,
          base_issuepools: matchedExisting.base_issue_pools?.map((pool: any) => ({
            id: pool.id,
            base_issue_pool: pool.base_issue_pool,
            issue_pool: pool.issue_pool,
            ranking: pool.ranking,
            esg_classification_id: matchedExisting.esg_classification?.id,
            esg_classification_name: matchedExisting.esg_classification?.esg || '미분류'
          })) || [],
          total_issuepools: matchedExisting.base_issue_pools?.length || 0
        };
        
        matchedCategories.push(connectedCategory);
        console.log(`✅ 매칭 성공: ${categoryName} -> ESG: ${connectedCategory.esg_classification}, IssuePools: ${connectedCategory.total_issuepools}개`);
      } else {
        // 매칭되지 않은 경우: 기본값으로 설정
        const defaultCategory = {
          ...newsCategory, // 뉴스 데이터의 점수 정보 유지
          esg_classification: '미분류',
          esg_classification_id: null,
          base_issuepools: [],
          total_issuepools: 0
        };
        
        matchedCategories.push(defaultCategory);
        console.log(`⚠️ 매칭 실패: ${categoryName} -> 기본값 사용`);
      }
    }

    console.log(`🔗 연결 완료: ${matchedCategories.length}개 카테고리 처리`);
    return matchedCategories;

  } catch (error) {
    console.error('❌ 카테고리 연결 실패:', error);
    
    // 오류 발생 시 원본 카테고리 정보만 반환 (기본값으로)
    return rawCategories.map(category => ({
      ...category,
      esg_classification: '미분류',
      esg_classification_id: null,
      base_issuepools: [],
      total_issuepools: 0
    }));
  }
};

interface FirstAssessmentProps {
  companyId: string;
  searchResult: any;
  issuepoolData: any;
  assessmentResult: any;
  isIssuepoolLoading: boolean;
  isAssessmentStarting: boolean;
  isBaseIssuePoolModalOpen: boolean;
  isAddCategoryModalOpen: boolean;
  selectedCategory: any;
  editingCategoryIndex: number;
  baseIssuePoolOptions: string[];
  selectedBaseIssuePool: string;
  allCategories: any[];
  selectedNewCategory: string;
  newCategoryRank: string;
  newBaseIssuePool: string;
  isCustomBaseIssuePool: boolean;
  customBaseIssuePoolText: string;
  displayCategoryCount: number;
  setDisplayCategoryCount: (count: number) => void;
  setAssessmentResult: (result: any) => void;
  setIsAssessmentStarting: (starting: boolean) => void;
  setIsIssuepoolLoading: (loading: boolean) => void;
  setIssuepoolData: (data: any) => void;
  setIsBaseIssuePoolModalOpen: (open: boolean) => void;
  setIsAddCategoryModalOpen: (open: boolean) => void;
  setSelectedCategory: (category: any) => void;
  setEditingCategoryIndex: (index: number) => void;
  setBaseIssuePoolOptions: (options: string[]) => void;
  setSelectedBaseIssuePool: (option: string) => void;
  setAllCategories: (categories: any[]) => void;
  setSelectedNewCategory: (category: string) => void;
  setNewCategoryRank: (rank: string) => void;
  setNewBaseIssuePool: (pool: string) => void;
  setIsCustomBaseIssuePool: (custom: boolean) => void;
  setCustomBaseIssuePoolText: (text: string) => void;
  setIsDetailModalOpen: (open: boolean) => void;
  excelData: any[];
}

const FirstAssessment: React.FC<FirstAssessmentProps> = ({
  companyId,
  searchResult,
  issuepoolData,
  assessmentResult,
  isIssuepoolLoading,
  isAssessmentStarting,
  isBaseIssuePoolModalOpen,
  isAddCategoryModalOpen,
  selectedCategory,
  editingCategoryIndex,
  baseIssuePoolOptions,
  selectedBaseIssuePool,
  allCategories,
  selectedNewCategory,
  newCategoryRank,
  newBaseIssuePool,
  isCustomBaseIssuePool,
  customBaseIssuePoolText,
  displayCategoryCount,
  setDisplayCategoryCount,
  setAssessmentResult,
  setIsAssessmentStarting,
  setIsIssuepoolLoading,
  setIssuepoolData,
  setIsBaseIssuePoolModalOpen,
  setIsAddCategoryModalOpen,
  setSelectedCategory,
  setEditingCategoryIndex,
  setBaseIssuePoolOptions,
  setSelectedBaseIssuePool,
  setAllCategories,
  setSelectedNewCategory,
  setNewCategoryRank,
  setNewBaseIssuePool,
  setIsCustomBaseIssuePool,
  setCustomBaseIssuePoolText,
  setIsDetailModalOpen,
  excelData
}) => {
  const [isDataHidden, setIsDataHidden] = React.useState(true);
  const [weights, setWeights] = React.useState<WeightConfig>(DEFAULT_WEIGHTS);
  const [isWeightUpdateLoading, setIsWeightUpdateLoading] = React.useState(false);

  // 컴포넌트 마운트 시 사용자 활동 여부 확인
  React.useEffect(() => {
    // SSR 환경에서는 빈 화면으로 시작
    if (typeof window === 'undefined') {
      setIsDataHidden(true);
      return;
    }

    // 처음 접속 시에는 항상 빈 화면으로 시작
    const hasUserActivity = localStorage.getItem('hasUserActivity');
    if (hasUserActivity === 'true') {
      setIsDataHidden(false);
    } else {
      // 명시적으로 빈 화면으로 설정
      setIsDataHidden(true);
    }
  }, []);

  // 사용자 활동 추적 함수
  const markUserActivity = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasUserActivity', 'true');
    }
    setIsDataHidden(false);
    console.log('✅ 사용자 활동 기록됨');
  };

  // 가중치 변경 핸들러
  const handleWeightChange = async (newWeights: WeightConfig) => {
    try {
      setIsWeightUpdateLoading(true);
      setWeights(newWeights);

      // 가중치 설정을 localStorage에 저장
      localStorage.setItem('materialityWeights', JSON.stringify(newWeights));

      // 백엔드 API 호출하여 새로운 가중치로 결과 업데이트
      const response = await axios.post(
        `/api/v1/materiality-service/middleissue/assessment/weights`,
        {
          weights: {
            frequency_weight: newWeights.frequency.value,
            relevance_weight: newWeights.relevance.value,
            recent_weight: newWeights.recent.value,
            rank_weight: newWeights.rank.value,
            negative_weight: newWeights.negative.value,
            negative_boost: {
              frequency: newWeights.negative.boost.frequency,
              relevance: newWeights.negative.boost.relevance
            }
          }
        }
      );

      if (response.data.success) {
        // 결과 업데이트
        setAssessmentResult(response.data.data);
        console.log('✅ 가중치 업데이트 및 결과 반영 완료');
      } else {
        throw new Error(response.data.message || '가중치 업데이트 실패');
      }
    } catch (error) {
      console.error('❌ 가중치 업데이트 중 오류:', error);
      alert('가중치 업데이트 중 오류가 발생했습니다.');
    } finally {
      setIsWeightUpdateLoading(false);
    }
  };

  // 가중치 초기화 핸들러
  const handleWeightReset = () => {
    setWeights(DEFAULT_WEIGHTS);
    localStorage.removeItem('materialityWeights');
    handleWeightChange(DEFAULT_WEIGHTS);
  };

  // 저장된 가중치 불러오기
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedWeights = localStorage.getItem('materialityWeights');
      if (savedWeights) {
        try {
          const parsedWeights = JSON.parse(savedWeights);
          setWeights(parsedWeights);
          console.log('💾 저장된 가중치 설정 로드됨');
        } catch (error) {
          console.error('❌ 저장된 가중치 파싱 실패:', error);
          localStorage.removeItem('materialityWeights');
        }
      }
    }
  }, []);

  const saveAssessmentResult = () => {
    if (assessmentResult) {
      try {
        // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
        const resultData = assessmentResult?.data || assessmentResult;
        const categories = resultData?.matched_categories || [];
        
        // 필수 정보 + base_issuepools 목록까지 포함하여 저장
        const optimizedCategories = categories.map((cat: any) => ({
          rank: cat.rank || 0,
          category: cat.category || '',
          esg_classification: cat.esg_classification || '',
          selected_base_issue_pool: cat.selected_base_issue_pool || '',
          final_score: cat.final_score || 0,
          total_issuepools: cat.total_issuepools || 0,
          is_user_added: cat.is_user_added || false, // 사용자 추가 여부 저장
          base_issuepools: Array.isArray(cat.base_issuepools)
            ? cat.base_issuepools.map((item: any) => ({
                base_issue_pool: item?.base_issue_pool || item?.issue || '',
                esg_classification_name: item?.esg_classification_name || '',
                ranking: item?.ranking || 0
              }))
            : []
        }));
        
        const dataToSave = {
          assessment_result: {
            company_id: companyId,
            search_period: resultData?.search_period || '',
            matched_categories: optimizedCategories
          },
          company_id: companyId,
          timestamp: new Date().toISOString(),
          total_categories: categories.length,
          categories_with_base_issue_pool: categories.filter((cat: any) => cat.selected_base_issue_pool).length,
          display_category_count: displayCategoryCount // 표시할 카테고리 개수도 함께 저장
        };
        
        // localStorage 용량 확인 및 정리
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
            markUserActivity(); // 사용자 활동 기록
            console.log('💾 중대성 평가 결과 저장 완료:', dataToSave);
            console.log('📋 저장된 카테고리 수:', categories.length);
            console.log('📋 Base Issue Pool이 설정된 카테고리 수:', categories.filter((cat: any) => cat.selected_base_issue_pool).length);
            alert(`✅ 중대성 평가 결과가 성공적으로 저장되었습니다!\n\n📊 총 ${categories.length}개 카테고리\n📋 Base Issue Pool 설정: ${categories.filter((cat: any) => cat.selected_base_issue_pool).length}개`);
          } catch (storageError: any) {
            if (storageError.name === 'QuotaExceededError') {
              // localStorage 용량 부족 시 기존 데이터 정리
              console.log('⚠️ localStorage 용량 부족, 기존 데이터 정리 중...');
              localStorage.clear();
              
              // 다시 저장 시도
              localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
              markUserActivity(); // 사용자 활동 기록
              console.log('💾 중대성 평가 결과 저장 완료 (용량 정리 후):', dataToSave);
              alert(`✅ 중대성 평가 결과가 성공적으로 저장되었습니다!\n\n📊 총 ${categories.length}개 카테고리\n📋 Base Issue Pool 설정: ${categories.filter((cat: any) => cat.selected_base_issue_pool).length}개`);
            } else {
              throw storageError;
            }
          }
        }
      } catch (error) {
        console.error('❌ 중대성 평가 결과 저장 실패:', error);
        alert('❌ 중대성 평가 결과 저장에 실패했습니다.');
      }
    } else {
      alert('❌ 저장할 중대성 평가 결과가 없습니다.');
    }
  };

  useEffect(() => {
    const loadAssessmentResultFromStorage = () => {
      // SSR 환경에서는 빈 화면으로 시작
      if (typeof window === 'undefined') {
        setIsDataHidden(true);
        return;
      }

      // 처음 접속 시에는 데이터를 화면에 표시하지 않음
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      if (!hasUserActivity) {
        setIsDataHidden(true);
        console.log('🆕 처음 접속: 화면에 데이터를 표시하지 않습니다.');
        return;
      }

      // 사용자 활동이 있는 경우에만 데이터를 화면에 표시
      const savedResult = localStorage.getItem('materialityAssessmentResult');
      if (savedResult) {
        try {
          const parsedResult = JSON.parse(savedResult);
          if (parsedResult.assessment_result) {
            // 데이터는 state에 로드하되, isDataHidden으로 화면 표시 여부 제어
            setAssessmentResult(parsedResult.assessment_result);
            if (parsedResult.display_category_count !== undefined) {
              setDisplayCategoryCount(parsedResult.display_category_count);
              console.log('💾 표시할 카테고리 개수 복원:', parsedResult.display_category_count);
            }
            console.log('💾 데이터 로드 완료 (사용자 활동 있음)');
          } else {
            setAssessmentResult(parsedResult);
            if (parsedResult.display_category_count !== undefined) {
              setDisplayCategoryCount(parsedResult.display_category_count);
              console.log('💾 표시할 카테고리 개수 복원:', parsedResult.display_category_count);
            }
          }
        } catch (e) {
          console.error('❌ 데이터 파싱 실패:', e);
          localStorage.removeItem('materialityAssessmentResult');
        }
      }
    };

    loadAssessmentResultFromStorage();
  }, [setAssessmentResult, setDisplayCategoryCount]);

  useEffect(() => {
    const loadSearchResultFromStorage = () => {
      // SSR 환경에서는 실행하지 않음
      if (typeof window === 'undefined') {
        return;
      }

      // 사용자 활동 상태 확인
      const hasUserActivity = localStorage.getItem('hasUserActivity');
      
      // 처음 접속이거나 사용자 활동이 없는 경우 데이터를 자동으로 불러오지 않음
      if (!hasUserActivity) {
        console.log('🆕 처음 접속: 지난 중대성 평가 목록을 자동으로 불러오지 않습니다.');
        return;
      }

      const savedSearchResult = localStorage.getItem('materialitySearchResult');
      if (savedSearchResult) {
        try {
          const parsedSearchResult = JSON.parse(savedSearchResult);
          // issuepool_data 필드가 있으면 해당 데이터를 사용
          if (parsedSearchResult.issuepool_data) {
            setIssuepoolData(parsedSearchResult.issuepool_data);
            console.log('💾 저장된 지난 중대성 평가 목록 불러오기 완료:', parsedSearchResult.issuepool_data);
          } else {
            setIssuepoolData(parsedSearchResult);
            console.log('💾 저장된 지난 중대성 평가 목록 불러오기 완료:', parsedSearchResult);
          }
        } catch (e) {
          console.error('❌ 저장된 지난 중대성 평가 목록 파싱 실패:', e);
          localStorage.removeItem('materialitySearchResult'); // 파싱 실패 시 삭제
        }
      }
    };

    loadSearchResultFromStorage();
  }, [setIssuepoolData]);

  // 데이터가 숨겨진 상태일 때 표시
  if (isDataHidden) {
    return (
      <div id="middle-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          📑 {companyId ? `${companyId} 중대성 평가 중간 결과 보기` : '중대성 평가 중간 결과 보기'}
        </h2>
        
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">📊</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">중대성 평가 중간 결과</h3>
          <p className="text-gray-500 mb-6">중대성 평가를 시작하면 여기에 결과가 표시됩니다.</p>
          
          <button
            onClick={markUserActivity}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            중대성 평가 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="middle-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        📑 {companyId ? `${companyId} 중대성 평가 중간 결과 보기` : '중대성 평가 중간 결과 보기'}
      </h2>

      {/* 액션 버튼들 */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <button
          onClick={() => {
            markUserActivity(); // 사용자 활동 기록
            handleViewReport(searchResult, setIsIssuepoolLoading, setIssuepoolData);
          }}
          disabled={!searchResult?.data || isIssuepoolLoading}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
            !searchResult?.data || isIssuepoolLoading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
          }`}
        >
          {isIssuepoolLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              조회 중...
            </span>
          ) : (
            '📊 지난 중대성 평가 목록 보기'
          )}
        </button>
        
        <button // 새로운 중대성 평가 시작 버튼 
        id="start-materiality-assessment"
          
          onClick={async () => {
            // 1. 데이터 검증 강화
            if (!searchResult?.data) {
              alert('먼저 미디어 검색을 완료해주세요.');
              return;
            }

            // 2. articles 데이터 존재 여부 확인
            if (!searchResult.data.articles || searchResult.data.articles.length === 0) {
              alert('검색된 기사가 없습니다. 미디어 검색을 먼저 완료해주세요.');
              return;
            }


            // 로딩 상태 시작
            setIsAssessmentStarting(true);
            markUserActivity(); // 사용자 활동 기록

            console.log('🔍 searchResult.data:', searchResult.data);



            try {
              // 3. 기사 데이터 구조 검증 및 안전한 매핑
              const formattedArticles = searchResult.data.articles.map((article: any) => {
                // article 객체의 각 필드가 undefined일 수 있으므로 안전하게 처리
                return {
                  company: article?.company || searchResult.data.company_id || '',
                  issue: article?.issue || '',
                  original_category: article?.original_category || '',
                  query_kind: article?.query_kind || '',
                  keyword: article?.keyword || '',
                  title: article?.title || '',
                  description: article?.description || '',
                  pubDate: article?.pubDate || '',
                  originallink: article?.originallink || ''
                };
              });

              const requestData = {
                company_id: searchResult.data.company_id,
                report_period: searchResult.data.search_period,
                request_type: 'middleissue_assessment',
                timestamp: new Date().toISOString(),
                articles: formattedArticles,
                total_results: searchResult.data.total_results || 0
              };

              console.log('🚀 중대성 평가 요청 데이터:', requestData);

              // Gateway를 통해 materiality-service 호출
              const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
              const response = await axios.post(
                `${gatewayUrl}/api/v1/materiality-service/middleissue/assessment`,
                requestData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  timeout: 120000  // 2분 타임아웃 설정
                }
              );

              if (response.data.success) {
                // 4. 응답 데이터 구조 통일 - response.data.data가 우선, 없으면 response.data 사용
                const responseData = response.data.data || response.data;
                console.log('🔍 전체 응답 데이터:', response.data);
                console.log('🔍 사용할 응답 데이터:', responseData);
                
                // 매칭된 카테고리 정보 확인
                const rawCategories = responseData.matched_categories || [];
                console.log('🔍 원본 matched_categories:', rawCategories);
                
                // 뉴스 데이터에서 추출된 카테고리 정보를 기존 API와 연결
                const matchedCategories = await connectWithExistingCategories(rawCategories);
                console.log('🔍 연결된 matched_categories:', matchedCategories);
                
                // 미분류 카테고리 제외
                const filteredCategories = matchedCategories.filter(category => 
                  category.category !== '미분류' && 
                  category.esg_classification !== '미분류'
                );
                console.log('🔍 미분류 제외 후 카테고리:', filteredCategories);
                
                if (filteredCategories && filteredCategories.length > 0) {
                  console.log('✅ 중대성 평가 완료 - 필터링된 카테고리:', filteredCategories);
                  
                  // 5. 통일된 데이터 구조로 상태 저장 (필터링된 카테고리 사용)
                  const filteredResponseData = {
                    ...responseData,
                    matched_categories: filteredCategories
                  };
                  setAssessmentResult(filteredResponseData);
                  console.log('🔍 assessmentResult 상태 설정 (미분류 제외):', filteredResponseData);
                  
                  // localStorage에 자동 저장 (필터링된 카테고리 사용)
                  try {
                    const dataToSave = {
                      assessment_result: {
                        company_id: searchResult.data.company_id,
                        search_period: searchResult.data.search_period,
                        matched_categories: filteredCategories
                      },
                      company_id: searchResult.data.company_id,
                      timestamp: new Date().toISOString(),
                      total_categories: filteredCategories.length,
                      categories_with_base_issue_pool: 0,
                      display_category_count: displayCategoryCount
                    };
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
                    }
                    console.log('💾 중대성 평가 결과 자동 저장 완료 (미분류 제외)');
                  } catch (storageError) {
                    console.error('❌ 자동 저장 실패:', storageError);
                  }
                  
                  // 간단한 완료 메시지만 표시
                  alert(`✅ 중간 중대성 평가 완료\n\n📊 유효한 카테고리: ${filteredCategories.length}개\n🚫 미분류 제외: ${matchedCategories.length - filteredCategories.length}개`);
                } else {
                  console.log('⚠️ 필터링 후 유효한 카테고리가 없음');
                  console.log(`🔍 원본 카테고리 수: ${matchedCategories.length}개`);
                  console.log(`🔍 미분류 제외 후: ${filteredCategories.length}개`);
                  
                  // 6. 빈 결과도 상태에 저장하여 UI에서 처리할 수 있도록 함
                  const emptyResponseData = {
                    ...responseData,
                    matched_categories: []
                  };
                  setAssessmentResult(emptyResponseData);
                  
                  // 빈 결과도 localStorage에 자동 저장
                  try {
                    const dataToSave = {
                      assessment_result: {
                        company_id: searchResult.data.company_id,
                        search_period: searchResult.data.search_period,
                        matched_categories: []
                      },
                      company_id: searchResult.data.company_id,
                      timestamp: new Date().toISOString(),
                      total_categories: 0,
                      categories_with_base_issue_pool: 0,
                      display_category_count: displayCategoryCount
                    };
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
                    }
                    console.log('💾 빈 중대성 평가 결과 자동 저장 완료');
                  } catch (storageError) {
                    console.error('❌ 빈 결과 자동 저장 실패:', storageError);
                  }
                  
                  alert(`✅ 중간 중대성 평가 완료\n\n📊 원본 카테고리: ${matchedCategories.length}개\n🚫 미분류 제외: ${matchedCategories.length}개\n\n유효한 카테고리가 없습니다.`);
                }
              } else {
                console.log('❌ 응답 실패:', response.data);
                alert('❌ 중대성 평가 시작에 실패했습니다: ' + (response.data.message || '알 수 없는 오류'));
              }
            } catch (error: any) {
              console.error('❌ 중대성 평가 시작 중 오류:', error);
              
              // Railway 로그 레이트 리밋 관련 에러 처리
              if (error.response?.status === 500) {
                let errorMessage = '❌ 서버 내부 오류가 발생했습니다.\n\n';
                
                if (error.response?.data?.message?.includes('rate limit')) {
                  errorMessage += '🚨 Railway 로그 레이트 리밋에 도달했습니다.\n';
                  errorMessage += '잠시 후 다시 시도해주세요.';
                } else {
                  errorMessage += '🔧 서버에서 처리 중 오류가 발생했습니다.\n';
                  errorMessage += '잠시 후 다시 시도하거나 관리자에게 문의해주세요.';
                }
                
                alert(errorMessage);
              } else if (error.code === 'ECONNABORTED') {
                alert('⏰ 요청 시간이 초과되었습니다.\n\n서버가 과부하 상태일 수 있습니다.\n잠시 후 다시 시도해주세요.');
              } else if (error.response?.status >= 500) {
                alert('🚨 서버 오류가 발생했습니다.\n\nRailway 환경에서 일시적인 문제가 있을 수 있습니다.\n잠시 후 다시 시도해주세요.');
              } else {
                alert('❌ 중대성 평가 시작 중 오류가 발생했습니다.\n\n' + (error.message || '알 수 없는 오류'));
              }
            } finally {
              // 로딩 상태 종료 (성공/실패 상관없이)
              setIsAssessmentStarting(false);
            }
          }}
          disabled={isAssessmentStarting}
          className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl ${
            isAssessmentStarting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isAssessmentStarting ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              <span>중간 중대성 평가 진행 중...</span>
            </>
          ) : (
            <>
              <span className="mr-2">🚀</span>
              <span>새로운 중대성 평가 시작</span>
            </>
          )}
        </button>



        
                 {/* 내용 지우기 버튼 */}
         <button
           onClick={() => {
             const clearContent = () => {
               // 화면상의 내용만 초기화 (localStorage는 유지)
               setIssuepoolData(null);
               setAssessmentResult(null);
               
               console.log('🧹 화면 내용 지우기 완료 (localStorage 유지)');
               alert('✅ 화면 내용이 지워졌습니다.\n\n불러오기 버튼을 눌러서 저장된 데이터를 다시 표시할 수 있습니다.');
             };

             const confirmed = confirm(
               '중대성 평가 중간 결과와 관련된 이후의 모든 활동이 초기화 됩니다.\n\n' +
               '화면상의 모든 내용이 지워지며, 저장된 데이터는 유지됩니다.\n\n' +
               '계속 진행하시겠습니까?'
             );
             
             if (confirmed) {
               clearContent();
             }
           }}
           className="px-6 py-3 rounded-lg font-medium transition-all duration-200 bg-gray-500 hover:bg-gray-600 text-white shadow-lg hover:shadow-xl"
           title="화면 내용을 지웁니다 (저장된 데이터는 유지)"
         >
           🧹 내용 지우기
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 첫 번째 섹션: year-2년 */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800">
              {issuepoolData ? `${issuepoolData.year_minus_2?.year}년` : 'year-2년'}
            </h3>
          </div>
        
        {issuepoolData?.year_minus_2 ? (
          <div className="space-y-2">
            {issuepoolData.year_minus_2.issuepools.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center text-sm">
                <span className="w-6 h-6 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  {item.ranking}
                </span>
                <span className="text-gray-700 flex-1 truncate">{item.base_issue_pool}</span>
                {/* ESG Classification 라벨 추가 */}
                <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {item.esg_classification_name ?? "미분류"}
                </span>
              </div>
            ))}
            <div className="text-center text-xs text-gray-500 mt-3">
              총 {issuepoolData.year_minus_2.total_count}개 항목
            </div>

            {/* ESG 분류 막대그래프 추가 */}
            {issuepoolData.year_minus_2.issuepools.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-700 mb-3">ESG 분류 비율</h4>
                {(() => {
                  // 백엔드에서 계산된 ESG 분포 데이터 사용
                  const esgDistribution = issuepoolData.year_minus_2.esg_distribution;
                  
                  if (!esgDistribution) {
                    return <div className="text-sm text-gray-500">ESG 분포 데이터가 없습니다.</div>;
                  }
                  
                  // ESG 분류별로 막대그래프 렌더링
                  return Object.entries(esgDistribution).map(([esgName, data]: [string, any]) => {
                    // ESG 분류에 따른 색상 결정
                    let barColor = 'bg-gray-500'; // 기본 색상
                    if (esgName.includes('환경')) {
                      barColor = 'bg-green-500';
                    } else if (esgName.includes('사회')) {
                      barColor = 'bg-orange-500';
                    } else if (esgName.includes('지배구조') || esgName.includes('경제')) {
                      barColor = 'bg-blue-500';
                    }
                    
                    return (
                      <div key={esgName} className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{esgName} ({(data as any).count}개)</span>
                          <span>{(data as any).percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`${barColor} h-2.5 rounded-full`}
                            style={{ width: `${(data as any).percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            여기에 내용을 추가하세요
          </div>
        )}
      </div>

      {/* 두 번째 섹션: year-1년 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">
            {issuepoolData ? `${issuepoolData.year_minus_1?.year}년` : 'year-1년'}
          </h3>
        </div>
        
        {issuepoolData?.year_minus_1 ? (
          <div className="space-y-2">
            {issuepoolData.year_minus_1.issuepools.map((item: any, index: number) => (
              <div key={item.id} className="flex items-center text-sm">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                  {item.ranking}
                </span>
                <span className="text-gray-700 flex-1 truncate">{item.base_issue_pool}</span>
                {/* ESG Classification 라벨 추가 */}
                <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                  {item.esg_classification_name ?? "미분류"}
                </span>
              </div>
            ))}
            <div className="text-center text-xs text-gray-500 mt-3">
              총 {issuepoolData.year_minus_1.total_count}개 항목
            </div>

            {/* ESG 분류 막대그래프 추가 */}
            {issuepoolData.year_minus_1.issuepools.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h4 className="text-md font-semibold text-gray-700 mb-3">ESG 분류 비율</h4>
                {(() => {
                  // 백엔드에서 계산된 ESG 분포 데이터 사용
                  const esgDistribution = issuepoolData.year_minus_1.esg_distribution;
                  
                  if (!esgDistribution) {
                    return <div className="text-sm text-gray-500">ESG 분포 데이터가 없습니다.</div>;
                  }
                  
                  // ESG 분류별로 막대그래프 렌더링
                  return Object.entries(esgDistribution).map(([esgName, data]: [string, unknown]) => {
                    // 타입 안전성을 위한 타입 가드
                    const typedData = data as { count: number; percentage: number };
                    
                    // ESG 분류에 따른 색상 결정
                    let barColor = 'bg-gray-500'; // 기본 색상
                    if (esgName.includes('환경')) {
                      barColor = 'bg-green-500';
                    } else if (esgName.includes('사회')) {
                      barColor = 'bg-orange-500';
                    } else if (esgName.includes('지배구조') || esgName.includes('경제')) {
                      barColor = 'bg-blue-500';
                    }
                    
                    return (
                      <div key={esgName} className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>{esgName} ({typedData.count}개)</span>
                          <span>{typedData.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`${barColor} h-2.5 rounded-full`}
                            style={{ width: `${typedData.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 text-sm">
            여기에 내용을 추가하세요
          </div>
        )}
      </div>

      {/* 가중치 설정 패널 */}
      <WeightSettingsPanel
        weights={weights}
        onChange={handleWeightChange}
        onReset={handleWeightReset}
        isLoading={isWeightUpdateLoading}
      />

      {/* 세 번째 섹션: 1차 중대성 평가 결과 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800">중대성 평가 중간 결과</h3>
          <p className="text-sm text-gray-500 mt-1">카테고리별로 세부 이슈를 선택하세요</p>
        </div>
        
        {assessmentResult ? (
          <div className="space-y-4">
            {/* 카테고리 개수 선택 */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-blue-700 mb-1">저장할 카테고리 개수 선택</h4>
                </div>
                <div className="flex items-center space-x-3">
                  <label className="text-sm font-medium text-blue-700">개수:</label>
                  <select
                    value={displayCategoryCount}
                    onChange={(e) => setDisplayCategoryCount(parseInt(e.target.value))}
                    className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold text-gray-900"
                  >
                    <option value={0}>전체</option>
                    {(() => {
                      const resultData = assessmentResult?.data || assessmentResult;
                      const categories = resultData?.matched_categories || [];
                      return Array.from({ length: categories.length }, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num}개</option>
                      ));
                    })()}
                  </select>
                </div>
              </div>
            </div>
            
            {/* 전체 카테고리 목록 */}
            {(() => {
              // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
              const resultData = assessmentResult?.data || assessmentResult;
              const categories = resultData?.matched_categories || [];
              
              // 선택된 개수만큼만 표시 (0이면 전체)
              const displayCategories = displayCategoryCount > 0 
                ? categories.slice(0, displayCategoryCount)
                : categories;
              
              if (categories.length > 0) {
                return (
                  <div id="middle_issuepool" className="space-y-2">
                    {displayCategories.map((cat: any, index: number) => (
                      <div key={index} className="flex items-center text-sm group">
                        <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">
                          {cat.rank || index + 1}
                        </span>
                        <div className="flex-1">
                          <span 
                            className="text-gray-700 cursor-pointer hover:text-blue-600 hover:underline font-medium"
                            onClick={() => {
                              // 카테고리 클릭 시 base issue pool 선택 모달 열기
                              setSelectedCategory(cat);
                              setEditingCategoryIndex(index);
                              
                              // 실제 데이터에서 base issue pool 옵션 가져오기
                              const baseIssuePools = cat.base_issuepools || [];
                              if (baseIssuePools.length > 0) {
                                // base_issue_pool 필드가 있는 경우 해당 값들을 사용하고 중복 제거
                                const options = baseIssuePools
                                  .map((item: { base_issue_pool?: string; issue?: string }) => 
                                    (item.base_issue_pool || item.issue || '항목명 없음').trim()
                                  )
                                  // 빈 문자열이나 공백만 있는 항목 제거
                                  .filter((option: string): boolean => option !== '')
                                  // 중복 제거: 대소문자 무시하고 공백 정규화하여 비교
                                  .filter((option: string, index: number, array: string[]) => {
                                    // 현재 항목을 정규화 (대소문자 무시, 연속된 공백을 하나로)
                                    const normalizedOption: string = option.toLowerCase().replace(/\s+/g, ' ');
                                    // 이전 항목들 중에 정규화했을 때 같은 것이 있는지 확인
                                    return array.findIndex((item: string): boolean => 
                                      item.toLowerCase().replace(/\s+/g, ' ') === normalizedOption
                                    ) === index;
                                  })
                                  // 알파벳 순으로 정렬
                                  .sort((a: string, b: string): number => a.localeCompare(b));
                                
                                console.log('🔍 Base Issue Pool 옵션 (중복 제거 후):', options);
                                setBaseIssuePoolOptions(options);
                              } else {
                                // base_issuepools가 없는 경우 기본 옵션 제공
                                setBaseIssuePoolOptions([
                                  `${cat.category} 관련 이슈 1`,
                                  `${cat.category} 관련 이슈 2`,
                                  `${cat.category} 관련 이슈 3`
                                ]);
                              }
                              setSelectedBaseIssuePool('');
                              setIsBaseIssuePoolModalOpen(true);
                            }}
                            title="클릭하여 base issue pool 선택"
                          >
                            {cat.category || '카테고리명 없음'}
                          </span>
                          {/* 선택된 base issue pool 표시 */}
                          {cat.selected_base_issue_pool && (
                            <div className="text-xs text-blue-600 mt-1">
                              📋 선택된 항목: {cat.selected_base_issue_pool}
                            </div>
                          )}
                        </div>
                        {/* ESG Classification 라벨 추가 */}
                        <span className="ml-2 px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">
                          {cat.esg_classification || "미분류"}
                        </span>
                        {/* 사용자 추가 카테고리 표시 */}
                        {cat.is_user_added && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
                            사용자 추가
                          </span>
                        )}
                        {/* 삭제 버튼 - 사용자가 추가한 카테고리만 삭제 가능 */}
                        {cat.is_user_added && (
                          <button
                            onClick={() => {
                              if (confirm(`정말로 "${cat.category}" 카테고리를 삭제하시겠습니까?`)) {
                                // 해당 카테고리 삭제
                                const resultData = assessmentResult?.data || assessmentResult;
                                const updatedCategories = [...(resultData?.matched_categories || [])];
                                updatedCategories.splice(index, 1);
                                
                                // 순위 재정렬
                                updatedCategories.forEach((category, idx) => {
                                  category.rank = idx + 1;
                                });
                                
                                // 상태 업데이트
                                if (assessmentResult?.data) {
                                  setAssessmentResult({
                                    ...assessmentResult,
                                    data: {
                                      ...assessmentResult.data,
                                      matched_categories: updatedCategories
                                    }
                                  });
                                } else {
                                  setAssessmentResult({
                                    ...assessmentResult,
                                    matched_categories: updatedCategories
                                  });
                                }
                                
                                alert(`✅ "${cat.category}" 카테고리가 삭제되었습니다.`);
                              }
                            }}
                            className="ml-3 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all duration-200"
                            title="이 카테고리 삭제 (사용자 추가 카테고리)"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                    <div className="text-center text-xs text-gray-500 mt-3">
                      {displayCategoryCount > 0 
                        ? `표시: ${displayCategories.length}개 / 전체: ${categories.length}개 항목`
                        : `총 ${categories.length}개 항목`
                      }
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* ESG 분류 막대그래프 */}
            {(() => {
              // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
              const resultData = assessmentResult?.data || assessmentResult;
              const categories = resultData?.matched_categories || [];
              
              // 선택된 개수만큼만 표시 (0이면 전체)
              const displayCategories = displayCategoryCount > 0 
                ? categories.slice(0, displayCategoryCount)
                : categories;
              
              if (categories.length > 0) {
                return (
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">ESG 분류 비율</h4>
                    {(() => {
                      // ESG 분류별로 카운트 계산 (지배구조와 경제를 합침)
                      const esgCounts: { [key: string]: number } = {};
                      displayCategories.forEach((cat: any) => {
                        let esgName = cat.esg_classification || '미분류';
                        
                        // 지배구조와 경제를 지배구조/경제로 통합
                        if (esgName.includes('지배구조') || esgName.includes('경제')) {
                          esgName = '지배구조/경제';
                        }
                        
                        esgCounts[esgName] = (esgCounts[esgName] || 0) + 1;
                      });

                      // 비율 계산
                      const total = displayCategories.length;
                      const esgDistribution = Object.entries(esgCounts).map(([esgName, count]) => ({
                        name: esgName,
                        count,
                        percentage: Math.round((count / total) * 100)
                      }));

                      // ESG 분류별로 막대그래프 렌더링
                      return esgDistribution.map((data) => {
                        // ESG 분류에 따른 색상 결정
                        let barColor = 'bg-gray-500'; // 기본 색상
                        if (data.name.includes('환경')) {
                          barColor = 'bg-green-500';
                        } else if (data.name.includes('사회')) {
                          barColor = 'bg-orange-500';
                        } else if (data.name.includes('지배구조/경제')) {
                          barColor = 'bg-blue-500';
                        }
                        
                        return (
                          <div key={data.name} className="mb-2">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>{data.name} ({data.count}개)</span>
                              <span>{data.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                              <div
                                className={`${barColor} h-2.5 rounded-full`}
                                style={{ width: `${data.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                );
              }
              return null;
            })()}

            {/* 더보기 버튼 */}
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center space-x-3">
                {/* 저장 버튼 */}
                <button
                  onClick={saveAssessmentResult}
                  disabled={!assessmentResult}
                  className={`inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md transition-colors duration-200 ${
                    assessmentResult
                      ? 'border-blue-300 text-blue-700 bg-white hover:bg-blue-50'
                      : 'border-gray-300 text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                  title={assessmentResult ? '중대성 평가 결과를 저장합니다' : '저장할 결과가 없습니다'}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  저장
                </button>
                
                {/* 중대성 평가 결과 불러오기 버튼 */}
                <button
                  onClick={() => {
                    markUserActivity(); // 사용자 활동 기록
                    loadAssessmentResult(setAssessmentResult, () => {}, () => {}, () => {}, setDisplayCategoryCount);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
                  title="저장된 중대성 평가 결과를 불러옵니다"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  불러오기
                </button>
                
                
                
                {/* 추가하기 버튼 */}
                <button
                  onClick={() => {
                    fetchAllCategories(setAllCategories);
                    setIsAddCategoryModalOpen(true);
                  }}
                  className="inline-flex items-center px-4 py-2 border border-orange-300 text-sm font-medium rounded-md text-orange-700 bg-white hover:bg-orange-50 transition-colors duration-200"
                  title="새로운 카테고리를 추가합니다"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  추가하기
                </button>
              </div>
              
              {/* 중간 평가 과정 확인하기 버튼 */}
              <div className="mt-3">
                <button
                  onClick={() => {
                    // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
                    const resultData = assessmentResult?.data || assessmentResult;
                    const categories = resultData?.matched_categories || [];
                    
                    if (categories.length > 0) {
                      setIsDetailModalOpen(true);
                    }
                  }}
                  disabled={(() => {
                    // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
                    const resultData = assessmentResult?.data || assessmentResult;
                    const categories = resultData?.matched_categories || [];
                    return categories.length === 0;
                  })()}
                  className={`inline-flex items-center px-6 py-3 border border-green-300 text-sm font-medium rounded-md transition-colors duration-200 ${
                    (() => {
                      // 데이터 구조 통일: assessmentResult.data가 우선, 없으면 assessmentResult 직접 사용
                      const resultData = assessmentResult?.data || assessmentResult;
                      const categories = resultData?.matched_categories || [];
                      return categories.length > 0;
                    })()
                      ? 'text-green-700 bg-white hover:bg-green-50'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  중간 평가 과정 확인하기
                </button>
              </div>


            </div>
          </div>
                 ) : (
           <div className="space-y-4">
             <div className="text-center text-gray-500 text-sm mb-4">
               새로운 중대성 평가를 시작하면 여기에 결과가 표시됩니다.
             </div>
             
             {/* 중대성 평가 결과 불러오기 버튼 - 결과가 없어도 항상 표시 */}
             <div className="text-center">
               <button
                 onClick={() => {
                   markUserActivity(); // 사용자 활동 기록
                   loadAssessmentResult(setAssessmentResult, () => {}, () => {}, () => {}, setDisplayCategoryCount);
                 }}
                 className="inline-flex items-center px-4 py-2 border border-purple-300 text-sm font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50 transition-colors duration-200"
                 title="저장된 중대성 평가 결과를 불러옵니다"
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
                 불러오기
               </button>
             </div>
           </div>
         )}
       </div>
     </div>
   </div>
   );
 };

export default FirstAssessment;
