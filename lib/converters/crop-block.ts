import sharp from 'sharp';

export async function cropBlock(
  imageBuffer: Buffer,
  bbox: [number, number, number, number],
  padding = 20
): Promise<Buffer> {
  const meta = await sharp(imageBuffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  const left = Math.max(0, Math.floor(bbox[0] * w) - padding);
  const top = Math.max(0, Math.floor(bbox[1] * h) - padding);
  const right = Math.min(w, Math.ceil(bbox[2] * w) + padding);
  const bottom = Math.min(h, Math.ceil(bbox[3] * h) + padding);

  return sharp(imageBuffer)
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toBuffer();
}
