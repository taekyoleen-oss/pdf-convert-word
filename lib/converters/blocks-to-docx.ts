import {
  Document, Paragraph, TextRun, ImageRun, AlignmentType,
  Packer, IImageOptions, ISectionOptions,
} from 'docx';
import { latexToOmml } from './latex-to-omml';
import { injectOmmlIntoDocx, OmmlEntry } from './inject-omml';
import { createServerClient } from '@/lib/supabase/server';
import type { ParsedBlock, ConvPage } from '@/types/conversion';

// Storage에서 이미지 다운로드
async function downloadImage(storagePath: string): Promise<Buffer | null> {
  try {
    const supabase = createServerClient();
    const parts = storagePath.split('/');
    const bucket = parts[0];
    const filePath = parts.slice(1).join('/');
    const { data } = await supabase.storage.from(bucket).download(filePath);
    if (!data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}

// 고유 플레이스홀더 생성
let ommlCounter = 0;
function nextPlaceholder(): string {
  return `__OMML_${Date.now()}_${++ommlCounter}__`;
}

interface MathParagraphResult {
  paragraph: Paragraph;
  ommlEntry?: OmmlEntry;
}

async function createMathParagraph(
  latex: string,
  equationNumber?: string,
  displayMode = true
): Promise<MathParagraphResult> {
  const omml = await latexToOmml(latex, displayMode);

  if (!omml) {
    // OMML 변환 실패 시 LaTeX 텍스트로 표시
    const children: TextRun[] = [
      new TextRun({ text: `[수식: ${latex}]`, italics: true, color: 'FF6B6B' }),
      new TextRun({ text: '  ⚠ OMML 변환 실패 — 수식 수동 편집 필요', color: 'FF6B6B', size: 18 }),
    ];
    if (equationNumber) {
      children.push(new TextRun({ text: `\t${equationNumber}` }));
    }
    return {
      paragraph: new Paragraph({ children, alignment: AlignmentType.CENTER }),
    };
  }

  // 플레이스홀더 단락 생성 — buildDocx 완료 후 실제 OMML로 교체
  const placeholder = nextPlaceholder();
  return {
    paragraph: new Paragraph({
      children: [new TextRun({ text: placeholder })],
      alignment: AlignmentType.CENTER,
    }),
    ommlEntry: { placeholder, omml, equationNumber },
  };
}

function createFlagComment(flagReason: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `⚠ [검토 필요] ${flagReason}`,
        color: 'FFA500',
        size: 18,
        italics: true,
      }),
    ],
  });
}

interface BlockResult {
  paragraphs: Paragraph[];
  ommlEntries: OmmlEntry[];
}

async function blockToParagraphs(block: ParsedBlock, _jobId: string): Promise<BlockResult> {
  const paragraphs: Paragraph[] = [];
  const ommlEntries: OmmlEntry[] = [];

  switch (block.type) {
    case 'text':
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: block.content, font: 'Malgun Gothic', size: 22 })],
      }));
      break;

    case 'inline-math': {
      const result = await createMathParagraph(block.latex, undefined, false);
      paragraphs.push(result.paragraph);
      if (result.ommlEntry) ommlEntries.push(result.ommlEntry);
      if (block.flag) paragraphs.push(createFlagComment(block.flag_reason ?? '검토 필요'));
      break;
    }

    case 'display-math':
      if (block.fallback_image) {
        const imgBuf = await downloadImage(block.fallback_image);
        if (imgBuf) {
          paragraphs.push(new Paragraph({
            children: [new ImageRun({ data: imgBuf, transformation: { width: 400, height: 100 }, type: 'png' } as IImageOptions)],
            alignment: AlignmentType.CENTER,
          }));
        }
        if (block.flag) paragraphs.push(createFlagComment(block.flag_reason ?? '이미지 폴백 — 수동 편집 필요'));
      } else if (block.latex) {
        const result = await createMathParagraph(block.latex, block.equation_number, true);
        paragraphs.push(result.paragraph);
        if (result.ommlEntry) ommlEntries.push(result.ommlEntry);
        if (block.flag) paragraphs.push(createFlagComment(block.flag_reason ?? '검토 필요'));
      }
      break;

    case 'image': {
      const imgBuf = await downloadImage(block.storage_path);
      if (imgBuf) {
        paragraphs.push(new Paragraph({
          children: [new ImageRun({ data: imgBuf, transformation: { width: 500, height: 300 }, type: 'png' } as IImageOptions)],
          alignment: AlignmentType.CENTER,
        }));
      }
      if (block.caption) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: block.caption, font: 'Malgun Gothic', size: 18, italics: true })],
          alignment: AlignmentType.CENTER,
        }));
      }
      break;
    }

    case 'footnote':
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `[각주 ${block.footnote_number}] ${block.content}`, font: 'Malgun Gothic', size: 18, color: '666666' })],
      }));
      break;
  }

  return { paragraphs, ommlEntries };
}

export async function buildDocx(jobId: string, originalName: string, pages: ConvPage[]): Promise<Buffer> {
  const allParagraphs: Paragraph[] = [];
  const allOmmlEntries: OmmlEntry[] = [];

  // 카운터 초기화 (동시 요청 대비)
  ommlCounter = 0;

  for (const page of pages) {
    if (!page.parsed_blocks) continue;

    allParagraphs.push(new Paragraph({
      children: [new TextRun({ text: `— 페이지 ${page.page_number} —`, color: '999999', size: 18 })],
      alignment: AlignmentType.CENTER,
    }));

    for (const block of page.parsed_blocks as ParsedBlock[]) {
      const result = await blockToParagraphs(block, jobId);
      allParagraphs.push(...result.paragraphs);
      allOmmlEntries.push(...result.ommlEntries);
    }

    allParagraphs.push(new Paragraph({ children: [] }));
  }

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4 (twips)
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: allParagraphs,
    }] as ISectionOptions[],
    styles: {
      default: {
        document: {
          run: { font: 'Malgun Gothic', size: 22 },
        },
      },
    },
  });

  const docxBuffer = await Packer.toBuffer(doc);

  // OMML이 있으면 후처리로 실제 수식 삽입
  if (allOmmlEntries.length > 0) {
    return injectOmmlIntoDocx(docxBuffer, allOmmlEntries);
  }

  return docxBuffer;
}
