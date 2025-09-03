import { z } from 'zod';

// GRI 카테고리 스키마
export const GRICategorySchema = z.object({
  id: z.number(),
  code: z.string(),
  title: z.string(),
  display_order: z.number(),
});

// GRI 질문 스키마
export const GRIQuestionSchema = z.object({
  id: z.number(),
  key_alpha: z.string(),
  question_text: z.string(),
  reference_text: z.string(),
  question_type: z.string(),
  display_order: z.number(),
  required: z.boolean(),
});

// GRI 아이템 스키마
export const GRIItemSchema = z.object({
  id: z.number(),
  index_no: z.string(),
  title: z.string(),
  questions: z.array(GRIQuestionSchema).catch([]),
});

// GRI 완전 데이터 스키마
export const GRICompleteDataSchema = z.object({
  category: GRICategorySchema,
  items: z.array(GRIItemSchema),
  item_count: z.number().catch(0),
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
