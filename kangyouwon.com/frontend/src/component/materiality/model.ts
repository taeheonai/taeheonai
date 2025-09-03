interface ExcelCell {
    v?: string | number | boolean | Date;
    w?: string;
    t?: string;
  }
  
  interface ExcelWorksheet {
    [cell: string]: ExcelCell;
  }
  
  interface Article {
    title: string;
    originallink?: string;
    pubDate?: string;
    company?: string;
    issue?: string;
    original_category?: string;
  }
  
  interface SearchPeriod {
    start_date: string;
    end_date: string;
  }
  
  interface SearchData {
    company_id: string;
    search_period: SearchPeriod;
    articles?: Article[];
    total_results?: number;
    excel_filename?: string;
    excel_base64?: string;
    search_context?: Record<string, unknown>;
  }
  
  interface ExcelUploadResult {
    isValid: boolean;
    filename: string;
    base64Data?: string;
    error?: string;
  }