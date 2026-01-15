
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Trash2, CheckCircle2 } from 'lucide-react';
import { getProjects, getTransactions, deleteProject, updateProject, updateTransaction } from '../db';
import { Project, Transaction } from '../types';
import { formatCurrency, formatDate } from '../utils';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // 실시간 리스너 설정
    const unsubscribeProjects = getProjects((projects) => {
      setAllProjects(projects);
      // 해당 항목이 없으면 목록으로 돌아가기
      if (id && !projects.find(p => p.id === id)) {
        navigate('/projects');
      }
    });

    const unsubscribeTransactions = getTransactions((transactions) => {
      setAllTransactions(transactions);
    });

    // 클린업: 구독 해제
    return () => {
      unsubscribeProjects();
      unsubscribeTransactions();
    };
  }, [id, navigate]);

  const project = useMemo(() => {
    return id ? allProjects.find(p => p.id === id) || null : null;
  }, [allProjects, id]);

  const transactions = useMemo(() => {
    return id ? allTransactions.filter(t => t.projectId === id).sort((a, b) => b.date.localeCompare(a.date)) : [];
  }, [allTransactions, id]);

  const handleDelete = async () => {
    if (!id || !project) return;
    if (confirm('이 항목을 삭제하시겠습니까? 연결된 거래의 항목 정보만 초기화되며, 실제 거래 내역은 유지됩니다.')) {
      try {
        // 해당 항목의 모든 거래 업데이트
        for (const tx of transactions) {
          await updateTransaction(tx.id, { projectId: null });
        }
        // 항목 삭제
        await deleteProject(id);
        navigate('/projects');
      } catch (error) {
        console.error('삭제 중 오류:', error);
        alert('삭제에 실패했습니다.');
      }
    }
  };

  const toggleStatus = async () => {
    if (!project) return;
    try {
      const newStatus = project.status === 'active' ? 'completed' : 'active';
      await updateProject(project.id, { status: newStatus });
      setIsMenuOpen(false);
    } catch (error) {
      console.error('상태 변경 중 오류:', error);
      alert('상태 변경에 실패했습니다.');
    }
  };

  if (!project) return null;

  const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
  const balance = income - expense;

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 p-4 border-b flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button onClick={() => navigate(-1)} className="p-1 text-slate-400 hover:text-slate-600">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">{project.name}</h1>
        </div>
        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 text-slate-400 hover:text-slate-600">
            <MoreVertical size={24} />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
              <button onClick={toggleStatus} className="w-full text-left px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center space-x-2">
                <CheckCircle2 size={16} />
                <span>{project.status === 'active' ? '완료로 표시' : '다시 진행하기'}</span>
              </button>
              <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 flex items-center space-x-2">
                <Trash2 size={16} />
                <span>항목 삭제</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* Statistics Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-100 space-y-6">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }}></div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">실시간 손익 요약</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400 uppercase">수입 합계</span>
              <span className="text-xl font-black text-blue-600">{formatCurrency(income)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-slate-400 uppercase">지출 합계</span>
              <span className="text-xl font-black text-red-500">{formatCurrency(expense)}</span>
            </div>
            <div className="h-px bg-slate-50"></div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-md font-black text-slate-800 uppercase">최종 잔액</span>
              <span className={`text-2xl font-black ${balance >= 0 ? 'text-emerald-500' : 'text-amber-500'}`}>
                {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
              </span>
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase">생성일</p>
              <p className="text-xs font-bold text-slate-600">{new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase">총 거래 건수</p>
              <p className="text-xs font-bold text-slate-600">{transactions.length}건</p>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest pl-1">관련 거래 내역</h2>
          <div className="space-y-2">
            {transactions.map(t => (
              <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-50 shadow-sm flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${t.type === 'income' ? 'bg-blue-50 text-blue-500' : 'bg-red-50 text-red-500'}`}>
                    {t.type === 'income' ? '➕' : '➖'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{t.description}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{t.category} • {formatDate(t.date)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black ${t.type === 'income' ? 'text-blue-600' : 'text-slate-800'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </p>
                </div>
              </div>
            ))}

            {transactions.length === 0 && (
              <div className="py-20 text-center text-slate-400 font-bold">
                태그된 거래가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDetail;
