'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import api from '@/lib/api';

interface ApiData {
  id: number;
  title: string;
  body: string;
  userId: number;
}

export default function Home() {
  const { count, increment, decrement, reset } = useAppStore();
  const [apiData, setApiData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 예제 API 호출 (JSONPlaceholder 사용)
      const response = await api.get<ApiData>('https://jsonplaceholder.typicode.com/posts/1');
      setApiData(response.data);
    } catch (error) {
      console.error('API 호출 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              TaeheonAI
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Next.js PWA with TypeScript, React, Zustand & Axios
            </p>
          </header>

          {/* 메인 콘텐츠 */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Zustand 카운터 예제 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Zustand State Management
              </h2>
              <div className="text-center">
                <div className="text-6xl font-bold text-blue-600 dark:text-blue-400 mb-6">
                  {count}
                </div>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={increment}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    +
                  </button>
                  <button
                    onClick={decrement}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    -
                  </button>
                  <button
                    onClick={reset}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Axios API 예제 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
                Axios API Example
              </h2>
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-600 dark:text-gray-300 mt-2">Loading...</p>
                  </div>
                ) : apiData ? (
                  <div className="space-y-3">
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                        {apiData.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        {apiData.body}
                      </p>
                    </div>
                    <button
                      onClick={fetchData}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg transition-colors"
                    >
                      Refresh Data
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600 dark:text-gray-300">No data available</p>
                    <button
                      onClick={fetchData}
                      className="mt-4 bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Load Data
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* PWA 정보 */}
          <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              PWA Features
            </h2>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl mb-2">📱</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Installable</h3>
                <p className="text-gray-600 dark:text-gray-300">Add to home screen</p>
              </div>
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl mb-2">⚡</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Fast</h3>
                <p className="text-gray-600 dark:text-gray-300">Optimized performance</p>
              </div>
              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl mb-2">🔄</div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Offline</h3>
                <p className="text-gray-600 dark:text-gray-300">Works without internet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
