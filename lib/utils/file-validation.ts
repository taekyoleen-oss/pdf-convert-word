import { z } from 'zod';

export const MAX_PDF_SIZE = 50 * 1024 * 1024; // 50MB

export const uploadSchema = z.object({
  fileName: z.string().endsWith('.pdf', '파일 확장자는 .pdf여야 합니다'),
  fileSize: z.number().max(MAX_PDF_SIZE, '파일 크기는 50MB 이하여야 합니다'),
});

export function validatePdfFile(file: File): { valid: boolean; error?: string } {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return { valid: false, error: '파일 확장자는 .pdf여야 합니다' };
  }
  if (file.size > MAX_PDF_SIZE) {
    return { valid: false, error: `파일 크기는 50MB 이하여야 합니다 (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)` };
  }
  return { valid: true };
}
