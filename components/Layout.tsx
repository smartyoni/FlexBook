
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Wallet, FolderKanban, BarChart3, MoreHorizontal, Landmark, CalendarClock, AlertCircle, ListTree } from 'lucide-react';

const Layout: React.FC = () => {
  const location = useLocation();
  const navItems = [
    { to: '/', label: '가계부', icon: <Wallet size={20} /> },
    { to: '/category-analysis', label: '카테고리별', icon: <ListTree size={20} /> },
    { to: '/statistics', label: '통계 분석', icon: <BarChart3 size={20} /> },
    { to: '/scheduled', label: '예정된 지출', icon: <AlertCircle size={20} /> },
    { to: '/recurring', label: '고정지출', icon: <CalendarClock size={20} /> },
    { to: '/balances', label: '통장잔고', icon: <Landmark size={20} /> },
    { to: '/projects', label: '항목 관리', icon: <FolderKanban size={20} /> },
    { to: '/settings', label: '더보기', icon: <MoreHorizontal size={20} /> },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 fixed h-full z-50">
        <div className="p-6 flex items-center space-x-3">
          <img src="/FlexBook/logo.svg" alt="FlexBook" className="w-10 h-10 rounded-xl shadow-lg shadow-blue-200" />
          <span className="text-xl font-black tracking-tight text-slate-800">FlexBook</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-blue-50 text-blue-600 font-bold' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4">
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Cloud Storage</p>
            <p className="text-xs text-blue-700 leading-relaxed font-medium">데이터는 Firebase에<br/>안전하게 저장됩니다.</p>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen relative">
        <div className="flex-1 w-full max-w-5xl mx-auto pb-20 md:pb-8">
          <Outlet />
        </div>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center justify-around px-4 z-50">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  isActive ? 'text-blue-600 font-medium' : 'text-slate-400'
                }`
              }
            >
              {item.icon}
              <span className="text-[10px] leading-none">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </main>
    </div>
  );
};

export default Layout;
