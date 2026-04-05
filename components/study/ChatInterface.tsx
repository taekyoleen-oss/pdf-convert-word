'use client';

import { useState, useRef, useEffect } from 'react';
import LatexRenderer from './LatexRenderer';

interface Message { role: 'user' | 'assistant'; content: string; }
interface Props { jobId?: string; }

const EXAMPLE_QUESTIONS = [
  '현가율(v)이란 무엇이고 이력(δ)과 어떤 관계인가요?',
  '교환함수 $D_x$, $N_x$, $C_x$, $M_x$를 설명해주세요',
  '종신보험 순보험료를 교환함수로 어떻게 계산하나요?',
  '연금현가 $\\ddot{a}_x$를 단계적으로 유도해주세요',
];

export default function ChatInterface({ jobId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || streaming) return;

    const userMsg = input.trim();
    setInput('');
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '' };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, jobIds: jobId ? [jobId] : [] }),
      });
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.text) {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: next[next.length - 1].content + parsed.text };
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해 주세요.' };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: '600px' }}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4"
              style={{ background: 'var(--primary-light)' }}
            >
              🎓
            </div>
            <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>보험수리학 AI 튜터</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              개념 설명 · 수식 유도 · 풀이 지도 · 시험 대비
            </p>
            <div className="w-full space-y-2 max-w-md">
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all border hover:border-[var(--primary)] hover:bg-[var(--primary-light)]"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
                >
                  <LatexRenderer text={q} />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0 mr-2 mt-0.5"
                style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                🎓
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed"
              style={
                msg.role === 'user'
                  ? { background: 'var(--primary)', color: '#fff', borderRadius: '18px 18px 4px 18px' }
                  : { background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '4px 18px 18px 18px' }
              }
            >
              {msg.role === 'assistant' ? (
                <>
                  <LatexRenderer text={msg.content} />
                  {streaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 ml-1 rounded-sm animate-pulse" style={{ background: 'var(--primary)' }} />
                  )}
                </>
              ) : (
                <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="보험수리학에 대해 무엇이든 질문하세요..."
          disabled={streaming}
          className="flex-1 px-4 py-3 rounded-xl border text-sm outline-none transition-all"
          style={{
            background: '#fff',
            borderColor: 'var(--border)',
            color: 'var(--text-primary)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-40 transition-all"
          style={{ background: 'var(--primary)', color: '#fff', boxShadow: '0 2px 6px rgba(94,106,210,0.3)' }}
        >
          {streaming ? '...' : '전송'}
        </button>
      </form>
    </div>
  );
}
