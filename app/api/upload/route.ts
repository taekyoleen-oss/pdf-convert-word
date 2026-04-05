import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { validatePdfFile } from '@/lib/utils/file-validation';
import { spawnSync } from 'child_process';

function getPdfPageCount(buffer: Buffer): number {
  const result = spawnSync(
    'python',
    ['-c', 'import sys, fitz; doc = fitz.open(stream=sys.stdin.buffer.read(), filetype="pdf"); print(doc.page_count)'],
    { input: buffer, encoding: 'utf8', timeout: 15000 }
  );
  const count = parseInt(result.stdout.trim(), 10);
  return isNaN(count) ? 0 : count;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return Response.json({ error: '파일이 없습니다' }, { status: 400 });

    const v = validatePdfFile(file);
    if (!v.valid) return Response.json({ error: v.error }, { status: 400 });

    const supabase = createServerClient();
    const { data: job, error: jobErr } = await supabase
      .from('conv_jobs')
      .insert({ original_name: file.name, storage_path: '', total_pages: 0, target_pages: [], status: 'pending', rag_indexed: false })
      .select().single();
    if (jobErr || !job) return Response.json({ error: '작업 생성 실패' }, { status: 500 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const totalPages = getPdfPageCount(buffer);

    const storagePath = `${job.id}/original.pdf`;
    const { error: upErr } = await supabase.storage.from('uploads').upload(storagePath, buffer, { contentType: 'application/pdf', upsert: false });
    if (upErr) {
      await supabase.from('conv_jobs').delete().eq('id', job.id);
      return Response.json({ error: '파일 업로드 실패' }, { status: 500 });
    }

    await supabase.from('conv_jobs').update({ storage_path: storagePath, total_pages: totalPages, updated_at: new Date().toISOString() }).eq('id', job.id);
    return Response.json({ jobId: job.id, fileName: file.name });
  } catch (e) {
    console.error('업로드 오류:', e);
    return Response.json({ error: '서버 오류' }, { status: 500 });
  }
}
