from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User
from datetime import datetime
import hashlib
import logging

# 로거 설정 - auth_router 전용
logger = logging.getLogger("auth_router")
logger.setLevel(logging.INFO)

# 로거가 핸들러를 가지고 있는지 확인하고 없으면 추가
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

auth_router = APIRouter(prefix="/v1/auth", tags=["auth"])

# 비밀번호 해싱 함수
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# 비밀번호 검증 함수
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hash_password(plain_password) == hashed_password

@auth_router.post("/signup", summary="회원가입")
async def signup(request: dict, db: AsyncSession = Depends(get_db)):
    """
    사용자 회원가입을 처리합니다.
    """
    # 요청 시작 로그
    logger.info("🚀 === 회원가입 요청 시작 ===")
    logger.info(f"📅 요청 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"📊 요청 데이터: {request}")
    
    try:
        # 프론트엔드에서 보낸 데이터를 Docker 로그에 출력
        logger.info("📝 === 회원가입 데이터 상세 정보 ===")
        logger.info(f"🆔 ID: {request.get('id')}")
        logger.info(f"🏢 Company ID: {request.get('company_id')}")
        logger.info(f"🏭 Industry: {request.get('industry')}")
        logger.info(f"📧 Email: {request.get('email')}")
        logger.info(f"👤 Name: {request.get('name')}")
        logger.info(f"🎂 Age: {request.get('age')}")
        logger.info(f"🔑 Auth ID: {request.get('auth_id')}")
        logger.info(f"🔒 Auth PW: {request.get('auth_pw')} (해시 전)")
        logger.info("📝 === 회원가입 데이터 끝 ===")
        
        # 데이터베이스 연결 확인
        if not db:
            logger.warning("⚠️ Database not available, proceeding without database")
            logger.info("✅ 회원가입 완료 (데이터베이스 저장 안됨)")
            return {
                "success": True,
                "message": "회원가입이 완료되었습니다. (데이터베이스 저장 안됨)",
                "user_id": request.get('id') or "temp_id",
                "timestamp": datetime.now()
            }
        
        # 기존 사용자 확인
        logger.info("🔍 기존 사용자 확인 중...")
        from sqlalchemy import select
        result = await db.execute(select(User).filter(User.auth_id == request.get('auth_id')))
        existing_user = result.scalar_one_or_none()
        
        if existing_user:
            logger.warning(f"❌ 이미 존재하는 사용자: {request.get('auth_id')}")
            raise HTTPException(status_code=400, detail="이미 존재하는 사용자입니다.")
        
        logger.info("✅ 기존 사용자 없음 - 새 사용자 생성 가능")
        
        # 비밀번호 해싱
        logger.info("🔐 비밀번호 해싱 중...")
        hashed_password = hash_password(request.get('auth_pw'))
        logger.info(f"🔐 비밀번호 해시 완료: {hashed_password[:20]}...")
        
        # 새 사용자 생성
        logger.info("👤 새 사용자 객체 생성 중...")
        new_user = User(
            id=int(request.get('id')) if request.get('id') and request.get('id').isdigit() else None,
            company_id=request.get('company_id'),
            industry=request.get('industry'),
            email=request.get('email'),
            name=request.get('name'),
            age=request.get('age'),
            auth_id=request.get('auth_id'),
            auth_pw=hashed_password
        )
        
        logger.info(f"👤 사용자 객체 생성 완료: {new_user.auth_id}")
        
        # 데이터베이스에 저장
        logger.info("💾 데이터베이스에 사용자 저장 중...")
        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)
        
        logger.info(f"✅ 사용자 저장 완료! ID: {new_user.id}, Auth ID: {new_user.auth_id}")
        logger.info("🎉 === 회원가입 성공 완료 ===")
        
        return {
            "success": True,
            "message": "회원가입이 완료되었습니다.",
            "user_id": request.get('id'),
            "timestamp": datetime.now()
        }
    except HTTPException:
        logger.error("❌ HTTP 오류 발생 - 회원가입 실패")
        raise
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류 발생: {e}")
        logger.error(f"🔍 오류 타입: {type(e).__name__}")
        if db:
            logger.info("🔄 데이터베이스 롤백 시도...")
            await db.rollback()
            logger.info("✅ 롤백 완료")
        raise HTTPException(status_code=500, detail="회원가입 처리 중 오류가 발생했습니다.")

@auth_router.post("/login", summary="로그인")
async def login(request: dict, db: AsyncSession = Depends(get_db)):
    """
    사용자 로그인을 처리합니다.
    """
    # 요청 시작 로그
    logger.info("🚀 === 로그인 요청 시작 ===")
    logger.info(f"📅 요청 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"📊 요청 데이터: {request}")
    
    try:
        # 프론트엔드에서 보낸 데이터를 Docker 로그에 출력
        logger.info("📝 === 로그인 데이터 상세 정보 ===")
        logger.info(f"🔑 Auth ID: {request.get('auth_id')}")
        logger.info(f"🔒 Auth PW: {request.get('auth_pw')} (해시 전)")
        logger.info("📝 === 로그인 데이터 끝 ===")
        
        auth_id = request.get('auth_id')
        auth_pw = request.get('auth_pw')
        
        if not auth_id or not auth_pw:
            logger.warning("❌ 아이디 또는 비밀번호 누락")
            raise HTTPException(status_code=400, detail="아이디와 비밀번호를 입력해주세요.")
        
        logger.info(f"✅ 입력 데이터 검증 완료: Auth ID={auth_id}")
        
        # 데이터베이스 연결 확인
        if not db:
            logger.warning("⚠️ Database not available, proceeding without database")
            logger.info("✅ 로그인 완료 (데이터베이스 확인 안됨)")
            return {
                "success": True,
                "message": "로그인이 완료되었습니다. (데이터베이스 확인 안됨)",
                "user_id": "temp_user",
                "timestamp": datetime.now()
            }
        
        # 사용자 조회
        logger.info(f"🔍 사용자 조회 중: {auth_id}")
        from sqlalchemy import select
        result = await db.execute(select(User).filter(User.auth_id == auth_id))
        user = result.scalar_one_or_none()
        
        if not user:
            logger.warning(f"❌ 사용자를 찾을 수 없음: {auth_id}")
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        
        logger.info(f"✅ 사용자 발견: ID={user.id}, Auth ID={user.auth_id}")
        
        # 비밀번호 검증
        logger.info("🔐 비밀번호 검증 중...")
        if not verify_password(auth_pw, user.auth_pw):
            logger.warning(f"❌ 비밀번호 불일치: {auth_id}")
            raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다.")
        
        logger.info(f"✅ 비밀번호 검증 성공: {auth_id}")
        logger.info(f"🎉 로그인 성공! 사용자: {auth_id}")
        logger.info("🎉 === 로그인 성공 완료 ===")
        
        return {
            "success": True,
            "message": "로그인이 완료되었습니다.",
            "user_id": str(user.id),
            "timestamp": datetime.now()
        }
    except HTTPException:
        logger.error("❌ HTTP 오류 발생 - 로그인 실패")
        raise
    except Exception as e:
        logger.error(f"❌ 예상치 못한 오류 발생: {e}")
        logger.error(f"🔍 오류 타입: {type(e).__name__}")
        raise HTTPException(status_code=500, detail="로그인 처리 중 오류가 발생했습니다.")

@auth_router.get("/health", summary="헬스체크")
async def health_check():
    """
    서비스 헬스체크
    """
    logger.info("🏥 헬스체크 요청")
    from ..database import engine
    db_status = "connected" if engine else "disconnected"
    logger.info(f"🏥 헬스체크 결과: DB={db_status}")
    return {
        "status": "healthy",
        "service": "auth-service",
        "database": db_status,
        "timestamp": datetime.now().isoformat(),
        "version": "1.0.0"
    }