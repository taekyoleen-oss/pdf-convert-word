import fs from 'fs';
import path from 'path';

const OFFICE_PATHS = [
  'C:\\Program Files\\Microsoft Office\\root\\Office16\\MML2OMML.XSL',
  'C:\\Program Files\\Microsoft Office\\root\\Office15\\MML2OMML.XSL',
  'C:\\Program Files (x86)\\Microsoft Office\\root\\Office16\\MML2OMML.XSL',
  'C:\\Program Files (x86)\\Microsoft Office\\root\\Office15\\MML2OMML.XSL',
  'C:\\Program Files\\Microsoft Office\\Office16\\MML2OMML.XSL',
  'C:\\Program Files\\Microsoft Office\\Office15\\MML2OMML.XSL',
];

const PROJECT_XSL_PATH = path.join(process.cwd(), 'lib/converters/MML2OMML.XSL');

let cachedPath: string | null | undefined = undefined;

export function findMml2OmmlPath(): string | null {
  if (cachedPath !== undefined) return cachedPath;

  // 환경변수 오버라이드
  if (process.env.MML2OMML_XSL_PATH) {
    if (fs.existsSync(process.env.MML2OMML_XSL_PATH)) {
      cachedPath = process.env.MML2OMML_XSL_PATH;
      return cachedPath;
    }
  }

  // 프로젝트 내 로컬 파일 (배포 환경)
  if (fs.existsSync(PROJECT_XSL_PATH)) {
    cachedPath = PROJECT_XSL_PATH;
    return cachedPath;
  }

  for (const p of OFFICE_PATHS) {
    if (fs.existsSync(p)) {
      cachedPath = p;
      return cachedPath;
    }
  }

  cachedPath = null;
  return null;
}
