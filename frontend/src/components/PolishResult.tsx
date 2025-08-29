'use client';

import React, { useCallback } from 'react';
import { usePolishStore } from '@/store/polishStore';
import { useShallow } from 'zustand/react/shallow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { filterMarkdown, KeepMode } from '@/lib/mdFilter';

interface PolishResultProps {
  sessionKey: string;
  griIndex: string;
  showSaveHint?: boolean;
  /** 표로 만든 마크다운을 윤문 결과 앞에 붙여서 렌더링 */
  prependMarkdown?: string;
  /** LLM 응답에서 어떤 부분을 보여줄지: 'tables' | 'prose' | 'both' | 'none' */
  keepFromLLM?: KeepMode | 'none';
  /** LLM 응답에서 제거할 질문/헤더 문구(요구사항 제목 등) */
  stripHeads?: string[];
}

/* ---------- 공통 상태 메시지 ---------- */
const StatusMessage = React.memo<{
  type: 'info' | 'warning' | 'error' | 'success' | 'loading';
  title: string;
  message: string;
  buttonText?: string;
  onButtonClick?: () => void;
  icon?: React.ReactNode;
}>(function StatusMessage({ type, title, message, buttonText, onButtonClick, icon }) {
  const getColorClasses = () => {
    switch (type) {
      case 'info': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'error': return 'bg-red-50 text-red-700 border-red-200';
      case 'success': return 'bg-green-50 text-green-700 border-green-200';
      case 'loading': return 'bg-gray-50 text-gray-600 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };
  const getButtonColor = () => {
    switch (type) {
      case 'info': return 'bg-blue-600 hover:bg-blue-700';
      case 'warning': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'error': return 'bg-red-600 hover:bg-red-700';
      case 'success': return 'bg-green-600 hover:bg-green-700';
      case 'loading': return 'bg-gray-600 hover:bg-gray-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };
  return (
    <div className={`p-4 border rounded-md ${getColorClasses()}`}>
      <div className="flex items-center space-x-2">
        {icon}
        <span className="font-medium">{title}</span>
      </div>
      <p className="whitespace-pre-line mt-2">{message}</p>
      {buttonText && onButtonClick && (
        <button
          onClick={onButtonClick}
          className={`mt-3 px-4 py-2 text-white text-sm rounded-md transition-colors ${getButtonColor()}`}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
});

/* ---------- 본 컴포넌트 ---------- */
export const PolishResult: React.FC<PolishResultProps> = ({
  sessionKey,
  griIndex,
  showSaveHint = false,
  prependMarkdown = '',
  keepFromLLM = 'both',
  stripHeads = [],
}) => {
  /* 셀렉터: 참조 안정화 */
  const { status, result, error, savedAt } = usePolishStore(
    useShallow((s) => ({
      status: s.status,
      result: s.result,
      error: s.error,
      savedAt: s.savedAt,
    })),
  );
  /* 액션은 별도 구독 */
  const fetchPolishResult = usePolishStore((s) => s.fetchPolishResult);

  /* 안전 호출 */
  const stableFetchPolishResult = useCallback(async () => {
    if (!sessionKey || !griIndex) return;
    try {
      await fetchPolishResult(sessionKey, griIndex);
    } catch (e) {
      console.error('윤문 결과 조회 실패:', e);
    }
  }, [sessionKey, griIndex, fetchPolishResult]);

  /* 테이블 마크다운 렌더링 스타일 */
  const markdownComponents = {
    table: ({ children, ...props }: React.ComponentProps<'table'>) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border border-gray-300 rounded-lg overflow-hidden" {...props}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...props }: React.ComponentProps<'thead'>) => (
      <thead className="bg-gray-50" {...props}>{children}</thead>
    ),
    tbody: ({ children, ...props }: React.ComponentProps<'tbody'>) => (
      <tbody className="bg-white" {...props}>{children}</tbody>
    ),
    tr: ({ children, ...props }: React.ComponentProps<'tr'>) => (
      <tr className="border-b border-gray-200" {...props}>{children}</tr>
    ),
    th: ({ children, ...props }: React.ComponentProps<'th'>) => (
      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700" {...props}>{children}</th>
    ),
    td: ({ children, ...props }: React.ComponentProps<'td'>) => (
      <td className="px-4 py-3 text-sm text-gray-900" {...props}>{children}</td>
    ),
  };

  /* 상태별 UI */
  if (status === 'loading') {
    return (
      <StatusMessage
        type="loading"
        title="윤문 결과를 불러오는 중..."
        message="잠시만 기다려주세요."
        icon={
          <svg className="h-5 w-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        }
      />
    );
  }

  if (status === 'error') {
    return (
      <StatusMessage
        type="error"
        title="오류가 발생했습니다"
        message={error || '알 수 없는 오류가 발생했습니다.'}
        buttonText="다시 시도"
        onButtonClick={stableFetchPolishResult}
        icon={
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  if (status === 'not_found') {
    return (
      <StatusMessage
        type="info"
        title="윤문 결과가 없습니다"
        message="해당 항목에 대한 윤문 결과가 존재하지 않습니다."
        buttonText="윤문 실행하기"
        onButtonClick={stableFetchPolishResult}
        icon={
          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  if (status === 'success' && result?.polished_text) {
    // 서버에서 내려오는 polished_text 형식에 따라 안전 파싱
    const raw = result.polished_text;

    // 본문/표 텍스트 분리
    let proseText = '';
    let tableText = '';

    if (typeof raw === 'string') {
      // 서버가 순수 마크다운 문자열을 줄 때
      proseText = raw;
    } else if (raw && typeof raw === 'object') {
      // { text, table, model, created_at, ... } 형태
      const obj = raw as Record<string, unknown>;
      proseText = String(obj.text ?? '');
      tableText = String(obj.table ?? '');
    }

    // 메타(모델/시간) 코드블록
    let metaJson = '';
    if (raw && typeof raw === 'object' && 'model' in raw) {
      const obj = raw as Record<string, unknown>;
      metaJson =
        '```json\n' +
        JSON.stringify(
          {
            model: obj.model,
            created_at: obj.created_at,
          },
          null,
          2,
        ) +
        '\n```';
    }

    // 표시 모드에 따라 LLM 내용 선택
    let contentToRender = '';
    if (keepFromLLM === 'tables' && tableText) {
      contentToRender = tableText;
    } else if (keepFromLLM === 'prose' && proseText) {
      contentToRender = proseText;
    } else if (keepFromLLM === 'both') {
      contentToRender = (tableText ? `${tableText}\n\n` : '') + proseText;
    } // 'none'이면 비움

    // 표(프론트 생성) + LLM 내용 + 메타 합치기
    const mergedMarkdown =
      (prependMarkdown?.trim() ? `${prependMarkdown.trim()}\n\n` : '') +
      (contentToRender ?? '') +
      (metaJson ? `\n\n${metaJson}` : '');

    // stripHeads/모드에 따른 필터링
    const filteredMarkdown =
      keepFromLLM === 'none' ? (prependMarkdown?.trim() ?? '') : filterMarkdown(mergedMarkdown, keepFromLLM, stripHeads);

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {filteredMarkdown || '_표시할 내용이 없습니다._'}
          </ReactMarkdown>
        </div>
        <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
          {savedAt && <p>저장 시간: {new Date(savedAt).toLocaleString()}</p>}
          {showSaveHint && <p className="text-blue-600">* 저장 후 GRI Report 페이지에서 확인할 수 있습니다</p>}
        </div>
      </div>
    );
  }

  // idle 및 그 외 안전 처리
  if (status === 'idle') {
    return (
      <StatusMessage
        type="info"
        title="윤문 결과 확인"
        message="윤문을 실행했거나 저장된 결과가 있는지 확인해보세요."
        buttonText="윤문 결과 확인하기"
        onButtonClick={stableFetchPolishResult}
        icon={
          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />
    );
  }

  // 폴백
  const polishedText =
    typeof result?.polished_text === 'string'
      ? result?.polished_text
      : JSON.stringify(result?.polished_text ?? {}, null, 2);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap">{polishedText}</div>
      </div>
      <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
        {savedAt && <p>저장 시간: {new Date(savedAt).toLocaleString()}</p>}
        {showSaveHint && <p className="text-blue-600">* 저장 후 GRI Report 페이지에서 확인할 수 있습니다</p>}
      </div>
    </div>
  );
};
