# claude-vision-parser 스킬

## 역할
Claude Sonnet 4.6 Vision 호출 패턴, 보험수리 특화 프롬프트 관리

## 모델
- `claude-sonnet-4-6` 고정
- `maxRetries: 5` (SDK 자동 retry-after)
- 절대 모델 다운그레이드 없음

## Vision 호출 패턴

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  maxRetries: 5,
});

// 페이지 이미지를 base64로 읽어 Vision 호출
const imageBase64 = fs.readFileSync(imagePath).toString('base64');

const response = await client.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  system: SYSTEM_PROMPT, // actuarial-symbols.md + prompt-template.md 결합
  messages: [{
    role: 'user',
    content: [{
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: imageBase64 },
    }, {
      type: 'text',
      text: '이 페이지의 모든 내용을 파싱 블록 JSON 배열로 반환하세요.',
    }],
  }],
});
```

## 응답 파싱

```typescript
// JSON 코드 블록 추출
const text = response.content[0].type === 'text' ? response.content[0].text : '';
const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/\[[\s\S]*\]/);
const blocks = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : text);
```

## confidence 기준
- `high`: 기호 완전 식별, 문맥 명확
- `medium`: 기호 식별되나 일부 불확실
- `low`: 인쇄 불량, 손상, 비표준 기호 → 자동 재파싱 트리거

## 참조 파일
- `references/actuarial-symbols.md` — 보험수리 기호 LaTeX 사전
- `references/prompt-template.md` — 1차 파싱 시스템 프롬프트
- `references/reparse-prompt.md` — 크롭 재파싱 프롬프트
