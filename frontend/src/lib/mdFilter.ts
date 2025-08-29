// 표 블록(파이프 테이블 + 코드펜스 속 마크다운 표)만 추출하거나 제거
export type KeepMode = 'tables' | 'prose' | 'both';

export function filterMarkdown(md: string, keep: KeepMode, stripHeads: string[] = []) {
  const lines = md.replace(/\r\n/g, '\n').split('\n');

  // 1) 질문/요구사항 문구 제거(정확히 일치하거나 포함되면 컷)
  const isStrip = (s: string) =>
    stripHeads.some(h => !!h && (s.trim() === h.trim() || s.includes(h.trim())));

  // 2) 테이블 라인 여부(파이프 테이블)
  const isTableLine = (s: string) => /^\s*\|.*\|\s*$/.test(s);
  const isSeparator = (s: string) => /^\s*\|?\s*:?[-=]+\s*(\|:?[-=]+\s*)+\|?\s*$/.test(s);

  // 3) 코드펜스(``` ... ``` )는 통과만 담당 (여기선 표가 펜스 안에 올 수 있음)
  let inFence = false;

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (/^\s*```/.test(raw)) {
      inFence = !inFence;
      // 코드펜스 전체는 "표"로 보지 않음. 필요하면 여기서 처리
      if (keep !== 'prose') out.push(raw);
      continue;
    }

    if (isStrip(raw)) continue;

    const tableLike = isTableLine(raw) || isSeparator(raw);

    // keep에 따라 선택
    if (keep === 'tables') {
      if (tableLike || inFence) out.push(raw);
    } else if (keep === 'prose') {
      if (!tableLike && !inFence) out.push(raw);
    } else {
      // both
      out.push(raw);
    }
  }

  // 빈 줄 정리
  return squeezeBlank(out.join('\n'));
}

function squeezeBlank(s: string) {
  return s
    .split('\n')
    .reduce<string[]>((acc, cur) => {
      // 연속 공백 줄 제거
      if (cur.trim() === '' && acc[acc.length - 1]?.trim() === '') return acc;
      acc.push(cur);
      return acc;
    }, [])
    .join('\n')
    .trim();
}
