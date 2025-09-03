"""
User Repository - BaseModel을 받아서 데이터베이스 작업을 수행하는 계층
데이터베이스 연결을 담당하며, BaseModel과 Entity 간의 변환을 처리
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.domain.user.user_schema import SignupRequest, LoginRequest
from app.domain.user.user_entity import UserEntity
from app.common.database.database import get_db
import logging

logger = logging.getLogger(__name__)

class UserRepository:
    """사용자 리포지토리 - BaseModel을 받아서 데이터베이스 작업 수행"""
    
    def __init__(self):
        pass
    
    async def find_by_email(self, email: str):
        """이메일로 사용자 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: 이메일로 사용자 조회 - {email}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(UserEntity).where(UserEntity.email == email)
                result = await db.execute(query)
                user_entity = result.scalar_one_or_none()
                
                if user_entity:
                    # Entity를 BaseModel로 변환하여 반환
                    user_model = SignupRequest(
                        company_id=user_entity.company_id,
                        industry=user_entity.industry,
                        email=user_entity.email,
                        name=user_entity.name,
                        birth=user_entity.birth,
                        auth_id=user_entity.auth_id,
                        auth_pw=user_entity.auth_pw
                    )
                    logger.info(f"✅ 리포지토리: 사용자 조회 성공 - {email}")
                    return user_model
                else:
                    logger.info(f"❌ 리포지토리: 사용자 없음 - {email}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 이메일 조회 중 오류 - {str(e)}")
            raise
    
    async def find_by_auth_id(self, auth_id: str):
        """인증 ID로 사용자 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: 인증 ID로 사용자 조회 - {auth_id}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(UserEntity).where(UserEntity.auth_id == auth_id)
                result = await db.execute(query)
                user_entity = result.scalar_one_or_none()
                
                if user_entity:
                    # Entity를 BaseModel로 변환하여 반환
                    user_model = SignupRequest(
                        id=user_entity.id,
                        company_id=user_entity.company_id,
                        industry=user_entity.industry,
                        email=user_entity.email,
                        name=user_entity.name,
                        birth=user_entity.birth,
                        auth_id=user_entity.auth_id,
                        auth_pw=user_entity.auth_pw
                    )
                    logger.info(f"✅ 리포지토리: 사용자 조회 성공 - {auth_id}")
                    return user_model
                else:
                    logger.info(f"❌ 리포지토리: 사용자 없음 - {auth_id}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: 인증 ID 조회 중 오류 - {str(e)}")
            raise
    
    async def find_by_id(self, user_id: int):
        """사용자 ID로 사용자 조회 - BaseModel 반환"""
        try:
            logger.info(f"🔍 리포지토리: ID로 사용자 조회 - {user_id}")
            
            # 데이터베이스 연결
            async for db in get_db():
                query = select(UserEntity).where(UserEntity.id == user_id)
                result = await db.execute(query)
                user_entity = result.scalar_one_or_none()
                
                if user_entity:
                    # Entity를 BaseModel로 변환하여 반환
                    user_model = SignupRequest(
                        id=user_entity.id,
                        company_id=user_entity.company_id,
                        industry=user_entity.industry,
                        email=user_entity.email,
                        name=user_entity.name,
                        birth=user_entity.birth,
                        auth_id=user_entity.auth_id,
                        auth_pw=user_entity.auth_pw
                    )
                    logger.info(f"✅ 리포지토리: 사용자 조회 성공 - ID: {user_id}")
                    return user_model
                else:
                    logger.info(f"❌ 리포지토리: 사용자 없음 - ID: {user_id}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ 리포지토리: ID 조회 중 오류 - {str(e)}")
            raise
    
    async def create_user(self, user_data: dict):
        """새 사용자 생성 - dict를 받아서 Entity로 변환 후 데이터베이스에 저장"""
        try:
            logger.info(f"📝 리포지토리: 새 사용자 생성 - {user_data.get('email', 'N/A')}")
            
            # 데이터베이스 연결
            async for db in get_db():
                # dict를 Entity로 변환
                new_user_entity = UserEntity(
                    company_id=user_data['company_id'],
                    industry=user_data['industry'],
                    email=user_data['email'],
                    name=user_data['name'],
                    birth=user_data['birth'],
                    auth_id=user_data['auth_id'],
                    auth_pw=user_data['auth_pw']
                )
                
                # 데이터베이스에 저장
                db.add(new_user_entity)
                await db.commit()
                await db.refresh(new_user_entity)
                
                logger.info(f"✅ 리포지토리: 사용자 생성 완료 - {new_user_entity.email} (ID: {new_user_entity.id})")
                
                # 생성된 Entity를 BaseModel로 변환하여 반환
                user_model = SignupRequest(
                    id=new_user_entity.id,
                    company_id=new_user_entity.company_id,
                    industry=new_user_entity.industry,
                    email=new_user_entity.email,
                    name=new_user_entity.name,
                    birth=new_user_entity.birth,
                    auth_id=new_user_entity.auth_id,
                    auth_pw=new_user_entity.auth_pw
                )
                return user_model
                
        except Exception as e:
            logger.error(f"❌ 리포지토리: 사용자 생성 중 오류 - {str(e)}")
            # 롤백 처리
            try:
                async for db in get_db():
                    await db.rollback()
            except:
                pass
            raise
