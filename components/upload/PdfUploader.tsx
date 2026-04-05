'use client';

import { useRef, useState } from 'react';
import { validatePdfFile } from '@/lib/utils/file-validation';

interface Props { onFileSelect: (f: File | null) => void; selectedFile: File | null; }

export default function PdfUploader({ onFileSelect, selectedFile }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const v = validatePdfFile(file);
    if (!v.valid) { setError(v.error ?? ''); onFileSelect(null); return; }
    setError(''); onFileSelect(file);
  }

  return (
    <div>
      <div
        className="rounded-lg border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{ borderColor: dragOver ? 'var(--primary)' : 'var(--border)', background: dragOver ? 'rgba(110,231,183,0.05)' : 'transparent' }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <div className="text-4xl mb-3">📄</div>
        {selectedFile ? (
          <div>
            <p className="font-semibold" style={{ color: 'var(--primary)' }}>{selectedFile.name}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{(selectedFile.size / 1024 / 1024).toFixed(1)} MB — 클릭하여 변경</p>
          </div>
        ) : (
          <div>
            <p className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>PDF 파일을 드래그하거나 클릭하여 선택</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>최대 50MB · .pdf 파일만 지원</p>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
      <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
    </div>
  );
}
