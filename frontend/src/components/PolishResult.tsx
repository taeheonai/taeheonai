'use client';

import React, { useCallback } from 'react';
import { useIntakeStore } from '@/store/intakeStore';
import { useShallow } from 'zustand/react/shallow';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { filterMarkdown, KeepMode } from '@/lib/mdFilter';
import { safeTrim } from '@/lib/utils';

interface PolishResultProps {
  sessionKey: string;
  griIndex: string;
  /** 표로 만든 마크다운을 윤문 결과 앞에 붙여서 렌더링 */
  prependMarkdown?: string;
  /** LLM 응답에서 어떤 부분을 보여줄지: 'tables' | 'prose' | 'both' | 'none' */
  keepFromLLM?: KeepMode | 'none';
  /** LLM 응답에서 제거할 질문/헤더 문구(요구사항 제목 등) */
  stripHeads?: string[];
  onPolishRequest?: () => void;
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
  prependMarkdown = '',
  keepFromLLM = 'both',
  stripHeads = [],
  onPolishRequest,
}) => {
  /* 셀렉터: 참조 안정화 */
  const { savedItems } = useIntakeStore(
    useShallow((s) => ({
      savedItems: s.savedItems,
    })),
  );

  /* 안전 호출 */
  const stableFetchPolishResult = useCallback(async () => {
    if (!sessionKey || !griIndex) return;
    try {
      // 윤문 실행 요청 시 부모 컴포넌트의 콜백 호출
      if (onPolishRequest) {
        onPolishRequest();
      } else {
        console.log('윤문 실행 요청됨 - onPolishRequest 콜백이 설정되지 않음');
      }
    } catch (e) {
      console.error('윤문 실행 요청 실패:', e);
    }
  }, [sessionKey, griIndex, onPolishRequest]);

  /* 컴포넌트 마운트 시 자동으로 데이터 가져오기 - 자동 실행 비활성화 */
  // useEffect(() => {
  //   if (sessionKey && griIndex) {
  //     stableFetchPolishResult();
  //   }
  // }, [sessionKey, griIndex, stableFetchPolishResult]);

  /* 테이블 마크다운 렌더링 스타일 */
  const markdownComponents = {
    table: ({ children, ...props }: React.ComponentProps<'table'>) => (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" {...props}>
          {children}
        </table>
      </div>
    ),
    th: ({ children, ...props }: React.ComponentProps<'th'>) => (
      <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" {...props}>
        {children}
      </th>
    ),
    td: ({ children, ...props }: React.ComponentProps<'td'>) => (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" {...props}>
        {children}
      </td>
    ),
  };

  // 저장된 윤문 결과 확인
  const savedItem = savedItems[griIndex];
  const hasPolishedText = safeTrim(savedItem?.polished_text);

  if (!hasPolishedText) {
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

  // 저장된 윤문 텍스트 사용
  const polishedText = savedItem.polished_text;

  // 본문/표 텍스트 분리
  let proseText = '';
  let tableText = '';

  if (typeof polishedText === 'string') {
    // 순수 마크다운 문자열
    proseText = polishedText;
    console.log('🔍 PolishResult 문자열:', polishedText.substring(0, 100) + '...');
  } else if (polishedText && typeof polishedText === 'object') {
    // { text, table, model, created_at, ... } 형태
    const obj = polishedText as Record<string, unknown>;
    
    console.log('🔍 PolishResult 객체 상세:', {
      original: polishedText,
      keys: Object.keys(obj),
      text: obj.text,
      polished_text: obj.polished_text,
      table: obj.table
    });
    
    // 다양한 필드에서 텍스트 추출 시도
    proseText = String(
      obj.text ?? 
      obj.polished_text ?? 
      obj.content ?? 
      obj.result ?? 
      JSON.stringify(obj)
    );
    tableText = String(obj.table ?? '');
    
    console.log('🔍 PolishResult 최종 변환:', {
      proseText: proseText.substring(0, 100) + '...',
      tableText: tableText.substring(0, 50) + '...'
    });
  }

  // 메타(모델/시간) 코드블록
  let metaJson = '';
  if (polishedText && typeof polishedText === 'object' && polishedText !== null && 'model' in (polishedText as any)) {
    const obj = polishedText as Record<string, unknown>;
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
            (safeTrim(prependMarkdown) ? `${safeTrim(prependMarkdown)}\n\n` : '') +
    (contentToRender ?? '') +
    (metaJson ? `\n\n${metaJson}` : '');

  // stripHeads/모드에 따른 필터링
  const filteredMarkdown =
          keepFromLLM === 'none' ? (safeTrim(prependMarkdown) ?? '') : filterMarkdown(mergedMarkdown, keepFromLLM, stripHeads);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">intake_result</h3>
      <div className="prose max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {filteredMarkdown || '_표시할 내용이 없습니다._'}
        </ReactMarkdown>
      </div>
      {savedItem.last_modified && (
        <div className="mt-4 text-xs text-gray-500 text-right">
          마지막 수정: {new Date(savedItem.last_modified).toLocaleString('ko-KR')}
        </div>
      )}
    </div>
  );
};