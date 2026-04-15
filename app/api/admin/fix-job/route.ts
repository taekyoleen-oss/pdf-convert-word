import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const BodySchema = z.object({
  jobId:  z.string().uuid(),
  action: z.enum(['fix_status', 'reset_processing']),
});

/**
 * POST /api/admin/fix-job
 * stuck된 변환 작업 상태를 수정합니다.
 * - fix_status: processing→done (완료된 페이지가 있는 경우)
 * - reset_processing: processing→error (복구 불가한 경우)
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  const { jobId, action } = parsed.data;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // 현재 job 상태 확인
  const { data: job, error: jobError } = await supabase
    .from('conv_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
  }

  if (action === 'fix_status') {
    // conv_pages에서 done 상태 페이지 수 확인
    const { data: pages } = await supabase
      .from('conv_pages')
      .select('id, status')
      .eq('job_id', jobId);

    const donePages = (pages ?? []).filter((p) => p.status === 'done');

    if (donePages.length === 0) {
      return Response.json({ error: '완료된 페이지가 없어 상태를 수정할 수 없습니다' }, { status: 400 });
    }

    // status를 done으로 수정
    const { error } = await supabase
      .from('conv_jobs')
      .update({ status: 'done', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({
      success: true,
      message: `상태가 'done'으로 수정되었습니다. (완료 페이지: ${donePages.length}개)`,
      donePages: donePages.length,
    });
  }

  if (action === 'reset_processing') {
    const { error } = await supabase
      .from('conv_jobs')
      .update({ status: 'error', error_msg: '관리자에 의해 초기화됨', updated_at: new Date().toISOString() })
      .eq('id', jobId);

    if (error) return Response.json({ error: error.message }, { status: 500 });

    return Response.json({ success: true, message: '작업 상태가 error로 초기화되었습니다.' });
  }

  return Response.json({ error: '알 수 없는 action' }, { status: 400 });
}
