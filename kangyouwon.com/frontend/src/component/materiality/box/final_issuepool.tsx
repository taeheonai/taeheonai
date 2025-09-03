"use client";
import React, { useEffect, useState } from "react";
import { useAssessmentStore } from "@/store/assessmentStore";
import {
  SurveyResponse,
  GroupId,
  BaseWeights,
  defaultBaseWeights,
  normalizeBaseWeights,
} from "@/lib/materiality/surveyWeighting";

/**
 * 설문 가중치 UI 컴포넌트
 * - 세그먼트(내부/외부) 비중 조절
 * - 내부 세부 그룹(임원/중간관리자/실무리더/주니어) 상대 비중 조절
 *   (normalizeBaseWeights로 세그먼트 합과 내부 합 자동 정규화)
 */
const SurveyWeightControls: React.FC<{
  baseWeights: BaseWeights;
  onChange: (next: BaseWeights) => void;
  onResetAll?: () => void;
}> = ({ baseWeights, onChange, onResetAll }) => {
  const [local, setLocal] = useState<BaseWeights>(baseWeights);

  useEffect(() => setLocal(baseWeights), [baseWeights]);

  const setSeg = (seg: "내부" | "외부", v: number) => {
    const next = {
      ...local,
      segmentTotals: { ...local.segmentTotals, [seg]: Math.max(0, Math.min(1, v)) },
    };
    const normalized = normalizeBaseWeights(next);
    setLocal(normalized);
    onChange(normalized);
  };

  const setInternal = (
    g: "임원" | "중간관리자" | "실무리더" | "주니어",
    v: number
  ) => {
    const next = { ...local, base: { ...local.base, [g]: Math.max(0, v) } };
    const normalized = normalizeBaseWeights(next);
    setLocal(normalized);
    onChange(normalized);
  };

  const reset = () => {
    const next = normalizeBaseWeights(defaultBaseWeights);
    setLocal(next);
    onChange(next);
  };

  const internalKeys = ["임원", "중간관리자", "실무리더", "주니어"] as const;
  const internalSum = internalKeys.reduce((s, g) => s + (local.base[g] ?? 0), 0);

  return (
    <div className="bg-amber-50 rounded-lg p-4 mb-6 border border-amber-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-amber-900">🧩 설문 가중치 설정</h3>
        <button
          onClick={onResetAll || reset}
          className="text-sm px-3 py-1 rounded bg-white border hover:bg-amber-100"
        >
          기본값으로
        </button>
      </div>

      {/* 세그먼트 비중 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            세그먼트 비중 – 내부: {local.segmentTotals.내부.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={local.segmentTotals.내부}
            onChange={(e) => setSeg("내부", parseFloat(e.target.value))}
            className="w-full mb-2"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={local.segmentTotals.내부}
            onChange={(e) => setSeg("내부", parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-bold text-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            세그먼트 비중 – 외부: {local.segmentTotals.외부.toFixed(2)}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={local.segmentTotals.외부}
            onChange={(e) => setSeg("외부", parseFloat(e.target.value))}
            className="w-full mb-2"
          />
          <input
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={local.segmentTotals.외부}
            onChange={(e) => setSeg("외부", parseFloat(e.target.value))}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-bold text-gray-900"
          />
        </div>
      </div>

      {/* 내부 세부 그룹 비중 */}
      <div className="bg-white rounded-lg p-4 border">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-gray-800">내부 세부 그룹 분배</h4>
          <span className="text-xs text-gray-500">
            현재 합계(표시용): {internalSum.toFixed(3)} (정규화 처리됨)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {internalKeys.map((g) => (
            <div key={g}>
              <label className="block text-sm text-gray-700 mb-1">
                {g}: {local.base[g].toFixed(3)}
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={local.base[g]}
                onChange={(e) => setInternal(g, parseFloat(e.target.value))}
                className="w-full mb-2"
              />
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={local.base[g]}
                onChange={(e) => setInternal(g, parseFloat(e.target.value))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded font-bold text-gray-900"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          ※ 슬라이더 값의 “상대 분포”만 사용되고, 내부 세그먼트 총합(위에서 설정한 비중)에 맞게
          자동 정규화됩니다.
        </p>
      </div>
    </div>
  );
};

const FinalIssuepool: React.FC = () => {
  const {
    setMediaRanked,
    setSurveyResponses,
    setParams,
    computeAll,
    finalTop,
    groupWeights,
    surveyScores,
    mediaNorm,
    finalScores,
    alphaOutsideIn,
    /* gammaMedia,  ← UI에서 제거(0.4로 고정) */
    topN,
    baseWeights,
  } = useAssessmentStore();

  const [isLoading, setIsLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [isDataHidden, setIsDataHidden] = useState(true);

  // γ(미디어 가중) 0.4로 고정, α(Outside-in 비중) 0.5로 고정
  useEffect(() => {
    setParams({ gammaMedia: 0.4, alphaOutsideIn: 0.5 });
  }, [setParams]);

  // 컴포넌트 마운트 시 사용자 활동 여부 확인
  useEffect(() => {
    const hasUserActivity = localStorage.getItem("hasUserActivity");
    if (hasUserActivity === "true") {
      setIsDataHidden(false);
    } else {
      setIsDataHidden(true);
    }
  }, []);



  // Load media data from localStorage (사용자 활동이 있는 경우에만)
  useEffect(() => {
    const loadMediaData = () => {
      const hasUserActivity = localStorage.getItem("hasUserActivity");
      if (!hasUserActivity) {
        console.log("🆕 처음 접속: 미디어 데이터를 자동으로 불러오지 않습니다.");
        return;
      }

      try {
        const savedData = localStorage.getItem("materialityAssessmentResult");
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          const categories = parsedData.assessment_result?.matched_categories || [];

          if (categories.length > 0) {
            const mediaRanked = categories.map((cat: any) => ({
              category: cat.category,
              final_score: cat.final_score || 0,
            }));
            setMediaRanked(mediaRanked);
          }
        }
      } catch (error) {
        console.error("Error loading media data:", error);
      }
    };

    loadMediaData();
  }, [setMediaRanked]);

  // Load survey responses from localStorage (사용자 활동이 있는 경우에만)
  useEffect(() => {
    const loadSurveyData = () => {
      const hasUserActivity = localStorage.getItem("hasUserActivity");
      if (!hasUserActivity) {
        console.log("🆕 처음 접속: 설문 데이터를 자동으로 불러오지 않습니다.");
        return;
      }

      try {
        // 여러 소스에서 설문 데이터 확인
        let responses = null;
        
        // 1. surveyResult prop에서 확인
        const surveyResult = localStorage.getItem('surveyResult');
        if (surveyResult) {
          const parsed = JSON.parse(surveyResult);
          if (parsed.responses && Array.isArray(parsed.responses)) {
            responses = parsed.responses;
            console.log('📊 surveyResult에서 설문 데이터 로드:', responses.length, '개');
          }
        }
        
        // 2. surveyResponses 키에서 확인 (fallback)
        if (!responses) {
          const savedResponses = localStorage.getItem("surveyResponses");
          if (savedResponses) {
            responses = JSON.parse(savedResponses);
            console.log('📊 surveyResponses에서 설문 데이터 로드:', responses.length, '개');
          }
        }

        if (responses && responses.length > 0) {
          // Transform to SurveyResponse format
          const surveyResponses: SurveyResponse[] = responses.map((response: any) => ({
            respondentId:
              response.participant?.email || response.participant_id || `respondent_${Date.now()}_${Math.random()}`,
            group: mapPositionToGroup(response),
            understanding: 3, // Default understanding level
            answers: (response.responses || []).reduce((acc: any, resp: any) => {
              acc[resp.category] = {
                outsideIn: resp.outsideScore ?? 3,
                insideOut: resp.insideScore ?? 3,
              };
              return acc;
            }, {}),
          }));

          console.log('📊 변환된 설문 응답:', surveyResponses);
          setSurveyResponses(surveyResponses);
        } else {
          console.log('⚠️ 설문 응답 데이터를 찾을 수 없습니다.');
        }
      } catch (error) {
        console.error("Error loading survey data:", error);
      }
    };

    loadSurveyData();
  }, [setSurveyResponses]);

  // survey_result.tsx에서 로드한 설문 데이터를 실시간으로 동기화
  useEffect(() => {
    const syncSurveyData = () => {
      try {
        // survey_result.tsx에서 로드한 백엔드 응답 데이터 확인
        const backendResponses = localStorage.getItem('backendSurveyResponses');
        if (backendResponses) {
          const responses = JSON.parse(backendResponses);
          console.log('🔄 survey_result.tsx에서 로드한 설문 데이터 동기화:', responses.length, '개');
          
          if (responses && responses.length > 0) {
            // Transform to SurveyResponse format
            const surveyResponses: SurveyResponse[] = responses.map((response: any) => ({
              respondentId:
                response.participant?.email || response.participant_id || `respondent_${Date.now()}_${Math.random()}`,
              group: mapPositionToGroup(response),
              understanding: 3, // Default understanding level
              answers: (response.responses || []).reduce((acc: any, resp: any) => {
                acc[resp.category] = {
                  outsideIn: resp.outsideScore ?? 3,
                  insideOut: resp.insideScore ?? 3,
                };
                return acc;
              }, {}),
            }));

            console.log('🔄 동기화된 설문 응답:', surveyResponses);
            setSurveyResponses(surveyResponses);
          }
        }
      } catch (error) {
        console.error("Error syncing survey data:", error);
      }
    };

    // storage 이벤트 리스너로 survey_result.tsx에서 데이터 로드 시 동기화
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'backendSurveyResponses') {
        console.log('🔄 survey_result.tsx에서 설문 데이터 로드 감지, 동기화 시작');
        syncSurveyData();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // 초기 동기화
    syncSurveyData();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [setSurveyResponses]);

  // 주기적으로 설문 데이터 확인 (5초마다) - 실시간 db연결 해제
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     const hasUserActivity = localStorage.getItem("hasUserActivity");
  //     if (hasUserActivity === "true") {
  //       // 설문 데이터가 있는지 확인
  //       const surveyResult = localStorage.getItem('surveyResult');
  //       if (surveyResult) {
  //         const parsed = JSON.parse(surveyResult);
  //         if (parsed.responses && Array.isArray(parsed.responses) && parsed.responses.length > 0) {
  //           // 설문 데이터가 있으면 다시 로드
  //           const responses = parsed.responses;
  //           const surveyResponses: SurveyResponse[] = responses.map((response: any) => ({
  //             respondentId:
  //               response.participant?.email || response.participant_id || `respondent_${Date.now()}_${Math.random()}`,
  //             group: mapPositionToGroup(response.participant?.position || "기타"),
  //             understanding: 3,
  //             answers: (response.responses || []).reduce((acc: any, resp: any) => {
  //               acc[resp.category] = {
  //                 outsideIn: resp.outsideScore ?? 3,
  //                 insideOut: resp.insideScore ?? 3,
  //               };
  //               return acc;
  //             }, {}),
  //           }));
  //           setSurveyResponses(surveyResponses);
  //         }
  //       }
  //     }
  //   }, 5000);

  //   return () => clearInterval(intervalId);
  // }, [setSurveyResponses]);

  // Map position to group (새로운 분류 시스템 사용)
  const mapPositionToGroup = (response: any): GroupId => {
    // 새로운 분류 시스템이 있는 경우 우선 사용
    if (response.participant?.is_internal !== undefined) {
      if (response.participant.is_internal) {
        // 내부 관계자 (임직원)
        const internalPosition = response.participant.internal_position || response.participant.position;
        if (internalPosition === '임원') return "임원";
        if (internalPosition === '중간관리자') return "중간관리자";
        if (internalPosition === '실무리더') return "실무리더";
        if (internalPosition === '주니어') return "주니어";
        return "기타";
      } else {
        // 외부 관계자
        const externalType = response.participant.position || response.participant.respondent_type;
        if (externalType === '고객') return "고객";
        if (externalType === '정부/자자체/유관기관') return "정부/자자체/유관기관";
        if (externalType === '지역사회') return "지역사회";
        if (externalType === '협력회사') return "협력회사";
        if (externalType === '전문가/전문기관(대학, 연구소)') return "전문가/전문기관";
        if (externalType === '투자자/투자기관') return "투자자/투자기관";
        if (externalType === '주주') return "주주";
        if (externalType === '언론/미디어') return "언론/미디어";
        return "기타";
      }
    }
    
    // 기존 방식 (하위 호환)
    const position = response.participant?.position || "기타";
    const pos = position.toLowerCase();
    if (pos.includes("임원") || pos.includes("ceo") || pos.includes("대표")) return "임원";
    if (pos.includes("부장") || pos.includes("팀장") || pos.includes("과장")) return "중간관리자";
    if (pos.includes("대리") || pos.includes("주임") || pos.includes("리더")) return "실무리더";
    if (pos.includes("사원") || pos.includes("신입") || pos.includes("주니어")) return "주니어";
    if (pos.includes("고객") || pos.includes("customer")) return "고객";
    if (pos.includes("정부") || pos.includes("공공")) return "정부/자자체/유관기관";
    if (pos.includes("지역") || pos.includes("사회")) return "지역사회";
    if (pos.includes("협력") || pos.includes("파트너")) return "협력회사";
    if (pos.includes("전문가") || pos.includes("연구")) return "전문가/전문기관";
    if (pos.includes("투자") || pos.includes("펀드")) return "투자자/투자기관";
    if (pos.includes("주주") || pos.includes("shareholder")) return "주주";
    if (pos.includes("언론") || pos.includes("미디어") || pos.includes("기자")) return "언론/미디어";
    return "기타";
  };

  const handleCompute = async () => {
    setIsLoading(true);
    try {
      console.log('🎯 최종 이슈풀 계산 시작...');
      console.log('📊 현재 가중치 설정:', baseWeights);
      console.log('📊 현재 파라미터:', { alphaOutsideIn, topN });
      
      // 데이터 상태 확인
      const { mediaRanked, surveyResponses } = useAssessmentStore.getState();
      console.log('📊 미디어 데이터:', mediaRanked);
      console.log('📊 설문 응답 데이터:', surveyResponses);
      
      // localStorage에서도 설문 데이터 확인
      const backendResponses = localStorage.getItem('backendSurveyResponses');
      if (backendResponses) {
        const responses = JSON.parse(backendResponses);
        console.log('📊 localStorage 설문 데이터:', responses.length, '개');
        console.log('📊 localStorage 설문 데이터 상세:', responses);
      }
      
      if (!mediaRanked || mediaRanked.length === 0) {
        console.warn('⚠️ 미디어 데이터가 없습니다. 미디어 검색을 먼저 실행해주세요.');
        alert('미디어 데이터가 없습니다. 미디어 검색을 먼저 실행해주세요.');
        return;
      }
      
      if (!surveyResponses || surveyResponses.length === 0) {
        console.warn('⚠️ 설문 응답 데이터가 없습니다. 설문을 먼저 완료해주세요.');
        console.log('💡 "설문 결과 확인" 페이지에서 "응답 데이터 로드" 버튼을 먼저 눌러주세요.');
        alert('설문 응답 데이터가 없습니다.\n\n"설문 결과 확인" 페이지에서 "응답 데이터 로드" 버튼을 먼저 눌러주세요.');
        return;
      }
      
      // 설문 가중치 상세 정보 출력
      console.log('📊 설문 가중치 상세 분석:');
      console.log('  - 세그먼트 비중 (내부/외부):', baseWeights.segmentTotals);
      console.log('  - 내부 세부 그룹 분배:', baseWeights.base);
      console.log('  - 정규화된 가중치:', normalizeBaseWeights(baseWeights));
      
      // 설문 응답 상세 정보 출력
      console.log('📊 설문 응답 상세 분석:');
      surveyResponses.forEach((response, index) => {
        console.log(`  - 응답자 ${index + 1}:`, {
          respondentId: response.respondentId,
          group: response.group,
          understanding: response.understanding,
          answersCount: Object.keys(response.answers).length,
          answers: response.answers
        });
      });
      
      // 계산 실행 및 결과 저장
      computeAll();
      
      // 계산 결과를 localStorage에도 저장
      const { finalTop, groupWeights, surveyScores, finalScores } = useAssessmentStore.getState();
      
      if (finalTop && finalTop.length > 0) {
        // materialityAssessmentResult 업데이트
        try {
          const savedResult = localStorage.getItem('materialityAssessmentResult');
          if (savedResult) {
            const parsedResult = JSON.parse(savedResult);
            
            // 기존 데이터 구조 유지하면서 final_score 업데이트
            const updatedCategories = parsedResult.assessment_result?.data?.matched_categories.map((cat: any) => {
              const finalItem = finalTop.find(item => item.category === cat.category);
              return {
                ...cat,
                final_score: finalItem ? finalItem.score : cat.final_score
              };
            }) || [];
            
            // 업데이트된 데이터 저장
            const updatedResult = {
              ...parsedResult,
              assessment_result: {
                ...parsedResult.assessment_result,
                data: {
                  ...parsedResult.assessment_result?.data,
                  matched_categories: updatedCategories
                }
              }
            };
            
            localStorage.setItem('materialityAssessmentResult', JSON.stringify(updatedResult));
            console.log('💾 최종 점수 저장 완료:', updatedResult);
          }
        } catch (error) {
          console.error('❌ 최종 점수 저장 실패:', error);
        }
        
        console.log('✅ 최종 이슈풀 계산 완료');
        console.log('📊 최종 결과:', finalTop);
        console.log('📊 그룹 가중치:', groupWeights);
        console.log('📊 설문 점수:', surveyScores);
        console.log('📊 최종 점수:', finalScores);
        console.log('🎉 최종 이슈풀 계산 성공!');
        console.log('📈 상위 3개 카테고리:', finalTop.slice(0, 3));
      } else {
        console.warn('⚠️ 최종 결과가 비어있습니다.');
      }
      
    } catch (error) {
      console.error("❌ 계산 중 오류 발생:", error);
      alert("계산 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleParamChange = (param: string, value: number) => {
    if (param === "topN") {
      const newTopN = Math.max(1, Math.min(50, value));
      console.log('🔄 topN 파라미터 변경됨:', newTopN);
      setParams({ topN: newTopN });
      
      // 자동 재계산 제거 - 사용자가 "최종 이슈풀 계산하기" 버튼을 눌렀을 때만 계산
      console.log('📝 topN 파라미터만 변경됨. "최종 이슈풀 계산하기" 버튼을 눌러서 결과를 확인하세요.');
    }
  };

  // 모든 파라미터를 기본값으로 리셋하는 함수
  const resetAllToDefaults = () => {
    console.log('🔄 모든 파라미터를 기본값으로 리셋');
    
    // 모든 파라미터를 한 번에 기본값으로 설정
    const defaultWeights = normalizeBaseWeights(defaultBaseWeights);
    setParams({ 
      topN: 10,                    // 상위 N개: 10
      baseWeights: defaultWeights, // 설문 가중치 기본값
      alphaOutsideIn: 0.5,         // α(Outside-in 비중): 0.5
      gammaMedia: 0.4              // γ(미디어 가중): 0.4
    });
    
    console.log('✅ 모든 파라미터 리셋 완료:', {
      topN: 10,
      baseWeights: defaultWeights,
      alphaOutsideIn: 0.5,
      gammaMedia: 0.4
    });
    
    // 자동 재계산 제거 - 사용자가 "최종 이슈풀 계산하기" 버튼을 눌렀을 때만 계산
    console.log('📝 파라미터만 리셋됨. "최종 이슈풀 계산하기" 버튼을 눌러서 결과를 확인하세요.');
  };

  // 데이터가 숨겨진 상태일 때 표시
  if (isDataHidden) {
    return (
      <div id="final-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">📋 최종 이슈풀 확인하기</h2>

        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">최종 이슈풀 계산</h3>
          <p className="text-gray-500 mb-6">
            미디어 검색과 설문 결과를 종합한 최종 이슈풀을 계산할 수 있습니다.
          </p>

          <button
            onClick={() => {
              localStorage.setItem("hasUserActivity", "true");
              setIsDataHidden(false);
            }}
            className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            최종 이슈풀 계산 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="final-issuepool" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">📋 최종 이슈풀 확인하기</h2>


      {/* Parameters Control */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-blue-800 mb-4">⚙️ 계산 파라미터</h3>
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상위 N개: {topN}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={topN}
              onChange={(e) => handleParamChange("topN", parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg font-bold text-gray-900"
            />
          </div>
        </div>

      </div>

      {/* 설문 가중치 컨트롤 */}
      <SurveyWeightControls
        baseWeights={baseWeights}
        onChange={(next) => {
          console.log('🔄 설문 가중치 변경됨:', next);
          setParams({ baseWeights: next });
          
          // 자동 재계산 제거 - 사용자가 "최종 이슈풀 계산하기" 버튼을 눌렀을 때만 계산
          console.log('📝 설문 가중치만 변경됨. "최종 이슈풀 계산하기" 버튼을 눌러서 결과를 확인하세요.');
        }}
        onResetAll={resetAllToDefaults}
      />

      {/* Compute Button */}
      <div className="text-center mb-6">
        <button
          onClick={handleCompute}
          disabled={isLoading}
          className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
            isLoading
              ? "bg-gray-400 text-gray-200 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl"
          }`}
        >
          {isLoading ? "계산 중..." : "🎯 최종 이슈풀 계산하기"}
        </button>
        
        {/* 파라미터 변경 안내 메시지 */}
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            💡 <strong>안내:</strong> 파라미터를 조정한 후에는 "최종 이슈풀 계산하기" 버튼을 눌러서 새로운 결과를 확인하세요.
          </p>
        </div>
      </div>

      {/* Results */}
      {finalTop && finalTop.length > 0 ? (
        <div className="space-y-6">
          {/* Final Rankings */}
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h3 className="text-lg font-semibold text-green-800 mb-4">🏆 최종 추천 카테고리</h3>
            <div className="space-y-3">
              {finalTop.map((item) => (
                <div
                  key={item.category}
                  className="flex items-center justify-between bg-white p-4 rounded-lg border border-green-200 shadow-sm"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-sm font-bold mr-4">
                      {item.rank}
                    </span>
                    <span className="font-medium text-gray-900">{item.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">{item.score.toFixed(3)}</div>
                    <div className="text-sm text-gray-500">종합 점수</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Debug Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="text-sm text-gray-600 hover:text-gray-800 mb-2"
            >
              {showDebug ? "🔽 디버그 정보 숨기기" : "🔼 디버그 정보 보기"}
            </button>

            {showDebug && (
              <div className="space-y-4">
                {groupWeights && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">그룹 가중치:</h4>
                    <pre className="bg-white p-3 rounded text-xs font-medium text-gray-800 overflow-auto">
                      {JSON.stringify(groupWeights, null, 2)}
                    </pre>
                  </div>
                )}

                {surveyScores && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">설문 점수 (정규화):</h4>
                    <pre className="bg-white p-3 rounded text-xs font-medium text-gray-800 overflow-auto">
                      {JSON.stringify(surveyScores, null, 2)}
                    </pre>
                  </div>
                )}

                {mediaNorm && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">미디어 점수 (정규화):</h4>
                    <pre className="bg-white p-3 rounded text-xs font-medium text-gray-800 overflow-auto">
                      {JSON.stringify(mediaNorm, null, 2)}
                    </pre>
                  </div>
                )}

                {finalScores && (
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-2">최종 점수:</h4>
                    <pre className="bg-white p-3 rounded text-xs font-medium text-gray-800 overflow-auto">
                      {JSON.stringify(finalScores, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="text-4xl text-gray-300 mb-4">🎯</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">최종 이슈풀 계산</h3>
          <p className="text-gray-500 mb-4">
            미디어 검색과 설문 결과를 종합한 최종 이슈풀을 계산할 수 있습니다.
          </p>
          <p className="text-sm text-gray-400">
            위의 "최종 이슈풀 계산하기" 버튼을 클릭하여 결과를 확인하세요.
          </p>
        </div>
      )}
    </div>
  );
};

export default FinalIssuepool;
