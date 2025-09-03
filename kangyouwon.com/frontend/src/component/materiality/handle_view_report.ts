import axios from "axios";


// 지난 중대성 평가 목록 조회
export const handleViewReport = async (searchResult: any, setIsIssuepoolLoading: any, setIssuepoolData: any) => {
    if (!searchResult?.data) {
      alert('먼저 미디어 검색을 완료해주세요.');
      return;
    }

    // 디버깅: searchResult 구조 확인
    console.log('🔍 searchResult 전체 구조:', searchResult);
    console.log('🔍 searchResult.data 구조:', searchResult.data);

    // 데이터 구조 안전하게 확인
    const companyId = searchResult.data.company_id;
    const startDate = searchResult.data.search_period.start_date;
    const endDate = searchResult.data.search_period.end_date;

    console.log('🔍 추출된 데이터:', { companyId, startDate, endDate });

    if (!companyId || !startDate || !endDate) {
      console.error('필수 데이터 누락:', { companyId, startDate, endDate, searchResult });
      alert('검색 결과에서 필요한 데이터를 찾을 수 없습니다. 미디어 검색을 다시 실행해주세요.');
      return;
    }

    try {
      setIsIssuepoolLoading(true);
      
      const requestData = {
        company_id: companyId,
        report_period: {
          start_date: startDate,
          end_date: endDate
        },
        search_context: searchResult.data.search_context || {},
        request_type: 'issuepool_list',  // 필수 필드 추가
        timestamp: new Date().toISOString()  // 필수 필드 추가
      };

      console.log('지난 중대성 평가 목록 요청 데이터:', requestData);

      // Gateway를 통해 materiality-service 호출
      const gatewayUrl = 'https://gateway-production-4c8b.up.railway.app';
              const response = await axios.post(
        `${gatewayUrl}/api/v1/materiality-service/issuepool/list`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.data.success) {
        const issuepoolData = response.data.data;
        setIssuepoolData(issuepoolData);
        
        // localStorage에 지난 중대성 평가 목록 저장
        try {
          const dataToSave = {
            company_id: companyId,
            search_period: {
              start_date: startDate,
              end_date: endDate
            },
            timestamp: new Date().toISOString(),
            issuepool_data: issuepoolData
          };
          localStorage.setItem('materialitySearchResult', JSON.stringify(dataToSave));
          console.log('💾 지난 중대성 평가 목록 localStorage 저장 완료');
        } catch (storageError) {
          console.error('❌ 지난 중대성 평가 목록 localStorage 저장 실패:', storageError);
        }
        
        console.log('지난 중대성 평가 목록 조회 성공:', response.data);
      } else {
        alert('지난 중대성 평가 목록 조회에 실패했습니다: ' + response.data.message);
      }
    } catch (error) {
      console.error('지난 중대성 평가 목록 조회 오류:', error);
      alert('지난 중대성 평가 목록 조회 중 오류가 발생했습니다.');
    } finally {
      setIsIssuepoolLoading(false);
    }
  };