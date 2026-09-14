// 설문 API(`/v1/materiality/surveys/...`)의 corporation_id는 corporation 테이블의 숫자 PK다.
// 로그인 정보에는 아직 기업명만 있고 corporation_id가 없어서, 현재는 단일 기업(1)으로 고정한다.
// auth가 corporation_id를 싣기 시작하면 이 함수 본문만 교체하면 된다.
export function getCorporationId(): string {
  return '1';
}
