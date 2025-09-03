#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
한국어 뉴스 텍스트 분류 모델 학습 스크립트
title과 description을 결합하여 positive/negative/neutral 분류
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import joblib
import warnings
from pathlib import Path
from typing import Dict, Tuple, Any

# scikit-learn imports
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.svm import LinearSVC
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import (
    accuracy_score, f1_score, classification_report, 
    confusion_matrix, ConfusionMatrixDisplay
)
from sklearn.utils.class_weight import compute_class_weight

# 경고 무시
warnings.filterwarnings('ignore')

# 설정 상수
DATA_PATH = "./머신러닝2차.xlsx"  # 기본 데이터 경로
RANDOM_STATE = 42
TEST_SIZE = 0.2
MIN_DF = 2
N_JOBS = -1
CV_FOLDS = 5

# 출력 디렉토리
OUTPUT_DIR = Path("./output")
OUTPUT_DIR.mkdir(exist_ok=True)


def load_data(path: str) -> pd.DataFrame:
    """
    엑셀 파일에서 데이터를 로드하고 전처리합니다.
    
    Args:
        path: 엑셀 파일 경로
        
    Returns:
        전처리된 DataFrame
    """
    print(f"데이터 로드 중: {path}")
    
    try:
        # 엑셀 파일 읽기
        df = pd.read_excel(path)
        print(f"원본 데이터 형태: {df.shape}")
        print(f"컬럼: {list(df.columns)}")
        
        # 필수 컬럼 확인
        required_cols = ['title', 'description', 'judge']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"필수 컬럼이 누락되었습니다: {missing_cols}")
        
        # 결측값 처리
        df['title'] = df['title'].fillna('')
        df['description'] = df['description'].fillna('')
        
        # title과 description 결합
        df['text'] = (df['title'] + ' ' + df['description']).str.strip()
        
        # 빈 텍스트 제거
        df = df[df['text'].str.len() > 0]
        
        # judge 컬럼 정리
        df['judge'] = df['judge'].str.strip().str.lower()
        
        # 유효한 judge 값만 유지
        valid_judges = ['positive', 'negative', 'neutral']
        df = df[df['judge'].isin(valid_judges)]
        
        print(f"전처리 후 데이터 형태: {df.shape}")
        print(f"클래스 분포:\n{df['judge'].value_counts()}")
        
        return df
        
    except Exception as e:
        print(f"데이터 로드 실패: {e}")
        raise


def get_class_weight(y):
    """
    클래스 가중치를 계산합니다.
    
    Args:
        y: 라벨 배열
        
    Returns:
        클래스별 가중치 딕셔너리
    """
    classes = np.unique(y)
    weights = compute_class_weight('balanced', classes=classes, y=y)
    return dict(zip(classes, weights))


def build_pipelines() -> Dict[str, Pipeline]:
    """
    분류 파이프라인을 구성합니다.
    
    Returns:
        파이프라인 딕셔너리
    """
    print("파이프라인 구성 중...")
    
    # TF-IDF 벡터라이저
    tfidf = TfidfVectorizer(
        token_pattern=r"[가-힣]{2,}",  # 한국어 2글자 이상
        ngram_range=(1, 2),           # 1-gram, 2-gram
        min_df=MIN_DF,                # 최소 문서 빈도
        sublinear_tf=True,            # sublinear TF 변환
        max_features=10000            # 최대 특성 수 제한
    )
    
    pipelines = {
        'LinearSVC': Pipeline([
            ('tfidf', tfidf),
            ('clf', LinearSVC(random_state=RANDOM_STATE))
        ]),
        'LogisticRegression': Pipeline([
            ('tfidf', tfidf),
            ('clf', LogisticRegression(random_state=RANDOM_STATE, max_iter=5000))
        ]),
        'MultinomialNB': Pipeline([
            ('tfidf', tfidf),
            ('clf', MultinomialNB())
        ])
    }
    
    print("파이프라인 구성 완료")
    return pipelines


def get_param_grids() -> Dict[str, Dict[str, list]]:
    """
    각 모델의 하이퍼파라미터 탐색 범위를 정의합니다.
    
    Returns:
        하이퍼파라미터 그리드 딕셔너리
    """
    param_grids = {
        'LinearSVC': {
            'clf__C': [0.5, 1, 2, 5],
            'clf__loss': ['hinge', 'squared_hinge']
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
    
    return param_grids


def train_and_select(X_train: np.ndarray, y_train: np.ndarray, 
                    pipelines: Dict[str, Pipeline], 
                    param_grids: Dict[str, Dict[str, list]]) -> Dict[str, Any]:
    """
    각 파이프라인을 학습하고 최적 모델을 선택합니다.
    
    Args:
        X_train: 학습 데이터
        y_train: 학습 라벨
        pipelines: 파이프라인 딕셔너리
        param_grids: 하이퍼파라미터 그리드
        
    Returns:
        최적 모델 정보 딕셔너리
    """
    print("모델 학습 및 하이퍼파라미터 튜닝 중...")
    
    best_models = {}
    
    for name, pipeline in pipelines.items():
        print(f"\n{name} 학습 중...")
        
        # 클래스 가중치 설정 (가능한 모델에만)
        if name in ['LinearSVC', 'LogisticRegression']:
            class_weights = get_class_weight(y_train)
            pipeline.named_steps['clf'].class_weight = class_weights
        
        # GridSearchCV로 하이퍼파라미터 탐색
        grid_search = GridSearchCV(
            pipeline,
            param_grids[name],
            cv=CV_FOLDS,
            n_jobs=N_JOBS,
            scoring='f1_macro',
            verbose=1
        )
        
        grid_search.fit(X_train, y_train)
        
        best_models[name] = {
            'best_estimator_': grid_search.best_estimator_,
            'best_cv_score': grid_search.best_score_,
            'best_params': grid_search.best_params_
        }
        
        print(f"{name} 최적 CV 점수: {grid_search.best_score_:.4f}")
        print(f"{name} 최적 파라미터: {grid_search.best_params_}")
    
    print("모든 모델 학습 완료")
    return best_models


def evaluate(models: Dict[str, Any], X_test: np.ndarray, 
            y_test: np.ndarray) -> pd.DataFrame:
    """
    테스트셋에서 모델들을 평가합니다.
    
    Args:
        models: 학습된 모델 딕셔너리
        X_test: 테스트 데이터
        y_test: 테스트 라벨
        
    Returns:
        성능 점수 DataFrame
    """
    print("모델 평가 중...")
    
    scores = []
    
    for name, model_info in models.items():
        model = model_info['best_estimator_']
        y_pred = model.predict(X_test)
        
        # 성능 지표 계산
        accuracy = accuracy_score(y_test, y_pred)
        macro_f1 = f1_score(y_test, y_pred, average='macro')
        weighted_f1 = f1_score(y_test, y_pred, average='weighted')
        
        scores.append({
            'Model': name,
            'Accuracy': accuracy,
            'Macro F1': macro_f1,
            'Weighted F1': weighted_f1,
            'CV Score': model_info['best_cv_score']
        })
        
        # 상세 분류 리포트 출력
        print(f"\n{name} 분류 리포트:")
        print(classification_report(y_test, y_pred))
        
        # 혼동행렬 시각화 및 저장
        plot_confusion_matrix(y_test, y_pred, name)
    
    # 성능 요약 DataFrame 생성
    scores_df = pd.DataFrame(scores)
    scores_df = scores_df.sort_values('Macro F1', ascending=False)
    
    print(f"\n모델 성능 요약 (Macro F1 기준 내림차순):")
    print(scores_df.to_string(index=False))
    
    return scores_df


def plot_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, 
                         model_name: str):
    """
    혼동행렬을 시각화하고 저장합니다.
    
    Args:
        y_true: 실제 라벨
        y_pred: 예측 라벨
        model_name: 모델 이름
    """
    plt.figure(figsize=(8, 6))
    
    cm = confusion_matrix(y_true, y_pred, labels=['positive', 'negative', 'neutral'])
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, 
                                 display_labels=['positive', 'negative', 'neutral'])
    
    disp.plot(cmap='Blues', values_format='d')
    plt.title(f'Confusion Matrix - {model_name}')
    plt.tight_layout()
    
    # 파일 저장
    output_path = OUTPUT_DIR / f"confusion_{model_name.lower().replace(' ', '_')}.png"
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    print(f"혼동행렬 저장: {output_path}")


def save_artifacts(models: Dict[str, Any], scores: pd.DataFrame, 
                  X_test: np.ndarray, y_test: np.ndarray, 
                  texts_test: pd.Series):
    """
    학습된 모델과 결과를 저장합니다.
    
    Args:
        models: 학습된 모델 딕셔너리
        scores: 성능 점수 DataFrame
        X_test: 테스트 데이터
        y_test: 테스트 라벨
        texts_test: 테스트 텍스트
    """
    print("결과 저장 중...")
    
    # 1. 모델 저장
    for name, model_info in models.items():
        model_path = OUTPUT_DIR / f"model_{name.lower().replace(' ', '_')}.joblib"
        joblib.dump(model_info['best_estimator_'], model_path)
        print(f"모델 저장: {model_path}")
    
    # 2. 성능 점수 저장
    scores_path = OUTPUT_DIR / "model_scores.csv"
    scores.to_csv(scores_path, index=False)
    print(f"성능 점수 저장: {scores_path}")
    
    # 3. 예측 결과 저장
    predictions = None
    
    for name, model_info in models.items():
        model = model_info['best_estimator_']
        y_pred = model.predict(X_test)
        
        if predictions is None:  # 첫 번째 모델
            predictions = pd.DataFrame({
                'title': texts_test['title'].values,
                'description': texts_test['description'].values,
                'y_true': y_test,
                f'y_pred_{name}': y_pred
            })
        else:
            predictions[f'y_pred_{name}'] = y_pred
    
    predictions_path = OUTPUT_DIR / "predictions_test.csv"
    predictions.to_csv(predictions_path, index=False)
    print(f"예측 결과 저장: {predictions_path}")
    
    print("모든 결과 저장 완료")


def main():
    """메인 실행 함수"""
    print("=" * 60)
    print("한국어 뉴스 텍스트 분류 모델 학습 시작")
    print("=" * 60)
    
    try:
        # 1. 데이터 로드 및 전처리
        df = load_data(DATA_PATH)
        
        # 2. 데이터 분할
        print("\n데이터 분할 중...")
        X = df['text'].values
        y = df['judge'].values
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=TEST_SIZE, 
            stratify=y, 
            random_state=RANDOM_STATE
        )
        
        # 테스트 데이터의 원본 텍스트 정보 추출
        test_mask = ~df.index.isin(df.index[:len(X_train)])
        texts_test = df[test_mask][['title', 'description']]
        
        print(f"학습 데이터: {len(X_train)}개")
        print(f"테스트 데이터: {len(X_test)}개")
        
        # 3. 파이프라인 구성
        pipelines = build_pipelines()
        
        # 4. 하이퍼파라미터 그리드 정의
        param_grids = get_param_grids()
        
        # 5. 모델 학습 및 선택
        best_models = train_and_select(X_train, y_train, pipelines, param_grids)
        
        # 6. 모델 평가
        scores = evaluate(best_models, X_test, y_test)
        
        # 7. 결과 저장
        save_artifacts(best_models, scores, X_test, y_test, texts_test)
        
        print("\n" + "=" * 60)
        print("모든 과정이 성공적으로 완료되었습니다!")
        print("=" * 60)
        
        # 최종 성능 요약 출력
        print("\n최종 모델 성능 (Macro F1 기준):")
        print(scores[['Model', 'Macro F1', 'Accuracy']].to_string(index=False))
        
    except Exception as e:
        print(f"\n오류 발생: {e}")
        raise


if __name__ == "__main__":
    main()
