'use client';

import { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props { latex: string; display?: boolean; className?: string; }

export default function MathBlock({ latex, display = false, className = '' }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, { displayMode: display, throwOnError: false, output: 'html' });
    } catch {
      if (ref.current) ref.current.textContent = latex;
    }
  }, [latex, display]);
  return <span ref={ref} className={className} style={display ? { display: 'block', textAlign: 'center', padding: '0.5rem 0', background: 'var(--math-bg)', borderRadius: '4px', margin: '0.5rem 0' } : {}} />;
}
