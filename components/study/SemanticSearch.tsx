'use client';

import { useState } from 'react';
import ChunkCard from './ChunkCard';
import type { RetrievedChunk } from '@/lib/rag/retriever';

interface Props { jobIds?: string[]; }

export default function SemanticSearch({ jobIds }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RetrievedChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch('/api/study/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), topK: 8, jobIds: jobIds?.length ? jobIds : undefined }),
      });
      const data = await res.json();
      setResults(data.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: 교환함수, 현가율, 순보험료 계산..."
          className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all"
          style={{ background: '#fff', borderColor: 'var(--border)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)' }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-6 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
          style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 2px 6px rgba(94,106,210,0.3)' }}
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </form>

      {loading && (
        <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
          <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin mr-2" />
          검색 중...
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm">검색 결과가 없습니다. 다른 키워드로 시도해보세요.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {results.length}개 결과
          </p>
          {results.map((chunk, i) => <ChunkCard key={i} chunk={chunk} />)}
        </div>
      )}

      {!searched && (
        <div className="text-center py-14" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm">교재에서 개념, 수식, 예제를 검색하세요</p>
        </div>
      )}
    </div>
  );
}
