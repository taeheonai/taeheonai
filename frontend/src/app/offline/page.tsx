export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">📱</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          오프라인 모드
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          인터넷 연결이 없습니다. 일부 기능이 제한될 수 있습니다.
        </p>
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-500">
          <p>✅ 캐시된 콘텐츠는 계속 사용 가능</p>
          <p>❌ 새로운 데이터는 다운로드 불가</p>
          <p>🔄 인터넷 연결 복구 시 자동 동기화</p>
        </div>
      </div>
    </div>
  );
}
