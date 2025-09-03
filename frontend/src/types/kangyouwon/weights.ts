export interface WeightConfig {
  frequency: {
    value: number;
    description: string;
  };
  relevance: {
    value: number;
    description: string;
  };
  recent: {
    value: number;
    description: string;
  };
  rank: {
    value: number;
    description: string;
  };
  negative: {
    value: number;
    description: string;
    boost: {
      frequency: number;
      relevance: number;
    };
  };
}

export const DEFAULT_WEIGHTS: WeightConfig = {
  frequency: {
    value: 0.4,
    description: "해당 카테고리의 기사가 전체 기사 중 차지하는 비율"
  },
  relevance: {
    value: 0.6,
    description: "기사 제목에 기업명이 포함된 정도"
  },
  recent: {
    value: 0.2,
    description: "최근 3개월 이내(1.0), 3~6개월(0.5), 6개월 이상(0.0)"
  },
  rank: {
    value: 0.4,
    description: "이전 연도 중대성 평가에서의 순위 반영"
  },
  negative: {
    value: 0.8,
    description: "부정적 이슈의 영향도",
    boost: {
      frequency: 0.5,
      relevance: 0.5
    }
  }
};