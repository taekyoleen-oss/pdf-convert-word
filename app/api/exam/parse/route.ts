import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const client = new Anthropic();

const BodySchema = z.object({
  jobId:     z.string().uuid(),
  year:      z.number().int().min(2000).max(2100),
  exam_type: z.string().default('보험계리사'),
  subject:   z.string().default('보험수리학'),
  pages:     z.array(z.number().int().positive()).optional(),
});

const EXAM_PARSE_PROMPT = `당신은 보험계리사 시험 문제를 파싱하는 전문가입니다.

제공된 시험지 이미지에서 문제를 추출하여 다음 JSON 형식으로 반환하세요.
**수식은 반드시 LaTeX 형식으로 표현하세요** (예: $P_x$, $\\ddot{a}_x$, $$A_x = \\sum_{k=0}^{\\infty}$$).

반환 형식:
{
  "questions": [
    {
      "question_number": 1,
      "question_text": "문제 지문 (LaTeX 포함)",
      "option_1": "① 선택지 텍스트",
      "option_2": "② 선택지 텍스트",
      "option_3": "③ 선택지 텍스트",
      "option_4": "④ 선택지 텍스트",
      "option_5": "⑤ 선택지 텍스트",
      "correct_answer": null,
      "category": "이자론|생명표|생명보험|생명연금|순보험료|책임준비금|다중탈퇴|연금계리|기타",
      "difficulty": 3
    }
  ]
}

규칙:
- correct_answer는 정답이 이미지에 표시된 경우에만 숫자(1~5)로 입력, 없으면 null
- category는 문제 내용을 보고 가장 적절한 단원을 선택
- difficulty는 1(매우 쉬움)~5(매우 어려움) 중 추정
- 문제가 없는 경우 빈 배열 반환: {"questions": []}
- 수식 기호: 종신보험=$A_x$, 생명연금=$\\ddot{a}_x$, 순보험료=$P_x$, 책임준비금=$_{t}V_x$
- 반드시 valid JSON만 반환하고 다른 텍스트는 포함하지 마세요`;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error }, { status: 400 });
    }

    const { jobId, year, exam_type, subject, pages } = parsed.data;

    // Fetch page image paths from Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: jobData } = await supabase
      .from('conv_jobs')
      .select('original_name')
      .eq('id', jobId)
      .single();

    let pagesQuery = supabase
      .from('conv_pages')
      .select('page_number, image_paths')
      .eq('job_id', jobId)
      .order('page_number', { ascending: true });

    if (pages && pages.length > 0) {
      pagesQuery = pagesQuery.in('page_number', pages);
    }

    const { data: pageRows, error: pagesError } = await pagesQuery;
    if (pagesError) return NextResponse.json({ error: pagesError.message }, { status: 500 });
    if (!pageRows || pageRows.length === 0) {
      return NextResponse.json({ error: 'No pages found for this job' }, { status: 404 });
    }

    // Parse each page with Claude Vision
    const allQuestions: Record<string, unknown>[] = [];
    let parsedPages = 0;
    let errors = 0;

    for (const pageRow of pageRows) {
      const imagePaths: string[] = pageRow.image_paths ?? [];
      if (imagePaths.length === 0) continue;

      // Get signed URL for the main page image
      const { data: signedUrlData } = await supabase.storage
        .from('pdf-images')
        .createSignedUrl(imagePaths[0], 60);

      if (!signedUrlData?.signedUrl) { errors++; continue; }

      try {
        // Fetch image as base64
        const imgResponse = await fetch(signedUrlData.signedUrl);
        if (!imgResponse.ok) { errors++; continue; }
        const imgBuffer = await imgResponse.arrayBuffer();
        const base64 = Buffer.from(imgBuffer).toString('base64');
        const mediaType = 'image/png';

        // Call Claude Vision
        const response = await client.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: { type: 'base64', media_type: mediaType, data: base64 },
                },
                {
                  type: 'text',
                  text: EXAM_PARSE_PROMPT,
                },
              ],
            },
          ],
        });

        const text = response.content.find(c => c.type === 'text')?.text ?? '{}';
        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) { errors++; continue; }

        const parsed = JSON.parse(jsonMatch[0]);
        const questions = parsed.questions ?? [];

        for (const q of questions) {
          allQuestions.push({
            ...q,
            year,
            exam_type,
            subject,
            source_job_id: jobId,
          });
        }

        parsedPages++;
      } catch {
        errors++;
      }
    }

    if (allQuestions.length === 0) {
      return NextResponse.json({
        inserted: 0,
        parsedPages,
        errors,
        message: '파싱된 문제가 없습니다. 이미지 품질을 확인하거나 페이지 범위를 조정하세요.',
      });
    }

    // Insert into Supabase
    const { data: inserted, error: insertError } = await supabase
      .from('exam_questions')
      .insert(allQuestions)
      .select('id');

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    return NextResponse.json({
      inserted: inserted?.length ?? 0,
      parsedPages,
      errors,
      jobName: jobData?.original_name ?? jobId,
      message: `${inserted?.length ?? 0}개 문제가 파싱되어 저장되었습니다.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
