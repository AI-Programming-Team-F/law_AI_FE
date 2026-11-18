// 사용자 지정 소관위원회 순서. 응답에 다른 이름이 있으면 그대로 보존합니다.
export const COMMITTEES = [
  "국회운영위원회",
  "법제사법위원회",
  "정무위원회",
  "재정경제기획위원회",
  "교육위원회",
  "과학기술정보방송통신위원회",
  "외교통일위원회",
  "국방위원회",
  "행정안전위원회",
  "문화체육관광위원회",
  "농림축산식품해양수산위원회",
  "산업통상자원중소벤처기업위원회",
  "보건복지위원회",
  "기후에너지환경노동위원회",
  "국토교통위원회",
  "정보위원회",
  "성평등가족위원회",
];

export const UNKNOWN_COMMITTEE = "__unknown_committee__";

function committeeOf(bill) {
  return typeof bill.committee === "string" ? bill.committee.trim() : "";
}

// 원래 검색 순서를 유지하므로 관련도·처리 단계 정렬 결과에 이어 적용할 수 있습니다.
export function filterByCommittee(results, committee) {
  if (!committee) return results;
  return results.filter((bill) =>
    committee === UNKNOWN_COMMITTEE ? !committeeOf(bill) : committeeOf(bill) === committee,
  );
}

export function getCommitteeOptions(results) {
  const counts = new Map(COMMITTEES.map((name) => [name, 0]));
  let unknown = 0;
  for (const bill of results) {
    const name = committeeOf(bill);
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
    else unknown++;
  }
  return [
    ...Array.from(counts, ([name, count]) => ({ value: name, label: name, count })),
    { value: UNKNOWN_COMMITTEE, label: "소관위원회 정보 없음", count: unknown },
  ];
}
