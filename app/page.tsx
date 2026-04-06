'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PdfUploader from '@/components/upload/PdfUploader';
import PageRangeSelector from '@/components/upload/PageRangeSelector';
import CategorySelector from '@/components/upload/CategorySelector';

function parsePageRange(input: string): number[] {
  const pages = new Set<number>();
  for (const part of input.split(',')) {
    const t = part.trim();
    if (t.includes('-')) {
      const [s, e] = t.split('-').map(Number);
      for (let i = s; i <= e; i++) if (i > 0) pages.add(i);
    } else {
      const n = parseInt(t, 10);
      if (n > 0) pages.add(n);
    }
  }
  return Array.from(pages).sort((a, b) => a - b);
}

const FEATURES = [
  { icon: '⚡', title: '수식 정확도 최우선', desc: 'Claude Sonnet 4.6 Vision으로 LaTeX 수식 파싱' },
  { icon: '🔄', title: '다단계 검증', desc: 'KaTeX 검증 → 재파싱 → 이미지 폴백' },
  { icon: '📝', title: '편집 가능한 OMML', desc: 'Word 네이티브 수식으로 직접 편집' },
  { icon: '🎓', title: 'AI 학습 튜터', desc: 'RAG 기반 Q&A · 문제풀기 · 수식 탐색' },
];

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [targetPages, setTargetPages] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleStart() {
    if (!file) return;
    setUploading(true); setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      if (category.trim()) form.append('category', category.trim());
      const upRes = await fetch('/api/upload', { method: 'POST', body: form });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error);

      const pages = targetPages.trim() ? parsePageRange(targetPages) : [];
      await fetch('/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: upData.jobId, targetPages: pages.length ? pages : undefined }),
      });
      router.push(`/convert/${upData.jobId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다');
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      {/* Hero */}
      <div className="mb-10 text-center">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-4"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
          최신보험수리학 전용 변환기
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-3" style={{ color: 'var(--text-primary)' }}>
          보험수리학 교재 PDF
          <br />
          <span style={{ color: 'var(--primary)' }}>Word 문서로 변환</span>
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          수식·생명표·연금현가를 정확하게 변환하고 AI 튜터로 학습하세요
        </p>
      </div>

      {/* Upload card */}
      <div
        className="rounded-2xl p-6 mb-4 border"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-md)' }}
      >
        <PdfUploader onFileSelect={setFile} selectedFile={file} />
      </div>

      {file && (
        <div
          className="rounded-2xl p-6 mb-4 border space-y-5"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <CategorySelector value={category} onChange={setCategory} />
          <PageRangeSelector value={targetPages} onChange={setTargetPages} />
        </div>
      )}

      {error && (
        <div
          className="mb-4 p-3 rounded-xl text-sm"
          style={{ background: 'var(--error-light)', color: 'var(--error)', border: '1px solid rgba(220,38,38,0.2)' }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!file || uploading}
        className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
        style={{
          background: 'var(--primary)',
          color: '#fff',
          boxShadow: file && !uploading ? '0 2px 8px rgba(94,106,210,0.35)' : 'none',
          cursor: file && !uploading ? 'pointer' : 'not-allowed',
        }}
      >
        {uploading ? '업로드 중...' : '변환 시작 →'}
      </button>

      {/* Feature grid */}
      <div className="mt-10 grid grid-cols-2 gap-3">
        {FEATURES.map(({ icon, title, desc }) => (
          <div
            key={title}
            className="p-4 rounded-xl border"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          >
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-sm font-medium mb-0.5" style={{ color: 'var(--text-primary)' }}>{title}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
