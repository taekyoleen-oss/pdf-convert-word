import { getJob, getJobPages } from '@/lib/supabase/queries';
import { notFound } from 'next/navigation';
import ReviewPanel from '@/components/result/ReviewPanel';
import ResultActions from '@/components/result/ResultActions';
import type { ConvPage } from '@/types/conversion';

export default async function ResultPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) notFound();

  const pages = await getJobPages(jobId);
  const totalFlags = (pages as ConvPage[]).reduce((s, p) => s + (p.flagged_count ?? 0), 0);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--primary)' }}>변환 완료</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{job.original_name}</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          ['변환 페이지', `${pages.length}페이지`],
          ['검토 필요 블록', `${totalFlags}개`],
          ['상태', job.status === 'done' ? '✅ 완료' : job.status],
        ].map(([label, value]) => (
          <div key={label} className="p-4 rounded-xl border text-center" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <div className="text-lg font-bold mb-1" style={{ color: 'var(--primary)' }}>{value}</div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <ResultActions jobId={jobId} hasOutput={!!job.output_path} ragIndexed={!!job.rag_indexed} />
      </div>

      {totalFlags > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3" style={{ color: 'var(--warning)' }}>검토 필요 블록</h2>
          <ReviewPanel pages={pages as ConvPage[]} />
        </div>
      )}

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div className="p-4 border-b text-sm font-medium" style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-muted)' }}>
          페이지별 결과 요약
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
          {(pages as ConvPage[]).map((p) => (
            <div key={p.id} className="px-4 py-3 flex justify-between items-center text-sm">
              <span style={{ color: 'var(--text-primary)' }}>p.{p.page_number}</span>
              <div className="flex gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                <span>재파싱: {p.reparse_count}회</span>
                {p.flagged_count > 0 && <span style={{ color: 'var(--warning)' }}>⚠ 검토 {p.flagged_count}개</span>}
                <span style={{ color: p.status === 'done' ? 'var(--success)' : 'var(--error)' }}>{p.status === 'done' ? '✓' : '✗'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
