# -*- coding: utf-8 -*-
import re
import pandas as pd
from html import unescape
from email.utils import parsedate_to_datetime
from datetime import timezone

# ──────────────────────────────────────────────
# HTML 태그 제거 및 엔티티 해제
def strip_html(text: str) -> str:
    if pd.isna(text):
        return ""
    s = str(text)
    s = re.sub(r'<\s*br\s*/?>', ' ', s, flags=re.I)  # <br> → 공백
    s = re.sub(r'<[^>]+>', '', s)   # 모든 태그 제거
    s = unescape(s)                 # &quot; 등 엔티티 해제
    s = re.sub(r'\s+', ' ', s).strip()
    return s

# △/▲ 기호는 남기고 정규화
def norm_keep_triangles(text: str) -> str:
    s = strip_html(text).lower()
    s = re.sub(r'[^가-힣a-z0-9△▲]', '', s)
    return s

# 일반 정규화(영문+한글)
def norm_plain(text: str) -> str:
    s = strip_html(text).lower()
    s = re.sub(r'[^가-힣a-z0-9]', '', s)
    return s

# 한글만 추출
def korean_only(text: str) -> str:
    s = strip_html(text).lower()
    return re.sub(r'[^가-힣]', '', s)

# △/▲ 뒤에 회사명이 나오면 True (혼합표기 시 한글만 일치도 허용)
def has_triangle_then_company(desc: str, company: str) -> bool:
    d = norm_keep_triangles(desc)
    comp_norm = norm_plain(company)
    comp_kor  = korean_only(company)

    targets = []
    if comp_norm:
        targets.append(re.escape(comp_norm))
    if comp_kor and comp_kor != comp_norm:
        targets.append(re.escape(comp_kor))

    # for t in targets:
    #     pattern = rf'[△▲][^△▲]*{t}'  # △/▲ 이후 다음 △/▲ 전까지 회사명
    #     if re.search(pattern, d):
    #         return True
    return False

# pubDate 초강력 파서
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
    file_path = "../media_crawling/2023,2022년 중대성평가 목록 기반 뉴스데이터(전수검색).xlsx"
    df = pd.read_excel(file_path)

    # 태그 제거
    for col in ["title", "description", "company"]:
        if col in df.columns:
            df[col] = df[col].apply(strip_html)

    # news_score: 제목에 회사명이 포함되면 "+"
    if "news_score" not in df.columns:
        df["news_score"] = ""
    else:
        df["news_score"] = df["news_score"].fillna("").astype(str)

    title_norm = df["title"].apply(lambda x: re.sub(r'[^가-힣a-z0-9]', '', strip_html(str(x)).lower()))
    company_norm = df["company"].apply(lambda x: re.sub(r'[^가-힣a-z0-9]', '', strip_html(str(x)).lower()))
    mask_title_contains_company = df.apply(
        lambda r: (r.get("company", "") != "") and (company_norm.loc[r.name] in title_norm.loc[r.name]),
        axis=1
    )
    df.loc[mask_title_contains_company, "news_score"] = "++"

    # description: △/▲ 뒤에 회사명이(한글만 일치 포함) 있으면 행 삭제
    mask_drop = df.apply(lambda r: has_triangle_then_company(r.get("description", ""), r.get("company", "")), axis=1)
    df = df[~mask_drop].copy()

    # 불용 키워드 기사 삭제
    keywords = ["주식", "주가", "매수", "매매", "테마주", "관련주", "주식시장", "인사", "부고", "기고", "주식", "상장", "부동산", "시세", "매도", "증자", "증시"]
    pattern = "|".join(keywords)
    if "description" in df.columns:
        df = df[~df["description"].str.contains(pattern, case=False, na=False)]
    if "title" in df.columns:
        df = df[~df["title"].str.contains(pattern, case=False, na=False)]

    # recent_score: 기준일 설정
    df["pub_dt_utc"] = df.get("pubDate", pd.Series([None]*len(df))).apply(robust_parse_pubdate)

    # ✅ 기준일 자동: 데이터셋 내 pubDate의 최댓값(=검색 기준일 가정)
    latest = df["pub_dt_utc"].max()
    if pd.isna(latest):
        # 모두 실패하면 오늘로
        reference_date = pd.Timestamp.now(tz="Asia/Seoul").normalize()
    else:
        reference_date = latest.tz_convert("Asia/Seoul")

    # 👉 특정 날짜로 고정하고 싶으면 이 한 줄만 사용하세요:
    # reference_date = pd.Timestamp("2023-12-31 00:00:00", tz="Asia/Seoul")

    ref_utc = reference_date.tz_convert("UTC")

    # 파싱/기준일 로그
    total_rows = len(df)
    parsed_ok = df["pub_dt_utc"].notna().sum()
    print(f"[recent_score] rows: {total_rows}, parsed OK: {parsed_ok}, failed: {total_rows - parsed_ok}")
    print(f"[recent_score] min pubDate: {df['pub_dt_utc'].min()}")
    print(f"[recent_score] max pubDate: {df['pub_dt_utc'].max()}")
    print(f"[recent_score] reference_date(Asia/Seoul): {reference_date}")

    # 점수 계산(일수 기준: 3개월≈92일, 6개월≈183일)
    delta_days = (ref_utc - df["pub_dt_utc"]).dt.days
    df["recent_score"] = ""
    df.loc[delta_days.notna() & (delta_days <= 92), "recent_score"] = "++"
    df.loc[delta_days.notna() & (92 < delta_days) & (delta_days <= 183), "recent_score"] = "+"

    # 저장
    output_path = "뉴스중복데이터_가공결과.xlsx"
    df = df.drop(columns=["pub_dt_utc"], errors="ignore")
    df.to_excel(output_path, index=False)
    print(f"✅ 완료: {output_path}")
