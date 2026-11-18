import { test } from "node:test";
import assert from "node:assert/strict";
import { COMMITTEES, UNKNOWN_COMMITTEE, filterByCommittee, getCommitteeOptions } from "../src/filters/committees.js";

const results = Object.freeze([
  { bill_no: "1", committee: "교육위원회", status: "REVIEW" },
  { bill_no: "2", committee: "국토교통위원회", status: "MERGED" },
  { bill_no: "3", committee: "교육위원회", status: "PASSED" },
  { bill_no: "4", committee: null, status: "REVIEW" },
  { bill_no: "5", status: "OTHER" },
  { bill_no: "6", committee: "  ", status: "REVIEW" },
  { bill_no: "7", committee: "기획재정위원회", status: "PASSED" },
].map(Object.freeze));

test("17개 소관위 목록과 실제 응답의 다른 이름·미제공 건수를 보존", () => {
  assert.equal(COMMITTEES.length, 17);
  assert.equal(new Set(COMMITTEES).size, 17);
  const options = getCommitteeOptions(results);
  assert.deepEqual(options.slice(0, 17).map((option) => option.value), COMMITTEES);
  const count = (value) => options.find((option) => option.value === value).count;
  assert.equal(count("교육위원회"), 2);
  assert.equal(count("국토교통위원회"), 1);
  assert.equal(count("재정경제기획위원회"), 0);
  assert.equal(count("기획재정위원회"), 1);
  assert.equal(count(UNKNOWN_COMMITTEE), 3);
  assert.equal(options.reduce((sum, option) => sum + option.count, 0), results.length);
});

test("소관위 필터는 정확한 위원회만 반환하고 검색 순서·원본을 유지", () => {
  assert.deepEqual(filterByCommittee(results, "교육위원회").map((bill) => bill.bill_no), ["1", "3"]);
  assert.equal(filterByCommittee(results, ""), results);
  assert.deepEqual(filterByCommittee(results, "국회운영위원회"), []);
  assert.deepEqual(filterByCommittee(results, UNKNOWN_COMMITTEE).map((bill) => bill.bill_no), ["4", "5", "6"]);
  assert.equal(results.length, 7);
});

test("처리 단계로 고른 결과와 교차 적용하며 미제공 응답도 지원", () => {
  const passed = results.filter((bill) => bill.status === "PASSED");
  assert.deepEqual(filterByCommittee(passed, "교육위원회").map((bill) => bill.bill_no), ["3"]);
  assert.deepEqual(filterByCommittee(passed, UNKNOWN_COMMITTEE), []);
  const unavailable = [{ bill_no: "1" }, { bill_no: "2", committee: null }];
  assert.deepEqual(filterByCommittee(unavailable, UNKNOWN_COMMITTEE), unavailable);
  assert.deepEqual(filterByCommittee([], "교육위원회"), []);
  assert.equal(getCommitteeOptions([]).length, 18);
});
