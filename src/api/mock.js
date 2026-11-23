// 배포 API와 같은 모양의 테스트용 응답입니다. 실행 화면에서는 import하지 않습니다.
export const MOCK_SEARCH_RESULTS = {
  preprocess: true,
  data: [
    { BILL_NO: "0000001", BILL_NAME: "예시 법률안 A", COMMITTEE: "국토교통위원회", PROC_RESULT: null, SUMMARY: "제안이유 및 주요내용 예시 A", SCORE: 0.82 },
    { BILL_NO: "0000002", BILL_NAME: "예시 법률안 B", COMMITTEE: "교육위원회", PROC_RESULT: "대안반영폐기", SUMMARY: "제안이유 및 주요내용 예시 B", SCORE: 0.35 },
  ],
};
export const MOCK_SUMMARIES = {
  "0000001": { bill_no: "0000001", summary: "AI 요약 응답 예시 A" },
  "0000002": { bill_no: "0000002", summary: null },
};
export const MOCK_PROFILE = {
  bill_no: "0000001",
  targets: ["예시 대상 A", "예시 대상 B"],
  criteria: [
    { name: "예시 기준 하나 선택", multiple: false, options: ["선택지 1", "선택지 2"] },
    { name: "예시 기준 여러 개 선택", multiple: true, options: ["선택지 3", "선택지 4"] },
  ],
};
export const MOCK_HAPPEN = {
  bill_no: "0000001",
  applicability: "medium",
  headline: "이 조건에 맞는 분들은 예시 변화가 생길 수 있어요.",
  changes: [["바뀌는 것 예시", "지금 예시", "적용되면 예시"]],
  checks: [
    { condition: "예시 대상 A", status: "match", reason: "맞는 이유 예시" },
    { condition: "예시 조건", status: "unknown", reason: "직접 확인이 필요한 이유 예시" },
  ],
  evidence: ["제안이유 및 주요내용 예시 A"],
  stage: "심사 중",
};
export const MOCK_COMPARE_RESULT = {
  a_bill_no: "0000001",
  b_bill_no: "0000002",
  topics: ["비교 주제 예시"],
  differences: [["같은 주제에 관한 ==A의 핵심== 내용 예시", "같은 주제에 관한 **B의 강조** 내용 예시"]],
};
