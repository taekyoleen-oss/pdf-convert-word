-- ============================================================
-- 004_search_with_job_filter.sql
-- search_book_chunks RPC에 job_id 필터 추가
-- ============================================================

CREATE OR REPLACE FUNCTION search_book_chunks(
  query_embedding      vector(1024),
  match_count          int     DEFAULT 5,
  similarity_threshold float   DEFAULT 0.5,
  filter_job_ids       uuid[]  DEFAULT NULL
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
    AND (filter_job_ids IS NULL OR bc.job_id = ANY(filter_job_ids))
  ORDER BY bc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
