# katex-validator 스킬

## 역할
LaTeX → KaTeX 서버 사이드 검증, 오류 블록 목록 반환

## 검증 패턴

```typescript
import katex from 'katex';

export function validateLatex(latex: string): { valid: boolean; error?: string } {
  try {
    katex.renderToString(latex, { throwOnError: true });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function findFailedBlocks(blocks: ParsedBlock[]): number[] {
  const failedIndices: number[] = [];
  blocks.forEach((block, index) => {
    if (block.type === 'inline-math' || block.type === 'display-math') {
      if (!block.latex) return;
      if (block.confidence === 'low') {
        failedIndices.push(index);
        return;
      }
      const result = validateLatex(block.latex);
      if (!result.valid) {
        failedIndices.push(index);
      }
    }
  });
  return failedIndices;
}
```

## 중요 사항
- `confidence: 'low'` 블록도 자동으로 재파싱 대상에 추가
- KaTeX 검증은 서버 사이드에서만 실행 (Node.js 환경)
- 검증 실패 = 재파싱 대상 (이미지 폴백 아님)
