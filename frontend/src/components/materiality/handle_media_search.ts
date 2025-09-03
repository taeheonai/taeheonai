import axios from "axios";

// 미디어 검색 데이터를 gateway로 전송하는 함수
export const handleMediaSearch = async (companyId: any, searchPeriod: any, setLoading: any, setSearchResult: any, setExcelFilename: any, setExcelBase64: any) => {
    try {
      // 입력값 검증
      if (!companyId) {
        alert('기업을 선택해주세요.');
        return;
      }
      
      if (!searchPeriod.start_date || !searchPeriod.end_date) {
        alert('보고기간을 설정해주세요.');
        return;
      }

      // 시작일이 종료일보다 늦은 경우 검증
      if (new Date(searchPeriod.start_date) > new Date(searchPeriod.end_date)) {
        alert('시작일은 종료일보다 빨라야 합니다.');
        return;
      }

      // 로딩 상태 시작
      setLoading(true);

      // JSON 데이터 구성
      const searchData = {
        company_id: companyId,
        report_period: {
          start_date: searchPeriod.start_date,
          end_date: searchPeriod.end_date
        },
        search_type: 'materiality_assessment',
        timestamp: new Date().toISOString()
      };

      console.log('🚀 미디어 검색 데이터를 Gateway로 전송:', searchData);

      // Gateway를 통해 materiality-service 호출
      const gatewayUrl = 'https://taeheonai-production-2130.up.railway.app';
      const response = await axios.post(
        `${gatewayUrl}/api/v1/materiality-service/search-media`, 
        searchData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      console.log('✅ Gateway 응답:', response.data);

      if (response.data.success) {
        // 검색 결과 저장
        setSearchResult(response.data);
        
        // 엑셀 파일 정보 추출
        if (response.data.excel_filename && response.data.excel_base64) {
          setExcelFilename(response.data.excel_filename);
          setExcelBase64(response.data.excel_base64);
        }
        
        alert(`✅ 미디어 검색이 완료되었습니다!\n\n기업: ${companyId}\n기간: ${searchPeriod.start_date} ~ ${searchPeriod.end_date}\n\n총 ${response.data.data?.total_results || 0}개의 뉴스 기사를 찾았습니다.`);
      } else {
        alert(`❌ 미디어 검색 요청 실패: ${response.data.message || '알 수 없는 오류'}`);
      }

    } catch (error: unknown) {
      console.error('❌ 미디어 검색 요청 실패:', error);
      
      // 에러 응답 처리
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string; detail?: string } } };
        if (axiosError.response?.data) {
          const errorData = axiosError.response.data;
          alert(`❌ 미디어 검색 요청 실패: ${errorData.message || errorData.detail || '알 수 없는 오류'}`);
        } else {
          alert('❌ 미디어 검색 요청에 실패했습니다. Gateway 서버 연결을 확인해주세요.');
        }
      } else {
        alert('❌ 미디어 검색 요청에 실패했습니다. Gateway 서버 연결을 확인해주세요.');
      }
    } finally {
      // 로딩 상태 종료
      setLoading(false);
    }
  };