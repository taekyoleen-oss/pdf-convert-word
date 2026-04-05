# latex-to-omml 스킬

## 역할
LaTeX 문자열 → OMML XML 변환 (Word 네이티브 수식)

## 변환 파이프라인

```
LaTeX → temml(MathML) → MML2OMML.XSL(XSLT) → OMML XML
```

## 구현 패턴

```typescript
import temml from 'temml';
import { XsltProcessor, xmlParse } from 'xslt-processor';
import fs from 'fs';

// MML2OMML.XSL 로드 (최초 1회)
let xsltProcessor: XsltProcessor | null = null;

export async function latexToOmml(latex: string): Promise<string | null> {
  try {
    // 1. LaTeX → MathML
    const mathml = temml.renderToString(latex, { throwOnError: true });

    // 2. MathML → OMML via XSLT
    const xslPath = findMml2OmmlPath();
    if (!xslPath) throw new Error('MML2OMML.XSL not found');

    if (!xsltProcessor) {
      const xslContent = fs.readFileSync(xslPath, 'utf-8');
      xsltProcessor = new XsltProcessor();
      xsltProcessor.importStylesheetNode(xmlParse(xslContent));
    }

    const mathmlDoc = xmlParse(mathml);
    const result = xsltProcessor.transformToDocument(mathmlDoc);

    return result?.documentElement?.outerHTML ?? null;
  } catch (e) {
    return null; // OMML 변환 실패 → docx-builder에서 이미지 폴백 처리
  }
}
```

## 실패 처리
- 변환 실패 시 `null` 반환
- docx-builder에서 `null` 감지 → 이미지 폴백 + Word 주석 "OMML 변환 실패"
- pdf-parser 재파싱 루프와 완전 독립 처리
