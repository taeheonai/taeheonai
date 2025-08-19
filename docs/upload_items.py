#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GRI Items 데이터를 Railway PostgreSQL의 gri_item 테이블에 업로드하는 스크립트
"""

import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Railway PostgreSQL 연결 설정
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': '15963',
    'database': 'railway',
    'user': 'postgres',
    'password': 'ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx',
}

class ItemUploader:
    def __init__(self, db_config):
        self.db_config = db_config
        self.connection = None
        self.cursor = None
    
    def connect(self):
        """데이터베이스에 연결"""
        try:
            self.connection = psycopg2.connect(**self.db_config)
            self.cursor = self.connection.cursor()
            print("✅ Railway PostgreSQL 연결 성공!")
            return True
        except Exception as e:
            print(f"❌ 데이터베이스 연결 실패: {e}")
            return False
    
    def disconnect(self):
        """데이터베이스 연결 해제"""
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        print("🔌 데이터베이스 연결 해제됨")
    
    def check_table_exists(self):
        """gri_item 테이블이 존재하는지 확인"""
        try:
            self.cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'gri_item'
                );
            """)
            exists = self.cursor.fetchone()[0]
            if exists:
                print("✅ gri_item 테이블이 존재합니다.")
                return True
            else:
                print("❌ gri_item 테이블이 존재하지 않습니다.")
                return False
        except Exception as e:
            print(f"❌ 테이블 확인 실패: {e}")
            return False
    
    def get_category_mapping(self):
        """카테고리 코드와 ID 매핑 정보 가져오기"""
        try:
            self.cursor.execute("""
                SELECT id, code, title 
                FROM gri_category 
                ORDER BY id
            """)
            categories = self.cursor.fetchall()
            
            print("\n📋 카테고리 매핑 정보:")
            for cat_id, code, title in categories:
                print(f"   ID {cat_id}: {code} - {title}")
            
            return {cat_id: (code, title) for cat_id, code, title in categories}
        except Exception as e:
            print(f"❌ 카테고리 정보 조회 실패: {e}")
            return {}
    
    def upload_items(self, items_file):
        """아이템 데이터를 gri_item 테이블에 업로드"""
        try:
            # JSON 파일 읽기
            with open(items_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            items = data.get('items', [])
            print(f"\n📊 총 {len(items)}개 아이템을 업로드합니다...")
            
            # 기존 데이터 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_item")
            existing_count = self.cursor.fetchone()[0]
            print(f"   기존 아이템 수: {existing_count}")
            
            # 아이템 데이터 삽입
            inserted_count = 0
            updated_count = 0
            
            for i, item in enumerate(items, 1):
                index_no = item['index_no']
                title = item['title']
                category_id = item['category_id']
                
                # 기존 아이템 확인 (index_no로)
                self.cursor.execute("""
                    SELECT id FROM gri_item WHERE index_no = %s
                """, (index_no,))
                existing = self.cursor.fetchone()
                
                if existing:
                    # 기존 데이터 업데이트
                    self.cursor.execute("""
                        UPDATE gri_item 
                        SET title = %s, category_id = %s, updated_at = NOW()
                        WHERE index_no = %s
                    """, (title, category_id, index_no))
                    updated_count += 1
                else:
                    # 새 데이터 삽입
                    self.cursor.execute("""
                        INSERT INTO gri_item (category_id, index_no, title, display_order, created_at)
                        VALUES (%s, %s, %s, %s, NOW())
                    """, (category_id, index_no, title, i))
                    inserted_count += 1
                
                # 진행률 표시
                if i % 20 == 0 or i == len(items):
                    print(f"   진행률: {i}/{len(items)} ({i/len(items)*100:.1f}%)")
            
            # 변경사항 커밋
            self.connection.commit()
            
            print(f"\n✅ 업로드 완료!")
            print(f"   새로 삽입: {inserted_count}개")
            print(f"   업데이트: {updated_count}개")
            print(f"   총 처리: {inserted_count + updated_count}개")
            
            return True
            
        except Exception as e:
            print(f"❌ 아이템 업로드 실패: {e}")
            if self.connection:
                self.connection.rollback()
            return False
    
    def verify_upload(self):
        """업로드 결과 검증"""
        try:
            # 전체 아이템 수 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_item")
            total_count = self.cursor.fetchone()[0]
            
            # 카테고리별 아이템 수 확인
            self.cursor.execute("""
                SELECT c.code, c.title, COUNT(i.id) as item_count
                FROM gri_category c
                LEFT JOIN gri_item i ON c.id = i.category_id
                GROUP BY c.id, c.code, c.title
                ORDER BY c.id
            """)
            category_stats = self.cursor.fetchall()
            
            print(f"\n📊 업로드 검증 결과:")
            print(f"   전체 아이템 수: {total_count}개")
            print(f"\n   카테고리별 아이템 수:")
            
            for code, title, item_count in category_stats:
                print(f"   {code}: {item_count}개 - {title}")
            
            return True
            
        except Exception as e:
            print(f"❌ 검증 실패: {e}")
            return False

def main():
    """메인 실행 함수"""
    print("🚀 GRI Items 업로드 시작!")
    print("=" * 50)
    
    # 업로더 생성 및 연결
    uploader = ItemUploader(DB_CONFIG)
    
    if not uploader.connect():
        print("❌ 데이터베이스 연결 실패로 종료합니다.")
        return
    
    try:
        # 테이블 존재 확인
        if not uploader.check_table_exists():
            print("❌ gri_item 테이블이 존재하지 않습니다.")
            print("💡 먼저 gri_input_fixed.sql을 실행하여 테이블을 생성하세요.")
            return
        
        # 카테고리 매핑 정보 표시
        category_mapping = uploader.get_category_mapping()
        if not category_mapping:
            print("❌ 카테고리 정보를 가져올 수 없습니다.")
            return
        
        # 아이템 데이터 업로드
        items_file = "GRI_items_extracted_fixed.json"
        if uploader.upload_items(items_file):
            # 업로드 결과 검증
            uploader.verify_upload()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    
    finally:
        # 연결 해제
        uploader.disconnect()
        print("\n🎉 GRI Items 업로드 완료!")

if __name__ == "__main__":
    main()
