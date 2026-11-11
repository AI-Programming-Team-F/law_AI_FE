---
name: pr-check
description: PR 올리기 전 점검. lint·build를 돌리고, 변경된 코드가 README의 UI 규칙(상태 뱃지, 고지 문구, 빈 값 처리, score 순서)과 API 규칙을 지키는지 확인한다. "PR 전에 확인", "PR 체크", "올려도 돼?" 같은 요청에 사용.
---

# PR 전 점검

## 1. 자동 검사

```bash
npm run lint
npm run build
```

둘 중 하나라도 실패하면 원인을 정리해서 보고하고, 사용자가 원하면 고친다.

## 2. 변경 범위 확인

```bash
git status
git diff main...HEAD
git diff
```

현재 브랜치가 `main`이면 새 브랜치(`feature/...` 또는 `fix/...`)를 만들어야 한다고 알린다.

## 3. 규칙 점검 (변경된 파일에 해당하는 것만)

- [ ] 컴포넌트에서 `fetch`를 직접 호출하지 않음 (`src/api/`에서만)
- [ ] 검색 결과를 프론트에서 재정렬·필터링하지 않음 (서버 score 순서 유지)
- [ ] `MERGED`가 `PASSED`와 같은 색·문구로 표시되지 않음
- [ ] `summary: null`, `ai_summary: null`, `results: []` 처리 문구가 README 8-5와 일치
- [ ] 고지 문구 유지: "AI가 생성한 요약이며 원문과 다를 수 있습니다." / "법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요."
- [ ] 모든 법률안 카드에 원문 링크(새 탭, `rel="noopener noreferrer"`)
- [ ] 버튼·입력이 키보드로 조작 가능 (div onClick 대신 button 등)
- [ ] 360px 폭에서 깨질 만한 고정 너비·가로 스크롤 없음
- [ ] API 필드가 바뀌었다면 README 8장과 `src/api/mock.js`도 같이 수정됨
- [ ] `.env`, API 키, `.csv` 데이터 파일이 커밋에 포함되지 않음
- [ ] 커밋 메시지가 `feat:` `fix:` `docs:` `chore:` `style:` 중 하나로 시작

## 4. 보고

통과/실패 항목을 짧게 정리한다. 브라우저에서 직접 확인하지 못한 부분은 "직접 확인 필요"로 따로 적는다. README 11장 체크리스트에 갱신할 항목이 있으면 함께 제안한다.
