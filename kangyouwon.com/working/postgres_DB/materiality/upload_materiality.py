
#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Materiality DB Uploader for Railway Postgres

- Reads: /mnt/data/materiality_db.xlsx (sheets: materiality_category, issuepool, issuepool_gri)
- Inserts into pre-created tables:
    corporation(id, stock_code, companyname, market, dart_code)
    esg_classification(id, esg)
    materiality_category(category_id, category_name, esg_classification_id)
    issuepool(issue_id, ranking, category_id, esg_classification_id, corporation_id, publish_year, base_issue_pool, issue_pool)
    issuepool_gri(id, category_id, gri_index)

Notes:
- `corporation_id` will be NULL unless a matching corporation.companyname exists in DB.
- `publish_year` is stored as TEXT per your schema (we cast numbers to integers then to str).
- Upserts are used to avoid duplicates on unique keys.
- Requires: pip install pandas sqlalchemy psycopg2-binary openpyxl python-dotenv
- Set DATABASE_URL env var, e.g.:
  export DATABASE_URL="postgresql+psycopg2://postgres:<password>@<host>:<port>/railway"
"""

import os
import sys
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

load_dotenv()

EXCEL_PATH = os.environ.get("EXCEL_PATH", os.path.join(os.path.dirname(__file__), "materiality_db.xlsx"))
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://postgres:ZzfwBnlMFrPIUpGsleepqCrOrEVJCbAK@trolley.proxy.rlwy.net:52468/railway")

def die(msg: str, code: int = 1):
    print(f"[EXIT] {msg}")
    sys.exit(code)

def get_engine() -> Engine:
    if not DATABASE_URL:
        die("DATABASE_URL is not set. Example: postgresql://postgres:ZzfwBnlMFrPIUpGsleepqCrOrEVJCbAK@trolley.proxy.rlwy.net:52468/railway")
    try:
        engine = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK] Database connectivity check passed.")
        return engine
    except Exception as e:
        die(f"Database connection failed: {e}")

def cleanse_str(x):
    if pd.isna(x):
        return None
    s = str(x).strip()
    return s if s else None

def main():
    if not os.path.exists(EXCEL_PATH):
        die(f"Excel file not found: {EXCEL_PATH}")
    xls = pd.ExcelFile(EXCEL_PATH)
    required = {"materiality_category", "issuepool", "issuepool_gri"}
    missing = required - set(xls.sheet_names)
    if missing:
        die(f"Missing sheets: {missing}. Found: {xls.sheet_names}")
    engine = get_engine()

    # --- Load sheets
    df_cat = pd.read_excel(EXCEL_PATH, sheet_name="materiality_category")
    df_issue = pd.read_excel(EXCEL_PATH, sheet_name="issuepool")
    df_gri = pd.read_excel(EXCEL_PATH, sheet_name="issuepool_gri")

    # Normalize column names
    df_cat.columns = [c.strip().lower() for c in df_cat.columns]
    df_issue.columns = [c.strip().lower() for c in df_issue.columns]
    df_gri.columns = [c.strip().lower() for c in df_gri.columns]

    # Clean strings & types
    df_cat["category"] = df_cat["category"].map(cleanse_str)
    df_cat = df_cat.dropna(subset=["category"]).drop_duplicates(subset=["category"])

    for col in ["company", "ranking", "base_issue_pool", "issue_pool", "category", "esg_classification", "year"]:
        if col in df_issue.columns:
            if col in ["ranking"]:
                # keep ranking as string because schema defines TEXT
                df_issue[col] = df_issue[col].apply(lambda v: None if pd.isna(v) else str(v).strip())
            elif col == "year":
                # store as text in DB
                def norm_year(v):
                    if pd.isna(v):
                        return None
                    try:
                        iv = int(float(v))
                        return str(iv)
                    except Exception:
                        return cleanse_str(v)
                df_issue[col] = df_issue[col].apply(norm_year)
            else:
                df_issue[col] = df_issue[col].map(cleanse_str)

    df_issue = df_issue.dropna(subset=["issue_pool", "category", "esg_classification"])

    df_gri["category"] = df_gri["category"].map(cleanse_str)
    df_gri["gri_index"] = df_gri["gri_index"].map(cleanse_str)
    df_gri = df_gri.dropna(subset=["category", "gri_index"]).drop_duplicates()

    with engine.begin() as conn:
        # 1) Seed esg_classification (from distinct values in issue sheet)
        esg_values = sorted({e for e in df_issue["esg_classification"].dropna().unique()})
        for esg in esg_values:
            conn.execute(
                text("""
                    INSERT INTO esg_classification (esg)
                    VALUES (:esg)
                    ON CONFLICT (esg) DO NOTHING
                """),
                {"esg": esg}
            )
        print(f"[OK] Upserted {len(esg_values)} esg_classification values: {esg_values}")

        # 2) Upsert materiality categories with esg_classification_id
        for _, r in df_cat.iterrows():
            cat_name = r.get("category")
            esg_name = r.get("esg_classification")
            
            # esg_classification_id 매핑
            esg_id = None
            if esg_name:
                # esg_classification 테이블에서 해당 esg 값의 id 찾기
                result = conn.execute(
                    text("SELECT id FROM esg_classification WHERE esg = :esg"),
                    {"esg": esg_name}
                ).first()
                if result:
                    esg_id = result[0]
            
            conn.execute(
                text("""
                    INSERT INTO materiality_category (category_name, esg_classification_id)
                    VALUES (:name, :esg_id)
                    ON CONFLICT (category_name) DO UPDATE SET
                        esg_classification_id = EXCLUDED.esg_classification_id
                """),
                {"name": cat_name, "esg_id": esg_id}
            )
        print(f"[OK] Upserted {len(df_cat)} materiality_category rows with esg_classification_id.")

        # Helper: map names -> ids
        def fetch_map(sql, key_field, val_field):
            rows = conn.execute(text(sql)).mappings().all()
            return {r[key_field]: r[val_field] for r in rows}
        esg_map = fetch_map("SELECT esg, id FROM esg_classification", "esg", "id")
        cat_map = fetch_map("SELECT category_name, id FROM materiality_category", "category_name", "id")
        corp_map = fetch_map("SELECT companyname, id FROM corporation", "companyname", "id")  # may be empty

        # 3) Insert issuepool (resolve FKs)
        issue_rows = []
        skipped = 0
        
        # 지표/기준 데이터 키워드 (MSCI, SASB 등)
        indicator_keywords = ['MSCI', 'SASB', 'GRI', 'TCFD', 'CDP', 'DJSI']
        
        for _, r in df_issue.iterrows():
            cat = r.get("category")
            esg = r.get("esg_classification")
            comp = r.get("company")

            cat_id = cat_map.get(cat)
            esg_id = esg_map.get(esg)
            
            # 지표/기준 데이터인지 확인 (MSCI, SASB 등)
            is_indicator = comp and any(keyword in str(comp).upper() for keyword in indicator_keywords)
            
            # 지표 데이터는 corporation_id를 NULL로, 기업 데이터는 매핑 시도
            if is_indicator:
                corp_id = None  # 지표 데이터는 corporation_id를 NULL로 설정
            else:
                corp_id = corp_map.get(comp) if comp else None

            if not cat_id or not esg_id:
                skipped += 1
                continue

            issue_rows.append({
                "ranking": r.get("ranking"),
                "category_id": int(cat_id),
                "esg_classification_id": int(esg_id),
                "corporation_id": int(corp_id) if corp_id else None,
                "publish_year": r.get("year"),
                "base_issue_pool": r.get("base_issue_pool"),
                "issue_pool": r.get("issue_pool"),
            })

        # bulk insert
        if issue_rows:
            conn.execute(
                text("""
                    INSERT INTO issuepool
                        (ranking, category_id, esg_classification_id, corporation_id, publish_year, base_issue_pool, issue_pool)
                    VALUES
                        (:ranking, :category_id, :esg_classification_id, :corporation_id, :publish_year, :base_issue_pool, :issue_pool)
                """),
                issue_rows
            )
        print(f"[OK] Inserted {len(issue_rows)} issuepool rows. Skipped {skipped} due to missing FK mappings (category/esg).")
        
        # corporation 매핑 통계
        corp_matched = sum(1 for row in issue_rows if row["corporation_id"] is not None)
        corp_unmatched = sum(1 for row in issue_rows if row["corporation_id"] is None)
        print(f"[INFO] Corporation mapping: {corp_matched} matched, {corp_unmatched} unmatched")
        
        if corp_unmatched > 0:
            print(f"[INFO] Sample unmatched companies: {list(set([r.get('company') for _, r in df_issue.iterrows() if r.get('company') and corp_map.get(r.get('company')) is None]))[:5]}")

        # 4) Insert issuepool_gri (category_id + gri_index with unique constraint)
        gri_rows = []
        for _, r in df_gri.iterrows():
            cat = r.get("category")
            idx = r.get("gri_index")
            cat_id = cat_map.get(cat)
            if not cat_id or not idx:
                continue
            gri_rows.append({"category_id": int(cat_id), "gri_index": idx})

        # Use ON CONFLICT to avoid duplicates
        for row in gri_rows:
            conn.execute(
                text("""
                    INSERT INTO issuepool_gri (category_id, gri_index)
                    VALUES (:category_id, :gri_index)
                    ON CONFLICT ON CONSTRAINT issuepool_gri_category_id_gri_index_key DO NOTHING
                """),
                row
            )
        print(f"[OK] Upserted {len(gri_rows)} issuepool_gri rows.")

    print("[DONE] Upload complete.")

if __name__ == "__main__":
    main()
