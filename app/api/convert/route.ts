import { NextRequest } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@/lib/supabase/server';

const schema = z.object({ jobId: z.string().uuid(), targetPages: z.array(z.number().int().positive()).optional() });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: '잘못된 요청' }, { status: 400 });
    const { jobId, targetPages } = parsed.data;

    const supabase = createServerClient();
    const { data: job } = await supabase.from('conv_jobs').select('*').eq('id', jobId).single();
    if (!job) return Response.json({ error: '작업 없음' }, { status: 404 });

    await supabase.from('conv_jobs').update({ status: 'processing', target_pages: targetPages ?? [], updated_at: new Date().toISOString() }).eq('id', jobId);
    return Response.json({ success: true, jobId });
  } catch (e) {
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}
