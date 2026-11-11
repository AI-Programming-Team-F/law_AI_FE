import { useState } from "react";
import { MOCK_SEARCH_RESULTS, MOCK_SUMMARIES } from "../api/mock";
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

  // UI 확인용 검색입니다. 서버 연결 시 검색 API 요청으로 교체합니다.
  // 서버가 법안 원문까지 검색하는 것을 흉내 내려고 예시 요약 글도 함께 찾습니다(화면에는 표시하지 않음).
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const results = MOCK_SEARCH_RESULTS.results.filter((bill) => {
    const text = [bill.bill_name, MOCK_SUMMARIES[bill.bill_no], ...bill.matched_keywords]
      .join(" ")
      .toLowerCase();
    return terms.some((term) => text.includes(term));
  });
  const selectedIds = selectedBills.map((bill) => bill.bill_no);
  const savedIds = savedBills.map((bill) => bill.bill_no);

  // 다시 검색해도 비교 바구니는 비우지 않습니다. 다른 키워드의 법안끼리도 비교할 수 있습니다.
  function search(value) {
    const nextQuery = value.trim();
    if (!nextQuery) {
      setInputError("검색어를 입력해 주세요.");
      return;
    }
    setInput(nextQuery);
    setQuery(nextQuery);
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
              <li>두 법안의 비슷한 내용</li>
              <li>각 법안에만 있는 내용</li>
              <li>공통점과 차이점 AI 요약</li>
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
        <section
          className="results-section page-width"
          aria-labelledby="results-heading"
        >
          <div className="demo-note">
            <Icon name="info" size={16} />
            <span>
              UI 미리보기 · 아래 내용은 실제 법률안 정보가 아닌 예시
              데이터입니다.
            </span>
          </div>
          <div className="results-heading">
            <div>
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
            다른 키워드로 검색해서 담아도 돼요.
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
                  onToggle={() => onToggleCompare(bill)}
                  saved={savedIds.includes(bill.bill_no)}
                  onToggleSave={() => onToggleSave(bill)}
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
      )}
    </div>
  );
}
