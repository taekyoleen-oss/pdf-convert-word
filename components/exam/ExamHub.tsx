'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import LatexRenderer from '@/components/study/LatexRenderer';
import {
  Trophy, CheckCircle2, XCircle, ChevronLeft, ChevronRight,
  Clock, RotateCcw, Upload, Filter, AlertTriangle, BookOpen,
  Target, TrendingUp, FileQuestion,
} from 'lucide-react';

interface ExamQuestion {
  id: string;
  year: number;
  exam_type: string;
  question_number: number;
  question_text: string;
  option_1?: string;
  option_2?: string;
  option_3?: string;
  option_4?: string;
  option_5?: string;
  correct_answer?: number;
  explanation?: string;
  category?: string;
  difficulty?: number;
}

interface YearInfo { year: number; exam_types: string[] }

type Mode = 'select' | 'practice' | 'result';

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  '이자론':    { color: 'var(--primary)',  bg: 'var(--primary-light)' },
  '생명표':    { color: 'var(--cyan)',     bg: 'var(--cyan-light)' },
  '생명보험':  { color: 'var(--accent)',   bg: 'var(--accent-light)' },
  '생명연금':  { color: 'var(--success)',  bg: 'var(--success-light)' },
  '순보험료':  { color: 'var(--amber)',    bg: 'var(--amber-light)' },
  '책임준비금':{ color: '#EC4899',         bg: 'rgba(236,72,153,0.12)' },
  '다중탈퇴':  { color: '#14B8A6',         bg: 'rgba(20,184,166,0.12)' },
  '연금계리':  { color: '#F97316',         bg: 'rgba(249,115,22,0.12)' },
};

function getDifficultyLabel(d?: number) {
  if (!d) return '';
  const labels = ['', '매우 쉬움', '쉬움', '보통', '어려움', '매우 어려움'];
  return labels[d] ?? '';
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ExamHub() {
  const [mode, setMode] = useState<Mode>('select');
  const [years, setYears] = useState<YearInfo[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [loadingQ, setLoadingQ] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load available years
  useEffect(() => {
    setLoading(true);
    fetch('/api/exam/questions?years=1')
      .then(r => r.json())
      .then(d => {
        setYears(d.years ?? []);
        if ((d.years ?? []).length > 0) setSelectedYear(d.years[0].year);
      })
      .catch(() => setYears([]))
      .finally(() => setLoading(false));
  }, []);

  // Load categories when year changes
  useEffect(() => {
    if (!selectedYear) return;
    fetch(`/api/exam/questions?categories=1&year=${selectedYear}`)
      .then(r => r.json())
      .then(d => setCategories(d.categories ?? []))
      .catch(() => setCategories([]));
  }, [selectedYear]);

  // Timer
  useEffect(() => {
    if (mode === 'practice') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mode]);

  async function startPractice() {
    if (!selectedYear) return;
    setLoadingQ(true);
    try {
      const params = new URLSearchParams({ year: selectedYear.toString(), limit: '50' });
      if (selectedCategory) params.set('category', selectedCategory);
      const res = await fetch(`/api/exam/questions?${params}`);
      const data = await res.json();
      const qs: ExamQuestion[] = data.questions ?? [];
      if (qs.length === 0) return;
      // Shuffle
      const shuffled = [...qs].sort(() => Math.random() - 0.5);
      setQuestions(shuffled);
      setAnswers({});
      setCurrentIdx(0);
      setElapsed(0);
      setShowExplanation(false);
      setMode('practice');
    } finally {
      setLoadingQ(false);
    }
  }

  function selectAnswer(qId: string, optNum: number) {
    if (answers[qId] !== undefined) return; // already answered
    setAnswers(prev => ({ ...prev, [qId]: optNum }));
    setShowExplanation(true);
  }

  function nextQuestion() {
    setShowExplanation(false);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
    } else {
      setMode('result');
    }
  }

  function reset() {
    setMode('select');
    setAnswers({});
    setCurrentIdx(0);
    setElapsed(0);
    setShowExplanation(false);
  }

  // Score calculation
  const scoredAnswered = Object.entries(answers).filter(([qId, ans]) => {
    const q = questions.find(q => q.id === qId);
    return q?.correct_answer === ans;
  });

  const totalAnswered = Object.keys(answers).length;
  const correctCount = scoredAnswered.length;
  const scorePercent = totalAnswered > 0 ? Math.round(correctCount / totalAnswered * 100) : 0;

  const currentQ = questions[currentIdx];
  const currentAnswer = currentQ ? answers[currentQ.id] : undefined;
  const isCorrect = currentAnswer !== undefined && currentQ?.correct_answer === currentAnswer;

  // ── Select Mode ─────────────────────────────────────────────
  if (mode === 'select') {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10 fade-in">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--accent-light)' }}
          >
            <FileQuestion size={20} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>보험계리사 기출문제</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>연도별 시험 문제 풀기 · 정답 확인 · 해설 보기</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3" style={{ color: 'var(--text-muted)' }}>
            <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            문제 목록 불러오는 중...
          </div>
        ) : years.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Year selection */}
            <div className="mb-6">
              <label className="text-xs font-semibold uppercase tracking-wide mb-3 block" style={{ color: 'var(--text-muted)' }}>
                시험 연도 선택
              </label>
              <div className="flex flex-wrap gap-2">
                {years.map(({ year }) => (
                  <button
                    key={year}
                    onClick={() => { setSelectedYear(year); setSelectedCategory(''); }}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: selectedYear === year ? 'var(--gradient-primary)' : 'var(--surface-1)',
                      color: selectedYear === year ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${selectedYear === year ? 'transparent' : 'var(--border)'}`,
                      boxShadow: selectedYear === year ? 'var(--shadow-glow)' : 'none',
                    }}
                  >
                    {year}년
                  </button>
                ))}
              </div>
            </div>

            {/* Category filter */}
            {categories.length > 0 && (
              <div className="mb-6">
                <label className="text-xs font-semibold uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Filter size={12} />
                  단원 필터 (선택사항)
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: !selectedCategory ? 'var(--primary-light)' : 'var(--surface-1)',
                      color: !selectedCategory ? 'var(--primary)' : 'var(--text-muted)',
                      border: `1px solid ${!selectedCategory ? 'var(--border-accent)' : 'var(--border)'}`,
                    }}
                  >
                    전체
                  </button>
                  {categories.map(cat => {
                    const style = CATEGORY_COLORS[cat] ?? { color: 'var(--text-muted)', bg: 'var(--surface-1)' };
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(isSelected ? '' : cat)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                        style={{
                          background: isSelected ? style.bg : 'var(--surface-1)',
                          color: isSelected ? style.color : 'var(--text-muted)',
                          border: `1px solid ${isSelected ? style.color + '40' : 'var(--border)'}`,
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              onClick={startPractice}
              disabled={!selectedYear || loadingQ}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
              style={{
                background: 'var(--gradient-primary)',
                color: '#fff',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              {loadingQ ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 문제 불러오는 중...</>
              ) : (
                <><Target size={18} /> {selectedYear}년 기출문제 시작</>
              )}
            </button>

            {/* Upload hint */}
            <div
              className="mt-6 p-4 rounded-2xl flex items-start gap-3"
              style={{ background: 'var(--amber-light)', border: '1px solid rgba(251,191,36,0.2)' }}
            >
              <Upload size={16} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--amber)' }}>시험지 PDF 추가 방법</p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  홈에서 시험지 PDF를 업로드한 후, 변환 결과 페이지에서 "시험 문제 파싱"을 실행하면
                  기출문제가 자동으로 분류됩니다.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Practice Mode ────────────────────────────────────────────
  if (mode === 'practice' && currentQ) {
    const options = [
      { num: 1, text: currentQ.option_1 },
      { num: 2, text: currentQ.option_2 },
      { num: 3, text: currentQ.option_3 },
      { num: 4, text: currentQ.option_4 },
      { num: 5, text: currentQ.option_5 },
    ].filter(o => o.text);

    const catStyle = CATEGORY_COLORS[currentQ.category ?? ''] ?? { color: 'var(--text-muted)', bg: 'var(--surface-2)' };

    return (
      <div className="max-w-2xl mx-auto px-6 py-6 fade-in">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={reset}
              className="p-2 rounded-xl transition-all"
              style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}
            >
              <ChevronLeft size={18} />
            </button>
            <div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                {selectedYear}년 보험계리사
              </span>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {currentIdx + 1} / {questions.length} 문제
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              <Clock size={14} />
              {formatTime(elapsed)}
            </div>
            <div
              className="px-3 py-1 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--success-light)', color: 'var(--success)' }}
            >
              {correctCount}/{totalAnswered} 정답
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          <div
            className="h-full progress-bar"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
        >
          {/* Meta */}
          <div className="flex items-center gap-2 mb-4">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg"
              style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}
            >
              문제 {currentQ.question_number}
            </span>
            {currentQ.category && (
              <span
                className="text-xs font-medium px-2.5 py-1 rounded-lg"
                style={{ background: catStyle.bg, color: catStyle.color }}
              >
                {currentQ.category}
              </span>
            )}
            {currentQ.difficulty && (
              <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>
                {'★'.repeat(currentQ.difficulty)}{'☆'.repeat(5 - currentQ.difficulty)}
              </span>
            )}
          </div>

          {/* Question text */}
          <div className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-primary)' }}>
            <LatexRenderer text={currentQ.question_text} />
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            {options.map(({ num, text }) => {
              const isSelected = currentAnswer === num;
              const isCorrectOpt = currentQ.correct_answer === num;
              const answered = currentAnswer !== undefined;

              let bg = 'var(--surface-1)';
              let border = 'var(--border)';
              let color = 'var(--text-secondary)';

              if (answered) {
                if (isCorrectOpt) { bg = 'var(--success-light)'; border = 'var(--success)'; color = 'var(--success)'; }
                else if (isSelected && !isCorrectOpt) { bg = 'var(--error-light)'; border = 'var(--error)'; color = 'var(--error)'; }
              } else if (isSelected) {
                bg = 'var(--primary-light)'; border = 'var(--primary)'; color = 'var(--primary)';
              }

              return (
                <button
                  key={num}
                  onClick={() => selectAnswer(currentQ.id, num)}
                  disabled={answered}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all flex items-start gap-3 disabled:cursor-default"
                  style={{ background: bg, border: `1px solid ${border}`, color }}
                >
                  <span
                    className="font-bold flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs"
                    style={{ background: answered && isCorrectOpt ? 'var(--success)' : isSelected && !isCorrectOpt && answered ? 'var(--error)' : 'transparent', color: answered && (isCorrectOpt || (isSelected && !isCorrectOpt)) ? '#fff' : 'inherit' }}
                  >
                    {num}
                  </span>
                  <span className="leading-relaxed"><LatexRenderer text={text ?? ''} /></span>
                  {answered && isCorrectOpt && <CheckCircle2 size={16} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--success)' }} />}
                  {answered && isSelected && !isCorrectOpt && <XCircle size={16} style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--error)' }} />}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {showExplanation && currentAnswer !== undefined && (
            <div
              className="mt-4 p-4 rounded-xl text-sm leading-relaxed fade-in"
              style={{
                background: isCorrect ? 'var(--success-light)' : 'var(--error-light)',
                border: `1px solid ${isCorrect ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                {isCorrect ? (
                  <><CheckCircle2 size={15} style={{ color: 'var(--success)' }} /><span className="font-bold" style={{ color: 'var(--success)' }}>정답입니다!</span></>
                ) : (
                  <><XCircle size={15} style={{ color: 'var(--error)' }} /><span className="font-bold" style={{ color: 'var(--error)' }}>오답입니다</span><span style={{ color: 'var(--text-muted)' }}>· 정답: {currentQ.correct_answer}번</span></>
                )}
              </div>
              {currentQ.explanation && (
                <div style={{ color: 'var(--text-secondary)' }}>
                  <LatexRenderer text={currentQ.explanation} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          <button
            onClick={() => { setCurrentIdx(i => Math.max(0, i - 1)); setShowExplanation(false); }}
            disabled={currentIdx === 0}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-30 transition-all"
            style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <button
            onClick={nextQuestion}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all"
            style={{
              background: 'var(--gradient-primary)',
              color: '#fff',
              boxShadow: 'var(--shadow-glow)',
            }}
          >
            {currentIdx === questions.length - 1 ? (
              <><Trophy size={16} /> 결과 보기</>
            ) : (
              <>다음 문제 <ChevronRight size={16} /></>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Result Mode ──────────────────────────────────────────────
  if (mode === 'result') {
    const grade = scorePercent >= 60 ? '합격권' : '추가 학습 필요';
    const gradeColor = scorePercent >= 60 ? 'var(--success)' : 'var(--error)';

    const categoryBreakdown = questions.reduce<Record<string, { total: number; correct: number }>>((acc, q) => {
      const cat = q.category ?? '기타';
      if (!acc[cat]) acc[cat] = { total: 0, correct: 0 };
      acc[cat].total++;
      if (answers[q.id] === q.correct_answer) acc[cat].correct++;
      return acc;
    }, {});

    return (
      <div className="max-w-2xl mx-auto px-6 py-10 fade-in">
        {/* Score card */}
        <div
          className="rounded-2xl p-8 mb-6 text-center"
          style={{
            background: 'var(--surface)',
            border: `1px solid ${scorePercent >= 60 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)'}`,
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Trophy size={40} style={{ color: gradeColor, margin: '0 auto 16px' }} />
          <div className="text-5xl font-black mb-2" style={{ color: gradeColor }}>{scorePercent}%</div>
          <div className="text-base font-bold mb-1" style={{ color: gradeColor }}>{grade}</div>
          <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {totalAnswered}문제 중 {correctCount}문제 정답 · {formatTime(elapsed)} 소요
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: '총 문제', value: questions.length, icon: FileQuestion, color: 'var(--primary)' },
            { label: '정답', value: correctCount, icon: CheckCircle2, color: 'var(--success)' },
            { label: '오답', value: totalAnswered - correctCount, icon: XCircle, color: 'var(--error)' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="p-4 rounded-xl text-center" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <Icon size={20} style={{ color, margin: '0 auto 8px' }} />
              <div className="text-2xl font-bold mb-0.5" style={{ color }}>{value}</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Category breakdown */}
        {Object.keys(categoryBreakdown).length > 0 && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={15} style={{ color: 'var(--primary)' }} />
              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>단원별 정답률</span>
            </div>
            <div className="space-y-3">
              {Object.entries(categoryBreakdown).map(([cat, { total, correct }]) => {
                const pct = Math.round(correct / total * 100);
                const catStyle = CATEGORY_COLORS[cat] ?? { color: 'var(--text-muted)', bg: 'var(--surface-2)' };
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium" style={{ color: catStyle.color }}>{cat}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{correct}/{total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: catStyle.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <RotateCcw size={15} /> 다시 선택
          </button>
          <button
            onClick={startPractice}
            className="flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
            style={{ background: 'var(--gradient-primary)', color: '#fff', boxShadow: 'var(--shadow-glow)' }}
          >
            <RotateCcw size={15} /> 다시 풀기
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function EmptyState() {
  return (
    <div className="text-center py-16 fade-in">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'var(--surface-1)' }}
      >
        <BookOpen size={28} style={{ color: 'var(--text-disabled)' }} />
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        등록된 기출문제가 없습니다
      </h3>
      <p className="text-sm mb-6 max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        보험계리사 시험지 PDF를 업로드하고 파싱하면 기출문제가 여기에 표시됩니다.
      </p>
      <div
        className="inline-flex flex-col gap-2 p-5 rounded-2xl text-left max-w-xs"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>추가 방법</div>
        {['1. 홈에서 시험지 PDF 업로드', '2. PDF 변환 완료 후 결과 페이지 이동', '3. "시험 문제 파싱" 버튼 클릭', '4. 연도·과목 설정 후 파싱 실행'].map(step => (
          <div key={step} className="text-xs flex items-start gap-2" style={{ color: 'var(--text-muted)' }}>
            <AlertTriangle size={12} style={{ color: 'var(--amber)', flexShrink: 0, marginTop: 1 }} />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}
