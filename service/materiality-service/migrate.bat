@echo off
REM Database Migration Script for Materiality Service
REM Adds content_hash column to surveys table

echo 🚀 Materiality Service Database Migration
echo ==========================================

REM Check if we're in the right directory
if not exist "migrations\run_migration.py" (
    echo ❌ migrations\run_migration.py 파일을 찾을 수 없습니다.
    echo    service\materiality-service 디렉토리에서 실행해주세요.
    pause
    exit /b 1
)

REM Check if DATABASE_URL is set
if "%DATABASE_URL%"=="" (
    echo ❌ DATABASE_URL 환경변수가 설정되지 않았습니다.
    echo    .env 파일을 확인하거나 환경변수를 설정해주세요.
    pause
    exit /b 1
)

echo 📋 현재 surveys 테이블 구조 확인...
python migrations\run_migration.py --check

echo.
echo 🔧 content_hash 컬럼 추가 마이그레이션 실행...
python migrations\run_migration.py --migrate

if %errorlevel% equ 0 (
    echo.
    echo ✅ 마이그레이션 완료!
    echo 📋 업데이트된 테이블 구조 확인...
    python migrations\run_migration.py --check
) else (
    echo.
    echo ❌ 마이그레이션 실패!
    pause
    exit /b 1
)

pause
