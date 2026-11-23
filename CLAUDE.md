# CLAUDE.md

**법안잇다**(유사 법률안을 찾고, 연결하다) — 유사 법률안 검색 · 비교 · 요약 서비스의 프론트엔드(React + Vite, JavaScript). 서버(BE)가 열린국회정보 22대 발의법률안을 가공·AI 분석해서 내려주고, 이 앱은 **결과를 보여주기만** 합니다. 기획·API 명세의 원본은 [README.md](README.md)입니다.

## 명령

```bash
npm run dev      # 개발 서버 (http://localhost:5173)
npm run lint     # ESLint — 작업 후 반드시 실행
npm run build    # 배포 빌드 — 작업 후 반드시 실행
```

코드 변경 후에는 `npm test`, `npm run lint`, `npm run build`가 모두 통과해야 합니다.

## 현재 코드 상태

- React 화면·기존 디자인을 유지하고 실제 Railway API에 연결했다. 현재 API의 기준은 README 8장과 배포 서버 `/docs`다. `docs/`의 PDF·Word는 11월 11일 당시 논의 기록이다.
- 서버 호출은 `src/api/client.js`, 필드 변환·요약/비교 캐시는 `src/api/bills.js`에 있다. 실행 화면에서 `mock.js`를 import하지 않는다. mock은 실제 응답 형태의 테스트 fixture다.
- 검색은 `/search?query=...`, 의안번호 조회는 `/search/billno?billno=...`, 요약은 `/summary?bill_no=...`, 비교는 GET `/compare?a_bill_no=...&b_bill_no=...`, 맞춤 요약은 `/profile?bill_no=...`와 POST `/happen`이다. `/preprocess`는 앱에서 호출하지 않는다.
- 맞춤 요약은 [src/components/PersonalSummary.jsx](src/components/PersonalSummary.jsx)다. 검색·저장 카드에서 AI 요약이 나온 뒤에만 `이 법안이 적용되면?` → 조건 선택 → `맞춤 요약 보기` 순서로 요청한다. 비교 화면에는 넣지 않는다.
- Vite 개발·preview 프록시는 `/api` 접두사를 제거해 Railway로 전달한다. 배포 시 별도 프록시 또는 `VITE_API_BASE_URL` + BE CORS가 필요하다(README 7장).
- 요약은 검색·저장·비교 화면 모두 버튼을 누른 법안만 요청한다. 비교 API는 개별 요약을 함께 주지 않는다.
- 비교 응답은 `differences: [[A, B], ...]`이고 선택 필드 `topics`(소제목)를 함께 받는다. 번호·소제목 아래에 A VS B로 표시하고, 소제목이 없으면 `비교 항목`으로 둔다. FE에서 소제목을 지어내지 않는다. 공통점·유사도·종합 비교 요약은 API 미제공으로 표시하지 않는다.
- 소관위 필터는 `src/filters/committees.js`의 사용자 지정 17개 목록을 쓴다. API의 `COMMITTEE`를 `committee`로 변환한다. 값이 null이면 별도 분류하며 제목·본문에서 추정하지 않는다. 정렬·처리 단계와 교차 적용하고 변경 시 1페이지로 돌아간다.
- 발의일·원문 링크·매칭 키워드는 현재 미제공이므로 지어내지 않는다. 원문 링크 미제공 안내와 `SUMMARY` 원문을 접어 표시한다. `SUMMARY`는 AI 요약이 아니다.
- App의 props로 검색어·법안 객체 비교 바구니·저장 목록을 공유한다. 저장 키는 `beopan-itda:saved-bills:v2`다. 예전 예시 저장 목록은 삭제하지 않고 별도 키로 보존한다.
- 공유 비교 링크는 검색 결과 없이도 요청하고 `/search/billno`로 법안 정보를 채운다. 조회에 실패하면 의안번호와 상태 미제공으로 표시한다.
- 검색 로딩·준비 중·빈 결과·실패, AI 요청 실패·재시도를 처리한다. 검색 변경 시 이전 요청을 취소한다.
- 스타일은 `src/App.css`, 색 변수는 `src/index.css`, 로고는 `src/components/Logo.jsx`다. 기존 반응형 레이아웃과 디자인을 유지한다.
- `npm test`는 Node 내장 러너로 API 계약·원문/AI 구분·처리 상태·캐시·오류·취소를 검증한다. 변경 후 `npm test`, `npm run lint`, `npm run build`를 실행한다.

- 검색어·비교 바구니·저장 목록은 [src/App.jsx](src/App.jsx)의 `useState`로 들고 props로 넘깁니다 (Context 아님).
  - 비교 바구니(`selectedBills`)는 의안번호가 아니라 **법안 객체**를 담습니다. 다시 검색해도 비우지 않습니다 (다른 키워드 법안끼리 비교 가능).
  - 저장 목록(`savedBills`)은 localStorage(`beopan-itda:saved-bills:v2`)에 보관합니다. 서버 API 없음.
  - 사이드바 로고나 홈 화면 가운데 `법안잇다` 제목을 누르면 `goHome()`이 검색어를 비우고 `SearchPage`를 `key`로 새로 그려 첫 화면으로 돌아갑니다.
- 하단 비교 바구니는 [src/components/CompareTray.jsx](src/components/CompareTray.jsx)로, App에서 `/compare`를 뺀 모든 화면에 띄웁니다.
- 저장한 법안 화면: [src/pages/SavedPage.jsx](src/pages/SavedPage.jsx) (`/saved`).
- `StatusBadge`는 [src/components/BillCard.jsx](src/components/BillCard.jsx) 안에서 named export 됩니다. 아이콘은 [src/components/Icon.jsx](src/components/Icon.jsx).
- 레이아웃: 왼쪽 사이드바(로고 + `유사법안 검색`·`저장한 법안` 메뉴) + 오른쪽 본문. 760px 이하에서는 사이드바가 상단 가로 바로 바뀝니다. 비교 화면은 검색 결과에서 들어가므로 메뉴에 따로 두지 않습니다.
- 검색 전에는 기능 소개 카드 3개, 검색 후에는 결과 목록이 보입니다.
- 스타일은 [src/App.css](src/App.css) 한 파일 (CSS 프레임워크 없음). 색 변수는 [src/index.css](src/index.css)에 있습니다.
- 디자인 톤: 밝은 테마. 흰 바탕(`--page`)에 가는 선(`--line`)으로 면을 나누고, 그림자는 하단 비교 바구니에만 씁니다. 색은 로고의 남색(`--navy` #1f3a8a) 하나를 중심으로 쓰고 파랑(`--blue`)은 포커스·링크에만 씁니다. 어두운 면은 비교 바구니(`--dock`)뿐입니다. 장식용 그라데이션·원·아이콘 배경 원은 쓰지 않습니다.
- 글꼴: 제목은 부리 글꼴 Hahmlet(`--font-display`), 본문·버튼은 Pretendard(`--font-body`). 둘 다 index.html에서 CDN으로 불러옵니다. 최소 13px, 본문 16px.
- 검색어와 맞은 단어(`<mark>`)는 글자 아래쪽 절반만 칠하는 노란 형광펜(`--highlight`)입니다.
- 760px 이하는 모바일, 1040px 이하는 기능 소개 세 칸과 비교 바구니가 세로로 쌓입니다.
- 로고([src/components/Logo.jsx](src/components/Logo.jsx))는 대각선으로 누운 사슬 고리 두 개가 서로 걸린 모양입니다(교차점은 mask로 틈을 냄). 색은 `--logo-a`(남색)·`--logo-b`(파랑).

구조를 README 권장안 쪽으로 옮기는 리팩터링은 요청받았을 때만 합니다.

## 반드시 지킬 규칙

### 데이터 / API
- 서버 호출은 `src/api/`에서만. 컴포넌트에서 `fetch` 직접 호출 금지.
- 검색 결과는 기본적으로 서버가 준 **score 순서 그대로** 표시. 프론트가 임의로 재정렬·필터링하지 않습니다. 예외: 사용자가 정렬 메뉴에서 `처리 단계순`을 고르면 상태별로 묶되, 같은 상태 안에서는 score 순서를 유지합니다(`src/api/bills.js`의 `STATUS_ORDER`, 안정 정렬). 이때 나오는 단계 박스에서 사용자가 고른 상태만 걸러 보여줄 수 있습니다(복수 선택, 아무것도 안 고르면 전체). 상태 표기는 `STATUS_LABELS` 한 곳에서 씁니다.
- 검색어는 가공하지 않고 그대로 서버에 보냅니다 (유의어 확장 등은 서버 몫).
- 사용자가 선택한 소관위 필터는 관련도순·처리 단계순 모두에서 적용합니다. 서버 응답 순서를 유지하고, 실제 응답에 있는 다른 소관위 이름은 보존합니다. 소관위·처리 단계 건수는 이번에 받은 전체 결과 기준입니다.
- AI 요약·비교·유사도를 프론트에서 만들지 않습니다.
- API 필드를 바꾸거나 추가하면 **README 8장을 먼저 수정**하고, `mock.js`도 같은 형태로 맞춥니다.
- 비교 화면 주소는 `/compare?a=<의안번호>&b=<의안번호>` — 링크만으로 같은 결과가 나와야 합니다.

### 처리 상태 (`status`)
| 값 | 표기 |
|---|---|
| `PASSED` | 본회의 통과 |
| `MERGED` | 대안에 반영(폐기) |
| `REVIEW` | 심사 중 |
| `OTHER` | 기타 |

`MERGED`는 통과가 아닙니다. **`PASSED`와 같은 색·같은 문구로 절대 표시하지 않습니다.**

### 빈 값 처리
- `summary: null` → "요약을 준비하지 못했어요. 원문 링크를 확인하세요"
- 요약 요청 실패 → "요약을 불러오지 못했어요" + `다시 시도` 버튼
- `ai_summary: null` → AI 비교 요약 영역 숨김, 문장 비교만 표시
- `results: []` → "검색 결과가 없어요. 다른 키워드로 검색해 보세요"

### 필수 고지 문구 (지우거나 바꾸지 말 것)
- 모든 AI 요약/비교 영역: "AI가 생성한 요약이며 원문과 다를 수 있습니다."
- 비교 화면과 푸터: "법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요."
- 원문 링크가 제공되는 법률안에는 새 탭 링크. 현재 API 미제공 시 링크 미제공 안내를 표시하고 URL을 지어내지 않는다.

### UI 공통
- 폭 360px 모바일에서 깨지지 않게.
- 버튼·입력창은 키보드로 조작 가능해야 함 (`<button>`, `<label>`, `aria-*` 유지).
- mock 데이터는 예시입니다. 실제 법안 정보처럼 보이는 내용을 새로 지어내지 않습니다.

### 보안
- `.env`는 커밋 금지. `VITE_` 변수는 브라우저에 노출되므로 **API 키·인증키를 프론트에 두지 않습니다.**
- `node_modules/`, `.csv` 등 수집 데이터 파일 커밋 금지.

## Git

- `main`에 직접 커밋·푸시하지 않습니다. `feature/기능이름`, `fix/버그이름` 브랜치 → PR → 팀원 확인 → Merge.
- 커밋 메시지 접두어: `feat:` `fix:` `docs:` `chore:` `style:` (메시지는 한국어).
- PR 전에 `npm run lint`, `npm run build` 통과 확인.
- 커밋·푸시·PR은 사용자가 요청할 때만 합니다.

## 작업 후

- 기능을 끝내면 README 11장 체크리스트를 갱신합니다.
- 브라우저에서 직접 확인하지 못한 부분(클릭 동작, 360px 화면 등)은 확인 못 했다고 분명히 알립니다.
