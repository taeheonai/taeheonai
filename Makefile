.PHONY: help dev build start stop clean logs test lint

help: ## 도움말 보기
	@echo "TaeheonAI Backend 개발 도구"
	@echo "=========================="
	@echo ""
	@echo "사용법: make [명령어]"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / { printf "  %-15s %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

dev: ## 개발 환경 시작 (Backend 서비스들)
	docker-compose up -d

build: ## 전체 서비스 빌드
	docker-compose build

start: ## 프로덕션 환경 시작
	docker-compose -f docker-compose.prod.yml up -d

stop: ## 모든 서비스 중지
	docker-compose down

clean: ## 모든 컨테이너와 볼륨 삭제
	docker-compose down -v --remove-orphans

logs: ## 전체 로그 보기
	docker-compose logs -f

logs-gateway: ## 게이트웨이 로그 보기
	docker-compose logs -f gateway

logs-user: ## 사용자 서비스 로그 보기
	docker-compose logs -f user-service

logs-auth: ## 인증 서비스 로그 보기
	docker-compose logs -f auth-service

logs-notification: ## 알림 서비스 로그 보기
	docker-compose logs -f notification-service

test: ## 테스트 실행
	@echo "🧪 Running tests..."
	pytest

test-gateway: ## 게이트웨이 테스트 실행
	@echo "🧪 Running gateway tests..."
	pytest gateway/tests/

test-auth: ## 인증 서비스 테스트 실행
	@echo "🧪 Running auth service tests..."
	pytest services/auth-service/tests/

test-user: ## 사용자 서비스 테스트 실행
	@echo "🧪 Running user service tests..."
	pytest services/user-service/tests/

test-notification: ## 알림 서비스 테스트 실행
	@echo "🧪 Running notification service tests..."
	pytest services/notification-service/tests/

test-coverage: ## 테스트 커버리지 실행
	@echo "🧪 Running tests with coverage..."
	pytest --cov=. --cov-report=html --cov-report=term

status: ## 서비스 상태 확인
	docker-compose ps

health: ## 서비스 헬스 체크
	@echo "🔍 Checking service health..."
	@curl -f http://localhost:8000/health || echo "❌ Gateway not responding"
	@curl -f http://localhost:8001/health || echo "❌ User service not responding"
	@curl -f http://localhost:8002/health || echo "❌ Auth service not responding"
	@curl -f http://localhost:8003/health || echo "❌ Notification service not responding" 