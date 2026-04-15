import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/admin/diagnose
 * Supabase 전체 데이터 상태를 진단합니다 (제한 없음).
 */
export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: '환경변수 미설정: SUPABASE_URL 또는 SERVICE_ROLE_KEY' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // ── 1. conv_jobs 전체 조회 (한도 없음) ──────────────────────
  const { data: allJobs, error: jobsError } = await supabase
    .from('conv_jobs')
    .select('id, original_name, status, rag_indexed, total_pages, output_path, storage_path, category, created_at, updated_at')
    .order('created_at', { ascending: false });

  // ── 2. conv_pages 요약 (job_id별 개수) ──────────────────────
  const { data: allPages, error: pagesError } = await supabase
    .from('conv_pages')
    .select('job_id, status, reparse_count, flagged_count');

  const pagesByJob: Record<string, { total: number; done: number; error: number; flagged: number }> = {};
  for (const p of allPages ?? []) {
    if (!pagesByJob[p.job_id]) pagesByJob[p.job_id] = { total: 0, done: 0, error: 0, flagged: 0 };
    pagesByJob[p.job_id].total++;
    if (p.status === 'done') pagesByJob[p.job_id].done++;
    if (p.status === 'error') pagesByJob[p.job_id].error++;
    pagesByJob[p.job_id].flagged += p.flagged_count ?? 0;
  }

  // ── 3. book_chunks 요약 (job_id별 개수) ──────────────────────
  let chunksByJob: Record<string, number> = {};
  let chunksTableExists = true;
  const { data: allChunks, error: chunksError } = await supabase
    .from('book_chunks')
    .select('job_id');

  if (chunksError) {
    chunksTableExists = false;
  } else {
    for (const c of allChunks ?? []) {
      chunksByJob[c.job_id] = (chunksByJob[c.job_id] ?? 0) + 1;
    }
  }

  // ── 4. Storage 버킷 확인 ─────────────────────────────────────
  const { data: buckets } = await supabase.storage.listBuckets();

  // ── 5. 결과 조합 ─────────────────────────────────────────────
  const jobs = (allJobs ?? []).map((j) => {
    const pages = pagesByJob[j.id];
    const chunkCount = chunksByJob[j.id] ?? 0;

    let recoveryAction: string | null = null;
    if (j.status === 'processing') {
      // 처리 중으로 stuck된 경우
      if (pages?.done > 0) recoveryAction = 'fix_status'; // done 페이지가 있으면 상태 수정 가능
    } else if (j.status === 'done' && !j.rag_indexed && (pages?.done ?? 0) > 0) {
      recoveryAction = 'reindex'; // 변환됐지만 학습 등록 안 된 경우
    } else if (j.status === 'done' && j.rag_indexed && chunkCount === 0) {
      recoveryAction = 'reindex'; // rag_indexed=true지만 실제 chunks가 없는 경우
    }

    return {
      id: j.id,
      original_name: j.original_name,
      status: j.status,
      rag_indexed: j.rag_indexed,
      total_pages: j.total_pages,
      has_output: !!j.output_path,
      storage_path: j.storage_path,
      category: j.category,
      created_at: j.created_at,
      updated_at: j.updated_at,
      pages: pages ?? { total: 0, done: 0, error: 0, flagged: 0 },
      chunk_count: chunkCount,
      recovery_action: recoveryAction,
    };
  });

  return Response.json({
    summary: {
      totalJobs: jobs.length,
      doneJobs: jobs.filter((j) => j.status === 'done').length,
      processingJobs: jobs.filter((j) => j.status === 'processing').length,
      errorJobs: jobs.filter((j) => j.status === 'error').length,
      indexedJobs: jobs.filter((j) => j.rag_indexed).length,
      recoverableJobs: jobs.filter((j) => j.recovery_action).length,
      chunksTableExists,
      storageBuckets: (buckets ?? []).map((b) => b.name),
      errors: {
        jobs: jobsError?.message ?? null,
        pages: pagesError?.message ?? null,
        chunks: chunksError?.message ?? null,
      },
    },
    jobs,
  });
}
