'use client';

import { useState, useEffect } from 'react';
import type { RetrievedChunk } from '@/lib/rag/retriever';
import LatexRenderer from './LatexRenderer';

interface Props { jobIds?: string[]; }

export default function FormulaExplorer({ jobIds }: Props) {
  const [chunks, setChunks] = useState<RetrievedChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'formula' | 'example'>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (!jobIds?.length) {
      setChunks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/study/formulas?jobIds=${jobIds.join(',')}`)
      .then((r) => r.json())
      .then((d) => setChunks(d.chunks ?? []))
      .catch(() => setChunks([]))
      .finally(() => setLoading(false));
  }, [jobIds?.join(',')]);

  const filtered = chunks.filter((c) => {
    if (filter !== 'all' && c.chunk_type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.content.toLowerCase().includes(q) || c.latex_items.some((l) => l.toLowerCase().includes(q));
    }
    return true;
  });

  if (loading) return <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>불러오는 중...</div>;

  if (!jobIds?.length) {
    return (
      <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
        <div className="text-4xl mb-3">📐</div>
        <p className="text-sm">문서를 선택하면 수식과 예제를 탐색할 수 있습니다</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="수식 또는 키워드 검색..."
          className="flex-1 min-w-40 px-3 py-2 rounded-lg border text-sm outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
        />
        <div className="flex gap-2">
          {([['all', '전체'], ['formula', '수식'], ['example', '예제']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: filter === v ? 'var(--primary)' : 'var(--border)',
                color: filter === v ? '#0F1117' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>{filtered.length}개 항목</p>

      {filtered.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-3">📐</div>
          <p className="text-sm">학습된 교재에서 수식과 예제를 탐색합니다</p>
          {chunks.length === 0 && <p className="text-xs mt-2">먼저 PDF를 변환하고 학습 자료로 등록하세요</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((chunk, i) => (
            <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full px-4 py-3 flex items-center justify-between text-left transition-all hover:opacity-80"
                style={{ background: 'var(--surface)' }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{
                      background: chunk.chunk_type === 'formula' ? 'var(--primary)22' : 'var(--warning)22',
                      color: chunk.chunk_type === 'formula' ? 'var(--primary)' : 'var(--warning)',
                    }}
                  >
                    {chunk.chunk_type === 'formula' ? '수식' : '예제'}
                  </span>
                  {chunk.latex_items.length > 0 ? (
                    <code className="text-xs truncate" style={{ color: 'var(--accent)' }}>{chunk.latex_items[0]}</code>
                  ) : (
                    <span className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{chunk.content.slice(0, 60)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>p.{chunk.page_number}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{expanded === i ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === i && (
                <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)', background: 'var(--math-bg, var(--surface))' }}>
                  <div className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-primary)' }}>
                    <LatexRenderer text={chunk.content} />
                  </div>
                  {chunk.latex_items.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {chunk.latex_items.map((latex, j) => (
                        <div
                          key={j}
                          className="px-3 py-2 rounded-lg overflow-x-auto"
                          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                        >
                          <LatexRenderer text={`$$${latex}$$`} />
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                    {chunk.source_title} · {chunk.page_number}페이지
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
