from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional, Tuple
from app.domain.entity.corporation_entity import Corporation

class CorporationRepository:
    """기업 정보 데이터 접근 계층"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, corporation_id: int) -> Optional[Corporation]:
        """ID로 기업 정보 조회"""
        try:
            result = await self.db.execute(
                select(Corporation).where(Corporation.id == corporation_id)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            raise Exception(f"기업 정보 조회 실패: {str(e)}")
    
    async def get_by_corp_code(self, corp_code: str) -> Optional[Corporation]:
        """기업 코드로 기업 정보 조회"""
        try:
            result = await self.db.execute(
                select(Corporation).where(Corporation.corp_code == corp_code)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            raise Exception(f"기업 코드로 조회 실패: {str(e)}")
    
    async def get_by_name(self, companyname: str) -> Optional[Corporation]:
        """기업명으로 기업 정보 조회"""
        try:
            result = await self.db.execute(
                select(Corporation).where(Corporation.companyname == companyname)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            raise Exception(f"기업명으로 조회 실패: {str(e)}")
    
    async def search_by_name(self, query: str, limit: int = 20) -> List[Corporation]:
        """기업명으로 부분 검색"""
        try:
            from sqlalchemy import or_
            result = await self.db.execute(
                select(Corporation)
                .where(or_(
                    Corporation.companyname.ilike(f"%{query}%"),
                    Corporation.industry.ilike(f"%{query}%") if Corporation.industry else False
                ))
                .limit(limit)
                .order_by(Corporation.companyname)
            )
            return result.scalars().all()
        except Exception as e:
            raise Exception(f"기업 검색 실패: {str(e)}")
    
    async def create(self, corporation: Corporation) -> Corporation:
        """기업 정보 생성"""
        try:
            self.db.add(corporation)
            await self.db.commit()
            await self.db.refresh(corporation)
            return corporation
        except Exception as e:
            await self.db.rollback()
            raise Exception(f"기업 정보 생성 실패: {str(e)}")
    
    async def update(self, corporation_id: int, update_data: dict) -> Optional[Corporation]:
        """기업 정보 수정"""
        try:
            corporation = await self.get_by_id(corporation_id)
            if not corporation:
                return None
            
            for key, value in update_data.items():
                if hasattr(corporation, key):
                    setattr(corporation, key, value)
            
            await self.db.commit()
            await self.db.refresh(corporation)
            return corporation
        except Exception as e:
            await self.db.rollback()
            raise Exception(f"기업 정보 수정 실패: {str(e)}")
    
    async def delete(self, corporation_id: int) -> bool:
        """기업 정보 삭제"""
        try:
            corporation = await self.get_by_id(corporation_id)
            if not corporation:
                return False
            
            await self.db.delete(corporation)
            await self.db.commit()
            return True
        except Exception as e:
            await self.db.rollback()
            raise Exception(f"기업 정보 삭제 실패: {str(e)}")
    
    async def create_if_not_exists(self, companyname: str, corp_code: str, industry: str = None) -> int:
        """기업이 없으면 생성하고 ID 반환"""
        try:
            # 기존 기업 확인
            existing = await self.get_by_name(companyname)
            if existing:
                return existing.id
            
            # 새 기업 생성
            new_corporation = Corporation(
                companyname=companyname, 
                corp_code=corp_code,
                industry=industry
            )
            created = await self.create(new_corporation)
            return created.id
            
        except Exception as e:
            raise Exception(f"기업 생성/조회 실패: {str(e)}")
    
    async def get_all(self, skip: int = 0, limit: int = 100) -> Tuple[List[Corporation], int]:
        """모든 기업 정보 조회 (페이징 포함)"""
        try:
            # 전체 개수 조회
            count_result = await self.db.execute(select(func.count(Corporation.id)))
            total = count_result.scalar()
            
            # 데이터 조회
            result = await self.db.execute(
                select(Corporation)
                .offset(skip)
                .limit(limit)
                .order_by(Corporation.companyname)
            )
            corporation = result.scalars().all()
            
            return corporation, total
        except Exception as e:
            raise Exception(f"기업 목록 조회 실패: {str(e)}")
