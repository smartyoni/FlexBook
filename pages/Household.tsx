
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search, Landmark } from 'lucide-react';
import { getTransactions, getAccountBalances } from '../db';
import { Transaction, MonthlySummary, AccountBalance } from '../types';
import { formatCurrency, getMonthYear, formatDate } from '../utils';
import { TransactionModal } from '../components/Modals';

const Household: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allBalances, setAllBalances] = useState<AccountBalance[]>([]);
  const [summary, setSummary] = useState<MonthlySummary>({ income: 0, expense: 0, balance: 0 });
  const [latestManualBalance, setLatestManualBalance] = useState<AccountBalance | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Firestore 실시간 리스너 설정
  useEffect(() => {
    const unsubscribeTransactions = getTransactions((data) => {
      setAllTransactions(data);
    });

    const unsubscribeBalances = getAccountBalances((data) => {
      // 최신 기록 추출
      if (data.length > 0) {
        const sorted = [...data].sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLatestManualBalance(sorted[0]);
      }
      setAllBalances(data);
    });

    // 클린업: 구독 해제
    return () => {
      unsubscribeTransactions();
      unsubscribeBalances();
    };
  }, []);

  // 현재 월의 거래 필터링 및 요약 계산
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    // 현재 월의 거래만 필터링
    const monthTransactions = allTransactions.filter(t => t.date >= startDate && t.date <= endDate);

    const inc = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);
    const exp = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    setSummary({ income: inc, expense: exp, balance: inc - exp });
  }, [allTransactions, currentDate]);

  const changeMonth = (delta: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1);
    setCurrentDate(newDate);
  };

  const filteredTransactions = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    return allTransactions.filter(t => {
      const matchMonth = t.date >= startDate && t.date <= endDate;
      const matchType = filterType === 'all' || t.type === filterType;
      const matchSearch = t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchMonth && matchType && matchSearch;
    });
  }, [allTransactions, filterType, searchQuery, currentDate]);

  const groupedTransactions = useMemo<{ [key: string]: Transaction[] }>(() => {
    const groups: { [key: string]: Transaction[] } = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const handleEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 p-4 md:p-8 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button onClick={() => changeMonth(-1)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all">
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{getMonthYear(currentDate)}</h1>
          <button onClick={() => changeMonth(1)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all">
            <ChevronRight size={24} />
          </button>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="hidden md:flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 font-bold"
        >
          <Plus size={20} />
          <span>새 거래 입력</span>
        </button>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="md:hidden p-2 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-4 md:px-8 space-y-6">
        {/* Manual Balance Indicator (Mini) */}
        {latestManualBalance && (
          <div className="bg-white px-6 py-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Landmark size={18} className="text-blue-500" />
              <span className="text-xs font-bold text-slate-500">최신 통장잔고 기록</span>
            </div>
            <span className="text-sm font-black text-slate-800">{formatCurrency(latestManualBalance.amount)}</span>
          </div>
        )}

        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">이달의 수입</p>
            <p className="text-2xl font-black text-blue-600">{formatCurrency(summary.income)}</p>
          </div>
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">이달의 지출</p>
            <p className="text-2xl font-black text-red-500">{formatCurrency(summary.expense)}</p>
          </div>
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl shadow-slate-200 flex flex-col justify-between">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">수입지출상계금액</p>
            <p className={`text-2xl font-black ${summary.balance >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {summary.balance >= 0 ? '+' : ''}{formatCurrency(summary.balance)}
            </p>
          </div>
        </div>

        {/* Filters and List code continues... */}
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 flex items-center bg-white rounded-2xl border border-slate-200 px-4 py-1 shadow-sm">
            <Search size={18} className="text-slate-400 mr-2" />
            <input 
              type="text" 
              placeholder="내용 또는 카테고리 검색..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 py-3 text-sm outline-none bg-transparent"
            />
          </div>
          <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
            {['all', 'income', 'expense'].map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f as any)}
                className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  filterType === f ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? '전체' : f === 'income' ? '수입' : '지출'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)).map((date) => (
            <div key={date} className="space-y-3">
              <div className="flex items-center space-x-3 px-1">
                <div className="h-px flex-1 bg-slate-200"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-tighter">{formatDate(date)}</p>
                <div className="h-px flex-1 bg-slate-200"></div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {groupedTransactions[date].map((t) => (
                  <div 
                    key={t.id} 
                    onClick={() => handleEdit(t)}
                    className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${t.type === 'income' ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                        {t.type === 'income' ? '💰' : '💸'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-lg">{t.description}</p>
                        <div className="flex items-center text-xs font-bold text-slate-400 space-x-2 uppercase">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md">{t.category}</span>
                          {t.projectId && (
                            <span className="text-blue-500 font-black"># PROJECT</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${t.type === 'income' ? 'text-blue-600' : 'text-slate-800'}`}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="py-24 text-center space-y-4">
              <div className="text-6xl grayscale opacity-30">📂</div>
              <p className="text-slate-400 font-bold text-lg">데이터가 존재하지 않습니다.</p>
            </div>
          )}
        </div>
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        initialData={editingTransaction}
        onSave={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
          // Firestore는 실시간으로 자동 업데이트되므로 추가 액션 불필요
        }}
      />
    </div>
  );
};

export default Household;
