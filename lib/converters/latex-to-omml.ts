import temml from 'temml';
import { Xslt, XmlParser } from 'xslt-processor';
import fs from 'fs';
import { findMml2OmmlPath } from '@/lib/utils/find-mml2omml';

let xslContent: string | null = null;

function getXslContent(): string | null {
  if (xslContent) return xslContent;
  const xslPath = findMml2OmmlPath();
  if (!xslPath) return null;
  try {
    xslContent = fs.readFileSync(xslPath, 'utf-8');
    return xslContent;
  } catch {
    return null;
  }
}

export async function latexToOmml(latex: string, displayMode = false): Promise<string | null> {
  try {
    // LaTeX → MathML (temml)
    let mathml = temml.renderToString(latex, { throwOnError: true, displayMode });

    // MML2OMML.XSL은 MathML 네임스페이스가 명시되어야 작동함
    // <math> 또는 <math ...> 모두 처리 (속성 없는 경우도 포함)
    if (!mathml.includes('xmlns=')) {
      mathml = mathml.replace(/^<math(\s|>)/, '<math xmlns="http://www.w3.org/1998/Math/MathML"$1');
    }

    // MathML → OMML (XSLT)
    const xsl = getXslContent();
    if (!xsl) return null;

    const parser = new XmlParser();
    const xslt = new Xslt();
    const xslDoc = parser.xmlParse(xsl);
    const mmlDoc = parser.xmlParse(mathml);
    const result = await xslt.xsltProcess(mmlDoc, xslDoc);
    if (!result) return null;

    return result;
  } catch {
    return null;
  }
}
