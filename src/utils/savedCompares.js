// 저장한 비교: 로그인이 없어서 이 브라우저(localStorage)에만 보관합니다.
// 비교 결과와 그때 받아 둔 AI 요약·맞춤 요약을 함께 저장해, 다시 열 때 서버에 AI를 다시 요청하지 않습니다.
export const SAVED_COMPARES_KEY = "beopan-itda:saved-compares:v1";

const isText = (value) => typeof value === "string";
const isTextList = (value) => Array.isArray(value) && value.every(isText);
const isBillNo = (value) => isText(value) && /^\d+$/.test(value);

function isBill(bill, billNo) {
  return bill && bill.bill_no === billNo && isText(bill.bill_name) && isText(bill.status);
}

function isRows(rows) {
  return Array.isArray(rows) && rows.every((row) =>
    row && (row.topic === null || isText(row.topic)) && isText(row.a) && isText(row.b));
}

// 맞춤 요약: { selection: { targets, criteria }, result }
export function isSavedHappen(entry) {
  const selection = entry?.selection;
  const result = entry?.result;
  return Boolean(selection && result &&
    isTextList(selection.targets) &&
    Array.isArray(selection.criteria) && selection.criteria.every((item) => isText(item?.name) && isTextList(item.selected)) &&
    isText(result.headline) && isText(result.status) && isText(result.stage) &&
    Array.isArray(result.changes) && result.changes.every((row) => isTextList(row) && row.length === 3) &&
    Array.isArray(result.checks) && result.checks.every((item) =>
      isText(item?.condition) && ["match", "mismatch", "unknown"].includes(item.status) && isText(item.reason)) &&
    isTextList(result.evidence));
}

// 요약은 null(서버가 요약을 준비하지 못함)도 그대로 저장합니다. 받지 않은 법안은 키가 없습니다.
function isSummaries(summaries, billNos) {
  return summaries && typeof summaries === "object" && Object.entries(summaries).every(([billNo, value]) =>
    billNos.includes(billNo) && (value === null || isText(value)));
}

function isHappens(happens, billNos) {
  return happens && typeof happens === "object" && Object.entries(happens).every(([billNo, value]) =>
    billNos.includes(billNo) && isSavedHappen(value));
}

export function isSavedCompare(item) {
  if (!item || !isBillNo(item.a) || !isBillNo(item.b) || item.a === item.b) return false;
  const billNos = [item.a, item.b];
  return isBill(item.bills?.a, item.a) && isBill(item.bills?.b, item.b) &&
    isRows(item.rows) &&
    isSummaries(item.summaries, billNos) &&
    isHappens(item.happens, billNos) &&
    isText(item.savedAt) && !Number.isNaN(Date.parse(item.savedAt));
}

// 형식이 맞지 않는 항목(손상·예전 형식)은 버리고 나머지만 씁니다.
export function loadSavedCompares(storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(SAVED_COMPARES_KEY));
    return Array.isArray(value) ? value.filter(isSavedCompare) : [];
  } catch {
    return [];
  }
}

export function isSameCompare(item, a, b) {
  return item.a === a && item.b === b;
}

// 같은 두 법안(같은 순서)이면 새 내용으로 바꾸고 맨 앞에 둡니다.
export function upsertCompare(list, entry) {
  return [entry, ...list.filter((item) => !isSameCompare(item, entry.a, entry.b))];
}
