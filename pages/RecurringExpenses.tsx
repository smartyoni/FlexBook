import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, Edit2, Copy, CalendarClock } from 'lucide-react';
import { RecurringExpense, Category, Transaction } from '../types';
import { getRecurringExpenses, getCategories, deleteRecurringExpense, addTransaction } from '../db';
import { generateId, formatCurrency } from '../utils';
import { RecurringExpenseModal } from '../components/Modals';

export const RecurringExpenses: React.FC = () => {
  const [allExpenses, setAllExpenses] = useState<RecurringExpense[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<RecurringExpense | null>(null);
  const [activeTab, setActiveTab] = useState<'regular' | 'irregular'>('regular');

  useEffect(() => {
    // 실시간 리스너 설정
    const unsubscribeExpenses = getRecurringExpenses((expenses) => {
      setAllExpenses(expenses);
    });

    const unsubscribeCategories = getCategories((categories) => {
      setAllCategories(categories);
    });

    // 클린업: 구독 해제
    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
    };
  }, []);

  const categories = useMemo(() => {
    return new Map(allCategories.map(c => [c.name, c]));
  }, [allCategories]);

  // 현재 월 계산
  const currentMonth = new Date().getMonth() + 1;

  // 탭에 따라 필터링 (기존 데이터는 regular로 간주)
  const filteredExpenses = useMemo(() => {
    return allExpenses.filter(exp => {
      const type = exp.recurrenceType || 'regular';
      return type === activeTab;
    });
  }, [allExpenses, activeTab]);

  // 요약 카드에 사용할 금액 계산
  const totalMonthlyAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  // 비정기지출의 이번 달 예상 금액
  const irregularMonthlyAmount = useMemo(() => {
    return allExpenses
      .filter(exp => exp.recurrenceType === 'irregular' && exp.months?.includes(currentMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);
  }, [allExpenses, currentMonth]);

  const handleAddClick = () => {
    setSelectedExpense(null);
    setIsModalOpen(true);
  };

  const handleEditClick = (expense: RecurringExpense) => {
    setSelectedExpense(expense);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (expenseId: string) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteRecurringExpense(expenseId);
      } catch (error) {
        console.error('삭제 중 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleCopyToHousehold = async (expense: RecurringExpense) => {
    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      const currentMonthCheck = month + 1;

      // 비정기지출인 경우 현재 월이 발생 월에 포함되는지 체크
      if (expense.recurrenceType === 'irregular') {
        if (!expense.months?.includes(currentMonthCheck)) {
          alert(
            `이 지출은 ${currentMonthCheck}월에 발생하지 않습니다.\n발생 월: ${expense.months?.join(', ')}월`
          );
          return;
        }
      }

      // 해당 월의 마지막 날 계산
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const targetDay = Math.min(expense.dayOfMonth, lastDayOfMonth);

      const transactionDate = new Date(year, month, targetDay)
        .toISOString()
        .split('T')[0];

      const newTransaction: Omit<Transaction, 'id'> = {
        type: 'expense',
        amount: expense.amount,
        description: expense.name,
        category: expense.category,
        projectId: null,
        date: transactionDate,
        memo: expense.memo
          ? `[고정지출] ${expense.memo}`
          : '[고정지출에서 복사]',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addTransaction(newTransaction);
      alert(`${expense.name}이(가) 가계부에 추가되었습니다.`);
    } catch (error) {
      console.error('가계부 복사 중 오류:', error);
      alert('가계부에 추가하는 중 오류가 발생했습니다.');
    }
  };

  const handleModalSave = () => {
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-purple-100 rounded-2xl">
            <CalendarClock size={24} className="text-purple-600" />
          </div>
          <h1 className="text-3xl font-black text-slate-800">고정지출 관리</h1>
        </div>
        <button
          onClick={handleAddClick}
          className="px-6 py-3 bg-purple-600 text-white font-bold rounded-2xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all active:scale-[0.98]"
        >
          + 고정지출 추가
        </button>
      </div>

      {/* Tab Toggle */}
      <div className="px-6 mb-6">
        <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('regular')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'regular'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            정기지출
          </button>
          <button
            onClick={() => setActiveTab('irregular')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              activeTab === 'irregular'
                ? 'bg-pink-600 text-white shadow-md'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            비정기지출
          </button>
        </div>
      </div>

      {/* Summary Card */}
      {filteredExpenses.length > 0 && (
        <div className="px-6 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 text-white shadow-2xl shadow-purple-200">
            <p className="text-sm font-bold uppercase opacity-90 mb-2">
              {activeTab === 'regular' ? '월 정기지출 총액' : '비정기지출 총액'}
            </p>
            <div className="flex items-baseline space-x-2 mb-4">
              <span className="text-5xl font-black">{formatCurrency(totalMonthlyAmount)}</span>
            </div>
            <p className="text-sm opacity-80 font-medium">등록된 항목 {filteredExpenses.length}개</p>

            {/* 비정기지출 탭에서 이번 달 금액 표시 */}
            {activeTab === 'irregular' && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <p className="text-xs font-medium opacity-80">이번 달 ({currentMonth}월) 예상 지출</p>
                <p className="text-2xl font-black mt-1">{formatCurrency(irregularMonthlyAmount)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 pb-12">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-6xl opacity-20 mb-4">📋</div>
            <p className="text-slate-400 font-bold text-lg">
              {activeTab === 'regular' ? '등록된 정기지출이 없습니다.' : '등록된 비정기지출이 없습니다.'}
            </p>
            <p className="text-slate-300 text-sm">위의 "+ 고정지출 추가" 버튼을 클릭하여 고정지출을 등록하세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredExpenses.map((expense) => {
              const category = categories.get(expense.category);
              return (
                <div
                  key={expense.id}
                  className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-slate-800 mb-1">
                        {expense.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {category && (
                          <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                            {category.icon} {category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="mb-4">
                    <p className="text-3xl font-black text-purple-600">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>

                  {/* Day of Month */}
                  <div className="flex items-center space-x-2 text-slate-600 font-bold mb-3 text-sm">
                    <CalendarClock size={16} />
                    {expense.recurrenceType === 'irregular' ? (
                      <span>
                        {expense.months?.sort((a, b) => a - b).join(', ')}월 {expense.dayOfMonth}일
                      </span>
                    ) : (
                      <span>매월 {expense.dayOfMonth}일</span>
                    )}
                  </div>

                  {/* Memo */}
                  {expense.memo && (
                    <p className="text-sm text-slate-500 font-medium mb-4 pb-4 border-b border-slate-100">
                      {expense.memo}
                    </p>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleCopyToHousehold(expense)}
                      className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all flex items-center justify-center space-x-2 active:scale-[0.98]"
                    >
                      <Copy size={16} />
                      <span>가계부로 복사</span>
                    </button>
                    <button
                      onClick={() => handleEditClick(expense)}
                      className="px-4 py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-[0.98]"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(expense.id)}
                      className="px-4 py-3 bg-slate-100 text-slate-400 font-bold rounded-2xl hover:bg-red-100 hover:text-red-600 transition-all active:scale-[0.98]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      <RecurringExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedExpense(null);
        }}
        initialData={selectedExpense}
        onSave={handleModalSave}
      />
    </div>
  );
};
