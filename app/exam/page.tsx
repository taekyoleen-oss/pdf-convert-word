import ExamHub from '@/components/exam/ExamHub';
import { ClipboardList } from 'lucide-react';

export default function ExamPage() {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100vh - var(--topbar-height))' }}
    >
      {/* Page header */}
      <div
        className="flex items-center gap-3 px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--accent-light)' }}
        >
          <ClipboardList size={20} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            보험계리사 기출문제
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            연도별 시험문제 풀기 · 정답 확인 · 단원별 분석
          </p>
        </div>
      </div>

      {/* Exam Hub */}
      <div className="flex-1 overflow-y-auto">
        <ExamHub />
      </div>
    </div>
  );
}
