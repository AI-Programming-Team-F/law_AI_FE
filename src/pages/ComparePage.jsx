import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { compareBills, getBillByNo, getCachedBill } from "../api/bills";
import { BillSummary, StatusBadge } from "../components/BillCard";
import RequestState from "../components/RequestState";
import Icon from "../components/Icon";
import { parseEmphasis } from "../utils/emphasis";

export default function ComparePage({ knownBills = [] }) {
  const [params] = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const [version, setVersion] = useState(0);
  const [loadedBills, setLoadedBills] = useState({});

  // 공유 링크로 바로 들어온 법안은 의안번호로 이름·소관위·처리 상태를 채웁니다.
  useEffect(() => {
    if (!/^\d+$/.test(a || "") || !/^\d+$/.test(b || "") || a === b) return undefined;
    const controller = new AbortController();
    [a, b].filter((billNo) => !getCachedBill(billNo)).forEach((billNo) => {
      getBillByNo(billNo, { signal: controller.signal })
        .then((bill) => setLoadedBills((previous) => ({ ...previous, [billNo]: bill })))
        .catch(() => {}); // 조회에 실패해도 비교는 의안번호로 계속 보여줍니다.
    });
    return () => controller.abort();
  }, [a, b]);

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
  const bills = [a, b].map((billNo) => loadedBills[billNo] || getCachedBill(billNo) || knownBills.find((bill) => bill.bill_no === billNo) || {
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

function DifferenceSide({ side, text }) {
  return (
    <div className={`difference-side is-${side}`}>
      <span className="difference-side-label">법안 {side.toUpperCase()}</span>
      <p>
        {parseEmphasis(text).map((part, index) => {
          if (part.type === "key") return <mark key={index}>{part.text}</mark>;
          if (part.type === "strong") return <strong key={index}>{part.text}</strong>;
          return part.text;
        })}
      </p>
    </div>
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
      ) : state.result.rows.length ? (
        <>
          <div className="difference-legend" aria-hidden="true">
            <span className="is-a">법안 A</span>
            <span className="is-b">법안 B</span>
          </div>
          <ol className="difference-list">
            {state.result.rows.map((row, index) => (
              <li className="difference-item" key={index}>
                <h3 className="difference-topic">
                  <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  {row.topic || "비교 항목"}
                </h3>
                <div className="difference-body">
                  <DifferenceSide side="a" text={row.a} />
                  <span className="difference-vs" aria-hidden="true">VS</span>
                  <DifferenceSide side="b" text={row.b} />
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : <RequestState title="표시할 차이점이 없어요" message="서버에서 비교할 차이점을 제공하지 않았어요." />}
      <small className="ai-notice">AI가 생성한 요약이며 원문과 다를 수 있습니다.</small>
    </section>
  );
}
