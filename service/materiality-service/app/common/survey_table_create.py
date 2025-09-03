#!/usr/bin/env python3
"""
설문 데이터베이스 테이블 생성 스크립트

사용법:
    python survey_table_create.py

로컬에서도 실행 가능하도록 직접 데이터베이스 연결 정보 포함
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# 프로젝트 루트 경로를 Python 경로에 추가
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SurveyTableManager:
    """설문 데이터베이스 테이블 관리 클래스"""
    
    def __init__(self):
        """초기화"""
        # Railway PostgreSQL 연결 정보 (1.py와 동일)
        self.database_url = "postgresql://postgres:ZzfwBnlMFrPIUpGsleepqCrOrEVJCbAK@trolley.proxy.rlwy.net:52468/railway"
        self.engine = None
        self.SessionLocal = None
        
        # 생성할 테이블 정보
        self.tables_to_create = [
            {
                "name": "surveys",
                "description": "설문 정보 테이블",
                "sql": """
                CREATE TABLE IF NOT EXISTS surveys (
                    survey_id VARCHAR(255) PRIMARY KEY,
                    corporation_id VARCHAR(255) NOT NULL,
                    content_hash VARCHAR(255),
                    timestamp TIMESTAMP NOT NULL,
                    total_categories INTEGER NOT NULL,
                    categories JSON NOT NULL,
                    excel_data JSON,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_surveys_corporation_id ON surveys(corporation_id);
                CREATE INDEX IF NOT EXISTS idx_surveys_survey_id ON surveys(survey_id);
                CREATE INDEX IF NOT EXISTS idx_surveys_content_hash ON surveys(content_hash);
                """
            },
            {
                "name": "survey_responses",
                "description": "설문 응답 테이블",
                "sql": """
                CREATE TABLE IF NOT EXISTS survey_responses (
                    id SERIAL PRIMARY KEY,
                    participant_id VARCHAR(255) NOT NULL,
                    survey_id VARCHAR(255) NOT NULL,
                    corporation_id VARCHAR(255) NOT NULL,
                    participant_name VARCHAR(255) NOT NULL,
                    participant_company VARCHAR(255) NOT NULL,
                    participant_position VARCHAR(255) NOT NULL,
                    participant_email VARCHAR(255) NOT NULL,
                    responses JSON NOT NULL,
                    timestamp TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (survey_id) REFERENCES surveys(survey_id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS idx_survey_responses_survey_id ON survey_responses(survey_id);
                CREATE INDEX IF NOT EXISTS idx_survey_responses_corporation_id ON survey_responses(corporation_id);
                CREATE INDEX IF NOT EXISTS idx_survey_responses_participant_email ON survey_responses(participant_email);
                CREATE UNIQUE INDEX IF NOT EXISTS uix_survey_response_email_per_survey ON survey_responses (survey_id, participant_email);
                """
            }
        ]
    
    def connect_database(self):
        """데이터베이스 연결"""
        try:
            self.engine = create_engine(self.database_url)
            # 연결 테스트
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            self.SessionLocal = sessionmaker(bind=self.engine)
            logger.info("✅ Railway PostgreSQL 연결 성공!")
            return True
        except Exception as e:
            logger.error(f"❌ 데이터베이스 연결 실패: {str(e)}")
            return False
    
    def check_corporation_table(self):
        """corporation 테이블 존재 여부 확인"""
        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM corporation"))
                count = result.fetchone()[0]
                logger.info(f"✅ corporation 테이블 확인: {count}개 기업 정보")
                return True
        except Exception as e:
            logger.error(f"❌ corporation 테이블이 존재하지 않습니다: {e}")
            logger.warning("⚠️ corporation 테이블을 먼저 생성해야 합니다.")
            return False
    
    def create_single_table(self, table_info):
        """단일 테이블 생성"""
        table_name = table_info["name"]
        description = table_info["description"]
        sql = table_info["sql"]
        
        logger.info(f"📁 테이블 생성 중: {table_name} ({description})")
        
        try:
            with self.engine.connect() as conn:
                # 테이블 생성
                conn.execute(text(sql))
                conn.commit()
                
                # 생성 확인
                result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.fetchone()[0]
                
                # 컬럼 정보 확인
                result = conn.execute(text(f"""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns
                    WHERE table_name = '{table_name}'
                    ORDER BY ordinal_position
                """))
                columns = result.fetchall()
                
                logger.info(f"   ✅ {table_name} 테이블 생성 완료!")
                logger.info(f"   📊 현재 데이터: {count}행")
                logger.info(f"   📋 컬럼 정보:")
                for col in columns:
                    nullable = "NULL" if col[2] == "YES" else "NOT NULL"
                    logger.info(f"      - {col[0]}: {col[1]} ({nullable})")
                
                return True
                
        except Exception as e:
            logger.error(f"   ❌ 테이블 생성 실패: {str(e)}")
            return False
    
    def create_all_tables(self):
        """모든 테이블 생성"""
        logger.info("🚀 설문 데이터베이스 테이블 생성을 시작합니다...")
        
        # corporation 테이블 확인
        if not self.check_corporation_table():
            logger.error("❌ corporation 테이블이 없어 설문 테이블을 생성할 수 없습니다.")
            logger.info("💡 먼저 1.py를 실행하여 corporation 테이블을 생성해주세요.")
            return False
        
        success_count = 0
        total_count = len(self.tables_to_create)
        
        for table_info in self.tables_to_create:
            if self.create_single_table(table_info):
                success_count += 1
            logger.info("")  # 빈 줄 추가
        
        # 최종 결과
        logger.info("📋 최종 테이블 생성 결과:")
        try:
            with self.engine.connect() as conn:
                for table_info in self.tables_to_create:
                    table_name = table_info["name"]
                    description = table_info["description"]
                    try:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                        count = result.fetchone()[0]
                        logger.info(f"   ✅ {table_name} ({description}): {count}행")
                    except:
                        logger.info(f"   ❌ {table_name} ({description}): 테이블 없음")
        except Exception as e:
            logger.error(f"   ⚠️ 결과 확인 중 오류: {e}")
        
        logger.info(f"\n🎯 테이블 생성 완료: {success_count}/{total_count} 테이블 성공")
        
        if success_count == total_count:
            logger.info("✨ 모든 설문 테이블이 성공적으로 생성되었습니다!")
            return True
        else:
            logger.error("💥 일부 테이블 생성에 실패했습니다.")
            return False
    
    def drop_all_tables(self):
        """모든 설문 테이블 삭제 (주의: 모든 데이터가 손실됩니다)"""
        logger.warning("⚠️ 설문 관련 테이블을 삭제합니다. 모든 데이터가 손실됩니다!")
        
        confirm = input("정말로 테이블을 삭제하시겠습니까? (yes/no): ")
        if confirm.lower() != 'yes':
            logger.info("테이블 삭제가 취소되었습니다.")
            return False
        
        try:
            with self.engine.connect() as conn:
                # 외래키 제약조건이 있으므로 순서 주의
                conn.execute(text("DROP TABLE IF EXISTS survey_responses CASCADE"))
                conn.execute(text("DROP TABLE IF EXISTS surveys CASCADE"))
                conn.commit()
                
                logger.info("✅ 설문 관련 테이블 삭제가 완료되었습니다!")
                return True
                
        except Exception as e:
            logger.error(f"❌ 테이블 삭제 중 오류가 발생했습니다: {e}")
            return False
    
    def recreate_tables_with_content_hash(self):
        """content_hash 컬럼이 포함된 테이블로 재생성"""
        logger.info("🔄 content_hash 컬럼이 포함된 테이블로 재생성합니다...")
        
        # 1. 기존 테이블 삭제
        logger.info("1️⃣ 기존 테이블 삭제 중...")
        if not self.drop_all_tables():
            logger.error("❌ 기존 테이블 삭제에 실패했습니다.")
            return False
        
        # 2. 새 테이블 생성
        logger.info("2️⃣ 새 테이블 생성 중...")
        if not self.create_all_tables():
            logger.error("❌ 새 테이블 생성에 실패했습니다.")
            return False
        
        logger.info("✅ content_hash 컬럼이 포함된 테이블 재생성이 완료되었습니다!")
        return True
    
    def show_table_info(self):
        """테이블 정보 표시"""
        logger.info("📋 설문 데이터베이스 테이블 정보:")
        
        # surveys 테이블 정보
        logger.info("""
        📊 surveys 테이블:
        - survey_id (VARCHAR(255), PK): 설문 고유 ID
        - corporation_id (VARCHAR(255), NOT NULL): 회사 ID (corporation.id 참조)
        - content_hash (VARCHAR(255)): 설문 내용 해시값 (동일 내용 판단용)
        - timestamp (TIMESTAMP, NOT NULL): 설문 생성 시간
        - total_categories (INTEGER, NOT NULL): 총 카테고리 수
        - categories (JSON, NOT NULL): 카테고리 데이터
        - excel_data (JSON): 엑셀 데이터
        - created_at (TIMESTAMP): 생성 시간
        - updated_at (TIMESTAMP): 수정 시간
        
        🔗 외래키 관계:
        - corporation_id → corporation.id (기업 정보 테이블)
        
        📋 인덱스:
        - idx_surveys_corporation_id: corporation_id 검색 최적화
        - idx_surveys_survey_id: survey_id 검색 최적화
        - idx_surveys_content_hash: content_hash 검색 최적화 (중복 설문 방지)
        """)
        
        # survey_responses 테이블 정보
        logger.info("""
        📝 survey_responses 테이블:
        - id (SERIAL, PK): 응답 고유 ID
        - participant_id (VARCHAR(255), NOT NULL): 참여자 ID
        - survey_id (VARCHAR(255), NOT NULL): 설문 ID (surveys.survey_id 참조)
        - corporation_id (VARCHAR(255), NOT NULL): 회사 ID (corporation.id 참조)
        - participant_name (VARCHAR(255), NOT NULL): 참여자 이름
        - participant_company (VARCHAR(255), NOT NULL): 참여자 회사
        - participant_position (VARCHAR(255), NOT NULL): 참여자 직책
        - participant_email (VARCHAR(255), NOT NULL): 참여자 이메일
        - responses (JSON, NOT NULL): 응답 데이터
        - timestamp (TIMESTAMP, NOT NULL): 응답 시간
        - created_at (TIMESTAMP): 생성 시간
        - updated_at (TIMESTAMP): 수정 시간
        
        🔗 외래키 관계:
        - survey_id → surveys.survey_id (설문 테이블)
        - corporation_id → corporation.id (기업 정보 테이블)
        """)
        
        # 데이터 무결성 정보
        logger.info("""
        🛡️ 데이터 무결성 보장:
        - 설문 생성 시 corporation_id가 corporation 테이블에 존재해야 함
        - 응답 제출 시 survey_id와 corporation_id가 모두 유효해야 함
        - 존재하지 않는 기업 ID나 설문 ID 사용 시 오류 발생
        """)
    
    def test_survey_creation(self):
        """설문 생성 테스트"""
        logger.info("🧪 설문 생성 테스트를 시작합니다...")
        
        try:
            with self.engine.connect() as conn:
                # 테스트 데이터
                test_survey_id = "test_company_1234567890"
                test_corporation_id = "test_company"
                test_categories = [
                    {
                        "question_number": 1,
                        "rank": 1,
                        "category": "환경관리",
                        "selected_base_issue_pool": "탄소배출",
                        "esg_classification": "환경",
                        "final_score": 85.5
                    }
                ]
                
                # 테스트 설문 삽입 (JSONB 타입으로 바인딩)
                from sqlalchemy import bindparam
                from sqlalchemy.dialects.postgresql import JSONB
                
                sql = text("""
                    INSERT INTO surveys (survey_id, corporation_id, timestamp, total_categories, categories)
                    VALUES (:survey_id, :corporation_id, :timestamp, :total_categories, :categories)
                """).bindparams(
                    bindparam("categories", type_=JSONB),
                )
                
                conn.execute(sql, {
                    "survey_id": test_survey_id,
                    "corporation_id": test_corporation_id,
                    "timestamp": datetime.now(),
                    "total_categories": len(test_categories),
                    "categories": test_categories  # 파이썬 객체 그대로
                })
                
                # 테스트 데이터 확인
                result = conn.execute(text("SELECT * FROM surveys WHERE survey_id = :survey_id"), {
                    "survey_id": test_survey_id
                })
                test_survey = result.fetchone()
                
                if test_survey:
                    logger.info("✅ 설문 생성 테스트 성공!")
                    logger.info(f"   📊 생성된 설문: {test_survey[0]}")
                    
                    # 테스트 데이터 삭제
                    conn.execute(text("DELETE FROM surveys WHERE survey_id = :survey_id"), {
                        "survey_id": test_survey_id
                    })
                    logger.info("   🗑️ 테스트 데이터 정리 완료")
                    return True
                else:
                    logger.error("❌ 설문 생성 테스트 실패")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ 설문 생성 테스트 중 오류: {e}")
            return False

def main():
    """메인 함수"""
    logger.info("🔧 설문 데이터베이스 관리 도구")
    logger.info("=" * 50)
    
    # 테이블 매니저 초기화
    manager = SurveyTableManager()
    
    # 데이터베이스 연결
    if not manager.connect_database():
        return
    
    while True:
        print("\n사용 가능한 작업:")
        print("1. 설문 테이블 생성")
        print("2. 설문 테이블 삭제 (주의: 모든 데이터 손실)")
        print("3. content_hash 컬럼 포함 테이블 재생성 (권장)")
        print("4. 테이블 정보 보기")
        print("5. 설문 생성 테스트")
        print("6. 종료")
        
        choice = input("\n작업을 선택하세요 (1-6): ").strip()
        
        if choice == '1':
            if manager.create_all_tables():
                logger.info("🎉 테이블 생성이 성공적으로 완료되었습니다!")
            else:
                logger.error("💥 테이블 생성에 실패했습니다.")
        
        elif choice == '2':
            if manager.drop_all_tables():
                logger.info("🗑️ 테이블 삭제가 성공적으로 완료되었습니다!")
            else:
                logger.error("💥 테이블 삭제에 실패했습니다.")
        
        elif choice == '3':
            if manager.recreate_tables_with_content_hash():
                logger.info("🎉 content_hash 컬럼이 포함된 테이블 재생성이 성공했습니다!")
            else:
                logger.error("💥 테이블 재생성에 실패했습니다.")
        
        elif choice == '4':
            manager.show_table_info()
        
        elif choice == '5':
            if manager.test_survey_creation():
                logger.info("🎯 설문 생성 테스트가 성공했습니다!")
            else:
                logger.error("💥 설문 생성 테스트에 실패했습니다.")
        
        elif choice == '6':
            logger.info("👋 프로그램을 종료합니다.")
            break
        
        else:
            logger.warning("⚠️ 잘못된 선택입니다. 1-6 중에서 선택해주세요.")
        
        input("\n계속하려면 Enter를 누르세요...")

if __name__ == "__main__":
    # 동기 메인 함수 실행
    main()
