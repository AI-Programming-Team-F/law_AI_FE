import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { ApiError, request } from "../src/api/client.js";
import { searchBills, normalizeStatus, getBillSummary, compareBills, getBillByNo, getBillProfile, getBillHappen, getLastHappen, getBillInfo, getCachedBillInfo } from "../src/api/bills.js";
import { MOCK_SEARCH_RESULTS, MOCK_COMPARE_RESULT, MOCK_PROFILE, MOCK_HAPPEN, MOCK_INFO } from "../src/api/mock.js";
import { parseEmphasis } from "../src/utils/emphasis.js";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("검색 계약: query 원문, 대문자 필드 변환, 서버 순서, 원문/AI 구분", async () => {
  globalThis.fetch = async (url) => {
    const parsed = new URL(url, "http://localhost");
    assert.equal(parsed.pathname, "/api/search");
    assert.equal(parsed.searchParams.get("query"), " 소방 & 안전 ");
    assert.equal(parsed.searchParams.get("limit"), "100");
    return json(MOCK_SEARCH_RESULTS);
  };
  const result = await searchBills(" 소방 & 안전 ");
  assert.equal(result.ready, true);
  assert.deepEqual(result.results.map((bill) => bill.bill_no), ["0000001", "0000002"]);
  assert.equal(result.results[1].status, "MERGED");
  assert.equal(result.results[0].proposal_text, MOCK_SEARCH_RESULTS.data[0].SUMMARY);
  assert.equal(result.results[0].summary, undefined);
  assert.equal(result.results[0].link, null);
  assert.equal(result.results[0].committee, "국토교통위원회");
  assert.equal(result.results[1].committee, "교육위원회");
});

test("선택 소관위 필드: 누락·null·공백 호환, 이름 보존, 잘못된 타입 거부", async () => {
  const raw = MOCK_SEARCH_RESULTS.data[0];
  const withoutCommittee = { ...raw };
  delete withoutCommittee.COMMITTEE;
  for (const [item, expected] of [
    [withoutCommittee, null],
    [{ ...raw, COMMITTEE: null }, null],
    [{ ...raw, COMMITTEE: "  " }, null],
    [{ ...raw, COMMITTEE: " 교육위원회 " }, "교육위원회"],
    [{ ...raw, COMMITTEE: "기획재정위원회" }, "기획재정위원회"],
  ]) {
    globalThis.fetch = async () => json({ preprocess: true, data: [item] });
    assert.equal((await searchBills("소관위")).results[0].committee, expected);
  }
  globalThis.fetch = async () => json({ preprocess: true, data: [{ ...raw, COMMITTEE: 17 }] });
  await assert.rejects(searchBills("소관위"), { code: "INVALID_RESPONSE" });
});

test("관련도 SCORE: 0~1 소수(11/18 BE 변경)는 받고, 범위 밖·숫자 아님은 거부", async () => {
  const raw = MOCK_SEARCH_RESULTS.data[0];
  for (const score of [0, 0.4916, 1]) {
    globalThis.fetch = async () => json({ preprocess: true, data: [{ ...raw, SCORE: score }] });
    assert.equal((await searchBills("점수")).results[0].score, score);
  }
  for (const score of [1.2, -0.1, "0.5", null]) {
    globalThis.fetch = async () => json({ preprocess: true, data: [{ ...raw, SCORE: score }] });
    await assert.rejects(searchBills("점수"), { code: "INVALID_RESPONSE" });
  }
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

test("원문이 아직 없는 법안(SUMMARY null)도 검색 결과에 유지", async () => {
  globalThis.fetch = async () => json({ preprocess: true, data: [{ ...MOCK_SEARCH_RESULTS.data[0], SUMMARY: null }] });
  assert.equal((await searchBills("원문없음")).results[0].proposal_text, "");
});

test("의안번호 검색: 7자리는 조회 API, 없는 번호는 같은 검색어로 일반 검색", async () => {
  const info = { ...MOCK_SEARCH_RESULTS.data[0] };
  delete info.SCORE;
  const paths = [];
  globalThis.fetch = async (url) => {
    const parsed = new URL(url, "http://localhost");
    paths.push(parsed.pathname);
    assert.equal(parsed.searchParams.get("billno"), "7000001");
    return json({ preprocess: false, data: { ...info, BILL_NO: "7000001" } });
  };
  const found = await searchBills(" 7000001 ");
  assert.deepEqual(paths, ["/api/search/billno"]);
  assert.equal(found.ready, true);
  assert.equal(found.results[0].bill_no, "7000001");
  assert.equal(found.results[0].score, null);

  const fallback = [];
  globalThis.fetch = async (url) => {
    const parsed = new URL(url, "http://localhost");
    fallback.push(parsed.pathname);
    if (parsed.pathname.endsWith("/billno")) return json({ detail: "없음" }, 404);
    assert.equal(parsed.searchParams.get("query"), "7000002");
    return json({ preprocess: true, data: [] });
  };
  assert.deepEqual(await searchBills("7000002"), { ready: true, results: [] });
  assert.deepEqual(fallback, ["/api/search/billno", "/api/search"]);

  globalThis.fetch = async () => json({ detail: "서버 오류" }, 500);
  await assert.rejects(searchBills("7000003"), { status: 500 });
  await assert.rejects(getBillByNo("7000004"), { status: 500 });
});

test("맞춤 조건: /profile 캐시, 잘못된 응답 거부 후 재시도", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    const parsed = new URL(url, "http://localhost");
    assert.equal(parsed.pathname, "/api/profile");
    return json({ ...MOCK_PROFILE, bill_no: parsed.searchParams.get("bill_no") });
  };
  await getBillProfile("8000001");
  await getBillProfile("8000001");
  assert.equal(calls, 1);
  globalThis.fetch = async () => json({ ...MOCK_PROFILE, bill_no: "8000002", criteria: [{ name: "기준" }] });
  await assert.rejects(getBillProfile("8000002"), { code: "INVALID_RESPONSE" });
  globalThis.fetch = async () => json({ ...MOCK_PROFILE, bill_no: "8000002" });
  assert.equal((await getBillProfile("8000002")).targets.length, 2);
});

test("맞춤 요약: POST 형식, 빈 기준 제외, 고른 순서가 달라도 캐시 재사용", async () => {
  const bodies = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url, "http://localhost").pathname, "/api/happen");
    assert.equal(options.method, "POST");
    assert.equal(options.headers["Content-Type"], "application/json");
    const body = JSON.parse(options.body);
    bodies.push(body);
    return json({ ...MOCK_HAPPEN, bill_no: body.bill_no });
  };
  const selection = {
    targets: ["대상 A", "대상 B"],
    criteria: [{ name: "기준 1", selected: ["선택 1"] }, { name: "기준 2", selected: [] }],
  };
  const result = await getBillHappen("8100001", selection);
  assert.deepEqual(bodies[0], {
    bill_no: "8100001", targets: ["대상 A", "대상 B"], criteria: [{ name: "기준 1", selected: ["선택 1"] }],
  });
  assert.equal(result.status, "REVIEW");
  await getBillHappen("8100001", { targets: ["대상 B", "대상 A"], criteria: [{ name: "기준 1", selected: ["선택 1"] }] });
  assert.equal(bodies.length, 1);
  assert.equal(getLastHappen("8100001").result.headline, MOCK_HAPPEN.headline);
});

test("맞춤 요약: 처리 단계 변환, 잘못된 응답·실패는 저장하지 않음", async () => {
  const empty = { targets: [], criteria: [] };
  globalThis.fetch = async () => json({ ...MOCK_HAPPEN, bill_no: "8200001", stage: "대안반영폐기" });
  assert.equal((await getBillHappen("8200001", empty)).status, "MERGED");
  globalThis.fetch = async () => json({ ...MOCK_HAPPEN, bill_no: "8200002", applicability: "certain" });
  await assert.rejects(getBillHappen("8200002", empty), { code: "INVALID_RESPONSE" });
  globalThis.fetch = async () => json({ detail: "AI 실패" }, 502);
  await assert.rejects(getBillHappen("8200002", empty), { status: 502 });
  assert.equal(getLastHappen("8200002"), undefined);
  globalThis.fetch = async () => json({ ...MOCK_HAPPEN, bill_no: "8200002" });
  assert.equal((await getBillHappen("8200002", empty)).status, "REVIEW");
});

test("비교 응답: [소제목, A, B]를 행으로 변환하고, 소제목이 비면 null, 예전 [A, B]는 거부", async () => {
  const base = { a_bill_no: "9100001", b_bill_no: "9100002" };
  globalThis.fetch = async () => json({ ...base, differences: [[" 유효기간 ", "A1", "B1"], ["", "A2", "B2"]] });
  assert.deepEqual((await compareBills("9100001", "9100002")).rows, [
    { topic: "유효기간", a: "A1", b: "B1" },
    { topic: null, a: "A2", b: "B2" },
  ]);
  globalThis.fetch = async () => json({ a_bill_no: "9100003", b_bill_no: "9100004", differences: [["A", "B"]] });
  await assert.rejects(compareBills("9100003", "9100004"), { code: "INVALID_RESPONSE" });
});

test("비교 강조 표시: 핵심·굵은 글씨를 나누고 짝이 안 맞으면 글자 그대로", () => {
  assert.deepEqual(parseEmphasis("유효기간을 ==4년 연장==하여 **장기적 보호** 추진"), [
    { type: "text", text: "유효기간을 " },
    { type: "key", text: "4년 연장" },
    { type: "text", text: "하여 " },
    { type: "strong", text: "장기적 보호" },
    { type: "text", text: " 추진" },
  ]);
  assert.deepEqual(parseEmphasis("표시 없음"), [{ type: "text", text: "표시 없음" }]);
  assert.deepEqual(parseEmphasis("짝이 ==안 맞음"), [{ type: "text", text: "짝이 ==안 맞음" }]);
});

test("상세 정보: 링크를 https로 바꾸고 발의자·발의일 변환, 성공 결과 재사용", async () => {
  let calls = 0;
  globalThis.fetch = async (url) => {
    calls++;
    const parsed = new URL(url, "http://localhost");
    assert.equal(parsed.pathname, "/api/info");
    assert.equal(parsed.searchParams.get("billno"), "9200001");
    return json({ ...MOCK_INFO, BILL_NO: "9200001" });
  };
  assert.deepEqual(await getBillInfo("9200001"), {
    link: "https://likms.assembly.go.kr/bill/billDetail.do?billId=EXAMPLE",
    proposer: "예시의원 등 10인",
    propose_date: "2026-01-01",
  });
  await getBillInfo("9200001");
  assert.equal(calls, 1);
  assert.equal(getCachedBillInfo("9200001").proposer, "예시의원 등 10인");
});

test("상세 정보: 국회 주소가 아닌 링크는 쓰지 않고, 잘못된 응답·실패는 저장하지 않음", async () => {
  for (const [billNo, link] of [["9200002", "javascript:alert(1)"], ["9200003", "https://example.com/bill"], ["9200004", "주소 아님"], ["9200005", null]]) {
    globalThis.fetch = async () => json({ ...MOCK_INFO, BILL_NO: billNo, DETAIL_LINK: link });
    assert.equal((await getBillInfo(billNo)).link, null);
  }
  globalThis.fetch = async () => json({ ...MOCK_INFO, BILL_NO: "다른 번호" });
  await assert.rejects(getBillInfo("9200006"), { code: "INVALID_RESPONSE" });
  globalThis.fetch = async () => json({ detail: "없음" }, 404);
  await assert.rejects(getBillInfo("9200006"), { status: 404 });
  assert.equal(getCachedBillInfo("9200006"), undefined);
  globalThis.fetch = async () => json({ ...MOCK_INFO, BILL_NO: "9200006" });
  assert.equal((await getBillInfo("9200006")).proposer, "예시의원 등 10인");
});

test("상세 정보: 동시에 최대 3건만 요청", async () => {
  let active = 0;
  let peak = 0;
  globalThis.fetch = async (url) => {
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return json({ ...MOCK_INFO, BILL_NO: new URL(url, "http://localhost").searchParams.get("billno") });
  };
  await Promise.all(Array.from({ length: 8 }, (_, index) => getBillInfo(`93000${index}`)));
  assert.equal(peak, 3);
});
