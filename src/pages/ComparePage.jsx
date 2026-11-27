import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { compareBills, getBillByNo, getCachedBill, getCachedSummary } from "../api/bills";
import { BillLinkNotice, BillMeta, BillSummary, StatusBadge } from "../components/BillCard";
import { useBillInfo } from "../hooks/useBillInfo";
import RequestState from "../components/RequestState";
import Icon from "../components/Icon";
import { parseEmphasis } from "../utils/emphasis";
import { isSameCompare } from "../utils/savedCompares";

// 저장할 법안 정보 (카드 제목·상태·소관위에 필요한 것만)
function pickBill(bill) {
  return {
    bill_no: bill.bill_no,
    bill_name: bill.bill_name,
    status: bill.status,
    process_result: bill.process_result ?? null,
    committee: bill.committee ?? null,
  };
}

export default function ComparePage({ knownBills = [], savedCompares = [], compareActions }) {
  const [params] = useSearchParams();
  const a = params.get("a");
  const b = params.get("b");
  const pairKey = `${a}:${b}`;
  const [version, setVersion] = useState(0);
  const [loadedBills, setLoadedBills] = useState({});
  // 화면에 나온 비교 결과(저장할 때 씀). 다른 두 법안으로 바뀌면 쓰지 않습니다.
  const [shown, setShown] = useState(null);
  const saved = savedCompares.find((item) => isSameCompare(item, a, b));
  const current = shown?.key === pairKey ? shown.result : null;

  // 공유 링크로 바로 들어온 법안은 의안번호로 이름·소관위·처리 상태를 채웁니다. 저장한 비교는 저장된 정보를 씁니다.
  const isSaved = Boolean(saved);
  useEffect(() => {
    if (isSaved || !/^\d+$/.test(a || "") || !/^\d+$/.test(b || "") || a === b) return undefined;
    const controller = new AbortController();
    [a, b].filter((billNo) => !getCachedBill(billNo)).forEach((billNo) => {
      getBillByNo(billNo, { signal: controller.signal })
        .then((bill) => setLoadedBills((previous) => ({ ...previous, [billNo]: bill })))
        .catch(() => {}); // 조회에 실패해도 비교는 의안번호로 계속 보여줍니다.
    });
    return () => controller.abort();
  }, [a, b, isSaved]);

  const handleResult = useCallback((result) => {
    const key = `${a}:${b}`;
    setShown((previous) => (previous?.key === key && previous.result === result ? previous : { key, result }));
  }, [a, b, setShown]);

  // 저장한 비교에 저장 뒤 받은 AI 요약을 더합니다 (이미 있으면 그대로 둡니다).
  const addSummary = useCallback((billNo, summary) => compareActions.update(a, b, (item) =>
    Object.hasOwn(item.summaries, billNo) ? item : { ...item, summaries: { ...item.summaries, [billNo]: summary } }), [compareActions, a, b]);

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
  const bills = [a, b].map((billNo, index) => loadedBills[billNo] || getCachedBill(billNo) ||
    (saved && saved.bills[index === 0 ? "a" : "b"]) || knownBills.find((bill) => bill.bill_no === billNo) || {
    bill_no: billNo, bill_name: `의안번호 ${billNo}`, status: "UNKNOWN", matched_keywords: [],
  });

  // 지금 화면의 비교 결과와, 이미 받아 둔 AI 요약을 함께 저장합니다.
  function toggleSaved() {
    if (saved) {
      compareActions.remove(a, b);
      return;
    }
    if (!current) return;
    const summaries = {};
    bills.forEach((bill) => {
      const summary = getCachedSummary(bill.bill_no);
      if (summary) summaries[bill.bill_no] = summary.summary;
    });
    compareActions.save({
      a, b,
      bills: { a: pickBill(bills[0]), b: pickBill(bills[1]) },
      rows: current.rows,
      summaries,
      savedAt: new Date().toISOString(),
    });
  }

  return (
    <section className="compare-page page-width">
      <Link className="back-link" to="/search">← 법률안 검색으로</Link>
      <div className="compare-head">
        <h1>두 법안, 어떤 점이 다를까요?</h1>
        <div className="compare-save">
          <button
            type="button"
            className={`save-button${saved ? " is-saved" : ""}`}
            onClick={toggleSaved}
            disabled={!saved && !current}
            aria-pressed={Boolean(saved)}
            title={!saved && !current ? "비교 결과가 나온 뒤 저장할 수 있어요" : undefined}
          >
            <Icon name={saved ? "bookmarkFilled" : "bookmark"} size={17} />
            <span>{saved ? "비교 저장됨" : "비교 저장"}</span>
          </button>
        </div>
      </div>
      <p className="compare-intro">주제별 차이점을 나란히 살펴보세요.</p>
      <div className="comparison-grid">
        {bills.map((bill) => (
          <ComparisonCard
            key={bill.bill_no}
            bill={bill}
            letter={bill.bill_no === a ? "A" : "B"}
            savedSummary={saved && Object.hasOwn(saved.summaries, bill.bill_no) ? saved.summaries[bill.bill_no] : undefined}
            onSummary={saved ? addSummary : undefined}
          />
        ))}
      </div>
      <ComparisonResult
        key={JSON.stringify([a, b, version])}
        a={a}
        b={b}
        initialRows={saved?.rows}
        onResult={handleResult}
        onRetry={() => setVersion((value) => value + 1)}
      />
    </section>
  );
}

function ComparisonCard({ bill, letter, savedSummary, onSummary }) {
  const billNo = bill.bill_no;
  const [cardRef, { status, info }] = useBillInfo(billNo);
  const link = info?.link || bill.link || null;
  const handleSummary = useCallback((summary) => onSummary?.(billNo, summary), [onSummary, billNo]);

  return (
    <article className="comparison-card" ref={cardRef}>
      <div className="card-topline">
        <span className={`comparison-letter is-${letter.toLowerCase()}`}>법안 {letter}</span>
        <StatusBadge status={bill.status} />
      </div>
      <h2>{bill.bill_name}</h2>
      <BillMeta bill={bill} info={info} showNumber />
      <BillSummary bill={bill} initialSummary={savedSummary} onSummary={onSummary ? handleSummary : undefined} />
      {link ? (
        <a className="text-link" href={link} target="_blank" rel="noopener noreferrer">
          원문 보기<Icon name="external" size={15} /><span className="sr-only"> (새 탭)</span>
        </a>
      ) : <BillLinkNotice status={status} link={link} />}
    </article>
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

// initialRows: 저장한 비교의 결과. 있으면 서버에 요청하지 않습니다.
// 처음 그릴 때만 읽습니다(저장을 취소해도 다시 요청하지 않도록). 새로 요청하려면 key를 바꿉니다.
function ComparisonResult({ a, b, initialRows, onResult, onRetry }) {
  const [start] = useState(() => ({ rows: initialRows }));
  const [state, setState] = useState(() =>
    start.rows ? { status: "done", result: { rows: start.rows } } : { status: "loading" });

  useEffect(() => {
    if (start.rows) return undefined;
    let active = true;
    compareBills(a, b).then((result) => {
      if (active) setState({ status: "done", result });
    }).catch((error) => {
      if (active) setState({ status: "error", message: error.message });
    });
    return () => { active = false; };
  }, [a, b, start]);

  useEffect(() => {
    if (state.status === "done") onResult?.(state.result);
  }, [state, onResult]);

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
