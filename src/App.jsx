import { useState } from "react";
import { BrowserRouter, Link, NavLink, Route, Routes } from "react-router-dom";
import { MOCK_SEARCH_RESULTS } from "./api/mock";
import SearchPage from "./pages/SearchPage";
import ComparePage from "./pages/ComparePage";
import "./App.css";

export default function App() {
  // 페이지를 이동해도 검색어와 비교 바구니를 유지합니다.
  const [query, setQuery] = useState(MOCK_SEARCH_RESULTS.query);
  const [selectedIds, setSelectedIds] = useState([]);

  return (
    <BrowserRouter>
      <a className="skip-link" href="#main-content">
        본문으로 건너뛰기
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" to="/" aria-label="law AI 홈">
            <span className="brand-symbol" aria-hidden="true">
              L<span>·</span>
            </span>
            <span>
              law<span className="brand-accent">_AI</span>
            </span>
          </Link>
          <nav className="main-nav" aria-label="주 메뉴">
            <NavLink to="/" end>
              법률안 검색
            </NavLink>
            <NavLink to="/compare">법률안 비교</NavLink>
          </nav>
          <span className="assembly-label">
            <span aria-hidden="true" />
            22대 국회
          </span>
        </div>
      </header>
      <main id="main-content">
        <Routes>
          <Route
            path="/"
            element={
              <SearchPage
                query={query}
                setQuery={setQuery}
                selectedIds={selectedIds}
                setSelectedIds={setSelectedIds}
              />
            }
          />
          <Route path="/compare" element={<ComparePage />} />
          <Route
            path="*"
            element={
              <section className="empty-state page-width">
                <h1>페이지를 찾을 수 없어요</h1>
                <Link className="button button-primary" to="/">
                  검색 화면으로
                </Link>
              </section>
            }
          />
        </Routes>
      </main>
      <footer className="site-footer page-width">
        <span className="footer-brand">
          law_AI <span>일상과 법 사이, 더 가까이.</span>
        </span>
        <p>
          법률 자문이 아닌 정보 안내입니다. 정확한 내용은 원문을 확인하세요.
        </p>
      </footer>
    </BrowserRouter>
  );
}
