import { Link, useSearchParams } from "react-router-dom";
import { MOCK_COMPARE_RESULT, MOCK_SEARCH_RESULTS } from "../api/mock";
import { StatusBadge } from "../components/BillCard";
import Icon from "../components/Icon";

export default function ComparePage() {
  const [params] = useSearchParams();
  const a = MOCK_SEARCH_RESULTS.results.find(
    (bill) => bill.bill_no === params.get("a"),
  );
  const b = MOCK_SEARCH_RESULTS.results.find(
    (bill) => bill.bill_no === params.get("b"),
  );

  if (!a || !b || a.bill_no === b.bill_no) {
    return (
      <section className="empty-state compare-empty page-width">
        <span className="empty-icon">
          <Icon name="compare" size={30} />
        </span>
        <h1>어떤 법안을 비교해 볼까요?</h1>
        <p>검색 화면에서 서로 다른 법안 2개를 선택해 주세요.</p>
        <Link className="button button-primary" to="/">
          법률안 찾으러 가기
          <Icon name="arrow" size={17} />
        </Link>
      </section>
    );
  }

  const mock = MOCK_COMPARE_RESULT;
  const hasComparison =
    [a.bill_no, b.bill_no].sort().join(",") ===
    [mock.a.bill_no, mock.b.bill_no].sort().join(",");
  const reversed = a.bill_no === mock.b.bill_no;
  const summary =
    reversed && mock.ai_summary
      ? mock.ai_summary.replace(
          /법안 ([AB])/g,
          (_, side) => `법안 ${side === "A" ? "B" : "A"}`,
        )
      : mock.ai_summary;

  return (
    <section className="compare-page page-width">
      <Link className="back-link" to="/">
        ← 법률안 검색으로
      </Link>
      <span className="section-kicker">SIDE BY SIDE</span>
      <h1>두 법안, 어떤 점이 다를까요?</h1>
      <p className="compare-intro">
        핵심 내용부터 차이점까지 나란히 살펴보세요.
      </p>
      <div className="demo-note">
        <Icon name="info" size={16} />
        <span>UI 미리보기 · 실제 법률안 정보가 아닌 예시 데이터입니다.</span>
      </div>
      <div className="comparison-grid">
        {[a, b].map((bill, index) => (
          <article className="comparison-card" key={bill.bill_no}>
            <div className="card-topline">
              <span className="comparison-letter">
                법안 {index === 0 ? "A" : "B"}
              </span>
              <StatusBadge status={bill.status} />
            </div>
            <h2>{bill.bill_name}</h2>
            <p className="bill-meta">
              {bill.committee} · 의안번호 {bill.bill_no}
            </p>
            <p className="comparison-summary">
              {bill.summary ||
                "요약을 준비하지 못했어요. 원문 링크를 확인하세요."}
            </p>
            <small className="ai-notice">
              AI가 생성한 요약이며 원문과 다를 수 있습니다.
            </small>
            <a
              className="text-link"
              href={bill.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              원문 보기
              <Icon name="external" size={15} />
              <span className="sr-only"> (새 탭)</span>
            </a>
          </article>
        ))}
      </div>
      {hasComparison ? (
        <>
          <section className="comparison-section common-section">
            <span className="section-kicker">IN COMMON</span>
            <h2>비슷한 내용</h2>
            <ul>
              {mock.common.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <small className="ai-notice">
              AI가 생성한 요약이며 원문과 다를 수 있습니다.
            </small>
          </section>
          <section className="comparison-section">
            <span className="section-kicker">DIFFERENCES</span>
            <h2>이런 점이 달라요</h2>
            <div className="comparison-grid differences">
              {[
                reversed ? mock.only_b : mock.only_a,
                reversed ? mock.only_a : mock.only_b,
              ].map((lines, index) => (
                <div key={index}>
                  <h3>법안 {index === 0 ? "A" : "B"}에만 있어요</h3>
                  <ul>
                    {lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <small className="ai-notice">
              AI가 생성한 요약이며 원문과 다를 수 있습니다.
            </small>
          </section>
          {mock.ai_summary && (
            <section className="comparison-section ai-comparison">
              <span className="summary-label">AI 비교 요약</span>
              <p>{summary}</p>
              <small className="ai-notice">
                AI가 생성한 요약이며 원문과 다를 수 있습니다.
              </small>
            </section>
          )}
        </>
      ) : (
        <div className="empty-state comparison-pending">
          <h2>이 조합의 비교 결과는 아직 준비 중이에요</h2>
          <p>
            미리보기에서는 ‘주택임대차보호법’과 ‘청년주거지원 특별법’의 비교를
            확인할 수 있어요.
          </p>
          <Link
            className="button button-soft"
            to={`/compare?a=${mock.a.bill_no}&b=${mock.b.bill_no}`}
          >
            비교 예시 보기
          </Link>
        </div>
      )}
    </section>
  );
}
