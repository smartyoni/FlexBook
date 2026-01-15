import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
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

// Auth 및 Firestore 인스턴스 생성
export const auth: Auth = getAuth(app);
export const firestore: Firestore = getFirestore(app);

// Firestore 오프라인 지속성 활성화
enableIndexedDbPersistence(firestore, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
})
  .then(() => {
    console.log('Firestore 오프라인 지속성 활성화됨');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('여러 탭이 열려있어 지속성을 활성화할 수 없습니다.');
    } else if (err.code === 'unimplemented') {
      console.warn('현재 브라우저는 오프라인 지속성을 지원하지 않습니다.');
    }
  });

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
