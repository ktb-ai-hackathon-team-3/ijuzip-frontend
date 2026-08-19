# IJU.zip Frontend

국내 체류 이주민에게 맞는 복지 제도를 안내하고 신청서 작성과 PDF 다운로드까지 연결하는 React + TypeScript 프론트엔드입니다.

## 실행

```bash
npm install
npm run dev
```

기본 실행은 Spring Boot 실서버 모드입니다.

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK_API=false
```

Spring 없이 화면만 개발할 때는 로컬 `.env`에서 `VITE_USE_MOCK_API=true`로 변경합니다. `.env`는 커밋하지 않고 `.env.example`만 공유합니다.

## 서비스 경계

```text
Browser → Spring Boot → Redis
                      → FastAPI → LLM/RAG
                      → PDFBox → PDF bytes
```

- 프론트는 FastAPI를 직접 호출하지 않습니다.
- `POST /sessions`를 제외한 요청은 `Authorization: Bearer <token>`을 사용합니다.
- 토큰과 세션 ID는 `sessionStorage`에 저장합니다.
- 이름·등록번호·주소·전화번호·계좌정보는 FastAPI로 보내지 않습니다.
- API 응답은 `src/schemas/api.ts`의 Zod 스키마로 실행 중에도 검증합니다.

## Spring API

Base URL은 `${VITE_API_BASE_URL}/v1`입니다.

| Method | Path | Response |
|---|---|---|
| POST | `/sessions` | JSON |
| GET | `/sessions/{sid}` | JSON |
| GET | `/sessions/{sid}/candidates` | JSON |
| POST | `/sessions/{sid}/messages` | SSE |
| GET | `/programs/{pid}?lang={lang}` | JSON |
| POST | `/sessions/{sid}/programs/{pid}/verdict` | JSON |
| POST | `/sessions/{sid}/applications` | JSON |
| GET | `/applications/{appId}` | JSON |
| PATCH | `/applications/{appId}/fields` | JSON |
| POST | `/applications/{appId}/pdf` | `application/pdf` |

`POST /sessions` 요청에는 `language`, `track`, `profile`만 보냅니다. 이름을 포함한 보호정보는 신청서 단계의 `PATCH /applications/{appId}/fields`에서 처음 입력합니다.

## SSE 계약

채팅은 POST와 Authorization 헤더가 필요하므로 브라우저 기본 `EventSource` 대신 `@microsoft/fetch-event-source`를 사용합니다.

```text
token* → answer → sidebar? → done
```

- `answer`와 `done`은 항상 필요합니다.
- `sidebar`는 `FILTER` 또는 `BOTH`일 때만 전송합니다.
- `done` 없이 연결이 닫히거나 이벤트 JSON이 계약과 다르면 오류로 처리합니다.
- Spring 응답에는 `Content-Type: text/event-stream`, `X-Accel-Buffering: no`를 설정합니다.

## Spring CORS

개발 환경에서 `http://localhost:5173`을 허용합니다.

- Methods: `GET`, `POST`, `PATCH`, `OPTIONS`
- Request headers: `Authorization`, `Content-Type`, `Accept`
- Exposed headers: `Content-Disposition`, `X-Unconfirmed-Fields`, `X-Unrenderable-Fields`

## 검증

```bash
npm run typecheck
npm test
npm run build
npm run lint
```

목업 테스트는 목업 함수를 직접 검증합니다. 실서버 연동은 Spring을 실행한 상태에서 온보딩 → 상담 → 상세 → 신청서 → PDF 순서로 확인합니다.
