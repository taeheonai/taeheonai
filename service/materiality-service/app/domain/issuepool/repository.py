"""
Issue Pool Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text, bindparam, Integer, String
from app.domain.issuepool.schema import IssuePoolResponse
from app.domain.issuepool.entity import IssuePoolEntity
from app.common.database.issuepool_db import get_db
import logging

logger = logging.getLogger(__name__)

# ESG 분류 매핑 (임시)
ESG_MAP = {
    1: "사회",
    2: "지배구조", 
    3: "지배구조/경제",
    4: "환경"
}

def get_esg_classification_name(esg_id: int) -> str:
    """ESG 분류 ID를 이름으로 변환"""
    return ESG_MAP.get(esg_id, "미분류")

class IssuePoolRepository:
    """이슈풀 리포지토리 - 이슈풀 관련 데이터베이스 작업"""
    
    def __init__(self):
        pass
    
    def _to_int(self, name: str, value) -> int:
        """값을 정수로 강제 캐스팅"""
        try:
            return int(value)
        except (TypeError, ValueError):
            raise ValueError(f"{name} must be an integer, got: {type(value).__name__} = {value}")
    
    async def get_all_issuepools(self):
        """모든 이슈풀 조회 - BaseModel 리스트 반환"""
        try:
            logger.info("🔍 리포지토리: 모든 이슈풀 조회")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = text("""
                    SELECT id, corporation_id, publish_year, ranking, 
                           base_issue_pool, issue_pool, category_id, esg_classification_id
                    FROM issuepool 
                    ORDER BY CAST(ranking AS INTEGER)
                """)
                result = await db.execute(query)
                rows = result.fetchall()
                
                logger.info(f"🔍 DB에서 가져온 raw 데이터: {len(rows)}개")
                
                # raw 데이터를 BaseModel로 변환하여 반환
                issuepool_models = []
                for row in rows:
                    issuepool_model = IssuePoolResponse(
                        id=row[0],
                        corporation_id=row[1],
                        publish_year=row[2],
                        ranking=row[3],
                        base_issue_pool=row[4],
                        issue_pool=row[5],
                        category_id=row[6],
                        esg_classification_id=row[7],
                        esg_classification_name=get_esg_classification_name(row[7])
                    )
                    issuepool_models.append(issuepool_model)
                
                logger.info(f"✅ 리포지토리: 모든 이슈풀 조회 완료 - {len(issuepool_models)}개 이슈풀")
                return issuepool_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 이슈풀 조회 중 오류 - {str(e)}")
            raise
    
    async def get_issuepools_by_corporation(self, corporation_name: str, publish_year: int = None):
        """기업명으로 이슈풀 조회 - BaseModel 리스트 반환"""
        try:
            logger.info(f"🔍 리포지토리: 기업명으로 이슈풀 조회 - corporation_name: {corporation_name}, publish_year: {publish_year}")
            
            # 데이터베이스 연결
            async for db in get_db():
                # 1단계: 기업명으로 corporation_id 조회
                corp_query = text("SELECT id FROM corporation WHERE companyname = :companyname")
                corp_result = await db.execute(corp_query, {"companyname": corporation_name})
                corp_row = corp_result.fetchone()
                
                if not corp_row:
                    logger.warning(f"⚠️ 리포지토리: 기업을 찾을 수 없음 - {corporation_name}")
                    return []
                
                corporation_id = corp_row[0]
                logger.info(f"🔍 리포지토리: 기업 ID 조회 성공 - {corporation_name} -> ID: {corporation_id}")
                
                # 2단계: corporation_id를 정수로, publish_year를 문자열로 처리
                corp_id_int = self._to_int("corporation_id", corporation_id)
                pub_year_str = str(self._to_int("publish_year", publish_year)) if publish_year else None
                
                # 3단계: corporation_id와 publish_year로 issuepool 조회 (타입 맞춤)
                if pub_year_str:
                    issuepool_query = text("""
                        SELECT id, corporation_id, publish_year, ranking, 
                               base_issue_pool, issue_pool, category_id, esg_classification_id
                        FROM issuepool 
                        WHERE corporation_id = :corp_id
                        AND publish_year = :pub_year
                        ORDER BY CAST(ranking AS INTEGER)
                    """).bindparams(
                        bindparam("corp_id", type_=Integer),
                        bindparam("pub_year", type_=String)  # publish_year는 TEXT로 비교
                    )
                    params = {"corp_id": corp_id_int, "pub_year": pub_year_str}
                else:
                    issuepool_query = text("""
                        SELECT id, corporation_id, publish_year, ranking, 
                               base_issue_pool, issue_pool, category_id, esg_classification_id
                        FROM issuepool 
                        WHERE corporation_id = :corp_id
                        ORDER BY CAST(ranking AS INTEGER)
                    """).bindparams(
                        bindparam("corp_id", type_=Integer)
                    )
                    params = {"corp_id": corp_id_int}
                
                result = await db.execute(issuepool_query, params)
                rows = result.fetchall()
                
                logger.info(f"🔍 DB에서 가져온 raw 데이터: {len(rows)}개")
                
                # raw 데이터를 BaseModel로 변환하여 반환
                issuepool_models = []
                for row in rows:
                    issuepool_model = IssuePoolResponse(
                        id=row[0],
                        corporation_id=row[1],
                        publish_year=row[2],
                        ranking=row[3],
                        base_issue_pool=row[4],
                        issue_pool=row[5],
                        category_id=row[6],
                        esg_classification_id=row[7],
                        esg_classification_name=get_esg_classification_name(row[7])
                    )
                    issuepool_models.append(issuepool_model)
                
                logger.info(f"✅ 리포지토리: 기업별 이슈풀 조회 완료 - {len(issuepool_models)}개 이슈풀")
                return issuepool_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 기업별 이슈풀 조회 중 오류 - {str(e)}")
            raise
    
    async def get_issuepools_by_year(self, publish_year: int):
        """연도별 이슈풀 조회 - BaseModel 리스트 반환"""
        try:
            logger.info(f"🔍 리포지토리: 연도별 이슈풀 조회 - publish_year: {publish_year}")
            
            # publish_year를 문자열로 변환 (DB 컬럼이 text 타입이므로)
            pub_year_str = str(self._to_int("publish_year", publish_year))
            
            # 데이터베이스 연결
            async for db in get_db():
                query = text("""
                    SELECT id, corporation_id, publish_year, ranking, 
                           base_issue_pool, issue_pool, category_id, esg_classification_id
                    FROM issuepool 
                    WHERE publish_year = :pub_year
                    ORDER BY CAST(ranking AS INTEGER)
                """).bindparams(
                    bindparam("pub_year", type_=String)  # publish_year는 TEXT로 비교
                )
                result = await db.execute(query, {"pub_year": pub_year_str})
                rows = result.fetchall()
                
                logger.info(f"🔍 DB에서 가져온 raw 데이터: {len(rows)}개")
                
                # raw 데이터를 BaseModel로 변환하여 반환
                issuepool_models = []
                for row in rows:
                    issuepool_model = IssuePoolResponse(
                        id=row[0],
                        corporation_id=row[1],
                        publish_year=row[2],
                        ranking=row[3],
                        base_issue_pool=row[4],
                        issue_pool=row[5],
                        category_id=row[6],
                        esg_classification_id=row[7],
                        esg_classification_name=get_esg_classification_name(row[7])
                    )
                    issuepool_models.append(issuepool_model)
                
                logger.info(f"✅ 리포지토리: 연도별 이슈풀 조회 완료 - {len(issuepool_models)}개 이슈풀")
                return issuepool_models
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 연도별 이슈풀 조회 중 오류 - {str(e)}")
            raise
    
    async def find_issuepool_by_id(self, issuepool_id: int):
        """ID로 이슈풀 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: ID로 이슈풀 조회 - issuepool_id: {issuepool_id}")
            
            # issuepool_id를 정수로 강제 캐스팅
            id_int = self._to_int("issuepool_id", issuepool_id)
            
            # 데이터베이스 연결
            async for db in get_db():
                query = text("""
                    SELECT id, corporation_id, publish_year, ranking, 
                           base_issue_pool, issue_pool, category_id, esg_classification_id
                    FROM issuepool 
                    WHERE id = :issuepool_id
                """).bindparams(
                    bindparam("issuepool_id", type_=Integer)
                )
                result = await db.execute(query, {"issuepool_id": id_int})
                row = result.fetchone()
                
                if row:
                    # raw 데이터를 BaseModel로 변환하여 반환
                    issuepool_model = IssuePoolResponse(
                        id=row[0],
                        corporation_id=row[1],
                        publish_year=row[2],
                        ranking=row[3],
                        base_issue_pool=row[4],
                        issue_pool=row[5],
                        category_id=row[6],
                        esg_classification_id=row[7],
                        esg_classification_name=get_esg_classification_name(row[7])
                    )
                    logger.info(f"✅ 리포지토리: 이슈풀 조회 성공 - ID: {issuepool_id}")
                    return issuepool_model
                else:
                    logger.info(f"❌ 리포지토리: 이슈풀 없음 - ID: {issuepool_id}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: ID 조회 중 오류 - {str(e)}")
            raise
