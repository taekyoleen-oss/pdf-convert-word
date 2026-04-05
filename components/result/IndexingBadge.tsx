'use client';

import Link from 'next/link';

export default function IndexingBadge({ ragIndexed }: { ragIndexed: boolean }) {
  if (!ragIndexed) return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm" style={{ background: 'rgba(129,140,248,0.1)', border: '1px solid rgba(129,140,248,0.3)', color: 'var(--accent)' }}>
      ⏳ 학습 자료 인덱싱 중...
    </div>
  );
  return (
    <Link href="/study" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-all hover:opacity-80" style={{ background: 'rgba(110,231,183,0.1)', border: '1px solid rgba(110,231,183,0.3)', color: 'var(--primary)' }}>
      ✅ 학습 자료로 등록됨 → 학습 허브에서 검색하기
    </Link>
  );
}
