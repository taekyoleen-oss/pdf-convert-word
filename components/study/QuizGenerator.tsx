'use client';

import { useState } from 'react';
import LatexRenderer from './LatexRenderer';

interface QuizOption { label: string; text: string; }
interface Quiz {
  question: string;
  type: 'multiple_choice' | 'short_answer';
  choices?: string[];
  options?: QuizOption[];
  answer: string;
  explanation: string;
  source_page?: number;
}

interface Props { jobIds?: string[]; }

export default function QuizGenerator({ jobIds }: Props) {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(3);
  const [difficulty, setDifficulty] = useState<'기초' | '중급' | '심화'>('중급');
  const [quizType, setQuizType] = useState<'multiple_choice' | 'short_answer'>('multiple_choice');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    setQuizzes([]);
    setAnswers({});
    setSubmitted(false);
    try {
      const res = await fetch('/api/study/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          count,
          difficulty,
          type: quizType,
          jobIds: jobIds?.length ? jobIds : undefined,
        }),
      });
      const data = await res.json();
      setQuizzes(data.questions ?? []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() { setSubmitted(true); }

  function score() {
    return quizzes.filter((q, i) => {
      const userAnswer = answers[i]?.trim().toLowerCase() ?? '';
      return userAnswer === q.answer.trim().toLowerCase();
    }).length;
  }

  // Normalize API response: choices can be string[] or QuizOption[]
  function getOptions(quiz: Quiz): QuizOption[] {
    if (quiz.options) return quiz.options;
    if (quiz.choices) {
      return quiz.choices.map((c, idx) => {
        const labels = ['①', '②', '③', '④', '⑤'];
        return { label: labels[idx] ?? String(idx + 1), text: c };
      });
    }
    return [];
  }

  return (
    <div>
      <form onSubmit={handleGenerate} className="p-4 rounded-xl border mb-6 space-y-4" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>주제 (필수)</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 교환함수, 생명표, 순보험료..."
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>문제 수</label>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
              style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              {[1, 3, 5, 10].map((n) => <option key={n} value={n}>{n}문제</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>난이도</label>
            <div className="flex gap-2">
              {(['기초', '중급', '심화'] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: difficulty === d ? 'var(--primary)' : 'var(--border)',
                    color: difficulty === d ? '#0F1117' : 'var(--text-muted)',
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>유형</label>
            <div className="flex gap-2">
              {([['multiple_choice', '객관식'], ['short_answer', '주관식']] as const).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setQuizType(v)}
                  className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: quizType === v ? 'var(--accent)' : 'var(--border)',
                    color: quizType === v ? '#0F1117' : 'var(--text-muted)',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40"
          style={{ background: 'var(--primary)', color: '#0F1117' }}
        >
          {loading ? '문제 생성 중...' : '📝 문제 생성'}
        </button>
      </form>

      {quizzes.length > 0 && (
        <div className="space-y-6">
          {quizzes.map((quiz, i) => {
            const opts = getOptions(quiz);
            return (
              <div key={i} className="p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  <span className="text-xs mr-2 px-1.5 py-0.5 rounded" style={{ background: 'var(--border)', color: 'var(--text-muted)' }}>Q{i + 1}</span>
                  <LatexRenderer text={quiz.question} />
                </p>

                {quiz.type === 'multiple_choice' && opts.length > 0 ? (
                  <div className="space-y-2">
                    {opts.map((opt) => {
                      const selected = answers[i] === opt.label;
                      const correct = submitted && opt.label === quiz.answer;
                      const wrong = submitted && selected && opt.label !== quiz.answer;
                      return (
                        <button
                          key={opt.label}
                          onClick={() => !submitted && setAnswers((p) => ({ ...p, [i]: opt.label }))}
                          className="w-full text-left px-4 py-2.5 rounded-lg border text-sm transition-all"
                          style={{
                            borderColor: correct ? 'var(--success)' : wrong ? 'var(--error)' : selected ? 'var(--primary)' : 'var(--border)',
                            background: correct ? '#6EE7B722' : wrong ? '#F8717122' : selected ? 'var(--primary)22' : 'transparent',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <span className="font-medium mr-2">{opt.label}</span>
                          <LatexRenderer text={opt.text} />
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={answers[i] ?? ''}
                    onChange={(e) => !submitted && setAnswers((p) => ({ ...p, [i]: e.target.value }))}
                    placeholder="답안을 입력하세요..."
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                  />
                )}

                {submitted && (
                  <div className="mt-3 p-3 rounded-lg text-xs" style={{ background: 'var(--math-bg, var(--surface))', color: 'var(--text-muted)' }}>
                    <div className="font-medium mb-1" style={{ color: 'var(--success)' }}>
                      정답: <LatexRenderer text={quiz.answer} />
                    </div>
                    <LatexRenderer text={quiz.explanation} />
                    {quiz.source_page && <p className="mt-1">출처: p.{quiz.source_page}</p>}
                  </div>
                )}
              </div>
            );
          })}

          {!submitted ? (
            <button
              onClick={handleSubmit}
              className="w-full py-3 rounded-lg font-semibold text-sm"
              style={{ background: 'var(--accent)', color: '#0F1117' }}
            >
              채점하기
            </button>
          ) : (
            <div className="text-center p-4 rounded-xl border" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
              <p className="text-2xl font-bold mb-1" style={{ color: 'var(--primary)' }}>{score()} / {quizzes.length}</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>정답률 {Math.round(score() / quizzes.length * 100)}%</p>
            </div>
          )}
        </div>
      )}

      {!loading && quizzes.length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
          <div className="text-4xl mb-3">📝</div>
          <p className="text-sm">주제를 입력하고 문제를 생성하세요</p>
        </div>
      )}
    </div>
  );
}
