'use client';

import { useState, useRef, useEffect } from 'react';
import LatexRenderer from './LatexRenderer';
import { Send, Bot, User, Lightbulb } from 'lucide-react';

interface Message { role: 'user' | 'assistant'; content: string; ts?: number; }
interface Props { jobIds?: string[]; }

const EXAMPLE_QUESTIONS = [
  '현가율(v)이란 무엇이고 이력(δ)과 어떤 관계인가요?',
  '교환함수 $D_x$, $N_x$, $C_x$, $M_x$를 설명해주세요',
  '종신보험 순보험료를 교환함수로 어떻게 계산하나요?',
  '연금현가 $\\ddot{a}_x$를 단계적으로 유도해주세요',
  '책임준비금 Prospective 방식과 Retrospective 방식의 차이는?',
];

export default function ChatInterface({ jobIds }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text?: string) {
    const userMsg = (text ?? input).trim();
    if (!userMsg || streaming) return;
    setInput('');

    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMsg, ts: Date.now() }];
    setMessages(updatedMessages);
    setStreaming(true);

    const assistantMsg: Message = { role: 'assistant', content: '', ts: Date.now() };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch('/api/study/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, jobIds: jobIds ?? [] }),
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
                next[next.length - 1] = {
                  ...next[next.length - 1],
                  content: next[next.length - 1].content + parsed.text,
                };
                return next;
              });
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          ...next[next.length - 1],
          content: '오류가 발생했습니다. 다시 시도해 주세요.',
        };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Empty state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8 fade-in">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'var(--primary-light)', boxShadow: 'var(--shadow-glow)' }}
            >
              <Bot size={28} style={{ color: 'var(--primary)' }} />
            </div>
            <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              보험수리학 AI 튜터
            </h3>
            <p className="text-sm mb-8 max-w-xs" style={{ color: 'var(--text-muted)' }}>
              개념 설명, 수식 유도, 시험 대비 풀이까지 — 무엇이든 물어보세요
            </p>
            <div className="w-full max-w-md space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={13} style={{ color: 'var(--amber)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  자주 묻는 질문
                </span>
              </div>
              {EXAMPLE_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--primary-light)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
                    (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }}
                >
                  <LatexRenderer text={q} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} fade-in`}>
            {/* Avatar */}
            <div className="flex-shrink-0 mt-0.5">
              {msg.role === 'assistant' ? (
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--primary-light)' }}
                >
                  <Bot size={15} style={{ color: 'var(--primary)' }} />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--surface-2)' }}
                >
                  <User size={15} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>

            {/* Bubble */}
            <div className="max-w-[78%]">
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={
                  msg.role === 'user'
                    ? {
                        background: 'var(--gradient-primary)',
                        color: '#fff',
                        borderRadius: '18px 4px 18px 18px',
                        boxShadow: 'var(--shadow-glow)',
                      }
                    : {
                        background: 'var(--surface-1)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border)',
                        borderRadius: '4px 18px 18px 18px',
                      }
                }
              >
                {msg.role === 'assistant' ? (
                  <>
                    <LatexRenderer text={msg.content} />
                    {streaming && i === messages.length - 1 && msg.content === '' && (
                      <span className="flex gap-1">
                        {[0, 1, 2].map((j) => (
                          <span
                            key={j}
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{
                              background: 'var(--primary)',
                              animation: `blink 1.2s step-end ${j * 0.2}s infinite`,
                            }}
                          />
                        ))}
                      </span>
                    )}
                    {streaming && i === messages.length - 1 && msg.content !== '' && (
                      <span
                        className="inline-block w-0.5 h-4 ml-0.5 rounded-sm cursor-blink"
                        style={{ background: 'var(--primary)', verticalAlign: 'middle' }}
                      />
                    )}
                  </>
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        className="flex-shrink-0 px-6 py-4"
        style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)' }}
      >
        <div
          className="flex items-end gap-3 rounded-2xl p-3"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
          onFocus={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--primary)'; }}
          onBlur={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder="보험수리학에 대해 무엇이든 질문하세요... (Enter: 전송, Shift+Enter: 줄바꿈)"
            disabled={streaming}
            rows={1}
            className="flex-1 text-sm resize-none border-0 outline-none overflow-hidden min-h-[24px]"
            style={{
              background: 'transparent',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={streaming || !input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 disabled:opacity-30 transition-all"
            style={{
              background: input.trim() && !streaming ? 'var(--gradient-primary)' : 'var(--surface-2)',
              boxShadow: input.trim() && !streaming ? 'var(--shadow-glow)' : 'none',
            }}
          >
            {streaming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={15} color="#fff" />
            )}
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: 'var(--text-disabled)' }}>
          Claude Sonnet 4.6 + RAG 기반 응답 · 수식은 LaTeX으로 렌더링됩니다
        </p>
      </div>
    </div>
  );
}
