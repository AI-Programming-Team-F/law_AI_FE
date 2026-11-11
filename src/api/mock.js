// 검색 결과 목 데이터
export const MOCK_SEARCH_RESULTS = {
  query: "월세 지원금",
  total: 3,
  results: [
    {
      bill_no: "2200001",
      bill_name: "주택임대차보호법 일부개정법률안",
      committee: "국토교통위원회",
      propose_date: "2026-10-20",
      status: "REVIEW", // 심사 중
      link: "https://likms.assembly.go.kr/bill/main.do",
      score: 0.95,
      matched_keywords: ["월세", "임차인"]
    },
    {
      bill_no: "2200002",
      bill_name: "조세특례제한법 일부개정법률안",
      committee: "기획재정위원회",
      propose_date: "2026-09-15",
      status: "MERGED", // 대안 반영 폐기
      link: "https://likms.assembly.go.kr/bill/main.do",
      score: 0.81,
      matched_keywords: ["월세", "세액공제"]
    },
    {
      bill_no: "2200003",
      bill_name: "청년주거지원 특별법안",
      committee: "국토교통위원회",
      propose_date: "2026-08-01",
      status: "PASSED", // 본회의 통과
      link: "https://likms.assembly.go.kr/bill/main.do",
      score: 0.74,
      matched_keywords: ["청년", "지원금"]
    }
  ]
};

// 법안별 AI 요약 목 데이터 (GET /api/bills/{bill_no}/summary, README 8-2)
// 검색 결과에는 요약이 없고, 'AI 요약 확인하기'를 눌렀을 때만 이 값을 가져옵니다.
export const MOCK_SUMMARIES = {
  "2200001": "청년 및 무주택 임차인의 주거비 부담 경감을 위한 월세 세액공제율 상향 법안입니다.",
  "2200002": null, // 요약이 없는 예외 케이스 테스트용 (README 8-5 참고)
  "2200003": "청년 취약계층 대상 주거 바우처 지급 및 보증금 지원 근거를 마련하는 법안입니다."
};

// 비교 화면 목 데이터 (/compare)
export const MOCK_COMPARE_RESULT = {
  a: {
    bill_no: "2200001",
    bill_name: "주택임대차보호법 일부개정법률안",
    committee: "국토교통위원회",
    status: "REVIEW",
    link: "https://likms.assembly.go.kr/bill/main.do",
    summary: "청년 및 무주택 임차인의 주거비 부담 경감을 위한 월세 세액공제율 상향 법안입니다."
  },
  b: {
    bill_no: "2200003",
    bill_name: "청년주거지원 특별법안",
    committee: "국토교통위원회",
    status: "PASSED",
    link: "https://likms.assembly.go.kr/bill/main.do",
    summary: "청년 취약계층 대상 주거 바우처 지급 및 보증금 지원 근거를 마련하는 법안입니다."
  },
  similarity: 0.78,
  common: [
    "청년 계층의 주거 비용 완화를 목적으로 함",
    "소득 기준에 따른 단계별 지원 방식을 채택함"
  ],
  only_a: ["기존 세법상 세액공제 한도를 상향하는 방식"],
  only_b: ["현금성 주거 바우처를 직접 교부하는 방식"],
  ai_summary: "두 법률안 모두 청년 주거 안정을 목표로 하지만, 법안 A는 연말정산 세제 혜택 중심이고 법안 B는 직접 지원금 지급에 초점을 맞추고 있습니다."
};