'use client';

import { usePolishStore } from "@/store/polishStore";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  gri_index: string;
  showLastModified?: boolean;
};

export default function PolishedContent({ gri_index, showLastModified = false }: Props) {
  const { getPolishedItem } = usePolishStore();
  const item = getPolishedItem(gri_index);

  if (!item) return null;

  return (
    <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50 mt-6">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-lg text-blue-900">윤문 결과</div>
        {showLastModified && (
          <div className="text-sm text-gray-500">
            마지막 수정: {new Date(item.last_modified).toLocaleString()}
          </div>
        )}
      </div>
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
          {item.polished_text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
