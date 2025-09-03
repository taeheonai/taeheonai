'use client';

import React, { useState } from 'react';
import NavigationTabs from '@/component/NavigationTabs';

export default function GriReportPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [reportData] = useState({
    companyName: 'ABC 기업',
    reportYear: '2024',
    industry: '제조업',
    employeeCount: '201-1000명'
  });

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleSave = () => {
    console.log('GRI 보고서 저장됨');
    // 여기에 저장 로직 추가
  };

  const handlePublish = () => {
    console.log('GRI 보고서 발행됨');
    // 여기에 발행 로직 추가
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <NavigationTabs />
      <div className="p-4 pt-20">
        <div className="max-w-6xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              GRI 지속가능성 보고서
            </h1>
            <div className="bg-white rounded-lg shadow-md p-4 inline-block">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                <div>
                  <span className="text-gray-500">기업명:</span>
                  <span className="ml-2 font-medium">{reportData.companyName}</span>
                </div>
                <div>
                  <span className="text-gray-500">보고연도:</span>
                  <span className="ml-2 font-medium">{reportData.reportYear}</span>
                </div>
                <div>
                  <span className="text-gray-500">산업:</span>
                  <span className="ml-2 font-medium">{reportData.industry}</span>
                </div>
                <div>
                  <span className="text-gray-500">직원수:</span>
                  <span className="ml-2 font-medium">{reportData.employeeCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-t-xl shadow-lg">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                {[
                  { id: 'general', name: '일반 공시', icon: '📋' },
                  { id: 'economic', name: '경제적 영향', icon: '💰' },
                  { id: 'environmental', name: '환경적 영향', icon: '🌱' },
                  { id: 'social', name: '사회적 영향', icon: '👥' },
                  { id: 'governance', name: '거버넌스', icon: '🏛️' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-2">{tab.icon}</span>
                    {tab.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="bg-white rounded-b-xl shadow-lg p-8">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800">일반 공시 (GRI 2)</h2>
                
                {/* 조직 개요 */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">조직 개요</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        조직의 활동, 사업 모델 및 가치 사슬
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="조직의 주요 활동과 사업 모델을 설명하세요..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        조직의 위치 및 운영 국가
                      </label>
                      <textarea
                        rows={4}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="운영 국가와 주요 위치를 설명하세요..."
                      />
                    </div>
                  </div>
                </div>

                {/* 이해관계자 참여 */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">이해관계자 참여</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이해관계자 그룹 식별
                      </label>
                      <div className="space-y-2">
                        {['고객', '직원', '투자자', '공급업체', '지역사회', '정부'].map((group) => (
                          <label key={group} className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{group}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        이해관계자 참여 방법
                      </label>
                      <textarea
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="이해관계자와의 소통 방법을 설명하세요..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'economic' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800">경제적 영향 (GRI 200)</h2>
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">💰</div>
                  <p>경제적 영향 관련 지표를 작성할 수 있습니다.</p>
                  <p className="text-sm mt-2">GRI 200 시리즈의 경제적 영향 지표를 선택하여 작성하세요.</p>
                </div>
              </div>
            )}

            {activeTab === 'environmental' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800">환경적 영향 (GRI 300)</h2>
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🌱</div>
                  <p>환경적 영향 관련 지표를 작성할 수 있습니다.</p>
                  <p className="text-sm mt-2">GRI 300 시리즈의 환경적 영향 지표를 선택하여 작성하세요.</p>
                </div>
              </div>
            )}

            {activeTab === 'social' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800">사회적 영향 (GRI 400)</h2>
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">👥</div>
                  <p>사회적 영향 관련 지표를 작성할 수 있습니다.</p>
                  <p className="text-sm mt-2">GRI 400 시리즈의 사회적 영향 지표를 선택하여 작성하세요.</p>
                </div>
              </div>
            )}

            {activeTab === 'governance' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-semibold text-gray-800">거버넌스 (GRI 2-30)</h2>
                <div className="text-center py-12 text-gray-500">
                  <div className="text-6xl mb-4">🏛️</div>
                  <p>거버넌스 관련 지표를 작성할 수 있습니다.</p>
                  <p className="text-sm mt-2">GRI 2-30 시리즈의 거버넌스 지표를 선택하여 작성하세요.</p>
                </div>
              </div>
            )}
          </div>

          {/* 진행률 표시 */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-800">보고서 작성 진행률</h3>
              <span className="text-2xl font-bold text-green-600">25%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className="bg-green-600 h-3 rounded-full" style={{ width: '25%' }}></div>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              완료된 섹션: 1/4 (일반 공시)
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              onClick={handleSave}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              임시 저장
            </button>
            <button
              onClick={handlePublish}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium"
            >
              보고서 발행
            </button>
          </div>

          {/* 도움말 */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  GRI 보고서 작성 팁
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    각 섹션을 순서대로 작성하시면 됩니다. 일반 공시부터 시작하여 경제적, 환경적, 사회적 영향, 
                    그리고 거버넌스 순으로 작성하는 것을 권장합니다. 모든 필수 지표를 작성한 후 보고서를 발행할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
