-- ============================================================
-- 003_storage_buckets.sql
-- Supabase Storage 버킷 생성 (모두 private)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('uploads',           'uploads',           false, 52428800, ARRAY['application/pdf']),
  ('page-images',       'page-images',       false, 10485760, ARRAY['image/png']),
  ('outputs',           'outputs',           false, 52428800, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('extracted-images',  'extracted-images',  false, 10485760, ARRAY['image/png'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS 정책 — service_role 전체 접근
-- ============================================================

-- uploads 버킷
CREATE POLICY "service_role uploads all" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'uploads') WITH CHECK (bucket_id = 'uploads');

-- page-images 버킷
CREATE POLICY "service_role page-images all" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'page-images') WITH CHECK (bucket_id = 'page-images');

-- outputs 버킷
CREATE POLICY "service_role outputs all" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'outputs') WITH CHECK (bucket_id = 'outputs');

-- extracted-images 버킷
CREATE POLICY "service_role extracted-images all" ON storage.objects
  FOR ALL TO service_role USING (bucket_id = 'extracted-images') WITH CHECK (bucket_id = 'extracted-images');
