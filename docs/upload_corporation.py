
#!/usr/bin/env python3
# -*- coding: utf-8 -*-


"""
Corporation Master Uploader (Railway Postgres)

- Reads: /mnt/data/all_corp.xlsx (Sheet1)
  expected columns: id, corp_code, companyname, market, dart_code
- Writes: corporation(id SERIAL PK, stock_code TEXT UNIQUE NOT NULL, companyname TEXT, market TEXT, dart_code TEXT)

Usage
-----
pip install pandas sqlalchemy psycopg2-binary openpyxl python-dotenv
export DATABASE_URL="postgresql+psycopg2://postgres:<pw>@<host>:<port>/railway"
python /mnt/data/upload_corporation.py
"""

import os, sys
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from dotenv import load_dotenv

load_dotenv()

EXCEL_PATH = os.environ.get("EXCEL_PATH", "C:/Users/bit/taeheonai/docs/all_corp.xlsx")
SHEET_NAME = os.environ.get("SHEET_NAME", "Sheet1")
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg2://postgres:ZtQKhXPQZLiyEgINSWDfRznAIcrJZhAx@gondola.proxy.rlwy.net:15963/railway")

def die(msg, code=1):
    print(msg)
    sys.exit(code)

def cleanse_str(x):
    if pd.isna(x):
        return None
    s = str(x).strip()
    return s if s else None

def get_engine() -> Engine:
    if not DATABASE_URL:
        die("DATABASE_URL not set")
    eng = create_engine(DATABASE_URL, future=True, pool_pre_ping=True)
    with eng.connect() as conn:
        conn.execute(text("SELECT 1"))
    return eng

def main():
    if not os.path.exists(EXCEL_PATH):
        die(f"Excel not found: {EXCEL_PATH}")
    # force corp_code as string to keep leading zeros
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, dtype={"corp_code": "string"})
    # normalize
    cols = [c.strip().lower() for c in df.columns]
    df.columns = cols
    # keep only the needed columns and rename
    wanted = {
        "corp_code": "stock_code",
        "companyname": "companyname",
        "market": "market",
        "dart_code": "dart_code",
    }
    for k in wanted.keys():
        if k not in df.columns:
            die(f"Missing column in Excel: {k}")
    out = df[list(wanted.keys())].rename(columns=wanted)
    # clean
    out["stock_code"] = out["stock_code"].apply(lambda v: None if pd.isna(v) else str(v).strip())
    out["companyname"] = out["companyname"].map(cleanse_str)
    out["market"] = out["market"].map(cleanse_str)
    # dart_code is TEXT in DB — cast to str
    def norm_dart(v):
        if pd.isna(v):
            return None
        try:
            # keep digits only when numeric then cast to str w/o .0
            return str(int(float(v)))
        except Exception:
            return cleanse_str(v)
    out["dart_code"] = out["dart_code"].apply(norm_dart)
    # drop rows without stock_code
    before = len(out)
    out = out.dropna(subset=["stock_code"]).drop_duplicates(subset=["stock_code"])
    dropped = before - len(out)
    print(f"[INFO] rows: {before}, dropped(no stock_code/dupe): {dropped}")
    # upsert
    eng = get_engine()
    with eng.begin() as conn:
        # ensure unique index exists (in case schema differs)
        conn.execute(text("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_indexes
                    WHERE schemaname = 'public' AND indexname = 'uq_corporation_stock_code'
                ) THEN
                    CREATE UNIQUE INDEX uq_corporation_stock_code ON corporation(stock_code);
                END IF;
            END $$;
        """))
        rows = out.to_dict(orient="records")
        for r in rows:
            conn.execute(
                text("""
                    INSERT INTO corporation (stock_code, companyname, market, dart_code)
                    VALUES (:stock_code, :companyname, :market, :dart_code)
                    ON CONFLICT (stock_code)
                    DO UPDATE SET
                        companyname = EXCLUDED.companyname,
                        market = EXCLUDED.market,
                        dart_code = EXCLUDED.dart_code
                """),
                r
            )
    print(f"[DONE] Upserted {len(out)} corporation rows.")

if __name__ == "__main__":
    main()
