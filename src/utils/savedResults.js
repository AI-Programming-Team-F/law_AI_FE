// 저장한 법안의 AI 결과: 로그인이 없어서 이 브라우저(localStorage)에만 보관합니다.
// 의안번호 → { summary, profile, happen }. 새로고침해도 AI 요약·맞춤 요약을 다시 요청하지 않고 보여줍니다.
// 저장한 법안 목록(beopan-itda:saved-bills:v2)과 따로 두어 기존 저장 형식을 바꾸지 않습니다.
import { isSavedHappen } from "./savedCompares.js";

export const SAVED_RESULTS_KEY = "beopan-itda:saved-results:v1";

const isText = (value) => typeof value === "string";
const isTextList = (value) => Array.isArray(value) && value.every(isText);

// /profile 응답 (맞춤 요약의 '조건 변경'에 필요)
function isProfile(profile, billNo) {
  return Boolean(profile && profile.bill_no === billNo && isTextList(profile.targets) &&
    Array.isArray(profile.criteria) && profile.criteria.every((item) =>
      isText(item?.name) && typeof item.multiple === "boolean" && isTextList(item.options)));
}

// 받지 않은 결과는 키가 없습니다. 요약 null은 '서버가 요약을 준비하지 못함'이라 그대로 둡니다.
export function isSavedResult(entry, billNo) {
  if (!entry || typeof entry !== "object") return false;
  if ("summary" in entry && !(entry.summary === null || isText(entry.summary))) return false;
  if ("profile" in entry && !isProfile(entry.profile, billNo)) return false;
  if ("happen" in entry && !isSavedHappen(entry.happen)) return false;
  return true;
}

// 저장한 법안에 해당하는 형식 맞는 항목만 씁니다(손상·예전 형식·저장 취소된 법안은 버림).
export function loadSavedResults(billNos, storage = globalThis.localStorage) {
  try {
    const value = JSON.parse(storage.getItem(SAVED_RESULTS_KEY));
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value)
      .filter(([billNo, entry]) => billNos.includes(billNo) && isSavedResult(entry, billNo)));
  } catch {
    return {};
  }
}

// 결과 하나를 더하거나 바꿉니다. 바뀐 것이 없으면 같은 객체를 돌려줍니다.
export function withResult(results, billNo, type, value) {
  const entry = results[billNo] || {};
  if (Object.hasOwn(entry, type) && entry[type] === value) return results;
  return { ...results, [billNo]: { ...entry, [type]: value } };
}

export function withoutBill(results, billNo) {
  if (!Object.hasOwn(results, billNo)) return results;
  const next = { ...results };
  delete next[billNo];
  return next;
}
