'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PdfUploader from '@/components/upload/PdfUploader';
import PageRangeSelector from '@/components/upload/PageRangeSelector';
import CategorySelector from '@/components/upload/CategorySelector';
import { Sparkles, FileText, Zap, BookOpenCheck, ArrowRight, Upload } from 'lucide-react';

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
  {
    icon: Zap,
    title: '수식 정확도 최우선',
    desc: 'Claude Sonnet 4.6 Vision으로 LaTeX 수식을 정밀 파싱',
    color: 'var(--primary)',
    bg: 'var(--primary-light)',
  },
  {
    icon: FileText,
    title: '편집 가능한 Word 변환',
    desc: 'OMML 네이티브 수식 포함 .docx 파일로 완벽 변환',
    color: 'var(--accent)',
    bg: 'var(--accent-light)',
  },
  {
    icon: BookOpenCheck,
    title: 'AI 학습 튜터',
    desc: 'RAG 기반 Q&A, 수식 탐색, 단원별 문제풀기',
    color: 'var(--cyan)',
    bg: 'var(--cyan-light)',
  },
  {
    icon: Sparkles,
    title: '다단계 검증',
    desc: 'KaTeX 검증 → 자동 재파싱 → 이미지 폴백 보장',
    color: 'var(--success)',
    bg: 'var(--success-light)',
  },
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
    setUploading(true);
    setError('');
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
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Hero */}
      <div className="mb-10 text-center fade-in">
        <div
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 tracking-wide"
          style={{
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            border: '1px solid var(--border-accent)',
            boxShadow: '0 0 20px var(--primary-glow)',
          }}
        >
          <Sparkles size={14} />
          보험계리사 시험 준비 AI 플랫폼
        </div>
        <h1
          className="text-4xl font-bold tracking-tight mb-5 leading-tight"
          style={{ color: 'var(--text-primary)' }}
        >
          보험수리학 교재 PDF를
          <br />
          <span
            style={{
              background: 'var(--gradient-primary)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            스마트하게 학습하세요
          </span>
        </h1>
        <p className="text-lg max-w-md mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          수식·생명표·연금현가를 정확하게 변환하고,
          <br />
          AI 튜터와 기출문제로 시험을 완벽 준비하세요
        </p>
      </div>

      {/* Upload card */}
      <div
        className="rounded-2xl p-6 mb-4 fade-in"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Upload size={17} style={{ color: 'var(--primary)' }} />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            PDF 업로드
          </span>
        </div>
        <PdfUploader onFileSelect={setFile} selectedFile={file} />
      </div>

      {file && (
        <div
          className="rounded-2xl p-6 mb-4 space-y-5 fade-in"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <CategorySelector value={category} onChange={setCategory} />
          <PageRangeSelector value={targetPages} onChange={setTargetPages} />
        </div>
      )}

      {error && (
        <div
          className="mb-4 p-4 rounded-xl text-sm flex items-center gap-2"
          style={{
            background: 'var(--error-light)',
            color: 'var(--error)',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          <span>⚠</span>
          {error}
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!file || uploading}
        className="w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 mb-10 disabled:opacity-40"
        style={{
          background: file && !uploading ? 'var(--gradient-primary)' : 'var(--surface-2)',
          color: '#fff',
          boxShadow: file && !uploading ? 'var(--shadow-glow)' : 'none',
          border: '1px solid transparent',
        }}
      >
        {uploading ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            업로드 중...
          </>
        ) : (
          <>
            변환 시작
            <ArrowRight size={18} />
          </>
        )}
      </button>

      {/* Feature grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
          <div
            key={title}
            className="p-5 rounded-2xl transition-all"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = color;
              (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
              (e.currentTarget as HTMLElement).style.background = 'var(--surface)';
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon size={19} color={color} strokeWidth={2} />
            </div>
            <div className="font-semibold mb-1.5" style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {title}
            </div>
            <div className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {desc}
            </div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href="/study"
          className="p-5 rounded-2xl flex items-center gap-3 transition-all"
          style={{ background: 'var(--primary-light)', border: '1px solid var(--border-accent)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'var(--shadow-glow)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <BookOpenCheck size={22} style={{ color: 'var(--primary)' }} />
          <div>
            <div className="font-bold" style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>학습 허브 바로가기</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>AI 튜터 · 퀴즈 · 수식</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--primary)', marginLeft: 'auto' }} />
        </a>
        <a
          href="/exam"
          className="p-5 rounded-2xl flex items-center gap-3 transition-all"
          style={{ background: 'var(--accent-light)', border: '1px solid rgba(167,139,250,0.25)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(167,139,250,0.2)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
        >
          <Sparkles size={22} style={{ color: 'var(--accent)' }} />
          <div>
            <div className="font-bold" style={{ color: 'var(--accent)', fontSize: '0.95rem' }}>기출문제 풀기</div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>보험계리사 시험 대비</div>
          </div>
          <ArrowRight size={16} style={{ color: 'var(--accent)', marginLeft: 'auto' }} />
        </a>
      </div>
    </div>
  );
}
