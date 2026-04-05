'use client';

import { useState } from 'react';

interface Props { reason?: string; type?: 'medium' | 'low' | 'fallback'; }

export default function FlagBadge({ reason, type = 'medium' }: Props) {
  const [show, setShow] = useState(false);
  const color = type === 'medium' ? 'var(--warning)' : 'var(--error)';
  const label = type === 'medium' ? '⚠ 검토 권장' : '🚨 폴백/재파싱 실패';
  return (
    <span className="relative inline-block ml-1">
      <button onClick={() => setShow(!show)} className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}22`, color, border: `1px solid ${color}44` }}>
        {label}
      </button>
      {show && reason && (
        <div className="absolute z-10 bottom-full left-0 mb-1 p-2 rounded-lg text-xs w-64 shadow-lg" style={{ background: 'var(--math-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
          {reason}
          <button onClick={() => setShow(false)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
        </div>
      )}
    </span>
  );
}
