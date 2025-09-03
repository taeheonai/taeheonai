"""
Middleissue Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, cast, Integer, func, text, join
from sqlalchemy.exc import ProgrammingError, DBAPIError
from typing import List, Optional, Dict, Union
from app.domain.middleissue.schema import (
    MiddleIssueBase, IssueItem, CorporationIssueResponse, 
    CorporationBase, ESGClassificationBase, CategoryBase, CrawledArticleBase,
    CategoryDetailsResponse, BaseIssuePool
)
from app.domain.middleissue.entity import MiddleIssueEntity, CorporationEntity, CategoryEntity, ESGClassificationEntity
from app.common.database.issuepool_db import get_db
import logging

logger = logging.getLogger(__name__)

def _safe_text_to_int(text_value: str) -> Optional[int]:
    """Text 타입의 숫자 문자열을 안전하게 정수로 변환"""
    if not text_value or not isinstance(text_value, str):
        return None
    
    # 공백 제거 후 숫자만 있는지 확인
    cleaned = text_value.strip()
    if cleaned.isdigit():
        try:
            return int(cleaned)
        except (ValueError, TypeError):
            return None
    return None

def _safe_text_to_float(text_value: str) -> Optional[float]:
    """Text 타입의 숫자 문자열을 안전하게 실수로 변환"""
    if not text_value or not isinstance(text_value, str):
        return None
    
    # 공백 제거 후 숫자로 변환 가능한지 확인
    cleaned = text_value.strip()
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None

async def _safe_scalar(session, stmt, log_ctx: str) -> Optional[int]:
    """예외 발생 시 즉시 rollback 하고 None 반환"""
    try:
        return await session.scalar(stmt)
    except (ProgrammingError, DBAPIError) as e:
        logger.warning(f"⚠️ {log_ctx} 중 오류: {e}")
        try:
            await session.rollback()
            logger.info("↩️ 트랜잭션 롤백 완료")
        except Exception as rb_e:
            logger.error(f"❌ 롤백 중 오류: {rb_e}")
        return None

class MiddleIssueRepository:
    """중간 이슈 리포지토리 - 이슈풀 관련 데이터베이스 작업"""
    
    def __init__(self):
        pass
    
    async def get_corporation_issues(self, corporation_name: str, year: int) -> CorporationIssueResponse:
        """
        기업명과 연도로 이슈 조회
        - 입력받은 연도에서 1을 뺀 연도의 이슈와
        - publish_year가 null인 공통 이슈를 함께 반환
        """
        try:
            target_year = year - 1  # 입력받은 연도에서 1을 뺀 값
            logger.info(f"🔍 리포지토리: 기업 '{corporation_name}'의 {target_year}년도 이슈 및 공통 이슈 조회 시작")
            
            async for db in get_db():
                # 1. 먼저 기업명으로 corporation_id 조회
                corp_query = select(CorporationEntity).where(
                    CorporationEntity.companyname == corporation_name
                )
                corp_result = await db.execute(corp_query)
                corporation = corp_result.scalar_one_or_none()
                
                if not corporation:
                    logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                    return CorporationIssueResponse(year_issues=[], common_issues=[])
                
                # 2. 해당 연도의 이슈와 공통 이슈(publish_year is null) 함께 조회
                # 안전한 TEXT -> INTEGER 캐스팅을 위한 쿼리 수정
                year_condition = or_(
                    # 연도별 이슈: 숫자인 경우만 (year-1)과 정확히 일치
                    and_(
                        MiddleIssueEntity.publish_year.isnot(None),
                        MiddleIssueEntity.publish_year != '',
                        MiddleIssueEntity.publish_year != '0',
                        # 숫자로만 구성된 문자열인지 확인 (공백 허용)
                        MiddleIssueEntity.publish_year.op('~')(r'^\s*\d+\s*$'),
                        # 안전하게 trim 후 캐스팅하여 비교
                        cast(func.trim(MiddleIssueEntity.publish_year), Integer) == target_year
                    ),
                    # 공통 이슈: NULL/''/'0' (reference score 전용)
                    or_(
                        MiddleIssueEntity.publish_year.is_(None),
                        MiddleIssueEntity.publish_year == '',
                        MiddleIssueEntity.publish_year == '0'
                    )
                )
                
                query = select(MiddleIssueEntity).where(
                    and_(
                        MiddleIssueEntity.corporation_id == corporation.id,
                        year_condition
                    )
                )
                
                result = await db.execute(query)
                issue_entities = result.scalars().all()
                
                # 3. 연도별 이슈와 공통 이슈 분리
                year_issues = []
                common_issues = []
                
                for entity in issue_entities:
                    issue_item = IssueItem(
                        category_id=entity.category_id,
                        base_issue_pool=entity.base_issue_pool
                    )
                    
                    # publish_year가 None, 빈 문자열, 또는 '0'이면 공통 이슈
                    if entity.publish_year is None or entity.publish_year == '' or entity.publish_year == '0':
                        common_issues.append(issue_item)
                    else:
                        year_issues.append(issue_item)
                
                response = CorporationIssueResponse(
                    year_issues=year_issues,
                    common_issues=common_issues
                )
                
                logger.info(f"✅ 리포지토리: 기업 '{corporation_name}'의 {target_year}년도 이슈 {len(year_issues)}개, 공통 이슈 {len(common_issues)}개 조회 완료")
                return response
                
        except Exception as e:
            logger.error(f"❌ 리포지토리: 기업 이슈 조회 중 오류 - {str(e)}")
            raise

    async def get_category_details(self, corporation_name: str = "", category_id: str = "", year: int = 0) -> Optional[CategoryDetailsResponse]:
        """
        특정 카테고리의 ESG 분류와 base_issuepool 상세 정보 조회
        
        Args:
            corporation_name: 기업명 (선택적, 빈 문자열이면 무시)
            category_id: 카테고리 ID 또는 이름 (문자열)
            year: 검색 연도 (선택적, 0이면 무시)
            
        Returns:
            카테고리 상세 정보 (ESG 분류, base_issuepool 목록 포함)
        """
        try:
            logger.info(f"🔍 리포지토리: 카테고리 '{category_id}' 상세 정보 조회 시작")
            logger.info(f"🔍 파라미터: 기업명={corporation_name}, 카테고리ID={category_id}, 연도={year}")
            logger.info(f"🔍 카테고리 타입: {type(category_id)}")
            
            async for db in get_db():
                logger.info(f"🔍 데이터베이스 연결 성공")
                
                # 1. 기업명으로 corporation_id 조회 (빈 문자열이면 건너뛰기)
                corp_id = None
                if corporation_name and corporation_name.strip():
                    corp_query = select(CorporationEntity).where(
                        CorporationEntity.companyname == corporation_name
                    )
                    logger.info(f"🔍 기업 조회 쿼리: {corp_query}")
                    
                    corp_result = await db.execute(corp_query)
                    corporation = corp_result.scalar_one_or_none()
                    
                    if not corporation:
                        logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                        return None
                    
                    corp_id = corporation.id
                    logger.info(f"✅ 기업 조회 성공: ID={corporation.id}, 이름={corporation.companyname}")
                
                # 2. 카테고리 ID 정규화 (문자열이면 ID로 변환)
                normalized_category_id = category_id
                try:
                    # 숫자로 변환 가능한 경우 정수로 변환
                    if isinstance(category_id, str) and category_id.isdigit():
                        normalized_category_id = int(category_id)
                        logger.info(f"🔍 카테고리 ID 정규화 완료: {category_id} → {normalized_category_id}")
                    elif isinstance(category_id, int):
                        normalized_category_id = category_id
                        logger.info(f"🔍 카테고리 ID 이미 정수: {category_id}")
                    else:
                        logger.warning(f"⚠️ 카테고리 ID가 숫자가 아님: {category_id} (타입: {type(category_id)})")
                        # 간단한 카테고리 이름 → ID 변환 시도
                        logger.info(f"🔍 카테고리 이름 '{category_id}'를 ID로 변환 시도")
                        resolved_id = await _safe_scalar(
                            db, 
                            select(CategoryEntity.id).where(CategoryEntity.category_name == category_id), 
                            "카테고리 이름 매칭"
                        )
                        if resolved_id is not None:
                            normalized_category_id = int(resolved_id)
                            logger.info(f"✅ 카테고리 이름 매칭 성공: '{category_id}' → {normalized_category_id}")
                        else:
                            logger.warning(f"⚠️ 카테고리 이름 매칭 실패: '{category_id}'를 ID로 변환할 수 없음")
                            # 매칭 실패 시 매칭 불가로 처리
                            logger.error(f"❌ 카테고리 '{category_id}' 매칭 실패 → 매칭 불가")
                            return None
                except (ValueError, TypeError) as e:
                    logger.error(f"❌ 카테고리 ID 변환 실패: {category_id}, 오류: {e}")
                    # 변환 실패 시 원본 값 사용하되 로그 기록
                
                # 3. 🔥 연도 조건 제거 - 카테고리만 매칭하여 모든 base issue pool 조회
                logger.info(f"🔍 연도 조건 제거: 카테고리만 매칭하여 모든 base issue pool 조회")
                
                # 연도 조건 없이 모든 데이터 조회
                year_condition = None
                
                # 4. 해당 카테고리의 이슈풀 정보 조회 (ESG 분류 포함, 연도 조건 없음)
                # normalized_category_id가 정수인지 확인
                if not isinstance(normalized_category_id, int):
                    logger.error(f"❌ 카테고리 ID가 정수가 아님: {normalized_category_id} (타입: {type(normalized_category_id)})")
                    return None
                
                # JOIN을 사용하여 ESG 분류 정보도 함께 가져오기 (LEFT JOIN으로 변경)
                query = select(
                    MiddleIssueEntity,
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).outerjoin(  # INNER JOIN → LEFT JOIN으로 변경
                    ESGClassificationEntity,
                    MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    MiddleIssueEntity.category_id == int(normalized_category_id)  # 정수 비교 보장
                    # 연도 조건 제거 - publish_year 무시
                    # 기업 조건 제거 - corporation_id 무시
                )
                
                logger.info(f"🔍 이슈풀 조회 쿼리 (연도 조건 없음): {query}")
                
                result = await db.execute(query)
                issue_rows = result.all()
                
                logger.info(f"🔍 이슈풀 조회 결과: {len(issue_rows)}개 행")
                
                # 연도 조건 제거로 인해 데이터가 없으면 해당 기업/카테고리 조합에 데이터가 없는 것
                if not issue_rows:
                    logger.warning(f"⚠️ 카테고리 '{category_id}'에 해당하는 이슈풀을 찾을 수 없습니다.")
                    return None
                
                # 5. 첫 번째 행에서 ESG 분류 정보 추출 (모든 행이 동일한 ESG 분류를 가짐)
                first_row = issue_rows[0]
                first_entity = first_row[0]  # MiddleIssueEntity
                esg_classification_name = first_row[1]  # ESG 분류명
                
                logger.info(f"🔍 첫 번째 엔티티 정보: {first_entity}")
                logger.info(f"🔍 ESG 분류 정보: {esg_classification_name}")
                
                esg_classification_id = first_entity.esg_classification_id
                
                # 6. base_issuepool 목록 구성
                base_issuepools = []
                for i, row in enumerate(issue_rows):
                    entity = row[0]  # MiddleIssueEntity
                    issue_data = BaseIssuePool(
                        id=entity.id,
                        base_issue_pool=entity.base_issue_pool,
                        issue_pool=entity.issue_pool,
                        ranking=entity.ranking,
                        esg_classification_id=esg_classification_id,
                        esg_classification_name=esg_classification_name
                    )
                    base_issuepools.append(issue_data)
                    logger.info(f"🔍 이슈풀 {i+1}: {issue_data}")
                
                # 7. CategoryDetailsResponse 스키마로 변환하여 반환
                category_details = CategoryDetailsResponse(
                    category_id=str(category_id),
                    normalized_category_id=normalized_category_id,
                    esg_classification_id=esg_classification_id,
                    esg_classification_name=esg_classification_name,
                    base_issuepools=base_issuepools,
                    total_count=len(base_issuepools)
                )
                
                logger.info(f"✅ 리포지토리: 카테고리 '{category_id}' 상세 정보 조회 완료 - ESG: {esg_classification_name}, 이슈풀: {len(base_issuepools)}개")
                logger.info(f"✅ 반환할 데이터: {category_details}")
                return category_details
                
        except Exception as e:
            logger.error(f"❌ 리포지토리: 카테고리 상세 정보 조회 중 오류 - {str(e)}")
            logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return None

    async def get_corporation_by_name(self, corporation_name: str) -> Optional[CorporationBase]:
        """기업명으로 기업 정보 조회"""
        try:
            async for db in get_db():
                query = select(CorporationEntity).where(
                    CorporationEntity.companyname == corporation_name
                )
                result = await db.execute(query)
                corporation = result.scalar_one_or_none()
                
                if corporation:
                    return CorporationBase(
                        id=corporation.id,
                        corp_code=corporation.corp_code,
                        companyname=corporation.companyname,
                        market=corporation.market,
                        dart_code=corporation.dart_code
                    )
                return None
        except Exception as e:
            logger.error(f"❌ 기업 정보 조회 중 오류: {str(e)}")
            return None

    async def get_category_by_id(self, category_id: int) -> Optional[CategoryBase]:
        """카테고리 ID로 카테고리 정보 조회"""
        try:
            async for db in get_db():
                query = select(CategoryEntity).where(CategoryEntity.id == category_id)
                result = await db.execute(query)
                category = result.scalar_one_or_none()
                
                if category:
                    return CategoryBase(
                        id=category.id,
                        category_name=category.category_name,
                        esg_classification_id=category.esg_classification_id
                    )
                return None
        except Exception as e:
            logger.error(f"❌ 카테고리 정보 조회 중 오류: {str(e)}")
            return None

    async def get_esg_classification_by_id(self, esg_id: int) -> Optional[ESGClassificationBase]:
        """ESG 분류 ID로 ESG 분류 정보 조회"""
        try:
            async for db in get_db():
                query = select(ESGClassificationEntity).where(ESGClassificationEntity.id == esg_id)
                result = await db.execute(query)
                esg = result.scalar_one_or_none()
                
                if esg:
                    return ESGClassificationBase(
                        id=esg.id,
                        esg=esg.esg
                    )
                return None
        except Exception as e:
            logger.error(f"❌ ESG 분류 정보 조회 중 오류: {str(e)}")
            return None

    async def get_category_id_by_name(self, category_name: str) -> Optional[int]:
        """카테고리 이름으로 카테고리 ID 조회 (라벨링용)"""
        try:
            async for db in get_db():
                query = select(CategoryEntity.id).where(CategoryEntity.category_name == category_name)
                result = await db.execute(query)
                category_id = result.scalar_one_or_none()
                return category_id
        except Exception as e:
            logger.error(f"❌ 카테고리 이름으로 ID 조회 중 오류: {str(e)}")
            return None

    async def get_category_esg_direct(self, category_name: str) -> Optional[str]:
        """
        카테고리 이름으로 직접 ESG 분류 조회 (materiality_category DB 사용)
        기업과 무관하게 카테고리 자체의 ESG 분류를 반환
        """
        try:
            async for db in get_db():
                # CategoryEntity와 ESGClassificationEntity를 JOIN하여 ESG 분류 조회
                query = select(ESGClassificationEntity.esg).join(
                    CategoryEntity,
                    CategoryEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    CategoryEntity.category_name == category_name
                )
                
                result = await db.execute(query)
                esg_classification = result.scalar_one_or_none()
                
                if esg_classification:
                    logger.debug(f"✅ 카테고리 '{category_name}' ESG 분류 조회 성공: {esg_classification}")
                else:
                    logger.debug(f"⚠️ 카테고리 '{category_name}' ESG 분류 없음")
                
                return esg_classification
                
        except Exception as e:
            logger.error(f"❌ 카테고리 '{category_name}' ESG 분류 조회 중 오류: {str(e)}")
            return None

    async def get_categories_details_batch(
        self,
        corporation_name: str,
        categories: List[Union[str, int]],
        year: int,  # year 파라미터는 유지하되 사용하지 않음
    ) -> Dict[str, CategoryDetailsResponse]:
        """
        입력 categories(이름 또는 ID 섞여있음)를 한 번에 조회해서
        {원본키(str): CategoryDetailsResponse} 맵으로 반환.
        
        매칭 규약: 
        - 연도 조건 없음 (year 파라미터 무시)
        - 카테고리만 매칭하여 base issue pool 조회
        - 중복 제거는 공백을 포함한 문자 그대로 비교
        """
        categories = [str(c) for c in categories]
        if not categories:
            return {}

        try:
            async for db in get_db():
                # (0) statement_timeout 설정 (15초)
                await db.execute(text("SET LOCAL statement_timeout = '15000ms'"))

                # (1) 기업 ID
                corp = await db.scalar(
                    select(CorporationEntity.id).where(CorporationEntity.companyname == corporation_name)
                )
                if not corp:
                    logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                    return {}

                # (2) 이름→ID 매핑(배치)
                name_set = {c for c in categories if not c.isdigit()}
                id_set = {int(c) for c in categories if c.isdigit()}

                name_id_rows = []
                if name_set:
                    name_id_rows = (await db.execute(
                        select(CategoryEntity.id, CategoryEntity.category_name)
                        .where(CategoryEntity.category_name.in_(name_set))
                    )).all()
                name_to_id = {r[1]: r[0] for r in name_id_rows}

                # 최종 조회할 category_id 집합
                cat_ids = set(id_set) | set(name_to_id.values())
                if not cat_ids:
                    logger.warning(f"⚠️ 유효한 카테고리 ID가 없습니다: {categories}")
                    return {}

                # (3) 🔥 연도 조건 제거 - 카테고리만 매칭하여 모든 base issue pool 조회
                logger.info(f"🔍 연도 조건 없이 카테고리만 매칭하여 base issue pool 조회")

                # (4) 한 번에 issuepool + esg 조회 (연도 조건 없음)
                rows = (await db.execute(
                    select(
                        MiddleIssueEntity.category_id,
                        MiddleIssueEntity.id,
                        MiddleIssueEntity.base_issue_pool,
                        MiddleIssueEntity.issue_pool,
                        MiddleIssueEntity.ranking,
                        ESGClassificationEntity.id.label('esg_id'),
                        ESGClassificationEntity.esg.label('esg_name'),
                    )
                    .join(ESGClassificationEntity,
                          MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id)
                    .where(
                        and_(
                            MiddleIssueEntity.corporation_id == corp,
                            MiddleIssueEntity.category_id.in_(cat_ids),
                            # 연도 조건 제거 - publish_year 무시
                        )
                    )
                )).all()

                # (5) category_id별로 묶기 및 중복 제거
                by_cat_id: Dict[int, tuple] = {}
                for (category_id, issue_id, base_issue_pool, issue_pool, ranking, esg_id, esg_name) in rows:
                    if category_id not in by_cat_id:
                        by_cat_id[category_id] = (esg_id, esg_name, [])
                    
                    pools = by_cat_id[category_id][2]
                    
                    # 🔥 중복 제거: 공백을 포함한 문자 그대로 비교
                    is_duplicate = False
                    for existing_pool in pools:
                        if (existing_pool.base_issue_pool == base_issue_pool and 
                            existing_pool.issue_pool == issue_pool):
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        pools.append(BaseIssuePool(
                            id=issue_id,
                            base_issue_pool=base_issue_pool,
                            issue_pool=issue_pool,
                            ranking=ranking,
                            esg_classification_id=esg_id,
                            esg_classification_name=esg_name
                        ))

                # (6) 원본 키(이름/ID 문자열) 기준으로 응답 맵 구성
                out: Dict[str, CategoryDetailsResponse] = {}
                for key in categories:
                    if key.isdigit():
                        cid = int(key)
                    else:
                        cid = name_to_id.get(key)

                    if cid is None:
                        continue

                    pools_info = by_cat_id.get(cid)
                    if not pools_info:
                        continue

                    esg_id, esg_name, pools = pools_info
                    out[key] = CategoryDetailsResponse(
                        category_id=key,
                        normalized_category_id=cid,
                        esg_classification_id=esg_id,
                        esg_classification_name=esg_name,
                        base_issuepools=pools,
                        total_count=len(pools),
                    )

                logger.info(f"✅ 배치 조회 완료: 요청 {len(categories)}개, 조회 {len(cat_ids)}개, 반환 {len(out)}개")
                logger.info(f"🔍 연도 조건 없이 카테고리만 매칭하여 base issue pool 조회 완료")
                return out

        except Exception as e:
            logger.error(f"❌ 배치 카테고리 조회 중 오류: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return {}

    async def get_middle_issue_with_relations(self, issue_id: int) -> Optional[MiddleIssueBase]:
        """이슈 ID로 이슈 정보와 관련 정보를 함께 조회"""
        try:
            async for db in get_db():
                # JOIN을 사용하여 관련 정보를 함께 가져오기
                query = select(
                    MiddleIssueEntity,
                    CorporationEntity.companyname.label('corporation_name'),
                    CategoryEntity.category_name.label('category_name'),
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).join(
                    CorporationEntity,
                    MiddleIssueEntity.corporation_id == CorporationEntity.id
                ).join(
                    CategoryEntity,
                    MiddleIssueEntity.category_id == CategoryEntity.id
                ).join(
                    ESGClassificationEntity,
                    MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    MiddleIssueEntity.id == issue_id
                )
                
                result = await db.execute(query)
                row = result.first()
                
                if row:
                    issue_entity = row[0]
                    corporation_name = row[1]
                    category_name = row[2]
                    esg_name = row[3]
                    
                    return MiddleIssueBase(
                        id=issue_entity.id,
                        corporation_id=issue_entity.corporation_id,
                        publish_year=issue_entity.publish_year,
                        ranking=issue_entity.ranking,
                        base_issue_pool=issue_entity.base_issue_pool,
                        issue_pool=issue_entity.issue_pool,
                        category_id=issue_entity.category_id,
                        esg_classification_id=issue_entity.esg_classification_id
                    )
                return None
        except Exception as e:
            logger.error(f"❌ 이슈 정보 조회 중 오류: {str(e)}")
            return None

    async def get_category_by_name_direct(
        self, 
        corporation_name: str = "", 
        category_name: str = "", 
        year: int = 0
    ) -> Optional[CategoryDetailsResponse]:
        """
        카테고리 이름으로 직접 조회하여 모든 관련 정보를 한 번에 가져오기
        JOIN을 사용하여 토큰화/별칭 매핑 없이 직접 매칭
        """
        try:
            logger.info(f"🔍 카테고리 이름으로 직접 조회: '{category_name}' (기업: {corporation_name}, 연도: {year})")
            
            async for db in get_db():
                # 1. 기업명으로 corporation_id 조회 (빈 문자열이면 건너뛰기)
                corp_id = None
                if corporation_name and corporation_name.strip():
                    corp_query = select(CorporationEntity).where(
                        CorporationEntity.companyname == corporation_name
                    )
                    corp_result = await db.execute(corp_query)
                    corporation = corp_result.scalar_one_or_none()
                    
                    if not corporation:
                        logger.warning(f"⚠️ 기업 '{corporation_name}'을 찾을 수 없습니다.")
                        return None
                    
                    corp_id = corporation.id
                    logger.info(f"✅ 기업 조회 성공: ID={corporation.id}, 이름={corporation.companyname}")
                else:
                    logger.info(f"🔍 기업명이 비어있어 기업 조회 건너뛰기")
                
                # 2. 안전한 publish_year 비교를 위한 조건 구성
                # 🔥 연도 조건 제거 - 카테고리만 매칭하여 모든 base issue pool 조회
                logger.info(f"🔍 연도 조건 제거: 카테고리만 매칭하여 모든 base issue pool 조회")
                
                # 연도 조건 없이 모든 데이터 조회
                year_condition = None
                
                # 3. JOIN을 사용하여 카테고리 이름으로 직접 조회 (연도 조건 없음)
                query = select(
                    MiddleIssueEntity,
                    CategoryEntity.category_name,
                    ESGClassificationEntity.esg.label('esg_classification_name')
                ).join(
                    CategoryEntity,
                    MiddleIssueEntity.category_id == CategoryEntity.id
                ).outerjoin(  # INNER JOIN → LEFT JOIN으로 변경
                    ESGClassificationEntity,
                    MiddleIssueEntity.esg_classification_id == ESGClassificationEntity.id
                ).where(
                    CategoryEntity.category_name == category_name  # 이름으로 직접 매칭
                    # 연도 조건 제거 - publish_year 무시
                    # 기업 조건 제거 - corporation_id 무시
                )
                
                logger.info(f"🔍 직접 조회 쿼리 (연도 조건 없음): {query}")
                
                result = await db.execute(query)
                issue_rows = result.all()
                
                logger.info(f"🔍 직접 조회 결과: {len(issue_rows)}개 행")
                
                # 연도 조건 제거로 인해 데이터가 없으면 해당 기업/카테고리 조합에 데이터가 없는 것
                if not issue_rows:
                    logger.warning(f"⚠️ 카테고리 '{category_name}'에 해당하는 이슈풀을 찾을 수 없습니다.")
                    return None
                
                # 4. 첫 번째 행에서 ESG 분류 정보 추출
                first_row = issue_rows[0]
                first_entity = first_row[0]  # MiddleIssueEntity
                esg_classification_name = first_row[2]  # ESG 분류명
                
                esg_classification_id = first_entity.esg_classification_id
                category_id = first_entity.category_id
                
                # 5. base_issuepool 목록 구성
                base_issuepools = []
                for i, row in enumerate(issue_rows):
                    entity = row[0]  # MiddleIssueEntity
                    issue_data = BaseIssuePool(
                        id=entity.id,
                        base_issue_pool=entity.base_issue_pool,
                        issue_pool=entity.issue_pool,
                        ranking=entity.ranking,
                        esg_classification_id=esg_classification_id,
                        esg_classification_name=esg_classification_name
                    )
                    base_issuepools.append(issue_data)
                    logger.info(f"🔍 이슈풀 {i+1}: {issue_data}")
                
                # 6. CategoryDetailsResponse 스키마로 변환하여 반환
                category_details = CategoryDetailsResponse(
                    category_id=category_name,
                    normalized_category_id=category_id,
                    esg_classification_id=esg_classification_id,
                    esg_classification_name=esg_classification_name,
                    base_issuepools=base_issuepools,
                    total_count=len(base_issuepools)
                )
                
                logger.info(f"✅ 카테고리 '{category_name}' 직접 조회 완료 - ESG: {esg_classification_name}, 이슈풀: {len(base_issuepools)}개")
                return category_details
                
        except Exception as e:
            logger.error(f"❌ 카테고리 직접 조회 중 오류: {str(e)}")
            logger.error(f"❌ 오류 상세: {type(e).__name__}: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return None

    async def get_categories_by_names_batch(
        self, 
        category_names: List[str]
    ) -> Dict[str, CategoryDetailsResponse]:
        """
        배치로 카테고리별 ESG 분류 및 base_issue_pool 조회
        - materiality_category DB에서 ESG 분류 조회 (카테고리명 기준)
        - issuepool DB에서 base_issue_pool 조회 (카테고리 기준, 중복 제거)
        """
        try:
            async for db in get_db():
                # 성능 최적화를 위한 설정 (SET LOCAL 제거 - 500 에러 방지)
                # await db.execute(text("SET LOCAL statement_timeout = '30000ms'"))
                # await db.execute(text("SET LOCAL work_mem = '256MB'"))
                
                logger.warning(f"🔍 배치 쿼리 실행 시작: {len(category_names)}개 카테고리")
                start_time = __import__('time').time()
                
                # 1. materiality_category DB에서 ESG 분류만 조회
                esg_query = (
                    select(
                        CategoryEntity.category_name,
                        CategoryEntity.id.label('category_id'),
                        ESGClassificationEntity.esg.label('esg_classification_name'),
                        ESGClassificationEntity.id.label('esg_classification_id')
                    )
                    .select_from(CategoryEntity)
                    .outerjoin(ESGClassificationEntity, CategoryEntity.esg_classification_id == ESGClassificationEntity.id)
                    .where(
                        CategoryEntity.category_name.in_(category_names)
                    )
                )
                
                esg_result = await db.execute(esg_query)
                esg_rows = esg_result.fetchall()
                
                # ESG 분류 결과를 딕셔너리로 변환
                esg_map = {}
                for row in esg_rows:
                    esg_map[row.category_name] = {
                        'category_id': row.category_id,
                        'esg_classification_name': row.esg_classification_name or '미분류',
                        'esg_classification_id': row.esg_classification_id
                    }
                
                logger.warning(f"🔍 ESG 분류 조회 완료: {len(esg_map)}개 카테고리")
                
                # 2. issuepool DB에서 base_issue_pool 조회 (카테고리 ID 기준)
                category_ids = [esg_map[name]['category_id'] for name in esg_map.keys()]
                
                if category_ids:
                    issuepool_query = (
                        select(
                            MiddleIssueEntity.category_id,
                            MiddleIssueEntity.id,
                            MiddleIssueEntity.base_issue_pool,
                            MiddleIssueEntity.issue_pool,
                            MiddleIssueEntity.ranking
                        )
                        .where(
                            MiddleIssueEntity.category_id.in_(category_ids)
                            # company_id, 연도 조건 제거
                        )
                        .order_by(MiddleIssueEntity.category_id, MiddleIssueEntity.ranking)
                    )
                    
                    issuepool_result = await db.execute(issuepool_query)
                    issuepool_rows = issuepool_result.fetchall()
                    
                    # 카테고리별로 base_issue_pool 그룹화
                    issuepool_map = {}
                    for row in issuepool_rows:
                        cat_id = row.category_id
                        if cat_id not in issuepool_map:
                            issuepool_map[cat_id] = []
                        
                        issuepool_map[cat_id].append({
                            'id': row.id,
                            'base_issue_pool': row.base_issue_pool,
                            'issue_pool': row.issue_pool,
                            'ranking': row.ranking
                        })
                    
                    logger.warning(f"🔍 Base IssuePool 조회 완료: {len(issuepool_map)}개 카테고리")
                else:
                    issuepool_map = {}
                    logger.warning(f"⚠️ ESG 분류가 없어서 Base IssuePool 조회 건너뛰기")
                
                # 3. 결과 조합
                categories_map = {}
                
                for category_name, esg_info in esg_map.items():
                    category_id = esg_info['category_id']
                    base_issuepools = []
                    
                    # 해당 카테고리의 base_issue_pool 가져오기
                    if category_id in issuepool_map:
                        # 중복 제거를 위한 set 사용 (공백 포함한 정확한 일치)
                        seen_pools = set()
                        for issue in issuepool_map[category_id]:
                            # 공백을 포함한 문자 그대로 비교하여 중복 체크
                            pool_key = (issue['base_issue_pool'], issue['issue_pool'])
                            if pool_key not in seen_pools:
                                seen_pools.add(pool_key)
                                base_issue_pool = BaseIssuePool(
                                    id=issue['id'],
                                    base_issue_pool=issue['base_issue_pool'],
                                    issue_pool=issue['issue_pool'],
                                    ranking=issue['ranking'],
                                    esg_classification_id=esg_info['esg_classification_id']
                                )
                                base_issuepools.append(base_issue_pool)
                    
                    # CategoryDetailsResponse 생성
                    categories_map[category_name] = CategoryDetailsResponse(
                        category_id=str(category_id),  # 문자열로 변환
                        normalized_category_id=category_id,  # 정수 ID
                        esg_classification_id=esg_info['esg_classification_id'],
                        esg_classification_name=esg_info['esg_classification_name'],
                        base_issuepools=base_issuepools,
                        total_count=len(base_issuepools)  # total_count
                    )
                
                query_time = __import__('time').time() - start_time
                total_issuepools = sum(len(cat.base_issuepools) for cat in categories_map.values())
                
                logger.warning(f"✅ 배치 조회 완료: {len(categories_map)}개 카테고리, 총 {total_issuepools}개 base_issue_pool")
                logger.warning(f"⏱️ 전체 처리 시간: {query_time:.2f}초")
                
                return categories_map
                
        except Exception as e:
            logger.error(f"❌ 배치 카테고리 조회 실패: {str(e)}")
            import traceback
            logger.error(f"❌ 스택 트레이스: {traceback.format_exc()}")
            return {}