import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import SearchPage from "./pages/SearchPage";
import ComparePage from "./pages/ComparePage";
import SavedPage from "./pages/SavedPage";
import CompareTray from "./components/CompareTray";
import Icon from "./components/Icon";
import Logo from "./components/Logo";
import { SAVED_COMPARES_KEY, isSameCompare, loadSavedCompares, upsertCompare } from "./utils/savedCompares";
import "./App.css";

const SAVED_KEY = "beopan-itda:saved-bills:v2";

// 저장한 법안은 로그인 기능이 없어서 이 브라우저(localStorage)에만 보관합니다.
function loadSavedBills() {
  try {
    const value = JSON.parse(localStorage.getItem(SAVED_KEY));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  // 페이지를 이동하거나 다시 검색해도 검색어, 비교 바구니, 저장 목록을 유지합니다.
  const [query, setQuery] = useState("");
  const [homeKey, setHomeKey] = useState(0);
  const [selectedBills, setSelectedBills] = useState([]);
  const [savedBills, setSavedBills] = useState(loadSavedBills);
  const [savedCompares, setSavedCompares] = useState(() => loadSavedCompares());

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedBills));
    } catch {
      // 저장 공간을 쓸 수 없는 환경(시크릿 모드 등)에서는 화면 상태로만 유지합니다.
    }
  }, [savedBills]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_COMPARES_KEY, JSON.stringify(savedCompares));
    } catch {
      // 위와 같이 화면 상태로만 유지합니다.
    }
  }, [savedCompares]);

  // 저장한 비교: 저장·삭제, 그리고 저장 뒤에 받은 AI 요약·맞춤 요약·새 비교 결과를 더합니다.
  const compareActions = useMemo(() => ({
    save: (entry) => setSavedCompares((previous) => upsertCompare(previous, entry)),
    remove: (a, b) => setSavedCompares((previous) => previous.filter((item) => !isSameCompare(item, a, b))),
    update: (a, b, change) => setSavedCompares((previous) => {
      let changed = false;
      const next = previous.map((item) => {
        if (!isSameCompare(item, a, b)) return item;
        const updated = change(item);
        changed = updated !== item;
        return updated;
      });
      return changed ? next : previous;
    }),
  }), []);

  // 로고를 누르면 검색어를 비우고 첫 화면(기능 소개)으로 돌아갑니다.
  function goHome() {
    setQuery("");
    setHomeKey((key) => key + 1);
    navigate("/");
    window.scrollTo(0, 0);
  }

  function toggleCompare(bill) {
    setSelectedBills((previous) => {
      if (previous.some((item) => item.bill_no === bill.bill_no)) {
        return previous.filter((item) => item.bill_no !== bill.bill_no);
      }
      return previous.length < 2 ? [...previous, bill] : previous;
    });
  }

  function toggleSave(bill) {
    setSavedBills((previous) =>
      previous.some((item) => item.bill_no === bill.bill_no)
        ? previous.filter((item) => item.bill_no !== bill.bill_no)
        : [bill, ...previous],
    );
  }

  const compareUrl = selectedBills.length === 2
    ? `/compare?${new URLSearchParams({ a: selectedBills[0].bill_no, b: selectedBills[1].bill_no })}`
    : "/compare";
  const searchPage = (
    <SearchPage
      key={`${location.pathname}:${homeKey}`}
      query={location.pathname === "/" ? "" : query}
      setQuery={setQuery}
      onGoHome={goHome}
      compareUrl={compareUrl}
      selectedBills={selectedBills}
      onToggleCompare={toggleCompare}
      savedBills={savedBills}
      onToggleSave={toggleSave}
    />
  );

  const showTray = location.pathname !== "/compare" && selectedBills.length > 0;
  // 사이드바 '저장한 법안' 숫자: 저장한 법안 + 저장한 비교
  const savedCount = savedBills.length + savedCompares.length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link
          className="brand"
          to="/"
          onClick={goHome}
          aria-label="법안잇다 홈으로"
        >
          <Logo />
        </Link>
        <nav className="side-nav" aria-label="주 메뉴">
          <NavLink to="/" end onClick={goHome}>
            <Icon name="home" size={20} />
            홈
          </NavLink>
          <NavLink to="/search">
            <Icon name="search" size={20} />
            유사법안 검색
          </NavLink>
          <NavLink to="/saved">
            <Icon name="bookmark" size={20} />
            저장한 법안
            {savedCount > 0 && (
              <span className="nav-count" aria-label={`법안 ${savedBills.length}건, 비교 ${savedCompares.length}건`}>
                {savedCount}
              </span>
            )}
          </NavLink>
          <NavLink to={compareUrl}>
            <Icon name="scale" size={20} />
            비교하기
          </NavLink>
        </nav>
        <span className="assembly-label">
          <span aria-hidden="true" />
          22대 국회 발의법률안
        </span>
      </aside>
      <div className={`app-main${showTray ? " has-selection" : ""}`}>
        <main id="main-content">
          <Routes>
            <Route path="/" element={searchPage} />
            <Route path="/search" element={searchPage} />
            <Route
              path="/saved"
              element={
                <SavedPage
                  savedBills={savedBills}
                  onToggleSave={toggleSave}
                  selectedBills={selectedBills}
                  onToggleCompare={toggleCompare}
                  savedCompares={savedCompares}
                  onRemoveCompare={compareActions.remove}
                />
              }
            />
            <Route
              path="/compare"
              element={
                <ComparePage
                  knownBills={[...selectedBills, ...savedBills]}
                  savedCompares={savedCompares}
                  compareActions={compareActions}
                />
              }
            />
            <Route
              path="*"
              element={
                <section className="empty-state page-width">
                  <h1>페이지를 찾을 수 없어요</h1>
                  <Link className="button button-primary" to="/search">
                    검색 화면으로
                  </Link>
                </section>
              }
            />
          </Routes>
        </main>
        <footer className="site-footer page-width">
          <span className="footer-brand">
            법안잇다 <span>흩어진 법안의 조각, 한눈에 잇다</span>
          </span>
          <p>
            법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요.
          </p>
        </footer>
      </div>
      {showTray && (
        <CompareTray bills={selectedBills} onRemove={toggleCompare} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <AppLayout />
    </BrowserRouter>
  );
}
