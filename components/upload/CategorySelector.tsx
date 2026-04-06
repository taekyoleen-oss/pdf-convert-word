'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
}

export default function CategorySelector({ value, onChange }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 부모 value 변경 시 동기화
  useEffect(() => { setInputVal(value); }, [value]);

  const filtered = inputVal
    ? categories.filter((c) => c.toLowerCase().includes(inputVal.toLowerCase()))
    : categories;

  function select(cat: string) {
    setInputVal(cat);
    onChange(cat);
    setOpen(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputVal(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'Enter' && inputVal.trim()) {
      select(inputVal.trim());
    }
  }

  const showNew = inputVal.trim() && !categories.some((c) => c === inputVal.trim());

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
        카테고리
        <span className="ml-1 text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(선택사항)</span>
      </label>
      <div className="relative">
        <input
          type="text"
          value={inputVal}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="예: 제1장 이자론"
          className="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none transition-all"
          style={{
            background: 'var(--math-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          {filtered.map((cat) => (
            <button
              key={cat}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(cat)}
              className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity flex items-center gap-2"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>📁</span>
              {cat}
            </button>
          ))}
          {showNew && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(inputVal.trim())}
              className="w-full text-left px-3 py-2 text-sm hover:opacity-80 transition-opacity flex items-center gap-2"
              style={{
                color: 'var(--primary)',
                borderTop: filtered.length > 0 ? '1px solid var(--border)' : undefined,
              }}
            >
              <span className="text-xs font-bold">+</span>
              <span className="font-medium">"{inputVal.trim()}"</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>신규 카테고리 추가</span>
            </button>
          )}
          {filtered.length === 0 && !showNew && (
            <div className="px-3 py-3 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              카테고리를 입력하면 신규 추가됩니다
            </div>
          )}
        </div>
      )}
    </div>
  );
}
