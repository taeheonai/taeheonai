"""
네이버 뉴스 API 크롤러 (날짜필터 + 쓰로틀/백오프 + 학습데이터 엑셀 생성)
"""
import os
import time
import random
import logging
import email.utils
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional
from itertools import product
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode 

import requests
import pandas as pd
from dotenv import load_dotenv

# .env 로드 (서비스 루트가 따로 있다면 여기에 경로 지정)
load_dotenv()

# ── 로거 ────────────────────────────────────────────────────────────────────────
logger = logging.getLogger("naver-news")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

# ── 상수 ────────────────────────────────────────────────────────────────────────
BASE_URL = "https://openapi.naver.com/v1/search/news.json"
MAX_DISPLAY = 100           # 네이버 API 최대 display
MAX_START_LIMIT = 1000      # 네이버 API start 최대 한도
JITTER_RANGE = (0.05, 0.25) # 지터 범위(초)


class NaverNewsCrawler:
    """네이버 뉴스 API 크롤러"""

    def __init__(
        self,
        min_interval: float = None,
        per_keyword_pause: float = None,
        max_retries: int = None,
    ):
        self.client_id = os.getenv("NAVER_CLIENT_ID")
        self.client_secret = os.getenv("NAVER_CLIENT_SECRET")
        if not self.client_id or not self.client_secret:
            raise ValueError("NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 이(가) 없습니다.")

        # 요청 간 최소 간격/키워드 간 간격/재시도
        self.min_interval = float(os.getenv("NAVER_API_MIN_INTERVAL", "1.2") if min_interval is None else min_interval)
        self.per_keyword_pause = float(os.getenv("NAVER_API_PER_KEYWORD_PAUSE", "2.0") if per_keyword_pause is None else per_keyword_pause)
        self.max_retries = int(os.getenv("NAVER_API_MAX_RETRIES", "3") if max_retries is None else max_retries)

        self._last_request_ts = 0.0

        # 세션
        self.session = requests.Session()
        self.session.headers.update({
            "X-Naver-Client-Id": self.client_id,
            "X-Naver-Client-Secret": self.client_secret,
            "User-Agent": "materiality-service/1.0",
        })

    # ── 내부 유틸 ───────────────────────────────────────────────────────────────
    def _throttle(self) -> None:
        """요청 간 최소 간격 + 지터"""
        elapsed = time.time() - self._last_request_ts
        wait = self.min_interval - elapsed
        if wait > 0:
            time.sleep(wait + random.uniform(*JITTER_RANGE))
        self._last_request_ts = time.time()

    def _request_with_retry(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """재시도/백오프 래퍼"""
        last_exc: Optional[Exception] = None
        for attempt in range(1, self.max_retries + 1):
            try:
                self._throttle()
                resp = self.session.get(BASE_URL, params=params, timeout=10)
                if resp.status_code == 429 or 500 <= resp.status_code < 600:
                    raise requests.HTTPError(f"HTTP {resp.status_code}: {resp.text[:160]}")
                resp.raise_for_status()
                return resp.json()
            except requests.RequestException as e:
                last_exc = e
                backoff = (self.min_interval * (2 ** (attempt - 1))) + random.uniform(*JITTER_RANGE)
                logger.warning("요청 실패(%s/%s): %s → %.2fs 대기 후 재시도", attempt, self.max_retries, e, backoff)
                time.sleep(backoff)
        logger.error("네이버 뉴스 API 요청 실패(최대 재시도 초과): %s", last_exc)
        raise last_exc if last_exc else RuntimeError("Unknown request error")

    # ── API ────────────────────────────────────────────────────────────────────
    def search_news(self, keyword: str, display: int = 5, sort: str = "date", start: int = 1) -> Dict[str, Any]:
        return self._request_with_retry({"query": keyword, "display": display, "sort": sort, "start": start})

    def search_news_by_date_range(
        self,
        keyword: str,
        start_date: str,
        end_date: str,
        max_results: int = 100,
    ) -> Dict[str, Any]:
        """pubDate가 start_date~end_date 내인 기사만 수집"""
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        if start_dt > end_dt:
            raise ValueError("시작 날짜가 종료 날짜보다 늦습니다.")

        collected: List[Dict[str, Any]] = []
        start = 1
        display = MAX_DISPLAY

        while start <= max_results and len(collected) < max_results:
            result = self.search_news(keyword, display=display, start=start, sort="date")
            items = result.get("items", [])
            if not items:
                break

            for item in items:
                try:
                    pub_dt = email.utils.parsedate_to_datetime(item["pubDate"])
                except Exception:
                    continue
                if start_dt <= pub_dt <= end_dt:
                    # 링크 정규화(필요시 활용). 최종 저장 컬럼에는 포함하지 않음.
                    origin = item.get("originallink", "")
                    link = item.get("link", "")
                    item["네이버링크"] = link if ("n.news.naver.com" in (link or "")) else ""
                    item["원본링크"] = origin
                    collected.append(item)

            start += display
            if start > MAX_START_LIMIT:
                break

        return {"total": len(collected), "items": collected[:max_results], "start_date": start_date, "end_date": end_date}

    # ── 저장 헬퍼 ───────────────────────────────────────────────────────────────
    @staticmethod
    def _auto_fit_columns(ws) -> None:
        for column in ws.columns:
            max_len = 0
            col_letter = column[0].column_letter
            for cell in column:
                v = "" if cell.value is None else str(cell.value)
                if len(v) > max_len:
                    max_len = len(v)
            ws.column_dimensions[col_letter].width = min(max_len + 2, 50)

    def save_to_excel(self, data: Dict[str, Any], filename: str = "naver_news_results.xlsx") -> str:
        """단일 검색결과를 엑셀로 저장 (신규 스타일)"""
        items = data.get("items", [])
        if not items:
            logger.warning("저장할 뉴스 데이터가 없습니다.")
            return ""

        df = pd.DataFrame(items)

        # 신규코드 스타일 컬럼 정렬
        export_order = [
            "company", "issue", "original_category", "query_kind", "keyword",
            "title", "description", "pubDate", "originallink"
        ]

        # original_category 없으면 issue_original로 매핑
        if "original_category" not in df.columns:
            if "issue_original" in df.columns:
                def pick_original_category(x):
                    if not isinstance(x, str) or not x.strip():
                        return ""
                    parts = [p.strip() for p in x.split(";") if p.strip()]
                    return parts[0] if parts else x.strip()
                df["original_category"] = df["issue_original"].apply(pick_original_category)
            else:
                df["original_category"] = ""

        # 누락 컬럼 보정
        for c in export_order:
            if c not in df.columns:
                df[c] = ""

        df = df[export_order + [c for c in df.columns if c not in export_order]]

        xlsx_path = Path.cwd() / filename
        with pd.ExcelWriter(xlsx_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="검색결과", index=False)
            self._auto_fit_columns(writer.sheets["검색결과"])

        logger.info("엑셀 저장 완료(신규 스타일): %s", xlsx_path)
        return str(xlsx_path)


    def _canonicalize_url(self, url: str) -> str:
        """URL 비교용 정규화: 호스트 소문자/`www.` 제거, trailing slash 제거,
        utm/gclid/fbclid 등 트래킹 파라미터 제거, fragment 제거."""
        if not url or (isinstance(url, float) and pd.isna(url)):
            return ""
        try:
            s = str(url).strip()
            if not s:
                return ""
            p = urlparse(s)
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
            # URL이 엉망이면 그냥 문자열로 반환
            return str(url).strip() if isinstance(url, str) else ""


    def build_training_dataset(
        self,
        excel_path: str,
        output_file: str = "2024년 중대성평가 목록 기반 뉴스데이터(전수검색).xlsx",
        start_date: str = "2024-01-01",
        end_date: str = "2024-12-31",
        max_results_per_keyword: int = 1000,
        *,
        search_unique_companies: bool = True,
        unique_company_max_results: int = 300,
        deduplicate: bool = True,
    ) -> str:
        """
        전수검색:
        - 엑셀의 '기업명'과 '중대성평가 목록'을 사용
        - '중대성평가 목록'을 '/' 기준으로 분리하여 전역 토큰 집합 생성
        - 모든 기업 × 모든 전역 토큰으로 질의 생성 (query_kind='company_issue_all')
        - 각 결과행에 issue(토큰) + issue_original(토큰이 포함된 원문들의 세미콜론 결합) 보존
        - 저장 전, 같은 issue_original 그룹 내에서 URL(정규화 키) 기준 중복 제거
        """
        import pandas as pd
        from pathlib import Path

        # ── 0) 입력 로드/검증 ───────────────────────────────────────────────
        seed_df = pd.read_excel(excel_path)
        if "기업명" not in seed_df.columns or "중대성평가 목록" not in seed_df.columns:
            raise ValueError("엑셀에 '기업명'과 '중대성평가 목록' 컬럼이 있어야 합니다.")

        # 기업명 유니크 리스트
        unique_companies = (
            seed_df["기업명"]
            .dropna().astype(str).str.strip()
            .replace("", pd.NA).dropna()
            .drop_duplicates().tolist()
        )

        # ── 1) 전역 토큰 집합 및 토큰→원문 매핑 ─────────────────────────────
        def split_issues(raw: str):
            # 전각/유사 구분자는 필요 시 여기서 추가 정규화
            s = str(raw).strip().replace("／", "/").replace("｜", "/")
            if not s:
                return []
            parts = [p.strip() for p in s.split("/") if p and p.strip()]
            return parts if parts else [s]

        token_to_originals = {}  # Dict[str, set[str]]
        # 이 버전은 사용자가 정정해준 엑셀 구조(단일 '중대성평가 목록' 컬럼)를 가정
        for _, r in seed_df.iterrows():
            val = str(r.get("중대성평가 목록", "")).strip()
            if not val or val.lower() == "nan":
                continue
            for tok in split_issues(val):
                token_to_originals.setdefault(tok, set()).add(val)

        unique_tokens = sorted(token_to_originals.keys())

        if not unique_companies or not unique_tokens:
            logger.warning("기업 또는 토큰이 비어 있습니다. 기업 수=%d, 토큰 수=%d",
                        len(unique_companies), len(unique_tokens))
            return ""

        logger.info("전수검색 질의 생성: 기업 %d × 토큰 %d = %d",
                    len(unique_companies), len(unique_tokens),
                    len(unique_companies) * len(unique_tokens))

        # ── 2) 질의 목록 생성 (회사 × 전역 토큰) ────────────────────────────
        queries = []
        for company in unique_companies:
            for tok in unique_tokens:
                queries.append({
                    "keyword": f"{company} {tok}",
                    "company": company,
                    "issue": tok,  # 실제 검색 토큰
                    "issue_original": "; ".join(sorted(token_to_originals.get(tok, []))),  # 토큰이 포함된 원문(들)
                    "query_kind": "company_issue_all",
                    "max_results": str(max_results_per_keyword),
                })

        # 기업명 단독 검색(옵션)
        if search_unique_companies:
            for company in unique_companies:
                queries.append({
                    "keyword": company,
                    "company": company,
                    "issue": "",
                    "issue_original": "",
                    "query_kind": "company_only",
                    "max_results": str(unique_company_max_results),
                })

        # ── 3) 수집 실행 ────────────────────────────────────────────────────
        all_items: List[Dict[str, Any]] = []
        for q in queries:
            keyword = q["keyword"]
            company = q["company"]
            issue = q["issue"]
            issue_original = q.get("issue_original", "")
            query_kind = q["query_kind"]
            per_kw_limit = int(q["max_results"])

            logger.info("검색 시작 [%s]: %s", query_kind, keyword)
            try:
                result = self.search_news_by_date_range(
                    keyword=keyword,
                    start_date=start_date,
                    end_date=end_date,
                    max_results=per_kw_limit,
                )
                for it in result.get("items", []):
                    it["company"] = company
                    it["issue"] = issue
                    it["issue_original"] = issue_original
                    it["keyword"] = keyword
                    it["query_kind"] = query_kind
                    all_items.append(it)

                # 키워드 간 간격
                time.sleep(max(0.0, self.per_keyword_pause) + random.uniform(*JITTER_RANGE))
            except Exception as e:
                logger.error("검색 실패 [%s]: %s (%s)", query_kind, keyword, e)

        if not all_items:
            logger.warning("수집된 뉴스가 없습니다.")
            return ""

        # ── 4) DF 구성 + (옵션) URL 중복 제거(issue_original 그룹 내) ────────
        df = pd.DataFrame(all_items)

        # 링크 후보 컬럼 보정
        for c in ["originallink", "원본링크"]:
            if c not in df.columns:
                df[c] = ""

        if deduplicate:
            df["__url_raw"] = df["originallink"]
            df.loc[df["__url_raw"].isna() | (df["__url_raw"] == ""), "__url_raw"] = df["원본링크"]

            # 클래스 메서드로 정규화
            df["__url_key"] = df["__url_raw"].astype(str).map(self._canonicalize_url)

            before = len(df)
            df = df.drop_duplicates(subset=["company", "issue_original", "__url_key"], keep="first")
            removed = before - len(df)
            if removed > 0:
                logger.info("URL 기준 중복 제거(기업 × 이슈 범위 내): %d건 제거됨", removed)


            df = df.drop(columns=["__url_raw", "__url_key"], errors="ignore")

        # ── 5) 컬럼 정리 & 저장 ──────────────────────────────────────────────
        # 신규코드 컬럼 순서에 맞춰 정렬/매핑
        export_order = [
            "company", "issue", "original_category", "query_kind", "keyword",
            "title", "description", "pubDate", "originallink"
        ]

        # 필요한 원본 컬럼 보정
        for c in ["title", "description", "originallink", "pubDate", "company", "issue", "keyword", "query_kind"]:
            if c not in df.columns:
                df[c] = ""

        # 신규코드엔 original_category가 있고, 기존코드는 issue_original이 있으므로 매핑
        if "original_category" not in df.columns:
            # issue_original이 있으면 그중 첫 항목(세미콜론 분리) 또는 전체 문자열을 사용
            if "issue_original" in df.columns:
                def pick_original_category(x):
                    if not isinstance(x, str) or not x.strip():
                        return ""
                    parts = [p.strip() for p in x.split(";") if p.strip()]
                    return parts[0] if parts else x.strip()
                df["original_category"] = df["issue_original"].apply(pick_original_category)
            else:
                df["original_category"] = ""

        # export_order에 없는 컬럼은 뒤에 유지(필요 시 참고용)
        existing_export = [c for c in export_order if c in df.columns]
        remaining = [c for c in df.columns if c not in existing_export]
        df = df[existing_export + remaining]

        # 저장
        save_path = Path.cwd() / output_file
        with pd.ExcelWriter(save_path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="뉴스데이터", index=False)
            self._auto_fit_columns(writer.sheets["뉴스데이터"])

        logger.info("전체 뉴스 데이터 저장 완료: %s (행수: %d)", save_path, len(df))
        return str(save_path)
