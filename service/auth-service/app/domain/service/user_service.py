import logging
from fastapi import HTTPException
from typing import Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from app.domain.schema.user_schema import SignupIn, LoginIn
from app.domain.repository.user_repository import UserRepository
from app.common.corporation_client import CorporationClient
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class UserService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repository = UserRepository(db)

    async def signup(self, signup_data: SignupIn) -> Dict[str, Any]:
        """
        사용자 회원가입을 처리합니다.
        """
        try:
            # 사용자 중복 체크
            if await self.user_repository.check_user_exists(signup_data.auth_id):
                raise HTTPException(
                    status_code=400, 
                    detail="이미 존재하는 사용자입니다."
                )

            # 기업 ID 검증 (corporation-service와 통신)
            if signup_data.corporation_id:
                async with CorporationClient() as client:
                    is_valid = await client.validate_corporation_exists(signup_data.corporation_id)
                    if not is_valid:
                        raise HTTPException(
                            status_code=400,
                            detail="유효하지 않은 기업 ID입니다."
                        )
            else:
                raise HTTPException(
                    status_code=400,
                    detail="기업 ID는 필수입니다."
                )

            # UserRepository를 통한 사용자 생성 (BaseModel → Entity 변환)
            user_entity = await self.user_repository.create_user(signup_data)

            return {
                "success": True,
                "message": "회원가입이 완료되었습니다.",
                "user_id": str(user_entity.id),
                "auth_id": user_entity.auth_id,
                "corporation_id": signup_data.corporation_id,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"회원가입 처리 중 오류가 발생했습니다: {str(e)}"
            )

    async def login(self, login_data: LoginIn) -> Dict[str, Any]:
        """
        사용자 로그인을 처리합니다.
        """
        try:
            # UserRepository를 통한 사용자 인증
            user_entity = await self.user_repository.authenticate_user(login_data)
            
            if not user_entity:
                raise HTTPException(
                    status_code=401, 
                    detail="아이디 또는 비밀번호가 올바르지 않습니다."
                )

            # 기업 정보 조회
            companyname = None
            if user_entity.corporation_id:
                try:
                    async with CorporationClient() as client:
                        # 기업 정보 조회
                        corporation_info = await client.get_corporation_by_id(user_entity.corporation_id)
                        
                        # 다양한 키 케이스 허용
                        if corporation_info and isinstance(corporation_info, dict):
                            companyname = (
                                corporation_info.get("corporation_name")
                                or corporation_info.get("companyname")
                                or corporation_info.get("company_name")
                                or None
                            )
                        else:
                            # 기업 정보가 없으면 validate 엔드포인트로 재시도
                            is_valid = await client.validate_corporation_exists(user_entity.corporation_id)
                            if is_valid:
                                companyname = f"기업 {user_entity.corporation_id}"
                            else:
                                companyname = None
                except Exception as e:
                    # 어떤 경우에도 여기서 죽지 않게
                    try:
                        logger.exception("기업 정보 조회 실패")
                    except Exception:
                        print(f"[WARN] 기업 정보 조회 실패: {e}")
                    companyname = None

            return {
                "success": True,
                "message": "로그인이 완료되었습니다.",
                "id": str(user_entity.id),
                "name": user_entity.name,
                "auth_id": user_entity.auth_id,
                "email": user_entity.email,
                "corporation_id": user_entity.corporation_id,
                "companyname": companyname,  # ✅ DB 컬럼명과 일치
                "timestamp": datetime.now(timezone.utc).isoformat()
            }

        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500, 
                detail=f"로그인 처리 중 오류가 발생했습니다: {str(e)}"
            )
