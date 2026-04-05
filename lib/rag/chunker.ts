import type { ParsedBlock } from '@/types/conversion';

export interface Chunk {
  page_number: number;
  chunk_index: number;
  chunk_type: 'text' | 'formula' | 'example' | 'mixed';
  content: string;
  latex_items: string[];
  metadata: { blockIndices: number[]; confidence: string; hasEquation: boolean; isExample: boolean };
}

const EXAMPLE_KW = ['예제', 'Example', '풀이', '해설', '예시', '문제'];
const MAX_CHARS = 400;

const isExample = (s: string) => EXAMPLE_KW.some((k) => s.includes(k));
const estimate = (s: string) => Math.ceil(s.length * 0.8);

export function chunkBlocks(blocks: ParsedBlock[], pageNumber: number): Chunk[] {
  const chunks: Chunk[] = [];
  let idx = 0;
  let textBuf: string[] = [];
  let idxBuf: number[] = [];
  let latexBuf: string[] = [];
  let hasMath = false;

  function flush() {
    if (!textBuf.length) return;
    const content = textBuf.join(' ');
    const ex = isExample(content);
    chunks.push({
      page_number: pageNumber,
      chunk_index: idx++,
      chunk_type: ex ? 'example' : hasMath ? 'mixed' : 'text',
      content,
      latex_items: [...latexBuf],
      metadata: { blockIndices: [...idxBuf], confidence: 'high', hasEquation: hasMath, isExample: ex },
    });
    textBuf = []; idxBuf = []; latexBuf = []; hasMath = false;
  }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === 'text') {
      if (estimate([...textBuf, b.content].join(' ')) > MAX_CHARS && textBuf.length) flush();
      textBuf.push(b.content); idxBuf.push(i);
    } else if (b.type === 'inline-math') {
      textBuf.push(`$${b.latex}$`); latexBuf.push(b.latex); idxBuf.push(i); hasMath = true;
    } else if (b.type === 'display-math') {
      const prevText = textBuf.at(-1) ?? '';
      flush();
      const nextText = (i + 1 < blocks.length && blocks[i + 1].type === 'text') ? (blocks[i + 1] as any).content : '';
      const latex = b.latex ?? '';
      const content = [prevText, `$$${latex}$$`, nextText].filter(Boolean).join(' ');
      const ex = isExample(content);
      chunks.push({ page_number: pageNumber, chunk_index: idx++, chunk_type: ex ? 'example' : 'formula', content, latex_items: latex ? [latex] : [], metadata: { blockIndices: [i], confidence: b.confidence ?? 'high', hasEquation: true, isExample: ex } });
    } else if (b.type === 'footnote') {
      textBuf.push(b.content); idxBuf.push(i);
    } else if (b.type === 'image' && b.caption) {
      textBuf.push(b.caption); idxBuf.push(i);
    }
  }
  flush();
  return chunks;
}
