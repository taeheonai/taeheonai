// 카테고리명으로 ESG 분류 결정하는 함수
export const getESGClassification = (categoryName: string): string => {
    const environmentalKeywords = ['기후변화', '탄소배출', '대기오염', '생물다양성', '산림보호', '폐기물', '에너지', '재생에너지', '자원순환', '원자재', '온실가스', '원재료', '환경영향', '환경오염', '오염물질', '유해화학물질', '친환경', '폐수'];
    const socialKeywords = ['노사관계', '제품안전', '제품품질', '고용', '일자리', '공급망', '임금', '인사제도', '임직원', '인권', '안전보건', '인재관리', '인재', '지역사회', '사회공헌', '협력사', '조직문화', '기업문화'];
    const governanceKeywords = ['성장', '연구개발', 'R&D', '윤리경영', '준법경영', '부패', '뇌물수수', '리스크', '정보보안'];
    const economicKeywords = ['시장경쟁', '시장점유', '경제성과', '재무성과'];

    if (environmentalKeywords.some(keyword => categoryName.includes(keyword))) {
      return '환경';
    } else if (socialKeywords.some(keyword => categoryName.includes(keyword))) {
      return '사회';
    } else if (governanceKeywords.some(keyword => categoryName.includes(keyword))) {
      return '지배구조';
    } else if (economicKeywords.some(keyword => categoryName.includes(keyword))) {
      return '경제';
    } else {
      return '미분류';
    }
  };