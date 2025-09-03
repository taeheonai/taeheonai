"""
User Controller - MVC 구조에서 BaseModel을 UserService로 전달하는 컨트롤러
데이터베이스 연결은 하지 않고, Service를 거쳐 Repository까지 BaseModel을 전달
"""
import logging
from app.domain.user.user_service import UserService
from app.domain.user.user_schema import LoginRequest, SignupRequest

logger = logging.getLogger(__name__)

class UserController:
    """사용자 컨트롤러 - MVC 구조에서 BaseModel을 Service로 전달"""
    
    def __init__(self):
        self.user_service = UserService()
    
    async def login_user(self, login_data: LoginRequest):
        """
        로그인 BaseModel을 UserService로 전달
        
        Args:
            login_data: LoginRequest BaseModel
        """
        try:
            logger.info(f"🔐 컨트롤러: 로그인 요청을 Service로 전달 - {login_data.auth_id}")
            
            # BaseModel을 Service로 전달 (데이터베이스 연결 없음)
            result = await self.user_service.authenticate_user(login_data)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

    async def signup_user(self, signup_data: SignupRequest):
        """
        회원가입 BaseModel을 UserService로 전달
        
        Args:
            signup_data: SignupRequest BaseModel
        """
        try:
            logger.info(f"📝 컨트롤러: 회원가입 요청을 Service로 전달 - {signup_data.email}")
            
            # BaseModel을 Service로 전달 (데이터베이스 연결 없음)
            result = await self.user_service.create_user(signup_data)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
            
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

    async def get_user_profile(self, user_id: int):
        """
        사용자 프로필 조회 요청을 UserService로 전달
        
        Args:
            user_id: 사용자 ID
        """
        try:
            logger.info(f"👤 컨트롤러: 프로필 조회 요청을 Service로 전달 - ID: {user_id}")
            
            # Service로 전달 (데이터베이스 연결 없음)
            result = await self.user_service.get_user_profile(user_id)
            
            logger.info(f"✅ 컨트롤러: Service 응답 수신 - {result.get('success', False)}")
            return result
                
        except Exception as e:
            logger.error(f"❌ 컨트롤러: Service 호출 중 오류 - {str(e)}")
            raise

# 컨트롤러 인스턴스 생성
user_controller = UserController()
