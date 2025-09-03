'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Logout from './Logout';

export default function NavigationTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const [isCustomDomain, setIsCustomDomain] = useState(false);
  const [userInfo, setUserInfo] = useState<{ name?: string; email?: string } | null>(null);
  
  useEffect(() => {
    // 커스텀 도메인인지 확인
    const hostname = window.location.hostname;
    const isCustom = !hostname.includes('vercel.app') && !hostname.includes('localhost');
    setIsCustomDomain(isCustom);
    
    // 사용자 정보 가져오기 (localStorage에서)
    const getUserInfo = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUserInfo({
            name: parsedUser.name || parsedUser.username || '사용자',
            email: parsedUser.email || ''
          });
        }
      } catch (error) {
        console.error('사용자 정보를 가져오는데 실패했습니다:', error);
      }
    };
    
    getUserInfo();
  }, []);
  
  // 현재 경로에 따라 활성 탭 결정
  const getActiveTab = () => {
    if (pathname.startsWith('/materiality')) return 'materiality';
    if (pathname.startsWith('/gri')) return 'gri';
    if (pathname.startsWith('/esrs')) return 'esrs';
    if (pathname.startsWith('/gri/report')) return 'report';
    return 'dashboard';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  const navigationTabs = [
    { id: 'dashboard', name: 'Dashboard', path: '/dashboard', color: 'bg-orange-500' },
    { id: 'materiality', name: 'Materiality', path: '/materiality', color: 'bg-blue-500' },
    { id: 'gri', name: 'GRI', path: '/gri/intake', color: 'bg-blue-500' },
    { id: 'esrs', name: 'ESRS', path: '/esrs/intake', color: 'bg-blue-500' },
    { id: 'report', name: 'Report', path: '/gri/report', color: 'bg-blue-500' }
  ];

  const handleTabClick = (tab: typeof navigationTabs[0]) => {
    setActiveTab(tab.id);
    
    if (isCustomDomain) {
      // 커스텀 도메인에서는 window.location.href 사용
      window.location.href = tab.path;
    } else {
      // Vercel 도메인에서는 Next.js router 사용
      router.push(tab.path);
    }
  };

  const handleUserInfoClick = () => {
    if (isCustomDomain) {
      // 커스텀 도메인에서는 window.location.href 사용
      window.location.href = '/dashboard';
    } else {
      // Vercel 도메인에서는 Next.js router 사용
      router.push('/dashboard');
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center">
          <nav className="flex space-x-1" aria-label="Tabs">
            {navigationTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab)}
                className={`px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? `${tab.color} text-white shadow-lg`
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </nav>
          
          {/* 사용자 정보 및 로그아웃 버튼 */}
          <div className="flex items-center space-x-3">
            {/* 사용자 정보 버튼 */}
            {userInfo && (
              <button
                onClick={handleUserInfoClick}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 cursor-pointer"
                title="Dashboard로 이동"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {userInfo.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-800">{userInfo.name}</div>
                  {userInfo.email && (
                    <div className="text-xs text-gray-500 truncate max-w-32">{userInfo.email}</div>
                  )}
                </div>
              </button>
            )}
            
            {/* 로그아웃 버튼 */}
            <Logout variant="button" className="ml-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
