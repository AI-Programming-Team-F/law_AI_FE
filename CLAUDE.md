# CLAUDE.md

**법안잇다**(유사 법률안을 찾고, 연결하다) — 유사 법률안 검색 · 비교 · 요약 서비스의 프론트엔드(React + Vite, JavaScript). 서버(BE)가 열린국회정보 22대 발의법률안을 가공·AI 분석해서 내려주고, 이 앱은 **결과를 보여주기만** 합니다. 기획·API 명세의 원본은 [README.md](README.md)입니다.

## 명령

```bash
npm run dev      # 개발 서버 (http://localhost:5173)
npm run lint     # ESLint — 작업 후 반드시 실행
npm run build    # 배포 빌드 — 작업 후 반드시 실행
```

테스트 러너는 아직 없습니다. 코드 변경 후에는 `npm run lint`와 `npm run build`가 모두 통과해야 합니다.

## 현재 코드 상태 (README 권장 구조와 다른 점)

- 서버 미연결. 모든 데이터는 [src/api/mock.js](src/api/mock.js)에서 옵니다 (`MOCK_SEARCH_RESULTS`, `MOCK_COMPARE_RESULT`).
- `client.js`, `bills.js`는 아직 없습니다. 서버 연결 시 README 9장 구조대로 `src/api/`에 추가합니다.
- 검색어·비교 바구니·저장 목록은 [src/App.jsx](src/App.jsx)의 `useState`로 들고 props로 넘깁니다 (Context 아님).
  - 비교 바구니(`selectedBills`)는 의안번호가 아니라 **법안 객체**를 담습니다. 다시 검색해도 비우지 않습니다 (다른 키워드 법안끼리 비교 가능).
  - 저장 목록(`savedBills`)은 localStorage(`beopan-itda:saved-bills`)에 보관합니다. 서버 API 없음.
  - 로고 클릭 시 `goHome()`이 검색어를 비우고 `SearchPage`를 `key`로 새로 그려 첫 화면으로 돌아갑니다.
- 하단 비교 바구니는 [src/components/CompareTray.jsx](src/components/CompareTray.jsx)로, App에서 `/compare`를 뺀 모든 화면에 띄웁니다.
- 저장한 법안 화면: [src/pages/SavedPage.jsx](src/pages/SavedPage.jsx) (`/saved`).
- `StatusBadge`는 [src/components/BillCard.jsx](src/components/BillCard.jsx) 안에서 named export 됩니다. 아이콘은 [src/components/Icon.jsx](src/components/Icon.jsx).
- 레이아웃: 왼쪽 사이드바(로고 + `유사법안 검색`·`저장한 법안` 메뉴) + 오른쪽 본문. 760px 이하에서는 사이드바가 상단 가로 바로 바뀝니다. 비교 화면은 검색 결과에서 들어가므로 메뉴에 따로 두지 않습니다.
- 로고는 [src/components/Logo.jsx](src/components/Logo.jsx) (남색·파랑 사슬 고리 두 개가 엮인 모양, SVG). 검색 전에는 기능 소개 카드 3개, 검색 후에는 결과 목록이 보입니다.
- 스타일은 [src/App.css](src/App.css) 한 파일 (CSS 프레임워크 없음). 색 변수(`--primary`, `--navy`, `--ink`)는 [src/index.css](src/index.css).
- Vite 프록시 `/api → http://localhost:8000`은 [vite.config.js](vite.config.js)에 이미 설정되어 있습니다.

구조를 README 권장안 쪽으로 옮기는 리팩터링은 요청받았을 때만 합니다.

## 반드시 지킬 규칙

### 데이터 / API
- 서버 호출은 `src/api/`에서만. 컴포넌트에서 `fetch` 직접 호출 금지.
- 검색 결과는 서버가 준 **score 순서 그대로** 표시. 프론트에서 재정렬·필터링하지 않습니다.
- 검색어는 가공하지 않고 그대로 서버에 보냅니다 (유의어 확장 등은 서버 몫).
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
- `ai_summary: null` → AI 비교 요약 영역 숨김, 문장 비교만 표시
- `results: []` → "검색 결과가 없어요. 다른 키워드로 검색해 보세요"

### 필수 고지 문구 (지우거나 바꾸지 말 것)
- 모든 AI 요약/비교 영역: "AI가 생성한 요약이며 원문과 다를 수 있습니다."
- 비교 화면과 푸터: "법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요."
- 모든 법률안 카드에 원문 링크(새 탭).

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
