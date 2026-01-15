import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Landmark, History, Trash2, Clock, Settings, Star } from 'lucide-react';
import { getBankAccounts, getAccountBalances, addAccountBalance, updateBankAccount, deleteBankAccount, deleteAccountBalance, toggleBankAccountFavorite } from '../db';
import { AccountBalance, BankAccount } from '../types';
import { formatCurrency, maskAccountNumber, getBankIcon } from '../utils';
import { BankAccountModal, AccountHistoryModal } from '../components/Modals';

const AccountBalancePage: React.FC = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [allBalances, setAllBalances] = useState<AccountBalance[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);

  // 모달 상태
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedAccountForEdit, setSelectedAccountForEdit] = useState<BankAccount | null>(null);
  const [selectedAccountForHistory, setSelectedAccountForHistory] = useState<BankAccount | null>(null);

  // 잔액 기록 모달 상태
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [balanceMemo, setBalanceMemo] = useState('');

  useEffect(() => {
    // 실시간 리스너 설정
    const unsubscribeAccounts = getBankAccounts((accounts) => {
      setAccounts(accounts);
      // 즐겨찾기 개수 계산
      const count = accounts.filter(acc => acc.isFavorite).length;
      setFavoriteCount(count);
    });

    const unsubscribeBalances = getAccountBalances((balances) => {
      setAllBalances(balances);
    });

    // 클린업: 구독 해제
    return () => {
      unsubscribeAccounts();
      unsubscribeBalances();
    };
  }, []);

  // 계좌별 잔액 맵 생성
  const balancesByAccount = useMemo(() => {
    const map = new Map<string, AccountBalance[]>();
    accounts.forEach(account => {
      const accountBalances = allBalances
        .filter(b => b.accountId === account.id)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      map.set(account.id, accountBalances);
    });
    return map;
  }, [accounts, allBalances]);

  const totalBalance = useMemo(() => {
    let sum = 0;
    balancesByAccount.forEach((balances) => {
      if (balances.length > 0) {
        sum += balances[0].amount;
      }
    });
    return sum;
  }, [balancesByAccount]);

  const totalRecordCount = useMemo(() => {
    let count = 0;
    balancesByAccount.forEach((balances) => {
      count += balances.length;
    });
    return count;
  }, [balancesByAccount]);

  const handleAddBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !selectedAccountId) return;

    try {
      const newBalance: Omit<AccountBalance, 'id'> = {
        accountId: selectedAccountId,
        amount: parseInt(amount, 10),
        memo: balanceMemo.trim() || undefined,
        timestamp: new Date().toISOString()
      };

      await addAccountBalance(newBalance);
      setAmount('');
      setBalanceMemo('');
      setSelectedAccountId('');
      setIsBalanceModalOpen(false);
    } catch (error) {
      console.error('잔액 기록 중 오류:', error);
      alert('잔액 기록에 실패했습니다.');
    }
  };

  const handleDeleteBalance = async (id: string) => {
    if (confirm('이 기록을 삭제하시겠습니까?')) {
      try {
        await deleteAccountBalance(id);
      } catch (error) {
        console.error('삭제 중 오류:', error);
        alert('기록 삭제에 실패했습니다.');
      }
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    const balanceCount = allBalances.filter(b => b.accountId === accountId).length;

    try {
      if (balanceCount > 0) {
        if (confirm(`이 계좌에는 ${balanceCount}개의 잔액 기록이 있습니다. 계좌를 비활성화하시겠습니까? (데이터는 유지됩니다)`)) {
          await updateBankAccount(accountId, { isActive: false });
        }
      } else {
        if (confirm('이 계좌를 삭제하시겠습니까?')) {
          await deleteBankAccount(accountId);
        }
      }
    } catch (error) {
      console.error('계좌 처리 중 오류:', error);
      alert('계좌 처리에 실패했습니다.');
    }
  };

  const handleAccountSaved = () => {
    setSelectedAccountForEdit(null);
  };

  const getLatestBalance = (accountId: string): AccountBalance | undefined => {
    const balances = balancesByAccount.get(accountId);
    return balances && balances.length > 0 ? balances[0] : undefined;
  };

  const handleToggleFavorite = async (account: BankAccount) => {
    const currentIsFavorite = account.isFavorite || false;

    // If trying to favorite and already at limit
    if (!currentIsFavorite && favoriteCount >= 2) {
      alert('즐겨찾기는 최대 2개까지만 가능합니다.');
      return;
    }

    try {
      const success = await toggleBankAccountFavorite(account.id, currentIsFavorite);

      if (!success) {
        alert('즐겨찾기는 최대 2개까지만 가능합니다.');
      }
    } catch (error) {
      console.error('즐겨찾기 토글 중 오류:', error);
      alert('즐겨찾기 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <header className="sticky top-0 bg-slate-50/80 backdrop-blur-md z-40 p-4 md:p-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">통장잔고 관리</h1>
          {accounts.length > 0 && (
            <p className="text-sm text-slate-500 mt-1">즐겨찾기 {favoriteCount}/2</p>
          )}
        </div>
        <button
          onClick={() => {
            setSelectedAccountForEdit(null);
            setIsAccountModalOpen(true);
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 font-bold"
        >
          <Plus size={20} />
          <span>계좌 추가</span>
        </button>
      </header>

      <div className="p-4 md:px-8 space-y-8">
        {/* Hero Card: 전체 잔액 요약 */}
        {accounts.length > 0 && (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Landmark size={120} />
            </div>
            <div className="relative z-10">
              <p className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-2">전체 통장 잔액</p>
              <h2 className="text-4xl md:text-5xl font-black mb-6">
                {formatCurrency(totalBalance)}
              </h2>
              <div className="flex items-center space-x-4 text-blue-100">
                <div className="bg-white/20 px-4 py-2 rounded-full">
                  <span className="font-bold">{accounts.length}개</span> 계좌
                </div>
                <div className="bg-white/20 px-4 py-2 rounded-full">
                  <span className="font-bold">{totalRecordCount}건</span> 기록
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 계좌 카드 그리드 */}
        {accounts.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 px-1">
              <Landmark size={18} className="text-slate-400" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">내 계좌 목록</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((account) => {
                const latestBalance = getLatestBalance(account.id);
                return (
                  <div key={account.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative">
                    {/* Favorite Button */}
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(account);
                        }}
                        className={`p-2 rounded-full transition-all ${
                          account.isFavorite
                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600'
                        }`}
                        title={account.isFavorite ? '즐겨찾기 해제' : '즐겨찾기 추가'}
                      >
                        <Star
                          size={18}
                          className={account.isFavorite ? 'fill-yellow-600' : ''}
                        />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccountForEdit(account);
                          setIsAccountModalOpen(true);
                        }}
                        className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
                      >
                        <Settings size={18} />
                      </button>
                    </div>

                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 pr-20">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl shadow-md">
                          {getBankIcon(account.bankName)}
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-800">{account.bankName}</h3>
                          {account.accountAlias && (
                            <p className="text-sm font-medium text-slate-400">{account.accountAlias}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Balance Display */}
                    <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-5 rounded-2xl mb-4 border border-blue-100">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-wider mb-1">현재 잔액</p>
                      {latestBalance ? (
                        <>
                          <p className="text-3xl font-black text-slate-800 mb-1">
                            {formatCurrency(latestBalance.amount)}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-slate-400">
                            <Clock size={12} />
                            <span>{new Date(latestBalance.timestamp).toLocaleString('ko-KR')}</span>
                          </div>
                        </>
                      ) : (
                        <p className="text-lg font-bold text-slate-400">잔액 기록 없음</p>
                      )}
                    </div>

                    {/* Account Number */}
                    {account.accountNumber && (
                      <div className="mb-4 px-3 py-2 bg-slate-50 rounded-xl">
                        <p className="text-xs text-slate-400 font-medium">
                          {maskAccountNumber(account.accountNumber)}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedAccountId(account.id);
                          setIsBalanceModalOpen(true);
                        }}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                      >
                        잔액 기록
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAccountForHistory(account);
                          setIsHistoryModalOpen(true);
                        }}
                        className="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        <History size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="px-4 py-3 bg-slate-100 text-slate-400 rounded-2xl font-bold text-sm hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {accounts.length === 0 && (
          <div className="py-32 text-center space-y-6">
            <div className="text-8xl grayscale opacity-20">🏦</div>
            <div className="space-y-2">
              <p className="text-slate-800 font-bold text-2xl">계좌를 추가해보세요</p>
              <p className="text-slate-400 font-medium">
                은행별로 계좌를 등록하고<br/>
                각 계좌의 잔액을 관리할 수 있습니다.
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedAccountForEdit(null);
                setIsAccountModalOpen(true);
              }}
              className="px-8 py-4 bg-blue-600 text-white rounded-3xl font-black text-lg shadow-xl shadow-blue-200"
            >
              첫 계좌 추가하기
            </button>
          </div>
        )}
      </div>

      {/* 계좌 추가/수정 모달 */}
      <BankAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => {
          setIsAccountModalOpen(false);
          setSelectedAccountForEdit(null);
        }}
        initialData={selectedAccountForEdit}
        onSave={handleAccountSaved}
      />

      {/* 계좌별 히스토리 모달 */}
      <AccountHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedAccountForHistory(null);
        }}
        account={selectedAccountForHistory}
      />

      {/* 잔액 기록 모달 */}
      {isBalanceModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50">
          <div className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-2xl animate-slide-up">
            <div className="p-8 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800">잔액 기록</h2>
                <button
                  onClick={() => setIsBalanceModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <form onSubmit={handleAddBalance} className="space-y-6">
                {/* 계좌 선택 */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">계좌 선택</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                    required
                  >
                    <option value="">계좌를 선택하세요</option>
                    {accounts.map(account => {
                      const latestBalance = getLatestBalance(account.id);
                      return (
                        <option key={account.id} value={account.id}>
                          {getBankIcon(account.bankName)} {account.bankName}
                          {account.accountAlias && ` - ${account.accountAlias}`}
                          {latestBalance && ` (현재: ${formatCurrency(latestBalance.amount)})`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 금액 입력 */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">현재 잔액</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-6 py-6 bg-slate-50 border-2 border-slate-100 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-3xl font-black text-right transition-all"
                      autoFocus
                      required
                    />
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-xl">₩</span>
                  </div>
                </div>

                {/* 메모 */}
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase mb-2 ml-1">메모 (선택)</label>
                  <input
                    type="text"
                    value={balanceMemo}
                    onChange={(e) => setBalanceMemo(e.target.value)}
                    placeholder="예: 월급 입금 후, 카드값 결제 후"
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-bold"
                  />
                </div>

                <div className="bg-blue-50 p-4 rounded-2xl flex items-start space-x-3">
                  <Clock size={16} className="text-blue-500 mt-0.5" />
                  <p className="text-xs text-blue-700 leading-relaxed font-medium">
                    저장 버튼을 누르는 즉시 <strong>{new Date().toLocaleString('ko-KR')}</strong> 일시로 기록됩니다.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsBalanceModalOpen(false)}
                    className="flex-1 py-4 font-black text-slate-600 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 font-black text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                  >
                    기록 완료
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountBalancePage;
