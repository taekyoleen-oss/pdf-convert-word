# docx-generator 스킬

## 역할
파싱 블록 JSON → docx-js Document 생성 (Word 주석 삽입 포함)

## 문서 스타일
- 페이지: A4 (11906 twip × 16838 twip)
- 기본 폰트: **맑은 고딕(Malgun Gothic)**, 11pt
- 수식 블록 들여쓰기: 720 twip (1cm ≈ 567 twip, 사용 편의상 720)

## docx-js 블록 처리 패턴

```typescript
import { Document, Paragraph, TextRun, ImageRun, FootnoteReferenceRun } from 'docx';

// display-math 블록 → 수식 단락
function mathParagraph(ommlXml: string, equationNumber?: string): Paragraph {
  // OMML XML을 rawXml로 삽입
  // equation_number가 있으면 Tab + TextRun으로 번호 추가
}

// flag: true 블록 → Word 주석
function addComment(text: string): Comment {
  // `[검토 필요] ${flag_reason}` 형식
}

// footnote 블록 → Word 각주
function footnoteRun(content: string): FootnoteReferenceRun {
  // docx Footnote API 사용
}
```

## Word OMML 삽입 방법

docx-js에서 OMML XML을 직접 삽입하려면 `rawXml` 옵션 활용:
```typescript
new Paragraph({
  children: [
    new Run({
      // OMML은 <w:r> 안에 <m:oMath> 태그로 삽입
    }),
  ],
});
```

## 주의 사항
- Word 주석은 `conv_pages.flagged_count`와 1:1 대응
- 각주 내 수식도 동일 OMML 변환 파이프라인 적용
- 표(Table)는 이미지 ImageRun으로 삽입 (Word Table 변환 없음)
