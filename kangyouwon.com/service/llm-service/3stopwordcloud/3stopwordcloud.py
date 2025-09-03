from konlpy.tag import Okt
from nltk.tokenize import word_tokenize
import nltk
import re
import pandas as pd
from nltk import FreqDist
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from icecream import ic
import numpy as np

class KoreanNewsPreprocessor:
    """
    한국어 뉴스 데이터 전처리를 위한 클래스
    title, description, 검색어(company+issue)를 활용해 judge를 구하는 ML 모델을 위한 전처리
    """
    
    def __init__(self):
        self.okt = Okt()
        self.stopwords = set()
        self.load_korean_stopwords()
        
    def load_korean_stopwords(self):
        """한국어 기본 불용어 로드"""
        # 한국어 기본 불용어 목록
        basic_stopwords = [
            '이', '그', '저', '것', '수', '등', '때', '곳', '말', '일',
            '때문', '그것', '이것', '저것', '그러나', '하지만', '또한',
            '또는', '그리고', '그런데', '그래서', '따라서', '그러므로',
            '아', '어', '오', '우', '으', '이', '가', '을', '를', '의',
            '에', '에서', '로', '으로', '와', '과', '도', '만', '은', '는',
            '이', '가', '을', '를', '의', '에', '에서', '로', '으로',
            '와', '과', '도', '만', '은', '는', '이', '가', '을', '를',
            '의', '에', '에서', '로', '으로', '와', '과', '도', '만',
            '은', '는', '이', '가', '을', '를', '의', '에', '에서',
            '로', '으로', '와', '과', '도', '만', '은', '는', "라며"
        ]
        
        # 뉴스 관련 불용어 추가 (긍정/부정 판단에 중요한 키워드는 제외)
        news_stopwords = [
            '뉴스', '기사', '보도', '발표', '공개', '발표', '전망',
            '예상', '추정', '분석', '조사'
            # 제외된 키워드 (긍정/부정 판단에 중요):
            # '연구', '개발', '투자' - 긍정적 활동
            # '매출', '실적' - 재무 성과
            # '성장', '발전', '향상', '개선', '확대', '증가', '상승' - 긍정적 지표
            # '감소', '하락', '변화', '전환', '확산' - 부정적 지표
        ]
        
        # 숫자, 특수문자 관련 (재무 성과 단위는 제외)
        symbol_stopwords = [
            '년', '월', '일', '시', '분', '초', '개', '명', '회', '차', '번'
            # 제외된 키워드 (재무 성과 단위):
            # '원', '억', '만', '천', '백', '십' - 금액 단위
            # '퍼센트', '프로', '%' - 비율 단위
            # '달러', '엔', '위안' - 외화 단위
        ]
        
        # 사람이름 관련 불용어 (성씨 + 일반적인 이름 패턴)
        name_stopwords = [
            '김', '이', '박', '최', '정', '강', '조', '윤', '장', '임',
            '한', '오', '서', '신', '권', '황', '안', '송', '류', '전',
            '고', '문', '양', '손', '배', '조', '백', '허', '유', '남',
            '심', '노', '정', '하', '곽', '성', '차', '주', '우', '구',
            '신', '임', '나', '전', '민', '유', '진', '지', '엄', '채',
            '원', '천', '방', '공', '강', '현', '함', '변', '염', '양',
            '변', '여', '추', '노', '도', '소', '신', '석', '선', '설',
            '마', '길', '주', '예', '경', '명', '기', '동', '영', '수',
            '자', '준', '민', '지', '현', '우', '서', '재', '정', '진',
            '민', '준', '현', '우', '서', '재', '정', '진', '민', '준',
            # 성씨 + '씨' 패턴 추가
            '김씨', '이씨', '박씨', '최씨', '정씨', '강씨', '조씨', '윤씨', '장씨', '임씨',
            '한씨', '오씨', '서씨', '신씨', '권씨', '황씨', '안씨', '송씨', '류씨', '전씨',
            '고씨', '문씨', '양씨', '손씨', '배씨', '백씨', '허씨', '유씨', '남씨',
            '심씨', '노씨', '하씨', '곽씨', '성씨', '차씨', '주씨', '구씨',
            '나씨', '민씨', '지씨', '엄씨', '채씨', '원씨', '천씨', '방씨', '공씨',
            '함씨', '변씨', '염씨', '여씨', '추씨', '도씨', '소씨', '석씨', '선씨', '설씨',
            '길씨', '예씨', '경씨', '명씨', '기씨', '동씨', '영씨', '수씨',
            '자씨', '현씨', '재씨', '진씨'
        ]
        
        self.stopwords.update(basic_stopwords)
        self.stopwords.update(news_stopwords)
        self.stopwords.update(symbol_stopwords)
        self.stopwords.update(name_stopwords)
        
    def read_excel_data(self, file_path):
        """엑셀 파일에서 뉴스 데이터 읽기"""
        try:
            df = pd.read_excel(file_path)
            ic(f"데이터 로드 완료: {len(df)}행, {len(df.columns)}열")
            ic(f"컬럼명: {list(df.columns)}")
            return df
        except Exception as e:
            ic(f"엑셀 파일 읽기 오류: {e}")
            return None
    
    def clean_text(self, text):
        """텍스트 정제 (한글만 추출, 공백 정리)"""
        if pd.isna(text) or text == '':
            return ''
        
        # 텍스트를 문자열로 변환
        text = str(text)
        
        # 줄바꿈을 공백으로 변경
        text = text.replace('\n', ' ').replace('\r', ' ')
        
        # 한글, 숫자, 공백만 추출
        text = re.sub(r'[^ㄱ-힣0-9\s]', '', text)
        
        # 연속된 공백을 하나로 정리
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    def extract_nouns(self, text):
        """한국어 텍스트에서 명사 추출"""
        if not text:
            return []
        
        try:
            # 형태소 분석으로 명사 추출
            pos_result = self.okt.pos(text, stem=True)
            nouns = [word for word, pos in pos_result if pos == 'Noun']
            
            # 길이가 1인 토큰 제거 (베이스라인으로 충분)
            nouns = [noun for noun in nouns if len(noun) > 1]
            
            return nouns
        except Exception as e:
            ic(f"명사 추출 오류: {e}")
            return []
    
    def remove_stopwords(self, tokens):
        """불용어 제거"""
        filtered_tokens = [token for token in tokens if token not in self.stopwords]
        return filtered_tokens
    
    def remove_company_names(self, tokens, company_names):
        """기업명 제거 (company 컬럼과 겹치는 것)"""
        if not company_names:
            return tokens
        
        # company_names를 set으로 변환하여 검색 속도 향상
        company_set = set()
        for company in company_names:
            if pd.notna(company) and company:
                company_str = str(company).strip()
                if company_str:
                    # 기업명을 토큰으로 분할하여 각각 제거
                    company_tokens = company_str.split()
                    company_set.update(company_tokens)
                    
                    # 띄어쓰기가 있는 기업명도 추가 (예: "HL 만도" -> "HL", "만도")
                    if len(company_tokens) > 1:
                        # 전체 기업명도 추가
                        company_set.add(company_str)
        
        # 기업명 토큰 제거 (부분 일치도 제거)
        filtered_tokens = []
        for token in tokens:
            should_remove = False
            for company in company_set:
                if token in company or company in token:
                    should_remove = True
                    break
            if not should_remove:
                filtered_tokens.append(token)
        
        return filtered_tokens
    

    
    def preprocess_text(self, text, company_names=None):
        """전체 전처리 과정"""
        # 1. 텍스트 정제
        cleaned_text = self.clean_text(text)
        
        # 2. 명사 추출
        nouns = self.extract_nouns(cleaned_text)
        
        # 3. 불용어 제거
        filtered_nouns = self.remove_stopwords(nouns)
        
        # 4. 기업명 제거 (company 컬럼과 겹치는 것)
        if company_names:
            filtered_nouns = self.remove_company_names(filtered_nouns, company_names)
        
        return filtered_nouns
    
    def process_excel_data(self, file_path):
        """엑셀 데이터 전체 전처리"""
        # 데이터 로드
        df = self.read_excel_data(file_path)
        if df is None:
            return None
        
        # 전처리 결과를 저장할 컬럼 추가
        df['title_processed'] = ''
        df['description_processed'] = ''
        
        # company 컬럼에서 모든 기업명 수집
        company_names = []
        if 'company' in df.columns:
            company_names = df['company'].dropna().unique().tolist()
        
        # 각 행별로 전처리 수행
        for idx, row in df.iterrows():
            if idx % 100 == 0:
                ic(f"처리 진행률: {idx}/{len(df)}")
            
            # title 전처리
            if 'title' in df.columns:
                title_tokens = self.preprocess_text(row['title'], company_names)
                df.at[idx, 'title_processed'] = ' '.join(title_tokens)
            
            # description 전처리
            if 'description' in df.columns:
                desc_tokens = self.preprocess_text(row['description'], company_names)
                df.at[idx, 'description_processed'] = ' '.join(desc_tokens)
        
        ic("전처리 완료!")
        return df
    
    def analyze_frequency(self, df, column_name):
        """특정 컬럼의 단어 빈도 분석"""
        all_tokens = []
        
        for tokens_str in df[column_name]:
            if tokens_str:
                tokens = tokens_str.split()
                all_tokens.extend(tokens)
        
        # 빈도 분석
        freq_dist = FreqDist(all_tokens)
        freq_df = pd.DataFrame(freq_dist.most_common(50), columns=['단어', '빈도'])
        
        ic(f"{column_name} 상위 10개 단어:")
        ic(freq_df.head(10))
        
        return freq_df
    

    
    def create_wordcloud(self, df, column_name, output_path=None):
        """워드클라우드 생성"""
        all_tokens = []
        
        for tokens_str in df[column_name]:
            if tokens_str:
                tokens = tokens_str.split()
                all_tokens.extend(tokens)
        
        if not all_tokens:
            ic(f"{column_name}에 처리된 토큰이 없습니다.")
            return
        
        # 텍스트 결합
        text = ' '.join(all_tokens)
        
        # 워드클라우드 생성
        try:
            wordcloud = WordCloud(
                font_path='malgun',  # Windows 기본 폰트
                background_color='white',
                width=800,
                height=600,
                max_words=100,
                relative_scaling=0.2
            ).generate(text)
            
            # 시각화
            plt.figure(figsize=(12, 8))
            plt.imshow(wordcloud, interpolation='bilinear')
            plt.axis('off')
            plt.title(f'{column_name} 워드클라우드')
            
            if output_path:
                plt.savefig(output_path, dpi=300, bbox_inches='tight')
                ic(f"워드클라우드 저장: {output_path}")
            
            plt.show()
            
        except Exception as e:
            ic(f"워드클라우드 생성 오류: {e}")
    
    def save_processed_data(self, df, output_path):
        """전처리된 데이터 저장"""
        try:
            df.to_excel(output_path, index=False)
            ic(f"전처리된 데이터 저장 완료: {output_path}")
        except Exception as e:
            ic(f"데이터 저장 오류: {e}")


def main():
    """메인 실행 함수"""
    # 전처리기 인스턴스 생성
    preprocessor = KoreanNewsPreprocessor()
    
    # 엑셀 파일 경로
    input_file = '머신러닝 원본 데이터.xlsx'
    output_file = '머신러닝_전처리_완료.xlsx'
    
    # 데이터 전처리 실행
    ic("=== 한국어 뉴스 데이터 전처리 시작 ===")
    
    # 1. 엑셀 데이터 전처리
    processed_df = preprocessor.process_excel_data(input_file)
    
    if processed_df is not None:
        # 2. 빈도 분석
        ic("\n=== 빈도 분석 ===")
        title_freq = preprocessor.analyze_frequency(processed_df, 'title_processed')
        desc_freq = preprocessor.analyze_frequency(processed_df, 'description_processed')
        

        
        # 4. 워드클라우드 생성
        ic("\n=== 워드클라우드 생성 ===")
        preprocessor.create_wordcloud(processed_df, 'title_processed', 'title_wordcloud.png')
        preprocessor.create_wordcloud(processed_df, 'description_processed', 'description_wordcloud.png')
        
        # 5. 전처리된 데이터 저장
        preprocessor.save_processed_data(processed_df, output_file)
        
        ic("\n=== 전처리 완료! ===")
        ic(f"입력 파일: {input_file}")
        ic(f"출력 파일: {output_file}")
        ic(f"처리된 행 수: {len(processed_df)}")
    else:
        ic("데이터 처리에 실패했습니다.")


if __name__ == '__main__':
    main()
