'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle, BookOpen,
  Database, RotateCcw, Wrench, FileText, ChevronLeft, Loader2,
  ServerCrash,
} from 'lucide-react';

interface PageStat { total: number; done: number; error: number; flagged: number; }

interface DiagJob {
  id: string;
  original_name: string;
  status: string;
  rag_indexed: boolean;
  total_pages: number;
  has_output: boolean;
  storage_path: string;
  category: string | null;
  created_at: string;
  pages: PageStat;
  chunk_count: number;
  recovery_action: 'fix_status' | 'reindex' | null;
}

interface DiagResult {
  summary: {
    totalJobs: number;
    doneJobs: number;
    processingJobs: number;
    errorJobs: number;
    indexedJobs: number;
    recoverableJobs: number;
    chunksTableExists: boolean;
    storageBuckets: string[];
    errors: { jobs: string | null; pages: string | null; chunks: string | null };
  };
  jobs: DiagJob[];
}

const STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  done:       { color: 'var(--success)', bg: 'var(--success-light)', label: '완료' },
  processing: { color: 'var(--amber)',   bg: 'var(--amber-light)',   label: '처리중' },
  error:      { color: 'var(--error)',   bg: 'var(--error-light)',   label: '오류' },
  pending:    { color: 'var(--text-muted)', bg: 'var(--surface-2)', label: '대기' },
};

export default function AdminPage() {
  const [diag, setDiag] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [actionResult, setActionResult] = useState<Record<string, string>>({});

  async function loadDiag() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/diagnose');
      const data = await res.json();
      setDiag(data);
    } catch (e) {
      setDiag(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadDiag(); }, []);

  async function doAction(jobId: string, action: string) {
    setActionLoading((prev) => ({ ...prev, [jobId]: true }));
    setActionResult((prev) => ({ ...prev, [jobId]: '' }));
    try {
      let res: Response;
      if (action === 'fix_status') {
        res = await fetch('/api/admin/fix-job', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, action: 'fix_status' }),
        });
      } else if (action === 'reindex') {
        res = await fetch('/api/admin/reindex', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jobId, force: true }),
        });
      } else {
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? '오류 발생');
      setActionResult((prev) => ({ ...prev, [jobId]: `✅ ${data.message}` }));
      // 성공 후 진단 새로고침
      await loadDiag();
    } catch (e) {
      setActionResult((prev) => ({
        ...prev,
        [jobId]: `❌ ${e instanceof Error ? e.message : '오류'}`,
      }));
    } finally {
      setActionLoading((prev) => ({ ...prev, [jobId]: false }));
    }
  }

  async function doReindexAll() {
    if (!diag) return;
    const targets = diag.jobs.filter((j) => j.recovery_action === 'reindex');
    for (const job of targets) {
      await doAction(job.id, 'reindex');
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link
          href="/"
          className="p-2 rounded-xl transition-all"
          style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <ChevronLeft size={18} />
        </Link>
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--primary-light)' }}
        >
          <Wrench size={20} style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            데이터 복원 관리
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            변환 이력 점검 · 학습 자료 재등록 · 손상 데이터 복구
          </p>
        </div>
        <button
          onClick={loadDiag}
          disabled={loading}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
          style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          새로고침
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={20} className="animate-spin" />
          Supabase 데이터 확인 중...
        </div>
      )}

      {!loading && !diag && (
        <div className="text-center py-20" style={{ color: 'var(--error)' }}>
          <ServerCrash size={40} className="mx-auto mb-3 opacity-50" />
          <p className="font-semibold mb-1">진단 API 호출 실패</p>
          <p className="text-sm">환경변수(SUPABASE_URL, SERVICE_ROLE_KEY)를 확인하세요.</p>
        </div>
      )}

      {!loading && diag && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: '전체 작업', value: diag.summary.totalJobs, color: 'var(--primary)', bg: 'var(--primary-light)', icon: FileText },
              { label: '변환 완료', value: diag.summary.doneJobs, color: 'var(--success)', bg: 'var(--success-light)', icon: CheckCircle2 },
              { label: '학습 등록', value: diag.summary.indexedJobs, color: 'var(--accent)', bg: 'var(--accent-light)', icon: BookOpen },
              { label: '복원 가능', value: diag.summary.recoverableJobs, color: 'var(--amber)', bg: 'var(--amber-light)', icon: RotateCcw },
            ].map(({ label, value, color, bg, icon: Icon }) => (
              <div key={label} className="p-4 rounded-2xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="text-2xl font-black mb-0.5" style={{ color }}>{value}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* DB 오류 표시 */}
          {(diag.summary.errors.jobs || diag.summary.errors.pages || diag.summary.errors.chunks) && (
            <div className="p-4 rounded-2xl mb-6" style={{ background: 'var(--error-light)', border: '1px solid rgba(239,68,68,0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} style={{ color: 'var(--error)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--error)' }}>Supabase 오류 감지</span>
              </div>
              {diag.summary.errors.jobs && <p className="text-xs mb-1" style={{ color: 'var(--error)' }}>conv_jobs: {diag.summary.errors.jobs}</p>}
              {diag.summary.errors.pages && <p className="text-xs mb-1" style={{ color: 'var(--error)' }}>conv_pages: {diag.summary.errors.pages}</p>}
              {diag.summary.errors.chunks && (
                <p className="text-xs" style={{ color: 'var(--amber)' }}>
                  book_chunks: {diag.summary.errors.chunks}
                  {!diag.summary.chunksTableExists && ' (테이블 없음 — 학습 자료 등록 불가)'}
                </p>
              )}
            </div>
          )}

          {/* book_chunks 테이블 없음 경고 */}
          {!diag.summary.chunksTableExists && (
            <div className="p-4 rounded-2xl mb-6" style={{ background: 'var(--amber-light)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} style={{ color: 'var(--amber)' }} />
                <span className="font-semibold text-sm" style={{ color: 'var(--amber)' }}>book_chunks 테이블 없음</span>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Supabase SQL Editor에서 다음 SQL을 실행하세요:
              </p>
              <pre
                className="mt-2 p-3 rounded-xl text-xs overflow-x-auto"
                style={{ background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              >{`CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE book_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID REFERENCES conv_jobs(id) ON DELETE CASCADE,
  page_number  INTEGER NOT NULL,
  chunk_index  INTEGER NOT NULL,
  chunk_type   TEXT NOT NULL,
  content      TEXT NOT NULL,
  latex_items  TEXT[] DEFAULT '{}',
  embedding    vector(1024),
  source_title TEXT NOT NULL,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON book_chunks USING ivfflat (embedding vector_cosine_ops);
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON book_chunks FOR ALL USING (true);`}</pre>
            </div>
          )}

          {/* 전체 재등록 버튼 */}
          {diag.summary.recoverableJobs > 0 && diag.summary.chunksTableExists && (
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl" style={{ background: 'var(--primary-light)', border: '1px solid var(--border-accent)' }}>
              <div className="flex-1">
                <p className="font-semibold text-sm" style={{ color: 'var(--primary)' }}>
                  복원 가능한 작업 {diag.summary.recoverableJobs}개 발견
                </p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  재변환 없이 기존 데이터로 학습 자료를 복원합니다.
                </p>
              </div>
              <button
                onClick={doReindexAll}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
                style={{ background: 'var(--gradient-primary)', color: '#fff', boxShadow: 'var(--shadow-glow)' }}
              >
                <RotateCcw size={15} />
                전체 복원
              </button>
            </div>
          )}

          {/* Job 목록 */}
          {diag.jobs.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <Database size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                Supabase에 저장된 변환 작업이 없습니다
              </p>
              <p className="text-sm">홈에서 PDF를 업로드하여 처음 변환을 시작하세요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diag.jobs.map((job) => {
                const statusStyle = STATUS_STYLES[job.status] ?? STATUS_STYLES.pending;
                const isLoading = actionLoading[job.id];
                const result = actionResult[job.id];

                return (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl"
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${job.recovery_action ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* 상태 아이콘 */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: statusStyle.bg }}
                      >
                        {job.status === 'done' ? <CheckCircle2 size={18} style={{ color: statusStyle.color }} />
                          : job.status === 'error' ? <XCircle size={18} style={{ color: statusStyle.color }} />
                          : job.status === 'processing' ? <Loader2 size={18} style={{ color: statusStyle.color }} className="animate-spin" />
                          : <FileText size={18} style={{ color: statusStyle.color }} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* 파일명 + 상태 */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                            {job.original_name}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: statusStyle.bg, color: statusStyle.color }}
                          >
                            {statusStyle.label}
                          </span>
                          {job.rag_indexed && (
                            <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                              📚 학습 등록됨
                            </span>
                          )}
                        </div>

                        {/* 상세 정보 */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                          <span>총 {job.total_pages}p</span>
                          <span>변환 완료: {job.pages.done}p</span>
                          {job.pages.error > 0 && <span style={{ color: 'var(--error)' }}>오류: {job.pages.error}p</span>}
                          <span>청크: {job.chunk_count}개</span>
                          {job.has_output && <span style={{ color: 'var(--success)' }}>DOCX ✓</span>}
                          <span>{new Date(job.created_at).toLocaleString('ko-KR')}</span>
                        </div>

                        {/* 복원 필요 안내 */}
                        {job.recovery_action && (
                          <div
                            className="text-xs mb-2 px-2 py-1 rounded-lg inline-flex items-center gap-1"
                            style={{ background: 'var(--amber-light)', color: 'var(--amber)' }}
                          >
                            <AlertTriangle size={11} />
                            {job.recovery_action === 'fix_status'
                              ? '처리중 상태로 멈춤 — 완료 처리 가능'
                              : '변환 완료됐으나 학습 등록 안 됨 — 재등록 가능'}
                          </div>
                        )}

                        {/* 액션 결과 */}
                        {result && (
                          <p
                            className="text-xs mt-1"
                            style={{ color: result.startsWith('✅') ? 'var(--success)' : 'var(--error)' }}
                          >
                            {result}
                          </p>
                        )}
                      </div>

                      {/* 액션 버튼 */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {job.recovery_action === 'fix_status' && (
                          <button
                            onClick={() => doAction(job.id, 'fix_status')}
                            disabled={isLoading}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
                            style={{ background: 'var(--amber-light)', color: 'var(--amber)', border: '1px solid rgba(245,158,11,0.3)' }}
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Wrench size={12} />}
                            상태 수정
                          </button>
                        )}
                        {(job.recovery_action === 'reindex' || (job.status === 'done' && job.pages.done > 0)) && (
                          <button
                            onClick={() => doAction(job.id, 'reindex')}
                            disabled={isLoading || !diag.summary.chunksTableExists}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 transition-all"
                            style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--border-accent)' }}
                          >
                            {isLoading ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} />}
                            {job.rag_indexed ? '재등록' : '학습 등록'}
                          </button>
                        )}
                        {job.status === 'done' && job.has_output && (
                          <a
                            href={`/api/download/${job.id}`}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                            style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
                          >
                            <FileText size={12} />
                            DOCX
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* UUID 힌트 */}
          <div className="mt-8 p-4 rounded-xl text-xs" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>진단 정보</p>
            <p>Storage 버킷: {diag.summary.storageBuckets.join(', ') || '없음'}</p>
            <p>book_chunks 테이블: {diag.summary.chunksTableExists ? '존재' : '없음 (생성 필요)'}</p>
            <p>API: <code>/api/admin/diagnose</code> · <code>/api/admin/reindex</code> · <code>/api/admin/fix-job</code></p>
          </div>
        </>
      )}
    </div>
  );
}
