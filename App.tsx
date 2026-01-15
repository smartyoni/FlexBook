
import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Household from './pages/Household';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Statistics from './pages/Statistics';
import Settings from './pages/Settings';
import CategoryManagement from './pages/CategoryManagement';
import AccountBalancePage from './pages/AccountBalance'; // 새 페이지 임포트
import { RecurringExpenses } from './pages/RecurringExpenses';
import ScheduledExpenses from './pages/ScheduledExpenses';
import { initializeDefaults } from './db';
import { isMobileDevice } from './utils';
import { OnlineStatus } from './components/OnlineStatus';
import { InstallPrompt } from './components/InstallPrompt';

const App: React.FC = () => {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 디바이스 타입 감지
  useEffect(() => {
    const checkDevice = () => {
      setIsMobile(isMobileDevice());
    };

    // 초기 감지
    checkDevice();

    // 화면 크기 변경 시 재감지
    window.addEventListener('resize', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 기본 데이터 초기화
        await initializeDefaults();
        console.log('앱 초기화 완료');

        setIsAuthReady(true);
      } catch (error) {
        console.error('앱 초기화 중 오류:', error);
        // 에러가 발생해도 앱을 로드하게 함
        setIsAuthReady(true);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <OnlineStatus />
      {isMobile && <InstallPrompt />}
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Household />} />
            <Route path="scheduled" element={<ScheduledExpenses />} /> {/* 예정된 지출 라우트 */}
            <Route path="recurring" element={<RecurringExpenses />} /> {/* 고정지출 라우트 */}
            <Route path="balances" element={<AccountBalancePage />} /> {/* 새 라우트 등록 */}
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/categories" element={<CategoryManagement />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
};

export default App;
