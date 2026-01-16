import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Transaction, Category, TransactionType } from '../types';
import { getTransactions, getCategories } from '../db';
import { formatCurrency, formatDate, getTodayString, formatDateRange, dateToString, formatDateWithDay } from '../utils';

interface CategoryAnalysisData {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  type: TransactionType;
  transactions: Transaction[];
  totalAmount: number;
  count: number;
  averageAmount: number;
}

const CategoryAnalysis: React.FC = () => {
  // 날짜 관련
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isCustomRange, setIsCustomRange] = useState<boolean>(false);
  const [customStartDate, setCustomStartDate] = useState<string>(getTodayString());
  const [customEndDate, setCustomEndDate] = useState<string>(getTodayString());

  // 데이터 관련
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // UI 관련
  const [selectedType, setSelectedType] = useState<'all' | 'income' | 'expense'>('all');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Firestore 실시간 리스너 설정
  useEffect(() => {
    const unsubscribeTransactions = getTransactions((data) => {
      setTransactions(data);
    });

    const unsubscribeCategories = getCategories((data) => {
      setCategories(data);
    });

    return () => {
      unsubscribeTransactions();
      unsubscribeCategories();
    };
  }, []);

  // 날짜 이동 함수
  const changeDay = useCallback((delta: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + delta);

    // 미래 날짜는 이동 불가
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newDate <= today) {
      setCurrentDate(newDate);
    }
  }, [currentDate]);

  // 기간별 거래 필터링
  const filteredTransactions = useMemo(() => {
    let startDate: string;
    let endDate: string;

    if (isCustomRange) {
      startDate = customStartDate;
      endDate = customEndDate;
    } else {
      // 현재 선택된 날짜만 사용
      startDate = dateToString(currentDate);
      endDate = dateToString(currentDate);
    }

    return transactions.filter((t) => {
      const matchPeriod = t.date >= startDate && t.date <= endDate;
      const matchType = selectedType === 'all' || t.type === selectedType;
      return matchPeriod && matchType;
    });
  }, [transactions, currentDate, isCustomRange, customStartDate, customEndDate, selectedType]);

  // 카테고리별 그룹화 및 통계 계산
  const categoryAnalysisData = useMemo<CategoryAnalysisData[]>(() => {
    const groupedByCategory: { [key: string]: Transaction[] } = {};

    // 거래를 카테고리별로 그룹화
    filteredTransactions.forEach((t) => {
      if (!groupedByCategory[t.category]) {
        groupedByCategory[t.category] = [];
      }
      groupedByCategory[t.category].push(t);
    });

    // 각 카테고리별 통계 계산
    return Object.entries(groupedByCategory)
      .map(([categoryName, txs]) => {
        const category = categories.find((c) => c.name === categoryName);
        const totalAmount = txs.reduce((sum, t) => sum + t.amount, 0);
        const count = txs.length;
        const averageAmount = totalAmount / count;

        return {
          categoryId: category?.id || '',
          categoryName,
          categoryIcon: category?.icon || '📊',
          categoryColor: category?.color || '#6B7280',
          type: txs[0].type,
          transactions: txs.sort((a, b) => b.date.localeCompare(a.date)),
          totalAmount,
          count,
          averageAmount,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount); // 총액 기준 내림차순
  }, [filteredTransactions, categories]);

  // 요약 통계 계산
  const summaryStats = useMemo(() => {
    const income = filteredTransactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expense = filteredTransactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalCount: filteredTransactions.length,
      totalIncome: income,
      totalExpense: expense,
      netAmount: income - expense,
    };
  }, [filteredTransactions]);

  // 아코디언 토글
  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryName)) {
        newSet.delete(categoryName);
      } else {
        newSet.add(categoryName);
      }
      return newSet;
    });
  }, []);

  // 모든 카테고리 확장/축소
  const toggleAllCategories = useCallback(() => {
    if (expandedCategories.size === categoryAnalysisData.length) {
      // 모두 축소
      setExpandedCategories(new Set());
    } else {
      // 모두 확장
      setExpandedCategories(new Set(categoryAnalysisData.map((c) => c.categoryName)));
    }
  }, [expandedCategories, categoryAnalysisData]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:py-8 pb-20 md:pb-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* 상단 헤더 - 날짜 이동 */}
        <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 p-4 md:p-6 flex items-center justify-between -mx-4 md:-mx-6">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeDay(-1)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all"
            >
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 whitespace-nowrap">
              {formatDateWithDay(currentDate)}
            </h1>
            <button
              onClick={() => changeDay(1)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all"
            >
              <ChevronRight size={24} />
            </button>
          </div>
          <button
            onClick={() => setIsCustomRange(!isCustomRange)}
            className={`py-2 px-4 text-xs md:text-sm font-bold rounded-xl transition-all ${
              isCustomRange
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            기간 설정
          </button>
        </header>

        {/* 기간 설정 UI - 토글 */}
        {isCustomRange && (
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <label className="block text-xs font-bold text-slate-400 uppercase">기간 설정</label>
            <div className="flex flex-col md:flex-row gap-3 items-center">
              <div className="flex-1 w-full">
                <label className="block text-xs text-slate-500 mb-1 ml-1">시작일</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || getTodayString()}
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
                  max={getTodayString()}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                />
              </div>
            </div>
          </div>
        )}

        {/* 필터 버튼 */}
        <div className="flex gap-2 p-2 bg-white rounded-2xl border border-slate-200 shadow-sm">
          {(['all', 'income', 'expense'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex-1 py-3 px-4 text-sm font-bold rounded-xl transition-all ${
                selectedType === type
                  ? 'bg-slate-800 text-white shadow-lg'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {type === 'all' ? '전체' : type === 'income' ? '수입' : '지출'}
            </button>
          ))}
        </div>

        {/* 요약 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">총 거래</p>
            <p className="text-2xl font-black text-slate-800">{summaryStats.totalCount}건</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">총 수입</p>
            <p className="text-2xl font-black text-blue-600">{formatCurrency(summaryStats.totalIncome)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase mb-2">총 지출</p>
            <p className="text-2xl font-black text-red-600">{formatCurrency(summaryStats.totalExpense)}</p>
          </div>
          <div className="bg-slate-900 rounded-2xl p-5 shadow-xl shadow-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">순액</p>
            <p
              className={`text-2xl font-black ${
                summaryStats.netAmount >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {summaryStats.netAmount >= 0 ? '+' : ''}
              {formatCurrency(summaryStats.netAmount)}
            </p>
          </div>
        </div>

        {/* 카테고리별 리스트 */}
        {categoryAnalysisData.length > 0 ? (
          <div className="space-y-3">
            {/* 모두 확장/축소 버튼 */}
            {categoryAnalysisData.length > 0 && (
              <button
                onClick={toggleAllCategories}
                className="w-full text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors mb-2"
              >
                {expandedCategories.size === categoryAnalysisData.length ? '모두 축소' : '모두 확장'}
              </button>
            )}

            {categoryAnalysisData.map((catData) => (
              <div
                key={catData.categoryId}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
              >
                {/* 카테고리 헤더 */}
                <button
                  onClick={() => toggleCategory(catData.categoryName)}
                  className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-all"
                >
                  <div className="flex items-center space-x-4 flex-1">
                    {/* 카테고리 아이콘 */}
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner flex-shrink-0"
                      style={{ backgroundColor: `${catData.categoryColor}20` }}
                    >
                      {catData.categoryIcon}
                    </div>

                    {/* 카테고리명과 기본 통계 */}
                    <div className="text-left min-w-0">
                      <p className="font-bold text-slate-800 text-lg">{catData.categoryName}</p>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold flex-shrink-0">
                          {catData.count}건
                        </span>
                        <span className="font-bold hidden md:inline">
                          평균 {formatCurrency(catData.averageAmount)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 총액 및 확장 아이콘 */}
                  <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
                    <p
                      className={`text-lg md:text-xl font-black ${
                        catData.type === 'income' ? 'text-blue-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(catData.totalAmount)}
                    </p>
                    <ChevronDown
                      size={20}
                      className={`text-slate-400 transition-transform ${
                        expandedCategories.has(catData.categoryName) ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {/* 거래 내역 리스트 */}
                {expandedCategories.has(catData.categoryName) && (
                  <div className="border-t border-slate-200 bg-slate-50">
                    <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
                      {catData.transactions.map((t) => (
                        <div
                          key={t.id}
                          className="bg-white p-4 rounded-xl border border-slate-100 flex items-center justify-between hover:border-blue-200 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate">{t.description}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-xs text-slate-400 flex-shrink-0">
                                {formatDate(t.date)}
                              </span>
                              {t.memo && (
                                <span className="text-xs text-slate-500 italic truncate max-w-[200px]">
                                  "{t.memo}"
                                </span>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-sm font-black ml-4 flex-shrink-0 ${
                              t.type === 'income' ? 'text-blue-600' : 'text-slate-800'
                            }`}
                          >
                            {formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* 빈 상태 UI */
          <div className="py-24 text-center space-y-4">
            <div className="text-6xl grayscale opacity-30">📊</div>
            <p className="text-slate-400 font-bold text-lg">선택한 기간에 데이터가 없습니다.</p>
            <p className="text-slate-400 text-sm">다른 기간을 선택해보세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryAnalysis;
