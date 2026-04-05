import { createServerClient } from '@/lib/supabase/server';

export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

export async function uploadFile(
  bucket: string,
  path: string,
  data: Buffer | Uint8Array,
  contentType = 'application/octet-stream'
): Promise<{ path: string } | null> {
  const supabase = createServerClient();
  const { data: result, error } = await supabase.storage
    .from(bucket)
    .upload(path, data, { contentType, upsert: true });
  if (error) return null;
  return result;
}

export async function fileExists(bucket: string, path: string): Promise<boolean> {
  const supabase = createServerClient();
  const { data } = await supabase.storage.from(bucket).list(
    path.substring(0, path.lastIndexOf('/')),
    { search: path.substring(path.lastIndexOf('/') + 1) }
  );
  return (data?.length ?? 0) > 0;
}

export async function deleteFolder(bucket: string, prefix: string): Promise<void> {
  const supabase = createServerClient();
  const { data } = await supabase.storage.from(bucket).list(prefix);
  if (!data || data.length === 0) return;
  const paths = data.map((f) => `${prefix}/${f.name}`);
  await supabase.storage.from(bucket).remove(paths);
}
