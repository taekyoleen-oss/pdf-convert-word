import JSZip from 'jszip';

const M_NAMESPACE = 'http://schemas.openxmlformats.org/officeDocument/2006/math';

// XML 선언부 및 OMML 루트의 xmlns:m 제거
// (w:document 루트에 이미 선언되어 있으므로 중복 방지)
function cleanOmmlString(omml: string): string {
  return omml
    .replace(/<\?xml[^>]*\?>\s*/, '')
    .replace(/\s+xmlns:m="[^"]*"/g, '')
    .trim();
}

// 문서 루트에 xmlns:m 네임스페이스가 없으면 추가
function ensureMathNamespace(xml: string): string {
  if (xml.includes('xmlns:m=')) return xml;
  return xml.replace(
    /(<w:document\b)([^>]*>)/,
    `$1 xmlns:m="${M_NAMESPACE}"$2`
  );
}

// <w:p> 또는 <w:p ...> 시작 태그를 역방향으로 탐색 (<w:pPr>, <w:pStyle> 등 제외)
function findParaStart(xml: string, fromIdx: number): number {
  let search = fromIdx;
  while (search > 0) {
    const found = xml.lastIndexOf('<w:p', search - 1);
    if (found === -1) return -1;
    const charAfter = xml[found + 4]; // '<w:p' 다음 문자
    if (charAfter === '>' || charAfter === ' ') return found;
    search = found; // <w:pPr> 등이면 더 뒤를 탐색
  }
  return -1;
}

// 플레이스홀더를 포함하는 <w:p> 전체를 OMML 단락으로 교체
function replacePlaceholderParagraph(
  xml: string,
  placeholder: string,
  ommlXml: string,
  equationNumber?: string
): string {
  const idx = xml.indexOf(placeholder);
  if (idx === -1) return xml;

  // 플레이스홀더를 감싸는 <w:p> 시작 위치 탐색 (역방향, <w:pPr> 제외)
  const pStartIdx = findParaStart(xml, idx);
  if (pStartIdx === -1) return xml;

  // </w:p> 종료 위치 탐색
  const pEndIdx = xml.indexOf('</w:p>', idx);
  if (pEndIdx === -1) return xml;

  const before = xml.substring(0, pStartIdx);
  const after = xml.substring(pEndIdx + '</w:p>'.length);

  // 수식 번호가 있으면 탭 + 번호 추가
  const eqNumXml = equationNumber
    ? `<w:r><w:t xml:space="preserve">\t${equationNumber}</w:t></w:r>`
    : '';

  // 중앙 정렬 단락에 OMML 삽입
  const replacement = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr>${ommlXml}${eqNumXml}</w:p>`;

  return before + replacement + after;
}

export interface OmmlEntry {
  placeholder: string;
  omml: string;
  equationNumber?: string;
}

export async function injectOmmlIntoDocx(
  docxBuffer: Buffer,
  entries: OmmlEntry[]
): Promise<Buffer> {
  if (entries.length === 0) return docxBuffer;

  try {
    const zip = await JSZip.loadAsync(docxBuffer);
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) return docxBuffer;

    let xml = await documentFile.async('string');

    // 수학 네임스페이스 보장 (docx 라이브러리가 이미 포함시키지만 방어적으로 확인)
    xml = ensureMathNamespace(xml);

    // 각 플레이스홀더를 OMML로 교체
    for (const entry of entries) {
      try {
        const omml = cleanOmmlString(entry.omml);
        // OMML 최소 유효성: m:oMathPara 또는 m:oMath 로 시작해야 함
        if (!omml.startsWith('<m:oMath')) {
          console.warn('[inject-omml] 유효하지 않은 OMML, 건너뜀:', entry.placeholder);
          continue;
        }
        xml = replacePlaceholderParagraph(xml, entry.placeholder, omml, entry.equationNumber);
      } catch (e) {
        console.error('[inject-omml] 교체 오류:', entry.placeholder, e);
      }
    }

    zip.file('word/document.xml', xml);
    const result = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    return result as Buffer;
  } catch (e) {
    // OMML 주입 전체 실패 시 원본 docx 반환 (플레이스홀더 텍스트가 남을 수 있음)
    console.error('[inject-omml] OMML 주입 실패, 원본 반환:', e);
    return docxBuffer;
  }
}
