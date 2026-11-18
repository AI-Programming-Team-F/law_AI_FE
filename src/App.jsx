import { useEffect, useState } from "react";
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

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedBills));
    } catch {
      // 저장 공간을 쓸 수 없는 환경(시크릿 모드 등)에서는 화면 상태로만 유지합니다.
    }
  }, [savedBills]);

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
            {savedBills.length > 0 && (
              <span className="nav-count" aria-label={`${savedBills.length}건`}>
                {savedBills.length}
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
                />
              }
            />
            <Route path="/compare" element={<ComparePage knownBills={[...selectedBills, ...savedBills]} />} />
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
