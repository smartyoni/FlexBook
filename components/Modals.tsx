
import React, { useState, useEffect } from 'react';
import { X, Calendar, Plus, Check, Clock, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Transaction, Project, Category, TransactionType, BankAccount, AccountBalance, RecurringExpense } from '../types';
import { generateId, formatCurrency, maskAccountNumber, getBankIcon } from '../utils';
import {
  getCategories,
  getProjects,
  addCategory,
  addTransaction,
  updateTransaction,
  addProject,
  addBankAccount,
  updateBankAccount,
  addRecurringExpense,
  updateRecurringExpense,
  getBankAccounts,
  addAccountBalance,
} from '../db';
import { parseShinhanSMS, ParsedTransaction } from '../utils/smsParser';

// 로컬 시간대의 YYYY-MM-DD 형식 날짜 문자열 반환
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Transaction | null;
  onSave: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
  const [type, setType] = useState<TransactionType>(initialData?.type || 'expense');
  const [amount, setAmount] = useState<string>(initialData?.amount.toString() || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [projectId, setProjectId] = useState(initialData?.projectId || '');
  const [date, setDate] = useState(initialData?.date || getLocalDateString(new Date()));
  const [memo, setMemo] = useState(initialData?.memo || '');

  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  // Quick Category Add State
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // SMS 파싱 State
  const [showSmsInput, setShowSmsInput] = useState(false);
  const [smsText, setSmsText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedTransaction | null>(null);
  const [matchingAccount, setMatchingAccount] = useState<BankAccount | null>(null);

  useEffect(() => {
    if (isOpen) {
      // 카테고리 실시간 리스너
      const unsubscribeCategories = getCategories((cats) => {
        setCategories(cats);
      });

      // 항목 실시간 리스너 (활성화된 항목만)
      const unsubscribeProjects = getProjects((projects) => {
        setProjects(projects.filter(p => p.status === 'active'));
      });

      // 은행 계좌 실시간 리스너
      const unsubscribeBankAccounts = getBankAccounts((accounts) => {
        setBankAccounts(accounts);
      });

      if (initialData) {
        setType(initialData.type);
        setAmount(initialData.amount.toString());
        setDescription(initialData.description);
        setCategory(initialData.category);
        setProjectId(initialData.projectId || '');
        setDate(initialData.date);
        setMemo(initialData.memo || '');
      } else {
        setAmount('');
        setDescription('');
        setCategory('');
        setProjectId('');
        setMemo('');
      }
      setIsAddingCategory(false);
      setNewCategoryName('');
      setShowSmsInput(false);
      setSmsText('');
      setParsedData(null);
      setMatchingAccount(null);

      // 클린업: 구독 해제
      return () => {
        unsubscribeCategories();
        unsubscribeProjects();
        unsubscribeBankAccounts();
      };
    }
  }, [isOpen, initialData]);

  // 계좌번호로 BankAccount 찾기
  const findMatchingAccount = (accountNumber: string): BankAccount | null => {
    return bankAccounts.find(
      (acc) => acc.accountNumber === accountNumber
    ) || null;
  };

  // 계좌 잔액 자동 업데이트
  const updateAccountBalanceFromSMS = async (
    accountNumber: string,
    balance: number,
    timestamp: string
  ) => {
    const matched = findMatchingAccount(accountNumber);
    setMatchingAccount(matched);

    if (matched) {
      try {
        await addAccountBalance({
          accountId: matched.id,
          amount: balance,
          timestamp,
          memo: 'SMS 자동 업데이트'
        });
        console.log('계좌 잔액 자동 업데이트 완료');
      } catch (error) {
        console.error('계좌 잔액 업데이트 실패:', error);
      }
    } else {
      console.log('매칭되는 계좌를 찾을 수 없습니다:', accountNumber);
    }
  };

  // SMS 파싱 핸들러
  const handleSmsParse = async (text: string) => {
    if (!text.trim()) {
      setParsedData(null);
      setMatchingAccount(null);
      return;
    }

    const parsed = parseShinhanSMS(text);
    if (parsed) {
      setParsedData(parsed);

      // 폼 필드 자동 입력
      setType(parsed.type);
      setAmount(parsed.amount.toString());
      setDescription(parsed.description);
      setDate(parsed.date);
      setMemo(
        `계좌: ${parsed.accountNumber}\n잔액: ${parsed.balance.toLocaleString()}원\n시간: ${parsed.originalTime}`
      );

      // 계좌 잔액 자동 업데이트
      await updateAccountBalanceFromSMS(
        parsed.accountNumber,
        parsed.balance,
        `${parsed.date}T${parsed.originalTime}:00`
      );
    } else {
      setParsedData(null);
      setMatchingAccount(null);
    }
  };

  const handleQuickAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const newCat: Omit<Category, 'id'> = {
        name: newCategoryName.trim(),
        type: type,
        icon: type === 'income' ? '💰' : '💸',
        color: type === 'income' ? '#3B82F6' : '#EF4444'
      };

      await addCategory(newCat);
      setCategory(newCat.name);
      setNewCategoryName('');
      setIsAddingCategory(false);
    } catch (error) {
      console.error('카테고리 추가 중 오류:', error);
      alert('카테고리 추가에 실패했습니다.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !category) return;

    try {
      const transactionData = {
        type,
        amount: parseInt(amount, 10),
        description,
        category,
        projectId: projectId || null,
        date,
        memo,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (initialData) {
        // 수정
        await updateTransaction(initialData.id, transactionData);
      } else {
        // 새로 추가
        await addTransaction(transactionData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('거래 저장 중 오류:', error);
      alert('거래 저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{initialData ? '거래 수정' : '거래 입력'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Type Toggle */}
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setType('income'); setIsAddingCategory(false); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                type === 'income' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              수입
            </button>
            <button
              type="button"
              onClick={() => { setType('expense'); setIsAddingCategory(false); }}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                type === 'expense' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              지출
            </button>
          </div>

          {/* SMS 입력 섹션 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setShowSmsInput(!showSmsInput);
                if (showSmsInput) {
                  setSmsText('');
                  setParsedData(null);
                  setMatchingAccount(null);
                }
              }}
              className="w-full py-2 px-4 bg-blue-50 border border-blue-200 text-blue-600 rounded-lg font-bold hover:bg-blue-100 transition-colors"
            >
              📱 문자로 입력
            </button>

            {showSmsInput && (
              <div className="space-y-2">
                <textarea
                  value={smsText}
                  onChange={(e) => {
                    setSmsText(e.target.value);
                    handleSmsParse(e.target.value);
                  }}
                  placeholder="신한은행 문자 메시지 전체를 붙여넣으세요..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm font-medium"
                  rows={6}
                />

                {parsedData && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="text-sm font-bold text-green-700">
                      ✅ 파싱 완료: {parsedData.type === 'income' ? '입금' : '출금'}{' '}
                      {parsedData.amount.toLocaleString()}원
                    </div>
                    {matchingAccount && (
                      <div className="text-xs text-green-600 mt-1">
                        💰 {matchingAccount.bankName} 계좌 잔액 업데이트됨
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">금액</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-2xl font-black text-right"
                required
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₩</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">내용</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="내용을 입력하세요"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1 flex justify-between">
                <span>카테고리</span>
                {!isAddingCategory && (
                  <button 
                    type="button" 
                    onClick={() => setIsAddingCategory(true)}
                    className="text-blue-600 flex items-center space-x-0.5 hover:underline"
                  >
                    <Plus size={12} />
                    <span>추가</span>
                  </button>
                )}
              </label>
              
              {isAddingCategory ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="새 이름"
                    className="flex-1 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={handleQuickAddCategory}
                    className="p-3 bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700"
                  >
                    <Check size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsAddingCategory(false)}
                    className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold"
                  required
                >
                  <option value="">카테고리 선택</option>
                  {categories
                    .filter((c) => c.type === type)
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">항목 태그 (선택)</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none font-bold"
              >
                <option value="">없음</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    📌 {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">메모 (선택)</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              rows={2}
              placeholder="추가적인 정보를 기록하세요"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-4 font-bold text-white bg-slate-900 rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-[0.98]"
            >
              거래 저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const ProjectModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: () => void }> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      const newProject: Omit<Project, 'id'> = {
        name,
        description,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16),
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await addProject(newProject);
      onSave();
      onClose();
      setName('');
      setDescription('');
    } catch (error) {
      console.error('항목 생성 중 오류:', error);
      alert('항목 생성에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">새 항목 생성</h2>
          <button
            type="button"
            onClick={() => {
              onClose();
              setName('');
              setDescription('');
            }}
            className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">항목명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 신규 고객 A 계약, 사무실 집기 구매"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요"
              className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none font-medium"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 font-bold text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
          >
            항목 생성
          </button>
        </form>
      </div>
    </div>
  );
};

const KOREAN_BANKS = [
  '국민은행', '신한은행', '우리은행', '하나은행', 'KB국민은행',
  'NH농협은행', 'IBK기업은행', '카카오뱅크', '토스뱅크', '케이뱅크',
  '새마을금고', '신협', '우체국', '기타'
];

interface BankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BankAccount | null;
  onSave: () => void;
}

export const BankAccountModal: React.FC<BankAccountModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
  const [bankName, setBankName] = useState('');
  const [accountAlias, setAccountAlias] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [memo, setMemo] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setBankName(initialData.bankName);
        setAccountAlias(initialData.accountAlias || '');
        setAccountNumber(initialData.accountNumber || '');
        setMemo(initialData.memo || '');
      } else {
        setBankName('');
        setAccountAlias('');
        setAccountNumber('');
        setMemo('');
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName) return;

    try {
      const accountData = {
        bankName,
        accountAlias: accountAlias || undefined,
        accountNumber: accountNumber || undefined,
        memo: memo || undefined,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        isActive: true,
      };

      if (initialData) {
        await updateBankAccount(initialData.id, accountData);
      } else {
        await addBankAccount(accountData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('계좌 저장 중 오류:', error);
      alert('계좌 저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-800">{initialData ? '계좌 수정' : '계좌 추가'}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Plus size={24} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">은행명 (필수)</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                required
              >
                <option value="">은행을 선택하세요</option>
                {KOREAN_BANKS.map((bank) => (
                  <option key={bank} value={bank}>
                    {getBankIcon(bank)} {bank}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">계좌 별칭 (선택)</label>
              <input
                type="text"
                value={accountAlias}
                onChange={(e) => setAccountAlias(e.target.value)}
                placeholder="예: 주계좌, 비상금, 월급계좌"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">계좌번호 (선택)</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="예: 123-456-789012"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">메모 (선택)</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="계좌에 대한 참고 사항"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 font-black text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-4 font-black text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface AccountHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
}

export const AccountHistoryModal: React.FC<AccountHistoryModalProps> = ({ isOpen, onClose, account }) => {
  const [balances, setBalances] = useState<AccountBalance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && account) {
      setLoading(true);
      db.accountBalances
        .where('accountId').equals(account.id)
        .reverse()
        .sortBy('timestamp')
        .then(setBalances)
        .finally(() => setLoading(false));
    }
  }, [isOpen, account]);

  if (!isOpen || !account) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up max-h-[80vh] flex flex-col">
        <div className="p-8 border-b border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-800">{account.bankName}</h2>
              {account.accountAlias && <p className="text-sm text-slate-400 font-medium mt-1">{account.accountAlias}</p>}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-400">로드 중...</div>
          ) : balances.length === 0 ? (
            <div className="p-12 text-center space-y-4">
              <div className="text-5xl opacity-20">📊</div>
              <p className="text-slate-400 font-bold">잔액 기록이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3 p-6">
              {balances.map((b) => (
                <div key={b.id} className="bg-slate-50 p-5 rounded-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xl font-black text-slate-800">{formatCurrency(b.amount)}</p>
                    <div className="flex items-center space-x-1 text-xs font-bold text-slate-400">
                      <Clock size={12} />
                      <span>{new Date(b.timestamp).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                  {b.memo && <p className="text-xs text-slate-500 font-medium">{b.memo}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface RecurringExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: RecurringExpense | null;
  onSave: () => void;
}

export const RecurringExpenseModal: React.FC<RecurringExpenseModalProps> = ({ isOpen, onClose, initialData, onSave }) => {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [memo, setMemo] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurrenceType, setRecurrenceType] = useState<'regular' | 'irregular'>('regular');
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen) {
      // 지출 카테고리만 실시간으로 가져오기
      const unsubscribe = getCategories((cats) => {
        setCategories(cats.filter(c => c.type === 'expense'));
      });

      if (initialData) {
        setName(initialData.name);
        setAmount(initialData.amount.toString());
        setCategory(initialData.category);
        setDayOfMonth(initialData.dayOfMonth.toString());
        setMemo(initialData.memo || '');
        setRecurrenceType(initialData.recurrenceType || 'regular');
        setSelectedMonths(initialData.months || []);
      } else {
        setName('');
        setAmount('');
        setCategory('');
        setDayOfMonth('1');
        setMemo('');
        setRecurrenceType('regular');
        setSelectedMonths([]);
      }

      // 클린업: 구독 해제
      return () => unsubscribe();
    }
  }, [isOpen, initialData]);

  const toggleMonth = (month: number) => {
    setSelectedMonths(prev =>
      prev.includes(month)
        ? prev.filter(m => m !== month)
        : [...prev, month].sort((a, b) => a - b)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !category || !dayOfMonth) return;

    // 비정기지출인데 월을 선택하지 않은 경우
    if (recurrenceType === 'irregular' && selectedMonths.length === 0) {
      alert('비정기지출의 경우 최소 1개 이상의 월을 선택해야 합니다.');
      return;
    }

    try {
      const expenseData = {
        name,
        amount: parseInt(amount, 10),
        category,
        dayOfMonth: parseInt(dayOfMonth, 10),
        memo: memo || undefined,
        isActive: true,
        recurrenceType,
        months: recurrenceType === 'irregular' ? selectedMonths : undefined,
        createdAt: initialData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (initialData) {
        await updateRecurringExpense(initialData.id, expenseData);
      } else {
        await addRecurringExpense(expenseData);
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('고정지출 저장 중 오류:', error);
      alert('고정지출 저장에 실패했습니다.');
    }
  };

  if (!isOpen) return null;

  const dayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up">
        <div className="p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-slate-800">{initialData ? '고정지출 수정' : '고정지출 추가'}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Plus size={24} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">지출명 (필수)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 넷플릭스, 월세, 통신비"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold"
                required
              />
            </div>

            {/* 지출 유형 선택 */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">
                지출 유형 (필수)
              </label>
              <div className="flex p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setRecurrenceType('regular');
                    setSelectedMonths([]);
                  }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    recurrenceType === 'regular'
                      ? 'bg-white text-purple-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  정기지출
                </button>
                <button
                  type="button"
                  onClick={() => setRecurrenceType('irregular')}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    recurrenceType === 'irregular'
                      ? 'bg-white text-pink-600 shadow-md'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  비정기지출
                </button>
              </div>
            </div>

            {/* 발생 월 선택 (비정기지출일 때만 표시) */}
            {recurrenceType === 'irregular' && (
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">
                  발생 월 선택 (필수)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                    <button
                      key={month}
                      type="button"
                      onClick={() => toggleMonth(month)}
                      className={`py-3 text-sm font-bold rounded-xl transition-all ${
                        selectedMonths.includes(month)
                          ? 'bg-pink-600 text-white shadow-md'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {month}월
                    </button>
                  ))}
                </div>
                {selectedMonths.length > 0 && (
                  <p className="text-xs text-slate-500 font-medium mt-2 ml-1">
                    선택된 월: {selectedMonths.join(', ')}월
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">금액 (필수)</label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold text-right text-lg"
                  required
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₩</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">카테고리 (필수)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold"
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
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">매월 지출일 (필수)</label>
              <select
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none font-bold"
                required
              >
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}일
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">메모 (선택)</label>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={3}
                placeholder="추가적인 정보를 기록하세요"
                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none resize-none font-medium"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 font-black text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
              >
                취소
              </button>
              <button
                type="submit"
                className="flex-1 py-4 font-black text-white bg-purple-600 rounded-2xl hover:bg-purple-700 shadow-xl shadow-purple-200 transition-all active:scale-[0.98]"
              >
                저장
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

interface DailyCategoryAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  transactions: Transaction[];
}

export const DailyCategoryAnalysisModal: React.FC<DailyCategoryAnalysisModalProps> = ({
  isOpen,
  onClose,
  date,
  transactions,
}) => {
  const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1'];

  // 해당 날짜의 지출만 필터링
  const dayExpenses = transactions.filter(t => t.date === date && t.type === 'expense');

  // 카테고리별로 집계
  const categoryData = dayExpenses.reduce((acc, t) => {
    const existing = acc.find(item => item.name === t.category);
    if (existing) {
      existing.value += t.amount;
    } else {
      acc.push({ name: t.category, value: t.amount });
    }
    return acc;
  }, [] as Array<{ name: string; value: number }>)
    .sort((a, b) => b.value - a.value);

  const totalExpense = categoryData.reduce((acc, item) => acc + item.value, 0);

  // 날짜 포맷팅
  const formatDateKorean = (dateStr: string): string => {
    const [year, month, day] = dateStr.split('-');
    return `${year}년 ${parseInt(month)}월 ${parseInt(day)}일`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{formatDateKorean(date)} 지출 분석</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {dayExpenses.length === 0 ? (
            <div className="py-12 text-center space-y-4">
              <div className="text-4xl opacity-30">📊</div>
              <p className="text-slate-400 font-bold">해당 날짜에 지출이 없습니다.</p>
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-2xl border border-red-200">
                <p className="text-xs font-bold text-red-600 uppercase mb-1">해당일 총 지출</p>
                <p className="text-3xl font-black text-red-600">{formatCurrency(totalExpense)}</p>
              </div>

              {/* Pie Chart */}
              {categoryData.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">카테고리별 지출 비중</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value as number)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Category Details */}
                  <div className="space-y-2 border-t pt-4">
                    {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-sm font-bold text-slate-700">{item.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-800">{formatCurrency(item.value)}</p>
                          <p className="text-xs text-slate-400 font-medium">
                            {((item.value / totalExpense) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Transaction List */}
                  <div className="space-y-2 border-t pt-4">
                    <h4 className="text-sm font-bold text-slate-600">상세 내역</h4>
                    {dayExpenses
                      .sort((a, b) => b.amount - a.amount)
                      .map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2 text-sm">
                          <span className="text-slate-700 font-medium">{t.description}</span>
                          <span className="text-slate-800 font-bold">{formatCurrency(t.amount)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="border-t p-4">
          <button
            onClick={onClose}
            className="w-full py-3 font-bold text-white bg-slate-900 rounded-2xl hover:bg-slate-800 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};
