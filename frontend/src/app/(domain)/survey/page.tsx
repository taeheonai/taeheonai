'use client';

import React, { useState, useEffect } from 'react';

interface SurveyItem {
  id: string;
  title: string;
  description?: string;
  outsideScore: number | null;
  insideScore: number | null;
  category: string;
  esg_classification: string;
  rank: number;
}

interface SurveyData {
  survey_id: string;
  corporation_id: string; // 백엔드에서 반환하는 필드명에 맞춤
  content_hash?: string;
  timestamp: string;
  total_categories: number;
  categories: Array<{
    question_number?: number;
    rank: number;
    category: string;
    selected_base_issue_pool: string;
    esg_classification: string;
    final_score: number;
  }>;
  excel_data?: any;
}

export default function SurveyPage() {
  // 응답자 정보
  const [respondentType, setRespondentType] = useState<string>('');
  const [internalPosition, setInternalPosition] = useState<string>(''); // 임직원 세부 직급
  const [participantInfo, setParticipantInfo] = useState({
    name: '',
    company: ''
  });
  
  // 현재 단계
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // 설문 데이터
  const [surveyData, setSurveyData] = useState<SurveyData | null>(null);
  
  // 동적으로 생성된 설문 항목들
  const [environmentalItems, setEnvironmentalItems] = useState<SurveyItem[]>([]);
  const [socialItems, setSocialItems] = useState<SurveyItem[]>([]);
  const [governanceItems, setGovernanceItems] = useState<SurveyItem[]>([]);
  
  // 설문 링크 ID 확인
  const [surveyId, setSurveyId] = useState<string | null>(null);
  
  // 설문 데이터 로드 및 설문 항목 생성
  useEffect(() => {
    const loadSurveyData = async () => {
      try {
        // URL에서 설문 ID 확인
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get('id');
        setSurveyId(id);
        
        if (id) {
          // 백엔드에서 설문 데이터 로드
          const response = await fetch(`/api/v1/materiality-service/surveys/${id}`);
          
          if (!response.ok) {
            if (response.status === 404) {
              console.log('⚠️ 설문을 찾을 수 없습니다.');
              setSurveyData(null);
              return;
            }
            throw new Error(`설문 데이터 로드 실패: ${response.status}`);
          }
          
          const data: SurveyData = await response.json();
          setSurveyData(data);
          
          // ESG 분류별로 카테고리 분리
          const environmental: SurveyItem[] = [];
          const social: SurveyItem[] = [];
          const governance: SurveyItem[] = [];
          
          // 전체 설문에서 연속된 번호를 위한 변수
          let globalQuestionNumber = 1;
          
          data.categories.forEach((cat) => {
            const surveyItem: SurveyItem = {
              id: `${cat.esg_classification.toLowerCase()}_${globalQuestionNumber}`,
              title: `Q${globalQuestionNumber}. ${cat.selected_base_issue_pool || cat.category} (${cat.category})`,
              description: `• ${cat.selected_base_issue_pool || cat.category}이(가) 회사의 재무성과(기회/위험)에 미치는 중요도는 어느 정도입니까? (Outside-in)\n• ${cat.selected_base_issue_pool || cat.category}에 대해 우리 회사 활동의 환경·사회 영향 중요도는 어느 정도입니까? (Inside-out)`,
              outsideScore: null,
              insideScore: null,
              category: cat.category,
              esg_classification: cat.esg_classification,
              rank: cat.question_number || globalQuestionNumber
            };
            
            // ESG 분류에 따라 적절한 배열에 추가
            if (cat.esg_classification.includes('환경')) {
              environmental.push(surveyItem);
              console.log('🌱 Environmental에 추가:', surveyItem.id);
            } else if (cat.esg_classification.includes('사회')) {
              social.push(surveyItem);
              console.log('👥 Social에 추가:', surveyItem.id);
            } else if (cat.esg_classification.includes('지배구조') || cat.esg_classification.includes('경제')) {
              governance.push(surveyItem);
              console.log('🏛️ Governance에 추가:', surveyItem.id);
            } else {
              console.log('⚠️ 분류되지 않은 항목:', cat.esg_classification, surveyItem.id);
            }
            
            // 다음 질문 번호로 증가
            globalQuestionNumber++;
          });
          
          // 설문 링크로 접근한 경우 응답자 정보 입력 단계 추가
          if (id) {
            setCurrentStep(0); // 응답자 정보 입력 단계
          }
          
          setEnvironmentalItems(environmental);
          setSocialItems(social);
          setGovernanceItems(governance);
          
          console.log('📋 설문 데이터 로드 완료:', {
            environmental: environmental.length,
            social: social.length,
            governance: governance.length,
            total: data.categories.length
          });
        } else {
          console.log('⚠️ 설문 데이터가 없습니다. 중대성 평가 페이지에서 설문을 생성해주세요.');
        }
      } catch (error) {
        console.error('❌ 설문 데이터 로드 실패:', error);
      }
    };
    
    loadSurveyData();
  }, []);

  const handleScoreChange = (itemId: string, scoreType: 'outside' | 'inside', value: number) => {
    console.log('🔍 점수 변경 시도:', { itemId, scoreType, value });
    
    // Environmental 항목에서 찾기
    const envItem = environmentalItems.find(item => item.id === itemId);
    if (envItem) {
      setEnvironmentalItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                [scoreType === 'outside' ? 'outsideScore' : 'insideScore']: value
              }
            : item
        )
      );
      console.log('✅ Environmental 항목 업데이트 완료');
      return;
    }

    // Social 항목에서 찾기
    const socItem = socialItems.find(item => item.id === itemId);
    if (socItem) {
      setSocialItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                [scoreType === 'outside' ? 'outsideScore' : 'insideScore']: value
              }
            : item
        )
      );
      console.log('✅ Social 항목 업데이트 완료');
      return;
    }

    // Governance 항목에서 찾기
    const govItem = governanceItems.find(item => item.id === itemId);
    if (govItem) {
      setGovernanceItems(prevItems =>
        prevItems.map(item =>
          item.id === itemId
            ? {
                ...item,
                [scoreType === 'outside' ? 'outsideScore' : 'insideScore']: value
              }
            : item
        )
      );
      console.log('✅ Governance 항목 업데이트 완료');
      return;
    }

    console.log('❌ 해당 ID를 찾을 수 없음:', itemId);
  };

  // 다음 단계로 이동
  const handleNext = () => {
    // 설문 데이터가 없으면 진행 불가
    if (!surveyData) {
      alert('설문 데이터가 없습니다. 중대성 평가 페이지에서 설문을 생성해주세요.');
      return;
    }

    // 현재 단계에 따른 유효성 검사
    if (currentStep === 0) {
      // 응답자 정보 입력 단계 (설문 링크로 접근한 경우)
      if (!participantInfo.name || !participantInfo.company) {
        alert('이름과 소속을 모두 입력해주세요.');
        return;
      }
    } else if (currentStep === 1) {
      if (!respondentType) {
        alert('응답자 정보를 선택해주세요.');
        return;
      }
      // 임직원인 경우 세부 직급도 선택해야 함
      if (respondentType === '임직원' && !internalPosition) {
        alert('임직원의 경우 직급을 선택해주세요.');
        return;
      }
    } else if (currentStep === 2) {
      const isAllAnswered = environmentalItems.every(
        item => item.outsideScore !== null && item.insideScore !== null
      );
      if (!isAllAnswered) {
        alert('모든 Environmental 항목에 대해 응답해주세요.');
        return;
      }
    } else if (currentStep === 3) {
      const isAllAnswered = socialItems.every(
        item => item.outsideScore !== null && item.insideScore !== null
      );
      if (!isAllAnswered) {
        alert('모든 Social 항목에 대해 응답해주세요.');
        return;
      }
    } else if (currentStep === 4) {
      const isAllAnswered = governanceItems.every(
        item => item.outsideScore !== null && item.insideScore !== null
      );
      if (!isAllAnswered) {
        alert('모든 Governance & Economic 항목에 대해 응답해주세요.');
        return;
      }
    }

    // 최대 단계는 ESG 섹션 수에 따라 동적으로 결정 (설문 완료 단계는 별도)
    // 설문 링크로 접근한 경우 응답자 정보 입력 단계 추가
    const baseSteps = surveyId ? 1 : 0; // 설문 링크로 접근한 경우 +1
    const maxStep = baseSteps + 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0); // 설문 완료 단계 제외
    
    if (currentStep < maxStep) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === maxStep) {
      // 마지막 ESG 섹션 완료 후 제출 버튼 표시
      // 제출 버튼을 누르면 handleSubmit()이 호출됨
      console.log('✅ 모든 ESG 섹션 완료, 제출 준비됨');
    }
  };

  // 설문 제출
  const handleSubmit = async () => {
    try {
      // 모든 응답 데이터 수집
      const allResponses = [
        ...environmentalItems.map(item => ({
          ...item,
          section: 'Environmental'
        })),
        ...socialItems.map(item => ({
          ...item,
          section: 'Social'
        })),
        ...governanceItems.map(item => ({
          ...item,
          section: 'Governance'
        }))
      ];

      // 내부/외부 관계자 분류
      const isInternal = respondentType === '임직원';
      const finalPosition = isInternal ? internalPosition : respondentType;

      // 설문 결과 데이터 생성
      const surveyResult: any = {
        corporation_id: surveyData?.corporation_id,
        respondent_type: respondentType,
        internal_position: internalPosition, // 임직원 세부 직급
        is_internal: isInternal, // 내부/외부 관계자 구분
        final_position: finalPosition, // 최종 분류된 직급/소속
        timestamp: new Date().toISOString(),
        total_items: allResponses.length,
        responses: allResponses,
        original_survey_data: surveyData
      };

      // 설문 링크로 접근한 경우 응답자 정보 포함
      if (surveyId && participantInfo.name) {
        try {
          // 백엔드로 설문 응답 전송
          const responseRequest = {
            survey_id: surveyId,
            participant: {
              ...participantInfo,
              email: `${participantInfo.name}@${participantInfo.company}.com`, // 임시 이메일 생성
              position: finalPosition, // 최종 분류된 직급/소속
              is_internal: isInternal, // 내부/외부 관계자 구분
              internal_position: internalPosition // 임직원 세부 직급
            },
            responses: allResponses,
            corporation_id: surveyData?.corporation_id || '1' // 설문 데이터에서 가져온 corporation_id 사용
          };

          console.log('📤 설문 응답 전송:', {
            survey_id: surveyId,
            corporation_id: responseRequest.corporation_id,
            participant_email: responseRequest.participant.email,
            total_responses: allResponses.length
          });

          const response = await fetch(`/api/v1/materiality-service/surveys/${surveyId}/responses`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(responseRequest)
          });

          if (!response.ok) {
            if (response.status === 400) {
              const errorData = await response.json();
              console.log('⚠️ 백엔드 에러 응답:', errorData);
              
              // 이메일 중복 응답 에러 처리
              if (errorData.detail && errorData.detail.includes('이미')) {
                alert(`⚠️ 이미 이 설문에 응답하셨습니다.\n\n참여자: ${participantInfo.name} (${participantInfo.company})\n\n다른 이름이나 소속으로 다시 시도해주세요.`);
              } else {
                alert(`⚠️ ${errorData.detail}`);
              }
              return;
            }
            throw new Error(`설문 응답 제출 실패: ${response.status}`);
          }

          const result = await response.json();
          console.log('✅ 설문 응답 백엔드 저장 완료:', result);
          
          // 설문 결과에 응답자 정보 포함
          surveyResult.participant = participantInfo;
          surveyResult.survey_id = surveyId;

          // 설문 응답이 성공적으로 저장되었음을 표시
          localStorage.setItem('hasUserActivity', 'true');
        } catch (error) {
          console.error('❌ 설문 응답 제출 실패:', error);
          alert(`❌ 설문 응답 제출에 실패했습니다.\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
          return;
        }
      }

      // localStorage에 설문 결과 저장
      localStorage.setItem('surveyResult', JSON.stringify(surveyResult));
      
      console.log('📋 설문 제출 완료:', surveyResult);
      
      // 설문 완료 상태로 변경
      setCurrentStep(5); // 새로운 단계로 설정
      
    } catch (error) {
      console.error('❌ 설문 제출 실패:', error);
      alert('❌ 설문 제출에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 이전 단계로 이동
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      window.location.href = '/materiality';
    }
  };

  // 진행률 계산
  const getProgress = () => {
    if (!surveyData) return 0;
    
    // 최대 단계는 ESG 섹션 수에 따라 동적으로 결정 (설문 완료 단계는 별도)
    // 설문 링크로 접근한 경우 응답자 정보 입력 단계 추가
    const baseSteps = surveyId ? 1 : 0; // 설문 링크로 접근한 경우 +1
    const maxStep = baseSteps + 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0); // 설문 완료 단계 제외
    
    // 설문 완료 상태일 때는 100% 표시
    if (currentStep === 5) {
      return 100;
    }
    
    return Math.min(Math.round((currentStep / maxStep) * 100), 100);
  };

  // 설문 결과 통계 계산
  const calculateSurveyStats = () => {
    const allResponses = [
      ...environmentalItems,
      ...socialItems,
      ...governanceItems
    ];

    const stats = {
      total: allResponses.length,
      environmental: environmentalItems.length,
      social: socialItems.length,
      governance: governanceItems.length,
      averageOutsideScore: 0,
      averageInsideScore: 0,
      scoreDistribution: {
        outside: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
        inside: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>
      },
      topCategories: [] as any[]
    };

    // 점수 분포 및 평균 계산
    let totalOutsideScore = 0;
    let totalInsideScore = 0;
    let validOutsideScores = 0;
    let validInsideScores = 0;

    allResponses.forEach(item => {
      if (item.outsideScore !== null) {
        stats.scoreDistribution.outside[item.outsideScore as number]++;
        totalOutsideScore += item.outsideScore;
        validOutsideScores++;
      }
      if (item.insideScore !== null) {
        stats.scoreDistribution.inside[item.insideScore as number]++;
        totalInsideScore += item.insideScore;
        validInsideScores++;
      }
    });

    stats.averageOutsideScore = validOutsideScores > 0 ? Math.round((totalOutsideScore / validOutsideScores) * 10) / 10 : 0;
    stats.averageInsideScore = validInsideScores > 0 ? Math.round((totalInsideScore / validInsideScores) * 10) / 10 : 0;

    // 상위 카테고리 (점수 합계 기준)
    const categoryScores = allResponses.map(item => ({
      category: item.category,
      title: item.title,
      outsideScore: item.outsideScore || 0,
      insideScore: item.insideScore || 0,
      totalScore: (item.outsideScore || 0) + (item.insideScore || 0)
    }));

    stats.topCategories = categoryScores
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5);

    return stats;
  };



  // JSON 데이터 클립보드 복사
  const copySurveyResult = async () => {
    try {
      const surveyResult = localStorage.getItem('surveyResult');
      if (surveyResult) {
        const dataStr = JSON.stringify(JSON.parse(surveyResult), null, 2);
        await navigator.clipboard.writeText(dataStr);
        alert('✅ 설문 결과가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      console.error('❌ 클립보드 복사 실패:', error);
      alert('❌ 클립보드 복사에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto py-12 px-4 sm:px-6 lg:px-8">


        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 헤더 */}
          <div className="px-8 py-6 bg-blue-700">
            <h1 className="text-2xl font-bold text-white">
              ESG 경영 활동별 중요성 평가 설문조사
            </h1>
          </div>

          {/* 설문 내용 */}
          <div className="p-8">
            {/* 단계 0: 응답자 정보 입력 (설문 링크로 접근한 경우) */}
            {currentStep === 0 && (
              <>
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    참여자 정보 입력
                    <span className="text-red-500 ml-1">*</span>
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">이름 *</label>
                      <input
                        type="text"
                        value={participantInfo.name}
                        onChange={(e) => setParticipantInfo(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="이름을 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-900 mb-2">소속 *</label>
                      <input
                        type="text"
                        value={participantInfo.company}
                        onChange={(e) => setParticipantInfo(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="회사명을 입력하세요"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* 단계 1: 응답자 정보 */}
            {currentStep === 1 && (
              <>
                  {/* 응답자 정보 선택 */}
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">
                      귀하의 소속을 선택해 주시기 바랍니다.
                      <span className="text-red-500 ml-1">*</span>
                    </h2>
                    <div className="space-y-3">
                      {[
                        '임직원',
                        '고객',
                        '정부/자자체/유관기관',
                        '지역사회',
                        '협력회사',
                        '전문가/전문기관(대학, 연구소)',
                        '투자자/투자기관',
                        '주주',
                        '언론/미디어',
                        '기타'
                      ].map((type) => (
                        <label key={type} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg">
                          <input
                            type="radio"
                            name="respondentType"
                            value={type}
                            checked={respondentType === type}
                            onChange={(e) => {
                              setRespondentType(e.target.value);
                              // 임직원이 아닌 경우 세부 직급 초기화
                              if (e.target.value !== '임직원') {
                                setInternalPosition('');
                              }
                            }}
                            className="text-blue-600 focus:ring-blue-500"
                            required
                          />
                          <span className="text-gray-700">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* 임직원 세부 직급 선택 */}
                  {respondentType === '임직원' && (
                    <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                      <h3 className="text-lg font-semibold text-blue-800 mb-4">
                        직급을 선택해 주시기 바랍니다.
                        <span className="text-red-500 ml-1">*</span>
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 임원 */}
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-800 mb-3">임원 (Executives)</h4>
                          <div className="space-y-2">
                            {['경영진', 'CEO', '사장', '부사장', '전무', '상무', '이사', '본부장'].map((position) => (
                              <label key={position} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="radio"
                                  name="internalPosition"
                                  value="임원"
                                  checked={internalPosition === '임원'}
                                  onChange={() => setInternalPosition('임원')}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{position}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 중간관리자 */}
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-800 mb-3">중간관리자 (Middle Managers)</h4>
                          <div className="space-y-2">
                            {['부장', '차장', '팀장', '부서장'].map((position) => (
                              <label key={position} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="radio"
                                  name="internalPosition"
                                  value="중간관리자"
                                  checked={internalPosition === '중간관리자'}
                                  onChange={() => setInternalPosition('중간관리자')}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{position}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 실무리더 */}
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-800 mb-3">실무리더 (Working-level Leaders)</h4>
                          <div className="space-y-2">
                            {['과장', '대리'].map((position) => (
                              <label key={position} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="radio"
                                  name="internalPosition"
                                  value="실무리더"
                                  checked={internalPosition === '실무리더'}
                                  onChange={() => setInternalPosition('실무리더')}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{position}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 주니어 */}
                        <div className="bg-white p-4 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-800 mb-3">주니어 (Juniors)</h4>
                          <div className="space-y-2">
                            {['사원', '인턴'].map((position) => (
                              <label key={position} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                <input
                                  type="radio"
                                  name="internalPosition"
                                  value="주니어"
                                  checked={internalPosition === '주니어'}
                                  onChange={() => setInternalPosition('주니어')}
                                  className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">{position}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 안내 문구 */}
                  <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">📋 설문 안내</h3>
                    <p className="text-blue-700 text-sm leading-relaxed mb-3">
                      본 설문은 각 항목마다 아래 두 가지를 평가합니다.
                    </p>
                    <ul className="text-blue-700 text-sm space-y-2">
                      <li>• <strong>기업 재무 중요도(Outside-in):</strong> 외부 환경·규제·시장 변화가 회사의 재무성과/기회/위험에 미치는 중요도</li>
                      <li>• <strong>환경/사회 중요도(Inside-out):</strong> 회사 활동이 환경·사회에 미칠 수 있는 긍정/부정 영향의 중요도</li>
                    </ul>
                    <div className="mt-4 p-3 bg-white rounded border border-blue-300">
                      <p className="text-blue-800 font-medium text-sm">
                        공통 척도: 1 전혀 중요하지 않음 / 2 낮음 / 3 보통 / 4 높음 / 5 매우 높음 / (선택) N/A 잘 모르겠음
                      </p>
                    </div>
                  </div>
              </>
            )}

                         {/* 설문 데이터가 없을 때 안내 메시지 */}
             {!surveyData && (
               <div className="text-center py-12">
                 <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                   <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                   </svg>
                 </div>
                 <h3 className="text-xl font-semibold text-gray-900 mb-3">
                   {surveyId ? '설문을 찾을 수 없습니다' : '설문 데이터가 없습니다'}
                 </h3>
                 <p className="text-gray-600 mb-6">
                   {surveyId 
                     ? `설문 ID "${surveyId}"에 해당하는 설문을 찾을 수 없습니다. 설문 링크가 올바른지 확인해주세요.`
                     : '중대성 평가 페이지에서 설문을 생성한 후 다시 시도해주세요.'
                   }
                 </p>
                 <div className="space-x-4">
                   <a
                     href="/materiality"
                     className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
                   >
                     <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                     </svg>
                     중대성 평가 페이지로 이동
                   </a>
                   {surveyId && (
                     <button
                       onClick={() => window.location.reload()}
                       className="inline-flex items-center px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
                     >
                       <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                       </svg>
                       페이지 새로고침
                     </button>
                   )}
                 </div>
               </div>
             )}

                         {/* 단계 2-4: ESG 평가 */}
             {surveyData && currentStep > 1 && currentStep < 5 && (
               <div className="mb-8">
                 <h2 className="text-xl font-semibold text-gray-900 mb-4">
                   ESG 경영 활동별 중요성 평가
                 </h2>
                 <p className="text-gray-600 mb-4">
                   다음은 ESG 경영 활동과 관련된 항목입니다. (총 {surveyData.categories.length}개 항목)
                 </p>
                 <div className="bg-gray-50 p-4 rounded-lg mb-6">
                   <p className="text-sm text-gray-600 mb-2">
                     ※ 기업 재무 중요도(Outside-in): 외부 환경·규제·시장 변화가 회사의 재무성과/기회/위험에 미치는 중요도
                   </p>
                   <p className="text-sm text-gray-600">
                     ※ 환경/사회 중요도(Inside-out): 회사 활동이 환경·사회에 미칠 수 있는 긍정/부정 영향의 중요도
                   </p>
                   <p className="text-sm text-gray-600 mt-2">
                     공통 척도: 1 전혀 중요하지 않음 / 2 낮음 / 3 보통 / 4 높음 / 5 매우 높음 / (선택) N/A 잘 모르겠음
                   </p>
                 </div>

                {/* Environmental 섹션 */}
                {currentStep === 2 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-blue-800 mb-6">
                      1) Environmental (환경)
                    </h3>
                    
                    {environmentalItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 재무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 재무 중요도 (Outside-in)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-outside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-outside`}
                                  value={score}
                                  checked={item.outsideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'outside', score)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도 (Inside-out)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-inside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-inside`}
                                  value={score}
                                  checked={item.insideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'inside', score)}
                                  className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Social 섹션 */}
                {currentStep === 3 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-green-800 mb-6">
                      2) Social (사회)
                    </h3>
                    
                    {socialItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 재무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 재무 중요도 (Outside-in)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-outside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-outside`}
                                  value={score}
                                  checked={item.outsideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'outside', score)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도 (Inside-out)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-inside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-inside`}
                                  value={score}
                                  checked={item.insideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'inside', score)}
                                  className="h-4 w-4 text-green-600 focus:ring-green-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Governance & Economic 섹션 */}
                {currentStep === 4 && (
                  <div className="mb-12">
                    <h3 className="text-lg font-semibold text-purple-800 mb-6">
                      3) Governance & Economic (지배구조/경제)
                    </h3>
                    
                    {governanceItems.map((item) => (
                      <div key={item.id} className="mb-8 bg-gray-50 p-6 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">{item.title}</h4>
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-4 whitespace-pre-line">
                            {item.description}
                          </p>
                        )}
                        
                        {/* 기업 재무 중요도 */}
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            기업 재무 중요도 (Outside-in)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-outside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-outside`}
                                  value={score}
                                  checked={item.outsideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'outside', score)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* 환경/사회 중요도 */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">
                            환경/사회 중요도 (Inside-out)
                          </p>
                          <div className="flex items-center justify-between max-w-2xl">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <label key={`${item.id}-inside-${score}`} className="flex flex-col items-center">
                                <input
                                  type="radio"
                                  name={`${item.id}-inside`}
                                  value={score}
                                  checked={item.insideScore === score}
                                  onChange={() => handleScoreChange(item.id, 'inside', score)}
                                  className="h-4 w-4 text-purple-600 focus:ring-purple-500"
                                />
                                <span className="mt-1 text-sm text-gray-600">
                                  {score === 1 ? '전혀 중요하지 않음' :
                                   score === 2 ? '낮음' :
                                   score === 3 ? '보통' :
                                   score === 4 ? '높음' :
                                   '매우 높음'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                             </div>
             )}

                           {/* 단계 5: 설문 완료 */}
              {currentStep === 5 && (
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    🎉 설문 완료!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    설문이 성공적으로 제출되었습니다.
                  </p>
                </div>
              )}

             {/* 진행 상태 표시 */}
            <div className="mt-8">
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className="h-2 bg-blue-600 rounded-full transition-all duration-300" 
                  style={{ width: `${getProgress()}%` }}
                ></div>
              </div>
              <div className="text-right mt-2">
                <span className="text-sm text-gray-600">{getProgress()}% 완료</span>
              </div>
            </div>

            {/* 이전/다음 버튼 */}
            <div className="mt-8 flex justify-between">
              <button
                onClick={handlePrev}
                className="px-6 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                이전
              </button>
              {currentStep === 5 ? (
                // 설문 완료 상태에서는 제출 버튼을 비활성화하고 완료 메시지 표시
                <button
                  disabled
                  className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-gray-400 bg-gray-300 cursor-not-allowed"
                >
                  설문 완료됨
                </button>
              ) : (
                                 <button
                   onClick={() => {
                     const maxStep = 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0);
                     
                     if (currentStep === maxStep) {
                       // 제출 버튼 클릭 시
                       handleSubmit();
                     } else {
                       // 다음 버튼 클릭 시
                       handleNext();
                     }
                   }}
                   className="px-6 py-2 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                 >
                   {(() => {
                     if (!surveyData) return '다음';
                     
                     const maxStep = 1 + (environmentalItems.length > 0 ? 1 : 0) + (socialItems.length > 0 ? 1 : 0) + (governanceItems.length > 0 ? 1 : 0); // 설문 완료 단계 제외
                     
                     return currentStep === maxStep ? '제출' : '다음';
                   })()}
                 </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}