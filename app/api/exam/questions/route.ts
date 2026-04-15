import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/exam/questions?year=2023&category=이자론&page=1&limit=20
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year     = searchParams.get('year');
  const category = searchParams.get('category');
  const subject  = searchParams.get('subject') ?? '보험수리학';
  const page     = parseInt(searchParams.get('page') ?? '1', 10);
  const limit    = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);
  const offset   = (page - 1) * limit;

  const supabase = getServiceClient();

  // Fetch available years
  if (searchParams.get('years') === '1') {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('year, exam_type')
      .eq('subject', subject)
      .order('year', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const yearsMap = new Map<number, Set<string>>();
    for (const row of data ?? []) {
      if (!yearsMap.has(row.year)) yearsMap.set(row.year, new Set());
      yearsMap.get(row.year)!.add(row.exam_type);
    }
    const years = Array.from(yearsMap.entries())
      .map(([year, types]) => ({ year, exam_types: Array.from(types) }))
      .sort((a, b) => b.year - a.year);

    return NextResponse.json({ years });
  }

  // Fetch categories for a year
  if (searchParams.get('categories') === '1' && year) {
    const { data, error } = await supabase
      .from('exam_questions')
      .select('category')
      .eq('subject', subject)
      .eq('year', parseInt(year, 10))
      .not('category', 'is', null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const cats = [...new Set((data ?? []).map(r => r.category).filter(Boolean))].sort();
    return NextResponse.json({ categories: cats });
  }

  // Build query
  let query = supabase
    .from('exam_questions')
    .select('*', { count: 'exact' })
    .eq('subject', subject)
    .order('question_number', { ascending: true })
    .range(offset, offset + limit - 1);

  if (year) query = query.eq('year', parseInt(year, 10));
  if (category) query = query.eq('category', category);

  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ questions: data ?? [], total: count ?? 0, page, limit });
}

// POST /api/exam/questions — insert one or many questions
const QuestionSchema = z.object({
  year:            z.number().int().min(2000).max(2100),
  exam_type:       z.string().default('보험계리사'),
  subject:         z.string().default('보험수리학'),
  question_number: z.number().int().positive(),
  question_text:   z.string().min(1),
  option_1:        z.string().optional(),
  option_2:        z.string().optional(),
  option_3:        z.string().optional(),
  option_4:        z.string().optional(),
  option_5:        z.string().optional(),
  correct_answer:  z.number().int().min(1).max(5).optional(),
  correct_text:    z.string().optional(),
  explanation:     z.string().optional(),
  category:        z.string().optional(),
  difficulty:      z.number().int().min(1).max(5).default(3),
  source_job_id:   z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });

  const rows = Array.isArray(body) ? body : [body];
  const parsed = rows.map(r => QuestionSchema.safeParse(r));
  const errors = parsed.filter(p => !p.success);
  if (errors.length > 0) {
    return NextResponse.json({ error: 'Validation error', details: errors.map(e => e.error) }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('exam_questions')
    .insert(parsed.map(p => (p as { success: true; data: unknown }).data))
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, ids: data?.map((r: { id: string }) => r.id) ?? [] });
}

// DELETE /api/exam/questions?year=2023&exam_type=보험계리사
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const year      = searchParams.get('year');
  const exam_type = searchParams.get('exam_type');
  const id        = searchParams.get('id');

  const supabase = getServiceClient();

  if (id) {
    const { error } = await supabase.from('exam_questions').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ deleted: true });
  }

  if (!year) return NextResponse.json({ error: 'year is required' }, { status: 400 });

  let query = supabase.from('exam_questions').delete().eq('year', parseInt(year, 10));
  if (exam_type) query = query.eq('exam_type', exam_type);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: true });
}
