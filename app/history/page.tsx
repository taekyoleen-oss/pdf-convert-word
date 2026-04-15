'use client';

import { useState, useEffect, useMemo } from 'react';
import HistoryList from '@/components/history/HistoryList';
import type { ConvJob } from '@/types/conversion';
import { History, Folder, Loader2 } from 'lucide-react';

export default function HistoryPage() {
  const [jobs, setJobs] = useState<ConvJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    await fetch(`/api/history/${id}`, { method: 'DELETE' });
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  function handleCategoryChange(id: string, category: string | null) {
    setJobs((prev) => prev.map((j) => j.id === id ? { ...j, category } : j));
  }

  const categories = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.category).filter(Boolean) as string[])).sort(),
    [jobs]
  );

  const filtered = selectedCategory ? jobs.filter((j) => j.category === selectedCategory) : jobs;

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--primary-light)' }}
        >
          <History size={18} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>변환 이력</h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            변환된 PDF 목록 · 학습 등록 현황 · 파일 다운로드
          </p>
        </div>
        <div
          className="ml-auto px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          총 {jobs.length}건
        </div>
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedCategory('')}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all font-medium"
            style={{
              background: !selectedCategory ? 'var(--primary-light)' : 'var(--surface-1)',
              color: !selectedCategory ? 'var(--primary)' : 'var(--text-muted)',
              border: `1px solid ${!selectedCategory ? 'var(--border-accent)' : 'var(--border)'}`,
            }}
          >
            전체 ({jobs.length})
          </button>
          {categories.map((cat) => {
            const count = jobs.filter((j) => j.category === cat).length;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl transition-all font-medium"
                style={{
                  background: isActive ? 'var(--primary-light)' : 'var(--surface-1)',
                  color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                  border: `1px solid ${isActive ? 'var(--border-accent)' : 'var(--border)'}`,
                }}
              >
                <Folder size={11} />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center gap-2 py-16 justify-center" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
          불러오는 중...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
          <History size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            변환 이력이 없습니다
          </p>
          <p className="text-xs">PDF를 업로드하고 변환을 시작하세요</p>
        </div>
      ) : (
        <HistoryList jobs={filtered} onDelete={handleDelete} onCategoryChange={handleCategoryChange} />
      )}
    </div>
  );
}
