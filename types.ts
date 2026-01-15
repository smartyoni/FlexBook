
export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  order: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  projectId: string | null;
  date: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankAccount {
  id: string;
  bankName: string;
  accountAlias?: string;
  accountNumber?: string;
  memo?: string;
  createdAt: string;
  isActive: boolean;
  isFavorite?: boolean;
}

export interface AccountBalance {
  id: string;
  accountId: string;
  amount: number;
  memo?: string;
  timestamp: string;
}

export interface MonthlySummary {
  income: number;
  expense: number;
  balance: number;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  dayOfMonth: number;
  memo?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  recurrenceType: 'regular' | 'irregular';
  months?: number[];
}

export interface ScheduledExpense {
  id: string;
  name: string;
  amount: number;
  category: string;
  scheduledDate: string;
  memo?: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}
