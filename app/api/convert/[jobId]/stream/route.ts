import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { convertPdfToImages, getPdfPageCount } from '@/lib/converters/pdf-to-images';
import { parsePageWithVision } from '@/lib/claude/vision-parser';
import { findFailedBlockIndices } from '@/lib/converters/katex-validate';
import { reparseBlocks } from '@/lib/claude/reparser';

export const dynamic = 'force-dynamic';
export const maxDuration = 600;

const sse = (d: object) => `data: ${JSON.stringify(d)}\n\n`;

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = createServerClient();
  const enc = new TextEncoder();

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (d: object) => ctrl.enqueue(enc.encode(sse(d)));
      try {
        const { data: job } = await supabase.from('conv_jobs').select('*').eq('id', jobId).single();
        if (!job) { send({ type: 'error', message: '작업 없음' }); ctrl.close(); return; }

        const { data: pdfData } = await supabase.storage.from('uploads').download(job.storage_path);
        if (!pdfData) { send({ type: 'error', message: 'PDF 다운로드 실패' }); ctrl.close(); return; }
        const pdfBuf = Buffer.from(await pdfData.arrayBuffer());

        let totalPages = job.total_pages || 0;
        if (totalPages === 0) totalPages = getPdfPageCount(pdfBuf);
        const targetPages = (job.target_pages && job.target_pages.length > 0) ? job.target_pages : Array.from({ length: totalPages || 1 }, (_, i) => i + 1);
        send({ type: 'progress', stage: 'image', message: `PDF → 이미지 변환 중 (${targetPages.length}페이지)...` });

        const pageImages = await convertPdfToImages(jobId, pdfBuf, targetPages);

        for (const [pageNum, imgBuf] of pageImages) {
          send({ type: 'progress', page: pageNum, total: targetPages.length, stage: 'vision', message: `페이지 ${pageNum}/${targetPages.length} Vision 파싱 중...` });

          const { data: existing } = await supabase.from('conv_pages').select('status, parsed_blocks').eq('job_id', jobId).eq('page_number', pageNum).single();
          // parsed_blocks가 비어있는 경우 재처리 (이전 파싱 실패 케이스)
          const hasContent = Array.isArray(existing?.parsed_blocks) && (existing.parsed_blocks as unknown[]).length > 0;
          if (existing?.status === 'done' && hasContent) { send({ type: 'page_done', page: pageNum, message: `페이지 ${pageNum} 재사용` }); continue; }

          await supabase.from('conv_pages').upsert({ job_id: jobId, page_number: pageNum, status: 'processing', bbox_version: 'ratio', reparse_count: 0, flagged_count: 0, image_paths: [] }, { onConflict: 'job_id,page_number' });

          try {
            const rawBlocks = await parsePageWithVision(imgBuf, pageNum);
            send({ type: 'progress', page: pageNum, stage: 'katex', message: `페이지 ${pageNum} KaTeX 검증 중...` });
            const failedIdx = findFailedBlockIndices(rawBlocks);
            let finalBlocks = rawBlocks;
            let reparseCount = 0;

            if (failedIdx.length > 0) {
              send({ type: 'progress', page: pageNum, stage: 'reparse', message: `페이지 ${pageNum}: ${failedIdx.length}개 블록 재파싱 중...` });
              const res = await reparseBlocks(rawBlocks, failedIdx, imgBuf, jobId, pageNum);
              finalBlocks = res.blocks; reparseCount = res.reparseCount;
            }

            const flaggedCount = finalBlocks.filter((b) => b.flag).length;
            await supabase.from('conv_pages').update({ status: 'done', parsed_blocks: finalBlocks as any, raw_blocks: rawBlocks as any, reparse_count: reparseCount, flagged_count: flaggedCount, processed_at: new Date().toISOString() }).eq('job_id', jobId).eq('page_number', pageNum);
            send({ type: 'page_done', page: pageNum, total: targetPages.length, message: `페이지 ${pageNum}/${targetPages.length} 완료 (플래그: ${flaggedCount}개)` });
          } catch (e) {
            await supabase.from('conv_pages').update({ status: 'error', error_msg: String(e) }).eq('job_id', jobId).eq('page_number', pageNum);
            send({ type: 'error', page: pageNum, message: `페이지 ${pageNum} 오류: ${e}` });
          }
        }

        send({ type: 'progress', stage: 'docx', message: '.docx 생성 중...' });
        const host = request.headers.get('host') ?? 'localhost:3000';
        const proto = request.headers.get('x-forwarded-proto') ?? 'http';
        const docxRes = await fetch(`${proto}://${host}/api/build-docx`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId }) });
        if (!docxRes.ok) throw new Error('.docx 생성 실패');

        await supabase.from('conv_jobs').update({ status: 'done', updated_at: new Date().toISOString() }).eq('id', jobId);
        send({ type: 'complete', message: '변환 완료!', jobId });
      } catch (e) {
        await supabase.from('conv_jobs').update({ status: 'error', error_msg: String(e), updated_at: new Date().toISOString() }).eq('id', jobId);
        send({ type: 'error', message: String(e) });
      } finally { ctrl.close(); }
    },
  });

  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
}
