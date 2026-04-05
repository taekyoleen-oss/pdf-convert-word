import { NextRequest } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { embedQuery } from '@/lib/rag/embedder';
import { hybridRetrieve } from '@/lib/rag/retriever';
import { buildQASystemPrompt } from '@/lib/claude/study-prompts';

const schema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant']), content: z.string() })),
  jobIds: z.array(z.string().uuid()).optional(),
});
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 3 });

/** 질문에서 핵심 키워드 추출 (간단한 규칙 기반) */
function extractKeywords(text: string): string[] {
  // 조사·어미 제거 후 의미 있는 단어 추출
  const stopwords = ['은', '는', '이', '가', '을', '를', '의', '에', '로', '와', '과', '무엇', '어떻게', '왜', '언제', '어디', '인가요', '인지', '이란', '이라는', '것은', '것이', '수식', '공식', '계산', '구하'];
  const words = text
    .replace(/[?？.。!！,，]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopwords.includes(w));
  // 중복 제거, 최대 3개
  return [...new Set(words)].slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: '잘못된 요청' }, { status: 400 });
    const { messages, jobIds } = parsed.data;
    const lastMsg = messages.filter((m) => m.role === 'user').at(-1)?.content ?? '';

    const [qEmb, keywords] = await Promise.all([
      embedQuery(lastMsg),
      Promise.resolve(extractKeywords(lastMsg)),
    ]);

    const chunks = await hybridRetrieve(qEmb, keywords, 8, jobIds?.length ? jobIds : undefined);
    const systemPrompt = buildQASystemPrompt(chunks);

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: systemPrompt,
      messages: messages as any,
    });

    const enc = new TextEncoder();
    const rs = new ReadableStream({
      async start(ctrl) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            ctrl.enqueue(enc.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`));
          }
        }
        ctrl.enqueue(enc.encode('data: [DONE]\n\n'));
        ctrl.close();
      },
    });
    return new Response(rs, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
