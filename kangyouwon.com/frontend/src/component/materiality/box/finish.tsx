'use client';

import React, { useState, useEffect } from 'react';

export default function Finish() {
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
      // 기업의 모든 설문 정보 가져오기
      const response = await fetch('/api/v1/materiality-service/surveys');
      if (!response.ok) {
        throw new Error(`설문 정보 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      const surveys = data.surveys || [];

      // 각 설문의 응답 데이터 가져오기
      const surveysWithResponses = await Promise.all(surveys.map(async (survey: any) => {
        try {
          const responseData = await fetch(`/api/v1/materiality-service/surveys/${survey.id}/responses`);
          if (responseData.ok) {
            const responses = await responseData.json();
            return {
              ...survey,
              responses: responses.responses || [],
              responseCount: responses.responses?.length || 0
            };
          }
          return { ...survey, responses: [], responseCount: 0 };
        } catch (error) {
          console.error(`설문 ${survey.id}의 응답 데이터 로드 실패:`, error);
          return { ...survey, responses: [], responseCount: 0 };
        }
      }));

      // 최신 설문이 먼저 오도록 정렬
      const sortedSurveys = surveysWithResponses.sort((a: any, b: any) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setAllSurveys(sortedSurveys);
      console.log('📊 모든 설문 정보 로드 완료:', sortedSurveys);

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
  }, []);

  // 최종 추천 카테고리 데이터 로드 및 계산 완료 여부 확인
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // 계산 완료 여부 확인
      const isCompleted = localStorage.getItem('finalIssuepoolCalculated') === 'true';
      setIsCalculationCompleted(isCompleted);

      if (isCompleted) {
        const savedResult = localStorage.getItem('materialityAssessmentResult');
        if (savedResult) {
          const parsedResult = JSON.parse(savedResult);
          const categories = parsedResult.assessment_result?.data?.matched_categories || 
                            parsedResult.assessment_result?.matched_categories || 
                            parsedResult.matched_categories || [];
          
          // 최종 추천 카테고리만 필터링 (점수 기준으로 정렬)
          const sortedCategories = categories
            .filter((cat: any) => cat.final_score && cat.final_score > 0)
            .sort((a: any, b: any) => (b.final_score || 0) - (a.final_score || 0))
            .slice(0, 10); // 상위 10개만 표시
          
          setFinalCategories(sortedCategories);
          console.log('✅ 최종 추천 카테고리 로드 완료:', sortedCategories);
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
          ) : allSurveys.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-lg border border-blue-200">
              <div className="text-4xl mb-4">📭</div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">발송된 설문이 없습니다</h4>
              <p className="text-gray-600">
                아직 발송된 설문이 없습니다. 새로운 설문을 생성하고 발송해보세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allSurveys.map((survey, index) => (
                <div key={survey.id} className="bg-white rounded-lg p-4 border border-blue-200">
                  <div className="space-y-4">
                    {/* 설문 기본 정보 */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium text-gray-600">설문 ID:</span>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-blue-600">
                            {survey.id}
                          </code>
                          {index === 0 && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                              최신
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          생성일: {new Date(survey.created_at).toLocaleString('ko-KR')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          응답률: {survey.sent_emails?.length ? Math.round((survey.responseCount / survey.sent_emails.length) * 100) : 0}%
                        </div>
                        <div className="text-sm text-gray-500">
                          ({survey.responseCount} / {survey.sent_emails?.length || 0})
                        </div>
                      </div>
                    </div>

                    {/* 설문 링크 */}
                    <div>
                      <span className="text-sm font-medium text-gray-600">설문 링크:</span>
                      <div className="mt-1">
                        <a
                          href={survey.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800 break-all font-mono bg-blue-50 px-2 py-1 rounded inline-block"
                        >
                          {survey.url}
                        </a>
                      </div>
                    </div>

                    {/* 진행률 바 */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>응답 진행률</span>
                        <span>{survey.sent_emails?.length ? Math.round((survey.responseCount / survey.sent_emails.length) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${survey.sent_emails?.length ? Math.round((survey.responseCount / survey.sent_emails.length) * 100) : 0}%`
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
                            survey_id: survey.id,
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
                              const response = await fetch(`/api/v1/materiality-service/surveys/${survey.id}/responses`, {
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
                              const response = await fetch(`/api/v1/materiality-service/surveys/${survey.id}`, {
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
              ))}
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
                    
                    {category.selected_base_issue_pool && (
                      <div className="text-right">
                        <div className="text-sm text-gray-600 mb-1">선택된 이슈</div>
                        <div className="text-sm font-medium text-gray-900 bg-gray-50 px-3 py-1 rounded-full">
                          {category.selected_base_issue_pool}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
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

        {/* 완료 축하 메시지 */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-medium">
            🎊 축하합니다! 중대성 평가 자동화 플랫폼을 통해 성공적으로 평가를 완료하셨습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
