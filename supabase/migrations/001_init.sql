-- ============================================================
-- 001_init.sql
-- 보험수리 PDF 변환기 + RAG 학습 시스템 초기 스키마
-- ============================================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- conv_jobs 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS conv_jobs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  original_name   text        NOT NULL,
  storage_path    text        NOT NULL,
  output_path     text,
  status          text        NOT NULL DEFAULT 'pending',  -- pending | processing | done | error
  total_pages     int         NOT NULL DEFAULT 0,
  target_pages    int[],
  error_message   text,
  rag_indexed     boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- conv_pages 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS conv_pages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid        NOT NULL REFERENCES conv_jobs(id) ON DELETE CASCADE,
  page_number     int         NOT NULL,
  status          text        NOT NULL DEFAULT 'pending',  -- pending | done | error
  parsed_blocks   jsonb,
  reparse_count   int         NOT NULL DEFAULT 0,
  flagged_count   int         NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conv_pages_job_id_idx ON conv_pages(job_id);

-- ============================================================
-- book_chunks 테이블 (RAG)
-- ============================================================
CREATE TABLE IF NOT EXISTS book_chunks (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          uuid        NOT NULL REFERENCES conv_jobs(id) ON DELETE CASCADE,
  page_number     int         NOT NULL,
  chunk_index     int         NOT NULL,
  chunk_type      text        NOT NULL,  -- 'text' | 'formula' | 'example' | 'mixed'
  content         text        NOT NULL,
  latex_items     text[]      NOT NULL DEFAULT '{}',
  embedding       vector(1024),
  source_title    text        NOT NULL,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS book_chunks_job_id_idx ON book_chunks(job_id);
CREATE INDEX IF NOT EXISTS book_chunks_chunk_type_idx ON book_chunks(chunk_type);

-- hnsw 인덱스 (cosine distance) — 임베딩 저장 후 생성
-- CREATE INDEX ON book_chunks USING hnsw (embedding vector_cosine_ops);

-- ============================================================
-- pgvector 시맨틱 검색 RPC 함수
-- ============================================================
CREATE OR REPLACE FUNCTION search_book_chunks(
  query_embedding vector(1024),
  match_count     int     DEFAULT 5,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  id              uuid,
  job_id          uuid,
  page_number     int,
  chunk_index     int,
  chunk_type      text,
  content         text,
  latex_items     text[],
  source_title    text,
  metadata        jsonb,
  similarity      float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    bc.id,
    bc.job_id,
    bc.page_number,
    bc.chunk_index,
    bc.chunk_type,
    bc.content,
    bc.latex_items,
    bc.source_title,
    bc.metadata,
    1 - (bc.embedding <=> query_embedding) AS similarity
  FROM book_chunks bc
  WHERE bc.embedding IS NOT NULL
    AND 1 - (bc.embedding <=> query_embedding) > similarity_threshold
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER conv_jobs_updated_at
  BEFORE UPDATE ON conv_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conv_pages_updated_at
  BEFORE UPDATE ON conv_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security) — 서비스 롤로 전체 접근
-- ============================================================
ALTER TABLE conv_jobs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE conv_pages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_chunks ENABLE ROW LEVEL SECURITY;

-- service_role 전체 접근 허용
CREATE POLICY "service_role_all" ON conv_jobs   FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON conv_pages  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON book_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);
