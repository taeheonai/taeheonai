#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
한국어 뉴스 텍스트 이진 분류(부정만 판단) 학습 스크립트
- 라벨: negative vs other
- Guarded 옵션 제거(= False만 사용)
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
import warnings
import re
from pathlib import Path
from typing import Dict, Any, List, Tuple

# scikit-learn
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report,
    confusion_matrix, ConfusionMatrixDisplay, make_scorer
)
from sklearn.utils.class_weight import compute_class_weight

# ── 설정 ───────────────────────────────────────────────────────────────────────
warnings.filterwarnings('ignore')

DATA_PATH = "./학습데이터 1200개.xlsx"
RANDOM_STATE = 42
TEST_SIZE = 0.2
MIN_DF = 2
N_JOBS = -1
CV_FOLDS = 5
LABELS = ['negative', 'other']  # 이진 고정

OUTPUT_DIR = Path("./output")
OUTPUT_DIR.mkdir(exist_ok=True, parents=True)

# ── 사전(lexicons) & 정규식 ─────────────────────────────────────────────────────
# (참고) 현 버전에서는 Guarded 로직을 제거했으므로 아래 사전/정규식은 사용하지 않음.
NEGATIVE_LEXICON = {
    "감소","하락","부진","악화","오염","위반","담합","부패","뇌물","횡령","배임","사기",
    "과징금","벌금","사고","사망","파업","분쟁","갈등","논란","소송","리콜","결함","불량",
    "누출","유출","화재","적자","파산","구조조정","정리해고","중단","차질","실패","불법",
    "철수","퇴출","부정","불공정","갑질","직장괴롭힘","폭언","횡포","환불","회수","손실",
    "경고","제재","해지","취소","낙제","부과","징계","중징계","부정청탁","경영권분쟁","위기",
    "암울","결렬","부당노동행위","시위","구속","기소", "묵묵부답","구속기소", "법위반", "혐의", "파면"
}

POSITIVE_LEXICON = {
    "성장","확대","증가","개선","호조","흑자","최고","선정","수상","포상","산업포장",
    "강화","상생","협력","도입","출시","선도","인증","확보","우수","도약","확장","회복",
    "고도화","최적화","안정화","신설","채용","증설","증산","확충","공급","수주","모범",
    "달성","신기술","개시","증빙","성과","매출증가","고성장","선도기업","수출확대",
    "해외진출","파트너십","리더","평판","재생에너지","감축","이행","혁신","개발",
    "역대","순항","껑충","기증","후원","체결","호실적","지원","캠페인","기부",
    "위기 대응","손실 축소","인정","추월","전달"
}

_NEG_RE = re.compile("|".join(map(re.escape, sorted(NEGATIVE_LEXICON, key=len, reverse=True))))
_POS_RE = re.compile("|".join(map(re.escape, sorted(POSITIVE_LEXICON, key=len, reverse=True))))

def extract_keywords(text: str, pattern: re.Pattern) -> List[str]:
    if not isinstance(text, str):
        return []
    return sorted(set(pattern.findall(text)))

# ── 데이터 로드 ─────────────────────────────────────────────────────────────────
def load_data(path: str) -> pd.DataFrame:
    print(f"데이터 로드 중: {path}")
    df = pd.read_excel(path)
    print(f"1. 원본 데이터: {df.shape}")
    print(f"원본 judge 분포:\n{df['judge'].value_counts()}")

    # 필수 컬럼 검사
    required_cols = ['title', 'description', 'judge']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise ValueError(f"필수 컬럼이 누락되었습니다: {missing}")

    # 텍스트 전처리
    df['title'] = df['title'].fillna('')
    df['description'] = df['description'].fillna('')
    df['text'] = (df['title'] + ' ' + df['description']).str.strip()
    print(f"\n2. text 컬럼 생성 후: {df.shape}")

    # 3. 빈 텍스트 제거
    df_text = df[df['text'].str.len() > 0].copy()
    print(f"\n3. 빈 텍스트 제거 후: {df_text.shape}")
    print(f"제거된 행 수: {len(df) - len(df_text)}")

    # 4. judge 정리 (매핑 확장)
    mapping = {
        # 영어 라벨
        'negative': 'negative',
        'neutral':  'other',
        'positive': 'other',
        'other':    'other',
        'neg': 'negative', 'neu': 'other', 'pos': 'other',

        # 한글 라벨
        '부정': 'negative',
        '중립': 'other',
        '긍정': 'other',

        # 혼합 표기
        '부정(negative)': 'negative',
        '중립(neutral)':  'other',
        '긍정(positive)': 'other',
    }

    df_text['judge'] = (
        df_text['judge']
        .astype(str).str.strip().str.lower()
        .map(mapping)
    )

    unmapped = df_text['judge'].isna().sum()
    if unmapped > 0:
        print(f"[경고] 매핑되지 않은 judge {unmapped}건 존재. 원본 라벨 상위 예시:")
        print(df.loc[df_text['judge'].isna(), 'judge'].head(10))

    print(f"\n4. judge 매핑 후 분포:\n{df_text['judge'].value_counts()}")

    # 5. 최종 필터링
    df_final = df_text[df_text['judge'].isin(LABELS)]
    print(f"\n5. 최종 데이터: {df_final.shape}")
    print(f"최종 클래스 분포:\n{df_final['judge'].value_counts()}")

    if len(df_final) < 50:
        raise ValueError("전처리 후 데이터가 너무 적습니다. 전처리 과정을 확인해주세요.")

    return df_final

# ── 클래스 가중치 ───────────────────────────────────────────────────────────────
def get_class_weight(y: np.ndarray) -> Dict[str, float]:
    present = np.unique(y)
    weights = compute_class_weight('balanced', classes=present, y=y)
    cw = dict(zip(present, weights))
    for c in LABELS:
        cw.setdefault(c, 1.0)
    return cw

# ── 파이프라인 & 그리드 ─────────────────────────────────────────────────────────
def build_pipelines() -> Dict[str, Pipeline]:
    print("파이프라인 구성 중...")
    tfidf = TfidfVectorizer(
        token_pattern=r"[가-힣]{2,}",
        ngram_range=(1, 2),
        min_df=MIN_DF,
        sublinear_tf=True,
        max_features=10000
    )
    pipes = {
        'LinearSVC': Pipeline([('tfidf', tfidf), ('clf', LinearSVC(random_state=RANDOM_STATE))]),
        'LogisticRegression': Pipeline([('tfidf', tfidf), ('clf', LogisticRegression(random_state=RANDOM_STATE, max_iter=5000))]),
        'MultinomialNB': Pipeline([('tfidf', tfidf), ('clf', MultinomialNB())])
    }
    print("파이프라인 구성 완료")
    return pipes

def get_param_grids() -> Dict[str, Dict[str, list]]:
    return {
        'LinearSVC': {
            'clf__C': [0.5, 1, 2, 5],
            'clf__loss': ['hinge', 'squared_hinge'],
            'clf__dual': [True]  # hinge 손실을 위해 필요
        },
        'LogisticRegression': {
            'clf__C': [0.5, 1, 2, 5],
            'clf__penalty': ['l2'],
            'clf__solver': ['liblinear', 'saga']
        },
        'MultinomialNB': {
            'clf__alpha': [0.1, 0.5, 1.0, 2.0]
        }
    }

# ── 학습 & 선택 ─────────────────────────────────────────────────────────────────
def train_and_select(X_train: np.ndarray, y_train: np.ndarray,
                     pipelines: Dict[str, Pipeline],
                     param_grids: Dict[str, Dict[str, list]]) -> Dict[str, Any]:
    print("모델 학습 및 하이퍼파라미터 튜닝 중...")
    best = {}
    scorer = make_scorer(f1_score, pos_label='negative')  # 부정 F1 기준

    for name, pipe in pipelines.items():
        print(f"\n{name} 학습 중...")
        if name in ['LinearSVC', 'LogisticRegression']:
            pipe.named_steps['clf'].class_weight = get_class_weight(y_train)

        cv = StratifiedKFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
        gs = GridSearchCV(pipe, param_grids[name], cv=cv, n_jobs=N_JOBS,
                          scoring=scorer, verbose=1, error_score='raise')
        gs.fit(X_train, y_train)

        best[name] = {
            'best_estimator_': gs.best_estimator_,
            'best_cv_score': gs.best_score_,
            'best_params': gs.best_params_
        }
        print(f"{name} 최적 CV(F1-neg): {gs.best_score_:.4f}")
        print(f"{name} 최적 파라미터: {gs.best_params_}")
    return best

# ── 평가 (Raw만) ────────────────────────────────────────────────────────────────
def plot_confusion(y_true: np.ndarray, y_pred: np.ndarray, title: str, fname: str):
    plt.figure(figsize=(7,5))
    cm = confusion_matrix(y_true, y_pred, labels=LABELS)
    disp = ConfusionMatrixDisplay(cm, display_labels=LABELS)
    disp.plot(cmap='Blues', values_format='d')
    plt.title(title); plt.tight_layout()
    out = OUTPUT_DIR / fname
    plt.savefig(out, dpi=300, bbox_inches='tight'); plt.close()
    print(f"혼동행렬 저장: {out}")

def evaluate(models: Dict[str, Any], X_test: np.ndarray, y_test: np.ndarray) -> pd.DataFrame:
    print("모델 평가 중...")
    rows = []
    for name, info in models.items():
        clf = info['best_estimator_']

        # 원예측만 수행 (Guarded 제거)
        y_raw = clf.predict(X_test)
        acc_raw = accuracy_score(y_test, y_raw)
        f1_neg_raw = f1_score(y_test, y_raw, pos_label='negative', zero_division=0)
        macro_raw = f1_score(y_test, y_raw, average='macro', zero_division=0)

        rows.append({
            'Model': name,
            'Guarded': False,   # 고정
            'Accuracy': acc_raw,
            'F1(neg)': f1_neg_raw,
            'Macro F1': macro_raw,
            'CV(F1neg)': info['best_cv_score']
        })

        plot_confusion(y_test, y_raw, f'Confusion - {name} (Raw)', f'confusion_{name.lower()}_raw.png')

        print(f"\n{name} 분류 리포트:")
        print(classification_report(y_test, y_raw, labels=LABELS, zero_division=0))

    df_scores = pd.DataFrame(rows).sort_values(['F1(neg)','Accuracy'], ascending=False)
    print("\n모델 성능 요약(우선순위: F1(neg)↓, Accuracy↓):")
    print(df_scores.to_string(index=False))
    return df_scores

# ── 결과 저장 (Raw만) ───────────────────────────────────────────────────────────
def save_artifacts(models: Dict[str, Any], scores: pd.DataFrame,
                   X_test: np.ndarray, y_test: np.ndarray, test_df: pd.DataFrame):
    print("결과 저장 중...")

    # 모델 저장
    for name, info in models.items():
        p = OUTPUT_DIR / f"model_{name.lower().replace(' ', '_')}.joblib"
        joblib.dump(info['best_estimator_'], p)
        print(f"모델 저장: {p}")

    # 점수 저장
    scores.to_csv(OUTPUT_DIR / "model_scores.csv", index=False)

    # 예측 결과 저장 (Raw만)
    pred_rows = []
    for name, info in models.items():
        clf = info['best_estimator_']
        y_raw = clf.predict(X_test)

        for i, txt in enumerate(X_test):
            pred_rows.append({
                'model': name,
                'title': test_df.iloc[i]['title'],
                'description': test_df.iloc[i]['description'],
                'y_true': y_test[i],
                'y_pred': y_raw[i]
            })

    pd.DataFrame(pred_rows).to_csv(OUTPUT_DIR / "predictions_test.csv", index=False, encoding='utf-8-sig')
    print(f"예측 결과 저장: {OUTPUT_DIR / 'predictions_test.csv'}")

# ── 메인 ────────────────────────────────────────────────────────────────────────
def main():
    print("="*60); print("부정만 판단(negative vs other) 모델 학습 시작"); print("="*60)

    # 1) 데이터 로드 및 전처리
    df = load_data(DATA_PATH)

    # 2) 데이터 준비
    X = df['text'].values  # 원본 텍스트 그대로 사용
    y = df['judge'].values
    idx = np.arange(len(df))

    # 3) 학습/테스트 분할
    print("\n데이터 분할 중...")
    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, idx, test_size=TEST_SIZE, stratify=y, random_state=RANDOM_STATE
    )
    test_df = df.iloc[idx_test][['title','description']].reset_index(drop=True)
    print(f"분할 완료 - 학습: {len(X_train)}개 | 테스트: {len(X_test)}개")

    # 안전장치: X_train이 문장인지 확인
    assert isinstance(X_train[0], str), "X_train은 반드시 '문장'이어야 합니다. (벡터화를 제거하세요)"

    # 4) 파이프라인/그리드
    pipelines = build_pipelines()
    param_grids = get_param_grids()

    # 5) 학습/선정(부정 F1 최적화)
    best_models = train_and_select(X_train, y_train, pipelines, param_grids)

    # 6) 평가 (Raw만)
    scores = evaluate(best_models, X_test, y_test)

    # 7) 저장
    save_artifacts(best_models, scores, X_test, y_test, test_df)

    print("\n" + "="*60)
    print("완료! ./output 폴더 확인")
    print("="*60)

if __name__ == "__main__":
    main()
