// components/mg/IndexPolisher.tsx
"use client";
import { useEffect, useState } from "react";
import { fetchIndexQuestions, polishIndex, MGIndexBlock } from "@/lib/mg";

export default function IndexPolisher({
  categoryId, griIndex, sessionKey, threadId, corporationId
}: { categoryId: number; griIndex: string; sessionKey: string; threadId?: string; corporationId?: number }) {
  const [block, setBlock] = useState<MGIndexBlock | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [polished, setPolished] = useState<Record<string, string>>({});
  const [polishedIndexText, setPolishedIndexText] = useState<string>("");

  useEffect(() => {
    fetchIndexQuestions(categoryId, griIndex).then((b) => {
      setBlock(b);
      const init: Record<string, string> = {};
      b.questions.forEach(q => { if (q.key_alpha) init[q.key_alpha] = ""; });
      setAnswers(init);
    });
  }, [categoryId, griIndex]);

  const onChange = (k: string, v: string) => setAnswers(prev => ({ ...prev, [k]: v }));

  const onPolish = async () => {
    const res = await polishIndex({
      session_key: sessionKey,
      category_id: categoryId,
      gri_index: griIndex,
      answers_by_key: answers,
      thread_id: threadId,
      corporation_id: corporationId,
    });
    const dict: Record<string, string> = {};
    res.items.forEach(it => { if (it.key_alpha) dict[it.key_alpha] = it.polished_text; });
    setPolished(dict);
    setPolishedIndexText(res.polished_index_text || "");
  };

  if (!block) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {block.questions.map(q => (
          <div key={q.id} className="border rounded-xl p-4">
            <div className="text-sm font-medium mb-1">{q.key_alpha ? `${q.key_alpha}. ` : ""}{q.text}</div>
            <textarea
              className="w-full border rounded-md p-2 text-sm"
              rows={3}
              value={answers[q.key_alpha ?? ""] ?? ""}
              onChange={(e) => onChange(q.key_alpha ?? "", e.target.value)}
              placeholder="여기에 원문을 입력하세요"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end mt-4">
        <button 
          onClick={onPolish} 
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors"
        >
          윤문 시작
        </button>
      </div>

      {polishedIndexText && (
        <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50 mt-6">
          <div className="font-semibold text-lg text-blue-900 mb-2">윤문 결과</div>
          <div className="text-blue-800 whitespace-pre-wrap">{polishedIndexText}</div>
        </div>
      )}
    </div>
  );
}
