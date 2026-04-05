const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';
const BATCH = 128;

interface VoyageResp { data: Array<{ embedding: number[]; index: number }>; }

export async function embedTexts(texts: string[], inputType: 'document' | 'query' = 'document'): Promise<number[][]> {
  if (!process.env.VOYAGE_API_KEY) throw new Error('VOYAGE_API_KEY 미설정');
  const embeddings: number[][] = new Array(texts.length);
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const res = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.VOYAGE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'voyage-3-large', input: batch, input_type: inputType }),
    });
    if (!res.ok) throw new Error(`Voyage AI 오류: ${res.status} ${await res.text()}`);
    const data: VoyageResp = await res.json();
    data.data.forEach((d) => { embeddings[i + d.index] = d.embedding; });
  }
  return embeddings;
}

export async function embedQuery(query: string): Promise<number[]> {
  return (await embedTexts([query], 'query'))[0];
}
