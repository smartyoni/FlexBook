
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { getTransactions, getProjects } from '../db';
import { Transaction, Project } from '../types';
import { formatCurrency } from '../utils';

const Statistics: React.FC = () => {
  const [period, setPeriod] = useState<'month' | 'year' | 'all'>('month');
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
    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      return transactions.filter(t => t.date >= start);
    } else if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1).toISOString();
      return transactions.filter(t => t.date >= start);
    }
    return transactions;
  }, [transactions, period]);

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
        <h1 className="text-2xl font-black tracking-tight text-slate-800">통계 보고서</h1>
      </header>

      <div className="p-4 md:px-8 space-y-6 pb-12">
        {/* Period Selector */}
        <div className="flex p-1 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md">
          {['month', 'year', 'all'].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p as any)}
              className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                period === p ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {p === 'month' ? '이번 달' : p === 'year' ? '올해' : '전체'}
            </button>
          ))}
        </div>

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
                  <div key={d.name} className="flex items-center justify-between">
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

        {/* Project Ranking Table */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">항목별 수익성 순위</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectProfits.map((p, idx) => (
              <div key={p.name} className="bg-slate-50 p-5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg font-black text-slate-300">#{idx + 1}</span>
                  <span className="text-sm font-bold text-slate-700">{p.name}</span>
                </div>
                <span className={`text-sm font-black ${p.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {p.profit >= 0 ? '+' : ''}{formatCurrency(p.profit)}
                </span>
              </div>
            ))}
            {projectProfits.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 font-bold">항목 데이터가 없습니다.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
