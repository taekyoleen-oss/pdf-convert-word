'use client';

import { useState, useEffect, useMemo } from 'react';
import HistoryList from '@/components/history/HistoryList';
import type { ConvJob } from '@/types/conversion';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<ConvJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetch('/api/history').then((r) => r.json()).then((d) => setJobs(d.jobs ?? [])).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function handleCategoryChange(id: string, category: string | null) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, category } : j));
  }

  const categories = useMemo(() => {
    const cats = Array.from(new Set(jobs.map((j) => j.category).filter(Boolean) as string[])).sort();
    return cats;
  }, [jobs]);

  const filtered = selectedCategory
    ? jobs.filter((j) => j.category === selectedCategory)
    : jobs;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          변환 이력
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          변환된 PDF 문서 목록과 학습 등록 상태를 확인합니다
        </p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setSelectedCategory('')}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              background: !selectedCategory ? 'var(--primary)' : 'var(--surface)',
              color: !selectedCategory ? '#fff' : 'var(--text-muted)',
              border: '1px solid var(--border)',
            }}
          >
            전체 ({jobs.length})
          </button>
          {categories.map((cat) => {
            const count = jobs.filter((j) => j.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: selectedCategory === cat ? 'var(--primary)' : 'var(--surface)',
                  color: selectedCategory === cat ? '#fff' : 'var(--text-muted)',
                  border: '1px solid var(--border)',
                }}
              >
                📁 {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-8" style={{ color: 'var(--text-muted)' }}>
          <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          불러오는 중...
        </div>
      ) : (
        <HistoryList jobs={filtered} onDelete={handleDelete} onCategoryChange={handleCategoryChange} />
      )}
    </div>
  );
}
