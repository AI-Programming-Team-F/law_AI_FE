import { ApiError, request } from "./client.js";

const bills = new Map();
const summaries = new Map();
const pendingSummaries = new Map();
const comparisons = new Map();
const pendingComparisons = new Map();

function invalidResponse() {
  return new ApiError("서버 응답 형식이 명세와 달라요. 잠시 후 다시 시도해 주세요.", { code: "INVALID_RESPONSE" });
}

// 처리 단계순 정렬 순서: 심사 중 → 본회의 통과 → 대안에 반영(폐기) → 기타 → 처리 결과 미제공
export const STATUS_ORDER = ["REVIEW", "PASSED", "MERGED", "OTHER", "UNKNOWN"];

// 처리 상태 표기. 카드 뱃지와 처리 단계 박스가 같은 문구를 씁니다. MERGED는 통과가 아닙니다.
export const STATUS_LABELS = {
  REVIEW: "심사 중",
  PASSED: "본회의 통과",
  MERGED: "대안에 반영(폐기)",
  OTHER: "기타",
  UNKNOWN: "처리 결과 미제공",
};

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

// BE가 허용하는 최대값(1~100). 한 번에 받아 화면에서 20건씩 나눠 보여줍니다.
export const SEARCH_LIMIT = 100;

export async function searchBills(query, { signal, limit = SEARCH_LIMIT } = {}) {
  const response = await request("/search", { query, limit }, { signal, timeoutMs: 30000 });
  if (typeof response.preprocess !== "boolean" || !Array.isArray(response.data)) throw invalidResponse();
  if (!response.preprocess) return { ready: false, results: [] };
  const results = response.data.map((raw) => {
    if (typeof raw?.BILL_NO !== "string" || typeof raw.BILL_NAME !== "string" ||
        !(raw.PROC_RESULT === null || typeof raw.PROC_RESULT === "string") ||
        typeof raw.SUMMARY !== "string" || !Number.isInteger(raw.SCORE) ||
        (raw.COMMITTEE != null && typeof raw.COMMITTEE !== "string")) throw invalidResponse();
    return {
      bill_no: raw.BILL_NO,
      bill_name: raw.BILL_NAME,
      status: normalizeStatus(raw.PROC_RESULT),
      process_result: raw.PROC_RESULT,
      proposal_text: raw.SUMMARY || "",
      score: raw.SCORE,
      // 소관위는 선택 확장 필드입니다. 기존 응답에는 없어도 검색을 유지합니다.
      committee: raw.COMMITTEE?.trim() || null,
      // 현재 BE 명세에는 아래 세 가지 필드가 없습니다.
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
