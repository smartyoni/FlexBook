import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  Firestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';

// Firebase 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyAFsQEjIs8bB54p5KD_zZ8DIBIkDbwj78o",
  authDomain: "flexbook-20a62.firebaseapp.com",
  projectId: "flexbook-20a62",
  storageBucket: "flexbook-20a62.firebasestorage.app",
  messagingSenderId: "95328153412",
  appId: "1:95328153412:web:0c52cae9dacd6ed24418d3"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Auth 인스턴스 생성
export const auth: Auth = getAuth(app);

// Firestore 인스턴스 생성 (현대적 캐시 API 사용)
export const firestore: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

console.log('Firestore 오프라인 지속성 활성화됨');

// 익명 로그인 함수
export const initAuth = async (): Promise<void> => {
  try {
    const user = auth.currentUser;

    // 이미 로그인한 사용자가 있으면 스킵
    if (user) {
      console.log('이미 인증된 사용자:', user.uid);
      return;
    }

    // 익명 로그인
    const result = await signInAnonymously(auth);
    console.log('Firebase 익명 로그인 성공:', result.user.uid);
  } catch (error) {
    console.error('Firebase 인증 중 오류 발생:', error);
    throw error;
  }
};

export default app;
