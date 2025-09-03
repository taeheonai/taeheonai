import axios from 'axios';

// 전체 카테고리 목록 가져오기 함수
export const fetchAllCategories = async (setAllCategories: any) => {
  try {
    console.log('🔍 데이터베이스에서 카테고리 목록을 가져오는 중...');
    
    // Gateway를 통해 materiality-service 호출 (POST 방식)
    const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
    const response = await axios.post(
      `${gatewayUrl}/api/v1/materiality-service/category/categories/all`,
      {
        include_base_issue_pools: true,
        include_esg_classification: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000  // 30초 타임아웃
      }
    );

    if (response.data.success) {
      const categories = response.data.categories || [];
      console.log(`✅ ${categories.length}개 카테고리를 성공적으로 가져왔습니다.`);
      
      // API 응답 구조를 프론트엔드에서 사용하는 구조로 변환하고 '미분류' 카테고리 제외
      const transformedCategories = categories
        .map((cat: any) => ({
          name: cat.category_name,
          esg_classification: cat.esg_classification?.esg || '미분류',
          base_issue_pools: cat.base_issue_pools?.map((pool: any) => pool.base_issue_pool) || []
        }))
        .filter((cat: any) => 
          cat.name !== '미분류' && 
          cat.esg_classification !== '미분류'
        );
      
      console.log(`🔍 미분류 제외 후 카테고리 수: ${transformedCategories.length}개`);
      setAllCategories(transformedCategories);
    } else {
      console.error('❌ API 응답 실패:', response.data.message);
      throw new Error(response.data.message || '카테고리 목록을 가져오는데 실패했습니다.');
    }
    
  } catch (error: any) {
    console.error('❌ 전체 카테고리 목록 가져오기 실패:', error);
    
    // 에러 발생 시 하드코딩된 기본 카테고리 목록 사용 (fallback)
    console.log('⚠️ 하드코딩된 기본 카테고리 목록을 사용합니다.');
    const defaultCategories = [
      {
        name: '기후변화',
        esg_classification: '환경',
        base_issue_pools: ['기후변화 대응', '기후위기 대응', '기후리스크 관리', '기후변화 적응']
      },
      {
        name: '탄소배출',
        esg_classification: '환경',
        base_issue_pools: ['탄소중립', '탄소배출량 감축', '탄소배출권 거래', '탄소회계']
      },
      {
        name: '대기오염',
        esg_classification: '환경',
        base_issue_pools: ['대기질 관리', '미세먼지 저감', '대기오염물질 배출', '대기환경 보호']
      },
      {
        name: '생물다양성/산림보호',
        esg_classification: '환경',
        base_issue_pools: ['생물다양성 보전', '산림보호', '생태계 보전', '자연자원 보호']
      },
      {
        name: '폐기물/폐기물관리',
        esg_classification: '환경',
        base_issue_pools: ['폐기물 감량화', '재활용', '폐기물 처리', '순환경제']
      },
      {
        name: '에너지',
        esg_classification: '환경',
        base_issue_pools: ['에너지 효율성', '에너지 절약', '에너지 관리', '에너지 전환']
      },
      {
        name: '재생에너지',
        esg_classification: '환경',
        base_issue_pools: ['태양광', '풍력', '수력', '바이오에너지', '지열']
      },
      {
        name: '자원순환/자원효율/원자재관리',
        esg_classification: '환경',
        base_issue_pools: ['자원순환', '자원효율성', '원자재 관리', '친환경 소재']
      },
      {
        name: '온실가스',
        esg_classification: '환경',
        base_issue_pools: ['온실가스 감축', '온실가스 배출량', '온실가스 목표', '탄소발자국']
      },
      {
        name: '원재료',
        esg_classification: '환경',
        base_issue_pools: ['친환경 원재료', '지속가능한 원재료', '원재료 조달', '원자재 관리']
      },
      {
        name: '환경영향/환경오염/오염물질/유해화학물질',
        esg_classification: '환경',
        base_issue_pools: ['환경영향 평가', '환경오염 방지', '오염물질 관리', '유해화학물질 관리']
      },
      {
        name: '친환경',
        esg_classification: '환경',
        base_issue_pools: ['친환경 제품', '친환경 기술', '친환경 경영', '친환경 인증']
      },
      {
        name: '노사관계',
        esg_classification: '사회',
        base_issue_pools: ['노사협력', '노사대화', '노사관계 개선', '노동조합과의 관계']
      },
      {
        name: '제품안전/제품품질',
        esg_classification: '사회',
        base_issue_pools: ['제품안전성', '제품품질 관리', '품질보증', '안전기준 준수']
      },
      {
        name: '고용/일자리',
        esg_classification: '사회',
        base_issue_pools: ['고용창출', '일자리 보호', '고용안정성', '고용의 질']
      },
      {
        name: '공급망',
        esg_classification: '사회',
        base_issue_pools: ['공급망 관리', '협력사 관리', '공급망 투명성', '공급망 안정성']
      },
      {
        name: '임금/인사제도',
        esg_classification: '사회',
        base_issue_pools: ['공정한 임금', '인사제도', '성과평가', '보상체계']
      },
      {
        name: '임직원',
        esg_classification: '사회',
        base_issue_pools: ['임직원 복지', '임직원 만족도', '임직원 교육', '임직원 건강']
      },
      {
        name: '인권',
        esg_classification: '사회',
        base_issue_pools: ['인권 보호', '인권 정책', '인권 교육', '인권 실사']
      },
      {
        name: '안전보건',
        esg_classification: '사회',
        base_issue_pools: ['안전보건 관리', '산업안전', '건강관리', '안전교육']
      },
      {
        name: '폐수관리',
        esg_classification: '환경',
        base_issue_pools: ['폐수 처리', '폐수 관리', '수질 보호', '수환경 관리']
      },
      {
        name: '인재관리/인재',
        esg_classification: '사회',
        base_issue_pools: ['인재 육성', '인재 확보', '인재 개발', '인재 유지']
      },
      {
        name: '지역사회/사회공헌',
        esg_classification: '사회',
        base_issue_pools: ['지역사회 발전', '사회공헌 활동', '지역사회 관계', '사회적 가치 창출']
      },
      {
        name: '협력사',
        esg_classification: '사회',
        base_issue_pools: ['협력사 지원', '협력사 육성', '협력사 관계', '협력사 평가']
      },
      {
        name: '조직문화/기업문화',
        esg_classification: '사회',
        base_issue_pools: ['조직문화', '기업문화', '조직개발', '문화혁신']
      },
      {
        name: '성장',
        esg_classification: '지배구조',
        base_issue_pools: ['지속가능한 성장', '성장 전략', '성장 동력', '성장 관리']
      },
      {
        name: '연구개발/R&D',
        esg_classification: '지배구조',
        base_issue_pools: ['R&D 투자', '기술개발', '혁신', '연구개발 관리']
      },
      {
        name: '시장경쟁/시장점유/경제성과/재무성과',
        esg_classification: '경제',
        base_issue_pools: ['시장경쟁력', '시장점유율', '경제성과', '재무성과', '수익성']
      },
      {
        name: '윤리경영/준법경영/부패/뇌물수수',
        esg_classification: '지배구조',
        base_issue_pools: ['윤리경영', '준법경영', '부패방지', '뇌물수수 방지', '윤리강령']
      },
      {
        name: '리스크',
        esg_classification: '지배구조',
        base_issue_pools: ['리스크 관리', '리스크 평가', '리스크 대응', '리스크 모니터링']
      },
      {
        name: '정보보안',
        esg_classification: '지배구조',
        base_issue_pools: ['정보보안', '데이터 보호', '사이버 보안', '개인정보 보호']
      }
    ];
    
    setAllCategories(defaultCategories);
    alert('⚠️ 데이터베이스 연결에 실패하여 기본 카테고리 목록을 사용합니다.\n\n관리자에게 문의해주세요.');
  }
};