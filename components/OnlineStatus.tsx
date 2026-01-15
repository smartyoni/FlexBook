import React, { useEffect, useState } from 'react';

export const OnlineStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showToast) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50">
      <div className={`max-w-md mx-auto rounded-lg shadow-lg p-3 ${
        isOnline ? 'bg-green-500' : 'bg-orange-500'
      }`}>
        <p className="text-white font-medium text-center">
          {isOnline ? '✓ 온라인으로 연결됨' : '⚠ 오프라인 모드 (변경사항은 나중에 동기화됩니다)'}
        </p>
      </div>
    </div>
  );
};
