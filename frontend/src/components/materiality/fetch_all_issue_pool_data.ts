import axios from "axios";

// issuepool DB 전체 데이터 가져오기 함수
export const fetchAllIssuepoolData = async (setIsIssuepoolAllLoading: any, setIssuepoolAllData: any) => {
    try {
      setIsIssuepoolAllLoading(true);
      console.log('🔍 issuepool DB 전체 데이터 가져오기 시작');
      
      // Gateway를 통해 materiality-service 호출
      const gatewayUrl = 'https://taeheonai-production-2130.up.railway.app';
      const response = await axios.get(
        `${gatewayUrl}/api/v1/materiality/issuepool/all`,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ issuepool DB 전체 데이터 API 응답:', response.data);

      if (response.data.success && response.data.data) {
        setIssuepoolAllData(response.data.data);
        console.log('✅ issuepool DB 전체 데이터 설정 완료:', response.data.data);
        
        // 요약 정보 표시
        const summary = response.data.data.summary;
        alert(`✅ issuepool DB 전체 데이터 로드 완료!\n\n📊 요약:\n- 총 카테고리: ${summary.total_categories}개\n- 총 Base Issue Pool: ${summary.total_base_issuepools}개\n- 중복 제거 후 매칭된 행: ${summary.total_matched_rows}개\n- 중복 제거된 행: ${summary.total_base_issuepools - summary.total_matched_rows}개`);
      } else {
        console.warn('⚠️ issuepool DB 전체 데이터를 가져올 수 없습니다:', response.data);
        alert('❌ issuepool DB 전체 데이터를 가져올 수 없습니다: ' + (response.data.message || '알 수 없는 오류'));
      }
    } catch (error: any) {
      console.error('❌ issuepool DB 전체 데이터 API 호출 실패:', error);
      if (error.response) {
        console.error('응답 상태:', error.response.status);
        console.error('응답 데이터:', error.response.data);
      }
      alert('❌ issuepool DB 전체 데이터를 가져오는데 실패했습니다. 서버 연결을 확인해주세요.');
    } finally {
      setIsIssuepoolAllLoading(false);
    }
  };