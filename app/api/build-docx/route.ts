import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { buildDocx } from '@/lib/converters/blocks-to-docx';
import { uploadFile, deleteFolder } from '@/lib/utils/signed-url';
import type { Database } from '@/types/supabase';

type ConvJob = Database['public']['Tables']['conv_jobs']['Row'];

export async function POST(request: NextRequest) {
  try {
    const { jobId } = await request.json();
    if (!jobId) return Response.json({ error: 'jobId 필요' }, { status: 400 });

    const supabase = createServerClient();
    const { data: jobRaw } = await supabase.from('conv_jobs').select('*').eq('id', jobId).single();
    const job = jobRaw as ConvJob | null;
    if (!job) return Response.json({ error: '작업 없음' }, { status: 404 });

    const { data: pages } = await supabase.from('conv_pages').select('*').eq('job_id', jobId).eq('status', 'done').order('page_number', { ascending: true });
    if (!pages?.length) return Response.json({ error: '변환된 페이지 없음' }, { status: 400 });

    const docxBuf = await buildDocx(jobId, job.original_name, pages as any);
    const outputPath = `${jobId}/output.docx`;
    await uploadFile('outputs', outputPath, docxBuf, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    await supabase.from('conv_jobs').update({ output_path: outputPath, updated_at: new Date().toISOString() }).eq('id', jobId);

    // page-images 정리
    await deleteFolder('page-images', jobId);

    // RAG 인덱싱 트리거 — 현재 비활성화
    // const host = request.headers.get('host') ?? 'localhost:3000';
    // const proto = request.headers.get('x-forwarded-proto') ?? 'http';
    // fetch(`${proto}://${host}/api/study/index/${jobId}`, { method: 'POST' }).catch(console.error);

    return Response.json({ success: true, outputPath });
  } catch (e) {
    console.error('docx 빌드 오류:', e);
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
