'use client';

import { useEffect, useCallback } from 'react';
import { useMGStore } from '@/store/mgStore';
// 필요하면 PolishResult를 다이내믹 임포트
// import dynamic from 'next/dynamic';
// const PolishResult = dynamic(() => import('@/components/gri/PolishResult').then(m => m.default), { ssr:false });

export default function MGPage() {
  const { selected, indexesByIssue, loadIndexes } = useMGStore();

  // 🔧 useCallback으로 함수 안정화
  const stableLoadIndexes = useCallback(() => {
    if (selected.length > 0) {
      loadIndexes();
    }
  }, [selected, loadIndexes]);

  useEffect(() => { 
    stableLoadIndexes();
  }, [stableLoadIndexes]);

  return (
    <div>
      {selected.map(issue => (
        <section key={issue.id}>
          <h3>{issue.issue_pool}</h3>
          {(indexesByIssue[issue.id] ?? []).map(ix => (
            <div key={`${issue.id}-${ix.gri_index}`}>
              <div>{ix.gri_index} • 빈도 {ix.frequency} • 등급 {ix.grade}</div>
              {/* <PolishResult sessionKey={...} griIndex={ix.gri_index} /> */}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
