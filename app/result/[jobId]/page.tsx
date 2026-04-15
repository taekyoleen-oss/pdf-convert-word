import { getJob, getJobPages } from '@/lib/supabase/queries';
import { notFound } from 'next/navigation';
import ReviewPanel from '@/components/result/ReviewPanel';
import ResultActions from '@/components/result/ResultActions';
import Link from 'next/link';
import type { ConvPage } from '@/types/conversion';
import { CheckCircle2, AlertTriangle, FileText, ChevronLeft } from 'lucide-react';

export default async function ResultPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) notFound();

  const pages = await getJobPages(jobId);
  const totalFlags = (pages as ConvPage[]).reduce((s, p) => s + (p.flagged_count ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/history"
        className="inline-flex items-center gap-1.5 text-xs font-medium mb-6 transition-all"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft size={14} /> 변환 이력으로
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--success-light)' }}
        >
          <CheckCircle2 size={22} style={{ color: 'var(--success)' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>변환 완료</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{job.original_name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: '변환 페이지', value: `${pages.length}p`, color: 'var(--primary)', bg: 'var(--primary-light)' },
          { label: '검토 블록', value: `${totalFlags}개`, color: totalFlags > 0 ? 'var(--warning)' : 'var(--success)', bg: totalFlags > 0 ? 'var(--warning-light)' : 'var(--success-light)' },
          { label: '상태', value: job.status === 'done' ? '완료' : job.status, color: 'var(--success)', bg: 'var(--success-light)' },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="p-4 rounded-2xl text-center"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="text-2xl font-black mb-1" style={{ color }}>{value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div
        className="rounded-2xl p-5 mb-6"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-muted)' }}>
          다음 단계
        </div>
        <ResultActions jobId={jobId} hasOutput={!!job.output_path} ragIndexed={!!job.rag_indexed} />
      </div>

      {/* Flagged blocks */}
      {totalFlags > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} style={{ color: 'var(--warning)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
              검토 필요 블록 ({totalFlags}개)
            </h2>
          </div>
          <ReviewPanel pages={pages as ConvPage[]} />
        </div>
      )}

      {/* Page summary table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="px-5 py-3.5 flex items-center gap-2 border-b text-xs font-semibold"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          <FileText size={13} />
          페이지별 결과 요약
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {(pages as ConvPage[]).map((p) => (
            <div key={p.id} className="px-5 py-3 flex justify-between items-center">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                p.{p.page_number}
              </span>
              <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>재파싱 {p.reparse_count}회</span>
                {p.flagged_count > 0 && (
                  <span style={{ color: 'var(--warning)' }}>⚠ 검토 {p.flagged_count}개</span>
                )}
                <span style={{ color: p.status === 'done' ? 'var(--success)' : 'var(--error)' }}>
                  {p.status === 'done' ? '✓ 완료' : '✗ 오류'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
