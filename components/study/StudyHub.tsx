'use client';

import { useState, useEffect } from 'react';
import SemanticSearch from './SemanticSearch';
import ChatInterface from './ChatInterface';
import QuizGenerator from './QuizGenerator';
import FormulaExplorer from './FormulaExplorer';

type Tab = 'chat' | 'search' | 'quiz' | 'formula';

const TABS: { id: Tab; label: string; icon: string; desc: string }[] = [
  { id: 'chat',    label: 'Q&A 튜터',  icon: '💬', desc: '개념 질문·수식 풀이' },
  { id: 'search',  label: '검색',      icon: '🔍', desc: '교재 내용 탐색' },
  { id: 'formula', label: '수식 탐색', icon: '📐', desc: '공식·예제 목록' },
  { id: 'quiz',    label: '문제풀기',  icon: '📝', desc: '단원별 퀴즈' },
];

/** 파일명 → 챕터 라벨 변환 */
function resolveChapterLabel(originalName: string): string {
  const chapterNames: Record<string, string> = {
    '1': '제1장 이자론',
    '2': '제2장 생명표',
    '3': '제3장 생명보험',
    '4': '제4장 생명연금',
    '5': '제5장 순보험료',
    '6': '제6장 책임준비금',
    '7': '제7장 다중탈퇴',
    '8': '제8장 연금계리',
  };
  // 파일명에서 숫자+장 패턴 추출: "1장", "2장" 등
  const match = originalName.match(/[_\s\-]?(\d+)[장章]/);
  if (match) return chapterNames[match[1]] ?? `제${match[1]}장`;

  // "chapter1", "ch1" 패턴
  const ch = originalName.toLowerCase().match(/ch(?:apter)?[\s_-]?(\d+)/);
  if (ch) return chapterNames[ch[1]] ?? `Chapter ${ch[1]}`;

  return originalName.replace(/\.[^.]+$/, ''); // 확장자 제거
}

interface IndexedJob {
  id: string;
  original_name: string;
  created_at: string;
}

interface Props { initialJobId?: string; }

export default function StudyHub({ initialJobId }: Props) {
  const [active, setActive] = useState<Tab>('chat');
  const [jobId, setJobId] = useState<string>(initialJobId ?? '');
  const [jobs, setJobs] = useState<IndexedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => {
        const indexed = (d.jobs ?? []).filter(
          (j: IndexedJob & { rag_indexed: boolean }) => j.rag_indexed
        );
        setJobs(indexed);
        if (!jobId && indexed.length > 0) setJobId(indexed[0].id);
      })
      .catch(() => setJobs([]))
      .finally(() => setLoadingJobs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedJob = jobs.find((j) => j.id === jobId);
  const chapterLabel = selectedJob ? resolveChapterLabel(selectedJob.original_name) : '';

  return (
    <div>
      {/* ── Chapter / Document Selector ─────────────────────── */}
      <div
        className="mb-6 rounded-2xl border p-5"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              학습 중인 교재
            </p>
            <p className="text-base font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              최신보험수리학
            </p>
          </div>
          {chapterLabel && (
            <span
              className="text-sm font-medium px-3 py-1 rounded-full"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {chapterLabel}
            </span>
          )}
        </div>

        {loadingJobs ? (
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>문서 목록 불러오는 중...</div>
        ) : jobs.length === 0 ? (
          <div
            className="text-sm px-4 py-3 rounded-xl"
            style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            학습 등록된 문서가 없습니다. PDF 변환 후 결과 페이지에서 "학습 자료로 등록"을 클릭하세요.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {jobs.map((j) => {
              const label = resolveChapterLabel(j.original_name);
              const isActive = j.id === jobId;
              return (
                <button
                  key={j.id}
                  onClick={() => setJobId(j.id)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                  style={{
                    background: isActive ? 'var(--primary)' : 'var(--bg, #fff)',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                    boxShadow: isActive ? '0 2px 6px rgba(94,106,210,0.25)' : 'none',
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────── */}
      <div
        className="grid grid-cols-4 gap-2 mb-8"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border text-center transition-all"
              style={{
                background: isActive ? 'var(--primary)' : 'var(--surface)',
                borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                color: isActive ? '#fff' : 'var(--text-muted)',
                boxShadow: isActive ? '0 2px 8px rgba(94,106,210,0.25)' : 'var(--shadow-sm)',
              }}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="text-xs font-semibold">{tab.label}</span>
              <span className="text-xs hidden sm:block opacity-70">{tab.desc}</span>
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ─────────────────────────────────────── */}
      <div>
        {active === 'chat'    && <ChatInterface    jobId={jobId || undefined} />}
        {active === 'search'  && <SemanticSearch   jobId={jobId || undefined} />}
        {active === 'formula' && <FormulaExplorer  jobId={jobId || undefined} />}
        {active === 'quiz'    && <QuizGenerator    jobId={jobId || undefined} />}
      </div>
    </div>
  );
}
