export interface Article {
  title: string;
  description: string;  // 필수 필드로 추가
  originallink: string;
  pubDate: string;
  company: string;
  issue?: string;
  original_category?: string;
  query_kind?: string;  // 추가
  keyword?: string;     // 추가
}

export interface SearchPeriod {
  start_date: string;
  end_date: string;
}

export interface SearchResult {
  success: boolean;
  data: {
    company_id: string;
    search_period: SearchPeriod;
    articles: Article[];
    total_results: number;
    search_context?: any;
  };
  excel_filename?: string;
  excel_base64?: string;
}

export interface IssuepoolData {
  year_minus_2?: {
    year: number;
    issuepools: Array<{
      id: number;
      ranking: number;
      base_issue_pool: string;
      esg_classification_name?: string;
    }>;
    total_count: number;
    esg_distribution: Record<string, {
      count: number;
      percentage: number;
    }>;
  };
  year_minus_1?: {
    year: number;
    issuepools: Array<{
      id: number;
      ranking: number;
      base_issue_pool: string;
      esg_classification_name?: string;
    }>;
    total_count: number;
    esg_distribution: Record<string, {
      count: number;
      percentage: number;
    }>;
  };
}