// src/lib/materiality/surveyWeighting.ts
export type Segment = "내부" | "외부";
export type GroupId =
  | "임원" | "중간관리자" | "실무리더" | "주니어"
  | "고객" | "정부/자자체/유관기관" | "지역사회" | "협력회사"
  | "전문가/전문기관" | "투자자/투자기관" | "주주" | "언론/미디어" | "기타";

export interface RankedCategory {
  category: string;
  final_score: number;
}

export interface SurveyResponse {
  respondentId: string;
  group: GroupId;
  understanding?: number; // 1..5
  answers: Record<string, { outsideIn: number; insideOut: number }>;
}

export interface BaseWeights {
  /**
   * 세그먼트(내부/외부) 총 비중. 합 1.0 권장.
   * 예) { 내부: 0.5, 외부: 0.5 }
   */
  segmentTotals: { 내부: number; 외부: number };
  /**
   * 그룹별 기본 비중(상대값). 세그먼트별 합이 segmentTotals의 해당 값이 되도록
   * normalizeBaseWeights에서 정규화해 사용.
   */
  base: Record<GroupId, number>;
  /**
   * 각 그룹이 내부/외부 어느 세그먼트인지 매핑
   */
  segmentOf: Record<GroupId, Segment>;
}

export const defaultBaseWeights: BaseWeights = {
  segmentTotals: { 내부: 0.5, 외부: 0.5 },
  base: {
    // 내부 (합 0.5로 정규화 예정)
    "임원": 0.15, "중간관리자": 0.125, "실무리더": 0.10, "주니어": 0.075,
    // 외부 (합 0.5로 정규화 예정)
    "고객": 0.10, "정부/자자체/유관기관": 0.08, "지역사회": 0.06, "협력회사": 0.08,
    "전문가/전문기관": 0.05, "투자자/투자기관": 0.06, "주주": 0.03, "언론/미디어": 0.03, "기타": 0.01,
  },
  segmentOf: {
    "임원":"내부","중간관리자":"내부","실무리더":"내부","주니어":"내부",
    "고객":"외부","정부/자자체/유관기관":"외부","지역사회":"외부","협력회사":"외부",
    "전문가/전문기관":"외부","투자자/투자기관":"외부","주주":"외부","언론/미디어":"외부","기타":"외부",
  }
};

const EPS = 1e-9;

/**
 * 프론트에서 세그먼트/그룹 슬라이더를 임의로 바꿔도
 * - 내부+외부 합 = 1.0
 * - 각 세그먼트의 그룹 합 = 해당 세그먼트 비중
 * 을 항상 만족하도록 정규화.
 */
export function normalizeBaseWeights(base: BaseWeights): BaseWeights {
  // 1) 세그먼트 합을 1.0으로
  const segSum = Math.max(EPS, base.segmentTotals.내부 + base.segmentTotals.외부);
  const segTotals = {
    내부: base.segmentTotals.내부 / segSum,
    외부: base.segmentTotals.외부 / segSum,
  };

  // 2) 세그먼트별 그룹합 계산
  const groupSumBySeg: Record<Segment, number> = { 내부: 0, 외부: 0 };
  (Object.keys(base.base) as GroupId[]).forEach((g) => {
    groupSumBySeg[base.segmentOf[g]] += base.base[g] ?? 0;
  });

  // 3) 각 세그먼트 내 상대 분포 유지 + 합은 세그먼트 비중이 되도록 스케일
  const scaledBase: Record<GroupId, number> = {} as any;
  (Object.keys(base.base) as GroupId[]).forEach((g) => {
    const seg = base.segmentOf[g];
    const segBaseSum = Math.max(EPS, groupSumBySeg[seg]);
    scaledBase[g] = (base.base[g] / segBaseSum) * segTotals[seg];
  });

  return {
    segmentTotals: segTotals,
    base: scaledBase,
    segmentOf: base.segmentOf,
  };
}

export function computeGroupWeights(
  responses: SurveyResponse[],
  base: BaseWeights = defaultBaseWeights,
  defaultUnderstanding = 3 // 1..5
): Record<GroupId, number> {
  // 1) 그룹별 응답수/이해도 평균
  const byGroup = new Map<GroupId, { n: number; sumUnderstanding: number }>();
  for (const r of responses) {
    const g = r.group;
    const u = Number.isFinite(r.understanding) ? (r.understanding as number) : defaultUnderstanding;
    const rec = byGroup.get(g) ?? { n: 0, sumUnderstanding: 0 };
    rec.n += 1;
    rec.sumUnderstanding += u;
    byGroup.set(g, rec);
  }

  // 2) 세그먼트별 보정치 합 산출
  const adj: Record<GroupId, number> = {} as any;
  const segAdjSum: Record<Segment, number> = { "내부": 0, "외부": 0 };

  (Object.keys(base.base) as GroupId[]).forEach((g) => {
    const seg = base.segmentOf[g];
    const rec = byGroup.get(g);
    if (!rec) {
      // 응답이 없으면 해당 그룹은 0
      adj[g] = 0;
      return;
    }
    const n = Math.max(1, rec.n);
    const meanU = rec.sumUnderstanding / n;            // 1..5
    const normU = Math.max(0, Math.min(meanU / 5, 1)); // 0..1
    // 보정치 = 기본가중치 × (이해도/5) × (1/√n)
    const a = (base.base[g] ?? 0) * normU * (1 / Math.sqrt(n));
    adj[g] = a;
    segAdjSum[seg] += a;
  });

  // 3) 세그먼트별 정규화하여 최종 그룹가중치
  const out: Record<GroupId, number> = {} as any;
  (Object.keys(base.base) as GroupId[]).forEach((g) => {
    const seg = base.segmentOf[g];
    const segTotal = base.segmentTotals[seg] ?? 0;
    const denom = Math.max(EPS, segAdjSum[seg]);
    out[g] = adj[g] > 0 ? (adj[g] / denom) * segTotal : 0;
  });
  return out;
}

export function computeSurveyCategoryScores(
  responses: SurveyResponse[],
  groupWeights: Record<GroupId, number>,
  alpha = 0.5 // outside-in 비중
): Record<string, number> {
  // 카테고리별 가중합 / 가중합 분모
  const num: Record<string, number> = {};
  const den: Record<string, number> = {};

  for (const r of responses) {
    const gw = groupWeights[r.group] ?? 0;
    if (gw <= 0) continue;
    for (const [cat, v] of Object.entries(r.answers ?? {})) {
      const oi = Math.max(1, Math.min(5, v.outsideIn));
      const io = Math.max(1, Math.min(5, v.insideOut));
      const s = alpha * (oi / 5) + (1 - alpha) * (io / 5); // 0..1
      num[cat] = (num[cat] ?? 0) + gw * s;
      // 설문에 답한 그룹들의 가중치 합으로 나눔 (카테고리별 가용 표본 보정)
      den[cat] = (den[cat] ?? 0) + gw;
    }
  }

  // 가중평균 + min-max 정규화
  const raw: Record<string, number> = {};
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  for (const cat of Object.keys(num)) {
    const v = den[cat] ? num[cat] / den[cat] : 0; // 0..1
    raw[cat] = v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const range = Math.max(EPS, maxV - minV);
  const norm: Record<string, number> = {};
  for (const [cat, v] of Object.entries(raw)) {
    norm[cat] = (v - minV) / range; // 0..1
  }
  return norm;
}

export function minMaxNormalize(
  arr: { key: string; value: number }[]
): Record<string, number> {
  if (arr.length === 0) return {};
  let minV = Infinity, maxV = -Infinity;
  for (const { value } of arr) {
    if (value < minV) minV = value;
    if (value > maxV) maxV = value;
  }
  const range = Math.max(EPS, maxV - minV);
  const out: Record<string, number> = {};
  for (const { key, value } of arr) {
    out[key] = (value - minV) / range;
  }
  return out;
}

/**
 * mediaNorm/surveyNorm는 각각 0..1 범위의 정규화 값
 * gammaMedia = 0.4(고정): 미디어 40%, 설문 60% 반영
 */
export function blendMediaAndSurvey(
  mediaNorm: Record<string, number>,
  surveyNorm: Record<string, number>,
  gammaMedia = 0.4 // ← 기본값을 0.4로 고정
): Record<string, number> {
  const cats = new Set([...Object.keys(mediaNorm), ...Object.keys(surveyNorm)]);
  const res: Record<string, number> = {};
  for (const c of cats) {
    const m = mediaNorm[c] ?? 0;
    const s = surveyNorm[c] ?? 0;
    res[c] = gammaMedia * m + (1 - gammaMedia) * s;
  }
  return res;
}

export function rankTopN(
  finalScores: Record<string, number>,
  N = 10
): { category: string; score: number; rank: number }[] {
  const sorted = Object.entries(finalScores)
    .sort((a, b) => b[1] - a[1])
    .map(([category, score], i) => ({ category, score, rank: i + 1 }));
  return sorted.slice(0, Math.max(0, N));
}
