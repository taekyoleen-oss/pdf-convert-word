import { createServerClient } from './server';
import type { ConvJob, ConvPage } from '@/types/conversion';

export async function getJob(jobId: string): Promise<ConvJob | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('conv_jobs')
    .select('*')
    .eq('id', jobId)
    .single();
  if (error) return null;
  return data as ConvJob;
}

export async function getJobPages(jobId: string): Promise<ConvPage[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('conv_pages')
    .select('*')
    .eq('job_id', jobId)
    .order('page_number', { ascending: true });
  if (error) return [];
  return (data ?? []) as ConvPage[];
}

export async function listJobs(): Promise<ConvJob[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('conv_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return [];
  return (data ?? []) as ConvJob[];
}

export async function updateJobStatus(
  jobId: string,
  status: ConvJob['status'],
  extraFields?: Partial<ConvJob>
) {
  const supabase = createServerClient();
  return supabase
    .from('conv_jobs')
    .update({ status, updated_at: new Date().toISOString(), ...extraFields })
    .eq('id', jobId);
}

export async function updatePageStatus(
  pageId: string,
  status: ConvPage['status'],
  extraFields?: Partial<ConvPage>
) {
  const supabase = createServerClient();
  return supabase
    .from('conv_pages')
    .update({ status, ...extraFields })
    .eq('id', pageId);
}
