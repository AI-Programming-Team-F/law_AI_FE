import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { searchBills, STATUS_LABELS, STATUS_ORDER } from "../api/bills";
import RequestState from "../components/RequestState";
import BillCard from "../components/BillCard";
import Icon from "../components/Icon";
import { LogoMark } from "../components/Logo";
import { filterByCommittee, getCommitteeOptions, UNKNOWN_COMMITTEE } from "../filters/committees";

const EXAMPLE_QUERIES = [
  "월세 지원금",
  "전세사기",
  "청년 교통혜택",
  "스마트 안경",
];

export default function SearchPage({
  query,
  setQuery,
  onGoHome,
  compareUrl,
  selectedBills,
  onToggleCompare,
  savedBills,
  savedCount = savedBills.length,
  onToggleSave,
}) {
  const navigate = useNavigate();
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
    navigate("/search");
  }

  return (
    <div className="search-page">
      <section
        className={`search-hero page-width${query ? " is-compact" : ""}`}
        aria-labelledby="search-heading"
      >
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
        <p className="hero-tagline">흩어진 법안의 조각, 한눈에 잇다</p>
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
          <Link className="feature-card feature-link" to="/saved">
            <span className="feature-icon">
              <Icon name="bookmark" size={56} />
            </span>
            <h2>저장한 법안</h2>
            <p>관심 있는 법안을 저장하고<br />한곳에서 다시 살펴보세요.</p>
            <span className="feature-pill">저장한 법안·비교 {savedCount}건 보기 →</span>
          </Link>
          <Link className="feature-card feature-link" to={compareUrl}>
            <span className="feature-icon">
              <Icon name="scale" size={56} />
            </span>
            <h2>비교하기</h2>
            <ul>
              <li>두 법안의 핵심 내용</li>
              <li>주제별 차이점 비교</li>
              <li>필요한 법안만 AI 요약</li>
            </ul>
            <span className="feature-pill">두 법안 비교하러 가기 →</span>
          </Link>
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

// 한 페이지에 보여줄 결과 수
const PAGE_SIZE = 20;

// 기본은 서버가 준 관련도 순서 그대로. 사용자가 고르면 처리 단계별로 묶고,
// 같은 단계 안에서는 관련도 순서를 유지합니다(안정 정렬).
function sortResults(results, sort) {
  if (sort !== "status") return results;
  const rank = (bill) => {
    const index = STATUS_ORDER.indexOf(bill.status);
    return index === -1 ? STATUS_ORDER.length : index;
  };
  return [...results].sort((a, b) => rank(a) - rank(b));
}

function Pagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);
  return (
    <nav className="pagination" aria-label="검색 결과 페이지">
      <button
        type="button"
        className="pagination-step"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        aria-label="이전 페이지"
      >
        이전
      </button>
      <ol>
        {pages.map((number) => (
          <li key={number}>
            <button
              type="button"
              className="pagination-number"
              onClick={() => onChange(number)}
              aria-current={number === page ? "page" : undefined}
              aria-label={`${number}페이지`}
            >
              {number}
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="pagination-step"
        onClick={() => onChange(page + 1)}
        disabled={page === pageCount}
        aria-label="다음 페이지"
      >
        다음
      </button>
    </nav>
  );
}

// 처리 단계순일 때 보이는 단계 박스. 여러 개를 고를 수 있고, 아무것도 안 고르면 전체를 보여줍니다.
function StageFilter({ counts, selected, onToggle, onClear }) {
  return (
    <div className="stage-filter">
      <div className="stage-boxes" role="group" aria-label="처리 단계 선택 (여러 개 선택 가능)">
        {STATUS_ORDER.map((status) => {
          const count = counts[status] || 0;
          const pressed = selected.includes(status);
          return (
            <button
              key={status}
              type="button"
              className={`stage-box stage-${status.toLowerCase()}`}
              aria-pressed={pressed}
              disabled={count === 0 && !pressed}
              onClick={() => onToggle(status)}
            >
              <span className="stage-name">{STATUS_LABELS[status]}</span>
              <span className="stage-count">{count}건</span>
            </button>
          );
        })}
      </div>
      <p className="stage-help">
        {selected.length
          ? `${selected.map((status) => STATUS_LABELS[status]).join(", ")}만 보고 있어요.`
          : "단계를 눌러 원하는 법안만 볼 수 있어요. 여러 개를 함께 고를 수 있어요."}
        {selected.length > 0 && (
          <button type="button" className="stage-clear" onClick={onClear}>
            전체 보기
          </button>
        )}
      </p>
    </div>
  );
}

function SearchResults({ query, selectedBills, savedBills, onToggleCompare, onToggleSave, onRetry }) {
  const [state, setState] = useState({ status: "loading", results: [] });
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("score");
  const [stages, setStages] = useState([]);
  const [committee, setCommittee] = useState("");
  const headingRef = useRef(null);
  const selectedIds = selectedBills.map((bill) => bill.bill_no);
  const savedIds = savedBills.map((bill) => bill.bill_no);

  // 페이지를 바꾸면 결과 목록 맨 위로 올리고, 제목으로 포커스를 옮겨 화면 읽기 프로그램도 따라오게 합니다.
  function changePage(nextPage) {
    setPage(nextPage);
    headingRef.current?.scrollIntoView({ block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }

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
  // 검색어는 서버에 그대로 보내고, 화면에서 형광펜을 칠할 단어만 띄어쓰기로 나눕니다.
  const highlightTerms = query.split(/\s+/).filter(Boolean);
  const sorted = sortResults(results, sort);
  // 사용자가 단계 박스를 고른 경우에만 그 단계의 법안만 남깁니다(순서는 그대로).
  const stageFiltered = sort === "status" && stages.length
    ? sorted.filter((bill) => stages.includes(bill.status))
    : sorted;
  const filtered = filterByCommittee(stageFiltered, committee);
  const committeeOptions = getCommitteeOptions(results);
  const unknownCommitteeCount = committeeOptions.find((option) => option.value === UNKNOWN_COMMITTEE).count;
  const stageCounts = results.reduce((counts, bill) => {
    counts[bill.status] = (counts[bill.status] || 0) + 1;
    return counts;
  }, {});
  const isFiltered = filtered.length !== results.length;
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE;
  const pageResults = filtered.slice(start, start + PAGE_SIZE);

  function toggleStage(status) {
    setStages((previous) =>
      previous.includes(status)
        ? previous.filter((item) => item !== status)
        : STATUS_ORDER.filter((item) => item === status || previous.includes(item)),
    );
    setPage(1);
  }

  function clearFilters() {
    setCommittee("");
    setStages([]);
    setPage(1);
  }
  return (
    <section className="results-section page-width" aria-labelledby="results-heading">
      <div className="results-heading">
        <h2 id="results-heading" ref={headingRef} tabIndex={-1}>‘{query}’ 검색 결과{" "}
          {state.status === "done" && (
            <span>
              {isFiltered && <small className="total-count">전체 {results.length}건 중 </small>}
              {filtered.length}건
            </span>
          )}
        </h2>
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
          <div className="results-toolbar">
            <p className="selection-help" id="selection-help">
              궁금한 법안 <strong>2개</strong>를 선택해 차이점을 비교해 보세요. 다른 키워드로 검색해서 담아도 돼요.
            </p>
            <div className="results-controls">
              <label className="sort-label committee-label">
                <span>소관위원회</span>
                <select
                  aria-label="소관위원회 필터"
                  value={committee}
                  title={committeeOptions.find((option) => option.value === committee)?.label || "소관위원회 전체"}
                  onChange={(event) => {
                    setCommittee(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">소관위원회 전체 ({results.length}건)</option>
                  {committeeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.count}건)
                    </option>
                  ))}
                </select>
              </label>
              {results.length > 1 && (
                <label className="sort-label">
                  <Icon name="sort" size={16} />
                  <span className="sr-only">정렬</span>
                  <select
                    aria-label="검색 결과 정렬"
                    value={sort}
                    onChange={(event) => {
                      setSort(event.target.value);
                      setStages([]);
                      setPage(1);
                    }}
                  >
                    <option value="score">관련도순</option>
                    <option value="status">처리 단계순</option>
                  </select>
                </label>
              )}
              {(committee || stages.length > 0) && (
                <button type="button" className="stage-clear" onClick={clearFilters}>
                  필터 초기화
                </button>
              )}
            </div>
          </div>
          {unknownCommitteeCount > 0 && (
            <p className="committee-notice">
              {unknownCommitteeCount === results.length
                ? "현재 검색 결과에는 소관위원회 정보가 없어요."
                : `소관위원회 정보가 없는 법안 ${unknownCommitteeCount}건은 ‘소관위원회 정보 없음’에서 볼 수 있어요.`}
            </p>
          )}
          {sort === "status" && (
            <StageFilter
              counts={stageCounts}
              selected={stages}
              onToggle={toggleStage}
              onClear={() => {
                setStages([]);
                setPage(1);
              }}
            />
          )}
          <div className="sr-only" role="status">
            {isFiltered ? `전체 ${results.length}건 중 ${filtered.length}건` : `검색 결과 ${results.length}건`}
            {pageCount > 1 && `, ${pageCount}페이지 중 ${page}페이지`}. 비교할 법안 {selectedIds.length}개 선택됨.
          </div>
          {pageCount > 1 && (
            <p className="page-range">
              {start + 1}–{start + pageResults.length}번째 결과
            </p>
          )}
          {filtered.length === 0 ? (
            <RequestState title="선택한 조건에 맞는 법안이 없어요" message="다른 소관위원회나 처리 단계를 선택하거나 필터를 초기화해 주세요." />
          ) : <div className="bill-list">
            {pageResults.map((bill) => (
              <BillCard key={bill.bill_no} bill={bill}
                selected={selectedIds.includes(bill.bill_no)}
                disabled={selectedIds.length === 2 && !selectedIds.includes(bill.bill_no)}
                onToggle={() => onToggleCompare(bill)}
                saved={savedIds.includes(bill.bill_no)} onToggleSave={() => onToggleSave(bill)}
                highlightTerms={highlightTerms} showSimilarity />
            ))}
          </div>}
          <Pagination page={page} pageCount={pageCount} onChange={changePage} />
        </>
      )}
    </section>
  );
}
