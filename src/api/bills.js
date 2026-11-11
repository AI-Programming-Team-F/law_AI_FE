import { MOCK_SUMMARIES } from "./mock";

// 법안 AI 요약 요청 (README 8-2)
// AI 토큰을 아끼기 위해 'AI 요약 확인하기'를 누른 법안만 요청하고,
// 한 번 받은 요약은 저장해 두고 다시 요청하지 않습니다(새로고침 전까지).
const summaries = new Map(); // 의안번호 → 받은 응답 { bill_no, summary }
const pending = new Map(); // 의안번호 → 진행 중인 요청 (같은 법안을 동시에 두 번 요청하지 않게)

// 이미 받아 둔 요약. 없으면 undefined
export function getCachedSummary(billNo) {
  return summaries.get(billNo);
}

export function getBillSummary(billNo) {
  if (summaries.has(billNo)) return Promise.resolve(summaries.get(billNo));
  if (!pending.has(billNo)) {
    const request = requestSummary(billNo)
      .then((result) => {
        summaries.set(billNo, result);
        return result;
      })
      .finally(() => pending.delete(billNo)); // 실패하면 다시 시도할 수 있게 비움
    pending.set(billNo, request);
  }
  return pending.get(billNo);
}

// 서버 연결 시 이 함수만 GET /api/bills/{bill_no}/summary 호출로 바꿉니다.
function requestSummary(billNo) {
  return new Promise((resolve) => {
    setTimeout(
      () => resolve({ bill_no: billNo, summary: MOCK_SUMMARIES[billNo] ?? null }),
      800,
    );
  });
}
