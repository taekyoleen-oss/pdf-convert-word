import { NextRequest } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { embedQuery } from '@/lib/rag/embedder';
import { retrieveChunks } from '@/lib/rag/retriever';
import { buildQuizPrompt } from '@/lib/claude/study-prompts';

const schema = z.object({ topic: z.string().min(1), difficulty: z.enum(['기초', '중급', '심화']), type: z.enum(['multiple_choice', 'short_answer']), count: z.number().int().min(1).max(10).default(3), jobIds: z.array(z.string().uuid()).optional() });
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 3 });

export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: '잘못된 요청' }, { status: 400 });
    const { topic, difficulty, type, count, jobIds } = parsed.data;

    const qEmb = await embedQuery(topic);
    const chunks = await retrieveChunks(qEmb, 8, jobIds);
    const prompt = buildQuizPrompt(chunks, difficulty, type, count);

    const res = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] });
    const text = res.content[0].type === 'text' ? res.content[0].text : '';
    const match = text.match(/\{[\s\S]*\}/);
    const questions = match ? JSON.parse(match[0]) : { questions: [] };
    return Response.json(questions);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
