#!/bin/bash

# 설문 이메일 발송 API 테스트
echo "=== 설문 이메일 발송 API 테스트 ==="

# 로컬 서버 테스트
echo "1. 로컬 서버 테스트 (localhost:8002)"
curl -i -X POST http://localhost:8002/api/v1/materiality-service/email/send-survey \
  -H "Content-Type: application/json" \
  -d '{
    "to_emails": ["test@example.com"],
    "survey_url": "https://www.kangyouwon.com/survey?id=test123",
    "survey_title": "중대성 평가 설문",
    "deadline": "2024-12-31",
    "personalized_emails": [
      {
        "email": "test@example.com",
        "name": "김철수",
        "body": "김철수님께,\n\n안녕하세요. ESG 중대성 평가 설문에 참여 부탁드립니다.\n\n• 설문 링크: https://www.kangyouwon.com/survey?id=test123\n• 응답 마감: 2024-12-31\n\n※ 메일을 전송받은 이메일로 응답하실 수 있습니다.\n바쁘시겠지만 소중한 의견 부탁드립니다. 감사합니다."
      }
    ],
    "company_id": "test_company_001"
  }'

echo -e "\n\n=== Gateway를 통한 테스트 (localhost:8080) ==="

# Gateway를 통한 테스트
curl -i -X POST http://localhost:8080/api/v1/materiality-service/email/send-survey \
  -H "Content-Type: application/json" \
  -d '{
    "to_emails": ["test@example.com"],
    "survey_url": "https://www.kangyouwon.com/survey?id=test123",
    "survey_title": "중대성 평가 설문",
    "deadline": "2024-12-31",
    "personalized_emails": [
      {
        "email": "test@example.com",
        "name": "김철수",
        "body": "김철수님께,\n\n안녕하세요. ESG 중대성 평가 설문에 참여 부탁드립니다.\n\n• 설문 링크: https://www.kangyouwon.com/survey?id=test123\n• 응답 마감: 2024-12-31\n\n※ 메일을 전송받은 이메일로 응답하실 수 있습니다.\n바쁘시겠지만 소중한 의견 부탁드립니다. 감사합니다."
      }
    ],
    "company_id": "test_company_001"
  }'

echo -e "\n\n=== 잘못된 데이터로 422 오류 테스트 ==="

# 잘못된 데이터로 422 오류 테스트
curl -i -X POST http://localhost:8002/api/v1/materiality-service/email/send-survey \
  -H "Content-Type: application/json" \
  -d '{
    "to_emails": ["invalid-email"],
    "survey_url": "not-a-url",
    "company_name": "test_company"
  }'
