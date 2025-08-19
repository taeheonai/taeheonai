#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GRI_categories_simple.json을 gri_category 테이블에 업로드하는 스크립트
"""

import json
import logging
from pathlib import Path
import sys
import os

# 현재 디렉토리를 Python 경로에 추가
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Railway PostgreSQL 연결 설정
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': '15963',
    'database': 'railway',
    'user': 'postgres',
    'password': 'ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx',
}

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class CategoryUploader:
    """카테고리 업로드 클래스"""
    
    def __init__(self, db_config):
        self.db_config = db_config
        self.connection = None
        self.cursor = None
        
    def connect(self):
        """데이터베이스 연결"""
        try:
            import psycopg2
            self.connection = psycopg2.connect(**self.db_config)
            self.cursor = self.connection.cursor()
            logger.info("✅ PostgreSQL 데이터베이스 연결 성공")
        except ImportError:
            logger.error("❌ psycopg2가 설치되지 않았습니다. 'pip install psycopg2-binary'를 실행하세요.")
            raise
        except Exception as e:
            logger.error(f"❌ 데이터베이스 연결 실패: {e}")
            raise
            
    def disconnect(self):
        """데이터베이스 연결 해제"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        logger.info("🔌 데이터베이스 연결 해제")
        
    def upload_categories(self, categories_file):
        """카테고리 데이터 업로드"""
        try:
            logger.info(f"📁 카테고리 파일 읽기: {categories_file}")
            
            with open(categories_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            categories = data.get('categories', [])
            logger.info(f"📊 {len(categories)}개 카테고리 발견")
            
            # 기존 데이터 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_category")
            existing_count = self.cursor.fetchone()[0]
            logger.info(f"📋 기존 gri_category 테이블 데이터: {existing_count}개")
            
            # 카테고리 삽입
            inserted_count = 0
            for i, category in enumerate(categories, 1):
                category_code = category['code']
                category_title = category['title']
                
                # 중복 확인
                self.cursor.execute("SELECT id FROM gri_category WHERE code = %s", (category_code,))
                existing = self.cursor.fetchone()
                
                if existing:
                    # 기존 데이터 업데이트
                    self.cursor.execute("""
                        UPDATE gri_category 
                        SET title = %s, display_order = %s
                        WHERE code = %s
                    """, (category_title, i, category_code))
                    logger.info(f"🔄 카테고리 업데이트: {category_code} - {category_title}")
                else:
                    # 새 데이터 삽입
                    self.cursor.execute("""
                        INSERT INTO gri_category (code, title, display_order)
                        VALUES (%s, %s, %s)
                    """, (category_code, category_title, i))
                    logger.info(f"✅ 카테고리 삽입: {category_code} - {category_title}")
                    inserted_count += 1
                
                # 진행상황 표시
                if i % 10 == 0:
                    logger.info(f"📝 진행률: {i}/{len(categories)} ({i/len(categories)*100:.1f}%)")
            
            self.connection.commit()
            logger.info(f"🎉 카테고리 업로드 완료!")
            logger.info(f"   새로 삽입: {inserted_count}개")
            logger.info(f"   업데이트: {len(categories) - inserted_count}개")
            
            # 최종 데이터 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_category")
            final_count = self.cursor.fetchone()[0]
            logger.info(f"📊 최종 gri_category 테이블 데이터: {final_count}개")
            
        except Exception as e:
            logger.error(f"❌ 카테고리 업로드 실패: {e}")
            self.connection.rollback()
            raise
            
    def verify_upload(self):
        """업로드 결과 검증"""
        try:
            logger.info("🔍 업로드 결과 검증 중...")
            
            # 카테고리 수 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_category")
            category_count = self.cursor.fetchone()[0]
            
            # 샘플 데이터 확인
            self.cursor.execute("""
                SELECT code, title, display_order 
                FROM gri_category 
                ORDER BY display_order 
                LIMIT 5
            """)
            
            samples = self.cursor.fetchall()
            
            logger.info("📊 검증 결과:")
            logger.info(f"   총 카테고리 수: {category_count}개")
            logger.info("   샘플 데이터:")
            for sample in samples:
                logger.info(f"     {sample[0]}: {sample[1]} (순서: {sample[2]})")
                
        except Exception as e:
            logger.error(f"❌ 검증 실패: {e}")
            raise

def main():
    """메인 함수"""
    try:
        logger.info("🚀 GRI 카테고리 업로드 시작")
        
        # 업로더 생성
        uploader = CategoryUploader(DB_CONFIG)
        
        # 데이터베이스 연결
        uploader.connect()
        
        # 테이블 존재 확인
        try:
            uploader.cursor.execute("SELECT 1 FROM gri_category LIMIT 1")
            logger.info("✅ gri_category 테이블이 존재합니다.")
        except:
            logger.error("❌ gri_category 테이블이 존재하지 않습니다.")
            logger.info("💡 먼저 테이블을 생성하세요.")
            return
        
        # 카테고리 파일 경로
        categories_file = "GRI_categories_simple.json"
        
        if not Path(categories_file).exists():
            logger.error(f"❌ 카테고리 파일을 찾을 수 없습니다: {categories_file}")
            return
        
        # 카테고리 업로드
        uploader.upload_categories(categories_file)
        
        # 결과 검증
        uploader.verify_upload()
        
        logger.info("🎉 모든 작업이 완료되었습니다!")
        
    except Exception as e:
        logger.error(f"❌ 업로드 실패: {e}")
        sys.exit(1)
    finally:
        if 'uploader' in locals():
            uploader.disconnect()

if __name__ == "__main__":
    main()
