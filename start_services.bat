@echo off
echo 🚀 TaeheonAI MSA 서비스 관리자
echo =================================

:menu
echo.
echo 선택하세요:
echo 1. 모든 서비스 시작
echo 2. 모든 서비스 중지
echo 3. 서비스 상태 확인
echo 4. Python 통합 관리자 실행
echo 5. 종료
echo.

set /p choice="선택 (1-5): "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto stop_all
if "%choice%"=="3" goto check_status
if "%choice%"=="4" goto run_manager
if "%choice%"=="5" goto exit
echo 잘못된 선택입니다.
goto menu

:start_all
echo 🚀 모든 서비스 시작 중...
start "Gateway" cmd /k "cd gateway && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 2 /nobreak >nul
start "User Service" cmd /k "cd services/user-service && python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 2 /nobreak >nul
start "Auth Service" cmd /k "cd services/auth-service && python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload"
timeout /t 2 /nobreak >nul
start "Notification Service" cmd /k "cd services/notification-service && python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload"
echo ✅ 모든 서비스가 시작되었습니다!
echo 🌐 Gateway: http://localhost:8000
echo 👥 User Service: http://localhost:8001
echo 🔐 Auth Service: http://localhost:8002
echo 📢 Notification Service: http://localhost:8003
pause
goto menu

:stop_all
echo 🛑 모든 서비스 중지 중...
taskkill /f /im python.exe 2>nul
echo ✅ 모든 서비스가 중지되었습니다!
pause
goto menu

:check_status
echo 📊 서비스 상태 확인 중...
netstat -an | findstr :800
echo.
echo 포트 8000-8003이 LISTENING 상태면 서비스가 실행 중입니다.
pause
goto menu

:run_manager
echo 🐍 Python 통합 관리자 실행 중...
python manage_services.py
goto menu

:exit
echo 👋 종료합니다...
exit 