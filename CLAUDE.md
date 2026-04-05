# 보험수리 PDF → 문서 변환기 오케스트레이터

## 프로젝트 개요

보험수리학 교재 PDF를 Claude Sonnet 4.6 Vision으로 파싱하여 편집 가능한 `.docx` 파일로 변환하고, RAG 기반 학습 시스템을 제공하는 Next.js 16 웹앱.

**설계서**: `../pdf-converter-design-v1.1.md`
**Next.js 버전**: 16.2.1 (Turbopack 기본, App Router)

## 기술 스택

- **Frontend**: Next.js 16 App Router, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js Route Handlers (Web API), Supabase (DB + Storage)
- **AI**: Claude Sonnet 4.6 (`claude-sonnet-4-6`), Voyage AI (`voyage-3-large`)
- **변환**: pdf2pic (300 DPI), sharp (크롭), docx (Word 생성), KaTeX (검증), temml (LaTeX→MathML)
- **RAG**: pgvector (Supabase), 1024차원 임베딩

## 에이전트 구조

```
CLAUDE.md (오케스트레이터)
├── .claude/agents/pdf-parser/AGENT.md
├── .claude/agents/docx-builder/AGENT.md
├── .claude/agents/ui-builder/AGENT.md
└── .claude/agents/rag-builder/AGENT.md
```

## 절대 원칙

1. **수식 정확도 최우선**: Claude Sonnet 4.6 (`claude-sonnet-4-6`) 고정
2. **이미지 폴백 최후 수단**: 크롭 재파싱 3회 실패 시에만
3. **보안**: 서버 사이드에서만 signed URL 발급 (SUPABASE_SERVICE_ROLE_KEY)
4. **Route Handler 패턴**: `export async function GET/POST(request: Request)` (NextRequest 선택적)

## 환경 변수 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
PDF_IMAGE_DPI=300
MAX_PDF_PAGES=50
MAX_REPARSE_ATTEMPTS=3
MML2OMML_XSL_PATH=
```

## 코딩 규칙

- TypeScript strict, async/await
- 서버 컴포넌트 기본, `'use client'` 최소화
- Zod v4로 API 입력 검증 (`import { z } from 'zod'`)
- 에러 타입화 처리
