'use client';

import React, { useState, useEffect } from 'react';

type FinishProps = {
  companyId: string;
};

export default function Finish({ companyId }: FinishProps) {
  const [finalCategories, setFinalCategories] = useState<any[]>([]);
  const [sentSurveyInfo, setSentSurveyInfo] = useState<any>(null);
  const [surveyResponses, setSurveyResponses] = useState<any[]>([]);
  const [isCalculationCompleted, setIsCalculationCompleted] = useState(false);
  const [allSurveys, setAllSurveys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 모든 설문 정보 로드
  const loadAllSurveys = async () => {
    if (typeof window === 'undefined') return;
    
    setLoading(true);
    try {
      // 특정 기업의 설문 정보만 가져오기 (corporation_id 기준)
      console.log('🔍 companyId 값 확인:', { companyId, type: typeof companyId });
      
      // 한온시스템은 항상 숫자 ID 1로 변환
      let response;
      if (companyId === '한온시스템' || companyId === '1') {
        console.log('🔍 한온시스템을 숫자 ID 1로 변환하여 요청');
        response = await fetch(`https://taeheonai-production-2130.up.railway.app/api/v1/materiality/surveys/corporation/1`);
      } else {
        const encodedCompanyId = encodeURIComponent(companyId);
        console.log('🔍 회사 ID 인코딩:', { companyId, encodedCompanyId });
        response = await fetch(`https://taeheonai-production-2130.up.railway.app/api/v1/materiality/surveys/corporation/${encodedCompanyId}`);
      }
      
      if (!response.ok) {
        throw new Error(`설문 정보 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      // 백엔드에서 List[SurveyDataResponse]를 직접 반환하므로 배열로 처리
      const surveys = Array.isArray(data) ? data : (data.surveys || []);
      
      // 설문 데이터 구조 디버깅
      console.log('🔍 API 응답 데이터:', data);
      console.log('🔍 설문 배열:', surveys);
      if (surveys.length > 0) {
        console.log('🔍 첫 번째 설문 구조:', surveys[0]);
        console.log('🔍 설문 ID 필드들:', surveys.map(s => ({ id: s.id, survey_id: s.survey_id, _id: s._id })));
      }

      // 각 설문의 응답 데이터 가져오기
      const surveysWithResponses = await Promise.all(surveys.map(async (survey: any) => {
        try {
          // 설문 ID 찾기 (여러 가능한 필드명 확인)
          const surveyId = survey.id || survey.survey_id || survey._id;
          
          // survey ID가 undefined, null, 빈 문자열인 경우 건너뛰기
          if (!surveyId || surveyId === 'undefined' || surveyId === 'null' || surveyId === '') {
            console.warn('⚠️ 설문 ID가 유효하지 않습니다:', { 
              id: survey.id, 
              survey_id: survey.survey_id, 
              _id: survey._id, 
              survey 
            });
            return { ...survey, responses: [], responseCount: 0 };
          }
          
          console.log('🔍 설문 응답 데이터 요청:', surveyId);
          const responseData = await fetch(`https://taeheonai-production-2130.up.railway.app/api/v1/materiality/surveys/${surveyId}/responses`);
          console.log('🔍 설문 응답 API 상태:', surveyId, responseData.status, responseData.ok);
          if (responseData.ok) {
            const responses = await responseData.json();
            console.log('🔍 설문 응답 데이터:', surveyId, responses);
            return {
              ...survey,
              responses: responses.responses || [],
              responseCount: responses.total_responses || (responses.responses || []).length
            };
          } else {
            console.warn('⚠️ 설문 응답 데이터 요청 실패:', surveyId, responseData.status);
          }
          return { ...survey, responses: [], responseCount: 0 };
        } catch (error) {
          console.error(`설문 ${survey.id}의 응답 데이터 로드 실패:`, error);
          return { ...survey, responses: [], responseCount: 0 };
        }
      }));

      // 최신 설문이 먼저 오도록 정렬
      const sortedSurveys = surveysWithResponses.sort((a: any, b: any) => {
        return new Date(b.timestamp || b.created_at).getTime() - new Date(a.timestamp || a.created_at).getTime();
      });

      setAllSurveys(sortedSurveys);
      console.log('📊 모든 설문 정보 로드 완료:', sortedSurveys);
      console.log('🔍 회사별 설문 로드:', { companyId, surveysCount: surveys.length, surveys });
      console.log('🔍 allSurveys 상태 설정:', sortedSurveys.length, '개 설문');

      // 가장 최근 설문 정보 설정
      if (sortedSurveys.length > 0) {
        const latestSurvey = sortedSurveys[0];
        setSentSurveyInfo({
          surveyId: latestSurvey.id,
          surveyUrl: latestSurvey.url,
          sentEmails: latestSurvey.sent_emails || []
        });
        setSurveyResponses(latestSurvey.responses || []);
      }
    } catch (error) {
      console.error('❌ 설문 정보 로드 실패:', error);
      alert('설문 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 컴포넌트 마운트 시 모든 설문 정보 로드
  useEffect(() => {
    loadAllSurveys();
  }, [companyId]);

  // 최종 추천 카테고리 데이터 로드 및 계산 완료 여부 확인
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 계산 완료 여부 확인
      const isCompleted = localStorage.getItem('finalIssuepoolCalculated') === 'true';
      setIsCalculationCompleted(isCompleted);

      if (isCompleted) {
        const savedResult = localStorage.getItem('materialityAssessmentResult');
        console.log('🔍 localStorage에서 로드한 데이터:', savedResult);
        if (savedResult) {
          const parsedResult = JSON.parse(savedResult);
          console.log('🔍 파싱된 결과:', parsedResult);
          
          const categories = parsedResult.assessment_result?.matched_categories || 
                            parsedResult.matched_categories || 
                            parsedResult.categories || [];
          
          console.log('🔍 추출된 카테고리:', categories);
          
          // 최종 추천 카테고리만 필터링 (점수 기준으로 정렬)
          const sortedCategories = categories
            .filter((cat: any) => cat.final_score && cat.final_score > 0)
            .sort((a: any, b: any) => (b.final_score || 0) - (a.final_score || 0))
            .slice(0, 10); // 상위 10개만 표시
          
          setFinalCategories(sortedCategories);
          console.log('✅ 최종 추천 카테고리 로드 완료:', sortedCategories);
          
          // /mg 페이지에서 사용할 수 있도록 sessionStorage에 저장
          try {
            const selectedIssuePools = sortedCategories.map((category, index) => {
              // ESG 분류 매핑
              let esgClassificationId = 1; // 기본값: 사회
              if (category.esg_classification === '환경') {
                esgClassificationId = 4;
              } else if (category.esg_classification === '사회') {
                esgClassificationId = 1;
              } else if (category.esg_classification === '지배구조') {
                esgClassificationId = 2;
              } else if (category.esg_classification === '경제') {
                esgClassificationId = 3;
              }
              
              // materiality_category 테이블의 category_name과 매칭
              const categoryNameMapping: Record<string, number> = {
                '고용/일자리': 1,
                '공급망': 2,
                '기후변화': 3,
                '노사관계': 4,
                '대기오염': 5,
                '리스크': 6,
                '생물다양성/산림보호': 7,
                '성장': 8,
                '시장경쟁/시장점유/경제성과/재무성과': 9,
                '안전보건': 10
              };
              
              const categoryName = category.category || '카테고리명 없음';
              const mappedCategoryId = categoryNameMapping[categoryName] || (index + 1);
              
              return {
                id: index + 1, // 임시 ID
                corporation_id: 1, // 한온시스템 ID
                issue_pool: categoryName,
                category_id: mappedCategoryId,
                esg_classification_id: esgClassificationId,
                ranking: (index + 1).toString(),
                publish_year: new Date().getFullYear().toString()
              };
            });
            
            sessionStorage.setItem('selectedIssuePools', JSON.stringify(selectedIssuePools));
            console.log('💾 /mg 페이지용 selectedIssuePools 저장 완료:', selectedIssuePools);
            console.log('🔍 저장된 데이터 구조:', {
              count: selectedIssuePools.length,
              firstItem: selectedIssuePools[0],
              allItems: selectedIssuePools
            });
          } catch (error) {
            console.error('❌ selectedIssuePools 저장 실패:', error);
          }
        } else {
          console.warn('⚠️ localStorage에 materialityAssessmentResult가 없습니다');
        }
      } else {
        setFinalCategories([]);
        console.log('⚠️ 최종 이슈풀 계산이 완료되지 않았습니다.');
      }
    } catch (error) {
      console.error('❌ 최종 추천 카테고리 로드 실패:', error);
    }
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
      <div className="text-center">
        {/* 완료 아이콘 */}
        <div className="mb-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-6xl">🎉</span>
          </div>
        </div>

        {/* 완료 메시지 */}
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          중대성 평가가 완료되었습니다!
        </h2>

        {/* 발송된 설문 정보 */}
        <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              📋 발송된 설문 목록
            </h3>
            <button
              onClick={loadAllSurveys}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200 flex items-center"
              disabled={loading}
            >
              <svg className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">설문 정보를 불러오는 중...</p>
            </div>
          ) : (() => {
            console.log('🔍 렌더링 시 allSurveys 상태:', allSurveys.length, allSurveys);
            return allSurveys.length === 0;
          })() ? (
            <div className="text-center py-8 bg-white rounded-lg border border-blue-200">
              <div className="text-4xl mb-4">📭</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">발송된 설문이 없습니다</h4>
              <p className="text-gray-600">
                아직 발송된 설문이 없습니다. 새로운 설문을 생성하고 발송해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allSurveys.map((survey, index) => {
                const surveyId = survey.id || survey.survey_id || survey._id || `survey-${index}`;
                console.log('🔍 설문 카드 렌더링:', index, surveyId, survey);
                return (
                <div key={surveyId} className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="space-y-4">
                    {/* 설문 기본 정보 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-600">설문 ID:</span>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-blue-600">
                            {surveyId}
                          </code>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              최신
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          생성일: {survey.timestamp ? new Date(survey.timestamp).toLocaleString('ko-KR') : '날짜 정보 없음'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          응답 수: {survey.responseCount || 0}개
                        </div>
                        <div className="text-sm text-gray-500">
                          카테고리: {survey.total_categories || 0}개
                        </div>
                      </div>
                    </div>

                    {/* 설문 링크 */}
                    <div>
                      <span className="text-sm font-medium text-gray-600">설문 링크:</span>
                      <div className="mt-1">
                        <a
                          href={survey.url || `https://taeheonai.com/survey?id=${surveyId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 break-all font-mono bg-blue-50 px-2 py-1 rounded inline-block"
                        >
                          {survey.url || `https://taeheonai.com/survey?id=${surveyId}`}
                        </a>
                      </div>
                    </div>

                    {/* 카테고리 정보 */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>설문 상태</span>
                        <span>{survey.total_categories || 0}개 카테고리</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min((survey.total_categories || 0) * 10, 100)}%`
                          }}
                        />
                      </div>
                    </div>

                    {/* 작업 버튼 */}
                    <div className="flex gap-2 justify-end pt-2">
                      <button
                        onClick={() => {
                          // 현재 페이지에서 설문 결과 섹션으로 이동
                          const sectionChangeEvent = new CustomEvent('sectionChange', { 
                            detail: { sectionId: 'survey-results' } 
                          });
                          window.dispatchEvent(sectionChangeEvent);
                          
                          // 선택된 설문 정보 저장
                          localStorage.setItem('surveyResult', JSON.stringify({
                            survey_id: surveyId,
                            responses: survey.responses
                          }));
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        결과 보기
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm('⚠️ 경고: 이 작업은 되돌릴 수 없습니다.\n\n설문 응답 데이터를 완전히 삭제하시겠습니까?')) {
                            try {
                              const response = await fetch(`https://taeheonai-production-2130.up.railway.app/api/v1/materiality/surveys/${surveyId}/responses`, {
                                method: 'DELETE'
                              });

                              if (response.ok) {
                                await loadAllSurveys(); // 목록 새로고침
                                alert('✅ 설문 응답 데이터가 성공적으로 삭제되었습니다.');
                              } else {
                                throw new Error(`응답 코드: ${response.status}`);
                              }
                            } catch (error) {
                              console.error('설문 응답 삭제 실패:', error);
                              alert(`❌ 설문 응답 삭제 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-sm font-medium rounded transition-colors duration-200 border border-red-200 hover:border-red-300 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        응답 삭제
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm('⚠️ 경고: 이 작업은 되돌릴 수 없습니다.\n\n설문과 모든 응답 데이터를 완전히 삭제하시겠습니까?')) {
                            try {
                              const response = await fetch(`https://taeheonai-production-2130.up.railway.app/api/v1/materiality/surveys/${surveyId}`, {
                                method: 'DELETE'
                              });

                              if (response.ok) {
                                await loadAllSurveys(); // 목록 새로고침
                                alert('✅ 설문과 응답 데이터가 성공적으로 삭제되었습니다.');
                              } else {
                                throw new Error(`응답 코드: ${response.status}`);
                              }
                            } catch (error) {
                              console.error('설문 삭제 실패:', error);
                              alert(`❌ 설문 삭제 중 오류가 발생했습니다.\n\n${error instanceof Error ? error.message : '알 수 없는 오류'}`);
                            }
                          }
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-600 text-sm font-medium rounded transition-colors duration-200 border border-red-200 hover:border-red-300 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        설문 삭제
                      </button>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 최종 추천 카테고리 순위 */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">
            🏆 최종 추천 카테고리 순위
          </h3>
          
          {!isCalculationCompleted ? (
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">최종 이슈풀 계산이 필요합니다</h4>
              <p className="text-gray-600 mb-4">
                "설문 결과 자세히 보기" 섹션에서 "최종 이슈풀 계산하기" 버튼을 클릭하여 최종 추천 카테고리를 확인하세요.
              </p>
              <button
                onClick={() => {
                  // 현재 페이지에서 설문 결과 섹션으로 이동
                  const sectionChangeEvent = new CustomEvent('sectionChange', { 
                    detail: { sectionId: 'survey-results' } 
                  });
                  window.dispatchEvent(sectionChangeEvent);
                }}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                설문 결과로 이동
              </button>
            </div>
          ) : finalCategories.length > 0 ? (
            <div>
              {/* MG index 윤문하기 버튼 */}
              <div className="mb-6 text-center">
                <button
                  onClick={() => {
                    // 최종 카테고리 목록을 MG 페이지로 전달하고 이동
                    // materiality_category 테이블의 category_name과 매칭
                    const categoryNameMapping: Record<string, number> = {
                      '고용/일자리': 1,
                      '공급망': 2,
                      '기후변화': 3,
                      '노사관계': 4,
                      '대기오염': 5,
                      '리스크': 6,
                      '생물다양성/산림보호': 7,
                      '성장': 8,
                      '시장경쟁/시장점유/경제성과/재무성과': 9,
                      '안전보건': 10
                    };
                    
                    const finalIssuePools = finalCategories.map((category, index) => {
                      const categoryName = category.category || category.selected_base_issue_pool || '카테고리명 없음';
                      const mappedCategoryId = categoryNameMapping[categoryName] || (index + 1);
                      
                      return {
                        id: index + 1,
                        issue_pool: categoryName,
                        category: category.category,
                        category_id: mappedCategoryId,
                        ranking: index + 1,
                        score: category.score || 0,
                        corporation_id: 1, // 기본값
                        publish_year: '2024', // 기본값
                        esg_classification_id: 1 // 기본값
                      };
                    });
                    
                    // Zustand store에 최종 이슈풀 저장
                    localStorage.setItem('finalIssuePools', JSON.stringify(finalIssuePools));
                    
                    // MG 페이지로 이동
                    window.location.href = '/mg';
                  }}
                  className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 inline-flex items-center"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  MG Index 윤문하기
                </button>
                <p className="text-sm text-gray-600 mt-2">
                  최종 중대성 평가 결과를 바탕으로 GRI 인덱스를 윤문합니다
                </p>
              </div>
              
              <div className="space-y-3">
                {finalCategories.map((category, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
                          {index + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {category.category || '카테고리명 없음'}
                          </h4>
                        {category.esg_classification && (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                            category.esg_classification === '환경' ? 'bg-green-100 text-green-700' :
                            category.esg_classification === '사회' ? 'bg-orange-100 text-orange-700' :
                            category.esg_classification === '지배구조' ? 'bg-blue-100 text-blue-700' :
                            category.esg_classification === '경제' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {category.esg_classification}
                          </span>
                        )}
                        </div>
                      </div>
                    </div>
                    
                    {category.selected_base_issue_pool && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">선택된 이슈</div>
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded-full">
                          {category.selected_base_issue_pool}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-4xl mb-4">📊</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">데이터가 없습니다</h4>
              <p className="text-gray-600">
                최종 이슈풀 계산이 완료되었지만, 추천 카테고리 데이터를 찾을 수 없습니다.
              </p>
            </div>
          )}
        </div>

        {/* 다음 단계 버튼들 */}
        <div className="mt-8 space-y-6">
          {/* MG Index 윤문 버튼 */}
          <div className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              🎨 MG Index 윤문
            </h3>
            <p className="text-gray-600 text-center mb-6">
              최종 추천 카테고리를 바탕으로 GRI 인덱스를 윤문하여 보고서를 작성하세요.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  window.location.href = '/mg';
                }}
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                MG Index 윤문하기
              </button>
            </div>
          </div>

          {/* GRI 보고서 작성 버튼 */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 text-center">
              🎯 GRI 보고서 작성
            </h3>
            <p className="text-gray-600 text-center mb-6">
              중대성 평가가 완료되었습니다. 이제 GRI 보고서를 작성하여 ESG 성과를 공시하세요.
            </p>
            <div className="flex justify-center">
              <button
                onClick={() => {
                  window.location.href = '/gri';
                }}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                GRI 보고서 작성하기
              </button>
            </div>
          </div>
        </div>

        {/* 완료 축하 메시지 */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">
            🎊 축하합니다! 중대성 평가 자동화 플랫폼을 통해 성공적으로 평가를 완료하셨습니다.
          </p>
        </div>
      </div>
    </div>
  );
}