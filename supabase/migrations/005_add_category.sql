-- 005_add_category.sql
-- conv_jobs 테이블에 category 컬럼 추가

ALTER TABLE conv_jobs ADD COLUMN IF NOT EXISTS category text;

CREATE INDEX IF NOT EXISTS conv_jobs_category_idx ON conv_jobs(category);
