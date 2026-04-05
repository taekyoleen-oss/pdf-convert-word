import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = createServerClient();
  for (const bucket of ['uploads', 'outputs', 'extracted-images', 'page-images']) {
    const { data } = await supabase.storage.from(bucket).list(jobId);
    if (data?.length) await supabase.storage.from(bucket).remove(data.map((f) => `${jobId}/${f.name}`));
  }
  await supabase.from('conv_jobs').delete().eq('id', jobId);
  return Response.json({ success: true });
}
