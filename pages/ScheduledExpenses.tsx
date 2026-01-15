import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Calendar, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { getScheduledExpenses, addScheduledExpense, updateScheduledExpense, deleteScheduledExpense, getCategories } from '../db';
import { ScheduledExpense, Category } from '../types';
import { formatCurrency, formatDate } from '../utils';

const ScheduledExpenses: React.FC = () => {
  const [scheduledExpenses, setScheduledExpenses] = useState<ScheduledExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ScheduledExpense | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');

  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    category: '',
    scheduledDate: '',
    memo: '',
  });

  useEffect(() => {
    const unsubscribeExpenses = getScheduledExpenses((data) => {
      setScheduledExpenses(data);
    });

    const unsubscribeCategories = getCategories((data) => {
      setCategories(data.filter(c => c.type === 'expense'));
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeCategories();
    };
  }, []);

  const filteredExpenses = useMemo(() => {
    if (filterStatus === 'all') return scheduledExpenses;
    return scheduledExpenses.filter(e => e.status === filterStatus);
  }, [scheduledExpenses, filterStatus]);

  const handleOpenModal = (expense?: ScheduledExpense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        name: expense.name,
        amount: expense.amount.toString(),
        category: expense.category,
        scheduledDate: expense.scheduledDate,
        memo: expense.memo || '',
      });
    } else {
      setEditingExpense(null);
      setFormData({
        name: '',
        amount: '',
        category: '',
        scheduledDate: new Date().toISOString().split('T')[0],
        memo: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.amount || !formData.category || !formData.scheduledDate) return;

    try {
      const data = {
        name: formData.name,
        amount: parseInt(formData.amount, 10),
        category: formData.category,
        scheduledDate: formData.scheduledDate,
        memo: formData.memo || undefined,
        status: editingExpense?.status || 'pending',
        createdAt: editingExpense?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingExpense) {
        await updateScheduledExpense(editingExpense.id, data);
      } else {
        await addScheduledExpense(data);
      }

      handleCloseModal();
    } catch (error) {
      console.error('저장 중 오류:', error);
      alert('저장에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await deleteScheduledExpense(id);
    } catch (error) {
      console.error('삭제 중 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleStatusChange = async (id: string, newStatus: ScheduledExpense['status']) => {
    try {
      await updateScheduledExpense(id, { status: newStatus });
    } catch (error) {
      console.error('상태 변경 중 오류:', error);
    }
  };

  const getStatusColor = (status: ScheduledExpense['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'cancelled':
        return 'bg-gray-50 border-gray-200 text-gray-700';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-700';
    }
  };

  const getStatusLabel = (status: ScheduledExpense['status']) => {
    switch (status) {
      case 'pending':
        return '예정중';
      case 'completed':
        return '완료';
      case 'cancelled':
        return '취소됨';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: ScheduledExpense['status']) => {
    switch (status) {
      case 'pending':
        return <AlertCircle size={16} />;
      case 'completed':
        return <CheckCircle size={16} />;
      case 'cancelled':
        return <AlertCircle size={16} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 p-4 md:p-8 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-800">예정된 지출</h1>
        <button
          onClick={() => handleOpenModal()}
          className="hidden md:flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 font-bold"
        >
          <Plus size={20} />
          <span>새 지출 예정</span>
        </button>
        <button
          onClick={() => handleOpenModal()}
          className="md:hidden p-2 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-4 md:px-8 space-y-6">
        {/* Filter Buttons */}
        <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
          {['all', 'pending', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === status
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status === 'all' ? '전체' : status === 'pending' ? '예정중' : status === 'completed' ? '완료' : '취소됨'}
            </button>
          ))}
        </div>

        {/* Expenses List */}
        {filteredExpenses.length === 0 ? (
          <div className="py-24 text-center space-y-4">
            <div className="text-6xl grayscale opacity-30">📅</div>
            <p className="text-slate-400 font-bold text-lg">
              {filterStatus === 'all' ? '예정된 지출이 없습니다.' : `${getStatusLabel(filterStatus as any)} 항목이 없습니다.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className={`p-5 rounded-2xl border ${getStatusColor(expense.status)} shadow-sm flex items-center justify-between group`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    {getStatusIcon(expense.status)}
                    <p className="font-bold text-lg">{expense.name}</p>
                    <span className="text-xs font-bold px-2 py-1 bg-white/50 rounded-md">
                      {expense.category}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>{formatDate(expense.scheduledDate)}</span>
                    </div>
                    {expense.memo && (
                      <span className="text-opacity-75">💬 {expense.memo}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <p className="text-xl font-black text-red-600">{formatCurrency(expense.amount)}</p>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {expense.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(expense.id, 'completed')}
                        className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all"
                        title="완료"
                      >
                        <CheckCircle size={18} />
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenModal(expense)}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="수정"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all"
                      title="삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">{editingExpense ? '지출 예정 수정' : '새 지출 예정'}</h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">지출명 (필수)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="예: 보험료, 새 노트북 구매"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">금액 (필수)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-2xl font-black text-right"
                    required
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₩</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">카테고리 (필수)</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold"
                  required
                >
                  <option value="">카테고리 선택</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">예정일 (필수)</label>
                <input
                  type="date"
                  value={formData.scheduledDate}
                  onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">메모 (선택)</label>
                <textarea
                  value={formData.memo}
                  onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                  rows={2}
                  placeholder="추가 정보를 입력하세요"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 font-bold text-white bg-slate-900 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
                >
                  {editingExpense ? '수정' : '저장'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledExpenses;
