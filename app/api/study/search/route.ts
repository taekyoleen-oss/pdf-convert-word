import { NextRequest } from 'next/server';
import { z } from 'zod';
import { embedQuery } from '@/lib/rag/embedder';
import { retrieveChunks } from '@/lib/rag/retriever';

const schema = z.object({ query: z.string().min(1), jobIds: z.array(z.string().uuid()).optional(), topK: z.number().int().min(1).max(20).default(5) });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: '잘못된 요청' }, { status: 400 });
    const { query, jobIds, topK } = parsed.data;
    const qEmb = await embedQuery(query);
    const results = await retrieveChunks(qEmb, topK, jobIds);
    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
