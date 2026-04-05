import { NextRequest } from 'next/server';
import { getJob } from '@/lib/supabase/queries';
import { getSignedUrl } from '@/lib/utils/signed-url';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const job = await getJob(jobId);
  if (!job) return Response.json({ error: '작업 없음' }, { status: 404 });
  if (!job.output_path) return Response.json({ error: '아직 변환되지 않았습니다' }, { status: 400 });
  const url = await getSignedUrl('outputs', job.output_path, 3600);
  if (!url) return Response.json({ error: 'URL 생성 실패' }, { status: 500 });
  return Response.redirect(url);
}
