'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Props {
  jobId: string;
  hasOutput: boolean;
  ragIndexed: boolean;
}

export default function ResultActions({ jobId, hasOutput, ragIndexed: initialRagIndexed }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [ragIndexed, setRagIndexed] = useState(initialRagIndexed);
  const [indexError, setIndexError] = useState<string | null>(null);

  async function handleDownload() {
    if (!hasOutput) return;
    setDownloading(true);
    try {
      window.location.href = `/api/download/${jobId}`;
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  }

  async function handleIndex() {
    setIndexing(true);
    setIndexError(null);
    try {
      const res = await fetch(`/api/study/index/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '인덱싱 실패');
      setRagIndexed(true);
    } catch (e) {
      setIndexError(e instanceof Error ? e.message : '오류가 발생했습니다');
    } finally {
      setIndexing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-3 flex-wrap">
        {/* Download DOCX */}
        <button
          onClick={handleDownload}
          disabled={!hasOutput || downloading}
          className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-40"
          style={{
            background: hasOutput ? 'var(--primary)' : 'var(--border)',
            color: '#0F1117',
            cursor: hasOutput ? 'pointer' : 'not-allowed',
          }}
        >
          {downloading ? '⏳ 준비 중...' : '⬇ .docx 다운로드'}
        </button>

        {/* RAG indexing */}
        {!ragIndexed ? (
          <button
            onClick={handleIndex}
            disabled={indexing}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#0F1117' }}
          >
            {indexing ? '⏳ 등록 중...' : '📚 학습 자료로 등록'}
          </button>
        ) : (
          <Link
            href={`/study?jobId=${jobId}`}
            className="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all hover:opacity-80"
            style={{ background: 'rgba(110,231,183,0.15)', border: '1px solid rgba(110,231,183,0.4)', color: 'var(--primary)' }}
          >
            💬 Q&amp;A 학습하기
          </Link>
        )}
      </div>

      {indexError && (
        <p className="text-xs px-2" style={{ color: 'var(--error)' }}>오류: {indexError}</p>
      )}

      {ragIndexed && (
        <p className="text-xs px-2" style={{ color: 'var(--success, #6EE7B7)' }}>
          ✅ 학습 자료로 등록됨 — Q&A, 검색, 수식 탐색이 가능합니다
        </p>
      )}
    </div>
  );
}
