'use client';

interface Props { value: string; onChange: (v: string) => void; }

export default function PageRangeSelector({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
        페이지 범위 선택 <span style={{ color: 'var(--text-muted)' }}>(선택사항 — 비워두면 전체)</span>
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="예: 1-5, 8, 10-15"
        className="w-full px-4 py-2 rounded-lg text-sm outline-none transition"
        style={{ background: 'var(--math-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
      <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>쉼표로 구분 · 범위는 하이픈(-) 사용 · 예: 1-10, 15, 20-25</p>
    </div>
  );
}
