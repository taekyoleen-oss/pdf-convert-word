'use client';

import React, { useEffect, useRef } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Props {
  text: string;
  className?: string;
}

// Split text by display math ($$...$$) and inline math ($...$)
function parseSegments(text: string): Array<{ type: 'text' | 'display' | 'inline'; value: string }> {
  const segments: Array<{ type: 'text' | 'display' | 'inline'; value: string }> = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for display math $$...$$
    const displayStart = remaining.indexOf('$$');
    const inlineStart = remaining.indexOf('$');

    if (displayStart === -1 && inlineStart === -1) {
      segments.push({ type: 'text', value: remaining });
      break;
    }

    // Display math comes first (or only display math found)
    if (displayStart !== -1 && (inlineStart === -1 || displayStart <= inlineStart)) {
      if (displayStart > 0) {
        segments.push({ type: 'text', value: remaining.slice(0, displayStart) });
      }
      const endIdx = remaining.indexOf('$$', displayStart + 2);
      if (endIdx === -1) {
        segments.push({ type: 'text', value: remaining.slice(displayStart) });
        break;
      }
      segments.push({ type: 'display', value: remaining.slice(displayStart + 2, endIdx) });
      remaining = remaining.slice(endIdx + 2);
      continue;
    }

    // Inline math $...$
    if (inlineStart !== -1) {
      if (inlineStart > 0) {
        segments.push({ type: 'text', value: remaining.slice(0, inlineStart) });
      }
      const endIdx = remaining.indexOf('$', inlineStart + 1);
      if (endIdx === -1) {
        segments.push({ type: 'text', value: remaining.slice(inlineStart) });
        break;
      }
      segments.push({ type: 'inline', value: remaining.slice(inlineStart + 1, endIdx) });
      remaining = remaining.slice(endIdx + 1);
      continue;
    }
  }

  return segments;
}

function renderMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[2] !== undefined) {
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3] !== undefined) {
      parts.push(<em key={key++}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function KatexSpan({ latex, displayMode }: { latex: string; displayMode: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, {
        displayMode,
        throwOnError: false,
        output: 'htmlAndMathml',
      });
    } catch {
      if (ref.current) ref.current.textContent = displayMode ? `$$${latex}$$` : `$${latex}$`;
    }
  }, [latex, displayMode]);

  return (
    <span
      ref={ref}
      className={displayMode ? 'block my-3 overflow-x-auto text-center' : 'inline-block align-middle'}
    />
  );
}

export default function LatexRenderer({ text, className }: Props) {
  const segments = parseSegments(text);

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === 'display') {
          return <KatexSpan key={i} latex={seg.value} displayMode />;
        }
        if (seg.type === 'inline') {
          return <KatexSpan key={i} latex={seg.value} displayMode={false} />;
        }
        // Plain text — parse **bold** and *italic*, preserve newlines
        return (
          <span key={i} style={{ whiteSpace: 'pre-wrap' }}>
            {renderMarkdown(seg.value)}
          </span>
        );
      })}
    </span>
  );
}
