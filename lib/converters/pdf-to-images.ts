import { createServerClient } from '@/lib/supabase/server';
import { uploadFile, fileExists } from '@/lib/utils/signed-url';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const DPI = parseInt(process.env.PDF_IMAGE_DPI ?? '150', 10);
const PYTHON_SCRIPT = path.join(process.cwd(), 'lib/converters/pdf-to-images.py');

export function getPdfPageCount(buffer: Buffer): number {
  const result = spawnSync(
    'python',
    ['-c', 'import sys, fitz; doc = fitz.open(stream=sys.stdin.buffer.read(), filetype="pdf"); print(doc.page_count)'],
    { input: buffer, encoding: 'utf8', timeout: 15000 }
  );
  const count = parseInt(result.stdout.trim(), 10);
  return isNaN(count) ? 1 : count;
}

export async function convertPdfToImages(
  jobId: string,
  pdfBuffer: Buffer,
  targetPages: number[]
): Promise<Map<number, Buffer>> {
  const results = new Map<number, Buffer>();
  const tmpDir = path.join(os.tmpdir(), `pdf-convert-${jobId}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Storage 캐시 확인 - 유효한 이미지만 재사용
    const pagesToRender: number[] = [];
    for (const pageNum of targetPages) {
      const exists = await fileExists('page-images', `${jobId}/page-${pageNum}.jpg`);
      if (exists) {
        const supabase = createServerClient();
        const { data } = await supabase.storage
          .from('page-images')
          .download(`${jobId}/page-${pageNum}.jpg`);
        if (data) {
          const buf = Buffer.from(await data.arrayBuffer());
          if (buf.length > 10000) { // 유효한 이미지 (최소 10KB)
            results.set(pageNum, buf);
            continue;
          }
        }
      }
      pagesToRender.push(pageNum);
    }

    if (pagesToRender.length === 0) return results;

    // PDF를 임시 파일로 저장
    const tmpPdfPath = path.join(tmpDir, 'input.pdf');
    fs.writeFileSync(tmpPdfPath, pdfBuffer);

    // Python/PyMuPDF로 렌더링
    const result = spawnSync(
      'python',
      [PYTHON_SCRIPT, tmpPdfPath, tmpDir, String(DPI), ...pagesToRender.map(String)],
      { encoding: 'utf8', timeout: 120000 }
    );

    if (result.error) {
      throw new Error(`Python 실행 오류: ${result.error.message}`);
    }
    if (result.status !== 0) {
      throw new Error(`PyMuPDF 변환 실패: ${result.stderr}`);
    }

    // 출력 파싱 및 결과 수집
    for (const rawLine of result.stdout.trim().split('\n')) {
      const line = rawLine.trim();
      if (!line) continue;
      const pipeIdx = line.indexOf('|');
      const pipeIdx2 = line.indexOf('|', pipeIdx + 1);
      const status = line.slice(0, pipeIdx);
      const pageNum = parseInt(line.slice(pipeIdx + 1, pipeIdx2));
      const rest = line.slice(pipeIdx2 + 1).trim();
      if (status === 'ERR') {
        console.warn(`페이지 ${pageNum} 변환 오류: ${rest}`);
        continue;
      }
      const imgPath = rest;
      const buf = fs.readFileSync(imgPath);
      if (buf.length === 0) {
        console.warn(`페이지 ${pageNum}: 빈 이미지`);
        continue;
      }

      // Storage에 업로드
      await uploadFile('page-images', `${jobId}/page-${pageNum}.jpg`, buf, 'image/jpeg');
      results.set(pageNum, buf);
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  return results;
}
