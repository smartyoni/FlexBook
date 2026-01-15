
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, ChevronRight, Briefcase } from 'lucide-react';
import { getProjects, getTransactions } from '../db';
import { Project, Transaction } from '../types';
import { formatCurrency } from '../utils';
import { ProjectModal } from '../components/Modals';
import { Link } from 'react-router-dom';

const Projects: React.FC = () => {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // 실시간 리스너 설정
    const unsubscribeProjects = getProjects((projects) => {
      setAllProjects(projects);
    });

    const unsubscribeTransactions = getTransactions((transactions) => {
      setAllTransactions(transactions);
    });

    // 클린업: 구독 해제
    return () => {
      unsubscribeProjects();
      unsubscribeTransactions();
    };
  }, []);

  // 항목별 요약 계산
  const projects = useMemo(() => {
    return allProjects.map(p => {
      const pTransactions = allTransactions.filter(t => t.projectId === p.id);
      const inc = pTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
      const exp = pTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
      return {
        ...p,
        summary: { income: inc, expense: exp, count: pTransactions.length }
      };
    });
  }, [allProjects, allTransactions]);

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 p-4 border-b flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">항목 관리</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="p-2 bg-slate-800 text-white rounded-full hover:bg-slate-900 transition-all active:scale-95 shadow-lg shadow-slate-200"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="p-4 space-y-6">
        {/* Total Summary */}
        <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
          <div className="flex items-center space-x-2 mb-4">
            <Briefcase size={16} className="text-blue-400" />
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">전체 항목 현황</h2>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-3xl font-black">{projects.length}</p>
              <p className="text-xs font-medium text-slate-400">총 생성된 항목</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-emerald-400">
                {projects.filter(p => p.status === 'active').length}
              </p>
              <p className="text-xs font-medium text-slate-400">진행 중</p>
            </div>
          </div>
        </div>

        {/* Project List */}
        <div className="space-y-4">
          {projects.map((p) => (
            <Link 
              to={`/projects/${p.id}`}
              key={p.id} 
              className="block bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                  <h3 className="text-lg font-black text-slate-800">{p.name}</h3>
                </div>
                <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${p.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                  {p.status === 'active' ? '진행중' : '종료됨'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">수입</p>
                  <p className="text-sm font-bold text-blue-600">{formatCurrency(p.summary.income)}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">지출</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrency(p.summary.expense)}</p>
                </div>
              </div>

              <div className="h-px bg-slate-50 mb-4"></div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-medium text-slate-500">
                    <span className="font-bold text-slate-800">{p.summary.count}건</span>의 거래 내역
                  </p>
                  <p className="text-[10px] text-slate-300 font-medium">생성일: {new Date(p.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center space-x-1 text-blue-600 font-bold text-sm">
                  <span>상세보기</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}

          {projects.length === 0 && (
            <div className="py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-3xl">🏗️</div>
              <div className="space-y-1">
                <p className="text-slate-800 font-bold text-lg">새 프로젝트를 시작하세요</p>
                <p className="text-slate-400 text-sm">특정 거래들을 묶어서 손익을 추적할 수 있습니다.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="px-6 py-2 bg-slate-800 text-white rounded-full font-bold text-sm"
              >
                첫 항목 만들기
              </button>
            </div>
          )}
        </div>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => setIsModalOpen(false)}
      />
    </div>
  );
};

export default Projects;
