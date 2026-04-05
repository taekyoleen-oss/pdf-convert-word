'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface LogEntry { type: string; message?: string; page?: number; total?: number; stage?: string; }

export default function ProgressStream({ jobId }: { jobId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const es = new EventSource(`/api/convert/${jobId}/stream`);
    es.onmessage = (e) => {
      const data: LogEntry = JSON.parse(e.data);
      setLogs((prev) => [...prev, data]);
      if (data.type === 'complete') { setDone(true); es.close(); setTimeout(() => router.push(`/result/${jobId}`), 1500); }
      if (data.type === 'error' && !data.page) { setError(data.message ?? '오류'); es.close(); }
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    };
    es.onerror = () => { setError('연결이 끊어졌습니다'); es.close(); };
    return () => es.close();
  }, [jobId, router]);

  const STAGE_LABELS: Record<string, string> = { image: '1단계: 이미지 변환', vision: '2단계: Vision 파싱', katex: '3단계: KaTeX 검증', reparse: '4단계: 재파싱', docx: '5단계: .docx 생성', rag: '6단계: RAG 인덱싱' };
  const completed = logs.filter((l) => l.type === 'page_done').length;
  const totalPages = logs.find((l) => l.total)?.total ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary)' }}>변환 진행 중...</h1>

      {totalPages > 0 && (
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            <span>페이지 진행률</span><span>{completed}/{totalPages}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${totalPages ? (completed / totalPages) * 100 : 0}%`, background: 'var(--primary)' }} />
          </div>
        </div>
      )}

      <div ref={scrollRef} className="rounded-xl p-4 h-80 overflow-y-auto font-mono text-sm space-y-1" style={{ background: 'var(--math-bg)', border: '1px solid var(--border)' }}>
        {logs.map((log, i) => (
          <div key={i} className="flex gap-2">
            <span style={{ color: log.type === 'error' ? 'var(--error)' : log.type === 'complete' ? 'var(--success)' : log.type === 'page_done' ? 'var(--primary)' : 'var(--text-muted)' }}>
              {log.type === 'complete' ? '✅' : log.type === 'error' ? '❌' : log.type === 'page_done' ? '✔' : '›'}
            </span>
            <span style={{ color: 'var(--text-primary)' }}>
              {log.stage ? `[${STAGE_LABELS[log.stage] ?? log.stage}] ` : ''}{log.message}
            </span>
          </div>
        ))}
        {done && <div style={{ color: 'var(--success)' }}>✅ 변환 완료! 결과 페이지로 이동합니다...</div>}
        {error && <div style={{ color: 'var(--error)' }}>❌ {error}</div>}
      </div>

      {error && (
        <div className="mt-4 flex gap-3">
          <button onClick={() => router.push('/')} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>← 홈으로</button>
          <button onClick={() => { setLogs([]); setError(''); }} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--primary)', color: '#0F1117' }}>재시도</button>
        </div>
      )}
    </div>
  );
}
