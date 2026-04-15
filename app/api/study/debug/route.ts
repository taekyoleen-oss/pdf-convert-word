import { createClient } from '@supabase/supabase-js';

// GET /api/study/debug — 학습 허브 진단용 (개발/디버깅 전용)
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. 전체 conv_jobs 상태 확인
    const { data: allJobs, error: jobsError } = await supabase
      .from('conv_jobs')
      .select('id, original_name, status, rag_indexed, total_pages, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // 2. rag_indexed=true 인 job 수
    const indexedJobs = (allJobs ?? []).filter((j) => j.rag_indexed);

    // 3. book_chunks 테이블 존재 & 데이터 확인
    const { data: chunks, error: chunksError } = await supabase
      .from('book_chunks')
      .select('job_id, chunk_type, source_title')
      .limit(50);

    const chunksByJob = (chunks ?? []).reduce<Record<string, number>>((acc, c) => {
      acc[c.job_id] = (acc[c.job_id] ?? 0) + 1;
      return acc;
    }, {});

    // 4. 파일명 → 챕터 키 변환 결과 미리보기
    function resolveChapterKey(name: string) {
      const match = name.match(/[_\s\-]?(\d+)[장章]/);
      if (match) return `ch${match[1]}`;
      const ch = name.toLowerCase().match(/ch(?:apter)?[\s_-]?(\d+)/);
      if (ch) return `ch${ch[1]}`;
      return `[미매칭] ${name.replace(/\.[^.]+$/, '')}`;
    }

    return Response.json({
      status: 'ok',
      summary: {
        totalJobs: allJobs?.length ?? 0,
        indexedJobs: indexedJobs.length,
        totalChunks: chunks?.length ?? 0,
        chunksTableExists: !chunksError,
        chunksError: chunksError?.message ?? null,
        jobsError: jobsError?.message ?? null,
      },
      indexedJobs: indexedJobs.map((j) => ({
        id: j.id,
        original_name: j.original_name,
        status: j.status,
        rag_indexed: j.rag_indexed,
        chapterKey: resolveChapterKey(j.original_name),
        chunkCount: chunksByJob[j.id] ?? 0,
        created_at: j.created_at,
      })),
      allJobs: (allJobs ?? []).map((j) => ({
        id: j.id,
        original_name: j.original_name,
        status: j.status,
        rag_indexed: j.rag_indexed,
        total_pages: j.total_pages,
      })),
    });
  } catch (e) {
    return Response.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
