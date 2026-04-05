'use client';

import './globals.css';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'PDF 변환' },
  { href: '/history', label: '변환 이력' },
  { href: '/study', label: '학습 허브' },
];

function NavBar() {
  const pathname = usePathname();
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-semibold text-base flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            A
          </span>
          <span>보험수리학 학습</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  background: active ? 'var(--primary-light)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--text-muted)',
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Right badge */}
        <div className="ml-auto flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
          >
            최신보험수리학
          </span>
        </div>
      </nav>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full flex flex-col" style={{ background: 'var(--background)', color: 'var(--text-primary)' }}>
        <QueryClientProvider client={queryClient}>
          <NavBar />
          <main className="flex-1">{children}</main>
          <footer className="border-t py-5 text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              보험수리학 AI 학습 시스템 · Claude Sonnet 4.6 · Voyage AI
            </p>
          </footer>
        </QueryClientProvider>
      </body>
    </html>
  );
}
