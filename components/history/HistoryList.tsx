'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ConvJob } from '@/types/conversion';

interface Props { jobs: ConvJob[]; onDelete: (id: string) => Promise<void>; onCategoryChange?: (id: string, category: string | null) => void; }

const STATUS_COLORS: Record<string, string> = { done: 'var(--success)', error: 'var(--error)', processing: 'var(--accent)', pending: 'var(--text-muted)' };
const STATUS_LABELS: Record<string, string> = { done: '완료', error: '오류', processing: '처리 중', pending: '대기' };

function CategoryEditor({ jobId, value, onChange }: { jobId: string; value: string | null; onChange: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const cat = draft.trim() || null;
    await fetch(`/api/history/${jobId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: cat }),
    });
    onChange(cat);
    setEditing(false);
    setSaving(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <input
          autoFocus
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          placeholder="카테고리 입력..."
          className="text-xs px-2 py-1 rounded-md outline-none"
          style={{ border: '1px solid var(--primary)', color: 'var(--text-primary)', background: 'var(--math-bg)', width: '160px' }}
        />
        <button onClick={save} disabled={saving} className="text-xs px-2 py-1 rounded-md" style={{ background: 'var(--primary)', color: '#fff' }}>
          {saving ? '...' : '저장'}
        </button>
        <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          취소
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      {value ? (
        <button
          onClick={() => { setDraft(value); setEditing(true); }}
          className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          📁 {value}
        </button>
      ) : (
        <button
          onClick={() => { setDraft(''); setEditing(true); }}
          className="text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color: 'var(--text-muted)' }}
        >
          + 카테고리
        </button>
      )}
    </div>
  );
}

export default function HistoryList({ jobs, onDelete, onCategoryChange }: Props) {
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
        <div key={job.id} className="px-5 py-4 flex items-center justify-between gap-4 group" style={{ background: 'var(--surface)' }}>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{job.original_name}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{new Date(job.created_at).toLocaleString('ko-KR')} · {job.total_pages}페이지</span>
            </div>
            <CategoryEditor
              jobId={job.id}
              value={job.category}
              onChange={(cat) => onCategoryChange?.(job.id, cat)}
            />
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
