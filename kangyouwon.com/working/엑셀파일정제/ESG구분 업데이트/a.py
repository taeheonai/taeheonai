import pandas as pd

# 엑셀 파일 경로
file_path = "모든 내용 정리.xlsx"   # 실제 파일명으로 수정하세요

# 시트 불러오기
df_esg = pd.read_excel(file_path, sheet_name="목록+ESG구분")
df_cat = pd.read_excel(file_path, sheet_name="목록+카테고리")

# issue_pool 기준으로 매칭 (LEFT JOIN)
df_merged = pd.merge(
    df_cat, 
    df_esg[['issue_pool', 'esg_classification']], 
    on='issue_pool', 
    how='left'
)

# 결과를 새로운 파일로 저장
df_merged.to_excel("목록+카테고리_업데이트.xlsx", index=False)
