#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gri_index_merged.json을 gri_question 테이블 구조에 맞는 JSON으로 변환하는 스크립트
"""

import json
import re

def convert_to_questions_format(input_file, output_file):
    """gri_index_merged.json을 gri_question 구조로 변환"""
    
    print("🔄 JSON 변환 시작...")
    
    # 입력 파일 읽기
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    questions = []
    question_id = 1
    
    print(f"📊 총 {len(data)}개 아이템을 처리합니다...")
    
    for index_no, item_data in data.items():
        print(f"   처리 중: {index_no}")
        
        # item_id는 gri_item 테이블의 id와 매칭되어야 함
        # 여기서는 임시로 index_no를 사용 (실제로는 gri_item의 id로 교체 필요)
        
        # 각 알파벳 키(a, b, c, d, e, f, g)에 대해 질문 생성
        for key_alpha, content in item_data.items():
            if key_alpha == 'reference':
                continue
                
            if isinstance(content, dict) and 'question' in content:
                question_text = content.get('question', '')
                answer = content.get('answer', '')
                
                # question_type 결정 (기본값: 'question')
                question_type = 'question'
                
                # required 필드 (기본값: false)
                required = False
                
                # display_order (순차적으로 증가)
                display_order = question_id
                
                question_obj = {
                    "id": question_id,
                    "item_id": index_no,  # 실제로는 gri_item의 id로 교체 필요
                    "key_alpha": key_alpha,
                    "question_text": question_text,
                    "reference_text": item_data.get('reference', ''),
                    "question_type": question_type,
                    "display_order": display_order,
                    "required": required
                }
                
                questions.append(question_obj)
                question_id += 1
    
    # 결과를 gri_question 구조로 저장
    result = {
        "questions": questions
    }
    
    # 출력 파일 저장
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ 변환 완료!")
    print(f"   총 질문 수: {len(questions)}개")
    print(f"   출력 파일: {output_file}")
    
    # 샘플 데이터 출력
    if questions:
        print(f"\n📋 샘플 데이터:")
        sample = questions[0]
        print(f"   ID: {sample['id']}")
        print(f"   Item ID: {sample['item_id']}")
        print(f"   Key Alpha: {sample['key_alpha']}")
        print(f"   Question Type: {sample['question_type']}")
        print(f"   Required: {sample['required']}")
        print(f"   Question Text: {sample['question_text'][:100]}...")
    
    return questions

def create_upload_script():
    """gri_question 업로드 스크립트 생성"""
    
    script_content = '''#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GRI Questions 데이터를 Railway PostgreSQL의 gri_question 테이블에 업로드하는 스크립트
"""

import json
import psycopg2
from datetime import datetime

# Railway PostgreSQL 연결 설정
DB_CONFIG = {
    'host': 'gondola.proxy.rlwy.net',
    'port': '15963',
    'database': 'railway',
    'user': 'postgres',
    'password': 'ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx',
}

class QuestionUploader:
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
        """gri_question 테이블이 존재하는지 확인"""
        try:
            self.cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'gri_question'
                );
            """)
            exists = self.cursor.fetchone()[0]
            if exists:
                print("✅ gri_question 테이블이 존재합니다.")
                return True
            else:
                print("❌ gri_question 테이블이 존재하지 않습니다.")
                return False
        except Exception as e:
            print(f"❌ 테이블 확인 실패: {e}")
            return False
    
    def get_item_mapping(self):
        """gri_item의 index_no와 id 매핑 정보 가져오기"""
        try:
            self.cursor.execute("""
                SELECT id, index_no 
                FROM gri_item 
                ORDER BY id
            """)
            items = self.cursor.fetchall()
            
            mapping = {index_no: item_id for item_id, index_no in items}
            print(f"📋 아이템 매핑 정보: {len(mapping)}개")
            
            return mapping
        except Exception as e:
            print(f"❌ 아이템 정보 조회 실패: {e}")
            return {}
    
    def upload_questions(self, questions_file):
        """질문 데이터를 gri_question 테이블에 업로드"""
        try:
            # JSON 파일 읽기
            with open(questions_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            questions = data.get('questions', [])
            print(f"\\n📊 총 {len(questions)}개 질문을 업로드합니다...")
            
            # 기존 데이터 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_question")
            existing_count = self.cursor.fetchone()[0]
            print(f"   기존 질문 수: {existing_count}")
            
            # 아이템 매핑 가져오기
            item_mapping = self.get_item_mapping()
            if not item_mapping:
                print("❌ 아이템 매핑 정보를 가져올 수 없습니다.")
                return False
            
            # 질문 데이터 삽입
            inserted_count = 0
            updated_count = 0
            
            for i, question in enumerate(questions, 1):
                # item_id를 실제 gri_item의 id로 변환
                index_no = question['item_id']
                if index_no not in item_mapping:
                    print(f"⚠️  경고: {index_no}에 해당하는 gri_item을 찾을 수 없습니다.")
                    continue
                
                actual_item_id = item_mapping[index_no]
                
                # 기존 질문 확인 (item_id + key_alpha로)
                self.cursor.execute("""
                    SELECT id FROM gri_question 
                    WHERE item_id = %s AND key_alpha = %s
                """, (actual_item_id, question['key_alpha']))
                existing = self.cursor.fetchone()
                
                if existing:
                    # 기존 데이터 업데이트
                    self.cursor.execute("""
                        UPDATE gri_question 
                        SET question_text = %s, reference_text = %s, 
                            question_type = %s, required = %s, updated_at = NOW()
                        WHERE item_id = %s AND key_alpha = %s
                    """, (question['question_text'], question['reference_text'], 
                          question['question_type'], question['required'], 
                          actual_item_id, question['key_alpha']))
                    updated_count += 1
                else:
                    # 새 데이터 삽입
                    self.cursor.execute("""
                        INSERT INTO gri_question (item_id, key_alpha, question_text, 
                                                reference_text, question_type, display_order, 
                                                required, created_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                    """, (actual_item_id, question['key_alpha'], question['question_text'],
                          question['reference_text'], question['question_type'], 
                          question['display_order'], question['required']))
                    inserted_count += 1
                
                # 진행률 표시
                if i % 50 == 0 or i == len(questions):
                    print(f"   진행률: {i}/{len(questions)} ({i/len(questions)*100:.1f}%)")
            
            # 변경사항 커밋
            self.connection.commit()
            
            print(f"\\n✅ 업로드 완료!")
            print(f"   새로 삽입: {inserted_count}개")
            print(f"   업데이트: {updated_count}개")
            print(f"   총 처리: {inserted_count + updated_count}개")
            
            return True
            
        except Exception as e:
            print(f"❌ 질문 업로드 실패: {e}")
            if self.connection:
                self.connection.rollback()
            return False
    
    def verify_upload(self):
        """업로드 결과 검증"""
        try:
            # 전체 질문 수 확인
            self.cursor.execute("SELECT COUNT(*) FROM gri_question")
            total_count = self.cursor.fetchone()[0]
            
            # 아이템별 질문 수 확인
            self.cursor.execute("""
                SELECT i.index_no, COUNT(q.id) as question_count
                FROM gri_item i
                LEFT JOIN gri_question q ON i.id = q.item_id
                GROUP BY i.id, i.index_no
                ORDER BY i.index_no
            """)
            item_stats = self.cursor.fetchall()
            
            print(f"\\n📊 업로드 검증 결과:")
            print(f"   전체 질문 수: {total_count}개")
            print(f"\\n   아이템별 질문 수 (상위 10개):")
            
            for index_no, question_count in item_stats[:10]:
                print(f"   {index_no}: {question_count}개")
            
            return True
            
        except Exception as e:
            print(f"❌ 검증 실패: {e}")
            return False

def main():
    """메인 실행 함수"""
    print("🚀 GRI Questions 업로드 시작!")
    print("=" * 50)
    
    # 업로더 생성 및 연결
    uploader = QuestionUploader(DB_CONFIG)
    
    if not uploader.connect():
        print("❌ 데이터베이스 연결 실패로 종료합니다.")
        return
    
    try:
        # 테이블 존재 확인
        if not uploader.check_table_exists():
            print("❌ gri_question 테이블이 존재하지 않습니다.")
            print("💡 먼저 gri_input_fixed.sql을 실행하여 테이블을 생성하세요.")
            return
        
        # 질문 데이터 업로드
        questions_file = "GRI_questions_converted.json"
        if uploader.upload_questions(questions_file):
            # 업로드 결과 검증
            uploader.verify_upload()
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")
    
    finally:
        # 연결 해제
        uploader.disconnect()
        print("\\n🎉 GRI Questions 업로드 완료!")

if __name__ == "__main__":
    main()
'''
    
    with open('upload_questions.py', 'w', encoding='utf-8') as f:
        f.write(script_content)
    
    print("✅ upload_questions.py 스크립트가 생성되었습니다!")

def main():
    """메인 실행 함수"""
    print("🔄 GRI Questions 변환 및 업로드 스크립트 생성")
    print("=" * 60)
    
    # 1단계: JSON 변환
    input_file = "gri_index_merged.json"
    output_file = "GRI_questions_converted.json"
    
    try:
        questions = convert_to_questions_format(input_file, output_file)
        
        # 2단계: 업로드 스크립트 생성
        create_upload_script()
        
        print(f"\n🎉 모든 작업이 완료되었습니다!")
        print(f"📁 생성된 파일들:")
        print(f"   - {output_file}: 변환된 질문 데이터")
        print(f"   - upload_questions.py: 업로드 스크립트")
        print(f"\n💡 다음 단계:")
        print(f"   1. python upload_questions.py 실행")
        print(f"   2. gri_question 테이블에 데이터 업로드")
        
    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    main()
