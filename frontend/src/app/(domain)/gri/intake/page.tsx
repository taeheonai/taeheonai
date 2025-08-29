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
  /** 앞에 붙일 표(마크다운) */
  prependMarkdown?: string;
  /** LLM 응답에서 무엇을 보일지 */
  keepFromLLM?: KeepMode | 'none';
  /** 제거할 헤더/질문 문구 */
  stripHeads?: string[];
}

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

export const PolishResult: React.FC<PolishResultProps> = ({
  sessionKey,
  griIndex,
  prependMarkdown = '',
  keepFromLLM = 'both',
  stripHeads = []
}) => {
  const { status, result, error, savedAt } = usePolishStore(
    useShallow(s => ({
      status: s.status,
      result: s.result,
      error: s.error,
      savedAt: s.savedAt,
    }))
  );
  const fetchPolishResult = usePolishStore(s => s.fetchPolishResult);

  const stableFetchPolishResult = useCallback(async () => {
    if (!sessionKey || !griIndex) return;
    try {
      await fetchPolishResult(sessionKey, griIndex);
    } catch (e) {
      console.error('윤문 결과 조회 실패:', e);
    }
  }, [sessionKey, griIndex, fetchPolishResult]);

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
    const raw = result.polished_text;

    // 본문 분리
    let proseText = '';
    let tableText = '';
    if (typeof raw === 'string') {
      proseText = raw;
    } else if (raw && typeof raw === 'object') {
      const rawObj = raw as Record<string, unknown>;
      proseText = String(rawObj.text || '');
      tableText = String(rawObj.table || '');
    }

    // 메타 정보(코드블럭)
    let metaJson = '';
    if (raw && typeof raw === 'object' && 'model' in raw) {
      const rawObj = raw as Record<string, unknown>;
      metaJson =
        '```json\n' +
        JSON.stringify({ model: rawObj.model, created_at: rawObj.created_at }, null, 2) +
        '\n```';
    }

    // ⬇️ 핵심 수정: 필터는 LLM 내용에만 적용 (prependMarkdown은 그대로 둠)
    let llmMarkdown = '';
    if (keepFromLLM === 'none') {
      llmMarkdown = '';
    } else {
      const contentToRender =
        keepFromLLM === 'tables'
          ? tableText
          : keepFromLLM === 'prose'
          ? proseText
          : (tableText ? tableText + '\n\n' : '') + proseText; // both
      llmMarkdown = filterMarkdown(contentToRender, keepFromLLM, stripHeads);
    }

    // 최종 병합: 표(무필터) + LLM(필터) + 메타
    const finalMarkdown =
      (prependMarkdown?.trim() ? `${prependMarkdown.trim()}\n\n` : '') +
      llmMarkdown +
      (metaJson ? `\n\n${metaJson}` : '');

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">윤문 결과</h3>
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {finalMarkdown || '_표시할 내용이 없습니다._'}
          </ReactMarkdown>
        </div>
        <div className="mt-4 text-sm text-gray-500 flex justify-between items-center">
          {savedAt && <p>저장 시간: {new Date(savedAt).toLocaleString()}</p>}
        </div>
      </div>
    );
  }

  // idle 등 기본
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
};
