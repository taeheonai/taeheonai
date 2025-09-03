import pandas as pd

# ===== 파일 경로 =====
in_path = "./모든 내용 정리.xlsx"
out_path = "./모든_내용_정리_결과.xlsx"

# ===== 시트 불러오기 =====
df_all = pd.read_excel(in_path, sheet_name="전체원본")
df_cat = pd.read_excel(in_path, sheet_name="목록+카테고리")

# 열 이름 정리 (앞뒤 공백 제거)
df_all.columns = df_all.columns.str.strip()
df_cat.columns = df_cat.columns.str.strip()

# ===== 매칭용 전처리 함수 =====
def normalize_issue(s):
    if pd.isna(s):
        return ""
    return "".join(str(s).split()).lower()

# ===== 보조키 추가 =====
df_all["_issue_key"] = df_all["issue_pool"].apply(normalize_issue)
df_cat["_issue_key"] = df_cat["issue_pool"].apply(normalize_issue)

# ===== 전체원본 필터링 =====
valid_keys = set(df_cat["_issue_key"].unique())
df_all_filtered = df_all[df_all["_issue_key"].isin(valid_keys)].copy()

# ===== category, esg_classification 매핑 =====
df_cat_map = df_cat[["_issue_key", "category", "esg_classification"]].drop_duplicates()

# ===== 병합 =====
df_all_merged = df_all_filtered.merge(df_cat_map, on="_issue_key", how="left")

# ===== 보조컬럼 제거 =====
df_all_merged = df_all_merged.drop(columns=["_issue_key"])
df_cat_out = df_cat.drop(columns=["_issue_key"])

# ===== 저장 =====
with pd.ExcelWriter(out_path, engine="openpyxl") as writer:
    df_all_merged.to_excel(writer, sheet_name="전체원본", index=False)
    df_cat_out.to_excel(writer, sheet_name="목록+카테고리", index=False)

print("✅ 처리 완료:", out_path)
