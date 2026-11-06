import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import ComparePage from './pages/ComparePage';

function App() {
  return (
    <BrowserRouter>
      {/* 상단 공통 네비게이션 헤더 */}
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>law_AI</h2>
        <nav style={{ display: 'flex', gap: '12px' }}>
          <Link to="/" style={{ textDecoration: 'none', color: '#2563eb' }}>검색</Link>
          <Link to="/compare" style={{ textDecoration: 'none', color: '#2563eb' }}>비교</Link>
        </nav>
      </header>

      {/* 페이지 라우팅 */}
      <main>
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/compare" element={<ComparePage />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;