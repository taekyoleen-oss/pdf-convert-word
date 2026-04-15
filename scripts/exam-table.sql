-- =========================================================
-- 보험계리사 시험 문제 테이블 생성
-- Supabase SQL Editor에서 실행하세요
-- =========================================================

CREATE TABLE IF NOT EXISTS exam_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INTEGER NOT NULL,                        -- 시험 연도 (예: 2023)
  exam_type       TEXT NOT NULL DEFAULT '보험계리사',       -- '보험계리사' | '계리사'
  subject         TEXT NOT NULL DEFAULT '보험수리학',       -- 과목명
  question_number INTEGER NOT NULL,                        -- 문항 번호
  question_text   TEXT NOT NULL,                          -- 문제 지문 (LaTeX 포함)
  option_1        TEXT,                                   -- ① 선택지
  option_2        TEXT,                                   -- ② 선택지
  option_3        TEXT,                                   -- ③ 선택지
  option_4        TEXT,                                   -- ④ 선택지
  option_5        TEXT,                                   -- ⑤ 선택지
  correct_answer  INTEGER,                                -- 정답 번호 (1-5)
  correct_text    TEXT,                                   -- 주관식 정답 텍스트
  explanation     TEXT,                                   -- 해설
  category        TEXT,                                   -- 단원 분류 (이자론, 생명표, 등)
  difficulty      INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  source_job_id   UUID REFERENCES conv_jobs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS exam_questions_year_idx      ON exam_questions(year);
CREATE INDEX IF NOT EXISTS exam_questions_category_idx  ON exam_questions(category);
CREATE INDEX IF NOT EXISTS exam_questions_subject_idx   ON exam_questions(subject);

-- RLS
ALTER TABLE exam_questions ENABLE ROW LEVEL SECURITY;

-- Allow all reads (public access for study purposes)
CREATE POLICY "exam_questions_read" ON exam_questions
  FOR SELECT USING (true);

-- Allow service role to insert/update/delete
CREATE POLICY "exam_questions_write" ON exam_questions
  FOR ALL USING (auth.role() = 'service_role');

-- =========================================================
-- 사용자 시험 기록 테이블 (선택사항)
-- =========================================================

CREATE TABLE IF NOT EXISTS exam_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year            INTEGER NOT NULL,
  subject         TEXT NOT NULL DEFAULT '보험수리학',
  total_questions INTEGER NOT NULL,
  correct_count   INTEGER NOT NULL DEFAULT 0,
  time_taken_sec  INTEGER,  -- 소요 시간 (초)
  answers         JSONB,    -- { question_id: selected_answer }
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exam_sessions_all" ON exam_sessions FOR ALL USING (true);
