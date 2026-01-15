
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getProjects } from '../db';
import { Transaction, Project } from '../types';
import { formatCurrency } from '../utils';

type PeriodType = 'month' | 'specific-month' | 'year' | 'custom' | 'all';

// YYYY-MM => "YYYY년 M월"
const formatMonthKorean = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  return `${year}년 ${parseInt(month)}월`;
};

// YYYY-MM-DD => "YYYY년 M월 D일"
const formatDateKorean = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
};

const Statistics: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('month');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    // 실시간 리스너 설정
    const unsubscribeTxs = getTransactions((txs) => {
      setTransactions(txs);
    });

    const unsubscribeProjs = getProjects((projs) => {
      setProjects(projs);
    });

    // 클린업: 구독 해제
    return () => {
      unsubscribeTxs();
      unsubscribeProjs();
    };
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();

    switch (period) {
      case 'month': {
        // 현재 월 (기존 로직 유지)
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
          .toISOString().split('T')[0];
        return transactions.filter(t => t.date >= start);
      }

      case 'specific-month': {
        // 특정 월 선택
        if (!selectedMonth) return transactions;
        const [year, month] = selectedMonth.split('-').map(Number);
        const start = new Date(year, month - 1, 1)
          .toISOString().split('T')[0];
        const end = new Date(year, month, 0)
          .toISOString().split('T')[0];
        return transactions.filter(t => t.date >= start && t.date <= end);
      }

      case 'year': {
        // 올해 (기존 로직 유지)
        const start = new Date(now.getFullYear(), 0, 1)
          .toISOString().split('T')[0];
        return transactions.filter(t => t.date >= start);
      }

      case 'custom': {
        // 사용자 정의 기간
        if (!customStartDate || !customEndDate) return transactions;
        return transactions.filter(
          t => t.date >= customStartDate && t.date <= customEndDate
        );
      }

      case 'all':
      default:
        return transactions;
    }
  }, [transactions, period, selectedMonth, customStartDate, customEndDate]);

  const pieData = useMemo(() => {
    const expenses = filteredData.filter(t => t.type === 'expense');
    const categoryTotals: { [key: string]: number } = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const lineData = useMemo(() => {
    const groups: { [key: string]: { date: string; income: number; expense: number } } = {};
    const sorted = [...filteredData].sort((a, b) => a.date.localeCompare(b.date));
    
    sorted.forEach(t => {
      const key = period === 'all' ? t.date.substring(0, 7) : t.date;
      if (!groups[key]) groups[key] = { date: key, income: 0, expense: 0 };
      if (t.type === 'income') groups[key].income += t.amount;
      else groups[key].expense += t.amount;
    });
    return Object.values(groups);
  }, [filteredData, period]);

  const projectProfits = useMemo(() => {
    return projects.map(p => {
      const pTxs = transactions.filter(t => t.projectId === p.id);
      const profit = pTxs.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
      return { name: p.name, profit };
    }).sort((a, b) => b.profit - a.profit);
  }, [projects, transactions]);

  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 p-4 md:p-8">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">
          통계 분석
          {period === 'month' && ' - 이번 달'}
          {period === 'specific-month' && selectedMonth && ` - ${formatMonthKorean(selectedMonth)}`}
          {period === 'year' && ' - 올해'}
          {period === 'custom' && customStartDate && customEndDate &&
            ` - ${formatDateKorean(customStartDate)} ~ ${formatDateKorean(customEndDate)}`}
          {period === 'all' && ' - 전체'}
        </h1>
      </header>

      <div className="p-4 md:px-8 space-y-6 pb-12">
        {/* Period Selector */}
        <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          {[
            { value: 'month', label: '이번 달' },
            { value: 'specific-month', label: '특정 월' },
            { value: 'year', label: '올해' },
            { value: 'custom', label: '기간 설정' },
            { value: 'all', label: '전체' }
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value as PeriodType)}
              className={`flex-1 min-w-[80px] py-3 px-2 text-sm font-bold rounded-xl transition-all ${
                period === value
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Specific Month Selector */}
        {period === 'specific-month' && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              월 선택
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              max={new Date().toISOString().slice(0, 7)}
            />
          </div>
        )}

        {/* Custom Date Range Selector */}
        {period === 'custom' && (
          <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-3">
              기간 설정
            </label>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <label className="block text-xs text-slate-500 mb-1 ml-1">시작일</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>

              <span className="text-slate-400 font-bold hidden md:block">~</span>

              <div className="flex-1 w-full">
                <label className="block text-xs text-slate-500 mb-1 ml-1">종료일</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
            </div>

            {customStartDate && customEndDate && customStartDate > customEndDate && (
              <p className="mt-2 text-xs text-red-500 font-bold">
                ⚠️ 종료일은 시작일보다 이후여야 합니다.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Trend Chart */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">수입/지출 트렌드</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <XAxis dataKey="date" hide />
                  <YAxis hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Line type="monotone" dataKey="income" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={4} dot={{ r: 4, fill: '#EF4444' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Chart */}
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">카테고리별 지출 비중</h2>
            <div className="flex flex-col md:flex-row items-center">
              <div className="h-64 w-full md:w-1/2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Total</p>
                    <p className="text-lg font-black text-slate-800">
                      {formatCurrency(pieData.reduce((acc, cur) => acc + cur.value, 0))}
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-full md:w-1/2 mt-4 md:mt-0 md:pl-8 grid grid-cols-1 gap-3">
                {pieData.slice(0, 5).map((d, i) => (
                  <div
                    key={d.name}
                    onClick={() => setSelectedCategory(selectedCategory === d.name ? '' : d.name)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                      selectedCategory === d.name
                        ? 'bg-blue-50 border-2 border-blue-300'
                        : 'hover:bg-slate-50 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                      <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{d.name}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">{formatCurrency(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Category Expense Details */}
        {selectedCategory && (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">
                {selectedCategory} - 지출 내역
              </h2>
              <button
                onClick={() => setSelectedCategory('')}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-3 py-1 rounded-lg hover:bg-slate-100 transition-all"
              >
                ✕ 닫기
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredData
                .filter(t => t.type === 'expense' && t.category === selectedCategory)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800">{t.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-slate-400">{formatDate(t.date)}</span>
                        {t.projectId && (
                          <span className="text-xs text-blue-500 font-bold">
                            # {projects.find(p => p.id === t.projectId)?.name || 'Unknown'}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-black text-red-500 ml-4">
                      {formatCurrency(t.amount)}
                    </span>
                  </div>
                ))}
              {filteredData.filter(t => t.type === 'expense' && t.category === selectedCategory).length === 0 && (
                <div className="py-12 text-center text-slate-400 font-bold">
                  {selectedCategory}의 지출 항목이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
