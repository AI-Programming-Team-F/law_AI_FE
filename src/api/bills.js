import { ApiError, request } from "./client.js";

const bills = new Map();
const summaries = new Map();
const pendingSummaries = new Map();
const comparisons = new Map();
const pendingComparisons = new Map();
const profiles = new Map();
const pendingProfiles = new Map();
const happens = new Map();
const pendingHappens = new Map();
const lastHappens = new Map(); // 의안번호 → 마지막으로 본 맞춤 요약 { selection, result }

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

// 관련도 점수: BE 명세상 0~1 소수 (README 8-1)
function isScore(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

// 서버의 법안 한 건을 화면용 필드로 바꿉니다. SCORE는 검색 응답에만 있습니다.
function toBill(raw, { scored }) {
  if (typeof raw?.BILL_NO !== "string" || typeof raw.BILL_NAME !== "string" ||
      !(raw.PROC_RESULT === null || typeof raw.PROC_RESULT === "string") ||
      !(raw.SUMMARY === null || typeof raw.SUMMARY === "string") ||
      (scored && !isScore(raw.SCORE)) ||
      (raw.COMMITTEE != null && typeof raw.COMMITTEE !== "string")) throw invalidResponse();
  return {
    bill_no: raw.BILL_NO,
    bill_name: raw.BILL_NAME,
    status: normalizeStatus(raw.PROC_RESULT),
    process_result: raw.PROC_RESULT,
    // 빈 문자열은 원문이 아직 등록되지 않은 법안입니다.
    proposal_text: raw.SUMMARY || "",
    score: scored ? raw.SCORE : null,
    // 소관위가 없는 예전 응답도 검색을 유지합니다.
    committee: raw.COMMITTEE?.trim() || null,
    // 현재 BE 명세에는 아래 세 가지 필드가 없습니다.
    propose_date: null,
    link: null,
    matched_keywords: [],
  };
}

// 의안번호로 법안 한 건 조회 (README 8-8)
export async function getBillByNo(billNo, { signal } = {}) {
  const response = await request("/search/billno", { billno: billNo }, { signal, timeoutMs: 30000 });
  if (typeof response.preprocess !== "boolean") throw invalidResponse();
  const bill = toBill(response.data, { scored: false });
  if (!bills.has(bill.bill_no)) bills.set(bill.bill_no, bill);
  return bill;
}

export async function searchBills(query, { signal, limit = SEARCH_LIMIT } = {}) {
  // 숫자 7자리는 의안번호로 먼저 찾고, 없으면 같은 검색어로 일반 검색을 합니다.
  const billNo = query.trim();
  if (/^\d{7}$/.test(billNo)) {
    try {
      return { ready: true, results: [await getBillByNo(billNo, { signal })] };
    } catch (error) {
      if (error.status !== 404) throw error;
    }
  }
  const response = await request("/search", { query, limit }, { signal, timeoutMs: 30000 });
  if (typeof response.preprocess !== "boolean" || !Array.isArray(response.data)) throw invalidResponse();
  if (!response.preprocess) return { ready: false, results: [] };
  const results = response.data.map((raw) => toBill(raw, { scored: true }));
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
    // 소제목은 선택 필드입니다. 개수가 맞지 않으면 다른 항목에 잘못 붙지 않도록 쓰지 않습니다.
    const topics = isTextList(result.topics) && result.topics.length === result.differences.length ? result.topics : [];
    const rows = result.differences.map(([a, b], index) => ({ topic: topics[index]?.trim() || null, a, b }));
    return { ...result, rows };
  });
}

const isText = (value) => typeof value === "string";
const isTextList = (value) => Array.isArray(value) && value.every(isText);

export function getCachedProfile(billNo) {
  return profiles.get(billNo);
}

// 맞춤 요약에 쓸 조건 목록 (README 8-7)
export function getBillProfile(billNo) {
  return cachedRequest(profiles, pendingProfiles, billNo, async () => {
    const result = await request("/profile", { bill_no: billNo });
    const validCriteria = Array.isArray(result.criteria) && result.criteria.every((item) =>
      isText(item?.name) && typeof item.multiple === "boolean" && isTextList(item.options));
    if (result.bill_no !== billNo || !isTextList(result.targets) || !validCriteria) throw invalidResponse();
    return result;
  });
}

export function getLastHappen(billNo) {
  return lastHappens.get(billNo);
}

// 고른 순서가 달라도 같은 조건이면 같은 결과를 재사용합니다.
function happenKey(billNo, { targets, criteria }) {
  return JSON.stringify([
    billNo,
    [...targets].sort(),
    criteria.map(({ name, selected }) => [name, [...selected].sort()])
      .sort(([a], [b]) => a.localeCompare(b)),
  ]);
}

function isHappen(result, billNo) {
  return result.bill_no === billNo &&
    ["high", "medium", "low"].includes(result.applicability) &&
    isText(result.headline) &&
    Array.isArray(result.changes) && result.changes.every((row) => isTextList(row) && row.length === 3) &&
    Array.isArray(result.checks) && result.checks.every((item) =>
      isText(item?.condition) && ["match", "mismatch", "unknown"].includes(item.status) && isText(item.reason)) &&
    isTextList(result.evidence) &&
    isText(result.stage);
}

// 고른 조건에 맞춘 요약 (README 8-7). 고르지 않은 기준은 보내지 않습니다.
export async function getBillHappen(billNo, selection) {
  const targets = selection.targets;
  const criteria = selection.criteria.filter((item) => item.selected.length > 0);
  const result = await cachedRequest(happens, pendingHappens, happenKey(billNo, { targets, criteria }), async () => {
    const response = await request("/happen", {}, { body: { bill_no: billNo, targets, criteria } });
    if (!isHappen(response, billNo)) throw invalidResponse();
    return { ...response, status: response.stage === "심사 중" ? "REVIEW" : normalizeStatus(response.stage) };
  });
  lastHappens.set(billNo, { selection, result });
  return result;
}
