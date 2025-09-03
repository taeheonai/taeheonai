import React from 'react';
import { normalizeSurveyKey } from '@/lib/surveyKey';

interface SurveyResultProps {
  excelData: any[];
  surveyResult: any;
}

const SurveyResult: React.FC<SurveyResultProps> = ({ excelData, surveyResult }) => {
  const [backendResponses, setBackendResponses] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [isDataHidden, setIsDataHidden] = React.useState(true);
  const [responseStatus, setResponseStatus] = React.useState({ total: 0, sent: 0, responded: 0, responseRate: 0 });
  const [sentSurveyInfo, setSentSurveyInfo] = React.useState<any>(null);

  // 컴포넌트 마운트 시 사용자 활동 여부 확인
  React.useEffect(() => {
    // 브라우저 환경이 아니면 실행하지 않음
    if (typeof window === 'undefined') return;

    // 설문 결과가 있으면 자동으로 표시
    if (surveyResult && surveyResult.survey_id) {
      setIsDataHidden(false);
      console.log('📊 설문 결과 있음: 자동으로 데이터 표시');
      return;
    }

    // localStorage에서 설문 결과 확인
    const surveyResultData = localStorage.getItem('surveyResult');
    if (surveyResultData) {
      try {
        const parsed = JSON.parse(surveyResultData);
        if (parsed.survey_id || parsed.responses) {
          setIsDataHidden(false);
          console.log('📊 localStorage 설문 결과 감지: 자동으로 데이터 표시');
          return;
        }
      } catch (error) {
        console.error('설문 결과 파싱 실패:', error);
      }
    }

    // 처음 접속 시에는 데이터를 화면에 표시하지 않음
    const hasUserActivity = localStorage.getItem('hasUserActivity');
    if (!hasUserActivity) {
      setIsDataHidden(true);
      console.log('🆕 처음 접속: 화면에 데이터를 표시하지 않습니다.');
      return;
    }

    // 사용자 활동이 있는 경우에만 데이터를 화면에 표시
    if (hasUserActivity === 'true') {
      setIsDataHidden(false);
      console.log('💾 데이터 표시 (사용자 활동 있음)');
    }
  }, [surveyResult]);

  // 발송된 설문 정보 로드 및 설문 결과 자동 표시
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const loadSentSurveyInfo = () => {
      const saved = localStorage.getItem('sentSurveyInfo');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setSentSurveyInfo(parsed);
          console.log('📧 발송된 설문 정보 로드:', parsed);
        } catch (error) {
          console.error('발송된 설문 정보 파싱 실패:', error);
        }
      }
    };

    // 설문 결과 자동 표시 확인
    const checkSurveyResult = () => {
      const surveyResultData = localStorage.getItem('surveyResult');
      if (surveyResultData) {
        try {
          const parsed = JSON.parse(surveyResultData);
          if (parsed.survey_id || parsed.responses) {
            setIsDataHidden(false);
            console.log('📊 설문 결과 감지: 자동으로 데이터 표시');
          }
        } catch (error) {
          console.error('설문 결과 파싱 실패:', error);
        }
      }
    };
    
    loadSentSurveyInfo();
    checkSurveyResult();
    
    // survey_send.tsx에서 설문 선택 시 발생하는 이벤트 리스너
    const handleSurveySelected = (event: CustomEvent) => {
      console.log('🔄 설문 선택 이벤트 감지:', event.detail);
      const { surveyId, surveyResult } = event.detail;
      
      // 설문 결과 정보 업데이트
      if (surveyResult) {
        // surveyResult prop이 업데이트되도록 강제 리렌더링 트리거
        setIsDataHidden(false);
        console.log('📊 설문 선택으로 인한 결과 정보 업데이트:', surveyResult);
      }
    };
    
    // 이벤트 리스너 등록
    window.addEventListener('surveySelected', handleSurveySelected as EventListener);
    
    // 주기적으로 발송된 설문 정보 및 설문 결과 확인 (5초마다) - 주석처리
    // const intervalId = setInterval(() => {
    //   loadSentSurveyInfo();
    //   checkSurveyResult();
    // }, 5000);
    
    return () => {
      window.removeEventListener('surveySelected', handleSurveySelected as EventListener);
      // clearInterval(intervalId);
    };
  }, []);

  // 백엔드에서 설문 응답 데이터 로드 (동일한 내용의 설문들 포함) - 전체 주석처리
  // React.useEffect(() => {
  //   let isSubscribed = true; // 비동기 작업 취소를 위한 플래그
  //   let previousResponseCount = 0; // 이전 응답 수를 저장

  //   const loadBackendResponses = async () => {
  //     if (!surveyResult?.survey_id) {
  //       console.log('⚠️ 설문 ID가 없어 응답 데이터를 불러올 수 없습니다.');
  //       return;
  //     }

  //     try {
  //       // 첫 로드 시에만 로딩 표시
  //       if (backendResponses.length === 0) {
  //         setLoading(true);
  //       }

  //       console.log('🔍 백엔드 응답 데이터 로드 시작:', surveyResult.survey_id);

  //       // 먼저 설문 정보를 가져와서 content_hash 확인
  //       const surveyResponse = await fetch(`/api/v1/materiality-service/surveys/${surveyResult.survey_id}`);
  //       if (!isSubscribed) return; // 컴포넌트가 언마운트되었다면 중단

  //       console.log('🔍 설문 정보 응답:', surveyResponse.status);

  //       if (surveyResponse.ok) {
  //         const surveyData = await surveyResponse.json();
  //         console.log('🔍 설문 데이터:', surveyData);
  //         const contentHash = surveyData.content_hash;
          
  //         let newResponses = [];
  //         if (contentHash) {
  //           // 동일한 내용 해시를 가진 설문들의 모든 응답을 가져오기
  //           const responsesResponse = await fetch(`/api/v1/materiality-service/surveys/${surveyResult.survey_id}/responses?content_hash=${contentHash}`);
  //           if (!isSubscribed) return;

  //           console.log('🔍 응답 데이터 응답 (content_hash):', responsesResponse.status);
  //           if (responsesResponse.ok) {
  //             const data = await responsesResponse.json();
  //             newResponses = data.responses || [];
  //             console.log('🔍 응답 데이터 (content_hash):', newResponses);
  //           }
  //         } else {
  //           // content_hash가 없으면 기존 방식으로 단일 설문 응답만 가져오기
  //           const response = await fetch(`/api/v1/materiality-service/surveys/${surveyResult.survey_id}/responses`);
  //           if (!isSubscribed) return;

  //           console.log('🔍 응답 데이터 응답 (단일):', response.status);
  //           if (response.ok) {
  //             const data = await response.json();
  //             newResponses = data.responses || [];
  //             console.log('🔍 응답 데이터 (단일):', newResponses);
  //           }
  //         }

  //         // 새로운 응답이 있을 때만 상태 업데이트 및 로그 출력
  //         if (newResponses.length !== previousResponseCount) {
  //           setBackendResponses(newResponses);
  //           console.log(`📊 설문 응답 업데이트: ${newResponses.length}개 (${newResponses.length - previousResponseCount}개 증가)`);
  //           previousResponseCount = newResponses.length;
  //         }
  //       } else {
  //         console.error('❌ 설문 정보 조회 실패:', surveyResponse.status, surveyResponse.statusText);
  //       }
  //     } catch (error) {
  //       console.error('❌ 백엔드 응답 데이터 로드 실패:', error);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   // 초기 로드 - 주석처리 (수동으로 버튼을 눌러서 로드)
  //   // loadBackendResponses();

  //   // 주기적으로 새로운 응답 확인 (30초마다) - 주석처리
  //   // const intervalId = setInterval(loadBackendResponses, 30000);

  //   // 컴포넌트 언마운트 시 정리
  //   return () => {
  //     isSubscribed = false;
  //     // clearInterval(intervalId);
  //   };
  // }, [surveyResult?.survey_id]);

  // 설문 결과 통계 계산 (발송된 설문의 응답만 사용)
  const calculateSurveyStats = () => {
    // 브라우저 환경이 아니면 빈 통계 반환
    if (typeof window === 'undefined') return null;

    // 현재 선택된 설문 ID 가져오기 (localStorage에서 실시간으로)
    let currentSurveyId = null;
    try {
      const surveyResultData = localStorage.getItem('surveyResult');
      if (surveyResultData) {
        const parsed = JSON.parse(surveyResultData);
        currentSurveyId = parsed.survey_id;
      }
    } catch (error) {
      console.error('설문 결과 파싱 실패:', error);
    }

    // 발송된 설문 정보 사용 (상태로 관리되는 정보)
    const sentSurveyId = sentSurveyInfo?.surveyId;
    const sentSurveyUrl = sentSurveyInfo?.surveyUrl;
    
    console.log('🔍 통계 계산 시작 (현재 선택된 설문 기준):', {
      currentSurveyId,
      sentSurveyId,
      sentSurveyUrl,
      sentSurveyInfo,
      backendResponsesLength: backendResponses.length,
      surveyResultResponses: surveyResult?.responses?.length || 0,
      surveyResult: surveyResult,
      allBackendResponses: backendResponses
    });
    
    // 현재 선택된 설문 ID를 우선적으로 사용, 없으면 발송된 설문 ID 사용
    const targetSurveyId = currentSurveyId || sentSurveyId;
    
    // 선택된 설문의 응답만 필터링 (선택된 설문이 없으면 전체 응답 사용)
    const filteredResponses = targetSurveyId 
      ? backendResponses.filter(response => response.survey_id === targetSurveyId)
      : backendResponses;
    
    console.log('🔍 필터링된 응답:', {
      targetSurveyId,
      currentSurveyId,
      sentSurveyId,
      filteredResponsesLength: filteredResponses.length,
      filteredResponses: filteredResponses
    });
    
    const responses = filteredResponses.length > 0 ? filteredResponses : (surveyResult?.responses || []);
    
    console.log('🔍 응답 데이터:', {
      filteredResponsesLength: filteredResponses.length,
      responsesLength: responses.length,
      responses: responses
    });
    
    if (!responses || responses.length === 0) {
      console.log('⚠️ 응답 데이터가 없습니다.');
      return null;
    }

    // 디버깅을 위한 로그
    console.log('🔍 설문 결과 통계 계산 시작:', {
      backendResponsesLength: backendResponses.length,
      surveyResultResponsesLength: surveyResult?.responses?.length || 0,
      responsesLength: responses.length,
      firstResponse: responses[0]
    });

    // 백엔드 응답 데이터 구조에 맞게 처리
    let allResponses: any[] = [];
    const uniqueRespondents = new Set();

    if (backendResponses.length > 0) {
      // 백엔드 데이터: 각 응답자의 responses 배열을 평탄화
      responses.forEach((response: any) => {
        // 응답자 수 계산
        const respondentId = response.participant?.email || response.participant_id || 'unknown';
        uniqueRespondents.add(respondentId);
        
        // 각 응답자의 responses 배열을 평탄화
        if (response.responses && Array.isArray(response.responses)) {
          response.responses.forEach((item: any) => {
            allResponses.push({
              ...item,
              participant: response.participant,
              participant_id: response.participant_id
            });
          });
        }
      });
    } else {
      // 로컬 데이터: 기존 구조 유지
      allResponses = responses;
      responses.forEach((response: any) => {
        const respondentId = response.participant?.email || response.respondentId || 'unknown';
        uniqueRespondents.add(respondentId);
      });
    }
    
    const stats = {
      total: uniqueRespondents.size, // 실제 응답자 수
      totalResponses: allResponses.length, // 총 응답 항목 수
      environmental: allResponses.filter((item: any) => item.section === 'Environmental').length,
      social: allResponses.filter((item: any) => item.section === 'Social').length,
      governance: allResponses.filter((item: any) => item.section === 'Governance').length,
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

    allResponses.forEach((item: any) => {
      if (item.outsideScore !== null && item.outsideScore !== undefined) {
        stats.scoreDistribution.outside[item.outsideScore]++;
        totalOutsideScore += item.outsideScore;
        validOutsideScores++;
      }
      if (item.insideScore !== null && item.insideScore !== undefined) {
        stats.scoreDistribution.inside[item.insideScore]++;
        totalInsideScore += item.insideScore;
        validInsideScores++;
      }
    });

    stats.averageOutsideScore = validOutsideScores > 0 ? Math.round((totalOutsideScore / validOutsideScores) * 10) / 10 : 0;
    stats.averageInsideScore = validInsideScores > 0 ? Math.round((totalInsideScore / validInsideScores) * 10) / 10 : 0;

    // 상위 카테고리 (점수 합계 기준)
    const categoryScores = allResponses.map((item: any) => ({
      category: item.category,
      title: item.title,
      outsideScore: item.outsideScore || 0,
      insideScore: item.insideScore || 0,
      totalScore: (item.outsideScore || 0) + (item.insideScore || 0)
    }));

    stats.topCategories = categoryScores
      .sort((a: any, b: any) => b.totalScore - a.totalScore)
      .slice(0, 5);

    // 디버깅을 위한 로그
    console.log('📊 설문 결과 통계 계산 완료:', {
      totalRespondents: stats.total,
      totalResponses: stats.totalResponses,
      environmental: stats.environmental,
      social: stats.social,
      governance: stats.governance,
      averageOutsideScore: stats.averageOutsideScore,
      averageInsideScore: stats.averageInsideScore,
      allResponsesLength: allResponses.length,
      firstAllResponse: allResponses[0]
    });

    return stats;
  };

  const stats = React.useMemo(() => calculateSurveyStats(), [sentSurveyInfo, backendResponses, surveyResult]);

  // 디버깅을 위한 로그 추가
  React.useEffect(() => {
    console.log('🔍 SurveyResult 디버깅 정보:', {
      surveyResult: surveyResult,
      backendResponses: backendResponses,
      stats: stats,
      excelData: excelData,
      sentSurveyInfo: sentSurveyInfo,
      isDataHidden: isDataHidden,
      loading: loading
    });
  }, [surveyResult, backendResponses, stats, excelData, sentSurveyInfo, isDataHidden, loading]);

  // 사용자 활동을 표시하는 함수
  const markUserActivity = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasUserActivity', 'true');
      setIsDataHidden(false);
      console.log('✅ 사용자 활동 표시: 설문 결과 불러오기 완료');
    }
  };

  // 설문 응답 데이터 수동 로드 함수
  const loadSurveyResponses = async () => {
    // 현재 선택된 설문 ID를 우선적으로 사용
    let currentSurveyId = null;
    try {
      const surveyResultData = localStorage.getItem('surveyResult');
      if (surveyResultData) {
        const parsed = JSON.parse(surveyResultData);
        currentSurveyId = parsed.survey_id;
      }
    } catch (error) {
      console.error('설문 결과 파싱 실패:', error);
    }
    
    const targetSurveyId = currentSurveyId || sentSurveyInfo?.surveyId || surveyResult?.survey_id;
    
    if (!targetSurveyId) {
      alert('❌ 설문 ID가 없습니다.');
      return;
    }
    
    try {
      setLoading(true);
      console.log('🔍 설문 응답 데이터 수동 로드 시작:', {
        targetSurveyId,
        currentSurveyId,
        sentSurveyId: sentSurveyInfo?.surveyId,
        surveyResultId: surveyResult?.survey_id
      });

      // 먼저 설문 정보를 가져와서 content_hash 확인
      const surveyResponse = await fetch(`/api/v1/materiality-service/surveys/${targetSurveyId}`);
      if (!surveyResponse.ok) {
        throw new Error(`설문 정보 조회 실패: ${surveyResponse.status}`);
      }

      const surveyData = await surveyResponse.json();
      console.log('🔍 설문 데이터:', surveyData);
      const contentHash = surveyData.content_hash;
      
      let newResponses = [];
      if (contentHash) {
        // 동일한 내용 해시를 가진 설문들의 모든 응답을 가져오기
        const responsesResponse = await fetch(`/api/v1/materiality-service/surveys/${targetSurveyId}/responses?content_hash=${contentHash}`);
        if (responsesResponse.ok) {
          const data = await responsesResponse.json();
          newResponses = data.responses || [];
          console.log('🔍 응답 데이터 (content_hash):', newResponses);
        }
      } else {
        // content_hash가 없으면 기존 방식으로 단일 설문 응답만 가져오기
        const response = await fetch(`/api/v1/materiality-service/surveys/${targetSurveyId}/responses`);
        if (response.ok) {
          const data = await response.json();
          newResponses = data.responses || [];
          console.log('🔍 응답 데이터 (단일):', newResponses);
        }
      }

      setBackendResponses(newResponses);
      console.log(`📊 설문 응답 데이터 로드 완료: ${newResponses.length}개`);

      // 데이터 표시 활성화
      setIsDataHidden(false);
      markUserActivity();

      // final_issuepool.tsx에서 사용할 수 있도록 localStorage에 저장
      localStorage.setItem('backendSurveyResponses', JSON.stringify(newResponses));
      console.log('💾 final_issuepool.tsx용 설문 데이터 저장 완료');

      // 응답 현황 업데이트
      const validEmails = (excelData || [])
        .map((r) => r.email?.trim())
        .filter((e): e is string => !!e && e.includes('@'));
      
      const totalEmails = validEmails.length;
      const responseRate = totalEmails > 0 ? Math.round((newResponses.length / totalEmails) * 100) : 0;
      
      setResponseStatus({
        total: totalEmails,
        sent: totalEmails,
        responded: newResponses.length,
        responseRate: responseRate
      });
      
      console.log('📊 응답 현황 업데이트:', {
        totalEmails,
        newResponsesLength: newResponses.length,
        responseRate,
        responseStatus: {
          total: totalEmails,
          sent: totalEmails,
          responded: newResponses.length,
          responseRate: responseRate
        }
      });

      alert(`✅ 설문 응답 데이터 로드 완료!\n\n• 총 응답: ${newResponses.length}개\n• 응답률: ${responseRate}%\n\n💡 이제 "최종 이슈풀 계산하기"에서 설문 데이터를 사용할 수 있습니다.`);
    } catch (error) {
      console.error('❌ 설문 응답 데이터 로드 실패:', error);
      alert(`❌ 설문 응답 데이터 로드 실패\n\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setLoading(false);
    }
  };



  // 데이터가 숨겨진 상태일 때 표시 (설문 결과가 없고 백엔드 응답도 없는 경우에만)
  if (isDataHidden && !surveyResult && backendResponses.length === 0) {
    return (
      <div id="survey-results" className="bg-white rounded-xl shadow-lg p-6 mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          📊 설문 결과 확인
        </h2>
        
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">📈</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">설문 결과 확인</h3>
          <p className="text-gray-500 mb-6">설문 응답 결과를 확인하고 분석할 수 있는 공간입니다.</p>
          
          <button
            onClick={() => {
              markUserActivity();
              loadSurveyResponses();
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            설문 결과 불러오기
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div id="survey-results" className="bg-white rounded-xl shadow-lg p-6 mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          📊 설문 결과 확인
        </h2>
        
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">⏳</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">데이터 로딩 중...</h3>
          <p className="text-gray-500">백엔드에서 설문 응답 데이터를 불러오고 있습니다.</p>
        </div>
      </div>
    );
  }

  if (!surveyResult && backendResponses.length === 0) {
    return (
      <div id="survey-results" className="bg-white rounded-xl shadow-lg p-6 mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          📊 설문 결과 확인
        </h2>
        
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">📈</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">설문 결과 확인</h3>
          <p className="text-gray-500 mb-6">설문 응답 결과를 확인하고 분석할 수 있는 공간입니다.</p>
          
          <button
            onClick={() => {
              markUserActivity();
              loadSurveyResponses();
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            설문 결과 불러오기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="survey-results" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        📊 설문 결과 확인
      </h2>
      
      <div className="space-y-6">
                     {/* 기본 정보 */}
           <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-semibold text-blue-800">📋 설문 기본 정보</h3>
               <button
                 onClick={loadSurveyResponses}
                 disabled={(!surveyResult?.survey_id && !sentSurveyInfo?.surveyId) || loading}
                 className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center ${
                   (!surveyResult?.survey_id && !sentSurveyInfo?.surveyId) || loading
                     ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                     : 'bg-blue-600 hover:bg-blue-700 text-white'
                 }`}
               >
                 <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                 </svg>
                 {loading ? '로딩 중...' : '응답 데이터 로드'}
               </button>
             </div>
             <div className="space-y-3">
               <div className="flex items-center">
                 <span className="text-gray-700 font-medium w-32">설문 제목:</span>
                 <span className="text-gray-900">중대성 평가 설문</span>
               </div>
               <div className="flex items-center">
                 <span className="text-gray-700 font-medium w-32">설문 ID:</span>
                 <span className="text-gray-900">
                   {(() => {
                     // 현재 선택된 설문 ID를 우선적으로 표시
                     let currentSurveyId = null;
                     try {
                       const surveyResultData = localStorage.getItem('surveyResult');
                       if (surveyResultData) {
                         const parsed = JSON.parse(surveyResultData);
                         currentSurveyId = parsed.survey_id;
                       }
                     } catch (error) {
                       console.error('설문 결과 파싱 실패:', error);
                     }
                     
                     const displayId = currentSurveyId || sentSurveyInfo?.surveyId || surveyResult?.survey_id || '없음';
                     const isSentSurvey = sentSurveyInfo?.surveyId && sentSurveyInfo.surveyId === displayId;
                     const isCurrentSelected = currentSurveyId && currentSurveyId === displayId;
                     
                     return (
                       <>
                         {displayId}
                         {isSentSurvey && (
                           <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                             발송된 설문
                           </span>
                         )}
                         {isCurrentSelected && !isSentSurvey && (
                           <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                             현재 선택
                           </span>
                         )}
                       </>
                     );
                   })()}
                 </span>
               </div>
               <div className="flex items-center">
                 <span className="text-gray-700 font-medium w-32">설문 버전:</span>
                 <span className="text-gray-900">
                   {surveyResult?.content_hash ? (
                     <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                       {surveyResult.content_hash.substring(0, 8)}
                     </span>
                   ) : '기본 버전'}
                 </span>
               </div>
               {sentSurveyInfo?.surveyUrl && (
                 <div className="flex items-center">
                   <span className="text-gray-700 font-medium w-32">발송된 설문 URL:</span>
                   <span className="text-gray-900 font-mono text-sm bg-blue-50 px-2 py-1 rounded break-all">
                     {sentSurveyInfo.surveyUrl}
                   </span>
                 </div>
               )}
               <div className="flex items-center">
                 <span className="text-gray-700 font-medium w-32">총 응답자:</span>
                 <span className="text-gray-900">{stats?.total || 0}명</span>
               </div>
               <div className="flex items-center">
                 <span className="text-gray-700 font-medium w-32">설문 항목:</span>
                 <span className="text-gray-900">
                   {(() => {
                     // 설문의 실제 질문 개수 계산 (응답자 수와 관계없이 고정)
                     if (backendResponses.length > 0) {
                       // 첫 번째 응답자의 responses 배열 길이를 사용
                       const firstResponse = backendResponses[0];
                       return firstResponse?.responses?.length || 0;
                     } else if (surveyResult?.responses && surveyResult.responses.length > 0) {
                       // surveyResult에서 첫 번째 응답자의 responses 배열 길이를 사용
                       const firstResponse = surveyResult.responses[0];
                       return firstResponse?.responses?.length || 0;
                     }
                     return 0;
                   })()}개
                 </span>
               </div>
               {surveyResult?.created_at && (
                 <div className="flex items-center">
                   <span className="text-gray-700 font-medium w-32">생성 시간:</span>
                   <span className="text-gray-900">
                     {new Date(surveyResult.created_at).toLocaleString('ko-KR')}
                   </span>
                 </div>
               )}
             </div>
           </div>

          {/* 응답 현황 - stats가 있을 때만 표시 */}
          {stats && (
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-green-800">📊 응답 현황</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center bg-white p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{responseStatus.total}</div>
                <div className="text-sm text-green-600">총 발송 대상</div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{responseStatus.responded}</div>
                <div className="text-sm text-green-600">응답 완료</div>
              </div>
              <div className="text-center bg-white p-4 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">{responseStatus.responseRate}%</div>
                <div className="text-sm text-green-600">응답률</div>
              </div>
            </div>
            
            {/* 응답률 진행바 */}
            <div className="bg-white p-4 rounded-lg border border-green-200">
              <div className="flex justify-between text-sm text-green-600 mb-2">
                <span>응답률</span>
                <span>{responseStatus.responseRate}%</span>
              </div>
              <div className="w-full bg-green-200 rounded-full h-3">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${responseStatus.responseRate}%` }} 
                />
              </div>
            </div>
          </div>
          )}

          {/* 평균 점수 - stats가 있을 때만 표시 */}
          {stats && (
          <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-4">📊 평균 점수</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.averageOutsideScore}</div>
                <div className="text-sm text-purple-600">기업 재무 중요도 (Outside-in)</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{stats.averageInsideScore}</div>
                <div className="text-sm text-purple-600">환경/사회 중요도 (Inside-out)</div>
              </div>
            </div>
          </div>
          )}

          {/* 점수 분포 - stats가 있을 때만 표시 */}
          {stats && (
          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
            <h3 className="text-lg font-semibold text-orange-800 mb-4">📈 점수 분포</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Outside Score Distribution */}
              <div className="min-w-0">
                <h4 className="text-md font-semibold text-orange-700 mb-3">기업 재무 중요도 (Outside-in)</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const count = stats.scoreDistribution.outside[score];
                    // 각 점수별 응답 수를 기준으로 그래프 길이 계산
                    const maxCount = Math.max(...Object.values(stats.scoreDistribution.outside));
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={score} className="flex items-center min-w-0">
                        <span className="w-8 text-sm text-orange-600 flex-shrink-0">{score}점</span>
                        <div className="flex-1 mx-3 bg-orange-200 rounded-full h-2 min-w-0 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              count > 0 ? 'bg-orange-500' : 'bg-orange-300'
                            }`}
                            style={{ 
                              width: `${barWidth}%` 
                            }}
                          ></div>
                        </div>
                        <span className="w-8 text-sm text-orange-600 flex-shrink-0 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inside Score Distribution */}
              <div className="min-w-0">
                <h4 className="text-md font-semibold text-orange-700 mb-3">환경/사회 중요도 (Inside-out)</h4>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((score) => {
                    const count = stats.scoreDistribution.inside[score];
                    // 각 점수별 응답 수를 기준으로 그래프 길이 계산
                    const maxCount = Math.max(...Object.values(stats.scoreDistribution.inside));
                    const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    
                    return (
                      <div key={score} className="flex items-center min-w-0">
                        <span className="w-8 text-sm text-orange-600 flex-shrink-0">{score}점</span>
                        <div className="flex-1 mx-3 bg-orange-200 rounded-full h-2 min-w-0 overflow-hidden">
                          <div 
                            className={`h-2 rounded-full transition-all duration-300 ${
                              count > 0 ? 'bg-orange-500' : 'bg-orange-300'
                            }`}
                            style={{ 
                              width: `${barWidth}%` 
                            }}
                          ></div>
                        </div>
                        <span className="w-8 text-sm text-orange-600 flex-shrink-0 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* 전체 응답자 수 표시 */}
            <div className="mt-4 pt-4 border-t border-orange-200">
              <div className="text-center text-sm text-orange-600">
                📊 총 응답자: {stats.total}명 기준
              </div>
            </div>
          </div>
          )}

          {/* 상위 카테고리 - stats가 있을 때만 표시 */}
          {stats && (
          <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-800 mb-4">🏆 상위 카테고리 (점수 합계 기준)</h3>
            <div className="space-y-3">
              {stats.topCategories.map((category, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-200">
                  <div className="flex items-center">
                    <span className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                      {index + 1}
                    </span>
                    <div>
                      <div className="font-medium text-gray-900">{category.title}</div>
                      <div className="text-sm text-gray-600">{category.category}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-indigo-600">{category.totalScore}점</div>
                    <div className="text-sm text-gray-500">
                      Outside: {category.outsideScore} | Inside: {category.insideScore}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* stats가 없을 때 안내 메시지 */}
          {!stats && (
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-800 mb-4">⚠️ 통계 정보 없음</h3>
              <p className="text-yellow-700">
                설문 응답 데이터가 아직 없습니다. 설문을 완료한 후 다시 확인해주세요.
              </p>
            </div>
          )}

        </div>
    </div>
  );
};

export default SurveyResult;