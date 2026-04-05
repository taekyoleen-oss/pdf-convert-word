# docx-builder 에이전트

## 역할
파싱 블록 JSON → docx-js Word 문서 생성. 수동 검토 플래그 → Word 주석(Comment) 삽입.

## 참조 스킬
- `.claude/skills/latex-to-omml/SKILL.md`
- `.claude/skills/docx-generator/SKILL.md`

## 구현 대상 파일
- `lib/converters/latex-to-omml.ts`
- `lib/converters/blocks-to-docx.ts`
- `lib/utils/find-mml2omml.ts`
- `app/api/convert/[jobId]/stream/route.ts` (5단계 docx 생성 포함)

## 핵심 스펙

### LaTeX → OMML 변환 (latex-to-omml.ts)
1. temml 라이브러리로 LaTeX → MathML 변환
2. xslt-processor로 MML2OMML.XSL 적용 → OMML XML 생성
3. MML2OMML.XSL 경로: `lib/utils/find-mml2omml.ts` 자동탐지 (MS Office 설치 경로)
   - Windows 경로 우선순위: `C:\Program Files\Microsoft Office\root\Office16\`, `C:\Program Files (x86)\Microsoft Office\...`
   - 탐지 실패 시: `MML2OMML_XSL_PATH` 환경변수
4. OMML 변환 실패 시: 수식 크롭 이미지 ImageRun 폴백 + Word 주석 "OMML 변환 실패 — 수식 이미지로 대체됨"

### docx 생성 (blocks-to-docx.ts)
- 라이브러리: `docx` (npm)
- 문서 스타일: A4, 본문 11pt **맑은 고딕(Malgun Gothic)**
- 수식 블록 들여쓰기: 1cm

**블록 타입별 처리**:
- `text`: Paragraph
- `inline-math`: Run 내 수식 (OMML 변환 → XML 삽입)
- `display-math`: 별도 Paragraph, 수식 오른쪽에 equation_number 있으면 Tab + 텍스트
- `image`: Storage에서 다운로드 → ImageRun 원본 위치 삽입
- `footnote`: docx Footnote API로 Word 각주 삽입, 각주 내 수식도 OMML 변환
- `display-math` with `fallback_image`: ImageRun으로 폴백 이미지 삽입

**flag: true 블록 처리**:
- 해당 수식/단락 바로 뒤 Word 주석(Comment) 삽입
- 주석 내용: `[검토 필요] {flag_reason}`
- `conv_pages.flagged_count` 업데이트

### 완료 후 처리
- `outputs/{jobId}/output.docx` Storage 저장
- `conv_jobs.output_path` 업데이트
- `conv_jobs.status = 'done'`
- `page-images/{jobId}/` 삭제 (Storage 임시 파일 정리)
- RAG 인덱싱 트리거: `POST /api/study/index/{jobId}` 비동기 호출
