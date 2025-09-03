import logging
import json
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, text, bindparam
from sqlalchemy.dialects.postgresql import JSONB


from app.domain.survey.entity import SurveyEntity, SurveyResponseEntity
from app.domain.survey.schema import (
    SurveyCreateRequest,
    SurveyResponseRequest,
    SurveyDataResponse,
    SurveyResponsesResponse,
    SurveyListResponse
)
from app.common.database.survey_db import get_sync_session

logger = logging.getLogger(__name__)
logger.info(f"[LOAD] SurveyRepository loaded from: {__file__}")

class SurveyRepository:
    """설문 데이터 리포지토리"""
    
    def __init__(self):
        """리포지토리 초기화 - 세션은 필요할 때마다 생성"""
        pass
    
    def _get_session(self) -> Session:
        """데이터베이스 세션 생성"""
        return get_sync_session()
    
    def _prepare_json_data(self, data: Any) -> str:
        """JSON 데이터를 PostgreSQL에 저장하기 위해 JSON 문자열로 변환"""
        if isinstance(data, (dict, list)):
            # JSON 문자열로 변환 (::jsonb 캐스팅을 위해)
            return json.dumps(data, ensure_ascii=False)
        elif data is None:
            return None
        else:
            return str(data)
    
    def _check_corporation_exists(self, corporation_id: str) -> bool:
        """기업 ID가 존재하는지 확인"""
        try:
            with self._get_session() as session:
                result = session.execute(
                    text("SELECT 1 FROM corporation WHERE id = :cid LIMIT 1"),
                    {"cid": corporation_id}
                ).first()
                exists = bool(result)
                
                if not exists:
                    logger.warning(f"기업 ID가 존재하지 않습니다: {corporation_id}")
                
                return exists
                
        except Exception as e:
            # 테이블 자체가 없을 때 메시지에 'relation "corporation" does not exist' 등이 들어옴
            logger.error(f"[SCHEMA?] corporation 테이블 조회 실패: {e}")
            # 여기서 바로 예외를 올려서 500이 되지 않도록, create_survey 에서 잡아 400으로 변환
            raise RuntimeError("corporation 테이블이 없거나 접근할 수 없습니다.")
    
    def _check_survey_exists(self, survey_id: str) -> bool:
        """설문 ID가 존재하는지 확인"""
        try:
            with self._get_session() as session:
                result = session.execute(
                    text("SELECT COUNT(*) FROM surveys WHERE survey_id = :survey_id"),
                    {"survey_id": survey_id}
                )
                count = result.scalar()
                exists = count > 0
                
                if not exists:
                    logger.warning(f"설문 ID가 존재하지 않습니다: {survey_id}")
                
                return exists
                
        except Exception as e:
            logger.error(f"설문 존재 여부 확인 중 오류: {e}")
            return False
    
    def create_survey(self, request: SurveyCreateRequest) -> SurveyEntity:
        """설문 생성"""
        try:
            logger.info(f"[CALL] create_survey() in: {__file__}")
            
            with self._get_session() as session:
                # Frontend에서 보내는 corporation_id를 그대로 사용
                corporation_id = request.corporation_id
                
                # 기업 존재 여부 먼저 확인
                if not self._check_corporation_exists(corporation_id):
                    raise ValueError(f"기업 ID {corporation_id}가 존재하지 않습니다.")
                
                # 고유한 설문 ID 생성
                survey_id = f"{corporation_id}_{int(datetime.now().timestamp())}"
                
                # JSONB 타입으로 바인딩 (파이썬 객체 그대로 전달)
                sql = text("""
                INSERT INTO surveys (survey_id, corporation_id, content_hash, "timestamp", total_categories, categories, excel_data)
                VALUES (:survey_id, :corporation_id, :content_hash, :timestamp, :total_categories, :categories, :excel_data)
                """).bindparams(
                    bindparam("categories", type_=JSONB),
                    bindparam("excel_data", type_=JSONB),
                )
                
                params = {
                    "survey_id": survey_id,
                    "corporation_id": corporation_id,
                    "content_hash": request.content_hash,          # 설문 내용 해시값
                    "timestamp": datetime.now(),
                    "total_categories": len(request.categories),
                    "categories": request.categories,              # 파이썬 객체 그대로
                    "excel_data": request.excel_data or None       # None 허용
                }
                
                logger.info(f"[SQL] {sql}")
                logger.info(f"[PARAMS keys] {list(params.keys())}")
                
                session.execute(sql, params)
                session.commit()  # 트랜잭션 커밋
                
                # 생성된 엔티티 조회하여 반환
                survey_entity = session.query(SurveyEntity).filter(
                    SurveyEntity.survey_id == survey_id
                ).first()
                
                logger.info(f"설문 생성 완료: {survey_id}, 회사: {corporation_id}")
                return survey_entity
                
        except Exception as e:
            logger.error(f"설문 생성 실패: {e}")
            raise
    
    def get_survey(self, survey_id: str) -> Optional[SurveyEntity]:
        """설문 조회"""
        try:
            with self._get_session() as session:
                survey = session.query(SurveyEntity).filter(
                    SurveyEntity.survey_id == survey_id
                ).first()
                return survey
                
        except Exception as e:
            logger.error(f"설문 조회 실패: {e}")
            raise
    
    def get_surveys_by_corporation(self, corporation_id: str) -> List[SurveyEntity]:
        """회사별 설문 목록 조회"""
        try:
            with self._get_session() as session:
                # 기업 존재 여부 먼저 확인
                if not self._check_corporation_exists(corporation_id):
                    logger.warning(f"기업 ID가 존재하지 않습니다: {corporation_id}")
                    return []
                
                surveys = session.query(SurveyEntity).filter(
                    SurveyEntity.corporation_id == corporation_id
                ).order_by(desc(SurveyEntity.created_at)).all()
                return surveys
                
        except Exception as e:
            logger.error(f"회사별 설문 조회 실패: {e}")
            raise
    
    def get_all_surveys(self) -> List[SurveyEntity]:
        """모든 설문 목록 조회"""
        try:
            with self._get_session() as session:
                surveys = session.query(SurveyEntity).order_by(
                    desc(SurveyEntity.created_at)
                ).all()
                return surveys
                
        except Exception as e:
            logger.error(f"모든 설문 목록 조회 실패: {e}")
            raise
    
    def delete_survey(self, survey_id: str) -> bool:
        """설문 삭제"""
        try:
            with self._get_session() as session:
                # 설문 조회
                survey = session.query(SurveyEntity).filter(
                    SurveyEntity.survey_id == survey_id
                ).first()
                
                if not survey:
                    logger.warning(f"삭제할 설문을 찾을 수 없습니다: {survey_id}")
                    return False
                
                # 관련 응답도 삭제
                deleted_responses = session.query(SurveyResponseEntity).filter(
                    SurveyResponseEntity.survey_id == survey_id
                ).delete()
                
                # 설문 삭제
                session.delete(survey)
                
                # 트랜잭션 커밋
                session.commit()
                
                logger.info(f"설문 삭제 완료: {survey_id} (관련 응답 {deleted_responses}개도 함께 삭제)")
                return True
                
        except Exception as e:
            logger.error(f"설문 삭제 실패: {e}")
            # 롤백은 with 문에서 자동으로 처리됨
            raise
    
    def submit_survey_response(self, request: SurveyResponseRequest) -> SurveyResponseEntity:
        """설문 응답 제출"""
        try:
            logger.info(f"[CALL] submit_survey_response() in: {__file__}")
            
            with self._get_session() as session:
                # Frontend에서 보내는 corporation_id를 그대로 사용
                corporation_id = request.corporation_id
                
                # 기업 존재 여부 먼저 확인
                if not self._check_corporation_exists(corporation_id):
                    raise ValueError(f"기업 ID {corporation_id}가 존재하지 않습니다.")
                
                # 설문 존재 여부 먼저 확인
                if not self._check_survey_exists(request.survey_id):
                    raise ValueError(f"설문 ID {request.survey_id}가 존재하지 않습니다.")
                
                # 중복 응답 확인
                existing_response = session.query(SurveyResponseEntity).filter(
                    and_(
                        SurveyResponseEntity.participant_email == request.participant.email,
                        SurveyResponseEntity.survey_id == request.survey_id
                    )
                ).first()
                
                if existing_response:
                    raise ValueError("이미 이 설문에 응답하셨습니다.")
                
                # 고유한 참여자 ID 생성
                participant_id = f"{request.participant.email}_{int(datetime.now().timestamp())}"
                
                # JSONB 타입으로 바인딩 (파이썬 객체 그대로 전달)
                sql = text("""
                INSERT INTO survey_responses (participant_id, survey_id, corporation_id, participant_name, participant_company, participant_position, participant_email, responses, "timestamp")
                VALUES (:participant_id, :survey_id, :corporation_id, :participant_name, :participant_company, :participant_position, :participant_email, :responses, :timestamp)
                """).bindparams(
                    bindparam("responses", type_=JSONB),
                )
                
                params = {
                    "participant_id": participant_id,
                    "survey_id": request.survey_id,
                    "corporation_id": corporation_id,
                    "participant_name": request.participant.name,
                    "participant_company": request.participant.company,
                    "participant_position": request.participant.position,
                    "participant_email": request.participant.email,
                    "responses": request.responses,  # 파이썬 객체 그대로
                    "timestamp": datetime.now()
                }
                
                logger.info(f"[SQL] {sql}")
                logger.info(f"[PARAMS keys] {list(params.keys())}")
                
                session.execute(sql, params)
                session.commit()  # 트랜잭션 커밋
                
                # 생성된 엔티티 조회하여 반환
                response_entity = session.query(SurveyResponseEntity).filter(
                    SurveyResponseEntity.participant_id == participant_id
                ).first()
                
                logger.info(f"설문 응답 제출 완료: {request.survey_id}, 참여자: {request.participant.name}")
                return response_entity
                
        except Exception as e:
            logger.error(f"설문 응답 제출 실패: {e}")
            raise
    
    def get_survey_responses(self, survey_id: str) -> List[SurveyResponseEntity]:
        """설문 응답 목록 조회"""
        try:
            with self._get_session() as session:
                # 설문 존재 여부 먼저 확인
                if not self._check_survey_exists(survey_id):
                    logger.warning(f"설문 ID가 존재하지 않습니다: {survey_id}")
                    return []
                
                responses = session.query(SurveyResponseEntity).filter(
                    SurveyResponseEntity.survey_id == survey_id
                ).order_by(SurveyResponseEntity.created_at).all()
                return responses
                
        except Exception as e:
            logger.error(f"설문 응답 목록 조회 실패: {e}")
            raise
    
    def get_response_count(self, survey_id: str) -> int:
        """설문 응답 수 조회"""
        try:
            with self._get_session() as session:
                count = session.query(SurveyResponseEntity).filter(
                    SurveyResponseEntity.survey_id == survey_id
                ).count()
                return count
                
        except Exception as e:
            logger.error(f"응답 수 조회 실패: {e}")
            raise
    
    def get_surveys_by_content_hash(self, content_hash: str) -> List[SurveyEntity]:
        """동일한 내용 해시를 가진 설문들 조회"""
        try:
            with self._get_session() as session:
                surveys = session.query(SurveyEntity).filter(
                    SurveyEntity.content_hash == content_hash
                ).order_by(desc(SurveyEntity.created_at)).all()
                return surveys
                
        except Exception as e:
            logger.error(f"내용 해시별 설문 조회 실패: {e}")
            raise
    
    def get_responses_by_content_hash(self, content_hash: str) -> List[SurveyResponseEntity]:
        """동일한 내용 해시를 가진 설문들의 모든 응답 조회"""
        try:
            with self._get_session() as session:
                # 동일한 내용 해시를 가진 설문들의 ID 목록 조회
                survey_ids = session.query(SurveyEntity.survey_id).filter(
                    SurveyEntity.content_hash == content_hash
                ).all()
                
                if not survey_ids:
                    return []
                
                # 해당 설문들의 모든 응답 조회
                responses = session.query(SurveyResponseEntity).filter(
                    SurveyResponseEntity.survey_id.in_([sid[0] for sid in survey_ids])
                ).order_by(SurveyResponseEntity.created_at).all()
                
                return responses
                
        except Exception as e:
            logger.error(f"내용 해시별 응답 조회 실패: {e}")
            raise
