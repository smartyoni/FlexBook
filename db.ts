import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
  Unsubscribe,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';
import { auth, firestore } from './firebase';
import {
  Transaction,
  Project,
  Category,
  AccountBalance,
  BankAccount,
  RecurringExpense,
  ScheduledExpense,
} from './types';

// ============================================================================
// 유틸리티 함수
// ============================================================================

const getUserId = (): string => {
  // 인증이 필요 없으므로 고정 ID 반환
  // Firestore 규칙에서 모든 접근을 허용하고 있음
  return 'default_user';
};

// Firestore는 undefined를 저장할 수 없으므로 제거
const cleanData = (obj: any): any => {
  const cleaned: any = {};
  for (const key in obj) {
    if (obj[key] !== undefined) {
      cleaned[key] = obj[key];
    }
  }
  return cleaned;
};

// ============================================================================
// TRANSACTIONS (거래)
// ============================================================================

export const addTransaction = async (data: Omit<Transaction, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/transactions`),
    cleanData({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    })
  );
  return docRef.id;
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/transactions/${id}`);
  await updateDoc(docRef, cleanData({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
};

export const deleteTransaction = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/transactions/${id}`);
  await deleteDoc(docRef);
};

export const getTransactions = (callback: (transactions: Transaction[]) => void): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/transactions`),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Transaction));
      callback(data);
    },
    (error) => {
      console.error('거래 조회 중 오류:', error);
      callback([]);
    }
  );
};

// ============================================================================
// PROJECTS (항목)
// ============================================================================

export const addProject = async (data: Omit<Project, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/projects`),
    cleanData({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    })
  );
  return docRef.id;
};

export const updateProject = async (id: string, data: Partial<Project>) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/projects/${id}`);
  await updateDoc(docRef, cleanData({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
};

export const deleteProject = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/projects/${id}`);
  await deleteDoc(docRef);
};

export const getProjects = (callback: (projects: Project[]) => void): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/projects`),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Project));
      callback(data);
    },
    (error) => {
      console.error('항목 조회 중 오류:', error);
      callback([]);
    }
  );
};

export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/projects/${projectId}`);
  const snapshot = await getDocs(collection(firestore, `users/${userId}/projects`));
  const found = snapshot.docs.find((d) => d.id === projectId);
  if (!found) return null;
  return { id: found.id, ...found.data() } as Project;
};

// ============================================================================
// CATEGORIES (카테고리)
// ============================================================================

export const addCategory = async (data: Omit<Category, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/categories`),
    cleanData(data)
  );
  return docRef.id;
};

export const updateCategory = async (id: string, data: Partial<Category>) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/categories/${id}`);
  await updateDoc(docRef, cleanData(data));
};

export const deleteCategory = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/categories/${id}`);
  await deleteDoc(docRef);
};

export const getCategories = (callback: (categories: Category[]) => void): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/categories`),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Category));
      callback(data);
    },
    (error) => {
      console.error('카테고리 조회 중 오류:', error);
      callback([]);
    }
  );
};

export const initializeCategories = async () => {
  const userId = getUserId();
  try {
    const snapshot = await getDocs(
      collection(firestore, `users/${userId}/categories`)
    );

    if (snapshot.empty) {
      // 기본 카테고리 생성
      const defaultCategories: Omit<Category, 'id'>[] = [
        { name: '식비', type: 'expense', icon: '🍲', color: '#FF6B6B', order: 0 },
        { name: '교통비', type: 'expense', icon: '🚌', color: '#4DABF7', order: 1 },
        { name: '사무실비용', type: 'expense', icon: '🏢', color: '#51CF66', order: 2 },
        { name: '주거/통신', type: 'expense', icon: '🏠', color: '#FCC419', order: 3 },
        { name: '의료/건강', type: 'expense', icon: '🏥', color: '#FF922B', order: 4 },
        { name: '사업수입', type: 'income', icon: '💰', color: '#339AF0', order: 5 },
        { name: '중개수수료', type: 'income', icon: '🤝', color: '#20C997', order: 6 },
        { name: '금융소득', type: 'income', icon: '📈', color: '#94D82D', order: 7 },
        { name: '기타수입', type: 'income', icon: '🎁', color: '#845EF7', order: 8 },
      ];

      const batch = writeBatch(firestore);
      for (const category of defaultCategories) {
        const docRef = doc(collection(firestore, `users/${userId}/categories`));
        batch.set(docRef, category);
      }
      await batch.commit();
      console.log('기본 카테고리 생성 완료');
    }
  } catch (error) {
    console.error('카테고리 초기화 중 오류:', error);
  }
};

// ============================================================================
// BANK ACCOUNTS (은행 계좌)
// ============================================================================

export const addBankAccount = async (data: Omit<BankAccount, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/bankAccounts`),
    cleanData({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
    })
  );
  return docRef.id;
};

export const updateBankAccount = async (id: string, data: Partial<BankAccount>) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/bankAccounts/${id}`);
  await updateDoc(docRef, cleanData(data));
};

export const deleteBankAccount = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/bankAccounts/${id}`);
  await deleteDoc(docRef);
};

export const getBankAccounts = (callback: (accounts: BankAccount[]) => void): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/bankAccounts`),
    (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as BankAccount))
        .filter((acc) => acc.isActive);
      callback(data);
    },
    (error) => {
      console.error('계좌 조회 중 오류:', error);
      callback([]);
    }
  );
};

/**
 * Toggle favorite status for a bank account
 * Ensures max 2 favorites at a time
 * @returns true if toggled successfully, false if max favorites reached
 */
export const toggleBankAccountFavorite = async (accountId: string, currentIsFavorite: boolean): Promise<boolean> => {
  try {
    const userId = getUserId();

    // If trying to favorite (currentIsFavorite is false, so we want to set it to true)
    if (!currentIsFavorite) {
      // Check current favorite count
      const accountsRef = collection(firestore, `users/${userId}/bankAccounts`);
      const q = query(accountsRef, where('isActive', '==', true), where('isFavorite', '==', true));
      const snapshot = await getDocs(q);

      if (snapshot.size >= 2) {
        // Already have 2 favorites, cannot add more
        return false;
      }
    }

    // Toggle the favorite status
    const accountRef = doc(firestore, `users/${userId}/bankAccounts/${accountId}`);
    await updateDoc(accountRef, {
      isFavorite: !currentIsFavorite
    });

    return true;
  } catch (error) {
    console.error('즐겨찾기 토글 중 오류:', error);
    throw error;
  }
};

// ============================================================================
// ACCOUNT BALANCES (잔액 기록)
// ============================================================================

export const addAccountBalance = async (data: Omit<AccountBalance, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/accountBalances`),
    cleanData({
      ...data,
      timestamp: data.timestamp || new Date().toISOString(),
    })
  );
  return docRef.id;
};

export const updateAccountBalance = async (id: string, data: Partial<AccountBalance>) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/accountBalances/${id}`);
  await updateDoc(docRef, cleanData(data));
};

export const deleteAccountBalance = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/accountBalances/${id}`);
  await deleteDoc(docRef);
};

export const getAccountBalances = (
  callback: (balances: AccountBalance[]) => void
): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/accountBalances`),
    (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as AccountBalance));
      callback(data);
    },
    (error) => {
      console.error('잔액 조회 중 오류:', error);
      callback([]);
    }
  );
};

// ============================================================================
// RECURRING EXPENSES (고정지출)
// ============================================================================

export const addRecurringExpense = async (data: Omit<RecurringExpense, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/recurringExpenses`),
    cleanData({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    })
  );
  return docRef.id;
};

export const updateRecurringExpense = async (
  id: string,
  data: Partial<RecurringExpense>
) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/recurringExpenses/${id}`);
  await updateDoc(docRef, cleanData({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
};

export const deleteRecurringExpense = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/recurringExpenses/${id}`);
  await deleteDoc(docRef);
};

export const getRecurringExpenses = (
  callback: (expenses: RecurringExpense[]) => void
): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/recurringExpenses`),
    (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as RecurringExpense))
        .filter((exp) => exp.isActive);
      callback(data);
    },
    (error) => {
      console.error('고정지출 조회 중 오류:', error);
      callback([]);
    }
  );
};

// ============================================================================
// SCHEDULED EXPENSES (예정된 지출)
// ============================================================================

export const addScheduledExpense = async (data: Omit<ScheduledExpense, 'id'>) => {
  const userId = getUserId();
  const docRef = await addDoc(
    collection(firestore, `users/${userId}/scheduledExpenses`),
    cleanData({
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    })
  );
  return docRef.id;
};

export const updateScheduledExpense = async (
  id: string,
  data: Partial<ScheduledExpense>
) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/scheduledExpenses/${id}`);
  await updateDoc(docRef, cleanData({
    ...data,
    updatedAt: new Date().toISOString(),
  }));
};

export const deleteScheduledExpense = async (id: string) => {
  const userId = getUserId();
  const docRef = doc(firestore, `users/${userId}/scheduledExpenses/${id}`);
  await deleteDoc(docRef);
};

export const getScheduledExpenses = (
  callback: (expenses: ScheduledExpense[]) => void
): Unsubscribe => {
  const userId = getUserId();
  return onSnapshot(
    collection(firestore, `users/${userId}/scheduledExpenses`),
    (snapshot) => {
      const data = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as ScheduledExpense))
        .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
      callback(data);
    },
    (error) => {
      console.error('예정된 지출 조회 중 오류:', error);
      callback([]);
    }
  );
};

// ============================================================================
// 초기화 함수
// ============================================================================

export const initializeDefaults = async () => {
  try {
    await initializeCategories();
    console.log('Firebase 초기화 완료');
  } catch (error) {
    console.error('초기화 중 오류:', error);
  }
};
