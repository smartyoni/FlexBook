import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const UpdateNotification: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      {(offlineReady || needRefresh) && (
        <div className="fixed top-4 left-4 right-4 z-50">
          <div className="bg-white rounded-lg shadow-lg border-2 border-blue-500 p-4 max-w-md mx-auto">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {offlineReady && (
                  <>
                    <h3 className="font-bold text-slate-900 mb-1">
                      오프라인 사용 준비 완료
                    </h3>
                    <p className="text-sm text-slate-600">
                      이제 인터넷 연결 없이도 앱을 사용할 수 있습니다.
                    </p>
                  </>
                )}
                {needRefresh && (
                  <>
                    <h3 className="font-bold text-slate-900 mb-1">
                      새 버전 사용 가능
                    </h3>
                    <p className="text-sm text-slate-600 mb-3">
                      FlexBook의 새 버전이 있습니다. 지금 업데이트하시겠습니까?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateServiceWorker(true)}
                        className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        업데이트
                      </button>
                      <button
                        onClick={close}
                        className="px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                      >
                        나중에
                      </button>
                    </div>
                  </>
                )}
              </div>
              {offlineReady && (
                <button onClick={close} className="ml-4 text-slate-400 hover:text-slate-600">
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
