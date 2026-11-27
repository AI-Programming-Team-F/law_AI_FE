import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SAVED_COMPARES_KEY,
  isSavedCompare,
  loadSavedCompares,
  upsertCompare,
} from "../src/utils/savedCompares.js";

// 형식 확인용 예시 (실제 법안 정보가 아님)
const happen = {
  selection: { targets: ["대상 1"], criteria: [{ name: "기준", selected: ["선택지 1"] }] },
  result: {
    headline: "예시 결과", status: "REVIEW", stage: "심사 중",
    changes: [["항목", "지금", "적용되면"]],
    checks: [{ condition: "조건", status: "match", reason: "이유" }],
    evidence: ["근거 문장"],
  },
};
const entry = (overrides = {}) => ({
  a: "0000001",
  b: "0000002",
  bills: {
    a: { bill_no: "0000001", bill_name: "예시 법률안 A", status: "REVIEW" },
    b: { bill_no: "0000002", bill_name: "예시 법률안 B", status: "UNKNOWN" },
  },
  rows: [{ topic: "주제", a: "A 내용", b: "B 내용" }, { topic: null, a: "A", b: "B" }],
  summaries: { "0000001": "요약", "0000002": null },
  happens: { "0000001": happen },
  savedAt: "2026-11-27T03:00:00.000Z",
  ...overrides,
});
const storage = (value) => ({ getItem: (key) => (key === SAVED_COMPARES_KEY ? value : null) });

test("저장한 비교 형식: 비교 결과·요약(null 포함)·맞춤 요약을 함께 보관", () => {
  assert.equal(isSavedCompare(entry()), true);
  assert.equal(isSavedCompare(entry({ summaries: {}, happens: {} })), true, "요약·맞춤 요약을 받지 않았으면 비어 있어도 됨");
  assert.equal(isSavedCompare(entry({ happens: undefined })), true, "새로 저장하는 비교에는 맞춤 요약이 없음");
  assert.equal(isSavedCompare(entry({ b: "0000001" })), false, "같은 법안끼리는 비교가 아님");
  assert.equal(isSavedCompare(entry({ rows: [["주제", "A", "B"]] })), false, "화면용 rows 형식만 허용");
  assert.equal(isSavedCompare(entry({ summaries: { "9999999": "다른 법안" } })), false);
  assert.equal(isSavedCompare(entry({ happens: { "0000001": { selection: happen.selection } } })), false);
  assert.equal(isSavedCompare(entry({ savedAt: "날짜 아님" })), false);
});

test("저장한 비교 불러오기: 손상·예전 형식은 버리고 맞는 항목만 사용", () => {
  const good = entry();
  assert.deepEqual(loadSavedCompares(storage(JSON.stringify([good, { a: "1" }, null]))), [good]);
  assert.deepEqual(loadSavedCompares(storage("{깨진 JSON")), []);
  assert.deepEqual(loadSavedCompares(storage(null)), []);
  assert.deepEqual(loadSavedCompares({ getItem() { throw new Error("차단된 저장소"); } }), []);
});

test("같은 두 법안을 다시 저장하면 새 내용으로 바꾸고 맨 앞에 둠", () => {
  const first = entry();
  const other = entry({ a: "0000003", bills: { ...first.bills, a: { ...first.bills.a, bill_no: "0000003" } }, summaries: {}, happens: {} });
  const updated = entry({ savedAt: "2026-11-28T03:00:00.000Z" });
  const list = upsertCompare(upsertCompare([], first), other);
  assert.deepEqual(upsertCompare(list, updated).map((item) => [item.a, item.savedAt]), [
    ["0000001", "2026-11-28T03:00:00.000Z"],
    ["0000003", first.savedAt],
  ]);
});
