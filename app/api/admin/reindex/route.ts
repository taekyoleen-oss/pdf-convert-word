import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { chunkBlocks } from '@/lib/rag/chunker';
import { embedTexts } from '@/lib/rag/embedder';
import { saveChunks } from '@/lib/rag/indexer';
import type { ParsedBlock } from '@/types/conversion';

const BodySchema = z.object({
  jobId: z.string().uuid(),
  force: z.boolean().default(false), // true면 이미 인덱싱된 것도 재인덱싱
});

/**
 * POST /api/admin/reindex
 * 기존 변환 데이터를 재인덱싱합니다 (재변환 불필요).
 * conv_pages의 parsed_blocks를 사용하여 RAG 인덱스를 재생성합니다.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid input', details: parsed.error }, { status: 400 });
  }

  const { jobId, force } = parsed.data;

  if (!process.env.VOYAGE_API_KEY) {
    return Response.json({ error: 'VOYAGE_API_KEY 미설정 — 학습 자료 등록 불가' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // job 확인
  const { data: job, error: jobError } = await supabase
    .from('conv_jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return Response.json({ error: '작업을 찾을 수 없습니다' }, { status: 404 });
  }

  if (job.rag_indexed && !force) {
    return Response.json({
      message: '이미 학습 자료로 등록되어 있습니다. 재등록하려면 force=true를 사용하세요.',
      alreadyIndexed: true,
    });
  }

  if (job.status !== 'done') {
    return Response.json({
      error: `변환이 완료되지 않은 작업입니다. 현재 상태: ${job.status}`,
    }, { status: 400 });
  }

  // conv_pages에서 parsed_blocks 조회
  const { data: pages, error: pagesError } = await supabase
    .from('conv_pages')
    .select('page_number, parsed_blocks, status')
    .eq('job_id', jobId)
    .eq('status', 'done')
    .order('page_number', { ascending: true });

  if (pagesError) {
    return Response.json({ error: `페이지 조회 실패: ${pagesError.message}` }, { status: 500 });
  }

  if (!pages || pages.length === 0) {
    return Response.json({
      error: '완료된 페이지가 없습니다. 변환 결과가 저장되지 않았을 수 있습니다.',
    }, { status: 400 });
  }

  // 청킹
  const allChunks = pages.flatMap((p) =>
    p.parsed_blocks ? chunkBlocks(p.parsed_blocks as ParsedBlock[], p.page_number) : []
  );

  if (allChunks.length === 0) {
    return Response.json({
      error: 'parsed_blocks가 비어 있습니다. 변환 시 내용이 파싱되지 않았을 수 있습니다.',
      pagesFound: pages.length,
    }, { status: 400 });
  }

  // Voyage AI 임베딩
  let embeddings: number[][];
  try {
    embeddings = await embedTexts(allChunks.map((c) => c.content), 'document');
  } catch (e) {
    return Response.json({
      error: `임베딩 실패: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 500 });
  }

  // Supabase에 저장
  try {
    await saveChunks(jobId, job.original_name, allChunks, embeddings);
  } catch (e) {
    return Response.json({
      error: `저장 실패: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 500 });
  }

  return Response.json({
    success: true,
    message: `'${job.original_name}' 학습 자료 등록 완료`,
    jobId,
    originalName: job.original_name,
    pagesIndexed: pages.length,
    chunksCreated: allChunks.length,
  });
}
