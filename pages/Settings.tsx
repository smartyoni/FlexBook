
import React from 'react';
import { Download, Upload, FileText, Trash2, ShieldCheck, ChevronRight, HelpCircle, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getTransactions, getProjects, getCategories } from '../db';
import { exportToJSON, downloadCSV } from '../utils';

const Settings: React.FC = () => {
  const navigate = useNavigate();

  const handleExportJSON = async () => {
    try {
      // 한 번에 모든 데이터를 수집하기 위해 Promise를 사용
      let transactions: any[] = [];
      let projects: any[] = [];
      let categories: any[] = [];

      // 각 컬렉션의 첫 번째 업데이트에서 데이터 수집
      const txsPromise = new Promise((resolve) => {
        const unsub = getTransactions((data) => {
          transactions = data;
          unsub();
          resolve(null);
        });
      });

      const projsPromise = new Promise((resolve) => {
        const unsub = getProjects((data) => {
          projects = data;
          unsub();
          resolve(null);
        });
      });

      const catsPromise = new Promise((resolve) => {
        const unsub = getCategories((data) => {
          categories = data;
          unsub();
          resolve(null);
        });
      });

      await Promise.all([txsPromise, projsPromise, catsPromise]);

      const data = { transactions, projects, categories, exportDate: new Date().toISOString() };
      exportToJSON(data, `flexbook_backup_${new Date().toISOString().split('T')[0]}.json`);
    } catch (error) {
      console.error('내보내기 실패:', error);
      alert('데이터 내보내기에 실패했습니다.');
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (confirm('기존 데이터를 유지하고 새로운 데이터를 추가하시겠습니까? (중복 데이터는 덮어씌워집니다)')) {
          if (data.transactions) await db.transactions.bulkPut(data.transactions);
          if (data.projects) await db.projects.bulkPut(data.projects);
          if (data.categories) await db.categories.bulkPut(data.categories);
          alert('가져오기 성공!');
          window.location.reload();
        }
      } catch (err) {
        alert('올바르지 않은 JSON 형식입니다.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCSV = async () => {
    try {
      let transactions: any[] = [];

      const txsPromise = new Promise((resolve) => {
        const unsub = getTransactions((data) => {
          transactions = data;
          unsub();
          resolve(null);
        });
      });

      await txsPromise;

      const headers = ['날짜', '구분', '내용', '금액', '카테고리', '메모'];
      const rows = transactions.map(t => [
        t.date,
        t.type === 'income' ? '수입' : '지출',
        t.description,
        t.amount,
        t.category,
        t.memo || ''
      ]);
      downloadCSV(headers, rows, `flexbook_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('CSV 내보내기 실패:', error);
      alert('CSV 내보내기에 실패했습니다.');
    }
  };

  const clearAllData = async () => {
    if (confirm('정말로 모든 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      try {
        alert('모든 데이터 삭제 기능은 현재 Firestore 마이그레이션 작업 중입니다. 나중에 지원될 예정입니다.');
        // TODO: Firestore 배치 삭제 구현
      } catch (error) {
        console.error('데이터 삭제 중 오류:', error);
        alert('데이터 삭제에 실패했습니다.');
      }
    }
  };

  const SettingItem = ({ icon: Icon, label, onClick, color = 'text-slate-600', isFile = false }: any) => (
    <div 
      onClick={isFile ? undefined : onClick}
      className="flex items-center justify-between p-4 bg-white border-b border-slate-50 active:bg-slate-50 cursor-pointer"
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
          <Icon size={20} />
        </div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
      </div>
      {isFile ? (
        <label className="cursor-pointer">
          <ChevronRight size={18} className="text-slate-300" />
          <input type="file" className="hidden" accept=".json" onChange={onClick} />
        </label>
      ) : (
        <ChevronRight size={18} className="text-slate-300" />
      )}
    </div>
  );

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md z-40 p-4 border-b">
        <h1 className="text-xl font-bold tracking-tight text-slate-800">더보기</h1>
      </header>

      <div className="p-4 space-y-8">
        {/* Profile Card Mockup */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center space-x-4">
            <img src="/FlexBook/logo.svg" alt="FlexBook Logo" className="w-16 h-16 rounded-2xl" />
            <div>
              <h2 className="text-xl font-black">FlexBook</h2>
              <p className="text-xs font-bold text-slate-400">데이터는 Firebase에 안전하게 저장됩니다.</p>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">설정</h3>
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <SettingItem icon={Tag} label="🏷️ 카테고리 관리" onClick={() => navigate('/settings/categories')} />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">데이터 관리</h3>
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <SettingItem icon={Download} label="JSON 백업 파일 내보내기" onClick={handleExportJSON} />
              <SettingItem icon={Upload} label="JSON 백업 파일 가져오기" onClick={handleImportJSON} isFile={true} />
              <SettingItem icon={FileText} label="거래 내역 CSV 다운로드" onClick={handleExportCSV} />
              <SettingItem icon={Trash2} label="모든 데이터 초기화" onClick={clearAllData} color="text-red-500" />
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">앱 정보</h3>
            <div className="bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm">
              <SettingItem icon={ShieldCheck} label="개인정보 보호 정책" onClick={() => {}} />
              <SettingItem icon={HelpCircle} label="사용 가이드 및 도움말" onClick={() => {}} />
              <div className="flex items-center justify-between p-4 bg-white border-b border-slate-50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-slate-50 text-slate-400">
                    <FileText size={20} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">버전 정보</span>
                </div>
                <span className="text-xs font-bold text-slate-400">v1.0.0 (Gold)</span>
              </div>
            </div>
          </section>
        </div>

        <div className="text-center py-6">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Designed for Professionals</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
