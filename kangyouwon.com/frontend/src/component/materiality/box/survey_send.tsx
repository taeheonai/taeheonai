'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ExcelRow } from '@/store/excelDataStore';

type StoredSurvey = {
  id: string;
  contentHash?: string;
  timestamp: string; // ISO
  categoryCount: number;
  isActive: boolean;
};

type SurveyManagementProps = {
  companyId: string;     // ✅ 회사별로 주입
  excelData: ExcelRow[];
  surveyResult?: any;    // 현재 활성 설문 결과
};

// ─────────────────────────────────────────────────────────────
// 회사별 LocalStorage 헬퍼
// ─────────────────────────────────────────────────────────────
const SURVEY_LIST_KEY = (companyId: string) => `surveyList_${companyId}`;
const SURVEY_SINGLE_KEY = (companyId: string) => `surveyData_${companyId}`;
const SELECTED_ID_KEY = (companyId: string) => `selectedSurveyId:${companyId}`; // 회사별
const LEGACY_SELECTED_ID_KEY = `selectedSurveyId`; // 하위 호환(전역 키)

const getSurveyList = (companyId: string): StoredSurvey[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SURVEY_LIST_KEY(companyId));
    const result = raw ? (JSON.parse(raw) as StoredSurvey[]) : [];
    console.log('🔍 getSurveyList 호출:', {
      companyId,
      key: SURVEY_LIST_KEY(companyId),
      raw,
      result
    });
    return result;
  } catch (error) {
    console.error('❌ getSurveyList 오류:', error);
    return [];
  }
};

const saveSurveyList = (companyId: string, list: StoredSurvey[]) => {
  if (typeof window === 'undefined') return;
  console.log('💾 saveSurveyList 호출:', {
    companyId,
    key: SURVEY_LIST_KEY(companyId),
    list
  });
  localStorage.setItem(SURVEY_LIST_KEY(companyId), JSON.stringify(list));
};

const setSelectedId = (companyId: string, surveyId: string) => {
      if (typeof window === 'undefined') return;
  // 회사별 키에 저장
  localStorage.setItem(SELECTED_ID_KEY(companyId), surveyId);
  // 하위 호환: 기존 전역 키도 함께 갱신(다른 화면이 아직 전역 키를 읽을 수 있으므로)
  localStorage.setItem(LEGACY_SELECTED_ID_KEY, surveyId);
};

const getSelectedId = (companyId: string): string | null => {
  if (typeof window === 'undefined') return null;
  // 회사별 키 우선
  const byCompany = localStorage.getItem(SELECTED_ID_KEY(companyId));
  if (byCompany) return byCompany;
  // 하위 호환: 전역 키
  const legacy = localStorage.getItem(LEGACY_SELECTED_ID_KEY);
  return legacy || null;
};

// ✅ 선택된 설문을 활성화로 표시(나머지는 비활성)
const markActiveSurvey = (companyId: string, activeId: string) => {
  if (typeof window === 'undefined') return;
  const list = getSurveyList(companyId);
  if (!list.length) return;
  const next = list.map(s => ({ ...s, isActive: s.id === activeId }));
  saveSurveyList(companyId, next);
};

const SurveyManagement: React.FC<SurveyManagementProps> = ({ companyId, excelData, surveyResult }) => {
  const [deadline, setDeadline] = useState('');

  const [surveyUrl, setSurveyUrl] = useState('');
  const [selectedSurveyId, setSelectedSurveyId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState({ total: 0, sent: 0, responded: 0, responseRate: 0 });
  const [sentSurveys, setSentSurveys] = useState<Array<{
    surveyId: string;
    sentAt: string;
    sentEmails: string[];
    totalSent: number;
  }>>([]);
  const [customEmailBody, setCustomEmailBody] = useState('');

  // 유효 이메일 계산 (현재 설문 대상자 목록만)
  const validEmails = useMemo(() => {
    if (typeof window === 'undefined') return [];
    
    // 설문 대상자 이메일만 사용 (발송 완료된 명단 제외)
    const targetEmails = (excelData || [])
      .map((r) => r.email?.trim())
      .filter((e): e is string => !!e && e.includes('@'));
    
    console.log('📧 이메일 계산 (대상자 목록만):', {
      targetEmails: targetEmails.length
    });
    
    return targetEmails;
  }, [excelData]);

  // 발송 완료된 명단 수 (survey_upload.tsx와 동일한 데이터 소스 사용)
  const sentRecipientsCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    
    try {
      const sentRecipients = localStorage.getItem('sentRecipients');
      if (sentRecipients) {
        const parsed = JSON.parse(sentRecipients);
        console.log('📧 발송 완료된 명단 수 계산:', parsed.length, '명');
        return parsed.length;
      }
    } catch (error) {
      console.error('발송 완료된 명단 수 계산 실패:', error);
    }
    
    return 0;
  }, [excelData]); // excelData가 변경될 때마다 재계산

  // 현재 문항수 계산 (survey_create.tsx와 동일한 로직 사용)
  const currentQuestionCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    
    try {
      // 1. localStorage에서 materialityAssessmentResult 확인
      const savedResult = localStorage.getItem('materialityAssessmentResult');
      if (savedResult) {
        const parsedResult = JSON.parse(savedResult);
        const displayCategoryCount = parsedResult.display_category_count;
        const categories = parsedResult.matched_categories || [];
        
        if (displayCategoryCount > 0) {
          console.log('📊 displayCategoryCount 기반 문항 수:', displayCategoryCount);
          return displayCategoryCount;
        } else if (categories.length > 0) {
          console.log('📊 categories 기반 문항 수:', categories.length);
          return categories.length;
        }
      }
      
      // 2. surveyResult prop에서 확인
      if (surveyResult) {
        // surveyResult에서 문항 수를 추출할 수 있는 방법이 있다면 사용
        console.log('📊 surveyResult 기반 문항 수 확인:', surveyResult);
      }
      
      // 3. 설문 리스트에서 활성 설문의 categoryCount 확인
      const list = getSurveyList(companyId);
      const active = list.find((s) => s.isActive);
      if (active && active.categoryCount > 0) {
        console.log('📊 설문 리스트 기반 문항 수:', active.categoryCount);
        return active.categoryCount;
      }
      
    } catch (error) {
      console.error('문항 수 계산 실패:', error);
    }
    
    return 0;
  }, [companyId, surveyResult]);

  // total 및 sent 업데이트
  useEffect(() => {
    setSendStatus((p) => ({ ...p, total: validEmails.length, sent: sentRecipientsCount }));
  }, [validEmails, sentRecipientsCount]);

  // localStorage 변경 감지 (storage 이벤트만 사용, 주기적 확인 제거)
  useEffect(() => {
      if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      // 다른 탭에서의 변경만 감지 (같은 탭에서는 storage 이벤트가 발생하지 않음)
      if (e.key === 'sentRecipients' || e.key === 'materialityAssessmentResult') {
        console.log('🔄 다른 탭에서 localStorage 변경 감지:', e.key);
      }
    };

    // storage 이벤트 리스너 등록 (다른 탭에서의 변경 감지만)
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

    // 발송된 설문 정보 로드 (컴포넌트 마운트 시 한 번만)
  useEffect(() => {
      if (typeof window === 'undefined') return;

    const loadSentSurveys = () => {
      try {
        const sentSurveyInfo = localStorage.getItem('sentSurveyInfo');
        if (sentSurveyInfo) {
          const parsed = JSON.parse(sentSurveyInfo);
          console.log('📧 발송된 설문 정보 로드:', parsed);
          
          setSentSurveys(prev => {
            const existingSurvey = prev.find(s => s.surveyId === parsed.surveyId);
            if (!existingSurvey) {
              return [...prev, {
                surveyId: parsed.surveyId,
                sentAt: parsed.sentAt,
                sentEmails: parsed.sentEmails || [],
                totalSent: parsed.sentEmails?.length || 0
              }];
            }
            return prev;
          });
            }
          } catch (error) {
        console.error('발송된 설문 정보 로드 실패:', error);
      }
    };
    
    loadSentSurveys();
  }, []); // 의존성 배열을 빈 배열로 변경하여 한 번만 실행

  // 초기 복원: 회사별 selectedSurveyId → 없으면 리스트/단건 → 마지막으로 전역키 fallback
  useEffect(() => {
      if (typeof window === 'undefined') return;

    const applySelected = (sid: string) => {
      const url = `${window.location.origin}/survey?id=${sid}`;
      setSelectedSurveyId(sid);
      setSurveyUrl(url);
      setSelectedId(companyId, sid); // 회사별+전역키 동기화
      markActiveSurvey(companyId, sid); // ✅ 초기 로드 시에도 활성 플래그 맞춤
    };

    // 1) 회사별 선택 키
    const selected = getSelectedId(companyId);
    if (selected) {
      applySelected(selected);
      return;
    }

    // 2) 리스트 기반(최신/활성 우선)
    const list = getSurveyList(companyId);
    if (list.length > 0) {
      applySelected(list.find((s) => s.isActive)?.id || list[0].id);
      return;
    }

    // 3) 단건(하위 호환)
    const singleRaw = localStorage.getItem(SURVEY_SINGLE_KEY(companyId));
    if (singleRaw) {
      try {
        const data = JSON.parse(singleRaw);
        if (data?.surveyId) {
          applySelected(data.surveyId);
      return;
        }
      } catch {}
    }

    // 4) 전역 선택 키(최후 fallback)
    const legacy = localStorage.getItem(LEGACY_SELECTED_ID_KEY);
    if (legacy) applySelected(legacy);
  }, [companyId]);

  // 외부 탭/화면에서 선택 변경될 수 있으니 주기적 동기화
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const tick = () => {
      const sid = getSelectedId(companyId);
      if (!sid) return;
      const url = `${window.location.origin}/survey?id=${sid}`;
      if (sid !== selectedSurveyId) setSelectedSurveyId(sid);
      if (url !== surveyUrl) setSurveyUrl(url);
    };
    // 실시간 db연결 해제
    // const id = setInterval(tick, 1000);
    // return () => clearInterval(id);
  }, [companyId, selectedSurveyId, surveyUrl]);

  // 발송 상태 계산 (현재 활성 설문 ID 기반)
  useEffect(() => {
    // 현재 활성 설문 ID와 일치하는 설문의 발송 개수만 계산
    const currentSurveySent = sentSurveys.find(s => s.surveyId === selectedSurveyId);
    const totalSent = currentSurveySent ? currentSurveySent.totalSent : 0;
    
    setSendStatus((p) => ({ ...p, sent: totalSent }));
    console.log('📊 발송 상태 업데이트 (현재 활성 설문 기준):', { 
      selectedSurveyId, 
      totalSent, 
      currentSurveySent,
      allSurveys: sentSurveys.length 
    });
  }, [sentSurveys, selectedSurveyId]);

  // 선택된 설문 ID가 변경될 때 발송 현황 업데이트
  useEffect(() => {
    if (selectedSurveyId && sentSurveys.length > 0) {
      const currentSurveySent = sentSurveys.find(s => s.surveyId === selectedSurveyId);
      if (currentSurveySent) {
        console.log('📊 현재 선택된 설문 발송 현황:', {
          selectedSurveyId,
          currentSurveySent,
          totalSent: currentSurveySent.totalSent
        });
      }
    }
  }, [selectedSurveyId, sentSurveys]);

  // 응답률 계산
  useEffect(() => {
    const responseRate =
      sendStatus.total > 0 ? Math.round((sendStatus.responded / sendStatus.total) * 100) : 0;
    setSendStatus((p) => ({ ...p, responseRate }));
  }, [sendStatus.responded, sendStatus.total]);

  // 기업명 추출 (미디어 검색에서 선택된 기업명 사용)
  const companyName = useMemo(() => {
    if (typeof window === 'undefined') return '기업';
    
    try {
      // 미디어 검색에서 저장된 기업명 가져오기
      const savedSearch = localStorage.getItem('savedMediaSearch');
      if (savedSearch) {
        const savedData = JSON.parse(savedSearch);
        return savedData.company_id || '기업';
      }
      
      // 대안: 현재 선택된 기업 ID가 있다면 사용
      if (companyId && companyId !== '') {
        return companyId;
      }
      
      return '기업';
    } catch (error) {
      console.error('기업명을 가져오는 중 오류 발생:', error);
      return '기업';
    }
  }, [companyId]);

  // 메일 제목 생성
  const emailSubject = useMemo(() => {
    return `[${companyName}] 중대성 평가 설문`;
  }, [companyName]);

  // 기본 메일 본문 템플릿 생성 (편집용 - URL과 마감일 제외)
  const generateDefaultEmailBody = useMemo(() => {
    return [
      '{이름}님께,',
      '',
      '안녕하세요. ESG 중대성 평가 설문에 참여 부탁드립니다.',
      '',
      '• 설문 링크: [자동 삽입]',
      '• 응답 마감: [자동 삽입]',
      '',
      '※ 메일을 전송받은 이메일로 응답하실 수 있습니다.',
      '바쁘시겠지만 소중한 의견 부탁드립니다. 감사합니다.',
    ].join('\n');
  }, []);

  // 사용자 정의 메일 본문 초기화 및 설문 링크 자동 업데이트
  useEffect(() => {
    if (!customEmailBody && generateDefaultEmailBody) {
      setCustomEmailBody(generateDefaultEmailBody);
    }
  }, [generateDefaultEmailBody, customEmailBody]);



  // 미리보기용 메일 본문 생성 (URL과 마감일 자동 삽입)
  const generatePreviewEmailBody = useMemo(() => {
    if (!customEmailBody) return '';
    
    const deadlineText = deadline
      ? new Date(deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
      : '미정';
    
    // 현재 활성 설문 URL 가져오기
    let currentSurveyUrl = surveyUrl;
    if (!currentSurveyUrl && typeof window !== 'undefined') {
      const list = getSurveyList(companyId);
      const activeSurvey = list.find(s => s.isActive);
      if (activeSurvey) {
        currentSurveyUrl = `${window.location.origin}/survey?id=${activeSurvey.id}`;
      }
    }
    
    let previewBody = customEmailBody;
    
    // [자동 삽입] 부분을 실제 값으로 교체
    previewBody = previewBody.replace('• 설문 링크: [자동 삽입]', `• 설문 링크: ${currentSurveyUrl || '(미선택)'}`);
    previewBody = previewBody.replace('• 응답 마감: [자동 삽입]', `• 응답 마감: ${deadlineText}`);
    
    return previewBody;
  }, [customEmailBody, deadline, surveyUrl, companyId]);

  // 메일 본문 미리보기 (첫 번째 수신자 기준)
  const emailBodyPreview = useMemo(() => {
    if (!generatePreviewEmailBody || validEmails.length === 0) return '';
    
    const firstRecipient = excelData.find(row => row.email === validEmails[0]);
    const previewName = firstRecipient?.name || '담당자';
    
    return generatePreviewEmailBody.replace('{이름}', previewName);
  }, [generatePreviewEmailBody, validEmails, excelData]);

  const isSendReady = !!surveyUrl && validEmails.length > 0;

  // 이메일 발송
  const handleSendEmails = async () => {
    if (!isSendReady) {
      alert('❌ 발송 조건이 충족되지 않았습니다.\n\n설문 링크/대상 이메일을 확인하세요.');
      return;
    }
    setIsLoading(true);
    try {
      // 개인화된 메일 본문 생성 (미리보기용 본문 사용)
      const personalizedEmails = validEmails.map(email => {
        const recipient = excelData.find(row => row.email === email);
        const recipientName = recipient?.name || '담당자';
        const personalizedBody = generatePreviewEmailBody.replace('{이름}', recipientName);
        
        return {
          email: email,
          name: recipientName,
          body: personalizedBody
        };
      });

      const payload = {
        to_emails: validEmails,
        survey_url: surveyUrl,      // ✅ 선택된 버전 링크
        survey_title: emailSubject, // ✅ 동적 기업명이 포함된 제목
        deadline: deadline || null,
        personalized_emails: personalizedEmails,  // 개인화된 이메일 데이터
        company_id: companyId,      // (선택) 서버 로깅/템플릿 분기용
      };

      const resp = await fetch('/api/v1/materiality-service/email/send-survey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(`이메일 발송 실패: ${resp.status} ${resp.statusText}\n${err.message || ''}`);
      }

      const result = await resp.json();
      if (!result.success) throw new Error(result.message || '이메일 발송에 실패했습니다.');

      // 현재 활성 설문 ID 가져오기 (여러 소스에서 확인)
      let currentSurveyId = selectedSurveyId;
      
      // 1. surveyResult prop에서 확인
      if (surveyResult?.survey_id) {
        currentSurveyId = surveyResult.survey_id;
      }
      // 2. localStorage에서 현재 활성 설문 확인
      else if (typeof window !== 'undefined') {
        const list = getSurveyList(companyId);
        const activeSurvey = list.find(s => s.isActive);
        if (activeSurvey) {
          currentSurveyId = activeSurvey.id;
        }
      }
      
      const currentSurveyUrl = `${window.location.origin}/survey?id=${currentSurveyId}`;
      
      console.log('🔍 현재 활성 설문 ID 확인:', {
        surveyResultId: surveyResult?.survey_id,
        selectedSurveyId: selectedSurveyId,
        finalCurrentSurveyId: currentSurveyId
      });
      
      // 발송된 설문 정보를 localStorage에 저장 (survey_result.tsx, final_issuepool.tsx에서 사용)
      const sentSurveyInfo = {
        surveyId: currentSurveyId,
        surveyUrl: currentSurveyUrl,
        sentAt: new Date().toISOString(),
        companyId: companyId,
        sentEmails: validEmails,
        totalSent: validEmails.length,
        totalTargets: validEmails.length // 총 발송 대상자 수
      };
      localStorage.setItem('sentSurveyInfo', JSON.stringify(sentSurveyInfo));
      console.log('💾 발송된 설문 정보 저장 (현재 활성 설문):', sentSurveyInfo);
      
      // final_issuepool.tsx용 발송 현황 정보 저장
      const surveyStatsInfo = {
        totalTargets: validEmails.length,
        totalSent: validEmails.length,
        sentEmails: validEmails,
        lastSentAt: new Date().toISOString(),
        companyId: companyId
      };
      localStorage.setItem('surveyStatsInfo', JSON.stringify(surveyStatsInfo));
      console.log('💾 설문 통계 정보 저장 (final_issuepool.tsx용):', surveyStatsInfo);
      
      // 발송된 설문 정보를 상태에 추가 (ID별 누적 관리)
      setSentSurveys(prev => {
        const existingIndex = prev.findIndex(s => s.surveyId === currentSurveyId);
        if (existingIndex >= 0) {
          // 기존 설문이 있으면 발송 개수 누적
          const updated = [...prev];
          const existingEmails = updated[existingIndex].sentEmails;
          const newEmails = validEmails.filter(email => !existingEmails.includes(email)); // 중복 제거
          
          updated[existingIndex] = {
            ...updated[existingIndex],
            sentEmails: [...existingEmails, ...newEmails], // 새로운 이메일만 추가
            totalSent: existingEmails.length + newEmails.length, // 누적 카운트
            sentAt: sentSurveyInfo.sentAt // 최신 발송 시간으로 업데이트
          };
          
          console.log('📊 기존 설문 발송 개수 누적:', {
            surveyId: currentSurveyId,
            기존발송: existingEmails.length,
            새로발송: newEmails.length,
            총발송: updated[existingIndex].totalSent
          });
          
          return updated;
        } else {
          // 새로운 설문 추가 (기존 설문들 초기화)
          console.log('📊 새로운 설문 추가, 기존 설문들 초기화:', {
            newSurveyId: currentSurveyId,
            previousSurveys: prev.length
          });
          
          return [{
            surveyId: currentSurveyId,
            sentAt: sentSurveyInfo.sentAt,
            sentEmails: validEmails,
            totalSent: validEmails.length
          }];
        }
      });
      
      // 발송 상태는 useEffect에서 sentSurveys 기반으로 자동 업데이트됨
      
      // 발송 완료된 명단을 localStorage에 저장
      const sentRecipientsData = excelData.filter((row: any) => 
        validEmails.includes(row.email)
      );
      
      // 기존 발송 완료 명단에 추가 (중복 제거)
      const existingSentRecipients = JSON.parse(localStorage.getItem('sentRecipients') || '[]');
      const existingEmails = existingSentRecipients.map((r: any) => r.email);
      const newRecipients = sentRecipientsData.filter((r: any) => !existingEmails.includes(r.email));
      const updatedSentRecipients = [...existingSentRecipients, ...newRecipients];
      localStorage.setItem('sentRecipients', JSON.stringify(updatedSentRecipients));
      
      // 발송된 대상자들을 설문 대상자 목록에서 제거
      const remainingRecipients = excelData.filter((row: any) => 
        !validEmails.includes(row.email)
      );
      
      // excelUploadData 키로 저장 (survey_upload.tsx와 동일한 키 사용)
      const dataToSave = {
        excelData: remainingRecipients,
        isValid: true, // 발송이 성공했으므로 유효한 데이터
        fileName: 'survey_recipients',
        base64Data: null
      };
      localStorage.setItem('excelUploadData', JSON.stringify(dataToSave));
      
      console.log('💾 발송 완료 명단 저장:', {
        기존: existingSentRecipients.length,
        새로추가: newRecipients.length,
        총합: updatedSentRecipients.length
      });
      
      console.log('🔄 설문 대상자 목록 업데이트:', {
        발송전: excelData.length,
        발송된수: validEmails.length,
        남은수: remainingRecipients.length
      });

      // 설문 발송 완료 이벤트 발생
      const surveySentEvent = new CustomEvent('surveySent', {
        detail: {
          sentEmails: validEmails,
          excelData: remainingRecipients, // 업데이트된 설문 대상자 목록
          originalExcelData: excelData, // 원본 데이터 (참고용)
          surveyUrl: surveyUrl,
          companyId: companyId,
          sentSurveyInfo: sentSurveyInfo,
          sentRecipientsData: sentRecipientsData
        }
      });
      window.dispatchEvent(surveySentEvent);
      
      alert(
        `✅ 이메일 발송 완료!\n\n📧 ${validEmails.length}명에게 설문 링크가 발송되었습니다.\n\n📋 설문 URL:\n${surveyUrl}\n\n${result.message || ''}`
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류가 발생했습니다';
      alert(`❌ 이메일 발송에 실패했습니다.\n\n오류: ${msg}`);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };



  // 설문 버전 선택 UI(회사별 리스트 ≤ 3개, 없으면 단건 키 fallback)
  const renderSurveyVersionPicker = () => {
    if (typeof window === 'undefined') {
      return <div className="text-sm text-blue-600 text-center py-4">먼저 "설문 생성하기"에서 설문을 생성해주세요.</div>;
    }

    let list = getSurveyList(companyId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 3);

    console.log('📋 설문 리스트 로드:', {
      companyId,
      listLength: list.length,
      list: list.map(s => ({ id: s.id, categoryCount: s.categoryCount, isActive: s.isActive })),
      rawList: list
    });

    if (list.length === 0) {
      const raw = localStorage.getItem(SURVEY_SINGLE_KEY(companyId));
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d?.surveyId) {
            list = [
              {
                id: d.surveyId,
                contentHash: d.contentHash,
                timestamp: d.timestamp,
                categoryCount: d.categoryCount || 0,
                isActive: true,
              },
            ];
          }
        } catch {}
      }
    }

    if (list.length === 0) {
      return <div className="text-sm text-blue-600 text-center py-4">먼저 "설문 생성하기"에서 설문을 생성해주세요.</div>;
    }

    return (
      <div className="space-y-2">
        {list.map((survey) => {
          const url = `${window.location.origin}/survey?id=${survey.id}`;
          const isSelected = surveyUrl === url;
          return (
            <div
              key={survey.id}
              onClick={() => {
                setSelectedSurveyId(survey.id);
                setSurveyUrl(url);
                setSelectedId(companyId, survey.id); // ✅ 회사별 선택 반영(+전역키 동기화)
                markActiveSurvey(companyId, survey.id); // ✅ 활성 플래그 갱신
                
                // survey_result.tsx에서 사용할 수 있도록 설문 결과 정보 업데이트
                const updatedSurveyResult = {
                  survey_id: survey.id,
                  content_hash: survey.contentHash,
                  created_at: survey.timestamp,
                  categoryCount: survey.categoryCount,
                  isActive: true
                };
                
                // localStorage에 저장하여 survey_result.tsx에서 사용할 수 있도록 함
                localStorage.setItem('surveyResult', JSON.stringify(updatedSurveyResult));
                console.log('🔄 설문 결과 정보 업데이트:', updatedSurveyResult);
                
                // survey_result.tsx에 변경 알림을 위한 커스텀 이벤트 발생
                const surveySelectedEvent = new CustomEvent('surveySelected', {
                  detail: {
                    surveyId: survey.id,
                    surveyResult: updatedSurveyResult
                  }
                });
                window.dispatchEvent(surveySelectedEvent);
              }}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                isSelected ? 'bg-blue-100 border-blue-300' : 'bg-white border-gray-200 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <input type="radio" checked={isSelected} onChange={() => {}} className="text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {survey.categoryCount}개 문항
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(survey.timestamp).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                    v{survey.contentHash?.substring(0, 4) || '0000'}
                  </span>
                                                {(survey.isActive || isSelected) && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">활성</span>
                              )}
                </div>
              </div>
              <div className="mt-2 font-mono text-[11px] text-gray-600 break-all">{url}</div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div id="survey-send" className="bg-white rounded-xl shadow-lg p-6 mb-12">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">📝 설문 발송</h2>
      
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-green-800">설문 발송하기</h3>
              <p className="text-green-600 text-sm">설문을 대상 기업들에게 발송하세요</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {/* 설정 카드 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-semibold text-gray-900 mb-2">📧 발송 설정</h4>
              <div className="space-y-3">



                
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-1">응답 마감일</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm font-bold text-gray-900"
                    style={{ color: deadline ? '#1f2937' : '#9ca3af' }}
                  />
                  {deadline && (
                    <div className="mt-2 text-xs text-green-600 font-medium">
                      ✅ 설정된 마감일: {new Date(deadline).toLocaleDateString('ko-KR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                      })}
                    </div>
                  )}
                </div>

                {/* 설문 버전 선택 */}
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    설문 버전 선택
                  </h4>
                  {renderSurveyVersionPicker()}
                </div>

                {/* 메일 본문 편집 및 미리보기 */}
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <label className="block text-sm font-bold text-amber-900 mb-1">✉️ 메일 본문 편집</label>
                  <div className="text-sm font-medium text-amber-800 mb-2">
                    메일 본문을 수정할 수 있습니다. {`{이름}`}은 각 수신자 이름으로 자동 치환됩니다.
                    <br />
                    <span className="text-amber-700 font-semibold">※ "[자동 삽입]" 부분은 실제 URL과 마감일로 자동 교체됩니다.</span>
                  </div>
                  
                  {/* 자동 업데이트되는 항목들 표시 */}
                  <div className="mb-3 space-y-2">
                    {/* 설문 링크 정보 */}
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-xs text-blue-800 font-medium mb-1">🔗 "[자동 삽입]" → 실제 설문 링크:</div>
                      <div className="text-xs font-mono text-blue-700 break-all bg-white p-2 rounded border">
                        {surveyUrl || '(설문을 선택해주세요)'}
                      </div>
                    </div>
                    
                    {/* 응답 마감일 정보 */}
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <div className="text-xs text-green-800 font-medium mb-1">📅 "[자동 삽입]" → 실제 응답 마감일:</div>
                      <div className="text-xs font-mono text-green-700 bg-white p-2 rounded border">
                        {deadline 
                          ? new Date(deadline).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
                          : '미정'
                        }
                      </div>
                    </div>
                  </div>
                  
                  <textarea 
                    value={customEmailBody}
                    onChange={(e) => setCustomEmailBody(e.target.value)}
                    className="w-full h-40 text-sm font-medium text-gray-900 bg-white border-2 border-amber-300 rounded p-3 leading-relaxed resize-y"
                    placeholder="메일 본문을 입력하세요..."
                  />
                  
                  {/* 미리보기 섹션 */}
                  {validEmails.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-amber-300">
                      <div className="text-sm font-medium text-amber-800 mb-2">
                        📋 미리보기 (첫 번째 수신자: {excelData.find(row => row.email === validEmails[0])?.name || '담당자'})
                      </div>
                      <div className="bg-white border border-amber-300 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto">
                        {emailBodyPreview}
                      </div>
                    </div>
                  )}
                </div>

                {/* 선택된 설문 URL */}
                {surveyUrl && (
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <div className="text-xs text-gray-600">
                      <div className="font-medium mb-1">선택된 설문 URL:</div>
                      <div className="font-mono bg-white p-2 rounded border border-gray-300 break-all">{surveyUrl}</div>
                    </div>
                  </div>
                )}

                {/* 업로드된 이메일 정보 */}
                <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                  <label className="block text-sm font-semibold text-purple-900 mb-1">📧 발송 대상 이메일</label>
                  {validEmails.length > 0 ? (
                    <div className="text-xs text-purple-600">
                      총 {validEmails.length}개의 유효한 이메일이 준비되었습니다.
                      {excelData.slice(0, 3).map((row, i) => (
                        <div key={i} className="mt-1">• {row.company || '회사명 없음'}: {row.email || '이메일 없음'}</div>
                      ))}
                      {validEmails.length > 3 && (
                        <div className="mt-1 text-purple-500">... 외 {validEmails.length - 3}개 더</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-600">엑셀에서 유효 이메일을 업로드/확인하세요.</div>
                  )}
                </div>

                {/* 메일 제목 미리보기 */}
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <label className="block text-sm font-bold text-blue-900 mb-1">📧 메일 제목</label>
                  <div className="text-sm font-medium text-blue-800 mb-2">
                    {companyName !== '기업'
                      ? `미디어 검색에서 선택된 기업명(${companyName})이 자동으로 포함됩니다.`
                      : '미디어 검색에서 기업을 선택하면 제목에 기업명이 포함됩니다.'
                    }
                  </div>
                  <div className="bg-white border-2 border-blue-300 rounded p-3">
                    <div className="text-sm font-bold text-gray-900">{emailSubject}</div>
                  </div>
                </div>
              </div>
            </div>
            
                        {/* 현황 카드 */}
            <div className="bg-white rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-gray-800 mb-2">📊 발송 현황</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• 대상 이메일: {sendStatus.total}개</p>
                <p>• 현재 활성 설문 발송: {sendStatus.sent}개</p>
                {selectedSurveyId && (
                  <p className="text-xs text-blue-600 font-mono">• 활성 설문 ID: {selectedSurveyId}</p>
                )}
              </div>
              
              {/* 발송된 설문별 누적 현황 */}
              {sentSurveys.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">📋 발송된 설문별 현황</h5>
                  <div className="space-y-2">
                    {sentSurveys.map((survey, index) => {
                      const isCurrentSurvey = survey.surveyId === selectedSurveyId;
                      const isActiveSurvey = survey.surveyId === selectedSurveyId;
                      return (
                        <div key={survey.surveyId} className={`rounded p-3 text-xs ${
                          isCurrentSurvey ? 'bg-blue-50 border-2 border-blue-300' : 'bg-gray-50'
                        }`}>
                          <div className="flex flex-col space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <span className={`font-medium ${
                                  isCurrentSurvey ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  설문 {index + 1}
                                  {isCurrentSurvey && <span className="ml-2 text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded-full">현재 선택</span>}
                                  {isActiveSurvey && !isCurrentSurvey && <span className="ml-2 text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">활성 설문</span>}
                                </span>
                              </div>
                              <span className={`px-2 py-1 rounded-full flex-shrink-0 ${
                                isCurrentSurvey ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {survey.totalSent}개 발송
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className={`font-mono break-all ${
                                  isCurrentSurvey ? 'text-blue-600' : 'text-gray-600'
                                }`}>
                                  ID: {survey.surveyId}
                                </div>
                              </div>
                              <span className={`ml-2 flex-shrink-0 ${
                                isCurrentSurvey ? 'text-blue-500' : 'text-gray-500'
                              }`}>
                                {new Date(survey.sentAt).toLocaleDateString('ko-KR')}
                              </span>
                            </div>
                          </div>
                </div>
                      );
                    })}
                </div>
              </div>
              )}

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${surveyUrl ? 'bg-green-500' : 'bg-red-500'}`} />
                    설문 링크: {surveyUrl ? '준비 완료' : '미선택'}
                  </div>
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${sendStatus.total > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                    이메일 목록: {sendStatus.total > 0 ? `${sendStatus.total}개 준비 완료` : '미업로드'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex justify-center">
              <button
                onClick={handleSendEmails}
                disabled={isLoading || !isSendReady}
                className={`w-full max-w-md font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center ${
                  isLoading || !isSendReady ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
                title={
                  isLoading
                    ? '발송 중입니다...'
                    : isSendReady
                    ? '선택된 버전 링크로 개인화된 이메일을 발송합니다'
                    : '설문 링크/이메일 목록을 준비하세요'
                }
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    발송 중...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    설문 발송하기
                  </>
                )}
              </button>
            </div>
            
            {/* 준비 체크 표시 */}
            {!isSendReady && (
              <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                📋 발송 준비 체크: {surveyUrl ? '링크✅ ' : '링크❌ '} /{' '}
                {validEmails.length > 0 ? `이메일✅(${validEmails.length})` : '이메일❌'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyManagement;
