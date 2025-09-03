// 저장된 중대성 평가 결과 불러오기 함수
export const loadAssessmentResult = (setAssessmentResult: any, setCompanyId: any, setCompanySearchTerm: any, setSearchPeriod: any, setDisplayCategoryCount?: any) => {
    try {
      const savedData = localStorage.getItem('materialityAssessmentResult');
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('📂 저장된 중대성 평가 결과 불러오기:', parsedData);
        
        if (parsedData.assessment_result) {
          // selected_base_issue_pool 정보가 포함된 데이터 복원
          const restoredData = parsedData.assessment_result;
          
          // 데이터 구조 검증 및 복원
          if (restoredData.data?.matched_categories) {
            console.log('📋 복원된 카테고리 수:', restoredData.data.matched_categories.length);
            console.log('📋 Base Issue Pool이 설정된 카테고리 수:', 
              restoredData.data.matched_categories.filter((cat: any) => cat.selected_base_issue_pool).length);
          }
          
          setAssessmentResult(restoredData);
          
          // 기업 정보와 검색 기간도 복원
          if (parsedData.company_id) {
            setCompanyId(parsedData.company_id);
            setCompanySearchTerm(parsedData.company_id);
          }
          
          // 표시할 카테고리 개수도 복원
          if (setDisplayCategoryCount && parsedData.display_category_count !== undefined) {
            setDisplayCategoryCount(parsedData.display_category_count);
            console.log('📊 복원된 표시 카테고리 개수:', parsedData.display_category_count);
          }
          
          alert(`✅ 저장된 중대성 평가 결과를 불러왔습니다!\n\n📊 총 ${restoredData.data?.matched_categories?.length || 0}개 카테고리\n📋 Base Issue Pool 설정: ${restoredData.data?.matched_categories?.filter((cat: any) => cat.selected_base_issue_pool).length || 0}개`);
        } else {
          alert('⚠️ 저장된 중대성 평가 결과가 없습니다.');
        }
      } else {
        alert('⚠️ 저장된 중대성 평가 결과가 없습니다.');
      }
    } catch (error) {
      console.error('❌ 저장된 중대성 평가 결과 불러오기 실패:', error);
      alert('❌ 저장된 중대성 평가 결과를 불러오는데 실패했습니다.');
    }
  };

// 저장된 지난 중대성 평가 목록 불러오기 함수
export const loadSearchResult = (setIssuepoolData: any) => {
  try {
    const savedData = localStorage.getItem('materialitySearchResult');
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log('📂 저장된 지난 중대성 평가 목록 불러오기:', parsedData);
      
      if (parsedData.issuepool_data) {
        setIssuepoolData(parsedData.issuepool_data);
        console.log('📋 복원된 지난 중대성 평가 목록:', parsedData.issuepool_data);
        alert(`✅ 저장된 지난 중대성 평가 목록을 불러왔습니다!\n\n📊 ${parsedData.company_id} (${parsedData.search_period.start_date} ~ ${parsedData.search_period.end_date})`);
      } else {
        alert('⚠️ 저장된 지난 중대성 평가 목록이 없습니다.');
      }
    } else {
      alert('⚠️ 저장된 지난 중대성 평가 목록이 없습니다.');
    }
  } catch (error) {
    console.error('❌ 저장된 지난 중대성 평가 목록 불러오기 실패:', error);
    alert('❌ 저장된 지난 중대성 평가 목록을 불러오는데 실패했습니다.');
  }
};