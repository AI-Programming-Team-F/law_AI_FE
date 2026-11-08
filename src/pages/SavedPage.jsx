import { Link } from "react-router-dom";
import BillCard from "../components/BillCard";
import Icon from "../components/Icon";

export default function SavedPage({
  savedBills,
  onToggleSave,
  selectedBills,
  onToggleCompare,
}) {
  const selectedIds = selectedBills.map((bill) => bill.bill_no);

  return (
    <section className="saved-page page-width" aria-labelledby="saved-heading">
      <span className="section-kicker">SAVED BILLS</span>
      <h1 id="saved-heading">
        저장한 법안 <span>{savedBills.length}</span>
      </h1>
      <p className="saved-intro" id="selection-help">
        저장한 법안은 이 브라우저에만 보관돼요. 여기서도 <strong>2개</strong>를
        골라 비교할 수 있어요.
      </p>
      {savedBills.length ? (
        <div className="bill-list">
          {savedBills.map((bill) => (
            <BillCard
              key={bill.bill_no}
              bill={bill}
              saved
              onToggleSave={() => onToggleSave(bill)}
              selected={selectedIds.includes(bill.bill_no)}
              disabled={
                selectedIds.length === 2 && !selectedIds.includes(bill.bill_no)
              }
              onToggle={() => onToggleCompare(bill)}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">
            <Icon name="bookmark" size={28} />
          </span>
          <h2>아직 저장한 법안이 없어요</h2>
          <p>검색 결과 카드의 저장 버튼을 눌러 법안을 모아 보세요.</p>
          <Link className="button button-soft" to="/">
            법안 검색하러 가기
          </Link>
        </div>
      )}
    </section>
  );
}
