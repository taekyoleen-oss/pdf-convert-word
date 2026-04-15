'use client';

import { useRef, useState } from 'react';
import { validatePdfFile } from '@/lib/utils/file-validation';
import { UploadCloud, FileText, X } from 'lucide-react';

interface Props { onFileSelect: (f: File | null) => void; selectedFile: File | null; }

export default function PdfUploader({ onFileSelect, selectedFile }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const v = validatePdfFile(file);
    if (!v.valid) { setError(v.error ?? ''); onFileSelect(null); return; }
    setError('');
    onFileSelect(file);
  }

  return (
    <div>
      <div
        className="rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: dragOver ? 'var(--primary)' : selectedFile ? 'rgba(52,211,153,0.5)' : 'var(--border-strong)',
          background: dragOver ? 'var(--primary-light)' : selectedFile ? 'var(--success-light)' : 'var(--surface-1)',
        }}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        {selectedFile ? (
          <div className="flex items-center gap-3 justify-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--success-light)' }}
            >
              <FileText size={20} style={{ color: 'var(--success)' }} />
            </div>
            <div className="text-left min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: 'var(--success)' }}>
                {selectedFile.name}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB — 클릭하여 변경
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              className="ml-auto p-1 rounded-lg flex-shrink-0"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: dragOver ? 'var(--primary)' : 'var(--surface-2)',
                transition: 'all 0.2s',
              }}
            >
              <UploadCloud size={22} style={{ color: dragOver ? '#fff' : 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                PDF 파일을 드래그하거나 클릭하여 선택
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                최대 50MB · .pdf 파일만 지원
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 text-xs flex items-center gap-1.5" style={{ color: 'var(--error)' }}>
          <span>⚠</span>{error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
