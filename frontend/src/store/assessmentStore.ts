// src/store/assessmentStore.ts
import { create } from "zustand";
import {
  RankedCategory, SurveyResponse, BaseWeights, defaultBaseWeights,
  computeGroupWeights, computeSurveyCategoryScores, minMaxNormalize,
  blendMediaAndSurvey, rankTopN
} from "@/lib/materiality/surveyWeighting";

interface AssessmentState {
  mediaRanked: RankedCategory[];                    // 기존 media 결과 (프론트에 이미 존재한다면 set 통해 주입)
  surveyResponses: SurveyResponse[];               // 설문 응답 원본
  baseWeights: BaseWeights;                        // 기본 가중치(세그먼트 비중 포함)
  alphaOutsideIn: number;                          // 0..1
  gammaMedia: number;                              // 0..1
  topN: number;

  // 산출물
  groupWeights?: Record<string, number>;
  surveyScores?: Record<string, number>;           // 정규화 후
  mediaNorm?: Record<string, number>;
  finalScores?: Record<string, number>;
  finalTop?: { category: string; score: number; rank: number }[];

  // actions
  setMediaRanked: (arr: RankedCategory[]) => void;
  setSurveyResponses: (arr: SurveyResponse[]) => void;
  setParams: (p: Partial<Pick<AssessmentState, "alphaOutsideIn"|"gammaMedia"|"topN"|"baseWeights">>) => void;
  computeAll: () => void;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  mediaRanked: [],
  surveyResponses: [],
  baseWeights: defaultBaseWeights,
  alphaOutsideIn: 0.5,
  gammaMedia: 0.5,
  topN: 10,

  setMediaRanked: (arr) => set({ mediaRanked: arr }),
  setSurveyResponses: (arr) => set({ surveyResponses: arr }),
  setParams: (p) => set(p),

  computeAll: () => {
    const { mediaRanked, surveyResponses, baseWeights, alphaOutsideIn, gammaMedia, topN } = get();

    // 1) 그룹 가중치
    const gw = computeGroupWeights(surveyResponses, baseWeights);

    // 2) 설문 카테고리 점수(정규화)
    const surveyNorm = computeSurveyCategoryScores(surveyResponses, gw, alphaOutsideIn);

    // 3) 미디어 점수 정규화
    const mediaNorm = minMaxNormalize(
      mediaRanked.map((m) => ({ key: m.category, value: m.final_score }))
    );

    // 4) 블렌딩
    const finalScores = blendMediaAndSurvey(mediaNorm, surveyNorm, gammaMedia);

    // 5) 상위 N
    const finalTop = rankTopN(finalScores, topN);

    set({ groupWeights: gw, surveyScores: surveyNorm, mediaNorm, finalScores, finalTop });
  },
}));
