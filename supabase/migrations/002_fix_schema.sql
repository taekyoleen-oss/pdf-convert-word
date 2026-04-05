-- ============================================================
-- 002_fix_schema.sql
-- 001_init.sql에서 누락된 컬럼 추가 + error_message → error_msg 통일
-- ============================================================

-- conv_jobs: error_message → error_msg 컬럼명 통일
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conv_jobs' AND column_name = 'error_message'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'conv_jobs' AND column_name = 'error_msg'
  ) THEN
    ALTER TABLE conv_jobs RENAME COLUMN error_message TO error_msg;
  END IF;
END $$;

-- error_msg가 아예 없으면 추가
ALTER TABLE conv_jobs ADD COLUMN IF NOT EXISTS error_msg text;

-- ============================================================
-- conv_pages: 누락 컬럼 추가
-- ============================================================
ALTER TABLE conv_pages ADD COLUMN IF NOT EXISTS raw_blocks     jsonb;
ALTER TABLE conv_pages ADD COLUMN IF NOT EXISTS image_paths    text[]  NOT NULL DEFAULT '{}';
ALTER TABLE conv_pages ADD COLUMN IF NOT EXISTS bbox_version   text;
ALTER TABLE conv_pages ADD COLUMN IF NOT EXISTS error_msg      text;
ALTER TABLE conv_pages ADD COLUMN IF NOT EXISTS processed_at   timestamptz;

-- upsert onConflict: 'job_id,page_number' 에 필요한 유니크 제약
ALTER TABLE conv_pages DROP CONSTRAINT IF EXISTS conv_pages_job_id_page_number_key;
ALTER TABLE conv_pages ADD CONSTRAINT conv_pages_job_id_page_number_key UNIQUE (job_id, page_number);
