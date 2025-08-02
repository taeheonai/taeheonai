# TaeheonAI MSA 실행 스크립트
Write-Host "🚀 TaeheonAI MSA 시작 중..." -ForegroundColor Green

# 의존성 설치
Write-Host "📦 의존성 설치 중..." -ForegroundColor Yellow
pip install fastapi uvicorn httpx pydantic PyJWT

# 각 서비스를 별도 프로세스로 실행
Write-Host "🔧 서비스 실행 중..." -ForegroundColor Yellow

# Gateway 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd gateway; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

# 잠시 대기
Start-Sleep -Seconds 2

# User Service 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/user-service; python -m uvicorn main:app --host 0.0.0.0 --port 8001 --reload" -WindowStyle Normal

# 잠시 대기
Start-Sleep -Seconds 2

# Auth Service 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/auth-service; python -m uvicorn main:app --host 0.0.0.0 --port 8002 --reload" -WindowStyle Normal

# 잠시 대기
Start-Sleep -Seconds 2

# Notification Service 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd services/notification-service; python -m uvicorn main:app --host 0.0.0.0 --port 8003 --reload" -WindowStyle Normal

Write-Host "✅ 모든 서비스가 실행되었습니다!" -ForegroundColor Green
Write-Host "🌐 Gateway: http://localhost:8000" -ForegroundColor Cyan
Write-Host "👥 User Service: http://localhost:8001" -ForegroundColor Cyan
Write-Host "🔐 Auth Service: http://localhost:8002" -ForegroundColor Cyan
Write-Host "📢 Notification Service: http://localhost:8003" -ForegroundColor Cyan
Write-Host "🎨 Frontend: http://localhost:3000" -ForegroundColor Cyan 