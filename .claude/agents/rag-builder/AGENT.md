# rag-builder 에이전트

## 역할
RAG 인덱싱 파이프라인 + 학습 API 라우트 + /study 페이지 구현

## 트리거
docx-builder 완료 후 자동 호출 (`POST /api/study/index/{jobId}`)

## 구현 대상 파일
- `lib/rag/chunker.ts`
- `lib/rag/embedder.ts`
- `lib/rag/indexer.ts`
- `lib/rag/retriever.ts`
- `lib/claude/study-prompts.ts`
- `app/api/study/index/[jobId]/route.ts`
- `app/api/study/search/route.ts`
- `app/api/study/chat/route.ts`
- `app/api/study/quiz/route.ts`
- `app/api/study/formulas/route.ts`

## 청킹 전략 (chunker.ts)

parsed_blocks 배열을 입력받아 Chunk 배열 반환:

```typescript
type Chunk = {
  page_number: number;
  chunk_index: number;
  chunk_type: 'text' | 'formula' | 'example' | 'mixed';
  content: string;          // 평문 (수식은 LaTeX 그대로)
  latex_items: string[];    // 청크 내 LaTeX 배열
  metadata: {
    blockIndices: number[];
    confidence: string;
    hasEquation: boolean;
    isExample: boolean;
  };
};
```

**청킹 규칙**:
1. 연속 `text` 블록 → 500토큰(≈400자) 이하 1청크, `chunk_type: 'text'`
2. `display-math` 블록 → 직전 text 1문장 + 수식 + 직후 text 1문장 포함, `chunk_type: 'formula'`
3. `inline-math` 포함 텍스트 → 문장 단위, `chunk_type: 'mixed'`, latex_items에 수식 수집
4. "예제"/"Example"/"풀이"/"해설" 키워드 포함 → `chunk_type: 'example'`
5. `footnote` → 직전 text 청크에 병합
6. `image` → 청킹 제외 (캡션만 text로 포함)

## 임베딩 (embedder.ts)

Voyage AI REST API 직접 호출 (별도 npm 패키지 없이 fetch 사용):

```typescript
// 인덱싱: input_type = "document"
// 검색: input_type = "query"
// 모델: "voyage-3-large"
// 차원: 1024
// 배치: 최대 128 texts/요청
const response = await fetch('https://api.voyageai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'voyage-3-large',
    input: texts,
    input_type: inputType,
  }),
});
```

## 저장 (indexer.ts)

- Supabase `book_chunks` 테이블 upsert (job_id + chunk_index 기준)
- 배치 저장 (100개씩)
- 완료 후 `conv_jobs.rag_indexed = true`

## 검색 (retriever.ts)

pgvector cosine similarity top-k:

```sql
SELECT id, job_id, page_number, chunk_type, content, source_title, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM book_chunks
ORDER BY embedding <=> $1::vector
LIMIT $2;
```

## API 라우트 스펙

### POST /api/study/index/[jobId]
- 입력: jobId (URL 파라미터)
- 처리: conv_pages 조회 → 청킹 → 임베딩 → book_chunks 저장 → rag_indexed=true
- 응답: `{ success: true, chunksCount: number }`

### POST /api/study/search
- 입력: `{ query: string, jobIds?: string[] }`
- 처리: 쿼리 임베딩 → pgvector 검색 top-5
- 응답: `{ results: Chunk[] }`

### POST /api/study/chat (스트리밍)
- 입력: `{ messages: Message[], jobIds?: string[] }`
- 처리: 마지막 메시지로 검색 → 컨텍스트 주입 → Claude Sonnet 4.6 스트리밍
- 응답: SSE 스트림
- 시스템 프롬프트: study-prompts.ts의 Q&A 프롬프트 (교재 내용에서만 답변)

### POST /api/study/quiz
- 입력: `{ topic: string, difficulty: '기초'|'중급'|'심화', type: 'multiple_choice'|'short_answer', count: number, jobIds?: string[] }`
- 처리: 토픽으로 검색 → 컨텍스트 주입 → Claude 문제 생성
- 응답: `{ questions: Question[] }`

### GET /api/study/formulas
- 입력: `jobIds` 쿼리 파라미터
- 처리: book_chunks WHERE chunk_type IN ('formula', 'example') 조회
- 응답: `{ chunks: Chunk[] }`

## 시스템 프롬프트 (study-prompts.ts)

**Q&A 프롬프트**:
```
당신은 보험수리학 교재 전문 튜터입니다.
아래에 제공된 교재 내용(context)에서만 답변하세요.
교재에서 찾을 수 없는 내용은 "교재에서 찾을 수 없음"이라고 명확히 답하세요.
수식은 LaTeX 형식으로 표기하세요.
답변 마지막에 "[출처: {source_title} p.{page_number}]" 형식으로 표시하세요.
```

**문제 생성 프롬프트**: JSON 형식 문제 배열 출력 (question, choices, answer, explanation, source_page)
