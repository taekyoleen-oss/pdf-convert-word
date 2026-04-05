import { NextRequest } from 'next/server';
import { getFormulaChunks } from '@/lib/rag/retriever';

export async function GET(request: NextRequest) {
  try {
    const jobIds = request.nextUrl.searchParams.get('jobIds')?.split(',').filter(Boolean) ?? [];
    if (!jobIds.length) return Response.json({ chunks: [] });
    const chunks = await getFormulaChunks(jobIds);
    return Response.json({ chunks });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
