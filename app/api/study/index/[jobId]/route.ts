import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { chunkBlocks } from '@/lib/rag/chunker';
import { embedTexts } from '@/lib/rag/embedder';
import { saveChunks } from '@/lib/rag/indexer';
import type { ParsedBlock } from '@/types/conversion';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  try {
    if (!process.env.VOYAGE_API_KEY) return Response.json({ error: 'VOYAGE_API_KEY 미설정' }, { status: 500 });
    const supabase = createServerClient();
    const { data: job } = await supabase.from('conv_jobs').select('*').eq('id', jobId).single();
    if (!job) return Response.json({ error: '작업 없음' }, { status: 404 });
    if (job.rag_indexed) return Response.json({ message: '이미 인덱싱됨', chunksCount: 0 });

    const { data: pages } = await supabase.from('conv_pages').select('page_number, parsed_blocks').eq('job_id', jobId).eq('status', 'done').order('page_number', { ascending: true });
    if (!pages?.length) return Response.json({ error: '변환된 페이지 없음' }, { status: 400 });

    const allChunks = pages.flatMap((p) => p.parsed_blocks ? chunkBlocks(p.parsed_blocks as ParsedBlock[], p.page_number) : []);
    if (!allChunks.length) return Response.json({ message: '청크 없음', chunksCount: 0 });

    const embeddings = await embedTexts(allChunks.map((c) => c.content), 'document');
    await saveChunks(jobId, job.original_name, allChunks, embeddings);
    return Response.json({ success: true, chunksCount: allChunks.length });
  } catch (e) {
    console.error('RAG 인덱싱 오류:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
