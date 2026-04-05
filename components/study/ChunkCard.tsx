'use client';

import type { RetrievedChunk } from '@/lib/rag/retriever';
import LatexRenderer from './LatexRenderer';

interface Props { chunk: RetrievedChunk; }

const TYPE_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  formula: { label: '수식',   bg: 'var(--primary-light)', color: 'var(--primary)' },
  example: { label: '예제',   bg: 'var(--warning-light)', color: 'var(--warning)' },
  text:    { label: '본문',   bg: 'var(--surface)',        color: 'var(--text-muted)' },
  mixed:   { label: '혼합',   bg: 'var(--accent-light)',  color: 'var(--accent)' },
};

export default function ChunkCard({ chunk }: Props) {
  const cfg = TYPE_CONFIG[chunk.chunk_type] ?? TYPE_CONFIG.text;

  return (
    <div
      className="p-4 rounded-2xl border transition-all hover:shadow-md"
      style={{ background: '#fff', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {chunk.source_title} · p.{chunk.page_number}
          {chunk.similarity < 1 && (
            <span
              className="ml-2 px-1.5 py-0.5 rounded text-xs"
              style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
            >
              유사도 {(chunk.similarity * 100).toFixed(0)}%
            </span>
          )}
        </span>
      </div>
      <div className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
        <LatexRenderer text={chunk.content} />
      </div>
    </div>
  );
}
