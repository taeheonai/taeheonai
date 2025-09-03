  // 중대성 평가 결과 저장 함수
  const saveAssessmentResult = (assessmentResult: any, companyId: any, searchPeriod: any) => {
    if (!assessmentResult) {
      alert('저장할 중대성 평가 결과가 없습니다.');
      return;
    }

    try {
      const dataToSave = {
        assessmentResult,
        timestamp: new Date().toISOString(),
        companyId: companyId,
        searchPeriod: searchPeriod
      };
      
      localStorage.setItem('materialityAssessmentResult', JSON.stringify(dataToSave));
      console.log('💾 중대성 평가 결과 저장 완료:', dataToSave);
      alert('✅ 중대성 평가 결과가 성공적으로 저장되었습니다.');
    } catch (error) {
      console.error('❌ 중대성 평가 결과 저장 실패:', error);
      alert('❌ 중대성 평가 결과 저장에 실패했습니다.');
    }
  };

  