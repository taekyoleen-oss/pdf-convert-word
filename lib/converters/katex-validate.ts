import katex from 'katex';
import type { ParsedBlock } from '@/types/conversion';

export function validateLatex(latex: string): { valid: boolean; error?: string } {
  try {
    katex.renderToString(latex, { throwOnError: true });
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export function findFailedBlockIndices(blocks: ParsedBlock[]): number[] {
  const failed: number[] = [];
  blocks.forEach((block, index) => {
    if (block.type !== 'inline-math' && block.type !== 'display-math') return;
    if (!block.latex) {
      failed.push(index);
      return;
    }
    if (block.confidence === 'low') {
      failed.push(index);
      return;
    }
    const result = validateLatex(block.latex);
    if (!result.valid) {
      failed.push(index);
    }
  });
  return failed;
}
