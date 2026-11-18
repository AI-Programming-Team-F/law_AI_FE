import { useEffect, useRef, useState } from "react";
import { getBillSummary, getCachedSummary } from "../api/bills";
import Icon from "./Icon";

const STATUS = {
  PASSED: { label: "본회의 통과", className: "passed" },
  MERGED: { label: "대안에 반영(폐기)", className: "merged" },
  REVIEW: { label: "심사 중", className: "review" },
  UNKNOWN: { label: "처리 결과 미제공", className: "other" },
  OTHER: { label: "기타", className: "other" },
};

export function StatusBadge({ status }) {
  const item = STATUS[status] || STATUS.OTHER;
  return (
    <span className={`status-badge ${item.className}`}>
      <span aria-hidden="true" />
      {item.label}
    </span>
  );
}

function Highlight({ text, keywords }) {
  const words = keywords.filter(Boolean);
  if (!words.length) return text;
  const pattern = words
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  return text
    .split(new RegExp(`(${pattern})`, "gi"))
    .map((part, index) =>
      words.some((word) => word.toLowerCase() === part.toLowerCase()) ? (
        <mark key={index}>{part}</mark>
      ) : (
        part
      ),
    );
}

// AI 요약: 처음에는 버튼만 두고, 누른 법안만 서버에 요약을 요청합니다 (README 2-2, 8-2).
export function BillSummary({ bill }) {
  const billNo = bill.bill_no;
  const [state, setState] = useState(() => {
    const cached = getCachedSummary(billNo);
    return cached ? { status: "done", summary: cached.summary } : { status: "idle" };
  });
  const textRef = useRef(null);
  const retryRef = useRef(null);
  const requested = useRef(false);

  // 버튼을 눌러 결과가 나오면 사라진 버튼 대신 요약 글(실패하면 다시 시도 버튼)로 포커스를 옮깁니다.
  useEffect(() => {
    if (!requested.current || state.status === "loading") return;
    requested.current = false;
    (state.status === "done" ? textRef : retryRef).current?.focus();
  }, [state.status]);

  async function load() {
    requested.current = true;
    setState({ status: "loading" });
    try {
      const result = await getBillSummary(billNo);
      setState({ status: "done", summary: result.summary });
    } catch (error) {
      setState({ status: "error", message: error.message });
    }
  }

  return (
    <div className="summary-box">
      <span className="summary-label">AI 요약</span>
      {state.status === "done" ? (
        <>
          <p
            ref={textRef}
            tabIndex={-1}
            className={state.summary ? "summary-text" : "summary-text summary-unavailable"}
          >
            {state.summary ? (
              <Highlight text={state.summary} keywords={bill.matched_keywords || []} />
            ) : (
              "요약을 준비하지 못했어요. 원문 링크를 확인하세요."
            )}
          </p>
          <small>AI가 생성한 요약이며 원문과 다를 수 있습니다.</small>
        </>
      ) : state.status === "error" ? (
        <div className="summary-action">
          <span className="summary-error" role="alert">요약을 불러오지 못했어요. {state.message}</span>
          <button
            ref={retryRef}
            type="button"
            className="summary-button"
            onClick={load}
          >
            다시 시도
          </button>
        </div>
      ) : (
        <div className="summary-action">
          <button
            type="button"
            className="summary-button"
            onClick={load}
            disabled={state.status === "loading"}
            aria-busy={state.status === "loading"}
            aria-label={`${bill.bill_name} AI 요약 확인하기`}
          >
            {state.status === "loading" ? (
              <>
                <span className="summary-spinner" aria-hidden="true" />
                요약하는 중…
              </>
            ) : (
              "AI 요약 확인하기"
            )}
          </button>
          <span className="summary-hint">필요한 법안만 요약해요</span>
        </div>
      )}
    </div>
  );
}

export default function BillCard({
  bill,
  selected,
  disabled,
  onToggle,
  saved,
  onToggleSave,
}) {
  return (
    <article
      className={`bill-card${selected ? " is-selected" : ""}`}
      aria-labelledby={`bill-${bill.bill_no}`}
    >
      <div className="card-topline">
        <StatusBadge status={bill.status} />
        <div className="card-actions">
          <span className="bill-number">의안번호 {bill.bill_no}</span>
          <button
            type="button"
            className={`save-button${saved ? " is-saved" : ""}`}
            onClick={onToggleSave}
            aria-pressed={saved}
            aria-label={`${bill.bill_name} ${saved ? "저장 취소" : "저장하기"}`}
          >
            <Icon name={saved ? "bookmarkFilled" : "bookmark"} size={17} />
            <span>{saved ? "저장됨" : "저장"}</span>
          </button>
        </div>
      </div>
      <h3 id={`bill-${bill.bill_no}`}>
        {bill.link ? (
          <a href={bill.link} target="_blank" rel="noopener noreferrer" aria-label={`${bill.bill_name} 원문 새 탭에서 보기`}>
            <Highlight text={bill.bill_name} keywords={bill.matched_keywords || []} />
            <Icon name="external" size={17} />
          </a>
        ) : bill.bill_name}
      </h3>
      {(bill.committee || bill.propose_date) && (
        <p className="bill-meta">
          {bill.committee && <span>{bill.committee}</span>}
          {bill.committee && bill.propose_date && <span className="meta-divider" aria-hidden="true">·</span>}
          {bill.propose_date && <span>{bill.propose_date} 발의</span>}
        </p>
      )}
      {!bill.link && <p className="bill-meta">원문 링크가 제공되지 않았어요.</p>}
      {bill.proposal_text && (
        <details className="bill-original">
          <summary>제안이유 및 주요내용</summary>
          <p>{bill.proposal_text}</p>
        </details>
      )}
      <BillSummary bill={bill} />
      <div className="card-bottom">
        <div className="keyword-tags" aria-label="매칭된 키워드">
          {(bill.matched_keywords || []).map((keyword) => (
            <span key={keyword}>#{keyword}</span>
          ))}
        </div>
        <label className={`compare-checkbox${disabled ? " is-disabled" : ""}`}>
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            onChange={onToggle}
            aria-label={`${bill.bill_name} 비교에 담기`}
            aria-describedby="selection-help"
          />
          <span>
            {selected
              ? "비교에 담았어요"
              : disabled
                ? "최대 2건 선택"
                : "비교에 담기"}
          </span>
        </label>
      </div>
    </article>
  );
}
