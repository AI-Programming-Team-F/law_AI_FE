import { useEffect, useState } from "react";
import { searchBills } from "../api/bills";
import RequestState from "../components/RequestState";
import BillCard from "../components/BillCard";
import Icon from "../components/Icon";
import { LogoMark } from "../components/Logo";

const EXAMPLE_QUERIES = [
  "월세 지원금",
  "전세사기",
  "청년 교통혜택",
  "임차인 보호",
];

export default function SearchPage({
  query,
  setQuery,
  onGoHome,
  selectedBills,
  onToggleCompare,
  savedBills,
  onToggleSave,
}) {
  const [input, setInput] = useState(query);
  const [inputError, setInputError] = useState("");

  const [searchVersion, setSearchVersion] = useState(0);

  // 다시 검색해도 비교 바구니는 비우지 않습니다. 다른 키워드의 법안끼리도 비교할 수 있습니다.
  function search(value) {
    const nextQuery = value;
    if (!nextQuery.trim()) {
      setInputError("검색어를 입력해 주세요.");
      return;
    }
    setInput(nextQuery);
    setQuery(nextQuery);
    setSearchVersion((version) => version + 1);
    setInputError("");
  }

  return (
    <div className="search-page">
      <section
        className={`search-hero page-width${query ? " is-compact" : ""}`}
        aria-labelledby="search-heading"
      >
        {!query && (
          <dl className="hero-meta">
            <div>
              <dt>데이터</dt>
              <dd>22대 국회 발의법률안</dd>
            </div>
            <div>
              <dt>할 수 있는 일</dt>
              <dd>검색, AI 요약, 두 법안 비교</dd>
            </div>
            <div>
              <dt>안내</dt>
              <dd>법률 자문이 아닌 정보 제공</dd>
            </div>
          </dl>
        )}
        <h1 id="search-heading" className="hero-title">
          <button
            type="button"
            className="hero-home"
            onClick={onGoHome}
            aria-label="법안잇다 홈으로"
          >
            <LogoMark size={query ? 56 : 104} />
            법안잇다
          </button>
        </h1>
        <p className="hero-tagline">유사 법률안을 찾고, 연결하다</p>
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
            placeholder="찾고 싶은 법률안이나 키워드를 입력하세요"
            aria-invalid={Boolean(inputError)}
            aria-describedby={inputError ? "query-error" : undefined}
          />
          <button className="button button-navy" type="submit">
            검색
          </button>
        </form>
        {inputError && (
          <p className="form-error" id="query-error" role="alert">
            {inputError}
          </p>
        )}
        {query && (
          <div className="example-queries">
            <span>이런 키워드는 어때요?</span>
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => search(example)}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </section>

      {!query && (
        <section className="feature-grid page-width" aria-label="서비스 소개">
          <article className="feature-card">
            <span className="feature-icon">
              <Icon name="documents" size={56} />
            </span>
            <h2>유사 법안 추천</h2>
            <p>
              키워드와 관련 있는 법률안을
              <br />
              관련도 순으로 찾아드립니다.
            </p>
            <span className="feature-pill">AI 요약으로 빠르게 파악</span>
          </article>
          <article className="feature-card">
            <span className="feature-icon">
              <Icon name="scale" size={56} />
            </span>
            <h2>핵심 비교</h2>
            <ul>
              <li>두 법안의 핵심 내용</li>
              <li>주제별 차이점 비교</li>
              <li>필요한 법안만 AI 요약</li>
            </ul>
          </article>
          <article className="feature-card">
            <span className="feature-icon">
              <Icon name="tag" size={56} />
            </span>
            <h2>추천 키워드</h2>
            <p>눌러서 바로 검색해 보세요.</p>
            <div className="feature-tags">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => search(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </article>
        </section>
      )}

      {query && (
        <SearchResults
          key={`${query}:${searchVersion}`}
          query={query}
          selectedBills={selectedBills}
          savedBills={savedBills}
          onToggleCompare={onToggleCompare}
          onToggleSave={onToggleSave}
          onRetry={() => setSearchVersion((version) => version + 1)}
        />
      )}
    </div>
  );
}

function SearchResults({ query, selectedBills, savedBills, onToggleCompare, onToggleSave, onRetry }) {
  const [state, setState] = useState({ status: "loading", results: [] });
  const selectedIds = selectedBills.map((bill) => bill.bill_no);
  const savedIds = savedBills.map((bill) => bill.bill_no);

  useEffect(() => {
    const controller = new AbortController();
    searchBills(query, { signal: controller.signal }).then(({ ready, results }) => {
      if (!controller.signal.aborted) setState({ status: ready ? "done" : "pending", results });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setState({ status: error.code === "NOT_READY" ? "pending" : "error", message: error.message, results: [] });
    });
    return () => controller.abort();
  }, [query]);

  const { results } = state;
  return (
    <section className="results-section page-width" aria-labelledby="results-heading">
      <div className="results-heading">
        <h2 id="results-heading">‘{query}’ 검색 결과 {state.status === "done" && <span>{results.length}건</span>}</h2>
        {state.status === "done" && <span className="sort-label"><Icon name="sort" size={16} />관련도순 · 최대 20건</span>}
      </div>
      {state.status === "loading" ? (
        <RequestState loading title="법률안을 찾고 있어요" message="검색 결과를 불러오는 중입니다." />
      ) : state.status === "pending" ? (
        <RequestState title="데이터를 준비하고 있어요" message="법률안 데이터가 준비되면 다시 검색해 주세요." onRetry={onRetry} />
      ) : state.status === "error" ? (
        <RequestState error title="검색 결과를 불러오지 못했어요" message={state.message} onRetry={onRetry} />
      ) : results.length === 0 ? (
        <RequestState title="검색 결과가 없어요" message="다른 키워드로 검색해 보세요." />
      ) : (
        <>
          <p className="selection-help" id="selection-help">
            궁금한 법안 <strong>2개</strong>를 선택해 차이점을 비교해 보세요. 다른 키워드로 검색해서 담아도 돼요.
          </p>
          <div className="sr-only" role="status">검색 결과 {results.length}건. 비교할 법안 {selectedIds.length}개 선택됨.</div>
          <div className="bill-list">
            {results.map((bill) => (
              <BillCard key={bill.bill_no} bill={bill}
                selected={selectedIds.includes(bill.bill_no)}
                disabled={selectedIds.length === 2 && !selectedIds.includes(bill.bill_no)}
                onToggle={() => onToggleCompare(bill)}
                saved={savedIds.includes(bill.bill_no)} onToggleSave={() => onToggleSave(bill)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
