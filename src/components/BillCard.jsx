import Icon from "./Icon";

const STATUS = {
  PASSED: { label: "본회의 통과", className: "passed" },
  MERGED: { label: "대안에 반영(폐기)", className: "merged" },
  REVIEW: { label: "심사 중", className: "review" },
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

export default function BillCard({ bill, selected, disabled, onToggle }) {
  return (
    <article
      className={`bill-card${selected ? " is-selected" : ""}`}
      aria-labelledby={`bill-${bill.bill_no}`}
    >
      <div className="card-topline">
        <StatusBadge status={bill.status} />
        <span className="bill-number">의안번호 {bill.bill_no}</span>
      </div>
      <h3 id={`bill-${bill.bill_no}`}>
        <a
          href={bill.link}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${bill.bill_name} 원문 새 탭에서 보기`}
        >
          <Highlight text={bill.bill_name} keywords={bill.matched_keywords} />
          <Icon name="external" size={17} />
        </a>
      </h3>
      <p className="bill-meta">
        <span>{bill.committee}</span>
        <span className="meta-divider" aria-hidden="true">
          ·
        </span>
        <span>{bill.propose_date} 발의</span>
      </p>
      <div className="summary-box">
        <span className="summary-label">AI 요약</span>
        <p className={bill.summary ? "" : "summary-unavailable"}>
          {bill.summary ? (
            <Highlight text={bill.summary} keywords={bill.matched_keywords} />
          ) : (
            "요약을 준비하지 못했어요. 원문 링크를 확인하세요."
          )}
        </p>
        <small>AI가 생성한 요약이며 원문과 다를 수 있습니다.</small>
      </div>
      <div className="card-bottom">
        <div className="keyword-tags" aria-label="매칭된 키워드">
          {bill.matched_keywords.map((keyword) => (
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
