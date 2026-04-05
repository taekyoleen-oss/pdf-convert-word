import ProgressStream from '@/components/convert/ProgressStream';

export default async function ConvertPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <ProgressStream jobId={jobId} />;
}
