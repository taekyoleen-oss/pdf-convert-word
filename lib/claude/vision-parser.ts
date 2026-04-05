import Anthropic from '@anthropic-ai/sdk';
import type { ParsedBlock } from '@/types/conversion';
import { buildVisionSystemPrompt } from './prompts';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 5 });

export async function parsePageWithVision(
  imageBuffer: Buffer,
  pageNumber: number
): Promise<ParsedBlock[]> {
  const imageBase64 = imageBuffer.toString('base64');
  const systemPrompt = buildVisionSystemPrompt();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
        { type: 'text', text: `이것은 보험수리학 교재의 ${pageNumber}번 페이지입니다. 모든 내용을 파싱 블록 JSON 배열로 반환하세요.` },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return extractBlocks(text);
}

// LaTeX 백슬래시(\alpha, \ddot 등)가 JSON 문자열 안에 있을 때 파싱 실패하는 문제 수정
function fixJsonBackslashes(json: string): string {
  // 유효한 JSON 이스케이프(\\ \" \/ \n \r \t \b \f \uXXXX)가 아닌 단독 \를 \\로 변환
  return json.replace(/\\(?![\\"/nrtbfu])/g, '\\\\');
}

function tryParse(json: string): ParsedBlock[] | null {
  // 1차 시도: 그대로 파싱
  try {
    const p = JSON.parse(json);
    if (Array.isArray(p)) return p as ParsedBlock[];
  } catch { /* 계속 */ }
  // 2차 시도: LaTeX 백슬래시 이스케이프 후 파싱
  try {
    const p = JSON.parse(fixJsonBackslashes(json));
    if (Array.isArray(p)) return p as ParsedBlock[];
  } catch { /* 실패 */ }
  return null;
}

function extractBlocks(text: string): ParsedBlock[] {
  const codeBlock = text.match(/```json\n?([\s\S]*?)\n?```/);
  if (codeBlock) {
    const result = tryParse(codeBlock[1]);
    if (result) return result;
  }
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const result = tryParse(arrayMatch[0]);
    if (result) return result;
  }
  return [];
}
