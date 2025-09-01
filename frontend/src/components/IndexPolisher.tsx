// components/mg/IndexPolisher.tsx
"use client";
import { useEffect, useState } from "react";
import { fetchIndexQuestions, polishIndex, MGIndexBlock } from "@/lib/mg";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuthStore } from "@/store/useAuthStore";
import { usePolishStore } from "@/store/polishStore";

type DisplayMode = 'table' | 'prose';

export default function IndexPolisher({
  categoryId, griIndex, sessionKey, threadId, corporationId
}: { categoryId: number; griIndex: string; sessionKey: string; threadId?: string; corporationId?: number }) {
  const [block, setBlock] = useState<MGIndexBlock | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [displayMode, setDisplayMode] = useState<Record<string, DisplayMode>>({});
  const [polishedIndexText, setPolishedIndexText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // polishStore에서 저장된 답변과 윤문 결과 가져오기
  const { getPolishedItem, savePolishedItem } = usePolishStore();
  const savedItem = getPolishedItem(griIndex);

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      const b = await fetchIndexQuestions(categoryId, griIndex);
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
  }, [categoryId, griIndex, getPolishedItem]);

  const onChange = (k: string, v: string) => {
    const newAnswers = { ...answers, [k]: v };
    setAnswers(newAnswers);
    
    // 답변이 변경될 때마다 local storage에 저장
    savePolishedItem({
      gri_index: griIndex,
      category_id: categoryId,
      polished_text: savedItem?.polished_text || "",
      answers: newAnswers,
      last_modified: new Date().toISOString(),
    });
  };

  // 표 형식으로 변환
  function toMarkdownTable(answer: string) {
    const lines = answer
      .replace(/\r\n/g, '\n')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const rows: string[] = [];

    for (const raw of lines) {
      // 1. "항목: 값" 형식
      const colonMatch = raw.match(/^(.+?):\s*(.+)$/);
      if (colonMatch) {
        const [, key, value] = colonMatch;
        rows.push(`| ${key.trim()} | ${value.trim()} |`);
        continue;
      }

      // 2. "항목 값" 형식 (공백으로 첫 번째 단어와 나머지 구분)
      const spaceMatch = raw.match(/^(\S+)\s+(.+)$/);
      if (spaceMatch) {
        const [, key, value] = spaceMatch;
        rows.push(`| ${key.trim()} | ${value.trim()} |`);
        continue;
      }

      // 3. 단순 값 (키는 "항목 N"으로 자동 생성)
      rows.push(`| 항목 ${rows.length + 1} | ${raw.trim()} |`);
    }

    if (!rows.length) return '';
    return ['| 항목 | 값 |', '| --- | --- |', ...rows].join('\n');
  }

  // 현재 표 모드로 선택된 답변들을 마크다운 테이블로 변환
  function buildTablesMarkdown() {
    if (!block) return '';
    let md = '';
    for (const q of block.questions) {
      const key = q.key_alpha ?? "";
      if (displayMode[key] !== 'table') continue;
      const text = answers[key]?.trim();
      if (!text) continue;

      const table = toMarkdownTable(text);
      if (!table) continue;

      md += `\n\n#### ${griIndex}-${key}) ${q.text || ''}\n${table}\n`;
    }
    return md.trim();
  }

  // 사용자와 회사 정보 가져오기
  const { user, company, fetchCompanyInfo } = useAuthStore();
  
  // 컴포넌트 마운트 시 회사 정보 조회
  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (user?.corporation_id) {
        await fetchCompanyInfo();
        console.log('회사 정보 로드됨:', { user, company });
      }
    };
    loadCompanyInfo();
  }, [user?.corporation_id, fetchCompanyInfo]);

  const onPolish = async () => {
    setIsLoading(true);
    try {
      console.log("Polishing with user context:", { user, corporationId });
      
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
          corporation_name: user?.corporation_name,  // 로그인 시 저장된 회사 이름
          company_context: "true",  // 기업 컨텍스트 활성화 플래그
          debug_info: `corporation_id: ${user?.corporation_id}, corporation_name: ${user?.corporation_name}, corporation_id: ${corporationId}`
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
    } catch (error) {
      console.error('윤문 처리 중 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!block) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
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

                  <div className="text-sm font-medium mb-2">{q.text}</div>
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

      <div className="flex justify-end mt-4">
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
