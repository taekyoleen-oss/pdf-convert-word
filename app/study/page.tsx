import StudyHub from '@/components/study/StudyHub';

export default async function StudyPage({ searchParams }: { searchParams: Promise<{ jobId?: string }> }) {
  const { jobId } = await searchParams;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--primary)' }} />
          AI 기반 보험수리학 학습
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
          학습 허브
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          최신보험수리학 교재를 기반으로 Q&amp;A · 검색 · 수식 탐색 · 문제풀기를 활용하세요
        </p>
      </div>

      <StudyHub initialJobId={jobId} />
    </div>
  );
}
