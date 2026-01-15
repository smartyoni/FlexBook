
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount).replace('₩', '') + '원';
};

export const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
};

export const getMonthYear = (date: Date): string => {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const exportToJSON = async (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const downloadCSV = (headers: string[], rows: any[][], filename: string) => {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const maskAccountNumber = (accountNumber?: string): string => {
  if (!accountNumber) return '계좌번호 미등록';
  if (accountNumber.length <= 4) return accountNumber;
  return `****${accountNumber.slice(-4)}`;
};

export const getBankIcon = (bankName: string): string => {
  const iconMap: Record<string, string> = {
    '국민은행': '🟡',
    '신한은행': '🔵',
    '우리은행': '🔷',
    '하나은행': '🟢',
    'KB국민은행': '🟡',
    'NH농협은행': '🌾',
    'IBK기업은행': '📦',
    '카카오뱅크': '🟨',
    '토스뱅크': '💙',
    '케이뱅크': '🟦',
    '새마을금고': '🏘️',
    '신협': '🤝',
    '우체국': '📮',
  };
  return iconMap[bankName] || '🏦';
};
