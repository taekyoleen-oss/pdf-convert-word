'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, BookOpen, MessageSquare, ClipboardList, CheckCircle2, Loader2 } from 'lucide-react';

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
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState<string | null>(null);
  const [showExamModal, setShowExamModal] = useState(false);
  const [examYear, setExamYear] = useState(new Date().getFullYear());
  const [examType, setExamType] = useState('보험계리사');

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

  async function handleExamParse() {
    setParsing(true);
    setParseResult(null);
    try {
      const res = await fetch('/api/exam/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, year: examYear, exam_type: examType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '파싱 실패');
      setParseResult(`✅ ${data.inserted}개 문제 파싱 완료 (${data.parsedPages}페이지)`);
      setShowExamModal(false);
    } catch (e) {
      setParseResult(`❌ ${e instanceof Error ? e.message : '오류'}`);
    } finally {
      setParsing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        {/* Download DOCX */}
        <button
          onClick={handleDownload}
          disabled={!hasOutput || downloading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
          style={{
            background: hasOutput ? 'var(--gradient-primary)' : 'var(--surface-2)',
            color: '#fff',
            boxShadow: hasOutput ? 'var(--shadow-glow)' : 'none',
          }}
        >
          {downloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          {downloading ? '준비 중...' : '.docx 다운로드'}
        </button>

        {/* RAG indexing */}
        {!ragIndexed ? (
          <button
            onClick={handleIndex}
            disabled={indexing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
            style={{
              background: 'var(--cyan-light)',
              color: 'var(--cyan)',
              border: '1px solid rgba(34,211,238,0.3)',
            }}
          >
            {indexing ? <Loader2 size={15} className="animate-spin" /> : <BookOpen size={15} />}
            {indexing ? '등록 중...' : '학습 자료로 등록'}
          </button>
        ) : (
          <Link
            href={`/study?jobId=${jobId}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: 'var(--success-light)',
              color: 'var(--success)',
              border: '1px solid rgba(52,211,153,0.3)',
            }}
          >
            <MessageSquare size={15} />
            AI 튜터로 학습하기
          </Link>
        )}

        {/* Exam parse */}
        <button
          onClick={() => setShowExamModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all"
          style={{
            background: 'var(--accent-light)',
            color: 'var(--accent)',
            border: '1px solid rgba(167,139,250,0.3)',
          }}
        >
          <ClipboardList size={15} />
          시험 문제 파싱
        </button>
      </div>

      {indexError && (
        <p className="text-xs" style={{ color: 'var(--error)' }}>오류: {indexError}</p>
      )}

      {ragIndexed && !indexError && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--success)' }}>
          <CheckCircle2 size={13} />
          학습 자료 등록 완료 — Q&A, 검색, 수식 탐색 가능
        </div>
      )}

      {parseResult && (
        <p className="text-xs" style={{ color: parseResult.startsWith('✅') ? 'var(--success)' : 'var(--error)' }}>
          {parseResult}
        </p>
      )}

      {/* Exam parse modal */}
      {showExamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowExamModal(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} />
          <div
            className="relative rounded-2xl p-6 w-80"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-base mb-4" style={{ color: 'var(--text-primary)' }}>
              시험 문제 파싱 설정
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>시험 연도</label>
                <input
                  type="number"
                  value={examYear}
                  onChange={(e) => setExamYear(parseInt(e.target.value, 10))}
                  min={2000}
                  max={2100}
                  className="w-full px-3 py-2 rounded-xl text-sm"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>시험 종류</label>
                <div className="flex gap-2">
                  {['보험계리사', '계리사'].map(t => (
                    <button
                      key={t}
                      onClick={() => setExamType(t)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                      style={{
                        background: examType === t ? 'var(--primary-light)' : 'var(--surface-1)',
                        color: examType === t ? 'var(--primary)' : 'var(--text-muted)',
                        border: `1px solid ${examType === t ? 'var(--primary)' : 'var(--border)'}`,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowExamModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}
              >
                취소
              </button>
              <button
                onClick={handleExamParse}
                disabled={parsing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: 'var(--gradient-primary)', color: '#fff' }}
              >
                {parsing ? <><Loader2 size={14} className="animate-spin" />파싱 중...</> : '파싱 시작'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
