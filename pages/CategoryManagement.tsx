
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, X, Edit, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCategories, addCategory, deleteCategory, updateCategory } from '../db';
import { Category, TransactionType } from '../types';

const CategoryManagement: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<TransactionType>('expense');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // New Category Form State
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('📁');

  useEffect(() => {
    // 실시간 리스너 설정
    const unsubscribe = getCategories((cats) => {
      setCategories(cats);
    });

    // 클린업: 구독 해제
    return () => unsubscribe();
  }, []);

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setNewIcon(category.icon);
    setNewName(category.name);
    setType(category.type);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 카테고리를 삭제하시겠습니까? 기존 거래 내역의 카테고리 이름은 유지되지만 선택 목록에서 사라집니다.')) {
      try {
        await deleteCategory(id);
      } catch (error) {
        console.error('삭제 중 오류:', error);
        alert('카테고리 삭제에 실패했습니다.');
      }
    }
  };

  const handleMoveUp = async (category: Category) => {
    const sortedCategories = filteredCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sortedCategories.findIndex(c => c.id === category.id);

    if (currentIndex > 0) {
      const prevCategory = sortedCategories[currentIndex - 1];
      try {
        await updateCategory(category.id, { order: prevCategory.order });
        await updateCategory(prevCategory.id, { order: category.order });
      } catch (error) {
        console.error('순서 변경 중 오류:', error);
        alert('순서 변경에 실패했습니다.');
      }
    }
  };

  const handleMoveDown = async (category: Category) => {
    const sortedCategories = filteredCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    const currentIndex = sortedCategories.findIndex(c => c.id === category.id);

    if (currentIndex < sortedCategories.length - 1) {
      const nextCategory = sortedCategories[currentIndex + 1];
      try {
        await updateCategory(category.id, { order: nextCategory.order });
        await updateCategory(nextCategory.id, { order: category.order });
      } catch (error) {
        console.error('순서 변경 중 오류:', error);
        alert('순서 변경에 실패했습니다.');
      }
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setNewName('');
    setNewIcon('📁');
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    try {
      if (editingCategory) {
        // 수정 모드
        await updateCategory(editingCategory.id, {
          name: newName.trim(),
          icon: newIcon,
        });
      } else {
        // 추가 모드
        const maxOrder = categories.reduce((max, c) => Math.max(max, c.order || 0), -1);
        const newCategory: Omit<Category, 'id'> = {
          name: newName.trim(),
          type: type,
          icon: newIcon,
          color: type === 'income' ? '#3B82F6' : '#EF4444',
          order: maxOrder + 1,
        };
        await addCategory(newCategory);
      }
      handleCloseModal();
    } catch (error) {
      console.error('카테고리 저장 중 오류:', error);
      alert('카테고리 저장에 실패했습니다.');
    }
  };

  const filteredCategories = categories
    .filter(c => c.type === type)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const emojiList = ['💰', '🍱', '🚕', '🏠', '🎁', '🛒', '💊', '🎭', '💻', '🤝', '📈', '🏢', '🍲', '🚌', '🏥', '⛽', '🍿', '👔', '✈️', '🐶'];

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-1 text-slate-400 hover:text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">카테고리 관리</h1>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-4 space-y-4">
        {/* Type Toggle */}
        <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              type === 'expense' ? 'bg-red-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            지출 카테고리
          </button>
          <button
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
              type === 'income' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            수입 카테고리
          </button>
        </div>

        <div className="space-y-2">
          {filteredCategories.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
              <div className="flex items-center space-x-4">
                <div className="text-2xl w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl">
                  {c.icon}
                </div>
                <span className="font-bold text-slate-800">{c.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleMoveUp(c)}
                  className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                  title="위로 이동"
                >
                  <ChevronUp size={18} />
                </button>
                <button
                  onClick={() => handleMoveDown(c)}
                  className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                  title="아래로 이동"
                >
                  <ChevronDown size={18} />
                </button>
                <button
                  onClick={() => handleEdit(c)}
                  className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all"
                  title="수정"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="삭제"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {filteredCategories.length === 0 && (
            <div className="py-20 text-center text-slate-400 font-medium">
              등록된 카테고리가 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">
                {editingCategory ? '카테고리 수정' : '카테고리 추가'} ({type === 'income' ? '수입' : '지출'})
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">아이콘 선택</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl no-scrollbar">
                  {emojiList.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`text-2xl p-2 rounded-xl transition-all ${newIcon === emoji ? 'bg-white shadow-md scale-110 ring-2 ring-blue-500' : 'hover:bg-white'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">카테고리명</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 간식비, 보너스"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className={`w-full py-3 font-semibold text-white rounded-xl shadow-lg transition-all ${
                  type === 'income' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-red-500 hover:bg-red-600 shadow-red-200'
                }`}
              >
                {editingCategory ? '수정 완료' : '카테고리 추가'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
