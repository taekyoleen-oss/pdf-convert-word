'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ConvJob } from '@/types/conversion';

interface Props { jobs: ConvJob[]; onDelete: (id: string) => Promise<void>; }

const STATUS_COLORS: Record<string, string> = { done: 'var(--success)', error: 'var(--error)', processing: 'var(--accent)', pending: 'var(--text-muted)' };
const STATUS_LABELS: Record<string, string> = { done: '완료', error: '오류', processing: '처리 중', pending: '대기' };

export default function HistoryList({ jobs, onDelete }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm('이 작업과 관련 파일을 모두 삭제하시겠습니까?')) return;
    setDeleting(id);
    try { await onDelete(id); } finally { setDeleting(null); }
  }

  if (!jobs.length) return (
    <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
      <div className="text-4xl mb-3">📂</div>
      <p>변환 이력이 없습니다</p>
    </div>
  );

  return (
    <div className="divide-y rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {jobs.map((job) => (
        <div key={job.id} className="px-5 py-4 flex items-center justify-between gap-4" style={{ background: 'var(--surface)' }}>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{job.original_name}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{new Date(job.created_at).toLocaleString('ko-KR')} · {job.total_pages}페이지</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${STATUS_COLORS[job.status] ?? 'var(--text-muted)'}22`, color: STATUS_COLORS[job.status] ?? 'var(--text-muted)' }}>
              {STATUS_LABELS[job.status] ?? job.status}
            </span>
            {job.rag_indexed && <span className="text-xs" style={{ color: 'var(--accent)' }}>📚 학습됨</span>}
            {job.status === 'done' && (
              <Link href={`/result/${job.id}`} className="text-xs px-3 py-1 rounded-lg" style={{ border: '1px solid var(--primary)', color: 'var(--primary)' }}>결과 보기</Link>
            )}
            {job.output_path && (
              <a href={`/api/download/${job.id}`} className="text-xs px-3 py-1 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>⬇</a>
            )}
            <button onClick={() => handleDelete(job.id)} disabled={deleting === job.id} className="text-xs px-2 py-1 rounded-lg transition-all hover:opacity-100 opacity-50" style={{ color: 'var(--error)' }}>
              {deleting === job.id ? '...' : '삭제'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
