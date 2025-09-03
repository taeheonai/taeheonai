'use client';

import React, { useState, ChangeEvent, useEffect } from 'react';
import NavigationTabs from '@/component/NavigationTabs';
import { MediaCard, MediaItem } from '@/component/MediaCard';
import IndexBar from '@/component/IndexBar';
import { useMediaStore } from '@/store/mediaStore';
import { IssuepoolData } from "../../lib/types";
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useExcelDataStore } from '@/store/excelDataStore';
import FinalIssuepool from '@/component/materiality/box/final_issuepool';
import MediaSearch from '@/component/materiality/box/media_search';
import SearchResult from '@/component/materiality/box/media_search_result';
import FirstAssessment from '@/component/materiality/box/middle_issuepool';
import SurveyUpload from '@/component/materiality/box/survey_upload';
import SurveyCreate from '@/component/materiality/box/survey_create';
import SurveyManagement from '@/component/materiality/box/survey_send';
import SurveyResult from '@/component/materiality/box/survey_result';
import Finish from '@/component/materiality/box/finish';
import { handleViewReport } from '@/component/materiality/handle_view_report';
import { loadAssessmentResult } from '@/component/materiality/load_assessment_result';
import { fetchAllCategories } from '@/component/materiality/fetch_all_categories';

import { addNewCategory } from '@/component/materiality/add_new_category';
import { getESGClassification } from '@/component/materiality/get_esg_classification';



export default function MaterialityHomePage() {
  // Zustand store 사용
  const {
    loading: isMediaSearching,
    error,
    companyId,
    searchPeriod,
    articles,
    totalResults,
    setCompanyId,
    setSearchPeriod,
    setLoading,
    searchMedia,
    reset: resetMediaSearch
  } = useMediaStore();

  // 기업 관련 상태
  const [companies, setCompanies] = useState<string[]>([]);
  const [isCompanyLoading, setIsCompanyLoading] = useState(false);
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // 검색 결과 관련 상태
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearchResultCollapsed, setIsSearchResultCollapsed] = useState(false);
  const [isFullResultCollapsed, setIsFullResultCollapsed] = useState(true);

  // 엑셀 파일 관련 상태 (Zustand store 사용)
  const {
    excelData,
    isValid: isExcelValid,
    fileName: excelFilename,
    base64Data: excelBase64,

    // 설문 대상 업로드 전용
    surveyUploadData,
    surveyUploadIsValid,

    // setter들
    setExcelData,
    setIsValid: setIsExcelValid,
    setExcelFilename,
    setExcelBase64,

    setSurveyUploadData,
    setSurveyUploadsValid,

    // 행 관리
    updateSurveyUploadRow,
    deleteSurveyUploadRow,

    reset,
    loadFromStorage,
    saveToLocalStorage,
    loadUploadedExcelData,
    loadSurveyUploadData
  } = useExcelDataStore();

  // 화면 표시 제어를 위한 별도 상태
  const [isDataHidden, setIsDataHidden] = useState(true); // 처음 접속 시 데이터 숨김
  
  // 사용자 활동 감지하여 데이터 표시
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasUserActivity = localStorage.getItem('hasUserActivity');
    if (hasUserActivity) {
      setIsDataHidden(false);
      console.log('✅ 사용자 활동 감지: 데이터 표시 활성화');
    }
  }, []);
  
  // 모달 상태
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // base issue pool 선택 모달 상태
  const [isBaseIssuePoolModalOpen, setIsBaseIssuePoolModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [baseIssuePoolOptions, setBaseIssuePoolOptions] = useState<string[]>([]);
  const [selectedBaseIssuePool, setSelectedBaseIssuePool] = useState<string>('');
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number>(-1);
  
  // 새로운 카테고리 추가 모달 상태
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [selectedNewCategory, setSelectedNewCategory] = useState<string>('');
  
  // 지난 중대성 평가 목록 상태
  const [previousAssessments, setPreviousAssessments] = useState<any[]>([]);
  const [isPreviousAssessmentsCollapsed, setIsPreviousAssessmentsCollapsed] = useState(false);
  const [newCategoryRank, setNewCategoryRank] = useState<string>('');
  const [newBaseIssuePool, setNewBaseIssuePool] = useState<string>('');
  
  // 리셋 확인 모달 상태
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // 세션 스토리지 관련 함수들
  const saveToSessionStorage = (key: string, data: any) => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('세션 스토리지 저장 실패:', error);
    }
  };
  
  const loadFromSessionStorage = (key: string) => {
    if (typeof window === 'undefined') return null;

    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('세션 스토리지 로드 실패:', error);
      return null;
    }
  };
  const [isCustomBaseIssuePool, setIsCustomBaseIssuePool] = useState(false);
  const [customBaseIssuePoolText, setCustomBaseIssuePoolText] = useState<string>('');
  const [displayCategoryCount, setDisplayCategoryCount] = useState<number>(0);
  const [visibleSection, setVisibleSection] = useState<string>('media-search'); // 기본적으로 미디어 검색 섹션 표시
  const [completedSteps, setCompletedSteps] = useState<string[]>([]); // 완료된 단계들
  const [maxReachedStep, setMaxReachedStep] = useState<string>('media-search'); // 최대 도달한 단계

  // 단계별 순서 정의
  const stepOrder = [
    'media-search',
    'middle-issuepool', 
    'survey-create',
    'survey-upload',
    'survey-send',
    'survey-results',
    'final-issuepool',
    'finish'
  ];

  // 현재 상태 저장 함수
  const saveCurrentState = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const currentState = {
        visibleSection,
        completedSteps,
        maxReachedStep,
        companyId,
        searchPeriod,
        searchResult,
        assessmentResult,
        surveyResult,
        excelData,
        surveyUploadData,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('materialityProgressState', JSON.stringify(currentState));
      console.log('💾 현재 상태 저장 완료:', currentState);
    } catch (error) {
      console.error('❌ 상태 저장 실패:', error);
    }
  };

  // 다음 단계로 이동 함수
  const moveToNextStep = () => {
    const currentIndex = stepOrder.indexOf(visibleSection);
    if (currentIndex < stepOrder.length - 1) {
      const nextStep = stepOrder[currentIndex + 1];
      
      // 현재 단계를 완료된 단계에 추가
      if (!completedSteps.includes(visibleSection)) {
        setCompletedSteps(prev => [...prev, visibleSection]);
      }
      
      // 최대 도달 단계 업데이트
      setMaxReachedStep(nextStep);
      
      // 다음 단계로 이동
      setVisibleSection(nextStep);
      
      // IndexBar에 섹션 변경 이벤트 발생
      const sectionChangeEvent = new CustomEvent('sectionChange', { 
        detail: { 
          sectionId: nextStep,
          completedSteps: [...completedSteps, visibleSection],
          maxReachedStep: nextStep
        } 
      });
      window.dispatchEvent(sectionChangeEvent);
      
      console.log('✅ 다음 단계로 이동:', nextStep);
    } else {
      console.log('🎉 모든 단계 완료!');
    }
  };

  // 저장된 상태 복원 함수
  const restoreSavedState = () => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedState = localStorage.getItem('materialityProgressState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setVisibleSection(parsedState.visibleSection || 'media-search');
        setCompletedSteps(parsedState.completedSteps || []);
        setMaxReachedStep(parsedState.maxReachedStep || 'media-search');
        
        // 다른 상태들도 복원
        if (parsedState.companyId) setCompanyId(parsedState.companyId);
        if (parsedState.searchPeriod) setSearchPeriod(parsedState.searchPeriod);
        if (parsedState.searchResult) setSearchResult(parsedState.searchResult);
        if (parsedState.assessmentResult) setAssessmentResult(parsedState.assessmentResult);
        if (parsedState.surveyResult) setSurveyResult(parsedState.surveyResult);
        
        console.log('🔄 저장된 상태 복원 완료:', parsedState);
      }
    } catch (error) {
      console.error('❌ 상태 복원 실패:', error);
    }
  };

  // 모든 데이터 리셋 함수
  const resetAllData = async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // localStorage의 모든 중대성 평가 관련 데이터 삭제
      const keysToRemove = [
        // 기본 진행 상태 및 결과
        'materialityProgressState',
        'materialityAssessmentResult',
        'surveyResult',
        'excelUploadData',
        'surveyUploadData',
        'savedMediaSearch',
        'hasUserActivity',
        
        // 설문 관련 데이터
        'sentSurveyInfo',
        'surveyStatsInfo',
        'sentRecipients',
        'surveyResponses',
        'backendSurveyResponses',
        'materialitySearchResult',
        
        // 동적으로 생성되는 설문 키들 (companyId 기반)
        ...(companyId ? [
          `surveyList_${companyId}`,
          `surveyData_${companyId}`,
          `selectedSurveyId_${companyId}`
        ] : [])
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 동적으로 생성되는 키들도 삭제 (companyId가 없는 경우를 대비)
      if (companyId) {
        // 특정 companyId 기반 키들
        const dynamicKeys = [
          `surveyList_${companyId}`,
          `surveyData_${companyId}`,
          `selectedSurveyId_${companyId}`
        ];
        dynamicKeys.forEach(key => {
          localStorage.removeItem(key);
        });
      }
      
      // 모든 surveyList_ 및 surveyData_ 키 삭제 (companyId 무관)
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.startsWith('surveyList_') || 
            key.startsWith('surveyData_') || 
            key.startsWith('selectedSurveyId_')) {
          localStorage.removeItem(key);
        }
      });
      
      // sessionStorage의 모든 중대성 평가 관련 데이터 삭제
      const sessionKeysToRemove = [
        'materiality_searchResult',
        'materiality_previousAssessments',
        'materiality_searchResultCollapsed',
        'materiality_fullResultCollapsed',
        'materiality_previousAssessmentsCollapsed'
      ];
      
      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });
      
      // Zustand store 초기화
      reset(); // excelDataStore reset
      resetMediaSearch(); // mediaStore reset
      
      // 컴포넌트 상태 초기화
      setVisibleSection('media-search');
      setCompletedSteps([]);
      setMaxReachedStep('media-search');
      setSearchResult(null);
      setAssessmentResult({
        matched_categories: [],
        total_articles: 0,
        negative_articles: 0,
        negative_ratio: 0,
        total_categories: 0
      });
      setSurveyResult(null);
      setDisplayCategoryCount(0);
      setIsDataHidden(true);
      
      // IndexBar에 상태 변경 이벤트 발생
      const sectionChangeEvent = new CustomEvent('sectionChange', { 
        detail: { 
          sectionId: 'media-search',
          completedSteps: [],
          maxReachedStep: 'media-search'
        } 
      });
      window.dispatchEvent(sectionChangeEvent);
      
      console.log('🔄 모든 데이터 리셋 완료');
      console.log('🗑️ 삭제된 localStorage 키들:', keysToRemove);

      // DB에서 설문 데이터 다시 로드
      try {
        if (companyId) {
          // 1. 설문 목록 조회
          const surveysResponse = await fetch(`/api/v1/materiality-service/surveys/company/${companyId}`);
          if (surveysResponse.ok) {
            const surveysData = await surveysResponse.json();
            if (surveysData.surveys && surveysData.surveys.length > 0) {
              // 가장 최근 설문을 현재 설문으로 설정
              const latestSurvey = surveysData.surveys[0];
              setSurveyResult({
                survey_id: latestSurvey.id,
                content_hash: latestSurvey.content_hash,
                created_at: latestSurvey.created_at,
                categoryCount: latestSurvey.category_count
              });

              // 2. 최근 설문의 응답 데이터 조회
              const responsesResponse = await fetch(`/api/v1/materiality-service/surveys/${latestSurvey.id}/responses`);
              if (responsesResponse.ok) {
                const responsesData = await responsesResponse.json();
                // backendSurveyResponses 키에 저장 (final_issuepool.tsx에서 사용)
                if (typeof window !== 'undefined') {
                  localStorage.setItem('backendSurveyResponses', JSON.stringify(responsesData.responses || []));
                }
              }

              alert(
                '✅ 로컬 데이터가 초기화되었습니다.\n\n' +
                '💡 기존에 생성된 설문 데이터는 유지됩니다:\n' +
                `• 최근 설문 ID: ${latestSurvey.id}\n` +
                `• 생성일: ${new Date(latestSurvey.created_at).toLocaleDateString()}\n` +
                `• 문항 수: ${latestSurvey.category_count}개\n\n` +
                '이제 미디어 검색부터 다시 시작하세요.'
              );
            } else {
              alert('✅ 모든 데이터가 초기화되었습니다. 미디어 검색부터 다시 시작하세요.');
            }
          }
        } else {
          alert('✅ 모든 데이터가 초기화되었습니다. 미디어 검색부터 다시 시작하세요.');
        }
      } catch (loadError) {
        console.error('❌ DB 데이터 로드 실패:', loadError);
        alert('✅ 모든 데이터가 초기화되었습니다. 미디어 검색부터 다시 시작하세요.');
      }
      
    } catch (error) {
      console.error('❌ 데이터 리셋 실패:', error);
      alert('❌ 데이터 리셋 중 오류가 발생했습니다.');
    }
  };

  // 중대성 평가 관련 상태
  const [issuepoolData, setIssuepoolData] = useState<IssuepoolData | null>(null);
  const [isIssuepoolLoading, setIsIssuepoolLoading] = useState(false);
  const [isAssessmentStarting, setIsAssessmentStarting] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState<any>({
    matched_categories: [],
    total_articles: 0,
    negative_articles: 0,
    negative_ratio: 0,
    total_categories: 0
  });

  // 설문 결과 상태
  const [surveyResult, setSurveyResult] = useState<any>(null);

  // 섹션 변경 이벤트 감지 (IndexBar에서 발생)
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => {
      const sectionId = event.detail?.sectionId;
      if (sectionId) {
        setVisibleSection(sectionId);
      }
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener('sectionChange', handleSectionChange as EventListener);

    return () => {
      window.removeEventListener('sectionChange', handleSectionChange as EventListener);
    };
  }, []);

  // IndexBar에 상태 정보 전달
  useEffect(() => {
    const updateIndexBarState = () => {
      const sectionChangeEvent = new CustomEvent('sectionChange', { 
        detail: { 
          sectionId: visibleSection,
          completedSteps: completedSteps,
          maxReachedStep: maxReachedStep
        } 
      });
      window.dispatchEvent(sectionChangeEvent);
    };

    updateIndexBarState();
  }, [visibleSection, completedSteps, maxReachedStep]);

  // 로그인한 사용자의 기업 정보 가져오기
  useEffect(() => {
    const getUserCompany = () => {
      if (typeof window === 'undefined') return;

      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          if (user.company_id && !companyId) {
            setCompanyId(user.company_id);
            setCompanySearchTerm(user.company_id);
            console.log('✅ 로그인된 사용자의 기업명 설정:', user.company_id);
          }
        }
      } catch (error) {
        console.error('사용자 정보를 가져오는데 실패했습니다:', error);
      }
    };

    getUserCompany();
  }, [companyId]);

  // 페이지 로드 시 설문 대상 업로드 데이터와 displayCategoryCount 자동 불러오기
  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadSurveyUploadData();
    
    // displayCategoryCount 복원
    try {
      const savedResult = localStorage.getItem('materialityAssessmentResult');
      if (savedResult) {
        const parsedResult = JSON.parse(savedResult);
        if (parsedResult.display_category_count !== undefined) {
          setDisplayCategoryCount(parsedResult.display_category_count);
          console.log('💾 표시할 카테고리 개수 초기 복원:', parsedResult.display_category_count);
        }
      }
    } catch (error) {
      console.error('❌ 표시할 카테고리 개수 초기 복원 실패:', error);
    }
    
    // 저장된 진행 상태 복원
    restoreSavedState();
  }, []); // loadSurveyUploadData는 Zustand store에서 가져오므로 의존성 배열에서 제외

  // 설문 결과 데이터 로드 및 업데이트
  useEffect(() => {
    const loadSurveyResult = () => {
      if (typeof window === 'undefined') return;

      try {
        const savedSurveyResult = localStorage.getItem('surveyResult');
        if (savedSurveyResult) {
          const parsedResult = JSON.parse(savedSurveyResult);
          setSurveyResult(parsedResult);
          console.log('✅ 설문 결과 데이터 로드 완료:', parsedResult);
        }
      } catch (error) {
        console.error('❌ 설문 결과 데이터 로드 실패:', error);
      }
    };

    // 초기 로드
    loadSurveyResult();

    // localStorage 변경 감지를 위한 주기적 체크 (1초마다) - 실시간 db연결 해제
    // const intervalId = setInterval(loadSurveyResult, 1000);

    // return () => clearInterval(intervalId);
  }, []);

  // displayCategoryCount 변경 시 localStorage에 저장
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saveDisplayCategoryCount = () => {
      try {
        const savedResult = localStorage.getItem('materialityAssessmentResult');
        if (savedResult) {
          const parsedResult = JSON.parse(savedResult);
          parsedResult.display_category_count = displayCategoryCount;
          localStorage.setItem('materialityAssessmentResult', JSON.stringify(parsedResult));
          console.log('💾 표시할 카테고리 개수 저장:', displayCategoryCount);
        }
      } catch (error) {
        console.error('❌ 표시할 카테고리 개수 저장 실패:', error);
      }
    };

    // displayCategoryCount가 0이 아닐 때만 저장 (초기값 0은 저장하지 않음)
    if (displayCategoryCount !== 0) {
      saveDisplayCategoryCount();
    }
  }, [displayCategoryCount]);

  // 기업 목록 가져오기
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setIsCompanyLoading(true);
        console.log('🔍 기업 목록을 Gateway를 통해 가져오는 중...');
        
        // Gateway를 통해 materiality-service 호출 (GET 방식)
        const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
        const response = await axios.get(
          `${gatewayUrl}/api/v1/search/companies`,
          {
            headers: {
              'Content-Type': 'application/json',
            }
          }
        );

        console.log('✅ Gateway를 통한 기업 목록 API 응답:', response.data);

        if (response.data.success && response.data.companies) {
          const companyNames = response.data.companies.map((company: any) => company.companyname);
          setCompanies(companyNames);
          console.log(`✅ ${companyNames.length}개 기업 목록을 성공적으로 가져왔습니다.`);
          
          // 로그인된 사용자의 기업이 목록에 있는지 확인하고, 없다면 추가
          if (typeof window !== 'undefined') {
            const userData = localStorage.getItem('user');
            if (userData) {
              const user = JSON.parse(userData);
              if (user.company_id && !companyNames.includes(user.company_id)) {
                setCompanies(prev => [user.company_id, ...prev]);
                console.log('✅ 사용자 기업을 목록 맨 앞에 추가:', user.company_id);
              }
            }
          }
        } else {
          console.warn('⚠️ 기업 목록을 가져올 수 없습니다:', response.data);
        }
      } catch (error: any) {
        console.error('❌ Gateway를 통한 기업 목록 API 호출 실패 :', error);
        if (error.response) {
          console.error('응답 상태:', error.response.status);
          console.error('응답 데이터:', error.response.data);
        }
      } finally {
        setIsCompanyLoading(false);
      }
    };

    fetchCompanies();
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.company-dropdown-container')) {
        setIsCompanyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // 세션 스토리지에서 데이터 복원
  useEffect(() => {
    const savedSearchResult = loadFromSessionStorage('materiality_searchResult');
    const savedPreviousAssessments = loadFromSessionStorage('materiality_previousAssessments');
    const savedSearchResultCollapsed = loadFromSessionStorage('materiality_searchResultCollapsed');
    const savedFullResultCollapsed = loadFromSessionStorage('materiality_fullResultCollapsed');
    const savedPreviousAssessmentsCollapsed = loadFromSessionStorage('materiality_previousAssessmentsCollapsed');
    
    if (savedSearchResult) {
      setSearchResult(savedSearchResult);
      console.log('🔍 세션에서 검색 결과 복원됨');
    }
    
    if (savedPreviousAssessments) {
      setPreviousAssessments(savedPreviousAssessments);
      console.log('📋 세션에서 지난 중대성 평가 목록 복원됨');
    }
    
    if (savedSearchResultCollapsed !== null) {
      setIsSearchResultCollapsed(savedSearchResultCollapsed);
    }
    
    if (savedFullResultCollapsed !== null) {
      setIsFullResultCollapsed(savedFullResultCollapsed);
    }
    
    if (savedPreviousAssessmentsCollapsed !== null) {
      setIsPreviousAssessmentsCollapsed(savedPreviousAssessmentsCollapsed);
    }
  }, []);
  
  // 상태 변화 시 세션 스토리지에 저장
  useEffect(() => {
    if (searchResult) {
      saveToSessionStorage('materiality_searchResult', searchResult);
    }
  }, [searchResult]);
  
  useEffect(() => {
    if (previousAssessments.length > 0) {
      saveToSessionStorage('materiality_previousAssessments', previousAssessments);
    }
  }, [previousAssessments]);
  
  useEffect(() => {
    saveToSessionStorage('materiality_searchResultCollapsed', isSearchResultCollapsed);
  }, [isSearchResultCollapsed]);
  
  useEffect(() => {
    saveToSessionStorage('materiality_fullResultCollapsed', isFullResultCollapsed);
  }, [isFullResultCollapsed]);
  
  useEffect(() => {
    saveToSessionStorage('materiality_previousAssessmentsCollapsed', isPreviousAssessmentsCollapsed);
  }, [isPreviousAssessmentsCollapsed]);

  // 검색어에 따라 기업 목록 필터링
  const filteredCompanies = companies.filter(company =>
    company.toLowerCase().includes(companySearchTerm.toLowerCase())
  );

  // 기업 검색어 변경 처리
  const handleCompanySearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCompanySearchTerm(e.target.value);
    setIsCompanyDropdownOpen(true);
  };
  
  // 지난 중대성 평가 목록 가져오기
  const loadPreviousAssessments = async () => {
    try {
      // 실제 API 호출 대신 임시 데이터 생성 (나중에 실제 API로 교체)
      const mockAssessments = [
        {
          id: 1,
          company: 'CV',
          year: '2023',
          status: '완료',
          categories: 15,
          score: 85,
          date: '2023-12-15'
        },
        {
          id: 2,
          company: 'CV',
          year: '2022',
          status: '완료',
          categories: 12,
          score: 78,
          date: '2022-12-10'
        },
        {
          id: 3,
          company: 'CV',
          year: '2021',
          status: '진행중',
          categories: 8,
          score: 65,
          date: '2021-11-20'
        }
      ];
      
      setPreviousAssessments(mockAssessments);
      console.log('📋 지난 중대성 평가 목록 로드 완료');
    } catch (error) {
      console.error('❌ 지난 중대성 평가 목록 로드 실패:', error);
    }
  };

  return (
    <div className="min-h-screen bg-white"> {/* ROOT */}
      {isMediaSearching && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-transparent" />
          <div className="relative bg-white rounded-xl shadow-2xl p-8 text-center border border-gray-200">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">미디어 검색 중...</h3>
            <p className="text-gray-600">네이버 뉴스 API를 통해 기사를 수집하고 있습니다.</p>
            <p className="text-gray-500 text-sm mt-2">잠시만 기다려주세요.</p>
          </div>
        </div>
      )}
  
      <NavigationTabs />
      <IndexBar />
  
      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 pt-40"> {/* BG */}
        <div className="max-w-7xl mx-auto"> {/* CONTAINER */}
  
          {/* 헤더 */}
          <div className="mb-8">
                          <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900">중대성 평가 자동화 플랫폼</h1>
                  <p className="text-lg text-gray-600 mt-2">기업의 중대성 이슈를 자동으로 추천합니다</p>
                </div>
                
                {/* 상단 고정 버튼 컨테이너 */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsResetModalOpen(true)}
                    className="px-6 py-3 bg-white hover:bg-red-50 text-gray-600 font-semibold rounded-lg transition-all duration-200 border-2 border-gray-300 hover:border-red-200 hover:text-red-500 shadow-lg hover:shadow-xl"
                  >
                    🔄 미디어 검색 다시하기
                  </button>
                  <button
                    onClick={() => {
                      // 현재 상태 저장
                      saveCurrentState();
                      // 다음 단계로 이동
                      moveToNextStep();
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                  >
                    다음 →
                  </button>
                </div>
              </div>
          </div>
  
          {/* 선택 옵션 */}
          {visibleSection === 'media-search' && (
            <MediaSearch
              companyId={companyId || ''}
              companySearchTerm={companySearchTerm}
              searchPeriod={searchPeriod}
              isCompanyLoading={isCompanyLoading}
              isMediaSearching={isMediaSearching}
              companies={companies}
              filteredCompanies={filteredCompanies}
              isCompanyDropdownOpen={isCompanyDropdownOpen}
              setCompanyId={setCompanyId}
              setCompanySearchTerm={setCompanySearchTerm}
              setSearchPeriod={setSearchPeriod}
              setIsCompanyDropdownOpen={setIsCompanyDropdownOpen}
              setSearchResult={setSearchResult}
              setExcelFilename={(name) => setExcelFilename(name ?? null)}
              setExcelBase64={(b64) => setExcelBase64(b64 ?? null)}
              setLoading={setLoading}
            />
          )}
  
          {/* 미디어 검색 결과 */}
          {visibleSection === 'media-search' && searchResult && (
            <SearchResult
              searchResult={searchResult}
              isSearchResultCollapsed={isSearchResultCollapsed}
              isFullResultCollapsed={isFullResultCollapsed}
              excelFilename={excelFilename ?? null}
              excelBase64={excelBase64 ?? null}
              setIsSearchResultCollapsed={setIsSearchResultCollapsed}
              setIsFullResultCollapsed={setIsFullResultCollapsed}
              setCompanyId={setCompanyId}
              setSearchPeriod={setSearchPeriod}
            />
          )}
          

  
          {/* 지난 중대성 평가 목록 */}
          {visibleSection === 'middle-issuepool' && (
            <FirstAssessment
            companyId={companyId || ''}
            searchResult={searchResult}
            issuepoolData={issuepoolData}
            assessmentResult={assessmentResult}
            isIssuepoolLoading={isIssuepoolLoading}
            isAssessmentStarting={isAssessmentStarting}
            isBaseIssuePoolModalOpen={isBaseIssuePoolModalOpen}
            isAddCategoryModalOpen={isAddCategoryModalOpen}
            selectedCategory={selectedCategory}
            editingCategoryIndex={editingCategoryIndex}
            baseIssuePoolOptions={baseIssuePoolOptions}
            selectedBaseIssuePool={selectedBaseIssuePool}
            allCategories={allCategories}
            selectedNewCategory={selectedNewCategory}
            newCategoryRank={newCategoryRank}
            newBaseIssuePool={newBaseIssuePool}
            isCustomBaseIssuePool={isCustomBaseIssuePool}
            customBaseIssuePoolText={customBaseIssuePoolText}
            displayCategoryCount={displayCategoryCount}
            setDisplayCategoryCount={setDisplayCategoryCount}
            setAssessmentResult={setAssessmentResult}
            setIsAssessmentStarting={setIsAssessmentStarting}
            setIsIssuepoolLoading={setIsIssuepoolLoading}
            setIssuepoolData={setIssuepoolData}
            setIsBaseIssuePoolModalOpen={setIsBaseIssuePoolModalOpen}
            setIsAddCategoryModalOpen={setIsAddCategoryModalOpen}
            setSelectedCategory={setSelectedCategory}
            setEditingCategoryIndex={setEditingCategoryIndex}
            setBaseIssuePoolOptions={setBaseIssuePoolOptions}
            setSelectedBaseIssuePool={setSelectedBaseIssuePool}
            setAllCategories={setAllCategories}
            setSelectedNewCategory={setSelectedNewCategory}
            setNewCategoryRank={setNewCategoryRank}
            setNewBaseIssuePool={setNewBaseIssuePool}
            setIsCustomBaseIssuePool={setIsCustomBaseIssuePool}
            setCustomBaseIssuePoolText={setCustomBaseIssuePoolText}
            setIsDetailModalOpen={setIsDetailModalOpen}
            excelData={excelData}
          />
          )}

          {/* 설문 진행하기 버튼 */}
          {visibleSection === 'survey-create' && (
            <SurveyCreate companyId={companyId || ''} assessmentResult={assessmentResult} excelData={excelData} displayCategoryCount={displayCategoryCount} />
          )}

          {/* 설문 대상 업로드 */}
          {visibleSection === 'survey-upload' && (
            <SurveyUpload
              excelData={surveyUploadData}
              isExcelValid={surveyUploadIsValid}
              excelFilename={excelFilename ?? null}
              excelBase64={excelBase64 ?? null}
              isDataHidden={isDataHidden}
              setIsExcelValid={(valid) => setSurveyUploadsValid(!!valid)}
              setExcelFilename={(name) => setExcelFilename(name ?? null)}
              setExcelBase64={(b64) => setExcelBase64(b64 ?? null)}
              setExcelData={setSurveyUploadData}
              setIsDataHidden={setIsDataHidden}
              loadUploadedExcelData={loadSurveyUploadData}
              updateRow={updateSurveyUploadRow}
              deleteRow={deleteSurveyUploadRow}
            />
          )}

          {/* 설문 관리 섹션 */}
          {visibleSection === 'survey-send' && (
            <SurveyManagement companyId={companyId || ''} excelData={surveyUploadData} surveyResult={surveyResult} />
          )}

          {/* 설문 결과 확인 */}
          {visibleSection === 'survey-results' && (
            <SurveyResult 
              excelData={surveyUploadData} 
              surveyResult={surveyResult}
            />
          )}
  
          {/* 최종 이슈풀 확인하기 */}
          {visibleSection === 'final-issuepool' && (
            <FinalIssuepool />
          )}

          {/* 완료 섹션 */}
          {visibleSection === 'finish' && (
            <Finish />
          )}
  
          {/* 중대성 평가 상세 정보 모달 */}
          {isDetailModalOpen && assessmentResult && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsDetailModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <h3 className="text-2xl font-bold text-gray-900">중대성 평가 상세 정보</h3>
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>
                  {/* 평가 요약 */}
                  <div className="mb-8">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">📊 평가 요약</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{assessmentResult.total_articles || assessmentResult.data?.total_articles || 0}</div>
                        <div className="text-sm text-blue-700">총 기사</div>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{assessmentResult.negative_articles || assessmentResult.data?.negative_articles || 0}</div>
                        <div className="text-sm text-red-700">부정 기사</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {(assessmentResult.negative_ratio || assessmentResult.data?.negative_ratio || 0).toFixed(1)}%
                        </div>
                        <div className="text-sm text-orange-700">부정 비율</div>
                      </div>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{assessmentResult.total_categories || assessmentResult.data?.total_categories || 0}</div>
                        <div className="text-sm text-green-700">분석된 카테고리</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 전체 카테고리 상세 정보 */}
                  <div className="mb-8">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">🏆 전체 카테고리 상세 정보</h4>
                    <div className="space-y-4">
                      {(() => {
                        const categories = assessmentResult?.matched_categories || assessmentResult?.data?.matched_categories || [];
                        if (categories.length > 0) {
                          return categories.map((cat: any, index: number) => (
                            <div key={index} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="text-lg font-semibold text-gray-800">
                                  {cat.rank || (index + 1)}위: {cat.category || '카테고리명 없음'}
                                </h5>
                                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                                  cat.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                  cat.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                  cat.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                  cat.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {cat.esg_classification || '미분류'}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-gray-700 font-medium">이슈풀:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.total_issuepools || 0}개</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">최종점수:</span>
                                  <span className="ml-2 font-bold text-blue-700">{cat.final_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">빈도점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.frequency_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">관련성점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.relevance_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">최신성점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.recent_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">순위점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.rank_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">참조점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.reference_score?.toFixed(3) || 0}</span>
                                </div>
                                <div>
                                  <span className="text-gray-700 font-medium">부정성점수:</span>
                                  <span className="ml-2 font-semibold text-gray-900">{cat.negative_score?.toFixed(3) || 0}</span>
                                </div>
                              </div>
                              
                              {/* 선택된 base issue pool 표시 */}
                              {cat.selected_base_issue_pool && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center">
                                    <span className="text-gray-700 font-medium mr-2">선택된 이슈:</span>
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm font-medium">
                                      {cat.selected_base_issue_pool}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ));
                        }
                        return <div className="text-gray-500 text-center">카테고리 정보가 없습니다.</div>;
                      })()}
                    </div>
                  </div>
                  
                  {/* 점수 계산 공식 */}
                  <div className="mb-6">
                    <h4 className="text-xl font-semibold text-gray-800 mb-4">📈 점수 계산 공식</h4>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        <strong>최종점수</strong> = 0.4×빈도점수 + 0.6×관련성점수 + 0.2×최신성점수 + 0.4×순위점수 + 0.6×참조점수 + 0.8×부정성점수×(1+0.5×빈도점수+0.5×관련성점수)
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* 모달 푸터 */}
                <div className="flex justify-end p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                  <button
                    onClick={() => setIsDetailModalOpen(false)}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    닫기
                  </button>
                </div>
              </div>
            </div>
          )}
  
          {/* Base Issue Pool 선택 모달 */}
          {isBaseIssuePoolModalOpen && selectedCategory && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsBaseIssuePoolModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
                  <h3 className="text-xl font-bold text-gray-900">
                    Base Issue Pool 선택 - {selectedCategory.category}
                  </h3>
                  <button
                    onClick={() => setIsBaseIssuePoolModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                  <div className="mb-4">
                    <p className="text-gray-600 mb-4">
                      <strong>{selectedCategory.category}</strong> 카테고리에 매칭되는 base issue pool을 선택하거나 직접 입력하세요.
                    </p>
                    
                    {/* 기존 옵션들 */}
                    {baseIssuePoolOptions.length > 0 && (
                      <div className="space-y-3 mb-6">
                        <h4 className="text-sm font-semibold text-gray-700">기존 옵션에서 선택:</h4>
                        {baseIssuePoolOptions.map((option, index) => (
                          <label key={index} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg">
                            <input
                              type="radio"
                              name="baseIssuePool"
                              value={option}
                              checked={selectedBaseIssuePool === option && !isCustomBaseIssuePool}
                              onChange={(e) => {
                                setSelectedBaseIssuePool(e.target.value);
                                setIsCustomBaseIssuePool(false);
                                setCustomBaseIssuePoolText('');
                              }}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {/* 구분선 */}
                    {baseIssuePoolOptions.length > 0 && (
                      <div className="flex items-center my-6">
                        <div className="flex-1 border-t border-gray-300"></div>
                        <span className="px-3 text-sm text-gray-500 bg-white">또는</span>
                        <div className="flex-1 border-t border-gray-300"></div>
                      </div>
                    )}
                    
                    {/* 직접 입력 옵션 */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-700">직접 입력:</h4>
                      <label className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg">
                        <input
                          type="radio"
                          name="baseIssuePool"
                          checked={isCustomBaseIssuePool}
                          onChange={() => {
                            setIsCustomBaseIssuePool(true);
                            setSelectedBaseIssuePool('');
                          }}
                          className="text-blue-600 focus:ring-blue-500 mt-1"
                        />
                        <div className="flex-1">
                          <span className="text-gray-700 font-medium">새로운 base issue pool 직접 작성</span>
                          {isCustomBaseIssuePool && (
                            <textarea
                              value={customBaseIssuePoolText}
                              onChange={(e) => setCustomBaseIssuePoolText(e.target.value)}
                              placeholder="새로운 base issue pool을 입력하세요"
                              className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 font-medium placeholder-gray-500"
                              rows={3}
                              autoFocus
                            />
                          )}
                        </div>
                      </label>
                    </div>
                    
                    {/* 옵션이 없는 경우 안내 */}
                    {baseIssuePoolOptions.length === 0 && (
                      <div className="text-center text-gray-500 py-4 mb-4">
                        <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm">이 카테고리에 매칭되는 base issue pool이 없습니다.</p>
                        <p className="text-xs text-gray-400 mt-1">아래에서 직접 입력해주세요.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 모달 푸터 */}
                <div className="flex justify-end p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsBaseIssuePoolModalOpen(false)}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        // 선택된 값 결정 (기존 옵션 또는 커스텀 입력)
                        const finalSelectedValue = isCustomBaseIssuePool 
                          ? customBaseIssuePoolText.trim() 
                          : selectedBaseIssuePool;
                        
                        if (finalSelectedValue && editingCategoryIndex >= 0) {
                          // 선택된 base issue pool로 카테고리 업데이트
                          const resultData = assessmentResult?.data || assessmentResult;
                          const updatedCategories = [...(resultData?.matched_categories || [])];
                          
                          if (updatedCategories[editingCategoryIndex]) {
                            updatedCategories[editingCategoryIndex] = {
                              ...updatedCategories[editingCategoryIndex],
                              selected_base_issue_pool: finalSelectedValue
                            };
                            
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
                            
                            const selectionType = isCustomBaseIssuePool ? '직접 입력' : '기존 옵션';
                            alert(`✅ ${selectedCategory.category} 카테고리가 "${finalSelectedValue}"로 업데이트되었습니다.\n(${selectionType})`);
                            
                            // 자동으로 중대성 평가 결과 저장
                            try {
                              const dataToSave = {
                                assessment_result: {
                                  ...assessmentResult,
                                  data: {
                                    ...resultData,
                                    matched_categories: updatedCategories
                                  }
                                },
                                company_id: companyId,
                                timestamp: new Date().toISOString(),
                                total_categories: updatedCategories.length,
                                categories_with_base_issue_pool: updatedCategories.filter((cat: any) => cat.selected_base_issue_pool).length
                              };
                              
                              if (typeof window !== 'undefined') {
                                localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
                                console.log('💾 Base Issue Pool 선택 후 자동 저장 완료:', dataToSave);
                              }
                            } catch (error) {
                              console.error('❌ 자동 저장 실패:', error);
                            }
                          }
                        }
                        setIsBaseIssuePoolModalOpen(false);
                      }}
                      disabled={!(selectedBaseIssuePool || (isCustomBaseIssuePool && customBaseIssuePoolText.trim()))}
                      className={`px-4 py-2 font-medium rounded-lg transition-colors duration-200 ${
                        (selectedBaseIssuePool || (isCustomBaseIssuePool && customBaseIssuePoolText.trim()))
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      선택 완료
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
  
          {/* 새로운 카테고리 추가 모달 */}
          {isAddCategoryModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsAddCategoryModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[95vh] overflow-hidden">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
                  <h3 className="text-2xl font-bold text-gray-900">➕ 새로운 카테고리 추가</h3>
                  <button
                    onClick={() => setIsAddCategoryModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 140px)' }}>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 왼쪽: 카테고리 선택 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">1️⃣ 카테고리 선택</h3>
                      <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 gap-2">
                          {allCategories.map((category: any, index: number) => (
                            <button
                              key={index}
                              onClick={() => {
                                setSelectedNewCategory(category.name || category);
                                setNewBaseIssuePool('');
                                // 카테고리 선택 시 해당 카테고리의 base issue pool 옵션 설정
                                if (category.base_issue_pools) {
                                  setBaseIssuePoolOptions(category.base_issue_pools);
                                } else {
                                  // 기존 구조와의 호환성을 위한 기본 옵션
                                  setBaseIssuePoolOptions([
                                    `${category.name || category} 관련 이슈 1`,
                                    `${category.name || category} 관련 이슈 2`,
                                    `${category.name || category} 관련 이슈 3`
                                  ]);
                                }
                              }}
                              className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                selectedNewCategory === (category.name || category)
                                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">{category.name || category}</span>
                                {category.esg_classification && (
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    category.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                    category.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                    category.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                    category.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {category.esg_classification}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 오른쪽: Base Issue Pool 선택 및 순위 설정 */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900">2️⃣ Base Issue Pool 선택</h3>
                      
                      {selectedNewCategory && (
                        <div className="space-y-4">
                          {/* 선택된 카테고리 정보 */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-800 mb-2">선택된 카테고리</h4>
                            <p className="text-blue-700 font-semibold">{selectedNewCategory}</p>
                            {(() => {
                              const selectedCat = allCategories.find(cat => cat.name === selectedNewCategory);
                              return selectedCat?.esg_classification ? (
                                <div className="mt-2">
                                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    selectedCat.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                                    selectedCat.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                                    selectedCat.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                                    selectedCat.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    ESG 분류: {selectedCat.esg_classification}
                                  </span>
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Base Issue Pool 선택 */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              Base Issue Pool
                            </label>
                            
                            {/* 기존 옵션 선택 */}
                            {baseIssuePoolOptions.length > 0 && (
                              <div className="mb-4">
                                <select
                                  value={newBaseIssuePool}
                                  onChange={(e) => {
                                    setNewBaseIssuePool(e.target.value);
                                    setIsCustomBaseIssuePool(false);
                                    setCustomBaseIssuePoolText('');
                                  }}
                                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                                >
                                  <option value="">Base Issue Pool을 선택하세요</option>
                                  {baseIssuePoolOptions.map((option: string, index: number) => (
                                    <option key={index} value={option}>
                                      {option}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            
                            {/* 구분선 */}
                            {baseIssuePoolOptions.length > 0 && (
                              <div className="flex items-center my-4">
                                <div className="flex-1 border-t border-gray-300"></div>
                                <span className="px-3 text-sm text-gray-500 bg-white">또는</span>
                                <div className="flex-1 border-t border-gray-300"></div>
                              </div>
                            )}
                            
                            {/* 직접 입력 옵션 */}
                            <div className="space-y-3">
                              <label className="flex items-start space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <input
                                  type="radio"
                                  name="newBaseIssuePool"
                                  checked={isCustomBaseIssuePool}
                                  onChange={() => {
                                    setIsCustomBaseIssuePool(true);
                                    setNewBaseIssuePool('');
                                  }}
                                  className="text-blue-600 focus:ring-blue-500 mt-1"
                                />
                                <div className="flex-1">
                                  <span className="text-gray-700 font-medium">새로운 base issue pool 직접 작성</span>
                                  {isCustomBaseIssuePool && (
                                    <textarea
                                      value={customBaseIssuePoolText}
                                      onChange={(e) => setCustomBaseIssuePoolText(e.target.value)}
                                      placeholder="새로운 base issue pool을 입력하세요"
                                      className="w-full mt-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-gray-900 font-medium placeholder-gray-500"
                                      rows={3}
                                      autoFocus
                                    />
                                  )}
                                </div>
                              </label>
                            </div>
                            
                            {/* 옵션이 없는 경우 안내 */}
                            {baseIssuePoolOptions.length === 0 && (
                              <div className="text-center text-gray-500 py-4 mb-4">
                                <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-sm">이 카테고리에 매칭되는 base issue pool이 없습니다.</p>
                                <p className="text-xs text-gray-400 mt-1">아래에서 직접 입력해주세요.</p>
                              </div>
                            )}
                          </div>

                          {/* 순위 설정 */}
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                              순위
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={newCategoryRank}
                              onChange={(e) => setNewCategoryRank(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 font-medium"
                            />
                          </div>

                          {/* 추가 버튼 */}
                          <button
                            onClick={() => {
                              // 최종 선택값 결정 (기존 옵션 또는 커스텀 입력)
                              const finalBaseIssuePool = isCustomBaseIssuePool 
                                ? customBaseIssuePoolText.trim() 
                                : newBaseIssuePool;
                              
                              addNewCategory(
                                selectedNewCategory,
                                finalBaseIssuePool,
                                newCategoryRank,
                                assessmentResult,
                                setAssessmentResult,
                                setIsAddCategoryModalOpen,
                                setSelectedNewCategory,
                                setNewCategoryRank,
                                setNewBaseIssuePool,
                                setIsCustomBaseIssuePool,
                                setCustomBaseIssuePoolText,
                                allCategories
                              );
                            }}
                            disabled={!selectedNewCategory || !(newBaseIssuePool || (isCustomBaseIssuePool && customBaseIssuePoolText.trim()))}
                            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 ${
                              selectedNewCategory && (newBaseIssuePool || (isCustomBaseIssuePool && customBaseIssuePoolText.trim()))
                                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                          >
                            ✅ 카테고리 추가하기
                          </button>
                        </div>
                      )}

                      {!selectedNewCategory && (
                        <div className="text-center text-gray-500 py-8">
                          왼쪽에서 카테고리를 선택해주세요
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 모달 푸터 */}
                <div className="flex justify-end p-6 border-t border-gray-200 bg-white sticky bottom-0 z-10">
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setIsAddCategoryModalOpen(false)}
                      className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => {
                        // 최종 선택값 결정 (기존 옵션 또는 커스텀 입력)
                        const finalBaseIssuePool = isCustomBaseIssuePool 
                          ? customBaseIssuePoolText.trim() 
                          : newBaseIssuePool;
                        
                        addNewCategory(
                          selectedNewCategory,
                          finalBaseIssuePool,
                          parseInt(newCategoryRank) || 1,
                          assessmentResult,
                          setAssessmentResult,
                          setIsAddCategoryModalOpen,
                          setSelectedNewCategory,
                          setNewCategoryRank,
                          setNewBaseIssuePool,
                          setIsCustomBaseIssuePool,
                          setCustomBaseIssuePoolText,
                          allCategories
                        );
                      }}
                      disabled={!selectedNewCategory || !(newBaseIssuePool || (isCustomBaseIssuePool && customBaseIssuePoolText.trim()))}
                      className={`px-6 py-3 font-medium rounded-lg transition-colors duration-200 ${
                        selectedNewCategory && (newBaseIssuePool || (isCustomBaseIssuePool && customBaseIssuePoolText.trim()))
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      ✅ 카테고리 추가하기
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 리셋 확인 모달 */}
          {isResetModalOpen && (
            <div className="fixed inset-0 flex items-center justify-center z-50">
              {/* 배경 오버레이 */}
              <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setIsResetModalOpen(false)}></div>
              
              {/* 모달 내용 */}
              <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900">⚠️ 데이터 초기화 확인</h3>
                  <button
                    onClick={() => setIsResetModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 모달 바디 */}
                <div className="p-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">⚠️</span>
                    </div>
                    
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">
                      모든 메모리가 삭제됩니다
                    </h4>
                    
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      이 작업을 수행하면 다음 <strong className="text-red-600">로컬 데이터가 삭제</strong>됩니다:
                    </p>
                    
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• 미디어 검색 결과</li>
                        <li>• 중대성 평가 결과</li>
                        <li>• 설문 생성 및 발송 데이터</li>
                        <li>• 업로드된 엑셀 파일</li>
                        <li>• 진행 상황 및 설정</li>
                      </ul>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                      <p className="text-sm text-blue-700 font-medium mb-2">💡 다음 데이터는 유지됩니다:</p>
                      <ul className="text-sm text-blue-600 space-y-1">
                        <li>• DB에 저장된 설문 내용</li>
                        <li>• 설문 응답 결과</li>
                        <li>• 설문 ID 및 메타데이터</li>
                      </ul>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6">
                      로컬 데이터 초기화 후 DB에서 설문 데이터를 자동으로 다시 불러옵니다. 계속하시겠습니까?
                    </p>
                  </div>
                </div>
                
                {/* 모달 푸터 */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                  <button
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    취소
                  </button>
                  <button
                    onClick={async () => {
                      setIsResetModalOpen(false);
                      await resetAllData();
                    }}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
                  >
                    확인
                  </button>
                </div>
              </div>
            </div>
          )}
  
        </div> {/* /CONTAINER */}
      </div>   {/* /BG */}
    </div>      
  );
}