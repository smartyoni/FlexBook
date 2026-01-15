import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 30000);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-2xl p-4 max-w-md mx-auto">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center flex-shrink-0">
            <img src="/FlexBook/logo.svg" alt="FlexBook" className="w-10 h-10" />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">FlexBook 설치</h3>
            <p className="text-white/90 text-sm mb-3">
              홈 화면에 추가하고 앱처럼 빠르게 접속하세요
            </p>
            <button
              onClick={handleInstall}
              className="w-full bg-white text-blue-600 font-bold py-2 px-4 rounded-lg hover:bg-blue-50 transition-colors"
            >
              설치하기
            </button>
          </div>
          <button
            onClick={() => setShowPrompt(false)}
            className="text-white/80 hover:text-white transition-colors flex-shrink-0"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
