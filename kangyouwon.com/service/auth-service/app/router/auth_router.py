from fastapi import APIRouter, Cookie, HTTPException, Query, Request
from fastapi.responses import JSONResponse
import logging

# 로거 설정
logger = logging.getLogger(__name__)

from app.domain.user.user_schema import LoginRequest, SignupRequest
from app.domain.user.user_controller import user_controller

auth_router = APIRouter(prefix="/auth-service", tags=["Auth"])

@auth_router.post("/login", summary="로그인")
async def login_process(request: Request):
    logger.info("🔐 로그인 POST 요청 받음")
    try:
        form_data = await request.json()
        logger.info(f"로그인 시도: {form_data.get('auth_id', 'N/A')}")

        required_fields = ['auth_id', 'auth_pw']
        missing_fields = [f for f in required_fields if not form_data.get(f)]
        if missing_fields:
            logger.warning(f"필수 필드 누락: {missing_fields}")
            return {"success": False, "message": f"필수 필드가 누락되었습니다: {', '.join(missing_fields)}"}

        # JSON을 LoginRequest BaseModel로 변환
        try:
            login_request = LoginRequest(**form_data)
            logger.info(f"✅ 로그인 데이터 검증 성공: {login_request.auth_id}")
            
            # user_controller로 BaseModel 전달 (데이터베이스 연결 없음)
            result = await user_controller.login_user(login_request)
            return result
                
        except Exception as validation_error:
            logger.error(f"로그인 데이터 검증 실패: {validation_error}")
            return {"success": False, "message": f"입력 데이터가 올바르지 않습니다: {str(validation_error)}"}

    except Exception as e:
        logger.error(f"로그인 처리 중 오류: {str(e)}")
        return {"success": False, "message": f"로그인 처리 중 오류가 발생했습니다: {str(e)}"}

@auth_router.post("/signup", summary="회원가입")
async def signup_process(request: Request):
    logger.info("📝 회원가입 POST 요청 받음")
    try:
        form_data = await request.json()

        required_fields = ['company_id', 'industry', 'email', 'name', 'birth', 'auth_id', 'auth_pw']
        missing_fields = [f for f in required_fields if not form_data.get(f)]
        if missing_fields:
            logger.warning(f"필수 필드 누락: {missing_fields}")
            return {"success": False, "message": f"필수 필드가 누락되었습니다: {', '.join(missing_fields)}"}

        logger.info("=== 회원가입 요청 데이터 ===")
        logger.info(f"회사 ID: {form_data.get('company_id', 'N/A')}")
        logger.info(f"산업: {form_data.get('industry', 'N/A')}")
        logger.info(f"이메일: {form_data.get('email', 'N/A')}")
        logger.info(f"이름: {form_data.get('name', 'N/A')}")
        logger.info(f"생년월일: {form_data.get('birth', 'N/A')}")
        logger.info(f"인증 ID: {form_data.get('auth_id', 'N/A')}")
        logger.info(f"인증 비밀번호: [PROTECTED]")
        logger.info("==========================")

        # JSON을 SignupRequest BaseModel로 변환
        try:
            signup_request = SignupRequest(**form_data)
            logger.info(f"✅ 회원가입 데이터 검증 성공: {signup_request.email}")
            
            # user_controller로 BaseModel 전달 (데이터베이스 연결 없음)
            result = await user_controller.signup_user(signup_request)
            return result
            
        except Exception as validation_error:
            logger.error(f"회원가입 데이터 검증 실패: {validation_error}")
            return {"success": False, "message": f"입력 데이터가 올바르지 않습니다: {str(validation_error)}"}

    except Exception as e:
        logger.error(f"회원가입 처리 중 오류: {str(e)}")
        return {"회원가입": "실패", "오류": str(e)}

@auth_router.post("/logout", summary="로그아웃")
async def logout(session_token: str | None = Cookie(None)):
    """
    사용자를 로그아웃하고 인증 쿠키를 삭제합니다.
    """
    print(f"로그아웃 요청 - 받은 세션 토큰: {session_token}")
    
    # 로그아웃 응답 생성
    response = JSONResponse({
        "success": True,
        "message": "로그아웃되었습니다."
    })
    
    # 인증 쿠키 삭제
    response.delete_cookie(
        key="session_token",
        path="/",
        # domain 설정 제거 (로컬 환경)
    )
    
    print("✅ 로그아웃 완료 - 인증 쿠키 삭제됨")
    return response

@auth_router.get("/profile", summary="사용자 프로필 조회")
async def get_profile(session_token: str | None = Cookie(None)):
    """
    세션 토큰으로 사용자 프로필을 조회합니다.
    세션 토큰이 없거나 유효하지 않으면 401 에러를 반환합니다.
    """
    print(f"프로필 요청 - 받은 세션 토큰: {session_token}")
    
    if not session_token:
        raise HTTPException(status_code=401, detail="인증 쿠키가 없습니다.")
    try:

        return {
            "success": True,
            "message": "프로필 조회 기능은 준비 중입니다. (Google OAuth 비활성화)"
        }
    except Exception as e:
        print(f"프로필 조회 오류: {e}")
        raise HTTPException(status_code=401, detail=str(e))
