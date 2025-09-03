"""
User Service - 사용자 관련 모든 서비스 통합
BaseModel을 받아서 Repository로 전달하는 중간 계층
데이터베이스 연결은 하지 않음
"""
import hashlib
import logging
from app.domain.user.user_entity import UserEntity as User
from app.domain.user.user_repository import UserRepository
from app.domain.user.user_schema import LoginRequest, SignupRequest

logger = logging.getLogger("user_service")

class UserService:
    """사용자 서비스 - BaseModel을 Repository로 전달하는 중간 계층 (DB 연결 없음)"""
    
    def __init__(self):
        self.user_repository = UserRepository()
    
    async def authenticate_user(self, login_data: LoginRequest) -> dict:
        """사용자 인증 (로그인) - BaseModel을 Repository로 전달"""
        try:
            logger.info(f"🔐 서비스: 로그인 요청을 Repository로 전달 - {login_data.auth_id}")
            
            # BaseModel을 Repository로 전달 (데이터베이스 연결 없음)
            user = await self.user_repository.find_by_auth_id(login_data.auth_id)
            
            if not user:
                logger.warning(f"❌ 서비스: 존재하지 않는 인증 ID - {login_data.auth_id}")
                return {"success": False, "message": "존재하지 않는 인증 ID입니다."}

            # 비밀번호 해시화하여 비교
            hashed_password = hashlib.sha256(login_data.auth_pw.encode()).hexdigest()

            if user.auth_pw != hashed_password:
                logger.warning(f"❌ 서비스: 비밀번호 불일치 - {login_data.auth_id}")
                return {"success": False, "message": "비밀번호가 일치하지 않습니다."}

            logger.info(f"✅ 서비스: 로그인 성공 - {user.email} (ID: {user.id})")
            return {
                "success": True,
                "message": "로그인이 완료되었습니다.",
                "user_id": user.id,
                "email": user.email,
                "name": user.name,
                "company_id": user.company_id
            }
        except Exception as e:
            logger.error(f"❌ 서비스: 로그인 처리 중 오류 - {str(e)}")
            return {"success": False, "message": f"로그인 처리 중 오류가 발생했습니다: {str(e)}"}

    async def create_user(self, signup_data: SignupRequest) -> dict:
        """새 사용자 생성 (회원가입) - BaseModel을 Repository로 전달"""
        try:
            logger.info(f"📝 서비스: 회원가입 요청을 Repository로 전달 - {signup_data.email}")
            
            # 이메일 중복 확인 - Repository 호출 (데이터베이스 연결 없음)
            existing_email_user = await self.user_repository.find_by_email(signup_data.email)
            if existing_email_user:
                logger.warning(f"❌ 서비스: 이미 존재하는 이메일 - {signup_data.email}")
                return {
                    "success": False,
                    "message": "이미 존재하는 이메일입니다."
                }
            
            # 인증 ID 중복 확인 - Repository 호출 (데이터베이스 연결 없음)
            existing_auth_user = await self.user_repository.find_by_auth_id(signup_data.auth_id)
            if existing_auth_user:
                logger.warning(f"❌ 서비스: 이미 존재하는 인증 ID - {signup_data.auth_id}")
                return {
                    "success": False,
                    "message": "이미 존재하는 인증 ID입니다."
                }
            
            # 비밀번호 해시화 (SHA256)
            hashed_password = hashlib.sha256(signup_data.auth_pw.encode()).hexdigest()
            
            # BaseModel을 dict로 변환하여 Repository로 전달
            user_data = {
                'company_id': signup_data.company_id,
                'industry': signup_data.industry,
                'email': signup_data.email,
                'name': signup_data.name,
                'birth': signup_data.birth,
                'auth_id': signup_data.auth_id,
                'auth_pw': hashed_password
            }
            
            # Repository를 통해 사용자 생성 (데이터베이스 연결 없음)
            new_user = await self.user_repository.create_user(user_data)
            
            logger.info(f"✅ 서비스: 새 사용자 생성 완료 - {new_user.email} (ID: {new_user.id})")
            
            return {
                "success": True,
                "message": "회원가입이 완료되었습니다.",
                "user_id": new_user.id,
                "email": new_user.email
            }
            
        except Exception as e:
            logger.error(f"❌ 서비스: 사용자 생성 중 오류 - {str(e)}")
            return {
                "success": False,
                "message": f"회원가입 처리 중 오류가 발생했습니다: {str(e)}"
            }
    
    async def get_user_profile(self, user_id: int):
        """사용자 프로필 조회 - Repository 호출 (데이터베이스 연결 없음)"""
        try:
            logger.info(f"👤 서비스: 프로필 조회 요청을 Repository로 전달 - ID: {user_id}")
            
            # Repository를 통해 사용자 조회 (데이터베이스 연결 없음)
            user = await self.user_repository.find_by_id(user_id)
            
            if user:
                return {
                    "success": True,
                    "message": "프로필 조회 성공",
                    "user": {
                        "id": user.id,
                        "email": user.email,
                        "name": user.name,
                        "company_id": user.company_id,
                        "industry": user.industry,
                        "birth": user.birth
                    }
                }
            else:
                return {"success": False, "message": "사용자를 찾을 수 없습니다."}
                
        except Exception as e:
            logger.error(f"❌ 서비스: 프로필 조회 중 오류 - {str(e)}")
            return {"success": False, "message": f"프로필 조회 중 오류가 발생했습니다: {str(e)}"}
