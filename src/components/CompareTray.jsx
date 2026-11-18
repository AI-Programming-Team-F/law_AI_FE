import { Link } from "react-router-dom";
import Icon from "./Icon";

// 하단 비교 바구니. 검색어가 바뀌거나 다른 화면으로 가도 담은 법안은 유지됩니다.
export default function CompareTray({ bills, onRemove }) {
  if (!bills.length) return null;

  return (
    <aside className="compare-dock" aria-label="비교할 법률안">
      <div className="dock-info">
        <span className="dock-icon">
          <Icon name="scale" size={21} />
        </span>
        <div>
          <strong>
            비교할 법안 <span>{bills.length}/2</span>
          </strong>
          <p>
            {bills.length === 2
              ? "선택한 두 법안을 나란히 살펴보세요."
              : "다른 키워드로 검색해서 하나 더 담을 수 있어요."}
          </p>
        </div>
      </div>
      <div className="selected-bills">
        {bills.map((bill, index) => (
          <button
            key={bill.bill_no}
            onClick={() => onRemove(bill)}
            aria-label={`${bill.bill_name} 비교 선택 해제`}
            title={bill.bill_name}
          >
            <span>{index + 1}</span>
            <span className="selected-name">{bill.bill_name}</span>
            <Icon name="close" size={14} />
          </button>
        ))}
      </div>
      {bills.length === 2 ? (
        <Link
          className="button button-primary"
          aria-label="선택한 두 법안 비교하기"
          title="선택한 두 법안 비교하기"
          to={`/compare?${new URLSearchParams({ a: bills[0].bill_no, b: bills[1].bill_no })}`}
        >
          <Icon name="scale" size={23} />
        </Link>
      ) : (
        <button className="button button-primary" aria-label="법안 2개를 선택하면 비교할 수 있어요" disabled>
          <Icon name="scale" size={23} />
        </button>
      )}
    </aside>
  );
}
