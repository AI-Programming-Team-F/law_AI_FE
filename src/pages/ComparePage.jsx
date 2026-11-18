import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { compareBills, getCachedBill } from "../api/bills";
import { BillSummary, StatusBadge } from "../components/BillCard";
import RequestState from "../components/RequestState";
import Icon from "../components/Icon";

export default function ComparePage({ knownBills = [] }) {
  const [params] = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const [version, setVersion] = useState(0);
  if (!a || !b || !/^\d+$/.test(a) || !/^\d+$/.test(b) || a === b) {
    return (
      <section className="empty-state compare-empty page-width">
        <span className="empty-icon"><Icon name="scale" size={30} /></span>
        <h1>어떤 법안을 비교해 볼까요?</h1>
        <p>검색 화면에서 서로 다른 법안 2개를 선택해 주세요.</p>
        <Link className="button button-primary" to="/search">법률안 찾으러 가기</Link>
      </section>
    );
  }
  const bills = [a, b].map((billNo) => getCachedBill(billNo) || knownBills.find((bill) => bill.bill_no === billNo) || {
    bill_no: billNo, bill_name: `의안번호 ${billNo}`, status: "UNKNOWN", matched_keywords: [],
  });
  return (
    <section className="compare-page page-width">
      <Link className="back-link" to="/search">← 법률안 검색으로</Link>
      <h1>두 법안, 어떤 점이 다를까요?</h1>
      <p className="compare-intro">주제별 차이점을 나란히 살펴보세요.</p>
      <div className="comparison-grid">
        {bills.map((bill, index) => (
          <article className="comparison-card" key={bill.bill_no}>
            <div className="card-topline">
              <span className="comparison-letter">법안 {index === 0 ? "A" : "B"}</span>
              <StatusBadge status={bill.status} />
            </div>
            <h2>{bill.bill_name}</h2>
            <p className="bill-meta">{bill.committee && `${bill.committee} · `}의안번호 {bill.bill_no}</p>
            <BillSummary key={bill.bill_no} bill={bill} />
            {bill.link ? (
              <a className="text-link" href={bill.link} target="_blank" rel="noopener noreferrer">
                원문 보기<Icon name="external" size={15} /><span className="sr-only"> (새 탭)</span>
              </a>
            ) : <p className="bill-meta">원문 링크가 제공되지 않았어요.</p>}
          </article>
        ))}
      </div>
      <ComparisonResult key={JSON.stringify([a, b, version])} a={a} b={b} onRetry={() => setVersion((value) => value + 1)} />
      <p className="compare-intro">법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요.</p>
    </section>
  );
}

function ComparisonResult({ a, b, onRetry }) {
  const [state, setState] = useState({ status: "loading" });
  useEffect(() => {
    let active = true;
    compareBills(a, b).then((result) => {
      if (active) setState({ status: "done", result });
    }).catch((error) => {
      if (active) setState({ status: "error", message: error.message });
    });
    return () => { active = false; };
  }, [a, b]);

  return (
    <section className="comparison-section" aria-labelledby="differences-heading">
      <h2 id="differences-heading">이런 점이 달라요</h2>
      {state.status === "loading" ? (
        <RequestState loading title="두 법안을 비교하고 있어요" message="AI 분석에는 시간이 걸릴 수 있어요." />
      ) : state.status === "error" ? (
        <RequestState error title="비교 결과를 불러오지 못했어요" message={state.message} onRetry={onRetry} />
      ) : state.result.differences.length ? (
        <div className="difference-rows">
          {state.result.differences.map((pair, row) => (
            <div className="comparison-grid differences" key={row}>
              {pair.map((text, side) => (
                <div key={side}>
                  <h3>법안 {side === 0 ? "A" : "B"} · 비교 항목 {row + 1}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : <RequestState title="표시할 차이점이 없어요" message="서버에서 비교할 차이점을 제공하지 않았어요." />}
      <small className="ai-notice">AI가 생성한 요약이며 원문과 다를 수 있습니다.</small>
    </section>
  );
}
