import { listJobs } from '@/lib/supabase/queries';
export async function GET() {
  const jobs = await listJobs();
  return Response.json({ jobs });
}
