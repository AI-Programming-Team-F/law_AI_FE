import { useEffect, useRef, useState } from "react";
import { getBillSummary, getCachedSummary, STATUS_LABELS } from "../api/bills";
import { useBillInfo } from "../hooks/useBillInfo";
import { originalParagraphs } from "../utils/original";
import Icon from "./Icon";
import PersonalSummary from "./PersonalSummary";

const STATUS = {
  PASSED: { label: STATUS_LABELS.PASSED, className: "passed" },
  MERGED: { label: STATUS_LABELS.MERGED, className: "merged" },
  REVIEW: { label: STATUS_LABELS.REVIEW, className: "review" },
  UNKNOWN: { label: STATUS_LABELS.UNKNOWN, className: "other" },
  OTHER: { label: STATUS_LABELS.OTHER, className: "other" },
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

function keywordPattern(words) {
  return words
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
}

// 글 안에서 검색어가 나온 횟수 (접힌 원문 제목 옆에 표시)
function countMatches(text, keywords) {
  const words = keywords.filter(Boolean);
  if (!words.length || !text) return 0;
  return (text.match(new RegExp(keywordPattern(words), "gi")) || []).length;
}

function Highlight({ text, keywords }) {
  const words = keywords.filter(Boolean);
  if (!words.length) return text;
  const pattern = keywordPattern(words);
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

// 소관위 · 발의자 · 발의일 (있는 값만 표시)
export function BillMeta({ bill, info, showNumber = false }) {
  const proposeDate = info?.propose_date || bill.propose_date;
  const items = [
    bill.committee,
    info?.proposer,
    proposeDate && `${proposeDate} 발의`,
    showNumber && `의안번호 ${bill.bill_no}`,
  ].filter(Boolean);
  if (!items.length) return null;
  return (
    <p className="bill-meta bill-meta-clip">
      <span className="bill-meta-items">
        {items.map((item) => (
          <span className="bill-meta-item" key={item}>
            <span className="meta-divider" aria-hidden="true">·</span>
            <span>{item}</span>
          </span>
        ))}
      </span>
    </p>
  );
}

// 불러오는 중에는 표시하지 않아 문구가 깜빡이지 않게 합니다.
export function BillLinkNotice({ status, link }) {
  if (link || status === "loading") return null;
  return (
    <p className="bill-meta">
      {status === "error" ? "원문 링크를 불러오지 못했어요." : "원문 링크가 제공되지 않았어요."}
    </p>
  );
}

// AI 요약: 처음에는 버튼만 두고, 누른 법안만 서버에 요약을 요청합니다 (README 2-2, 8-2).
// personal이면 요약 아래에 "이 법안이 적용되면?"을 이어서 보여줍니다 (검색·저장 카드만).
export function BillSummary({ bill, personal = false }) {
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
      {state.status === "done" ? (
        <>
          <span className="summary-label">AI 요약</span>
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
          {personal && state.summary && (
            <PersonalSummary
              bill={bill}
              renderStage={(status) => <StatusBadge status={status} />}
            />
          )}
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
  highlightTerms = [],
  showSimilarity = false,
}) {
  // 검색어를 띄어쓰기로 나눈 단어로 제목과 원문의 일치 부분을 표시합니다.
  const terms = highlightTerms.filter(Boolean);
  const paragraphs = originalParagraphs(bill.proposal_text);
  const matchCount = countMatches(paragraphs.map((line) => line.text).join("\n"), terms);
  const [cardRef, { status: infoStatus, info }] = useBillInfo(bill.bill_no);
  const link = info?.link || bill.link || null;
  const highlightedTitle = (
    <Highlight text={bill.bill_name} keywords={terms.length ? terms : bill.matched_keywords || []} />
  );
  return (
    <article
      ref={cardRef}
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
        {link ? (
          <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`${bill.bill_name} 원문 새 탭에서 보기`}>
            {highlightedTitle}
            <Icon name="external" size={17} />
          </a>
        ) : highlightedTitle}
      </h3>
      <BillMeta bill={bill} info={info} />
      <BillLinkNotice status={infoStatus} link={link} />
      {paragraphs.length > 0 && (
        <details className="bill-original">
          <summary>
            제안이유 및 주요내용
            {matchCount > 0 && <span className="match-count">검색어 {matchCount}곳</span>}
          </summary>
          <div className="bill-original-body">
            {paragraphs.map((line, index) => (
              <p key={index} className={line.gapBefore ? "has-gap" : undefined}>
                <Highlight text={line.text} keywords={terms} />
              </p>
            ))}
          </div>
        </details>
      )}
      {showSimilarity && Number.isFinite(bill.score) && (
        <p className="bill-similarity" title="서버가 키워드와 의미 유사도로 계산한 관련도입니다.">
          관련도 <strong>{Math.round(bill.score * 100)}%</strong>
        </p>
      )}
      {bill.proposal_text === "" ? (
        <p className="bill-meta">제안이유 및 주요내용이 아직 등록되지 않아 AI 요약을 제공할 수 없어요.</p>
      ) : (
        <BillSummary bill={bill} personal />
      )}
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
