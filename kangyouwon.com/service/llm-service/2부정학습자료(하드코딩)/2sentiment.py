import pandas as pd
import re

# 입력/출력 경로
in_path = "./학습데이터 만들기2.xlsx"
out_path = "./학습데이터_with_judge.xlsx"

# 1) 데이터 로드
df = pd.read_excel(in_path).fillna({"title_processed":"", "description_processed":""})

# 2) 토큰화
token_pattern = re.compile(r"[가-힣]{2,}")
def tokenize(text):
    return token_pattern.findall(str(text))

df["tokens"] = (df["title_processed"].astype(str) + " " + df["description_processed"].astype(str)).apply(tokenize)

# 3) 시드 사전 정의
positive_seeds = {
    "성장","확대","증가","개선","호조","흑자","최고","선정","수상","포상","산업포장",
    "강화","상생","협력","도입","출시","혁신","선도","인증","달성","신기술","개발","확보",
    "우수","도약","확장","회복","고도화","최적화","안정화","신설","채용","증설","증산",
    "확충","공급","수주","모범","리더","평판","재생에너지","감축","달성","이행","개시",
    "증빙","성과","매출증가","고성장","선도기업","수출확대","해외진출","파트너십"
}
negative_seeds = {
    "감소","하락","부진","악화","오염","위반","담합","부패","뇌물","횡령","배임","사기",
    "과징금","벌금","사고","사망","파업","분쟁","갈등","논란","소송","리콜","결함","불량",
    "누출","유출","화재","적자","파산","구조조정","정리해고","중단","차질","실패","불법",
    "철수","퇴출","부정","불공정","갑질","직장괴롭힘","폭언","횡포","환불","회수","손실",
    "경고","제재","해지","취소","낙제","부과","징계","중징계"  ,"부정청탁","경영권분쟁", "묵묵부답"
}

# 4) rule-based judge 라벨링
def judge_label(tokens):
    ts = set(tokens)
    has_pos = len(ts & positive_seeds) > 0
    has_neg = len(ts & negative_seeds) > 0
    if has_pos and not has_neg:
        return "positive"
    if has_neg and not has_pos:
        return "negative"
    return "neutral"

df["judge"] = df["tokens"].apply(judge_label)

# 5) 저장 (tokens 칼럼 포함)
df.to_excel(out_path, index=False)

print("완료:", out_path)
