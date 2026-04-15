'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ChevronRight, Home, RotateCcw } from 'lucide-react';

interface LogEntry { type: string; message?: string; page?: number; total?: number; stage?: string; }

const STAGE_LABELS: Record<string, { label: string; step: number }> = {
  image:   { label: '이미지 변환',  step: 1 },
  vision:  { label: 'Vision 파싱', step: 2 },
  katex:   { label: 'KaTeX 검증',  step: 3 },
  reparse: { label: '재파싱',       step: 4 },
  docx:    { label: '.docx 생성',  step: 5 },
  rag:     { label: 'RAG 인덱싱',  step: 6 },
};

const STEPS = [
  { key: 'image',   label: '이미지 변환' },
  { key: 'vision',  label: 'AI 파싱' },
  { key: 'katex',   label: '수식 검증' },
  { key: 'docx',    label: 'Word 생성' },
];

export default function ProgressStream({ jobId }: { jobId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [currentStage, setCurrentStage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`/api/convert/${jobId}/stream`);
    es.onmessage = (e) => {
      const data: LogEntry = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
      if (data.stage) setCurrentStage(data.stage);
      if (data.type === 'complete') {
        setDone(true);
        es.close();
        setTimeout(() => router.push(`/result/${jobId}`), 1500);
      }
      if (data.type === 'error' && !data.page) { setError(data.message ?? '오류'); es.close(); }
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };
    es.onerror = () => { setError('연결이 끊어졌습니다'); es.close(); };
    return () => es.close();
  }, [jobId, router]);

  const completed = logs.filter((l) => l.type === 'page_done').length;
  const totalPages = logs.find((l) => l.total)?.total ?? 0;
  const progressPct = totalPages > 0 ? Math.round((completed / totalPages) * 100) : 0;
  const currentStepIndex = STEPS.findIndex(s => s.key === currentStage);

  function getLogColor(log: LogEntry) {
    if (log.type === 'error') return 'var(--error)';
    if (log.type === 'complete') return 'var(--success)';
    if (log.type === 'page_done') return 'var(--primary)';
    if (log.stage === 'reparse') return 'var(--warning)';
    return 'var(--text-muted)';
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12 fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: done ? 'var(--success-light)' : 'var(--primary-light)' }}
        >
          {done ? (
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          ) : (
            <Loader2 size={20} style={{ color: 'var(--primary)' }} className="animate-spin" />
          )}
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {done ? '변환 완료!' : error ? '변환 오류' : 'PDF 변환 중...'}
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {done ? '결과 페이지로 이동합니다...' : error || 'Claude Sonnet 4.6 Vision으로 파싱 중'}
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((step, i) => {
          const isDone = currentStepIndex > i || done;
          const isActive = currentStepIndex === i && !done;
          return (
            <div key={step.key} className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--surface-2)',
                    color: isDone || isActive ? '#fff' : 'var(--text-disabled)',
                    boxShadow: isActive ? 'var(--shadow-glow)' : 'none',
                  }}
                >
                  {isDone ? '✓' : i + 1}
                </div>
                <span
                  className="text-xs font-medium hidden sm:block truncate"
                  style={{ color: isDone ? 'var(--success)' : isActive ? 'var(--primary)' : 'var(--text-disabled)' }}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={12} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      {totalPages > 0 && (
        <div
          className="p-4 rounded-2xl mb-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              페이지 진행률
            </span>
            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              {completed}/{totalPages} ({progressPct}%)
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
            <div
              className="h-full progress-bar"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Log output */}
      <div
        ref={scrollRef}
        className="rounded-2xl p-4 overflow-y-auto font-mono text-xs space-y-1.5"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          height: '280px',
        }}
      >
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2.5 items-start">
            <span className="flex-shrink-0 mt-0.5" style={{ color: getLogColor(log), fontSize: '10px' }}>
              {log.type === 'complete' ? '✅' : log.type === 'error' ? '❌' : log.type === 'page_done' ? '✔' : '›'}
            </span>
            <span style={{ color: log.type === 'error' ? 'var(--error)' : 'var(--text-secondary)', lineHeight: '1.5' }}>
              {log.stage ? (
                <><span style={{ color: STAGE_LABELS[log.stage]?.step ? 'var(--text-muted)' : 'var(--text-disabled)' }}>[{STAGE_LABELS[log.stage]?.label ?? log.stage}] </span>{log.message}</>
              ) : log.message}
            </span>
          </div>
        ))}
        {done && (
          <div className="flex gap-2 mt-2" style={{ color: 'var(--success)' }}>
            <CheckCircle2 size={13} className="mt-0.5 flex-shrink-0" />
            변환 완료! 결과 페이지로 이동합니다...
          </div>
        )}
        {error && (
          <div className="flex gap-2" style={{ color: 'var(--error)' }}>
            <XCircle size={13} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Error actions */}
      {error && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => router.push('/')}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <Home size={14} /> 홈으로
          </button>
          <button
            onClick={() => { setLogs([]); setError(''); }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
            style={{ background: 'var(--gradient-primary)', color: '#fff' }}
          >
            <RotateCcw size={14} /> 재시도
          </button>
        </div>
      )}
    </div>
  );
}
