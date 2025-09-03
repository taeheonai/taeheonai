# -*- coding: utf-8 -*-
"""
무작위로 N개 샘플을 뽑아 '일부'와 '제외한 나머지'를 각각 엑셀로 저장

- IN_PATH: 입력 엑셀 경로
- OUT_SAMPLE_PATH: 샘플 일부 저장 경로
- OUT_REMAINDER_PATH: 나머지 저장 경로
- N: 뽑을 개수 (데이터가 N보다 적으면 전체 저장)
- RANDOM_STATE: 재현성 필요 시 정수 지정(예: 42), 무작위면 None
"""

import pandas as pd
import numpy as np
from pathlib import Path

# ===== 설정 =====
IN_PATH = Path(r"C:\Users\bit\Documents\kangyouwon.com\service\llm-service\1random\3차random_remainder.xlsx")
OUT_SAMPLE_PATH   = Path("./4차random_sample_subset.xlsx")
OUT_REMAINDER_PATH = Path("./4차random_remainder.xlsx")
N = 400
RANDOM_STATE = None  # 재현성 원하면 정수로 변경 (예: 42)

def main():
    df = pd.read_excel(IN_PATH)
    df.columns = [str(c).strip() for c in df.columns]
    df["_row_id"] = np.arange(len(df))  # 원본 행 추적용

    if len(df) == 0:
        raise ValueError("입력 파일에 데이터가 없습니다.")

    take = min(N, len(df))
    df_sample = df.sample(n=take, replace=False, random_state=RANDOM_STATE)
    selected_ids = set(df_sample["_row_id"].tolist())
    df_remainder = df[~df["_row_id"].isin(selected_ids)].copy()

    # _row_id는 결과에서 제거(원하면 남겨도 됨)
    df_sample = df_sample.drop(columns=["_row_id"])
    df_remainder = df_remainder.drop(columns=["_row_id"])

    OUT_SAMPLE_PATH.parent.mkdir(parents=True, exist_ok=True)
    df_sample.to_excel(OUT_SAMPLE_PATH, index=False)
    df_remainder.to_excel(OUT_REMAINDER_PATH, index=False)

    print(f"[완료] 샘플 {len(df_sample)}건 저장: {OUT_SAMPLE_PATH}")
    print(f"[완료] 나머지 {len(df_remainder)}건 저장: {OUT_REMAINDER_PATH}")

if __name__ == "__main__":
    main()
