import { createServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('conv_jobs')
    .select('category')
    .not('category', 'is', null)
    .order('category', { ascending: true });

  const categories: string[] = Array.from(
    new Set((data ?? []).map((r) => r.category as string))
  ).filter(Boolean);

  return Response.json({ categories });
}
