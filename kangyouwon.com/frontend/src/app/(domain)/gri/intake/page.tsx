'use client';

import React from 'react';
import NavigationTabs from '@/component/NavigationTabs';

export default function GriIntakePage() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('GRI Intake 폼 제출됨');
    // 여기에 폼 제출 로직 추가
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationTabs />
      <div className="p-4 pt-20">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              GRI Intake
            </h1>
            <p className="text-lg text-gray-600">
              GRI 보고서 작성을 위한 기본 정보를 입력해주세요
            </p>
          </div>

          {/* 메인 폼 */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기업 기본 정보 */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  기업 기본 정보
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      기업명
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="기업명을 입력하세요"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      산업 분야
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">산업 분야를 선택하세요</option>
                      <option value="manufacturing">제조업</option>
                      <option value="service">서비스업</option>
                      <option value="retail">소매업</option>
                      <option value="finance">금융업</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      설립 연도
                    </label>
                    <input
                      type="number"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="예: 1990"
                      min="1900"
                      max="2024"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      직원 수
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="">직원 수를 선택하세요</option>
                      <option value="1-50">1-50명</option>
                      <option value="51-200">51-200명</option>
                      <option value="201-1000">201-1000명</option>
                      <option value="1001+">1001명 이상</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* GRI 표준 선택 */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  GRI 표준 선택
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="gri-1"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gri-1" className="ml-3 text-sm text-gray-700">
                      GRI 1: Foundation (2021)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="gri-2"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gri-2" className="ml-3 text-sm text-gray-700">
                      GRI 2: General Disclosures (2021)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="gri-3"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="gri-3" className="ml-3 text-sm text-gray-700">
                      GRI 3: Material Topics (2021)
                    </label>
                  </div>
                </div>
              </div>

              {/* 보고서 범위 */}
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4">
                  보고서 범위
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보고 기간
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <input
                        type="date"
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="date"
                        className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      보고서 언어
                    </label>
                    <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="ko">한국어</option>
                      <option value="en">English</option>
                      <option value="ja">日本語</option>
                      <option value="zh">中文</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 제출 버튼 */}
              <div className="flex justify-end space-x-4 pt-6">
                <button
                  type="button"
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  임시 저장
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
                >
                  제출하기
                </button>
              </div>
            </form>
          </div>

          {/* 정보 박스 */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  GRI 보고서 작성 가이드
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    GRI 표준에 따라 지속가능성 보고서를 작성하기 위한 기본 정보를 입력해주세요. 
                    모든 필수 항목을 작성한 후 제출하시면 GRI 보고서 작성 도구를 사용할 수 있습니다.
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
