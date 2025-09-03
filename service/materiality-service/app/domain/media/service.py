# app/service/service.py

import os
import time
import random
import logging
import email.utils
import traceback
import re
import html
import io
import base64
from datetime import datetime, timezone, date, timedelta
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from functools import partial

import httpx
import pandas as pd
from app.domain.media.repository import MediaRepository

logger = logging.getLogger("materiality.service")

# ──────────────────────────────────────────────────────────────────────────────
# 작업 상태 관리 (메모리 기반)
# ──────────────────────────────────────────────────────────────────────────────

# 작업 상태를 저장할 메모리 딕셔너리
_job_status: Dict[str, Dict[str, Any]] = {}

def create_job_status(job_id: str, search_data: Dict[str, Any]) -> None:
    """작업 상태 초기화"""
    _job_status[job_id] = {
        "status": "running",
        "progress": 0,
        "message": "검색을 시작했습니다",
        "start_time": datetime.now().isoformat(),
        "search_data": search_data,
        "result": None,
        "error": None
    }

def update_job_status(job_id: str, **kwargs) -> None:
    """작업 상태 업데이트"""
    if job_id in _job_status:
        _job_status[job_id].update(kwargs)

def get_job_status(job_id: str) -> Optional[Dict[str, Any]]:
    """작업 상태 조회"""
    return _job_status.get(job_id)

def complete_job(job_id: str, result: Dict[str, Any]) -> None:
    """작업 완료 처리"""
    if job_id in _job_status:
        _job_status[job_id].update({
            "status": "completed",
            "progress": 100,
            "message": "검색이 완료되었습니다",
            "end_time": datetime.now().isoformat(),
            "result": result
        })

def fail_job(job_id: str, error: str) -> None:
    """작업 실패 처리"""
    if job_id in _job_status:
        _job_status[job_id].update({
            "status": "failed",
            "message": f"검색에 실패했습니다: {error}",
            "end_time": datetime.now().isoformat(),
            "error": error
        })

def cleanup_old_jobs() -> None:
    """오래된 작업 정리 (24시간 이상)"""
    current_time = datetime.now()
    jobs_to_remove = []
    
    for job_id, job_data in _job_status.items():
        if "start_time" in job_data:
            start_time = datetime.fromisoformat(job_data["start_time"])
            if (current_time - start_time).total_seconds() > 86400:  # 24시간
                jobs_to_remove.append(job_id)
    
    for job_id in jobs_to_remove:
        del _job_status[job_id]
        logger.info(f"오래된 작업 정리: {job_id}")

# 주기적으로 오래된 작업 정리
async def cleanup_scheduler():
    """정리 스케줄러"""
    while True:
        try:
            cleanup_old_jobs()
            await asyncio.sleep(3600)  # 1시간마다 실행
        except Exception as e:
            logger.error(f"작업 정리 중 오류: {e}")
            await asyncio.sleep(3600)

# ──────────────────────────────────────────────────────────────────────────────
# 카테고리 처리 및 검색 키워드 생성
# ──────────────────────────────────────────────────────────────────────────────

def process_materiality_categories(categories: List[Any]) -> Tuple[List[str], Dict[str, str]]:
    """materiality_category 데이터를 처리하여 슬래시로 분리하고 원본 카테고리와 매핑"""
    try:
        logger.info(f"🔍 process_materiality_categories 시작: {len(categories)}개 카테고리 입력")
        
        # 카테고리를 슬래시로 분리하여 개별 이슈로 만들기
        all_issues = []
        issue_to_category = {}  # 이슈 -> 원본 카테고리 매핑
        
        for i, category in enumerate(categories):
            # Pydantic BaseModel의 경우 getattr을 사용하거나 직접 속성에 접근
            try:
                category_name = getattr(category, 'category_name', None)
                if category_name:
                    # 슬래시(/)로 구분된 카테고리를 개별 이슈로 분리
                    issues = [issue.strip() for issue in category_name.split('/') if issue.strip()]
                    
                    for issue in issues:
                        all_issues.append(issue)
                        issue_to_category[issue] = category_name  # 각 이슈를 원본 카테고리와 매핑
                else:
                    logger.warning(f"    category_name이 비어있음: {category}")
            except Exception as attr_error:
                logger.error(f"    category_name 속성 접근 오류: {attr_error}")
                logger.error(f"    category 객체: {category}")
        
        # 중복 제거 및 정렬
        unique_issues = sorted(list(set(all_issues)))
        
        logger.info(f"✅ materiality_category에서 {len(categories)}개 카테고리를 가져와서 {len(unique_issues)}개 이슈로 분리했습니다.")
        logger.info(f"📋 이슈 목록: {unique_issues}")
        
        return unique_issues, issue_to_category
        
    except Exception as e:
        logger.error(f"❌ materiality_category 처리 실패: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        # 기본 이슈 반환
        default_issues = ["ESG", "지속가능성", "중대성"]
        default_mapping = {issue: issue for issue in default_issues}
        return default_issues, default_mapping

# ──────────────────────────────────────────────────────────────────────────────
# 네이버 뉴스 API 클라이언트 (동기)  — service에서 to_thread로 실행
# ──────────────────────────────────────────────────────────────────────────────

BASE_URL = "https://openapi.naver.com/v1/search/news.json"
MAX_DISPLAY = 100  # 네이버 API 최대값 유지
MAX_START_LIMIT = 500
JITTER_RANGE = (0.0001, 0.0002)  # 지터 범위를 줄여서 더 빠르게


class NaverNewsClient:
    def __init__(
        self,
        *,
        min_interval: float | None = None,
        per_keyword_pause: float | None = None,
        max_retries: int | None = None,
    ) -> None:
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        if not self.client_id or not self.client_secret:
            raise ValueError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경변수가 필요합니다.")

        self.min_interval = float(os.getenv("NAVER_API_MIN_INTERVAL", "0.4") if min_interval is None else min_interval)  # 0.8 → 0.4초로 단축
        self.per_keyword_pause = float(os.getenv("NAVER_API_PER_KEYWORD_PAUSE", "0.0") if per_keyword_pause is None else per_keyword_pause)  # 1.0 → 0.0초로 단축 (키워드 간 대기 제거)
        self.max_retries = int(os.getenv("NAVER_API_MAX_RETRIES", "3") if per_keyword_pause is None else per_keyword_pause)

        self._last_request_ts = 0.0

        self.session = httpx.Client()
        self.session.headers.update(
            {
                "X-Naver-Client-Id": self.client_id,
                "X-Naver-Client-Secret": self.client_secret,
                "User-Agent": "materiality-service/1.0",
            }
        )

    # 내부 유틸 (동기)
    def _throttle(self) -> None:
        elapsed = time.time() - self._last_request_ts
        wait = self.min_interval - elapsed
        if wait > 0:
            time.sleep(wait + random.uniform(*JITTER_RANGE))
        self._last_request_ts = time.time()

    def _request_with_retry(self, params: Dict[str, Any]) -> Dict[str, Any]:
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                self._throttle()
                resp = self.session.get(BASE_URL, params=params, timeout=10)
                
                # 429 처리: Retry-After 헤더 존중
                if resp.status_code == 429:
                    ra = resp.headers.get("Retry-After")
                    wait = float(ra) if ra and ra.isdigit() else (self.min_interval * (2 ** (attempt - 1)))
                    logger.warning("429 Too Many Requests → %.2fs 대기 후 재시도", wait)
                    time.sleep(wait + random.uniform(*JITTER_RANGE))
                    continue
                
                if 500 <= resp.status_code < 600:
                    raise httpx.HTTPStatusError(f"HTTP {resp.status_code}: {resp.text[:160]}")
                resp.raise_for_status()
                return resp.json()
            except httpx.RequestError as e:
                last_exc = e
                backoff = (self.min_interval * (2 ** (attempt - 1))) + random.uniform(*JITTER_RANGE)
                logger.warning("네이버 API 요청 실패(%s/%s): %s → %.2fs 후 재시도", attempt, self.max_retries, e, backoff)
                time.sleep(backoff)
        logger.error("네이버 뉴스 API 요청 실패(최대 재시도 초과): %s", last_exc)
        raise last_exc if last_exc else RuntimeError("Unknown request error")

    # 동기 API
    def search(self, keyword: str, *, display: int = MAX_DISPLAY, sort: str = "date", start: int = 1) -> Dict[str, Any]:
        return self._request_with_retry({"query": keyword, "display": display, "sort": sort, "start": start})

    def search_by_date_range(
        self,
        *,
        keyword: str,
        start_date: str,
        end_date: str,
        max_results: int = 300,
    ) -> Dict[str, Any]:
        """pubDate가 start_date~end_date 내인 기사만 수집 (동기)"""
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc) + timedelta(days=1)
        if start_dt > end_dt:
            raise ValueError("시작 날짜가 종료 날짜보다 늦습니다.")

        collected: List[Dict[str, Any]] = []
        start = 1
        display = MAX_DISPLAY

        while start <= max_results and len(collected) < max_results:
            data = self.search(keyword, display=display, sort="date", start=start)
            items = data.get("items", [])
            if not items:
                break

            for item in items:
                try:
                    pub_dt = email.utils.parsedate_to_datetime(item.get("pubDate", ""))
                except Exception:
                    continue
                if not pub_dt:
                    continue
                # 포함 범위: start <= pub_dt < end (종료일 하루 전체 포함)
                if start_dt <= pub_dt < end_dt:
                    origin = (item.get("originallink") or "").strip()
                    item["원본링크"] = origin
                    collected.append(item)

            start += display
            if start > MAX_START_LIMIT:
                break

        return {"total": len(collected), "items": collected[:max_results], "start_date": start_date, "end_date": end_date}

    # URL 정규화 (중복 제거용 키)
    @staticmethod
    def canonicalize_url(url: str) -> str:
        if not url:
            return ""
        try:
            p = urlparse(url.strip())
            netloc = p.netloc.lower()
            if netloc.startswith("www."):
                netloc = netloc[4:]
            drop_keys = {
                "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
                "gclid", "fbclid", "igshid", "mc_cid", "mc_eid", "ref"
            }
            q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if k not in drop_keys]
            path = p.path.rstrip("/")
            return urlunparse((p.scheme, netloc, path, "", urlencode(q, doseq=True), ""))
        except Exception:
            return url.strip()


# ──────────────────────────────────────────────────────────────────────────────
# 유틸: 카테고리 슬래시 분해 & 중복 제거
# ──────────────────────────────────────────────────────────────────────────────

def _split_category_tokens(raw: str | None) -> List[str]:
    """
    'A/B/C' 또는 'A／B｜C' 형태의 카테고리를 '/' 기준으로 분해하여 토큰 리스트 생성.
    공백 제거 및 빈 토큰 제거.
    """
    if not raw:
        return []
    s = str(raw).strip().replace("／", "/").replace("｜", "/")
    return [p.strip() for p in s.split("/") if p and p.strip()]


def _dedupe_by_issue_group_url(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    기존코드와 동일한 철학:
    - (company, issue_group, canonical_url) 단위로 중복 제거
    - issue_group 우선순위: issue_original > original_category > issue
    """
    seen: set[Tuple[str, str, str]] = set()
    out: List[Dict[str, Any]] = []

    for it in items:
        company = (it.get("company") or "").strip()

        # issue_group 결정: 기존코드의 issue_original이 있으면 그걸 쓰고,
        # 없으면 신규코드의 original_category, 그것도 없으면 issue를 사용
        issue_group = (
            (it.get("issue_original") or "").strip()
            or (it.get("original_category") or "").strip()
            or (it.get("issue") or "").strip()
        )

        url_raw = it.get("originallink") or it.get("원본링크") or ""
        url_key = NaverNewsClient.canonicalize_url(url_raw)

        key = (company, issue_group, url_key)
        if key in seen:
            continue
        seen.add(key)
        out.append(it)

    return out


# ──────────────────────────────────────────────────────────────────────────────
# 데이터 정제 함수들 (tuning.py 기반)
# ──────────────────────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    """HTML 태그 제거 및 엔티티 해제"""
    if not text or pd.isna(text):
        return ""
    s = str(text)
    s = re.sub(r'<\s*br\s*/?>', ' ', s, flags=re.I)  # <br> → 공백
    s = re.sub(r'<[^>]+>', '', s)   # 모든 태그 제거
    s = html.unescape(s)             # &quot; 등 엔티티 해제
    s = re.sub(r'\s+', ' ', s).strip()
    return s


def clean_pubdate(pubdate_str: str) -> str:
    """pubDate를 'Thu, 14 Aug 2025' 형태로 정제"""
    if not pubdate_str:
        return ""
    
    try:
        # RFC 2822 형식 파싱 (Thu, 14 Aug 2025 07:08:00 +0900)
        dt = email.utils.parsedate_to_datetime(pubdate_str)
        if dt:
            # 요일, 일, 월, 년도만 추출
            return dt.strftime("%a, %d %b %Y")
    except Exception:
        pass
    
    # 파싱 실패 시 원본 반환
    return str(pubdate_str)


def norm_plain(text: str) -> str:
    """일반 정규화(영문+한글)"""
    s = strip_html(text).lower()
    s = re.sub(r'[^가-힣a-z0-9]', '', s)
    return s


def has_triangle_then_company(desc: str, company: str) -> bool:
    """△/▲ 뒤에 회사명이 나오면 True (혼합표기 시 한글만 일치도 허용)"""
    # 2024-01-09: 기능 비활성화 (주가/재무 관련 기사 필터링으로 대체)
    return False
    
    # # 원본 로직: desc를 일반 문자열로 낮추고, company는 norm_plain 후
    # # r'[△▲][^△▲]*{회사명}' 매칭 시 제거
    # if not desc or not company:
    #     return False
    # 
    # d = strip_html(desc).lower()
    # comp_norm = norm_plain(company)
    # 
    # if not comp_norm:
    #     return False
    # 
    # # △/▲ 이후 회사명이 나오는지 확인
    # pattern = rf'[△▲][^△▲]*{re.escape(comp_norm)}'
    # return bool(re.search(pattern, d))


def filter_news_items(items: List[Dict[str, Any]], company: str) -> List[Dict[str, Any]]:
    """뉴스 아이템 필터링 및 정제"""
    if not items:
        return []
    
    filtered_items = []
    
    for item in items:
        # HTML 태그 제거
        if "title" in item:
            item["title"] = strip_html(item["title"])
        if "description" in item:
            item["description"] = strip_html(item["description"])
        
        # pubDate 정제
        if "pubDate" in item:
            item["pubDate"] = clean_pubdate(item["pubDate"])
        
        # △/▲ 뒤에 회사명이 나오는 기사 제외
        if has_triangle_then_company(item.get("description", ""), company):
            continue
        
        # 불용 키워드 기사 제외 (완화된 버전)
        # 너무 엄격한 필터링으로 인해 기사가 모두 제거되는 것을 방지
        keywords = ["주식", "주가", "매수", "매매", "테마주", "관련주", "주식시장", "인사", "부고", "기고", "주식", "상장", "부동산", "시세", "매도", "증자", "증시"]  # 정말 불필요한 것만 제외
        pattern = "|".join(keywords)
        
        title = item.get("title", "").lower()
        description = item.get("description", "").lower()
        
        # 제목과 내용 모두에 불용 키워드가 있는 경우만 제외
        if re.search(pattern, title) and re.search(pattern, description):
            continue
        
        filtered_items.append(item)
    
    return filtered_items


def _make_excel_bytes(items: List[Dict[str, Any]], company_id: str) -> Tuple[str, bytes]:
    """엑셀을 메모리에서 생성하여 바이트와 파일명 반환"""
    if not items:
        raise ValueError("엑셀 생성할 데이터가 없습니다")
    
    try:
        # DataFrame 생성 전 데이터 정리
        cleaned_items = []
        for item in items:
            cleaned_item = {}
            for key, value in item.items():
                # None 값과 빈 문자열 처리
                if value is None:
                    cleaned_item[key] = ""
                elif isinstance(value, (dict, list)):
                    cleaned_item[key] = str(value)
                else:
                    cleaned_item[key] = str(value).strip() if isinstance(value, str) else value
            cleaned_items.append(cleaned_item)
        
        # DataFrame 생성
        df = pd.DataFrame(cleaned_items)
        logger.info(f"📊 DataFrame 생성 완료: {df.shape[0]}행 x {df.shape[1]}열")
        
        # 컬럼 순서 정리
        columns_order = [
            'company', 'issue', 'original_category', 'query_kind', 'keyword',
            'title', 'description', 'pubDate', 'originallink'
        ]
        
        # 존재하는 컬럼만 선택
        existing_columns = [col for col in columns_order if col in df.columns]
        df_ordered = df[existing_columns]
        
        # NaN 값 처리
        df_ordered = df_ordered.fillna("")
        
        # 메모리에서 엑셀 생성
        buf = io.BytesIO()
        with pd.ExcelWriter(buf, engine="openpyxl") as writer:
            df_ordered.to_excel(writer, sheet_name="검색결과", index=False)
            
            # 워크시트 스타일링
            worksheet = writer.sheets["검색결과"]
            for column in worksheet.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                adjusted_width = min(max_length + 2, 50)
                worksheet.column_dimensions[column_letter].width = adjusted_width
        
        buf.seek(0)
        excel_bytes = buf.getvalue()
        
        # 파일명 생성
        timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"media_search_{company_id}_{timestamp_str}.xlsx"
        
        logger.info(f"✅ 메모리에서 엑셀 생성 완료: {filename} (크기: {len(excel_bytes)} bytes)")
        
        return filename, excel_bytes
        
    except Exception as e:
        logger.error(f"❌ 엑셀 생성 중 오류: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise


# ──────────────────────────────────────────────────────────────────────────────
# 서비스 엔트리포인트 (비동기)
# ──────────────────────────────────────────────────────────────────────────────

async def search_media(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    프론트에서 전달한 JSON(payload)을 받아, 회사×이슈 조합으로
    네이버 뉴스 API를 검색한 뒤 JSON 결과를 반환한다.

    반환 형식:
    {
        "success": True,
        "message": "...",
        "data": {
            "company_id": "...",
            "search_period": {"start_date": "...", "end_date": "..."},
            "search_type": "...",
            "total_results": int,
            "articles": [...],  # title, description, pubDate, originallink, 네이버링크, company, issue, keyword, query_kind
        },
        "timestamp": "...(요청에서 받은 값 그대로 반환)"
    }
    """
    # 요청 데이터 파싱
    company_id: str = payload.get("company_id") or payload.get("companyname") or ""
    if not company_id:
        raise ValueError("company_id 가 필요합니다.")

    rp: Dict[str, Any] = payload.get("report_period") or {}
    start_date: str = rp.get("start_date")
    if not start_date:
        raise ValueError("report_period.start_date 가 필요합니다.")

    # end_date는 프론트엔드에서 전달받은 값 우선, 없으면 '검색 당일'로 유동 적용
    end_date: str = rp.get("end_date") or date.today().isoformat()

    search_type: str = payload.get("search_type", "materiality_assessment")
    timestamp: Optional[str] = payload.get("timestamp")

    logger.info("🔍 매체검색: company_id=%s, start=%s, end=%s, type=%s", company_id, start_date, end_date, search_type)

    # materiality_category 테이블에서 카테고리 가져오기 (리포지토리 사용)
    try:
        repository = MediaRepository()
        # 동기 함수에서 비동기 리포지토리 호출을 위해 더 안전한 방식 사용
        import asyncio
        import concurrent.futures
        
        # 새 스레드에서 비동기 함수 실행
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, repository.get_all_materiality_categories())
            categories = future.result()
        
        # 카테고리 데이터 처리
        logger.info(f"🔍 DB에서 가져온 카테고리 데이터: {len(categories)}개")
        tokens, issue_to_category = process_materiality_categories(categories)
            
    except Exception as e:
        logger.error(f"❌ materiality_category 조회 실패: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        # 기본 토큰 사용
        tokens = ["ESG", "지속가능성", "중대성"]
        issue_to_category = {token: token for token in tokens}

    # 토큰이 없으면 회사명 단독 검색만 수행
    if not tokens:
        logger.warning("카테고리 토큰이 없어 회사명 단독 검색만 수행합니다. company=%s", company_id)

    # 네이버 API 클라이언트
    try:
        # 동기 클라이언트 초기화를 비동기로 실행
        import asyncio
        loop = asyncio.get_event_loop()
        client = await loop.run_in_executor(None, NaverNewsClient)
        logger.info("✅ NaverNewsClient 초기화 성공")
    except Exception as e:
        logger.error(f"❌ NaverNewsClient 초기화 실패: {str(e)}")
        logger.error(f"상세 오류: {traceback.format_exc()}")
        raise ValueError(f"네이버 API 클라이언트 초기화 실패: {str(e)}")

    # 질의 목록 구성: (회사명 + 토큰) + 회사명 단독
    queries: List[Dict[str, Any]] = []
    max_results_per_keyword = int(os.getenv("NAVER_MAX_RESULTS_PER_KEYWORD", "500"))  # 300 → 500으로 증가
    unique_company_max_results = int(os.getenv("NAVER_UNIQUE_COMPANY_MAX_RESULTS", "300"))  # 150 → 300으로 증가

    for tok in tokens:
        # 검색 키워드를 더 단순하게 구성
        keyword = f"{company_id} {tok}"
        queries.append(
            {
                "keyword": keyword,
                "company": company_id,
                "issue": tok,
                "query_kind": "company_issue",
                "max_results": max_results_per_keyword,
            }
        )

    # 회사명 단독 검색은 한 번만 추가 (이슈별 중복 제거)
    queries.append(
        {
            "keyword": company_id,
            "company": company_id,
            "issue": "",
            "query_kind": "company_only",
            "max_results": unique_company_max_results,
        }
    )

    # 실행
    all_items: List[Dict[str, Any]] = []
    
    # 병렬 처리를 위한 함수 정의
    async def run_one_search(q: Dict[str, Any]) -> List[Dict[str, Any]]:
        """단일 검색 실행"""
        kw = q["keyword"]
        company = q["company"]
        issue = q["issue"]
        query_kind = q["query_kind"]
        per_kw_limit = int(q["max_results"])
        
        logger.info("▶︎ 네이버 검색 시작 [%s]: %s (%s~%s, limit=%d)", query_kind, kw, start_date, end_date, per_kw_limit)
        
        try:
            # 동기 함수를 비동기로 실행
            result = await loop.run_in_executor(
                None,
                partial(
                    client.search_by_date_range,
                    keyword=kw,
                    start_date=start_date,
                    end_date=end_date,
                    max_results=per_kw_limit,
                ),
            )
            
            items = []
            for it in result.get("items", []):
                it["company"] = company
                it["issue"] = issue
                it["keyword"] = kw
                it["query_kind"] = query_kind
                # 원본 카테고리 정보 추가
                if issue in issue_to_category:
                    it["original_category"] = issue_to_category[issue]
                else:
                    it["original_category"] = issue
                items.append(it)
            
            return items
            
        except Exception as e:
            logger.error("검색 실패 [%s] %s: %s", query_kind, kw, e)
            return []
    
    # 동시 실행 개수 제한 (과도한 메모리/후처리 겹침 방지)
    max_concurrency = int(os.getenv("NAVER_KEYWORD_CONCURRENCY", "4"))
    semaphore = asyncio.Semaphore(max_concurrency)
    
    async def guarded_search(q: Dict[str, Any]) -> List[Dict[str, Any]]:
        """세마포어로 보호된 검색"""
        async with semaphore:
            return await run_one_search(q)
    
    # 모든 검색을 동시에 시작
    tasks = [asyncio.create_task(guarded_search(q)) for q in queries]
    
    # 완료된 순서대로 결과 수집
    for completed_task in asyncio.as_completed(tasks):
        try:
            items = await completed_task
            all_items.extend(items)
        except Exception as e:
            logger.error(f"검색 작업 실행 중 오류: {e}")

    if not all_items:
        logger.warning("수집된 뉴스가 없습니다. company=%s", company_id)
        logger.warning("🔍 검색된 기사가 0건입니다. 다음을 확인해보세요:")
        logger.warning("  1. 검색 키워드: %s", [q["keyword"] for q in queries])
        logger.warning("  2. 검색 기간: %s ~ %s", start_date, end_date)
        logger.warning("  3. 네이버 API 응답 확인 필요")
        logger.warning("  4. 네이버 API 키 설정 확인 필요")
        logger.warning("  5. 네이버 API 할당량 확인 필요")
    else:
        logger.info(f"✅ 네이버 API에서 총 {len(all_items)}건의 기사를 수집했습니다.")
        logger.info(f"📊 기사 샘플: {[item.get('title', '제목없음')[:30] for item in all_items[:3]]}")

    # URL 기준 중복 제거(기업 범위 내)
    try:
        all_items = _dedupe_by_issue_group_url(all_items)
        logger.info(f"✅ 중복 제거 완료: {len(all_items)}개 기사")
    except Exception as e:
        logger.warning("중복 제거 중 오류(무시하고 계속): %s", e)

    # 데이터 정제
    try:
        original_count = len(all_items)
        all_items = filter_news_items(all_items, company_id)
        filtered_count = len(all_items)
        logger.info(f"✅ 데이터 정제 완료: {original_count}개 → {filtered_count}개 기사")
    except Exception as e:
        logger.warning("데이터 정제 중 오류(무시하고 계속): %s", e)

    # 엑셀 생성 (메모리에서)
    excel_filename = None
    excel_base64 = None
    if all_items:
        try:
            # 동기 엑셀 생성 함수를 비동기로 실행
            import asyncio
            loop = asyncio.get_event_loop()
            filename, excel_bytes = await loop.run_in_executor(
                None, 
                _make_excel_bytes, 
                all_items, 
                company_id
            )
            excel_filename = filename
            excel_base64 = base64.b64encode(excel_bytes).decode("ascii")
            logger.info(f"✅ 엑셀 생성 완료: {filename} (Base64 길이: {len(excel_base64)})")
        except Exception as e:
            logger.error(f"❌ 엑셀 생성 중 오류: {str(e)}")
            logger.error(f"상세 오류: {traceback.format_exc()}")
            excel_filename = None
            excel_base64 = None

    response = {
        "success": True,
        "message": "미디어 검색 요청이 성공적으로 처리되었습니다",
        "data": {
            "company_id": company_id,
            "search_period": {"start_date": start_date, "end_date": end_date},
            "search_type": search_type,
            "total_results": len(all_items),
            "articles": all_items,  # 그대로 반환 (title/description/pubDate/originallink/네이버링크 등 포함)
        },
        "timestamp": timestamp,
        "excel_filename": excel_filename,
        "excel_base64": excel_base64
    }
    return response


async def search_media_background(job_id: str, payload: Dict[str, Any]) -> None:
    """백그라운드에서 미디어 검색 실행"""
    try:
        logger.info(f"🔄 백그라운드 검색 시작: {job_id}")
        update_job_status(job_id, message="카테고리 데이터를 조회하고 있습니다...", progress=10)
        
        # 기존 search_media 로직을 백그라운드에서 실행
        result = await search_media(payload)
        
        # 작업 완료 처리
        complete_job(job_id, result)
        logger.info(f"✅ 백그라운드 검색 완료: {job_id}")
        
    except Exception as e:
        logger.error(f"❌ 백그라운드 검색 실패: {job_id} - {str(e)}")
        fail_job(job_id, str(e))


async def start_media_search(payload: Dict[str, Any]) -> Dict[str, Any]:
    """미디어 검색 작업 시작 - 즉시 job_id 반환"""
    try:
        # 고유 작업 ID 생성
        job_id = str(uuid.uuid4())
        
        # 작업 상태 초기화
        create_job_status(job_id, payload)
        
        # 백그라운드에서 검색 실행
        asyncio.create_task(search_media_background(job_id, payload))
        
        logger.info(f"🚀 미디어 검색 작업 시작: {job_id}")
        
        return {
            "success": True,
            "message": "미디어 검색이 시작되었습니다",
            "job_id": job_id,
            "status": "started"
        }
        
    except Exception as e:
        logger.error(f"❌ 검색 작업 시작 실패: {str(e)}")
        return {
            "success": False,
            "message": f"검색 작업 시작에 실패했습니다: {str(e)}",
            "status": "failed"
        }


def get_search_status(job_id: str) -> Dict[str, Any]:
    """검색 작업 상태 조회"""
    try:
        job_status = get_job_status(job_id)
        
        if not job_status:
            return {
                "success": False,
                "message": "작업을 찾을 수 없습니다",
                "status": "not_found"
            }
        
        # 작업 상태에 따라 응답 구성
        response = {
            "success": True,
            "job_id": job_id,
            "status": job_status["status"],
            "message": job_status["message"],
            "progress": job_status.get("progress", 0),
            "start_time": job_status.get("start_time"),
            "end_time": job_status.get("end_time")
        }
        
        # 완료된 경우 결과 포함
        if job_status["status"] == "completed" and job_status.get("result"):
            response["result"] = job_status["result"]
        
        # 실패한 경우 오류 정보 포함
        if job_status["status"] == "failed" and job_status.get("error"):
            response["error"] = job_status["error"]
        
        return response
        
    except Exception as e:
        logger.error(f"❌ 작업 상태 조회 실패: {job_id} - {str(e)}")
        return {
            "success": False,
            "message": f"작업 상태 조회에 실패했습니다: {str(e)}",
            "status": "error"
        }
