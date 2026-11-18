import { ApiError, request } from "./client.js";

const bills = new Map();
const summaries = new Map();
const pendingSummaries = new Map();
const comparisons = new Map();
const pendingComparisons = new Map();

function invalidResponse() {
  return new ApiError("서버 응답 형식이 명세와 달라요. 잠시 후 다시 시도해 주세요.", { code: "INVALID_RESPONSE" });
}

// null은 기존 연동 논의 기준으로 심사 중으로 분류합니다.
export function normalizeStatus(result) {
  const value = result?.replace(/\s/g, "") || "";
  if (["원안가결", "수정가결"].includes(value)) return "PASSED";
  if (["대안반영폐기", "수정안반영폐기"].includes(value)) return "MERGED";
  return value ? "OTHER" : "REVIEW";
}

export function getCachedBill(billNo) {
  return bills.get(billNo);
}

export async function searchBills(query, { signal, limit = 20 } = {}) {
  const response = await request("/search", { query, limit }, { signal, timeoutMs: 30000 });
  if (typeof response.preprocess !== "boolean" || !Array.isArray(response.data)) throw invalidResponse();
  if (!response.preprocess) return { ready: false, results: [] };
  const results = response.data.map((raw) => {
    if (typeof raw?.BILL_NO !== "string" || typeof raw.BILL_NAME !== "string" ||
        !(raw.PROC_RESULT === null || typeof raw.PROC_RESULT === "string") ||
        typeof raw.SUMMARY !== "string" || !Number.isInteger(raw.SCORE)) throw invalidResponse();
    return {
      bill_no: raw.BILL_NO,
      bill_name: raw.BILL_NAME,
      status: normalizeStatus(raw.PROC_RESULT),
      process_result: raw.PROC_RESULT,
      proposal_text: raw.SUMMARY || "",
      score: raw.SCORE,
      // 현재 BE 명세에는 이 네 가지 필드가 없습니다.
      committee: null,
      propose_date: null,
      link: null,
      matched_keywords: [],
    };
  });
  results.forEach((bill) => bills.set(bill.bill_no, bill));
  return { ready: true, results };
}

export function getCachedSummary(billNo) {
  return summaries.get(billNo);
}

function cachedRequest(cache, pending, key, load) {
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (!pending.has(key)) {
    const promise = load().then((result) => {
      cache.set(key, result);
      return result;
    }).finally(() => pending.delete(key));
    pending.set(key, promise);
  }
  return pending.get(key);
}

export function getBillSummary(billNo) {
  return cachedRequest(summaries, pendingSummaries, billNo, async () => {
    const result = await request("/summary", { bill_no: billNo });
    if (result.bill_no !== billNo || !(result.summary === null || typeof result.summary === "string")) throw invalidResponse();
    return result;
  });
}

export function compareBills(a, b) {
  if (!/^\d+$/.test(a) || !/^\d+$/.test(b) || a === b) {
    return Promise.reject(new ApiError("서로 다른 의안번호 두 개를 선택해 주세요.", { status: 400 }));
  }
  const key = JSON.stringify([a, b]);
  return cachedRequest(comparisons, pendingComparisons, key, async () => {
    const result = await request("/compare", { a_bill_no: a, b_bill_no: b });
    if (result.a_bill_no !== a || result.b_bill_no !== b || !Array.isArray(result.differences) ||
        !result.differences.every((pair) => Array.isArray(pair) && pair.length === 2 && pair.every((text) => typeof text === "string"))) throw invalidResponse();
    return result;
  });
}
