import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://plveeubzpigcnqgerspi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsdmVldWJ6cGlnY25xZ2Vyc3BpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDgwODM1OCwiZXhwIjoyMDkwMzg0MzU4fQ.ArwgzhpVIpiR45SFHuIOt9he_gKC1u_A5qfy03N7ll0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
  console.log('Fetching latest jobs...');
  const { data: jobs, error } = await supabase
    .from('conv_jobs')
    .select('id, original_name, status, total_pages, target_pages, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('Error fetching jobs:', error);
    process.exit(1);
  }

  if (!jobs || jobs.length === 0) {
    console.log('No recent conversion jobs found.');
    process.exit(0);
  }

  for (const job of jobs) {
    console.log(`\nJob ID: ${job.id}`);
    console.log(`File Name: ${job.original_name}`);
    console.log(`Status: ${job.status}`);
    console.log(`Total Pages: ${job.total_pages}`);
    console.log(`Target Pages: ${job.target_pages ? job.target_pages.join(', ') : 'All'}`);
    console.log(`Created At: ${new Date(job.created_at).toLocaleString()}`);
    console.log(`Updated At: ${new Date(job.updated_at).toLocaleString()}`);
    
    // fetch pages status
    const { data: pages } = await supabase
      .from('conv_pages')
      .select('page_number, status')
      .eq('job_id', job.id)
      .order('page_number', { ascending: true });

    if (pages && pages.length > 0) {
      console.log('Pages Progress:');
      const processing = pages.filter(p => p.status === 'processing').map(p => p.page_number);
      const done = pages.filter(p => p.status === 'done').map(p => p.page_number);
      const err = pages.filter(p => p.status === 'error').map(p => p.page_number);
      
      console.log(`  - Done: ${done.length} (${done.join(', ')})`);
      if (processing.length > 0) console.log(`  - Processing: ${processing.length} (${processing.join(', ')})`);
      if (err.length > 0) console.log(`  - Error: ${err.length} (${err.join(', ')})`);
    } else {
      console.log('No specific page progress found yet.');
    }
  }
  process.exit(0);
}

checkStatus();
