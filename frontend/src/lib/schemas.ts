import { z } from 'zod';

// GRI 카테고리 스키마
export const GRICategorySchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  display_order: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
});

// GRI 질문 스키마
export const GRIQuestionSchema = z.object({
  id: z.number(),
  key_alpha: z.string(),
  question_text: z.string(),
  reference_text: z.union([z.string(), z.null(), z.undefined()]).transform((val) => {
    return val === null || val === undefined ? '' : String(val);
  }),
  question_type: z.string(),
  display_order: z.union([z.number(), z.string()]).transform((val) => {
    if (typeof val === 'string') {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return val;
  }),
  required: z.boolean(),
});

// GRI 아이템 스키마
export const GRIItemSchema = z.object({
  id: z.number(),
  index_no: z.string(),
  title: z.string(),
  questions: z.array(GRIQuestionSchema),
});

// GRI 완전 데이터 스키마
export const GRICompleteDataSchema = z.object({
  category: GRICategorySchema,
  items: z.array(GRIItemSchema),
  item_count: z.number(),
});

// 카테고리 목록 응답 스키마
export const CategoriesResponseSchema = z.object({
  categories: z.array(GRICategorySchema),
  count: z.number(),
});

// Materiality 랜덤 질문 스키마
export const MaterialityRandomSchema = z.object({
  id: z.number(),
  question: z.string().catch(''),
  category: z.string().catch(''),
  weight: z.number().catch(0),
});

// Materiality 랜덤 질문 목록 응답 스키마
export const MaterialityRandomResponseSchema = z.array(MaterialityRandomSchema);

// 안전한 파싱 함수들
export function safeParseCategories(data: unknown) {
  try {
    return CategoriesResponseSchema.parse(data);
  } catch (error) {
    console.error('카테고리 데이터 파싱 실패:', error);
    return { categories: [], count: 0 };
  }
}

export function safeParseGRICompleteData(data: unknown) {
  try {
    return GRICompleteDataSchema.parse(data);
  } catch (error) {
    console.error('GRI 완전 데이터 파싱 실패:', error);
    
    // 파싱 실패 시 원본 데이터를 그대로 반환하되, 타입 변환만 적용
    if (data && typeof data === 'object') {
      const rawData = data as any;
      
      // 카테고리 데이터 변환
      const category = rawData.category ? {
        ...rawData.category,
        display_order: typeof rawData.category.display_order === 'string' 
          ? parseInt(rawData.category.display_order, 10) || 0 
          : rawData.category.display_order || 0
      } : null;
      
      // 아이템 데이터 변환
      const items = Array.isArray(rawData.items) ? rawData.items.map((item: any) => ({
        ...item,
        questions: Array.isArray(item.questions) ? item.questions.map((question: any) => ({
          ...question,
          display_order: typeof question.display_order === 'string' 
            ? parseInt(question.display_order, 10) || 0 
            : question.display_order || 0,
          reference_text: question.reference_text === null || question.reference_text === undefined 
            ? '' 
            : String(question.reference_text || '')
        })) : []
      })) : [];
      
      return {
        category,
        items,
        item_count: rawData.item_count || items.length
      };
    }
    
    return null;
  }
}

export function safeParseMaterialityRandom(data: unknown) {
  try {
    return MaterialityRandomResponseSchema.parse(data);
  } catch (error) {
    console.error('Materiality 랜덤 데이터 파싱 실패:', error);
    return [];
  }
}
