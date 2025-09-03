# -*- coding: utf-8 -*-
"""
부정어/긍정어 사전을 이용한 간단 라벨링
- 부정어가 하나라도 포함되면 negative
- 단, 부정어와 긍정어가 함께 있으면 neutral
- 둘 다 없으면 other
엑셀에 neg_keywords(부정 매칭), pos_keywords(긍정 매칭), neutral_basis(중립 근거)까지 함께 저장

IN_PATH: 입력 엑셀
OUT_LABELED_PATH: 결과 저장 경로
"""

import pandas as pd
import re
from pathlib import Path

# ===== 설정 =====
IN_PATH = Path("../1random/4차random_sample_subset.xlsx")
OUT_LABELED_PATH = Path("./4차with_negative_labels.xlsx")

NEGATIVE_LEXICON = {
    "감소","하락","부진","악화","오염","위반","담합","부패","뇌물","횡령","배임","사기",
    "과징금","벌금","사고","사망","파업","분쟁","갈등","논란","소송","리콜","결함","불량",
    "누출","유출","화재","적자","파산","구조조정","정리해고","중단","차질","실패","불법",
    "철수","퇴출","부정","불공정","갑질","직장괴롭힘","폭언","횡포","환불","회수","손실",
    "경고","제재","해지","취소","낙제","부과","징계","중징계","부정청탁","경영권분쟁","위기",
    "암울","결렬","부당노동행위","시위","구속","기소", "묵묵부답","구속기소", "법위반", "혐의", "파면"
}


# ▶ 사용자가 준 긍정어 리스트
POSITIVE_LEXICON = {
    "성장","확대","증가","개선","호조","흑자","최고","선정","수상","포상","산업포장",
    "강화","상생","협력","도입","출시","선도","인증","확보","우수","도약","확장","회복",
    "고도화","최적화","안정화","신설","채용","증설","증산","확충","공급","수주","모범",
    "달성","신기술","개시","증빙","성과","매출증가","고성장","선도기업","수출확대",
    "해외진출","파트너십","리더","평판","재생에너지","감축","이행","혁신","개발",
    "역대","순항","껑충","기증","후원","체결","호실적","지원","캠페인","기부",
    "위기 대응","손실 축소","인정","추월","전달"
}


def pick_col(df: pd.DataFrame, candidates):
    for c in candidates:
        if c in df.columns:
            return c
    return None

# 긴 단어 먼저 매칭되도록 정규식 컴파일
_NEG_PATTERN = re.compile("|".join(map(re.escape, sorted(NEGATIVE_LEXICON, key=len, reverse=True))))
_POS_PATTERN = re.compile("|".join(map(re.escape, sorted(POSITIVE_LEXICON, key=len, reverse=True))))

def extract_keywords(text: str, pattern: re.Pattern) -> list:
    if not isinstance(text, str):
        return []
    return sorted(set(pattern.findall(text)))

def main():
    df = pd.read_excel(IN_PATH)
    df.columns = [str(c).strip() for c in df.columns]

    title_col = pick_col(df, ["title", "Title", "제목", "news_title", "기사제목"])
    desc_col  = pick_col(df, ["description", "요약", "summary", "desc", "요약본", "본문요약", "news_description"])

    def compute_fields(row):
        t = row[title_col] if title_col else ""
        d = row[desc_col]  if desc_col  else ""

        neg_t = extract_keywords(t, _NEG_PATTERN)
        neg_d = extract_keywords(d, _NEG_PATTERN)
        pos_t = extract_keywords(t, _POS_PATTERN)
        pos_d = extract_keywords(d, _POS_PATTERN)

        neg_matched = sorted(set(neg_t + neg_d))
        pos_matched = sorted(set(pos_t + pos_d))

        if neg_matched and pos_matched:
            label = "neutral"
            neutral_basis = f"긍정어 동시 출현: {', '.join(pos_matched)}"
        elif neg_matched:
            label = "negative"
            neutral_basis = ""
        else:
            label = "other"
            neutral_basis = ""

        return pd.Series({
            "neg_label": label,                       # 기존 컬럼명 유지 (값: negative/neutral/other)
            "neg_keywords": ", ".join(neg_matched),   # 매칭된 부정어
            "pos_keywords": ", ".join(pos_matched),   # 매칭된 긍정어
            "neutral_basis": neutral_basis            # 중립 근거(중립일 때만 값 존재)
        })

    df[["neg_label","neg_keywords","pos_keywords","neutral_basis"]] = df.apply(compute_fields, axis=1)

    OUT_LABELED_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_excel(OUT_LABELED_PATH, index=False)

    print(f"[완료] 라벨링 저장: {OUT_LABELED_PATH}")
    print(df["neg_label"].value_counts())

if __name__ == "__main__":
    main()
