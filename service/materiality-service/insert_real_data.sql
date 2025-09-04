-- 실제 issuepool 데이터 삽입
-- 이미지에서 보신 실제 데이터를 삽입합니다.

-- 기존 더미 데이터 삭제 (선택사항)
-- DELETE FROM issuepool WHERE corporation_id = 1;

-- 실제 데이터 삽입
INSERT INTO issuepool (id, corporation_id, publish_year, ranking, base_issue_pool, issue_pool, category_id, esg_classification_id) VALUES
(1, 103, 2022, 1, '고용 및 노사관계', '고용및노사관계', 1, 1),
(2, 103, 2022, 2, '인재경영', '인재경영', 17, 1),
(3, 103, 2022, 3, '기후변화 대응', '기후변화대응', 3, 4),
(4, 103, 2022, 4, '친환경 투자', '친환경투자', 25, 4),
(5, 103, 2022, 5, '안전보건', '안전보건', 10, 1),
(6, 103, 2022, 6, '공급망 관리', '공급망관리', 2, 1),
(7, 103, 2022, 7, '경제성과', '경제성과', 9, 3),
(8, 103, 2022, 8, '고객만족', '고객만족', 23, 1),
(9, 103, 2023, 1, '고객만족 및 품질 향상', '고객만족및품질향상', 23, 1),
(10, 103, 2023, 2, '지속가능한 공급망 관리', '지속가능한공급망관리', 2, 1);

-- 데이터 확인
SELECT * FROM issuepool WHERE corporation_id = 103 ORDER BY publish_year, ranking;
