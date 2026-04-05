'use client';

import type { ConvPage, ParsedBlock } from '@/types/conversion';

interface Props { pages: ConvPage[]; }

export default function ReviewPanel({ pages }: Props) {
  const flaggedItems: Array<{ pageNum: number; blockIdx: number; reason: string; latex?: string | null }> = [];
  pages.forEach((p) => {
    if (!p.parsed_blocks) return;
    (p.parsed_blocks as ParsedBlock[]).forEach((b, i) => {
      if (b.flag) flaggedItems.push({ pageNum: p.page_number, blockIdx: i, reason: b.flag_reason ?? '검토 필요', latex: (b as any).latex });
    });
  });

  if (!flaggedItems.length) return null;

  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--surface)', borderColor: 'var(--warning)', maxHeight: '400px', overflowY: 'auto' }}>
      <h3 className="font-semibold mb-3 text-sm" style={{ color: 'var(--warning)' }}>⚠ 수동 검토 필요 블록 ({flaggedItems.length}개)</h3>
      <div className="space-y-2">
        {flaggedItems.map((item, i) => (
          <div key={i} className="p-2 rounded-lg text-xs" style={{ background: 'rgba(252,211,77,0.08)', border: '1px solid rgba(252,211,77,0.2)' }}>
            <div className="flex justify-between mb-1">
              <span style={{ color: 'var(--warning)' }}>p.{item.pageNum} · 블록 {item.blockIdx}</span>
            </div>
            <div style={{ color: 'var(--text-muted)' }}>{item.reason}</div>
            {item.latex && <div className="mt-1 font-mono text-xs" style={{ color: 'var(--accent)' }}>{item.latex}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
