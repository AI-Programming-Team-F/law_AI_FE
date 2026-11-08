import { useState } from "react";
import { Link } from "react-router-dom";
import { MOCK_SEARCH_RESULTS } from "../api/mock";
import BillCard from "../components/BillCard";
import Icon from "../components/Icon";

const EXAMPLE_QUERIES = ["월세 지원금", "전세사기", "청년 교통혜택"];

export default function SearchPage({
  query,
  setQuery,
  selectedIds,
  setSelectedIds,
}) {
  const [input, setInput] = useState(query);
  const [inputError, setInputError] = useState("");

  // UI 확인용 검색입니다. 서버 연결 시 검색 API 요청으로 교체합니다.
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = MOCK_SEARCH_RESULTS.results.filter((bill) => {
    const text = [bill.bill_name, bill.summary, ...bill.matched_keywords]
      .join(" ")
      .toLowerCase();
    return terms.some((term) => text.includes(term));
  });
  const selectedBills = selectedIds.map((id) =>
    MOCK_SEARCH_RESULTS.results.find((bill) => bill.bill_no === id),
  );

  function search(value) {
    const nextQuery = value.trim();
    if (!nextQuery) {
      setInputError("검색어를 입력해 주세요.");
      return;
    }
    setInput(nextQuery);
    setQuery(nextQuery);
    setInputError("");
    setSelectedIds([]);
  }

  function toggleBill(id) {
    setSelectedIds((previous) => {
      if (previous.includes(id)) return previous.filter((item) => item !== id);
      return previous.length < 2 ? [...previous, id] : previous;
    });
  }

  return (
    <div className={`search-page${selectedIds.length ? " has-selection" : ""}`}>
      <section
        className="search-hero page-width"
        aria-labelledby="search-heading"
      >
        <span className="eyebrow">
          <span className="eyebrow-line" />
          일상에 닿는 법률안
        </span>
        <h1 id="search-heading">
          어려운 법률안도,
          <br />
          <span>내 일상의 언어로.</span>
        </h1>
        <p className="hero-description">
          궁금한 키워드로 법안을 찾고,
          <br className="mobile-break" /> AI 요약과 비교로 쉽게 살펴보세요.
        </p>
        <form
          className="search-form"
          onSubmit={(event) => {
            event.preventDefault();
            search(input);
          }}
          role="search"
        >
          <label className="sr-only" htmlFor="bill-query">
            법률안 검색어
          </label>
          <Icon name="search" size={24} />
          <input
            id="bill-query"
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setInputError("");
            }}
            placeholder="어떤 법률안이 궁금하세요?"
            aria-invalid={Boolean(inputError)}
            aria-describedby={inputError ? "query-error" : "search-examples"}
          />
          <button className="button button-primary" type="submit">
            검색
            <Icon name="arrow" size={17} />
          </button>
        </form>
        {inputError && (
          <p className="form-error" id="query-error" role="alert">
            {inputError}
          </p>
        )}
        <div className="example-queries" id="search-examples">
          <span>이런 키워드는 어때요?</span>
          {EXAMPLE_QUERIES.map((example) => (
            <button key={example} type="button" onClick={() => search(example)}>
              {example}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </section>

      <section
        className="results-section page-width"
        aria-labelledby="results-heading"
      >
        <div className="demo-note">
          <Icon name="info" size={16} />
          <span>
            UI 미리보기 · 아래 내용은 실제 법률안 정보가 아닌 예시 데이터입니다.
          </span>
        </div>
        <div className="results-heading">
          <div>
            <span className="section-kicker">SEARCH RESULTS</span>
            <h2 id="results-heading">
              ‘{query}’ 검색 결과 <span>{results.length}</span>
            </h2>
          </div>
          <span className="sort-label">
            <Icon name="sort" size={16} />
            관련도순
          </span>
        </div>
        <p className="selection-help" id="selection-help">
          궁금한 법안 <strong>2개</strong>를 선택해 차이점을 비교해 보세요.
        </p>
        <div className="sr-only" role="status" aria-live="polite">
          검색 결과 {results.length}건. 비교할 법안 {selectedIds.length}개
          선택됨.
        </div>
        {results.length ? (
          <div className="bill-list">
            {results.map((bill) => (
              <BillCard
                key={bill.bill_no}
                bill={bill}
                selected={selectedIds.includes(bill.bill_no)}
                disabled={
                  selectedIds.length === 2 &&
                  !selectedIds.includes(bill.bill_no)
                }
                onToggle={() => toggleBill(bill.bill_no)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="search" size={28} />
            </span>
            <h3>검색 결과가 없어요</h3>
            <p>
              다른 키워드로 검색해 보세요.
              <br />
              미리보기에서는 ‘월세 지원금’ 예시를 확인할 수 있어요.
            </p>
            <button
              className="button button-soft"
              onClick={() => search("월세 지원금")}
            >
              예시 검색해 보기
            </button>
          </div>
        )}
      </section>

      {selectedIds.length > 0 && (
        <aside className="compare-dock" aria-label="비교할 법률안">
          <div className="dock-info">
            <span className="dock-icon">
              <Icon name="compare" size={21} />
            </span>
            <div>
              <strong>
                비교할 법안 <span>{selectedIds.length}/2</span>
              </strong>
              <p>
                {selectedIds.length === 2
                  ? "선택한 두 법안을 나란히 살펴보세요."
                  : "법안을 하나 더 선택해 주세요."}
              </p>
            </div>
          </div>
          <div className="selected-bills">
            {selectedBills.map((bill, index) => (
              <button
                key={bill.bill_no}
                onClick={() => toggleBill(bill.bill_no)}
                aria-label={`${bill.bill_name} 비교 선택 해제`}
                title={bill.bill_name}
              >
                <span>{index + 1}</span>
                <span className="selected-name">{bill.bill_name}</span>
                <Icon name="close" size={14} />
              </button>
            ))}
          </div>
          {selectedIds.length === 2 ? (
            <Link
              className="button button-primary"
              to={`/compare?${new URLSearchParams({ a: selectedIds[0], b: selectedIds[1] })}`}
            >
              비교하기
              <Icon name="arrow" size={17} />
            </Link>
          ) : (
            <button className="button button-primary" disabled>
              비교하기
              <Icon name="arrow" size={17} />
            </button>
          )}
        </aside>
      )}
    </div>
  );
}
