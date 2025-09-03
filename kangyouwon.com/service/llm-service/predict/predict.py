# 사용 방법

# 1. 학습 스크립트로 저장된 모델 파일명을 MODEL_PATH에 지정
# 2. 예측할 새 엑셀을 INPUT_XLSX로 지정 (title/description 포함)
# 3. 결과 저장 경로 OUTPUT_XLSX 지정
# 4. (선택) 확률 임계값을 쓰고 싶으면 NEGATIVE_THRESHOLD = 0.6 같은 식으로 설정
# 5. 실행하면 y_pred, proba_*/score_*, is_negative_final가 포함된 결과 엑셀이 만들어집니다.

# predict_with_scores_and_negative_flag_guarded.py
# -*- coding: utf-8 -*-

"""
정답지 없는 새 엑셀에 대해:
- 모델 예측(y_pred)
- 점수(확률 또는 decision score)
- 부정 플래그(is_negative_final)
- '부정+긍정 동시 → other' 가드 적용 결과(final_label, guard_applied)
- 근거(final_basis), 추출 키워드(neg_keywords, pos_keywords)

사용법:
1) MODEL_PATH: 학습 스크립트가 저장한 모델(.joblib)
2) INPUT_XLSX: 예측용 엑셀 (title/description 포함)
3) OUTPUT_XLSX: 결과 저장 경로
4) NEGATIVE_THRESHOLD: None(라벨 기반) 또는 0~1(확률모델) / 점수기반은 모델마다 스케일 다르므로 주의
"""

import pandas as pd
from pathlib import Path
import joblib
import numpy as np
import re

# ===== 경로/옵션 =====
MODEL_PATH = Path("../machine_learning/output/model_multinomialnb.joblib")      # 사용할 모델 파일(.joblib)
INPUT_XLSX = Path(r"C:\Users\bit\Documents\kangyouwon.com\service\llm-service\1random\4차random_remainder.xlsx")                       # 정답 없는 입력
OUTPUT_XLSX = Path("./예측결과_with_none_guard.xlsx")           # 결과 저장
NEGATIVE_THRESHOLD = None  # 예: 0.6 (확률 기반). 확률 없으면 score_negative 기준(주의) 또는 y_pred.

# ===== 부정어/긍정어 사전 & 정규식 =====
NEGATIVE_LEXICON = {
    "감소","하락","부진","악화","오염","위반","담합","부패","뇌물","횡령","배임","사기",
    "과징금","벌금","사고","사망","파업","분쟁","갈등","논란","소송","리콜","결함","불량",
    "누출","유출","화재","적자","파산","구조조정","정리해고","중단","차질","실패","불법",
    "철수","퇴출","부정","불공정","갑질","직장괴롭힘","폭언","횡포","환불","회수","손실",
    "경고","제재","해지","취소","낙제","부과","징계","중징계","부정청탁","경영권분쟁","위기","청산"
}
POSITIVE_LEXICON = {
    "성장","확대","증가","개선","호조","흑자","최고","선정","수상","포상","산업포장",
    "강화","상생","협력","도입","출시","선도","인증","확보","우수","도약","확장","회복",
    "고도화","최적화","안정화","신설","채용","증설","증산","확충","공급","수주","모범",
    "달성","신기술","개시","증빙","성과","매출증가","고성장","선도기업","수출확대",
    "해외진출","파트너십","리더","평판","재생에너지","감축","이행","혁신","개발","역대",
    "순항","껑충","기증","기부","전달","지원","캠페인","후원"
}
_NEG_RE = re.compile("|".join(map(re.escape, sorted(NEGATIVE_LEXICON, key=len, reverse=True))))
_POS_RE = re.compile("|".join(map(re.escape, sorted(POSITIVE_LEXICON, key=len, reverse=True))))

def extract_keywords(text: str, patt: re.Pattern):
    if not isinstance(text, str):
        return []
    return sorted(set(patt.findall(text)))

# ===== 전처리: 학습 때와 동일 포맷으로 text 생성 =====
def build_text_column(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    title_col = next((c for c in ["title","Title","제목","news_title","기사제목"] if c in df.columns), None)
    desc_col  = next((c for c in ["description","요약","summary","desc","요약본","본문요약","news_description"] if c in df.columns), None)
    if not title_col and not desc_col:
        raise ValueError("title/description 계열 컬럼을 찾을 수 없습니다.")
    if title_col: df[title_col] = df[title_col].fillna("")
    if desc_col:  df[desc_col]  = df[desc_col].fillna("")
    if title_col and desc_col:
        df["text"] = (df[title_col] + " " + df[desc_col]).str.strip()
    else:
        df["text"] = df[title_col or desc_col].astype(str)
    return df[df["text"].str.len() > 0].copy()

def main():
    # 1) 데이터 로드
    df = pd.read_excel(INPUT_XLSX)
    df = build_text_column(df)

    # 2) 모델 로드
    pipe = joblib.load(MODEL_PATH)
    clf = pipe.named_steps["clf"]
    classes = getattr(clf, "classes_", None)
    if classes is None:
        # 일부 케이스에서 pipeline에 classes_가 있을 수 있으나 일반적으로 clf에 존재
        classes = getattr(pipe, "classes_", None)
    if classes is None:
        raise RuntimeError("학습된 모델에서 classes_를 찾을 수 없습니다.")
    classes = np.array(classes).astype(str)

    # 3) 예측 라벨
    df["y_pred"] = pipe.predict(df["text"]).astype(str)

    # 4) 점수/확률 붙이기 + negative 점수 안전 계산
    proba_available = hasattr(pipe, "predict_proba")
    negative_index = None
    if classes is not None and "negative" in classes:
        negative_index = int(np.where(classes == "negative")[0][0])

    if proba_available:
        proba = pipe.predict_proba(df["text"])
        best_idx = proba.argmax(axis=1)
        df["pred_score"] = proba[np.arange(len(df)), best_idx]
        # 클래스별 확률
        for i, c in enumerate(classes):
            df[f"proba_{c}"] = proba[:, i]
        if negative_index is not None:
            df["proba_negative"] = proba[:, negative_index]
        # negative 점수로 확률 사용
        df["score_negative"] = df.get("proba_negative", pd.Series([np.nan]*len(df)))
    else:
        scores = pipe.decision_function(df["text"])
        if scores.ndim == 1:
            # 이진 분류: decision_function의 부호는 classes_[1] (양의 클래스)에 대응
            positive_class = classes[1]  # sklearn 규칙
            # negative 점수: 양의 클래스가 negative면 그대로, 아니면 부호 반전
            df["score_negative"] = scores if positive_class == "negative" else (-scores)
            df["decision_score"] = scores  # 참고용
        else:
            # 다중 분류일 경우 각 클래스 점수 제공
            best_idx = scores.argmax(axis=1)
            df["decision_score"] = scores[np.arange(len(df)), best_idx]
            for i, c in enumerate(classes):
                df[f"score_{c}"] = scores[:, i]
            if negative_index is not None:
                df["score_negative"] = scores[:, negative_index]

    # 5) 모델 기반 부정 플래그(임계값 옵션)
    if NEGATIVE_THRESHOLD is not None:
        if "proba_negative" in df.columns:
            is_neg_model = df["proba_negative"] >= float(NEGATIVE_THRESHOLD)
        elif "score_negative" in df.columns:
            # 주의: 점수 스케일은 모델마다 다름. 임계값 해석에 유의.
            is_neg_model = df["score_negative"] >= float(NEGATIVE_THRESHOLD)
        else:
            is_neg_model = df["y_pred"].str.lower().eq("negative")
    else:
        is_neg_model = df["y_pred"].str.lower().eq("negative")
    df["is_negative_model"] = is_neg_model.astype(int)

    # 6) 가드 적용: 부정어+긍정어 동시 → other
    neg_kws = []
    pos_kws = []
    guard_applied = []
    final_label = []
    final_basis = []

    for txt, pred_is_neg in zip(df["text"], is_neg_model):
        neg_list = extract_keywords(txt, _NEG_RE)
        pos_list = extract_keywords(txt, _POS_RE)
        both = (len(neg_list) > 0) and (len(pos_list) > 0)

        neg_kws.append(", ".join(neg_list))
        pos_kws.append(", ".join(pos_list))

        if pred_is_neg and both:
            guard_applied.append(True)
            final_label.append("other")
            final_basis.append("부정+긍정 동시 출현 → other")
        elif pred_is_neg and not both:
            guard_applied.append(False)
            final_label.append("negative")
            final_basis.append("모델 부정 예측 유지")
        else:
            guard_applied.append(False)
            final_label.append("other")
            final_basis.append("모델 other 예측")

    df["neg_keywords"] = neg_kws
    df["pos_keywords"] = pos_kws
    df["guard_applied"] = guard_applied
    df["final_label"] = final_label
    df["is_negative_final"] = (df["final_label"] == "negative").astype(int)
    df["final_basis"] = final_basis

    # 7) 저장
    df.to_excel(OUTPUT_XLSX, index=False)
    print(f"[완료] 예측+점수+가드 적용 결과 저장: {OUTPUT_XLSX}")

if __name__ == "__main__":
    main()
