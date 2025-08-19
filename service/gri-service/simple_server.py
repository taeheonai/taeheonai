#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
간단한 GRI API 테스트 서버
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import asyncio
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Simple GRI API", description="간단한 GRI API 테스트 서버")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 데이터베이스 연결 설정
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': 15963,
    'database': 'railway',
    'user': 'postgres',
    'password': 'ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx',
}

# 데이터베이스 연결 함수
async def get_db_connection():
    try:
        connection = await asyncpg.connect(**DB_CONFIG)
        return connection
    except Exception as e:
        logger.error(f"데이터베이스 연결 실패: {e}")
        raise HTTPException(status_code=500, detail=f"데이터베이스 연결 실패: {e}")

@app.get("/")
async def root():
    return {"message": "Simple GRI API Server", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "simple-gri-api"}

@app.get("/v1/gri/categories")
async def get_categories():
    """모든 GRI 카테고리 조회"""
    try:
        connection = await get_db_connection()
        
        try:
            result = await connection.fetch("""
                SELECT id, code, title, display_order
                FROM gri_category
                ORDER BY display_order, id
            """)
            
            categories = [dict(row) for row in result]
            logger.info(f"✅ 카테고리 조회 성공: {len(categories)}개")
            
            return {
                "categories": categories,
                "count": len(categories),
                "source": "simple-gri-api"
            }
            
        finally:
            await connection.close()
            
    except Exception as e:
        logger.error(f"❌ 카테고리 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"카테고리 조회 실패: {e}")

@app.get("/v1/gri/complete/{category_id}")
async def get_complete_gri_data(category_id: int):
    """카테고리별 완전한 GRI 데이터 조회"""
    try:
        connection = await get_db_connection()
        
        try:
            # 카테고리 정보 조회
            category_result = await connection.fetch("""
                SELECT id, code, title
                FROM gri_category
                WHERE id = $1
            """, category_id)
            
            if not category_result:
                raise HTTPException(status_code=404, detail="카테고리를 찾을 수 없습니다")
            
            category = dict(category_result[0])
            
            # 아이템 및 질문 정보 조회
            items_result = await connection.fetch("""
                SELECT 
                    i.id as item_id,
                    i.index_no,
                    i.title as item_title,
                    q.id as question_id,
                    q.key_alpha,
                    q.question_text,
                    q.reference_text,
                    q.question_type,
                    q.required
                FROM gri_item i
                LEFT JOIN gri_question q ON i.id = q.item_id
                WHERE i.category_id = $1
                ORDER BY i.display_order, i.index_no, q.display_order, q.key_alpha
            """, category_id)
            
            # 데이터 구조화
            items = []
            current_item = None
            
            for row in items_result:
                row_dict = dict(row)
                
                if current_item is None or current_item["id"] != row_dict["item_id"]:
                    # 새 아이템 시작
                    current_item = {
                        "id": row_dict["item_id"],
                        "index_no": row_dict["index_no"],
                        "title": row_dict["item_title"],
                        "questions": []
                    }
                    items.append(current_item)
                
                # 질문 추가
                if row_dict["question_id"]:
                    question = {
                        "id": row_dict["question_id"],
                        "key_alpha": row_dict["key_alpha"],
                        "question_text": row_dict["question_text"],
                        "reference_text": row_dict["reference_text"],
                        "question_type": row_dict["question_type"],
                        "required": row_dict["required"]
                    }
                    current_item["questions"].append(question)
            
            logger.info(f"✅ GRI 데이터 조회 성공: {len(items)}개 아이템")
            
            return {
                "category": category,
                "items": items,
                "item_count": len(items),
                "source": "simple-gri-api"
            }
            
        finally:
            await connection.close()
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ GRI 데이터 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=f"데이터 조회 실패: {e}")

if __name__ == "__main__":
    import uvicorn
    print("🚀 Simple GRI API 서버 시작 중...")
    print("📍 http://localhost:8003")
    print("🔗 API 엔드포인트:")
    print("   - GET /v1/gri/categories")
    print("   - GET /v1/gri/complete/{category_id}")
    uvicorn.run(app, host="0.0.0.0", port=8003)
