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

/** 파일명 → 챕터 키 (같은 장은 같은 키로 묶임) */
function resolveChapterKey(originalName: string): string {
  const match = originalName.match(/[_\s\-]?(\d+)[장章]/);
  if (match) return `ch${match[1]}`;
  const ch = originalName.toLowerCase().match(/ch(?:apter)?[\s_-]?(\d+)/);
  if (ch) return `ch${ch[1]}`;
  return originalName.replace(/\.[^.]+$/, '');
}

/** 챕터 키 → 표시 이름 */
function chapterKeyToLabel(key: string): string {
  const chapterNames: Record<string, string> = {
    ch1: '제1장 이자론',
    ch2: '제2장 생명표',
    ch3: '제3장 생명보험',
    ch4: '제4장 생명연금',
    ch5: '제5장 순보험료',
    ch6: '제6장 책임준비금',
    ch7: '제7장 다중탈퇴',
    ch8: '제8장 연금계리',
  };
  return chapterNames[key] ?? key;
}

interface IndexedJob {
  id: string;
  original_name: string;
  created_at: string;
}

/** 챕터 단위로 묶은 그룹 */
interface ChapterGroup {
  key: string;
  label: string;
  jobIds: string[];
  latestCreatedAt: string;
}

function groupByChapter(jobs: IndexedJob[]): ChapterGroup[] {
  const map = new Map<string, ChapterGroup>();
  for (const job of jobs) {
    const key = resolveChapterKey(job.original_name);
    if (!map.has(key)) {
      map.set(key, { key, label: chapterKeyToLabel(key), jobIds: [], latestCreatedAt: job.created_at });
    }
    const g = map.get(key)!;
    g.jobIds.push(job.id);
    if (job.created_at > g.latestCreatedAt) g.latestCreatedAt = job.created_at;
  }
  // 챕터 번호 순 정렬
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

interface Props { initialJobId?: string; }

export default function StudyHub({ initialJobId }: Props) {
  const [active, setActive] = useState<Tab>('chat');
  const [selectedChapterKey, setSelectedChapterKey] = useState<string>('');
  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  useEffect(() => {
    fetch('/api/history')
      .then((r) => r.json())
      .then((d) => {
        const indexed: IndexedJob[] = (d.jobs ?? []).filter(
          (j: IndexedJob & { rag_indexed: boolean }) => j.rag_indexed
        );
        const groups = groupByChapter(indexed);
        setChapters(groups);

        // initialJobId가 있으면 해당 챕터 선택, 없으면 첫 번째 챕터
        if (initialJobId) {
          const target = groups.find((g) => g.jobIds.includes(initialJobId));
          setSelectedChapterKey(target?.key ?? groups[0]?.key ?? '');
        } else {
          setSelectedChapterKey(groups[0]?.key ?? '');
        }
      })
      .catch(() => setChapters([]))
      .finally(() => setLoadingJobs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedChapter = chapters.find((g) => g.key === selectedChapterKey);
  const activeJobIds = selectedChapter?.jobIds ?? [];

  return (
    <div>
      {/* ── Chapter Selector ──────────────────────────────── */}
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
          {selectedChapter && (
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium px-3 py-1 rounded-full"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                {selectedChapter.label}
              </span>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)' }}
              >
                {selectedChapter.jobIds.length}개 파일 통합
              </span>
            </div>
          )}
        </div>

        {loadingJobs ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <div className="w-3.5 h-3.5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            목록 불러오는 중...
          </div>
        ) : chapters.length === 0 ? (
          <div
            className="text-sm px-4 py-3 rounded-xl"
            style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: '1px solid rgba(217,119,6,0.2)' }}
          >
            학습 등록된 문서가 없습니다. PDF 변환 후 결과 페이지에서 "학습 자료로 등록"을 클릭하세요.
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {chapters.map((chapter) => {
              const isActive = chapter.key === selectedChapterKey;
              return (
                <button
                  key={chapter.key}
                  onClick={() => setSelectedChapterKey(chapter.key)}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all border"
                  style={{
                    background: isActive ? 'var(--primary)' : '#fff',
                    color: isActive ? '#fff' : 'var(--text-secondary)',
                    borderColor: isActive ? 'var(--primary)' : 'var(--border)',
                    boxShadow: isActive ? '0 2px 6px rgba(94,106,210,0.25)' : 'none',
                  }}
                >
                  {chapter.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tab Bar ───────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-2 mb-8">
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

      {/* ── Tab Content ───────────────────────────────────── */}
      <div>
        {active === 'chat'    && <ChatInterface   jobIds={activeJobIds.length ? activeJobIds : undefined} />}
        {active === 'search'  && <SemanticSearch  jobIds={activeJobIds.length ? activeJobIds : undefined} />}
        {active === 'formula' && <FormulaExplorer jobIds={activeJobIds.length ? activeJobIds : undefined} />}
        {active === 'quiz'    && <QuizGenerator   jobIds={activeJobIds.length ? activeJobIds : undefined} />}
      </div>
    </div>
  );
}
