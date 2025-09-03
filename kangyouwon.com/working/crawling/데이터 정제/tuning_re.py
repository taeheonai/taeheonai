# -*- coding: utf-8 -*-
import re
import html
import pandas as pd
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
from email.utils import parsedate_to_datetime
from datetime import timezone

# ──────────────────────────────────────────────
# HTML 태그 제거 및 엔티티 해제
def strip_html(text: str) -> str:
    if text is None or (isinstance(text, float) and pd.isna(text)):
        return ""
    s = str(text)
    s = re.sub(r'<\s*br\s*/?>', ' ', s, flags=re.I)  # <br> → 공백
    s = re.sub(r'<[^>]+>', '', s)                   # 모든 태그 제거
    s = html.unescape(s)                            # &quot; 등 엔티티 해제
    s = re.sub(r'\s+', ' ', s).strip()
    return s

# 일반 정규화(영문+한글)
def norm_plain(text: str) -> str:
    s = strip_html(text).lower()
    s = re.sub(r'[^가-힣a-z0-9]', '', s)
    return s

# pubDate → "Thu, 14 Aug 2025" 같은 가독성 문자열(표시용) — 필요 시 사용 가능
def clean_pubdate(pubdate_str: str) -> str:
    if not pubdate_str or (isinstance(pubdate_str, float) and pd.isna(pubdate_str)):
        return ""
    try:
        dt = parsedate_to_datetime(str(pubdate_str))
        if dt:
            return dt.strftime("%a, %d %b %Y")
    except Exception:
        pass
    return str(pubdate_str)

# URL 정규화(중복 제거용 키)
def canonicalize_url(url: str) -> str:
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
        return str(url).strip() if isinstance(url, str) else ""

# △/▲ 뒤 회사명 필터 — 실제 동작 비활성화(요청 반영)
def has_triangle_then_company(desc: str, company: str) -> bool:
    return False

# 기존코드의 pubDate 초강력 파서(UTC Timestamp 반환) — recent_score 계산용
def robust_parse_pubdate(x):
    if x is None or (isinstance(x, float) and pd.isna(x)) or (isinstance(x, str) and x.strip() == ""):
        return pd.NaT
    if isinstance(x, pd.Timestamp):
        return x.tz_localize("UTC") if x.tzinfo is None else x.tz_convert("UTC")
    if isinstance(x, (int, float)) and not pd.isna(x):
        v = float(x)
        try:
            if v > 1e11:  # epoch ms
                return pd.to_datetime(int(v), unit="ms", utc=True)
            if v > 1e9:   # epoch s
                return pd.to_datetime(int(v), unit="s", utc=True)
            if 20000 < v < 60000:  # excel serial
                return pd.to_datetime(v, unit="D", origin="1899-12-30", utc=True)
        except Exception:
            pass
    s = str(x).strip()
    s = re.sub(r'\b(KST|JST|GMT\+9|GMT\+09:00)\b', '+0900', s, flags=re.I)
    ts = pd.to_datetime(s, errors="coerce", utc=True)
    if not pd.isna(ts):
        return ts
    try:
        dt = parsedate_to_datetime(s)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return pd.Timestamp(dt).tz_convert("UTC")
    except Exception:
        return pd.NaT

# ──────────────────────────────────────────────
if __name__ == "__main__":
    # 입력 파일
    file_path = "../media_crawling/2023,2022년 중대성평가 목록 기반 뉴스데이터(전수검색).xlsx"
    df = pd.read_excel(file_path)

    # ── (1) 컬럼명 매핑(한글 → 영문) ───────────────────────────────────────
    RENAME_MAP = {
        "기업명": "company",
        "이슈": "issue",
        "원본 카테고리": "original_category",
        "쿼리종류": "query_kind",
        "키워드": "keyword",
        "제목": "title",
        "요약": "description",
        "발행일": "pubDate",
        "원본링크": "originallink",
    }
    for k, v in RENAME_MAP.items():
        if k in df.columns and v not in df.columns:
            df = df.rename(columns={k: v})

    # ── (2) 텍스트 정제 ────────────────────────────────────────────────────
    for col in ["title", "description"]:
        if col in df.columns:
            df[col] = df[col].apply(strip_html)
    if "company" in df.columns:
        df["company"] = df["company"].apply(strip_html)

    # ── (3) △/▲→회사명 패턴 기사 제거(비활성) ─────────────────────────────
    if {"description", "company"}.issubset(df.columns):
        mask_drop = df.apply(lambda r: has_triangle_then_company(r.get("description", ""), r.get("company", "")), axis=1)
        df = df[~mask_drop].copy()

    # ── (4) 불용 키워드 필터(완화: 제목·본문 모두 포함 시 제외) ─────────────
    stop_keywords = ["주식", "주가", "매수", "매매", "테마주", "관련주", "주식시장", "인사", "부고", "기고", "주식", "상장", "부동산", "시세", "매도", "증자", "증시"]
    stop_pattern = "|".join(map(re.escape, stop_keywords))
    title_has_stop = df["title"].str.contains(stop_pattern, case=False, na=False) if "title" in df.columns else pd.Series(False, index=df.index)
    desc_has_stop  = df["description"].str.contains(stop_pattern, case=False, na=False) if "description" in df.columns else pd.Series(False, index=df.index)
    df = df[~(title_has_stop & desc_has_stop)].copy()

    # ── (5) pubDate 파싱 → recent_score 계산용 UTC 타임스탬프 ───────────────
    df["pub_dt_utc"] = df.get("pubDate", pd.Series([None]*len(df))).apply(robust_parse_pubdate)

    # 기준일: 데이터셋 내 최댓값(없으면 오늘 KST 00:00)
    latest = df["pub_dt_utc"].max()
    if pd.isna(latest):
        reference_date = pd.Timestamp.now(tz="Asia/Seoul").normalize()
    else:
        reference_date = latest.tz_convert("Asia/Seoul")
    ref_utc = reference_date.tz_convert("UTC")

    delta_days = (ref_utc - df["pub_dt_utc"]).dt.days
    # recent_score 초기화 및 부여(3개월/6개월)
    if "recent_score" not in df.columns:
        df["recent_score"] = ""
    df.loc[delta_days.notna() & (delta_days <= 92), "recent_score"] = "++"
    df.loc[delta_days.notna() & (92 < delta_days) & (delta_days <= 183), "recent_score"] = "+"

    # ── (6) news_score 계산(기존코드 방식) ─────────────────────────────────
    if "news_score" not in df.columns:
        df["news_score"] = ""
    else:
        df["news_score"] = df["news_score"].fillna("").astype(str)

    if "title" in df.columns and "company" in df.columns:
        title_norm = df["title"].apply(lambda x: re.sub(r'[^가-힣a-z0-9]', '', strip_html(str(x)).lower()))
        company_norm = df["company"].apply(lambda x: re.sub(r'[^가-힣a-z0-9]', '', strip_html(str(x)).lower()))
        mask_title_contains_company = df.apply(
            lambda r: (r.get("company", "") != "") and (company_norm.loc[r.name] in title_norm.loc[r.name]),
            axis=1
        )
        df.loc[mask_title_contains_company, "news_score"] = "++"

    # ── (7) URL canonicalization + (company, canonical_url) 중복 제거 ──────
    url_col_candidates = [c for c in ["originallink", "원본링크", "link", "url"] if c in df.columns]
    if url_col_candidates:
        url_col = url_col_candidates[0]
        cano_col = "_canonical_url"
        df[cano_col] = df[url_col].apply(canonicalize_url)

        comp_col = "company" if "company" in df.columns else None
        if comp_col:
            df = df.drop_duplicates(subset=[comp_col, cano_col], keep="first").copy()
        else:
            df = df.drop_duplicates(subset=[cano_col], keep="first").copy()
        df = df.drop(columns=[cano_col], errors="ignore")

    # ── (8) service.py 스키마 9개 + news_score, recent_score 맞추기 ────────
    SERVICE_COLUMNS = [
        "company", "issue", "original_category", "query_kind", "keyword",
        "title", "description", "pubDate", "originallink",
    ]

    # originallink 보정
    if "originallink" not in df.columns and "원본링크" in df.columns:
        df["originallink"] = df["원본링크"]
    if "originallink" not in df.columns:
        df["originallink"] = ""

    # original_category 보정: issue_original > original_category(기존) > issue
    def _first_nonempty(*vals):
        for v in vals:
            if isinstance(v, str) and v.strip():
                return v.strip()
        return ""

    if "original_category" not in df.columns:
        src1 = df["issue_original"] if "issue_original" in df.columns else ""
        src2 = df["original_category"] if "original_category" in df.columns else ""
        src3 = df["issue"] if "issue" in df.columns else ""
        df["original_category"] = [
            _first_nonempty(
                src1[i] if isinstance(src1, pd.Series) else "",
                src2[i] if isinstance(src2, pd.Series) else "",
                src3[i] if isinstance(src3, pd.Series) else ""
            )
            for i in range(len(df))
        ]

    # 누락된 기본 9개 생성
    for col in SERVICE_COLUMNS:
        if col not in df.columns:
            df[col] = ""

    # score 칼럼 보장
    for col in ["news_score", "recent_score"]:
        if col not in df.columns:
            df[col] = ""

    # 최종 순서: service 9개 + scores 2개
    final_order = SERVICE_COLUMNS + ["news_score", "recent_score"]
    df = df[final_order]

    # 임시 계산용 컬럼 제거
    df = df.drop(columns=["pub_dt_utc"], errors="ignore")

    # ── (9) 저장 ───────────────────────────────────────────────────────────
    output_path = "뉴스데이터_신규정제_결과_with_scores.xlsx"
    with pd.ExcelWriter(output_path, engine="openpyxl") as writer:
        df.to_excel(writer, sheet_name="검색결과", index=False)
    print(f"✅ 완료: {output_path}  (rows={len(df)})")
