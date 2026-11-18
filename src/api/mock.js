// 배포 API와 같은 모양의 테스트용 응답입니다. 실행 화면에서는 import하지 않습니다.
export const MOCK_SEARCH_RESULTS = {
  preprocess: true,
  data: [
    { BILL_NO: "0000001", BILL_NAME: "예시 법률안 A", PROC_RESULT: null, SUMMARY: "제안이유 및 주요내용 예시 A", SCORE: 3 },
    { BILL_NO: "0000002", BILL_NAME: "예시 법률안 B", PROC_RESULT: "대안반영폐기", SUMMARY: "제안이유 및 주요내용 예시 B", SCORE: 1 },
  ],
};
export const MOCK_SUMMARIES = {
  "0000001": { bill_no: "0000001", summary: "AI 요약 응답 예시 A" },
  "0000002": { bill_no: "0000002", summary: null },
};
export const MOCK_COMPARE_RESULT = {
  a_bill_no: "0000001",
  b_bill_no: "0000002",
  differences: [["같은 주제에 관한 A의 내용 예시", "같은 주제에 관한 B의 내용 예시"]],
};
