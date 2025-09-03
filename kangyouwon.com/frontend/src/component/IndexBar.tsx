'use client';

import React, { useEffect, useState } from 'react';

interface IndexItem {
  id: string;
  title: string;
  icon: string;
}

const indexItems: IndexItem[] = [
  { id: 'media-search', title: '미디어 검색', icon: '🔍' },
  { id: 'middle-issuepool', title: '1차 중대성 평가 결과', icon: '📑' },
  { id: 'survey-create', title: '설문 생성', icon: '✅' },
  { id: 'survey-upload', title: '설문 대상 업로드', icon: '📊' },
  { id: 'survey-send', title: '설문 발송', icon: '📝' },
  { id: 'survey-results', title: '설문 결과 확인', icon: '📊' },
  { id: 'final-issuepool', title: '최종 중대성 평가 결과', icon: '📋' },
  { id: 'finish', title: '결과 확인', icon: '🎉' },
];

export default function IndexBar() {
  const [activeSection, setActiveSection] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [visibleSection, setVisibleSection] = useState('media-search'); // 기본적으로 미디어 검색 섹션 표시
  const [completedSteps, setCompletedSteps] = useState<string[]>([]); // 완료된 단계들
  const [maxReachedStep, setMaxReachedStep] = useState<string>('media-search'); // 최대 도달한 단계

  // 저장된 상태 복원
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const savedState = localStorage.getItem('materialityProgressState');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        setVisibleSection(parsedState.visibleSection || 'media-search');
        setCompletedSteps(parsedState.completedSteps || []);
        setMaxReachedStep(parsedState.maxReachedStep || 'media-search');
        console.log('🔄 IndexBar 상태 복원 완료:', parsedState);
      }
    } catch (error) {
      console.error('❌ IndexBar 상태 복원 실패:', error);
    }
  }, []);

  // 섹션 변경 이벤트 감지
  useEffect(() => {
    const handleSectionChange = (event: CustomEvent) => {
      const sectionId = event.detail?.sectionId;
      const completedSteps = event.detail?.completedSteps;
      const maxReachedStep = event.detail?.maxReachedStep;
      
      if (sectionId) {
        setVisibleSection(sectionId);
      }
      if (completedSteps) {
        setCompletedSteps(completedSteps);
      }
      if (maxReachedStep) {
        setMaxReachedStep(maxReachedStep);
      }
    };

    // 커스텀 이벤트 리스너 등록
    window.addEventListener('sectionChange', handleSectionChange as EventListener);

    return () => {
      window.removeEventListener('sectionChange', handleSectionChange as EventListener);
    };
  }, []);

  // 스크롤 위치에 따라 현재 섹션 업데이트
  useEffect(() => {
    const handleScroll = () => {
      interface Section {
        id: string;
        distance: number;
      }

      const sections = indexItems.map(item => {
        const element = document.getElementById(item.id);
        if (element) {
          const rect = element.getBoundingClientRect();
          return {
            id: item.id,
            distance: Math.abs(rect.top),
          } as Section;
        }
        return null;
      }).filter((section): section is Section => section !== null);

      const closest = sections.reduce((prev, curr) => {
        return prev.distance < curr.distance ? prev : curr;
      });

      if (closest) {
        setActiveSection(closest.id);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 초기 로드 시 실행

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 섹션으로 스크롤
  const scrollToSection = (id: string) => {
    // 섹션 표시 상태 변경
    setVisibleSection(id);
    
    // 다른 컴포넌트에서도 섹션 변경을 감지할 수 있도록 커스텀 이벤트 발생
    const sectionChangeEvent = new CustomEvent('sectionChange', { detail: { sectionId: id } });
    window.dispatchEvent(sectionChangeEvent);
    
    // 기존 스크롤 기능 유지
    const element = document.getElementById(id);
    if (element) {
      const navbarHeight = 136; // 네비게이션 바 + 인덱스 바 높이 (조정됨)
      const additionalOffset = 20; // 추가 여유 공간
      const offset = element.offsetTop - navbarHeight - additionalOffset; // 네비게이션 바 높이와 여유 공간 고려
      window.scrollTo({
        top: offset,
        behavior: 'smooth',
      });
    }
  };

  // 토글 기능
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <>
      {/* 기존 사이드바 (숨김 처리) */}
      <div className="hidden">
        <div className="fixed left-8 top-1/2 transform -translate-y-1/2 z-50">
          {isMinimized ? (
            // 최소화된 상태 - 작은 토글 버튼만 표시
            <button
              onClick={toggleMinimize}
              className="bg-white rounded-xl shadow-lg p-3 border border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              title="인덱스 바 열기"
            >
              <span className="text-lg">📋</span>
            </button>
          ) : (
            // 확장된 상태 - 전체 인덱스 바 표시
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200 min-w-[200px]">
              {/* 헤더와 토글 버튼 */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">빠른 이동</h3>
                <button
                  onClick={toggleMinimize}
                  className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="인덱스 바 최소화"
                >
                  <span className="text-lg">−</span>
                </button>
              </div>
              
              {/* 인덱스 아이템들 */}
              <div className="space-y-2">
                {indexItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors duration-200 ${
                      activeSection === item.id
                        ? 'bg-purple-100 text-purple-800'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <span className="mr-2">{item.icon}</span>
                    <span className="text-sm break-keep">{item.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 새로운 스텝 진행률 네비게이션 */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-14 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {indexItems.map((item, index) => {
              const isActive = visibleSection === item.id;
              const isCompleted = completedSteps.includes(item.id);
              const isPending = !isCompleted && !isActive && index > indexItems.findIndex(i => i.id === maxReachedStep);
              
              return (
                <div key={item.id} className="flex items-center flex-1">
                  {/* 스텝 원 */}
                  <div className="flex items-center">
                    <button
                      onClick={() => scrollToSection(item.id)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-lg scale-110'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <span>{index + 1}</span>
                      )}
                    </button>
                    
                    {/* 스텝 제목 */}
                    <div className="ml-3 hidden md:block">
                      <div
                        className={`text-sm font-medium transition-colors duration-200 cursor-pointer break-keep ${
                          isActive
                            ? 'text-blue-600'
                            : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-500'
                        }`}
                        onClick={() => scrollToSection(item.id)}
                      >
                        {item.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {isActive ? '진행 중' : isCompleted ? '완료' : '대기'}
                      </div>
                    </div>
                  </div>
                  
                  {/* 연결선 (마지막 아이템 제외) */}
                  {index < indexItems.length - 1 && (
                    <div className="flex-1 mx-4 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-green-500 w-full'
                            : isActive
                            ? 'bg-blue-500 w-1/2'
                            : 'bg-gray-200 w-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* 전체 진행률 표시 */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">전체 진행률</span>
              <span className="text-sm font-bold text-blue-600">
                {Math.round((completedSteps.length / indexItems.length) * 100)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${(completedSteps.length / indexItems.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}