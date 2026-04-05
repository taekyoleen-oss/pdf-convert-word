# pdf-parser 에이전트

## 역할
PDF 페이지를 고해상도 이미지로 변환 후 Claude Sonnet 4.6 Vision에 전달, 보험수리 특화 프롬프트로 블록 파싱 → KaTeX 검증 → 재파싱 루프

## 참조 스킬
- `.claude/skills/claude-vision-parser/SKILL.md`
- `.claude/skills/katex-validator/SKILL.md`
- `.claude/skills/block-reparsing/SKILL.md`

## 구현 대상 파일
- `lib/converters/pdf-to-images.ts`
- `lib/claude/vision-parser.ts`
- `lib/claude/reparser.ts`
- `lib/claude/prompts.ts`
- `lib/converters/katex-validate.ts`
- `lib/converters/crop-block.ts`

## 핵심 스펙

### PDF 이미지화 (pdf-to-images.ts)
- pdf2pic 라이브러리 사용
- 해상도: **300 DPI 필수** (기본값 `process.env.PDF_IMAGE_DPI ?? '300'`)
- 출력: PNG, Supabase Storage `page-images/{jobId}/page-{n}.png` 저장
- 재시도 시: Storage 이미 존재하면 이미지화 건너뜀

### Vision 파싱 (vision-parser.ts)
- 모델: `claude-sonnet-4-6` 고정 (절대 다운그레이드 없음)
- `maxRetries: 5` (SDK 자동 retry-after 대기)
- 시스템 프롬프트: `.claude/skills/claude-vision-parser/references/prompt-template.md` 내용 사용
- 보험수리 기호 사전: `.claude/skills/claude-vision-parser/references/actuarial-symbols.md` 내용 포함
- 응답: JSON 배열 파싱 블록
- 페이지 이미지를 base64로 인코딩하여 vision 호출

### 파싱 블록 JSON 스키마
```json
[
  { "type": "text", "content": "텍스트 내용" },
  { "type": "inline-math", "latex": "q_x", "bbox": [x1,y1,x2,y2], "confidence": "high", "reparsed": false, "flag": false },
  { "type": "display-math", "latex": "\\ddot{a}_x", "bbox": [x1,y1,x2,y2], "equation_number": "(3.5)", "confidence": "medium", "reparsed": false, "flag": false },
  { "type": "image", "storage_path": "extracted-images/{jobId}/img-3-0.png", "bbox": [x1,y1,x2,y2], "caption": "...", "flag": false },
  { "type": "footnote", "content": "각주 내용", "footnote_number": 1, "bbox": [x1,y1,x2,y2] }
]
```

### KaTeX 검증 (katex-validate.ts)
- `katex.renderToString(latex, { throwOnError: true })` 서버 사이드
- 오류 블록 → 재파싱 대상 목록
- `confidence: 'low'` 블록도 재파싱 대상

### bbox 좌표계
- `[x1, y1, x2, y2]` 비율값 (0.0~1.0), 이미지 왼쪽 위가 원점
- `conv_pages.bbox_version = 'ratio'` 고정

### 재파싱 (reparser.ts + crop-block.ts)
- bbox 비율 → 픽셀 스케일 → sharp 크롭 (여백 20px 추가)
- 크롭 이미지 Storage 저장: `page-images/{jobId}/crop/page-{n}-block-{i}-attempt-{k}.png`
- 재파싱 전용 프롬프트 사용 (reparse-prompt.md)
- 최대 3회 (`MAX_REPARSE_ATTEMPTS`)
- 성공: `reparsed: true`, 원본 블록 교체
- 3회 실패: 크롭 이미지 → `extracted-images/{jobId}/fallback/fallback-{n}-{i}.png` 저장, `flag: true`, `fallback_image` 경로 기록

### DB 저장 (conv_pages)
- `parsed_blocks`: 최종 블록 JSON
- `raw_blocks`: 1차 파싱 원본 보존
- `reparse_count`: 재파싱 횟수 총합
- `flagged_count`: 수동 검토 플래그 블록 수
- `bbox_version: 'ratio'`

## 실패 처리
- Vision 타임아웃: SDK 자동 재시도 → 소진 후 해당 페이지 `status: 'error'`
- 이미지 추출 실패: 페이지 건너뜀, 결과에 누락 목록 포함
