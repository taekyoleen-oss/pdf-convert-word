import { createServerClient } from '@/lib/supabase/server';

export interface RetrievedChunk {
  id: string;
  job_id: string;
  page_number: number;
  chunk_type: string;
  content: string;
  source_title: string;
  metadata: Record<string, unknown>;
  latex_items: string[];
  similarity: number;
}

export async function retrieveChunks(queryEmbedding: number[], topK = 8, jobIds?: string[]): Promise<RetrievedChunk[]> {
  const supabase = createServerClient();
  // Fetch more results when filtering so we hit topK after the client-side filter
  const fetchCount = jobIds?.length ? topK * 4 : topK;
  const { data, error } = await supabase.rpc('search_book_chunks', {
    query_embedding: queryEmbedding,
    match_count: fetchCount,
    similarity_threshold: 0.2,
  });
  if (error) throw new Error(`pgvector 검색 실패: ${error.message}`);
  const all = (data ?? []) as RetrievedChunk[];
  if (!jobIds?.length) return all;
  return all.filter((c) => jobIds.includes(c.job_id)).slice(0, topK);
}

/** 키워드 기반 폴백 검색 — 벡터 검색 결과가 부족할 때 보완 */
export async function keywordSearchChunks(keyword: string, topK = 5, jobIds?: string[]): Promise<RetrievedChunk[]> {
  const supabase = createServerClient();
  let query = supabase
    .from('book_chunks')
    .select('id, job_id, page_number, chunk_index, chunk_type, content, latex_items, source_title, metadata')
    .ilike('content', `%${keyword}%`)
    .order('page_number', { ascending: true })
    .limit(topK * 2);

  if (jobIds?.length) {
    query = query.in('job_id', jobIds);
  }

  const { data, error } = await query;
  if (error) throw new Error(`키워드 검색 실패: ${error.message}`);
  return ((data ?? []) as any[])
    .map((r) => ({ ...r, similarity: 0.5 }))
    .slice(0, topK) as RetrievedChunk[];
}

/** 벡터 + 키워드 하이브리드 검색 */
export async function hybridRetrieve(
  queryEmbedding: number[],
  keywords: string[],
  topK = 8,
  jobIds?: string[]
): Promise<RetrievedChunk[]> {
  const vectorResults = await retrieveChunks(queryEmbedding, topK, jobIds);

  // 벡터 검색으로 충분한 결과가 나오면 그대로 반환
  if (vectorResults.length >= topK) return vectorResults;

  // 부족하면 키워드 검색으로 보완
  const vectorIds = new Set(vectorResults.map((c) => c.id));
  const keywordResults: RetrievedChunk[] = [];

  for (const kw of keywords) {
    if (keywordResults.length + vectorResults.length >= topK) break;
    const kwChunks = await keywordSearchChunks(kw, topK, jobIds);
    for (const chunk of kwChunks) {
      if (!vectorIds.has(chunk.id)) {
        vectorIds.add(chunk.id);
        keywordResults.push(chunk);
      }
    }
  }

  return [...vectorResults, ...keywordResults].slice(0, topK);
}

export async function getFormulaChunks(jobIds: string[]): Promise<RetrievedChunk[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('book_chunks')
    .select('*')
    .in('chunk_type', ['formula', 'example'])
    .in('job_id', jobIds)
    .order('page_number', { ascending: true })
    .order('chunk_index', { ascending: true });
  if (error) throw new Error(`수식 조회 실패: ${error.message}`);
  return ((data ?? []) as any[]).map((r) => ({ ...r, similarity: 1 })) as RetrievedChunk[];
}
