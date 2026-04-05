'use client';

import { useState, useEffect } from 'react';
import HistoryList from '@/components/history/HistoryList';
import type { ConvJob } from '@/types/conversion';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<ConvJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => setJobs(d.jobs ?? [])).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          변환 이력
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          변환된 PDF 문서 목록과 학습 등록 상태를 확인합니다
        </p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          불러오는 중...
        </div>
      ) : (
        <HistoryList jobs={jobs} onDelete={handleDelete} />
      )}
    </div>
  );
}
