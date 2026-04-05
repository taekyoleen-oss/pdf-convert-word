import { createServerClient } from '@/lib/supabase/server';
import type { Chunk } from './chunker';

export async function saveChunks(jobId: string, sourceTitle: string, chunks: Chunk[], embeddings: number[][]): Promise<void> {
  const supabase = createServerClient();
  const rows = chunks.map((c, i) => ({
    job_id: jobId,
    page_number: c.page_number,
    chunk_index: c.chunk_index,
    chunk_type: c.chunk_type,
    content: c.content,
    latex_items: c.latex_items,
    embedding: `[${embeddings[i].join(',')}]`,
    source_title: sourceTitle,
    metadata: c.metadata,
  }));

  // 기존 청크 삭제 후 재삽입 (upsert 대신 delete+insert 사용)
  const { error: deleteError } = await supabase.from('book_chunks').delete().eq('job_id', jobId);
  if (deleteError) throw new Error(`book_chunks 삭제 실패: ${deleteError.message}`);

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('book_chunks').insert(rows.slice(i, i + 100) as any);
    if (error) throw new Error(`book_chunks 삽입 실패: ${error.message}`);
  }

  const { error } = await supabase.from('conv_jobs').update({ rag_indexed: true, updated_at: new Date().toISOString() }).eq('id', jobId);
  if (error) throw new Error(`rag_indexed 업데이트 실패: ${error.message}`);
}
