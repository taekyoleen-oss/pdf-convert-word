'use client';

import { useState, useEffect } from 'react';
import SemanticSearch from './SemanticSearch';
import ChatInterface from './ChatInterface';
import QuizGenerator from './QuizGenerator';
import FormulaExplorer from './FormulaExplorer';
import {
  MessageSquare, Search, Calculator, FileQuestion,
  ChevronRight, BookOpen, Layers, FolderOpen, RefreshCw,
  AlertCircle, FileText,
} from 'lucide-react';

type Tab = 'chat' | 'search' | 'quiz' | 'formula';

const TABS: { id: Tab; label: string; icon: typeof MessageSquare; desc: string; color: string; bg: string }[] = [
  { id: 'chat',    label: 'AI 튜터',  icon: MessageSquare, desc: '질문 · 풀이 지도', color: 'var(--primary)', bg: 'var(--primary-light)' },
  { id: 'search',  label: '검색',     icon: Search,        desc: '교재 내용 탐색',  color: 'var(--cyan)',    bg: 'var(--cyan-light)' },
  { id: 'formula', label: '수식',     icon: Calculator,    desc: '공식 · 예제 목록', color: 'var(--accent)', bg: 'var(--accent-light)' },
  { id: 'quiz',    label: '퀴즈',     icon: FileQuestion,  desc: '단원별 문제풀기', color: 'var(--success)', bg: 'var(--success-light)' },
];

/* ── 챕터 이름 맵 ─────────────────────────────────────────────── */
const CHAPTER_NAMES: Record<string, string> = {
  ch1: '제1장 이자론',
  ch2: '제2장 생명표',
  ch3: '제3장 생명보험',
  ch4: '제4장 생명연금',
  ch5: '제5장 순보험료',
  ch6: '제6장 책임준비금',
  ch7: '제7장 다중탈퇴',
  ch8: '제8장 연금계리',
};

/* ── 파일명 → 챕터 키 ─────────────────────────────────────────── */
function resolveChapterKey(name: string): string | null {
  // "1장", "2장", "제1장", "1章" 등
  const jang = name.match(/(?:제)?(\d+)[장章]/);
  if (jang) return `ch${jang[1]}`;
  // "ch1", "chapter1", "ch_1", "ch-1" 등
  const ch = name.toLowerCase().match(/ch(?:apter)?[\s_\-]?(\d+)/);
  if (ch) return `ch${ch[1]}`;
  // "1권", "2권", "1단원", "2단원"
  const kwon = name.match(/(?:제)?(\d+)(?:권|단원)/);
  if (kwon) return `ch${kwon[1]}`;
  // 파일명 앞 숫자만 있는 경우: "01_이자론.pdf", "1. 이자론.pdf"
  const leading = name.match(/^(\d+)[._\s\-]/);
  if (leading) return `ch${leading[1]}`;

  return null; // 매칭 실패 → "기타"로 처리
}

/* ── 타입 정의 ────────────────────────────────────────────────── */
interface IndexedJob {
  id: string;
  original_name: string;
  created_at: string;
  rag_indexed: boolean;
  total_pages?: number;
}

interface ChapterGroup {
  key: string;           // "ch1", "ch2", …  or "기타"
  label: string;         // 표시 이름
  jobIds: string[];
  files: IndexedJob[];   // 포함된 파일 목록
}

function groupByChapter(jobs: IndexedJob[]): ChapterGroup[] {
  const map = new Map<string, ChapterGroup>();

  for (const job of jobs) {
    const rawKey = resolveChapterKey(job.original_name);
    // 매칭 실패 → "기타" 그룹
    const key = rawKey ?? '기타';
    const label = rawKey ? (CHAPTER_NAMES[rawKey] ?? rawKey) : `기타 (${job.original_name.replace(/\.[^.]+$/, '')})`;

    if (!map.has(key)) {
      map.set(key, { key, label: rawKey ? (CHAPTER_NAMES[rawKey] ?? rawKey) : '기타', jobIds: [], files: [] });
    }
    const g = map.get(key)!;
    g.jobIds.push(job.id);
    g.files.push(job);
    // 기타 그룹은 label에 파일명을 반영
    if (!rawKey) g.label = `기타 (${g.files.length}개 파일)`;
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.key === '기타') return 1;
    if (b.key === '기타') return -1;
    return a.key.localeCompare(b.key);
  });
}

/* ── Props ────────────────────────────────────────────────────── */
interface Props { initialJobId?: string; }

/* ── StudyHub 메인 ────────────────────────────────────────────── */
export default function StudyHub({ initialJobId }: Props) {
  const [active, setActive] = useState<Tab>('chat');
  const [selectedKey, setSelectedKey] = useState<string>('__all__');
  const [chapters, setChapters] = useState<ChapterGroup[]>([]);
  const [allIndexedJobs, setAllIndexedJobs] = useState<IndexedJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  function loadJobs() {
    setLoadingJobs(true);
    setLoadError(null);
    fetch('/api/history')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        const indexed: IndexedJob[] = (d.jobs ?? []).filter(
          (j: IndexedJob) => j.rag_indexed
        );
        setAllIndexedJobs(indexed);

        const groups = groupByChapter(indexed);
        setChapters(groups);

        if (initialJobId) {
          const target = groups.find((g) => g.jobIds.includes(initialJobId));
          setSelectedKey(target?.key ?? '__all__');
        } else if (indexed.length > 0) {
          // 자료가 있으면 기본값: 전체 자료
          setSelectedKey('__all__');
        }
      })
      .catch((e) => {
        setLoadError(e.message ?? '자료 목록 불러오기 실패');
        setAllIndexedJobs([]);
        setChapters([]);
      })
      .finally(() => setLoadingJobs(false));
  }

  useEffect(() => {
    loadJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* 선택된 챕터의 jobIds */
  const activeJobIds: string[] = selectedKey === '__all__'
    ? allIndexedJobs.map((j) => j.id)
    : (chapters.find((g) => g.key === selectedKey)?.jobIds ?? []);

  const selectedLabel = selectedKey === '__all__'
    ? `전체 자료 (${allIndexedJobs.length}개 파일)`
    : (chapters.find((g) => g.key === selectedKey)?.label ?? '');

  return (
    <div className="flex overflow-hidden" style={{ height: '100%' }}>

      {/* ── 좌측 사이드바: 챕터/파일 선택 ─────────────────────── */}
      <aside
        className={`flex-shrink-0 flex flex-col border-r transition-all duration-200 ${sidebarOpen ? 'w-60' : 'w-0 overflow-hidden'}`}
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        {/* 사이드바 헤더 */}
        <div className="px-4 py-3 flex items-center justify-between flex-shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <BookOpen size={15} style={{ color: 'var(--text-muted)' }} />
            <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              학습 자료
            </span>
          </div>
          <button
            onClick={loadJobs}
            title="새로고침"
            className="p-1 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw size={13} className={loadingJobs ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* 로딩 */}
          {loadingJobs && (
            <div className="flex items-center gap-2 px-3 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              <div className="w-4 h-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
              불러오는 중...
            </div>
          )}

          {/* 에러 */}
          {!loadingJobs && loadError && (
            <div className="px-3 py-3 text-xs" style={{ color: 'var(--error)' }}>
              <AlertCircle size={13} className="inline mr-1" />
              {loadError}
            </div>
          )}

          {/* 자료 없음 */}
          {!loadingJobs && !loadError && allIndexedJobs.length === 0 && (
            <div className="px-3 py-4 text-sm text-center leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              <Layers size={28} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                등록된 학습 자료가 없습니다
              </p>
              <p className="text-xs leading-relaxed">
                홈에서 PDF를 업로드하고 변환 후,
                <br />결과 페이지의 <strong>&ldquo;학습 자료로 등록&rdquo;</strong>
                <br />버튼을 클릭하세요.
              </p>
            </div>
          )}

          {/* 자료 목록 */}
          {!loadingJobs && allIndexedJobs.length > 0 && (
            <div className="space-y-0.5">
              {/* 전체 자료 버튼 */}
              <SidebarBtn
                isActive={selectedKey === '__all__'}
                onClick={() => setSelectedKey('__all__')}
                icon={<FolderOpen size={15} />}
                label="전체 자료 통합"
                badge={`${allIndexedJobs.length}개`}
              />

              {/* 구분선 */}
              {chapters.length > 0 && (
                <div className="px-3 pt-3 pb-1">
                  <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>
                    단원별
                  </span>
                </div>
              )}

              {/* 챕터 그룹 */}
              {chapters.map((chapter) => (
                <div key={chapter.key}>
                  <SidebarBtn
                    isActive={selectedKey === chapter.key}
                    onClick={() => setSelectedKey(chapter.key)}
                    icon={<BookOpen size={15} />}
                    label={chapter.label}
                    badge={`${chapter.files.length}개`}
                  />
                  {/* 챕터 내 파일 목록 (선택 시) */}
                  {selectedKey === chapter.key && chapter.files.length > 0 && (
                    <div className="ml-5 mt-0.5 mb-1 space-y-0.5">
                      {chapter.files.map((f) => (
                        <div
                          key={f.id}
                          className="flex items-start gap-1.5 px-2 py-1.5 rounded-lg text-xs"
                          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
                        >
                          <FileText size={11} className="flex-shrink-0 mt-0.5" />
                          <span className="truncate leading-snug" title={f.original_name}>
                            {f.original_name.replace(/\.[^.]+$/, '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* 개별 파일 목록 (챕터 매칭 실패한 것들도 포함) */}
              {allIndexedJobs.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1">
                    <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-disabled)' }}>
                      개별 파일
                    </span>
                  </div>
                  {allIndexedJobs.map((job) => (
                    <SidebarBtn
                      key={job.id}
                      isActive={selectedKey === job.id}
                      onClick={() => setSelectedKey(job.id)}
                      icon={<FileText size={14} />}
                      label={job.original_name.replace(/\.[^.]+$/, '')}
                      badge={job.total_pages ? `${job.total_pages}p` : undefined}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ── 메인 영역 ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* 탭 바 */}
        <div
          className="flex items-center gap-2 px-4 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {/* 사이드바 토글 */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg mr-1 flex-shrink-0 transition-all"
            style={{ color: 'var(--text-muted)', background: 'var(--surface-1)', border: '1px solid var(--border)' }}
            title={sidebarOpen ? '자료 목록 닫기' : '자료 목록 열기'}
          >
            <Layers size={15} />
          </button>

          {/* 선택된 자료 이름 */}
          {selectedLabel && activeJobIds.length > 0 && (
            <span
              className="text-sm font-semibold px-2.5 py-1 rounded-lg mr-2 flex-shrink-0 truncate max-w-xs"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              {selectedLabel}
            </span>
          )}

          {/* 탭 버튼 */}
          <div className="flex items-center gap-1 flex-wrap">
            {TABS.map((tab) => {
              const isActive = active === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all"
                  style={{
                    fontSize: '0.82rem',
                    background: isActive ? tab.bg : 'transparent',
                    color: isActive ? tab.color : 'var(--text-muted)',
                    border: isActive ? `1px solid ${tab.color}30` : '1px solid transparent',
                  }}
                >
                  <tab.icon size={14} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 자료 없을 때 안내 */}
        {activeJobIds.length === 0 && !loadingJobs && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6 py-12">
              <Layers size={40} className="mx-auto mb-4 opacity-20" />
              <p className="text-base font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                학습 자료를 선택하세요
              </p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                왼쪽 목록에서 학습할 단원이나 파일을 선택하면 AI 튜터를 사용할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {/* 탭 컨텐츠 */}
        {activeJobIds.length > 0 && (
          <div className="flex-1 overflow-hidden">
            {active === 'chat' && (
              <ChatInterface jobIds={activeJobIds} />
            )}
            {active === 'search' && (
              <div className="p-6 h-full overflow-y-auto">
                <SemanticSearch jobIds={activeJobIds} />
              </div>
            )}
            {active === 'formula' && (
              <div className="p-6 h-full overflow-y-auto">
                <FormulaExplorer jobIds={activeJobIds} />
              </div>
            )}
            {active === 'quiz' && (
              <div className="p-6 h-full overflow-y-auto">
                <QuizGenerator jobIds={activeJobIds} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 사이드바 버튼 컴포넌트 ───────────────────────────────────── */
function SidebarBtn({
  isActive, onClick, icon, label, badge,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
      style={{
        background: isActive ? 'var(--primary-light)' : 'transparent',
        color: isActive ? 'var(--primary)' : 'var(--text-muted)',
        borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
        fontSize: '0.85rem',
        fontWeight: isActive ? 600 : 400,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLElement).style.background = 'transparent';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
        }
      }}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="flex-1 truncate leading-snug">{label}</span>
      {badge && (
        <span
          className="text-xs px-1.5 py-0.5 rounded-md flex-shrink-0"
          style={{
            background: isActive ? 'rgba(99,102,241,0.2)' : 'var(--surface-2)',
            color: isActive ? 'var(--primary)' : 'var(--text-disabled)',
            fontSize: '0.7rem',
          }}
        >
          {badge}
        </span>
      )}
      {isActive && <ChevronRight size={12} className="flex-shrink-0" />}
    </button>
  );
}
