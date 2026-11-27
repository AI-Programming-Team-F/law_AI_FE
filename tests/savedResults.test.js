import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { getBillHappen, getBillProfile, getBillSummary, getCachedProfile, getCachedSummary, getLastHappen, restoreSavedResult, subscribeResults } from "../src/api/bills.js";
import { MOCK_HAPPEN, MOCK_PROFILE } from "../src/api/mock.js";
import { SAVED_RESULTS_KEY, isSavedResult, loadSavedResults, withResult, withoutBill } from "../src/utils/savedResults.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const json = (body) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
const storage = (value) => ({ getItem: (key) => (key === SAVED_RESULTS_KEY ? value : null) });

// 형식 확인용 예시 (실제 법안 정보가 아님)
const happen = {
  selection: { targets: ["대상 1"], criteria: [{ name: "기준", selected: ["선택지 1"] }] },
  result: { ...MOCK_HAPPEN, bill_no: "7000001", status: "REVIEW" },
};
const profile = { ...MOCK_PROFILE, bill_no: "7000001" };

test("저장한 법안 결과 형식: 요약(null 포함)·조건 목록·맞춤 요약, 받지 않은 결과는 없어도 됨", () => {
  assert.equal(isSavedResult({ summary: "요약", profile, happen }, "7000001"), true);
  assert.equal(isSavedResult({ summary: null }, "7000001"), true);
  assert.equal(isSavedResult({}, "7000001"), true);
  assert.equal(isSavedResult({ summary: 3 }, "7000001"), false);
  assert.equal(isSavedResult({ profile }, "7000002"), false, "다른 법안의 조건 목록");
  assert.equal(isSavedResult({ happen: { selection: happen.selection } }, "7000001"), false);
});

test("불러오기: 저장한 법안의 형식 맞는 항목만, 손상되면 비움", () => {
  const value = JSON.stringify({ "7000001": { summary: "요약", happen }, "7000002": { summary: "취소된 법안" }, "7000003": { summary: 1 } });
  assert.deepEqual(Object.keys(loadSavedResults(["7000001", "7000003"], storage(value))), ["7000001"]);
  assert.deepEqual(loadSavedResults(["7000001"], storage("{깨진")), {});
  assert.deepEqual(loadSavedResults(["7000001"], storage("[1]")), {});
});

test("결과 더하기·바꾸기·지우기, 바뀐 것이 없으면 같은 객체", () => {
  const one = withResult({}, "7000001", "summary", "요약");
  assert.equal(withResult(one, "7000001", "summary", "요약"), one);
  const two = withResult(one, "7000001", "happen", happen);
  assert.deepEqual(two["7000001"], { summary: "요약", happen });
  assert.deepEqual(withoutBill(two, "7000001"), {});
  assert.equal(withoutBill(two, "7999999"), two);
});

test("새 AI 결과를 받으면 알리고, 저장해 둔 결과는 요청 없이 캐시에 채움", async () => {
  const seen = [];
  const unsubscribe = subscribeResults((type, billNo) => seen.push(`${type}:${billNo}`));
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(url, "http://localhost");
    if (parsed.pathname === "/api/summary") return json({ bill_no: "7100001", summary: "요약" });
    if (parsed.pathname === "/api/profile") return json({ ...MOCK_PROFILE, bill_no: "7100001" });
    return json({ ...MOCK_HAPPEN, bill_no: JSON.parse(options.body).bill_no });
  };
  await getBillSummary("7100001");
  await getBillProfile("7100001");
  await getBillHappen("7100001", { targets: [], criteria: [] });
  unsubscribe();
  await getBillHappen("7100001", { targets: [], criteria: [] });
  assert.deepEqual(seen, ["summary:7100001", "profile:7100001", "happen:7100001"]);

  globalThis.fetch = async () => { throw new Error("요청하면 안 됨"); };
  restoreSavedResult("7000001", { summary: null, profile, happen });
  assert.deepEqual(getCachedSummary("7000001"), { bill_no: "7000001", summary: null });
  assert.equal(getCachedProfile("7000001"), profile);
  assert.equal(getLastHappen("7000001"), happen);
  assert.equal((await getBillSummary("7000001")).summary, null);
  // 이미 받은 결과가 있으면 덮어쓰지 않음
  restoreSavedResult("7100001", { summary: "예전 요약" });
  assert.equal(getCachedSummary("7100001").summary, "요약");
});
