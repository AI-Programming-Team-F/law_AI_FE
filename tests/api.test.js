import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, request } from "../src/api/client.js";
import { searchBills, normalizeStatus, getBillSummary, compareBills } from "../src/api/bills.js";
import { MOCK_SEARCH_RESULTS, MOCK_COMPARE_RESULT } from "../src/api/mock.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("검색 계약: query 원문, 대문자 필드 변환, 서버 순서, 원문/AI 구분", async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url, "http://localhost");
    assert.equal(parsed.pathname, "/api/search");
    assert.equal(parsed.searchParams.get("query"), " 소방 & 안전 ");
    assert.equal(parsed.searchParams.get("limit"), "20");
    return json(MOCK_SEARCH_RESULTS);
  };
  const result = await searchBills(" 소방 & 안전 ");
  assert.equal(result.ready, true);
  assert.deepEqual(result.results.map((bill) => bill.bill_no), ["0000001", "0000002"]);
  assert.equal(result.results[1].status, "MERGED");
  assert.equal(result.results[0].proposal_text, MOCK_SEARCH_RESULTS.data[0].SUMMARY);
  assert.equal(result.results[0].summary, undefined);
  assert.equal(result.results[0].link, null);
});

test("준비 전, 검색 결과 없음, 잘못된 응답을 구분", async () => {
  globalThis.fetch = async () => json({ preprocess: false, data: [] });
  assert.deepEqual(await searchBills("소방"), { ready: false, results: [] });
  globalThis.fetch = async () => json({ preprocess: true, data: [] });
  assert.deepEqual(await searchBills("소방"), { ready: true, results: [] });
  globalThis.fetch = async () => json({ results: [] });
  await assert.rejects(searchBills("소방"), { code: "INVALID_RESPONSE" });
});

test("대안반영폐기는 통과와 구분하고 모르는 결과는 기타", () => {
  assert.equal(normalizeStatus("대안 반영 폐기"), "MERGED");
  assert.equal(normalizeStatus("수정가결"), "PASSED");
  assert.equal(normalizeStatus(null), "REVIEW");
  assert.equal(normalizeStatus("철회"), "OTHER");
});

test("요약 동시 요청과 성공 캐시는 공유하되 실패 후 재시도 가능", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    assert.equal(new URL(url, "http://localhost").pathname, "/api/summary");
    return json({ bill_no: "9000001", summary: "요약" });
  };
  const first = getBillSummary("9000001");
  assert.equal(first, getBillSummary("9000001"));
  await first;
  await getBillSummary("9000001");
  assert.equal(calls, 1);
  globalThis.fetch = async () => json({ detail: "AI 실패" }, 502);
  await assert.rejects(getBillSummary("9000002"), { status: 502 });
  globalThis.fetch = async () => json({ bill_no: "9000002", summary: null });
  assert.equal((await getBillSummary("9000002")).summary, null);
});

test("비교 계약: GET 파라미터와 주제별 쌍, 역순 독립, 잘못된 번호 차단", async () => {
  const calls = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(options.method, undefined);
    const params = new URL(url, "http://localhost").searchParams;
    const a = params.get("a_bill_no"), b = params.get("b_bill_no");
    calls.push([a, b]);
    return json({ ...MOCK_COMPARE_RESULT, a_bill_no: a, b_bill_no: b });
  };
  const result = await compareBills("0000001", "0000002");
  assert.deepEqual(result.differences, MOCK_COMPARE_RESULT.differences);
  await compareBills("0000001", "0000002");
  await compareBills("0000002", "0000001");
  assert.deepEqual(calls, [["0000001", "0000002"], ["0000002", "0000001"]]);
  await assert.rejects(compareBills("0000001", "0000001"));
  await assert.rejects(compareBills("oops", "0000001"));
  assert.equal(calls.length, 2);
});

test("비교 응답이 요청과 다른 A/B 또는 잘못된 쌍이면 거부", async () => {
  globalThis.fetch = async () => json({ a_bill_no: "9000003", b_bill_no: "9000004", differences: [["A only"]] });
  await assert.rejects(compareBills("9000003", "9000004"), { code: "INVALID_RESPONSE" });
  globalThis.fetch = async () => json({ a_bill_no: "9000004", b_bill_no: "9000003", differences: [] });
  await assert.rejects(compareBills("9000003", "9000004"), { code: "INVALID_RESPONSE" });
});

test("FastAPI detail, 검증 목록, NOT_READY, 비 JSON HTTP 오류", async () => {
  for (const [body, status, expected] of [
    [{ detail: "원문 없음" }, 404, "원문 없음"],
    [{ detail: [{ msg: "의안번호 필요" }] }, 422, "의안번호 필요"],
    [{ error: { code: "NOT_READY", message: "준비 중" } }, 503, "준비 중"],
  ]) {
    globalThis.fetch = async () => json(body, status);
    await assert.rejects(request("/search"), (error) => error instanceof ApiError && error.status === status && error.message === expected);
  }
  globalThis.fetch = async () => new Response("<html>Bad gateway</html>", { status: 502 });
  await assert.rejects(request("/summary"), { status: 502 });
  globalThis.fetch = async () => new Response("not JSON");
  await assert.rejects(request("/search"), { code: "INVALID_RESPONSE" });
});

test("네트워크 실패, 시간 초과, 사용자 취소를 구분", async () => {
  globalThis.fetch = async () => { throw new TypeError("Failed to fetch"); };
  await assert.rejects(request("/search"), /서버에 연결하지 못했어요/);
  globalThis.fetch = (_url, { signal }) => new Promise((_resolve, reject) => {
    if (signal.aborted) reject(new DOMException("Aborted", "AbortError"));
    else signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  });
  await assert.rejects(request("/search", {}, { timeoutMs: 5 }), { code: "TIMEOUT" });
  const controller = new AbortController();
  const promise = request("/search", {}, { signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, { name: "AbortError" });
});

test("AI 제공자 인증 오류는 친절한 문구로 표시하고 진단 정보는 오류 객체에 보존", async () => {
  globalThis.fetch = async () => json({ detail: 'AI 요청 실패: authentication_error - Invalid API key' }, 502);
  await assert.rejects(request("/summary"), (error) => {
    assert.equal(error.status, 502);
    assert.ok(error.details.includes("Invalid API key"));
    assert.ok(!error.message.includes("Invalid API key"));
    assert.ok(error.message.includes("잠시 후 다시 시도"));
    return true;
  });
});
