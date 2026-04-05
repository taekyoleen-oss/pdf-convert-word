# block-reparsing 스킬

## 역할
실패 블록 크롭 이미지 생성 + 재파싱 루프 로직

## 크롭 이미지 생성 패턴

```typescript
import sharp from 'sharp';

export async function cropBlock(
  pageImagePath: string,
  bbox: [number, number, number, number], // [x1, y1, x2, y2] 비율값
  padding: number = 20
): Promise<Buffer> {
  const metadata = await sharp(pageImagePath).metadata();
  const { width = 0, height = 0 } = metadata;

  const left = Math.max(0, Math.floor(bbox[0] * width) - padding);
  const top = Math.max(0, Math.floor(bbox[1] * height) - padding);
  const right = Math.min(width, Math.ceil(bbox[2] * width) + padding);
  const bottom = Math.min(height, Math.ceil(bbox[3] * height) + padding);

  return sharp(pageImagePath)
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toBuffer();
}
```

## 재파싱 루프 패턴

```typescript
// 최대 MAX_REPARSE_ATTEMPTS(기본 3)회 시도
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const cropBuffer = await cropBlock(pageImagePath, block.bbox);
  // Storage에 크롭 이미지 저장
  // Claude Vision 재파싱 (reparse-prompt.md 사용)
  const result = await reparseBlock(cropBuffer, jobId, pageNum, blockIdx, attempt);

  if (result !== 'FAILED') {
    const validation = validateLatex(result);
    if (validation.valid) {
      // 성공: 블록 교체 + reparsed: true + confidence: 'high' 또는 'medium'
      block.latex = result;
      block.reparsed = true;
      block.flag = true; // 재파싱된 블록은 수동 검토 권장
      block.flag_reason = '재파싱됨 — 수동 확인 권장';
      break;
    }
  }

  if (attempt === maxAttempts - 1) {
    // 3회 실패: 폴백 이미지로
    block.latex = null;
    block.fallback_image = `extracted-images/{jobId}/fallback/fallback-{pageN}-{blockIdx}.png`;
    block.flag = true;
    block.flag_reason = '3회 재파싱 실패 — 이미지 폴백 삽입됨, 수동 편집 필요';
    // 크롭 이미지를 fallback 경로에 복사
  }
}
```

## bbox 좌표계
- 입력: `[x1, y1, x2, y2]` 비율값 (0.0~1.0)
- 픽셀 변환: `left = bbox[0] * imageWidth`, `top = bbox[1] * imageHeight`
- `conv_pages.bbox_version = 'ratio'` 로 고정
