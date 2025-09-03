# Fix sampling by iterating over group DataFrames directly

import pandas as pd
import numpy as np
from pathlib import Path

in_path = Path("/mnt/data/학습데이터_with_judge(가공).xlsx")
df = pd.read_excel(in_path)
df.columns = [str(c).strip() for c in df.columns]

def pick_col(candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None

new_score_col = pick_col(["new_score", "news_score", "newScore", "New_Score", "new score"])
judge_col     = pick_col(["judge", "judege", "judge_result", "label", "판정"])
company_col   = pick_col(["company", "기업명", "company_name"])
issue_col     = pick_col(["issue", "이슈", "중대성평가목록", "issue_pool"])

df_filt = df[df[new_score_col].astype(str).str.strip() == "++"].copy()

grp_cols = [judge_col, company_col, issue_col]
grouped = df_filt.groupby(grp_cols, dropna=False)

TARGET = 200

def proportional_allocate(sizes, total, cap=None):
    sizes = np.array(sizes, dtype=float)
    if sizes.sum() == 0:
        base = np.zeros_like(sizes, dtype=int)
        remainders = np.zeros_like(sizes, dtype=float)
    else:
        quotas = sizes / sizes.sum() * total
        base = np.floor(quotas).astype(int)
        remainders = quotas - base
    if cap is not None:
        over = np.maximum(base - cap, 0)
        freed = int(over.sum())
        base = np.minimum(base, cap)
    else:
        freed = 0
    assigned = int(base.sum())
    remain = total - assigned
    remain += freed
    order = np.argsort(-remainders)
    i = 0
    while remain > 0 and i < len(order):
        idx = order[i]
        if cap is None or base[idx] < cap:
            base[idx] += 1
            remain -= 1
        i += 1
        if i == len(order) and remain > 0:
            i = 0
    return base

groups = list(grouped.groups.keys())
sizes = [len(grouped.get_group(k)) for k in groups]

if len(groups) <= TARGET:
    base = np.ones(len(groups), dtype=int)
    remainder = TARGET - base.sum()
    extra = proportional_allocate(sizes, remainder, cap=None) if remainder > 0 else np.zeros(len(groups), dtype=int)
    alloc = base + extra
    alloc = np.minimum(alloc, np.array(sizes, dtype=int))
    short = TARGET - int(alloc.sum())
    if short > 0:
        spare = np.array(sizes, dtype=int) - alloc
        order = np.argsort(-spare)
        i = 0
        while short > 0 and i < len(order):
            idx = order[i]
            if spare[idx] > 0:
                alloc[idx] += 1
                spare[idx] -= 1
                short -= 1
            i += 1
else:
    probs = np.array(sizes, dtype=float)
    probs = probs / probs.sum()
    chosen_idx = np.random.choice(len(groups), size=TARGET, replace=False, p=probs)
    alloc = np.zeros(len(groups), dtype=int)
    alloc[chosen_idx] = 1

parts = []
for i, k in enumerate(groups):
    take = int(alloc[i])
    if take <= 0:
        continue
    gdf = grouped.get_group(k)
    if take >= len(gdf):
        parts.append(gdf)
    else:
        parts.append(gdf.sample(n=take, replace=False, random_state=None))

df_sample = pd.concat(parts, axis=0)

if len(df_sample) < TARGET:
    need = TARGET - len(df_sample)
    remaining = df_filt.drop(df_sample.index, errors="ignore")
    if not remaining.empty:
        add = remaining.sample(n=min(need, len(remaining)), random_state=None)
        df_sample = pd.concat([df_sample, add], axis=0)

df_sample = df_sample.sample(frac=1.0, random_state=None).reset_index(drop=True)

out_path = Path("/mnt/data/new_score_pp_balanced_200.xlsx")
df_sample.to_excel(out_path, index=False)

# Display previews and summaries
from caas_jupyter_tools import display_dataframe_to_user
display_dataframe_to_user("샘플 미리보기 (상위 20)", df_sample.head(20))
display_dataframe_to_user("요약: judge 분포", df_sample.groupby(judge_col).size().reset_index(name="count").sort_values("count", ascending=False))
display_dataframe_to_user("요약: company 분포 (상위 50)", df_sample.groupby(company_col).size().reset_index(name="count").sort_values("count", ascending=False).head(50))
display_dataframe_to_user("요약: issue 분포 (상위 50)", df_sample.groupby(issue_col).size().reset_index(name="count").sort_values("count", ascending=False).head(50))

print(f"샘플 총 개수: {len(df_sample)}")
print(f"[Download] {out_path}")
