import Anthropic from '@anthropic-ai/sdk';
import { REPARSE_SYSTEM_PROMPT, REPARSE_USER_PROMPT } from './prompts';
import { validateLatex } from '@/lib/converters/katex-validate';
import { cropBlock } from '@/lib/converters/crop-block';
import { uploadFile } from '@/lib/utils/signed-url';
import type { ParsedBlock, DisplayMathBlock, InlineMathBlock } from '@/types/conversion';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 5 });
const MAX_ATTEMPTS = parseInt(process.env.MAX_REPARSE_ATTEMPTS ?? '3', 10);

async function reparseWithVision(cropBuffer: Buffer): Promise<string | null> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: REPARSE_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: cropBuffer.toString('base64') } },
        { type: 'text', text: REPARSE_USER_PROMPT },
      ],
    }],
  });
  const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return (text === 'FAILED' || !text) ? null : text;
}

export async function reparseBlocks(
  blocks: ParsedBlock[],
  failedIndices: number[],
  pageImageBuffer: Buffer,
  jobId: string,
  pageNumber: number
): Promise<{ blocks: ParsedBlock[]; reparseCount: number }> {
  let reparseCount = 0;
  const updated = [...blocks];

  for (const idx of failedIndices) {
    const block = updated[idx];
    if ((block.type !== 'inline-math' && block.type !== 'display-math') || !block.bbox) continue;

    let succeeded = false;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const cropBuf = await cropBlock(pageImageBuffer, block.bbox);
        await uploadFile('page-images', `${jobId}/crop/page-${pageNumber}-block-${idx}-attempt-${attempt}.png`, cropBuf, 'image/png');
        const latex = await reparseWithVision(cropBuf);
        reparseCount++;
        if (latex && validateLatex(latex).valid) {
          (updated[idx] as DisplayMathBlock | InlineMathBlock).latex = latex;
          (updated[idx] as DisplayMathBlock | InlineMathBlock).reparsed = true;
          updated[idx].flag = true;
          updated[idx].flag_reason = '재파싱됨 — 수동 확인 권장';
          succeeded = true;
          break;
        }
      } catch (e) {
        console.error(`재파싱 오류 (page ${pageNumber}, block ${idx}, attempt ${attempt}):`, e);
      }
    }

    if (!succeeded) {
      try {
        const cropBuf = await cropBlock(pageImageBuffer, block.bbox);
        const fallbackPath = `${jobId}/fallback/fallback-${pageNumber}-${idx}.png`;
        await uploadFile('extracted-images', fallbackPath, cropBuf, 'image/png');
        if (block.type === 'display-math') {
          (updated[idx] as DisplayMathBlock).latex = null;
          (updated[idx] as DisplayMathBlock).fallback_image = `extracted-images/${fallbackPath}`;
        }
        updated[idx].flag = true;
        updated[idx].flag_reason = '3회 재파싱 실패 — 이미지 폴백 삽입됨, 수동 편집 필요';
      } catch (e) {
        console.error('폴백 이미지 저장 실패:', e);
      }
    }
  }
  return { blocks: updated, reparseCount };
}
