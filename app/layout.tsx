'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard, BookOpen, ClipboardList, History,
  ChevronRight, GraduationCap, Sun, Moon, PanelLeftClose, PanelLeft, Menu, X, Settings2,
} from 'lucide-react';

/* ─── Navigation items ─────────────────────────────────────────── */
const NAV_ITEMS = [
  { href: '/',        label: 'PDF 변환',   icon: LayoutDashboard, desc: '교재 업로드 · Word 변환' },
  { href: '/study',   label: '학습 허브',  icon: BookOpen,        desc: 'AI 튜터 · 퀴즈 · 수식' },
  { href: '/exam',    label: '시험 문제',  icon: ClipboardList,   desc: '보험계리사 기출문제' },
  { href: '/history', label: '변환 이력',  icon: History,         desc: '변환 기록 관리' },
  { href: '/admin',   label: '데이터 관리', icon: Settings2,       desc: '복원 · 재인덱싱 · 진단' },
];

/* ─── Sidebar content ──────────────────────────────────────────── */
function SidebarContent({
  pathname, theme, onToggleTheme, onCloseMobile,
}: {
  pathname: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onCloseMobile?: () => void;
}) {
  return (
    <div
      className="flex flex-col h-full w-full"
      style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)' }}
          >
            <GraduationCap size={18} color="#fff" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
              보험수리학
            </div>
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>AI 학습 시스템</div>
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg ml-2 flex-shrink-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <div className="text-xs font-semibold uppercase tracking-widest px-3 py-2" style={{ color: 'var(--text-disabled)' }}>
          메뉴
        </div>
        {NAV_ITEMS.map(({ href, label, icon: Icon, desc }) => {
          const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              onClick={onCloseMobile}
              className="flex items-center gap-3 px-3 py-3 rounded-xl group transition-all relative"
              style={{
                background: isActive ? 'var(--primary-light)' : 'transparent',
                color: isActive ? 'var(--primary)' : 'var(--text-muted)',
                borderLeft: isActive ? '2px solid var(--primary)' : '2px solid transparent',
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
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm leading-snug">{label}</div>
                <div className="text-xs truncate mt-0.5" style={{ color: 'var(--text-disabled)' }}>{desc}</div>
              </div>
              {isActive && <ChevronRight size={14} strokeWidth={2.5} className="flex-shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: theme toggle + info */}
      <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-semibold"
          style={{
            background: 'var(--surface-1)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          {theme === 'dark' ? (
            <><Sun size={16} style={{ color: 'var(--amber)' }} /><span>라이트 모드로 전환</span></>
          ) : (
            <><Moon size={16} style={{ color: 'var(--primary)' }} /><span>다크 모드로 전환</span></>
          )}
        </button>

        {/* Model badge */}
        <div
          className="px-3 py-2 rounded-xl text-center text-xs"
          style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
        >
          Claude Sonnet 4.6 · Voyage AI
        </div>
      </div>
    </div>
  );
}

/* ─── Top bar ──────────────────────────────────────────────────── */
function TopBar({
  sidebarOpen,
  onToggleSidebar,
  onOpenMobile,
  theme,
  onToggleTheme,
}: {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}) {
  const pathname = usePathname();
  const current = NAV_ITEMS.find(i => pathname === i.href || (i.href !== '/' && pathname.startsWith(i.href)));

  return (
    <div
      className="flex items-center gap-3 px-4 flex-shrink-0"
      style={{
        height: 'var(--topbar-height)',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {/* Desktop sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        title={sidebarOpen ? '사이드바 닫기' : '사이드바 열기'}
        className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl transition-all flex-shrink-0"
        style={{
          background: 'var(--surface-1)',
          color: 'var(--text-muted)',
          border: '1px solid var(--border)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)';
          (e.currentTarget as HTMLElement).style.color = 'var(--primary)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)';
          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        }}
      >
        {sidebarOpen
          ? <PanelLeftClose size={18} />
          : <PanelLeft size={18} />
        }
      </button>

      {/* Mobile hamburger */}
      <button
        onClick={onOpenMobile}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
        style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
      >
        <Menu size={18} />
      </button>

      {/* Current page label */}
      <div className="flex items-center gap-2.5 min-w-0">
        {current && (
          <>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--primary-light)' }}
            >
              <current.icon size={14} style={{ color: 'var(--primary)' }} />
            </div>
            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
              {current.label}
            </span>
          </>
        )}
        {!current && (
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--gradient-primary)' }}
            >
              <GraduationCap size={14} color="#fff" />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>보험수리학</span>
          </div>
        )}
      </div>

      {/* Right: theme toggle */}
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleTheme}
          title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'var(--surface-1)',
            color: 'var(--text-muted)',
            border: '1px solid var(--border)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-hover)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)';
            (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
          }}
        >
          {theme === 'dark'
            ? <><Sun size={15} style={{ color: 'var(--amber)' }} /><span className="hidden sm:inline">라이트</span></>
            : <><Moon size={15} style={{ color: 'var(--primary)' }} /><span className="hidden sm:inline">다크</span></>
          }
        </button>
      </div>
    </div>
  );
}

/* ─── Root Layout ──────────────────────────────────────────────── */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // 마운트 시 localStorage에서 설정 복원
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const savedSidebar = localStorage.getItem('sidebarOpen');
    if (savedTheme) setTheme(savedTheme);
    if (savedSidebar !== null) setDesktopSidebarOpen(savedSidebar === 'true');
    setMounted(true);
  }, []);

  // 테마 변경 시 HTML에 적용
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  // 사이드바 상태 저장
  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem('sidebarOpen', String(desktopSidebarOpen));
  }, [desktopSidebarOpen, mounted]);

  // 모바일 사이드바: 라우트 변경 시 닫기
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const toggleSidebar = useCallback(() => {
    setDesktopSidebarOpen(o => !o);
  }, []);

  return (
    <html lang="ko" className="h-full" data-theme={theme} suppressHydrationWarning>
      <head>
        {/* 테마 깜빡임 방지 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme')||'dark';document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body className="h-full" style={{ background: 'var(--background)' }}>
        <QueryClientProvider client={queryClient}>
          {/* ── Mobile sidebar overlay ───────────────────── */}
          {mobileSidebarOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div
                className="absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(2px)' }}
                onClick={() => setMobileSidebarOpen(false)}
              />
              <div
                className="relative z-10 h-full fade-in"
                style={{ width: 'var(--sidebar-width)' }}
              >
                <SidebarContent
                  pathname={pathname}
                  theme={theme}
                  onToggleTheme={toggleTheme}
                  onCloseMobile={() => setMobileSidebarOpen(false)}
                />
              </div>
            </div>
          )}

          {/* ── Main shell ────────────────────────────── */}
          <div className="flex flex-col h-full">
            {/* Top bar (항상 표시) */}
            <TopBar
              sidebarOpen={desktopSidebarOpen}
              onToggleSidebar={toggleSidebar}
              onOpenMobile={() => setMobileSidebarOpen(true)}
              theme={theme}
              onToggleTheme={toggleTheme}
            />

            {/* Content area */}
            <div className="flex flex-1 overflow-hidden">
              {/* ── Desktop sidebar (문서 흐름 안에 위치 → 메인 밀어냄) ── */}
              <aside
                className="hidden lg:flex flex-shrink-0 overflow-hidden sidebar-transition"
                style={{ width: desktopSidebarOpen ? 'var(--sidebar-width)' : '0px' }}
              >
                <div style={{ width: 'var(--sidebar-width)', height: '100%', flexShrink: 0 }}>
                  <SidebarContent
                    pathname={pathname}
                    theme={theme}
                    onToggleTheme={toggleTheme}
                  />
                </div>
              </aside>

              {/* ── Main content ───────────────────────── */}
              <main
                className="flex-1 min-w-0 overflow-y-auto"
                style={{ background: 'var(--gradient-radial)' }}
              >
                {children}
              </main>
            </div>
          </div>
        </QueryClientProvider>
      </body>
    </html>
  );
}
