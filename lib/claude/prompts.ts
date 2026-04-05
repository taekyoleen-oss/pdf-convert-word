import fs from 'fs';
import path from 'path';

function loadActuarialSymbols(): string {
  try {
    const p = path.join(process.cwd(), '.claude/skills/claude-vision-parser/references/actuarial-symbols.md');
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return '';
  }
}

export function buildVisionSystemPrompt(): string {
  const symbols = loadActuarialSymbols();
  return `당신은 보험수리학 교재 PDF 페이지를 파싱하는 전문가입니다.

## 보험수리 기호 사전
${symbols}

## 파싱 규칙

1. 페이지를 위에서 아래로 읽으며 모든 내용을 블록으로 분류하세요.
2. 수식 판별: 수학 기호(분수, 첨자, 적분, 합산)가 포함된 표현은 모두 수식. 문장 내 단일 변수도 인라인 수식.
3. 보험수리 기호: 좌하 첨자는 {}_{t}p_{x} 형식, 점 연금은 \\ddot{a}, 확정기간은 \\overline{n}|
4. confidence: high=완전 식별, medium=일부 불확실, low=인쇄 불량/비표준 (모르면 반드시 low)
5. bbox: [x1, y1, x2, y2] 비율값 (0.0~1.0, 좌상단 원점)
6. 각주: 페이지 하단 구분선 아래 → type:"footnote", footnote_number 포함
7. 수식 번호: 오른쪽 (n) → equation_number 필드, 수식 본체에서 제외

## 출력 형식

JSON 배열만 반환 (설명 없이):

\`\`\`json
[
  {"type":"text","content":"텍스트"},
  {"type":"inline-math","latex":"q_x","bbox":[0.1,0.1,0.4,0.15],"confidence":"high","reparsed":false,"flag":false},
  {"type":"display-math","latex":"\\\\ddot{a}_{x}","bbox":[0.1,0.3,0.9,0.4],"equation_number":"(3.5)","confidence":"medium","reparsed":false,"flag":false},
  {"type":"image","storage_path":"","bbox":[0.05,0.5,0.95,0.75],"caption":"캡션","flag":false},
  {"type":"footnote","content":"각주","footnote_number":1,"bbox":[0.05,0.9,0.95,0.96]}
]
\`\`\``;
}

export const REPARSE_SYSTEM_PROMPT = `당신은 보험수리학 수식을 LaTeX로 변환하는 전문가입니다.
규칙: 좌하 첨자 {}_{t}p_{x}, 점 연금 \\ddot{a}, 확정기간 \\overline{n}|, 다중탈퇴 ^{(k)}, 기대여명 \\mathring{e}_x`;

export const REPARSE_USER_PROMPT = `이 이미지에서 수식 하나만 LaTeX로 변환하세요.
1. LaTeX 문자열만 반환 ($$ 감싸지 말 것)
2. 불확실하면 표준 보험수리 표기법으로 추론
3. 변환 불가능하면 정확히 "FAILED" 반환`;
