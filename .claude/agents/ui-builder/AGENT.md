# ui-builder 에이전트

## 역할
프론트엔드 전체 구현: 페이지, 컴포넌트, 상태 관리

## 구현 대상

### 페이지
- `app/page.tsx` — 홈/업로드
- `app/convert/[jobId]/page.tsx` — 변환 진행
- `app/result/[jobId]/page.tsx` — 변환 결과 + 검토 패널
- `app/history/page.tsx` — 변환 이력
- `app/study/page.tsx` — 학습 허브
- `app/layout.tsx` — 루트 레이아웃 (React Query Provider, QueryClientProvider)

### 컴포넌트
- `components/upload/PdfUploader.tsx`
- `components/upload/PageRangeSelector.tsx`
- `components/convert/ProgressStream.tsx`
- `components/convert/ParsedBlockPreview.tsx`
- `components/ui/MathBlock.tsx`
- `components/ui/FlagBadge.tsx`
- `components/ui/ImageBlock.tsx`
- `components/result/ReviewPanel.tsx`
- `components/result/ResultActions.tsx`
- `components/result/IndexingBadge.tsx`
- `components/history/HistoryList.tsx`
- `components/study/StudyHub.tsx`
- `components/study/SemanticSearch.tsx`
- `components/study/ChatInterface.tsx`
- `components/study/QuizGenerator.tsx`
- `components/study/FormulaExplorer.tsx`
- `components/study/ChunkCard.tsx`

## 디자인 토큰 (globals.css에 CSS 변수로 정의)
```css
--background: #0F1117
--surface: rgba(255,255,255,0.04)
--border: rgba(255,255,255,0.10)
--primary: #6EE7B7
--primary-hover: #34D399
--accent: #818CF8
--warning: #FCD34D
--text-primary: #E8EDF3
--text-muted: #6B7280
--math-bg: #1A1F2E
```

## 핵심 구현 스펙

### 상태 관리
- React Query (`@tanstack/react-query`) v5: 서버 상태
- Zustand v5: 업로드·변환 UI 상태

### ProgressStream 컴포넌트
- Supabase Realtime 구독으로 `conv_jobs`, `conv_pages` 변경 감지
- 진행률: "페이지 N/M 처리 중 (단계: 1차파싱 / 재파싱 / docx생성)"
- 재파싱 중: "N개 블록 재처리 중..." 메시지 표시

### ParsedBlockPreview
- KaTeX 렌더링, confidence별 시각 구분:
  - `high`: 일반 표시
  - `medium`: 앰버 테두리 (`--warning`) + FlagBadge
  - `low` / `fallback_image`: 빨강 배경 + FlagBadge

### ReviewPanel
- `flagged_count > 0` 시 결과 페이지 우측에 자동 표시
- 플래그 블록 + 페이지 번호 + 사유 리스트

### StudyHub (/study 페이지)
- 4탭: [🔍 검색] [💬 Q&A] [📝 문제풀기] [📐 수식 탐색]
- shadcn/ui Tabs 컴포넌트 활용

### IndexingBadge
- `conv_jobs.rag_indexed = true` 시 "학습 자료로 등록됨 → 학습 허브에서 검색하기" 표시
- `/study` 페이지 링크 포함

### MathBlock
- katex 라이브러리로 클라이언트 사이드 렌더링
- `display` prop으로 인라인/디스플레이 전환

## 중요 사항
- Next.js 16 App Router: 서버 컴포넌트 기본
- 클라이언트 컴포넌트는 `'use client'` 명시
- React 19 사용 (useTransition, use hook 등 활용 가능)
- Tailwind CSS v4 사용 (CSS 변수로 커스텀 토큰)
