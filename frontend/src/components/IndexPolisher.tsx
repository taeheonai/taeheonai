// components/mg/IndexPolisher.tsx
"use client";
import { useEffect, useState, useRef } from "react";
import { fetchIndexQuestions, polishIndex, MGIndexBlock, MGQuestion } from "@/lib/mg";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuthStore } from "@/store/useAuthStore";
import { usePolishStore } from "@/store/polishStore";
import { useMGStore } from "@/store/mgStore";
import { safeTrim } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

type DisplayMode = 'table' | 'prose';

export default function IndexPolisher({
  categoryId, griIndex, sessionKey, threadId, corporationId, itemId, questions
}: { categoryId: number; griIndex: string; sessionKey: string; threadId?: string; corporationId?: number; itemId?: number; questions?: MGQuestion[] }) {
  const [block, setBlock] = useState<MGIndexBlock | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [displayMode, setDisplayMode] = useState<Record<string, DisplayMode>>({});
  const [polishedIndexText, setPolishedIndexText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // polishStore에서 저장된 답변과 윤문 결과 가져오기
  const { getPolishedItem, savePolishedItem } = usePolishStore();
  // MG 스토어에서 updateSingleIndexResult 함수와 이슈풀 정보 가져오기
  const { updateSingleIndexResult, selected, indexesByIssue } = useMGStore();
  const savedItem = getPolishedItem(griIndex);

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      let b: MGIndexBlock;
      
      // 전달받은 질문 데이터가 있으면 사용, 없으면 API 호출
      if (questions && questions.length > 0) {
        b = {
          gri_index: griIndex,
          questions: questions,
          item_id: itemId || 0
        };
        console.log(`✅ IndexPolisher: 전달받은 질문 ${questions.length}개 사용`);
      } else {
        b = await fetchIndexQuestions(categoryId, griIndex);
        console.log(`✅ IndexPolisher: API로 질문 ${b.questions.length}개 로드`);
      }
      
      setBlock(b);
      
      // 저장된 데이터 가져오기
      const saved = getPolishedItem(griIndex);
      
      const init: Record<string, string> = {};
      b.questions.forEach(q => { 
        const key = q.key_alpha ?? "";
        if (key) {
          // 저장된 답변이 있으면 불러오기
          init[key] = saved?.answers[key] || ""; 
          // 기본값으로 prose 모드 설정
          setDisplayMode(prev => ({ ...prev, [key]: 'prose' }));
        }
      });
      setAnswers(init);
      
      // 저장된 윤문 결과가 있으면 불러오기
      if (saved?.polished_text) {
        setPolishedIndexText(saved.polished_text);
      }
    };
    
    loadData();
  }, [categoryId, griIndex, questions]); // questions 의존성 추가

  // 디바운스 타이머를 위한 ref
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onChange = (k: string, v: string) => {
    const newAnswers = { ...answers, [k]: v };
    setAnswers(newAnswers);
    
    // 이전 타이머가 있으면 취소
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // 답변이 변경될 때마다 local storage에 저장 (디바운스 적용)
    saveTimeoutRef.current = setTimeout(() => {
      savePolishedItem({
        gri_index: griIndex,
        category_id: categoryId,
        polished_text: savedItem?.polished_text || "",
        answers: newAnswers,
        last_modified: new Date().toISOString(),
      });
    }, 500); // 500ms 디바운스
  };

  // 표 형식으로 변환
  function toMarkdownTable(answer: string) {
    const lines = answer
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((s) => safeTrim(s))
      .filter(Boolean);

    const rows: string[] = [];

    for (const raw of lines) {
      // 1. "항목: 값" 형식
      const colonMatch = raw.match(/^(.+?):\s*(.+)$/);
      if (colonMatch) {
        const [, key, value] = colonMatch;
        rows.push(`| ${safeTrim(key)} | ${safeTrim(value)} |`);
        continue;
      }

      // 2. "항목 값" 형식 (공백으로 첫 번째 단어와 나머지 구분)
      const spaceMatch = raw.match(/^(\S+)\s+(.+)$/);
      if (spaceMatch) {
        const [, key, value] = spaceMatch;
        rows.push(`| ${safeTrim(key)} | ${safeTrim(value)} |`);
        continue;
      }

      // 3. 단순 값 (키는 "항목 N"으로 자동 생성)
      rows.push(`| 항목 ${rows.length + 1} | ${safeTrim(raw)} |`);
    }

    if (!rows.length) return '';
    return ['| 항목 | 값 |', '| --- | --- |', ...rows].join('\n');
  }

  // 현재 표 모드로 선택된 답변들을 마크다운 테이블로 변환
  function buildTablesMarkdown() {
    if (!block) {
      console.log('🔍 buildTablesMarkdown: block이 없음');
      return '';
    }
    
    let md = '';
    let tableCount = 0;
    
    for (const q of block.questions) {
      const key = q.key_alpha ?? "";
      console.log(`🔍 질문 ${key}: displayMode=${displayMode[key]}, answer=${answers[key] ? '있음' : '없음'}`);
      
      if (displayMode[key] !== 'table') continue;
      const text = safeTrim(answers[key]);
      if (!text) continue;

      const table = toMarkdownTable(text);
      if (!table) continue;

      md += `\n\n#### ${griIndex}-${key}) ${q.question_text || ''}\n${table}\n`;
      tableCount++;
    }
    
    console.log(`🔍 buildTablesMarkdown 결과: ${tableCount}개 표 생성, md 길이: ${md.length}`);
    return safeTrim(md);
  }

  // 사용자와 회사 정보 가져오기
  const { user, company, fetchCompanyInfo } = useAuthStore();
  
  // 컴포넌트 마운트 시 회사 정보 조회
  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (user?.corporation_id && !company) {
        await fetchCompanyInfo();
        console.log('회사 정보 로드됨:', { corporationId: user.corporation_id });
      }
    };
    loadCompanyInfo();
  }, [user?.corporation_id, fetchCompanyInfo]); // user, company 제거

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const onPolish = async () => {
    if (isLoading) return; // 이미 로딩 중이면 중복 실행 방지
    
    setIsLoading(true);
    try {
      console.log("🔧 윤문 시작:", { griIndex, categoryId });
      
      // 기업 정보를 extra_meta에 포함
      const res = await polishIndex({
        session_key: sessionKey,
        category_id: categoryId,
        gri_index: griIndex,
        answers_by_key: answers,
        thread_id: threadId,
        corporation_id: corporationId,
        extra_meta: {
          corporation_id: user?.corporation_id,
          companyname: user?.companyname,  // 로그인 시 저장된 회사 이름
          company_context: "true",  // 기업 컨텍스트 활성화 플래그
          debug_info: `corporation_id: ${user?.corporation_id}, companyname: ${user?.companyname}, corporation_id: ${corporationId}`
        }
      });
      
      // 표 형식 답변과 윤문 답변 결합
      const tablesMd = buildTablesMarkdown();
      const combinedText = tablesMd 
        ? `${tablesMd}\n\n${res.polished_index_text || ""}`
        : res.polished_index_text || "";
        
      setPolishedIndexText(combinedText);
      
      // 윤문 결과를 local storage에 저장
      savePolishedItem({
        gri_index: griIndex,
        category_id: categoryId,
        polished_text: combinedText,
        answers: answers,
        last_modified: new Date().toISOString(),
      });

      // 해당 인덱스가 속한 이슈풀 찾기
      const issuePool = selected.find(issue => 
        indexesByIssue[issue.id]?.gri_indexes.some(idx => idx.gri_index === griIndex)
      );
      
      console.log('🔍 이슈풀 찾기 디버깅:', {
        griIndex,
        selected: selected.map(s => ({ id: s.id, issue_pool: s.issue_pool, esg_classification_id: s.esg_classification_id })),
        indexesByIssue: Object.keys(indexesByIssue),
        foundIssuePool: issuePool ? {
          id: issuePool.id,
          issue_pool: issuePool.issue_pool,
          esg_classification_id: issuePool.esg_classification_id
        } : null
      });
      
      // ESG 분류 ID: 데이터베이스 값 우선, 없으면 하드코딩 분류
      const getESGClassification = (issuePool: string, griIndex: string, dbEsgId?: number): number => {
        // 1. 데이터베이스에 esg_classification_id가 있으면 우선 사용
        if (dbEsgId && dbEsgId > 0) {
          console.log(`✅ 데이터베이스 ESG 분류 사용: ${dbEsgId} (${issuePool})`);
          return dbEsgId;
        }
        
        // 2. 데이터베이스 값이 없으면 GRI 인덱스 번호로 분류
        const griNumber = parseInt(griIndex.split('-')[0]);
        
        // GRI 300번대: 환경 (Environmental)
        if (griNumber >= 300 && griNumber < 400) {
          console.log(`🔍 GRI 번호로 환경 분류: ${griIndex} (${griNumber}번대)`);
          return 4;
        }
        // GRI 400번대: 사회 (Social)  
        else if (griNumber >= 400 && griNumber < 500) {
          console.log(`🔍 GRI 번호로 사회 분류: ${griIndex} (${griNumber}번대)`);
          return 1;
        }
        // GRI 200번대: 경제 (Governance)
        else if (griNumber >= 200 && griNumber < 300) {
          console.log(`🔍 GRI 번호로 거버넌스 분류: ${griIndex} (${griNumber}번대)`);
          return 2;
        }
        
        // 3. GRI 번호로도 분류되지 않으면 이슈풀 이름으로 분류
        const socialKeywords = ['고용', '노사', '공급망', '노동', '안전', '보건', '인재', '임직원', '제품안전', '품질'];
        const governanceKeywords = ['경쟁', '재무', '리스크', '관리'];
        const environmentKeywords = ['기후', '환경', '친환경', '원자재', '조달'];
        
        const issuePoolLower = issuePool.toLowerCase();
        
        // 환경(E) - 4
        if (environmentKeywords.some(keyword => issuePoolLower.includes(keyword))) {
          console.log(`🔍 이슈풀 이름으로 환경 분류: ${issuePool}`);
          return 4;
        }
        
        // 거버넌스(G) - 2 또는 3
        if (governanceKeywords.some(keyword => issuePoolLower.includes(keyword))) {
          console.log(`🔍 이슈풀 이름으로 거버넌스 분류: ${issuePool}`);
          return 2; // 기본적으로 2로 설정
        }
        
        // 사회(S) - 1 (기본값)
        console.log(`🔍 기본값으로 사회 분류: ${issuePool}`);
        return 1;
      };
      
      const esgClassificationId = getESGClassification(
        issuePool?.issue_pool || '', 
        griIndex, 
        issuePool?.esg_classification_id
      );
      
      console.log('✅ 윤문 완료:', {
        griIndex,
        issuePool: issuePool?.issue_pool,
        esgClassificationId
      });

      // MG 스토어에 윤문 결과와 ESG 정보 함께 저장
      updateSingleIndexResult(griIndex, {
        status: 'done',
        polished_text: combinedText,
        savedAt: new Date().toISOString(),
        category_id: categoryId,
        esg_classification_id: esgClassificationId,
      }, categoryId, esgClassificationId);
      
      // 윤문 완료 후 로컬스토리지 확인
      setTimeout(() => {
        const mgStore = JSON.parse(localStorage.getItem('taeheon-mg') || '{}');
        console.log('🔍 윤문 완료 후 MG Store 확인:', mgStore.state?.resultsByIndex);
        console.log('🔍 현재 GRI 인덱스 결과:', mgStore.state?.resultsByIndex?.[griIndex]);
      }, 1000);

    } catch (error) {
      console.error('❌ 윤문 처리 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!block) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      {/* 질문 입력 필드들 */}
      <div className="grid gap-4">
        {block.questions.map(q => {
          const key = q.key_alpha ?? "";
          const mode = displayMode[key] ?? 'prose';
          
          return (
            <div key={q.id} className="border rounded-xl p-4">
              <div className="flex items-start space-x-2">
                <span className="text-sm font-medium text-gray-700 mt-1">{q.key_alpha}.</span>
                <div className="flex-1">
                  {/* 표/윤문 선택 토글 */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">표/윤문</span>
                    <div className="inline-flex rounded-md overflow-hidden border">
                      <button
                        type="button"
                        onClick={() => setDisplayMode(m => ({ ...m, [key]: 'table' }))}
                        className={
                          mode === 'table'
                            ? 'px-2 py-1 text-xs bg-blue-600 text-white'
                            : 'px-2 py-1 text-xs bg-white text-gray-700 hover:bg-gray-50'
                        }
                      >
                        표
                      </button>
                      <button
                        type="button"
                        onClick={() => setDisplayMode(m => ({ ...m, [key]: 'prose' }))}
                        className={
                          mode === 'prose'
                            ? 'px-2 py-1 text-xs bg-blue-600 text-white'
                            : 'px-2 py-1 text-xs bg-white text-gray-700 hover:bg-gray-50'
                        }
                      >
                        윤문
                      </button>
                    </div>
                  </div>

                                     <div className="text-sm font-medium mb-2 whitespace-pre-line">{q.question_text}</div>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm"
                    rows={3}
                    value={answers[key] ?? ""}
                    onChange={(e) => onChange(key, e.target.value)}
                    placeholder={mode === 'table' 
                      ? "예시 형식:\n항목: 값\n키워드 나머지 설명\n단순 데이터" 
                      : "여기에 원문을 입력하세요"}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* intake_result 섹션 - Q 접두사 제거 */}
      <div className="border rounded-xl p-4 bg-gray-50">
        <div className="text-sm font-medium text-gray-700 mb-2">intake_result</div>
        <div className="text-sm text-gray-600">
          {polishedIndexText ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  table: props => (
                    <table className="min-w-full divide-y divide-gray-300 my-2">
                      {props.children}
                    </table>
                  ),
                  thead: props => (
                    <thead className="bg-gray-50">
                      {props.children}
                    </thead>
                  ),
                  th: props => (
                    <th className="py-1 px-3 text-left text-xs font-semibold text-gray-900">
                      {props.children}
                    </th>
                  ),
                  td: props => (
                    <td className="py-1 px-3 text-xs text-gray-500 border-t">
                      {props.children}
                    </td>
                  ),
                }}
              >
                {polishedIndexText}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="text-gray-400 italic">윤문 결과가 없습니다. 윤문을 실행해주세요.</div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-4">
        <button 
          className="px-4 py-2 font-medium rounded-xl transition-colors bg-gray-600 text-white hover:bg-gray-700"
        >
          <span className="flex items-center space-x-2">
            <span>💾</span>
            <span>저장</span>
          </span>
        </button>
        <button 
          onClick={onPolish}
          disabled={isLoading} 
          className={`px-4 py-2 font-medium rounded-xl transition-colors ${
            isLoading 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isLoading ? (
            <span className="flex items-center space-x-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>윤문 중...</span>
            </span>
          ) : (
            <span className="flex items-center space-x-2">
              <span>✨</span>
              <span>윤문 시작</span>
            </span>
          )}
        </button>
      </div>

      {/* 표 모드 미리보기 */}
      {buildTablesMarkdown() && (
        <div className="p-4 border-2 border-green-100 rounded-xl bg-green-50 mt-4">
          <div className="font-semibold text-lg text-green-900 mb-2">표 미리보기</div>
          <div className="prose prose-green max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: props => (
                  <table className="min-w-full divide-y divide-gray-300 my-4">
                    {props.children}
                  </table>
                ),
                thead: props => (
                  <thead className="bg-gray-50">
                    {props.children}
                  </thead>
                ),
                th: props => (
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-900">
                    {props.children}
                  </th>
                ),
                td: props => (
                  <td className="py-2 px-4 text-sm text-gray-500 border-t">
                    {props.children}
                  </td>
                ),
              }}
            >
              {buildTablesMarkdown()}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {polishedIndexText && (
        <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50 mt-6">
          <div className="font-semibold text-lg text-blue-900 mb-2">윤문 결과</div>
          <div className="prose prose-blue max-w-none">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: props => (
                  <table className="min-w-full divide-y divide-gray-300 my-4">
                    {props.children}
                  </table>
                ),
                thead: props => (
                  <thead className="bg-gray-50">
                    {props.children}
                  </thead>
                ),
                th: props => (
                  <th className="py-2 px-4 text-left text-sm font-semibold text-gray-900">
                    {props.children}
                  </th>
                ),
                td: props => (
                  <td className="py-2 px-4 text-sm text-gray-500 border-t">
                    {props.children}
                  </td>
                ),
              }}
            >
              {polishedIndexText}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
