'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';

interface NavigationProps {
  user?: {
    name: string;
    corporation_id: string;
    corporation_name?: string;
  } | null;
}

export default function Navigation({ user }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    router.push('/login');
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex space-x-8">
              <Link 
                href="/dashboard"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/dashboard') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Dashboard
              </Link>
              <Link 
                href="/materiality"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/materiality') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Materiality
              </Link>
              <Link 
                href="/gri"
                prefetch={false}
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/gri') || isActive('/gri/intake') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                GRI
              </Link>
              <Link 
                href="/esrs"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/esrs') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                ESRS
              </Link>
              <Link 
                href="/report"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/report') 
                    ? 'border-blue-500 text-blue-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Report
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <div className="flex items-center space-x-4">
              {user && (
                <div className="flex flex-col items-end">
                  <span className="text-sm font-medium text-gray-900">
                    {user.name}
                  </span>
                  <span className="text-xs text-gray-600">
                    {user.corporation_name || user.corporation_id}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
