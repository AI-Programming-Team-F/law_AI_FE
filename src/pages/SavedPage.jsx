import { Link } from "react-router-dom";
import BillCard from "../components/BillCard";
import Icon from "../components/Icon";
function CompareSide({ letter, bill }) {
  return (
    <span className={`saved-compare-side is-${letter.toLowerCase()}`}>
      <small>법안 {letter} · 의안번호 {bill.bill_no}</small>
      <span>{bill.bill_name}</span>
    </span>
  );
}

// 저장한 비교: 줄을 누르면 저장한 AI 요약·비교 결과를 그대로 보여주는 비교 화면으로 갑니다.
// A·B 글 칸을 같은 너비로 두어 VS가 두 법안 사이 가운데에 오고, '저장됨' 버튼은 맨 오른쪽 칸에 둡니다(누르면 저장 취소).
// 줄 전체를 덮는 링크 위에 버튼만 따로 눌리도록 겹쳐 둡니다(링크 안에 버튼을 넣지 않음).
function SavedCompares({ items, onRemove }) {
  return (
    <section className="saved-compares" aria-labelledby="saved-compares-heading">
      <h2 id="saved-compares-heading">
        저장한 비교 <span>{items.length}</span>
      </h2>
      <p className="saved-compares-intro">누르면 AI 요약과 비교 결과를 저장한 그대로 보여 드려요.</p>
      <ul>
        {items.map((item) => (
          <li key={`${item.a}:${item.b}`} className="saved-compare">
            <Link
              className="saved-compare-link"
              to={`/compare?${new URLSearchParams({ a: item.a, b: item.b })}`}
              aria-label={`${item.bills.a.bill_name}(${item.a})와 ${item.bills.b.bill_name}(${item.b}) 저장한 비교 보기`}
            />
            <CompareSide letter="A" bill={item.bills.a} />
            <span className="saved-compare-vs" aria-hidden="true">VS</span>
            <CompareSide letter="B" bill={item.bills.b} />
            <button
              type="button"
              className="save-button is-saved"
              onClick={() => onRemove(item.a, item.b)}
              aria-pressed="true"
              aria-label={`${item.a}와 ${item.b} 비교 저장 취소`}
            >
              <Icon name="bookmarkFilled" size={17} />
              <span>저장됨</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SavedPage({
  savedBills,
  onToggleSave,
  selectedBills,
  onToggleCompare,
  savedCompares = [],
  onRemoveCompare,
}) {
  const selectedIds = selectedBills.map((bill) => bill.bill_no);

  return (
    <section className="saved-page page-width" aria-labelledby="saved-heading">
      {/* 맨 위는 전체 개수(사이드바 숫자와 같음), 아래에 저장한 비교 → 저장한 법안 순서 */}
      <h1 id="saved-heading">
        저장한 법안·비교 <span>{savedBills.length + savedCompares.length}</span>
      </h1>
      {savedCompares.length > 0 && (
        <SavedCompares items={savedCompares} onRemove={onRemoveCompare} />
      )}
      <h2 className="saved-subheading">
        저장한 법안 <span>{savedBills.length}</span>
      </h2>
      <p className="saved-intro" id="selection-help">
        여기서도 <strong>2개</strong>를 골라 비교할 수 있어요.
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
          <Link className="button button-soft" to="/search">
            법안 검색하러 가기
          </Link>
        </div>
      )}
    </section>
  );
}
