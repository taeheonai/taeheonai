'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Navigation from '@/components/Navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { type GRIReportStructure, type SavedAnswers } from '@/lib/griApi';
import { useSessionStore } from '@/store/sessionStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useMGStore } from '@/store/mgStore';
import { useIntakeStore } from '@/store/intakeStore';
import { 
  integrateReportData, 
  getDisplayText, 
  getSourceBadge,
  type IntegratedAnswers,
  type IntegratedAnswer,
  getIntegrationSummary
} from '@/lib/reportDataIntegrator';
import { Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Word 다운로드 유틸리티 함수
const downloadAsWord = (content: string, filename: string) => {
  const htmlContent = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <meta name='ProgId' content='Word.Document'>
        <meta name='Generator' content='Microsoft Word 15'>
        <meta name='Originator' content='Microsoft Word 15'>
        <style>
          body { font-family: 'Malgun Gothic', Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #1e40af; margin-top: 30px; }
          h3 { color: #1e3a8a; margin-top: 20px; }
          .esg-section { margin: 20px 0; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
          .environmental { background-color: #f0fdf4; border-color: #22c55e; }
          .social { background-color: #eff6ff; border-color: #3b82f6; }
          .governance { background-color: #faf5ff; border-color: #8b5cf6; }
          .gri-item { margin: 15px 0; padding: 10px; background-color: #f9fafb; border-radius: 4px; }
          .issue-pool { font-weight: bold; color: #374151; }
          .polished-text { margin-top: 10px; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        ${content}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword'
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 안전한 데이터 표시 컴포넌트
function SafeDataDisplay({ integratedData }: { integratedData: IntegratedAnswers }) {
  try {
    // 데이터가 없으면 빈 화면 표시
    if (!integratedData || typeof integratedData !== 'object' || Object.keys(integratedData).length === 0) {
      return (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">로컬에 저장된 윤문 데이터가 없습니다.</p>
          <p className="text-sm text-gray-400 mt-2">MG 페이지에서 윤문을 진행해보세요.</p>
        </div>
      );
    }

    // 데이터가 있으면 안전하게 렌더링
    const dataKeys = Object.keys(integratedData);
    console.log('🔍 SafeDataDisplay 렌더링 시작:', dataKeys);
    
    // GRI Intake 데이터만 필터링
    const intakeOnlyData: IntegratedAnswers = {};
    dataKeys.forEach((griIndex) => {
      const indexData = integratedData[griIndex];
      if (indexData && typeof indexData === 'object') {
        const intakeQuestions: Record<string, IntegratedAnswer> = {};
        let hasIntakeData = false;
        
        Object.entries(indexData).forEach(([questionKey, answer]) => {
          if (answer && typeof answer === 'object' && answer.source === 'intake') {
            intakeQuestions[questionKey] = answer;
            hasIntakeData = true;
          }
        });
        
        if (hasIntakeData) {
          intakeOnlyData[griIndex] = intakeQuestions;
        }
      }
    });

    const intakeDataKeys = Object.keys(intakeOnlyData);

    const handleDownloadIntake = () => {
      const content = `
        <h1>공통 GRI INDEX (GRI Intake) 보고서</h1>
        <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
        <p>GRI Intake에서 작성된 윤문 데이터만 포함됩니다.</p>
        
        ${intakeDataKeys.map((griIndex) => {
          const indexData = intakeOnlyData[griIndex];
          const questionKeys = Object.keys(indexData);
          
          return `
            <div class="gri-item">
              <h2>GRI ${griIndex}</h2>
              ${questionKeys.map((questionKey) => {
                const answer = indexData[questionKey];
                const displayText = answer.polished_text || answer.answer_text || '텍스트 없음';
                
                return `
                  <div style="margin: 15px 0; padding: 10px; background-color: #f9fafb; border-radius: 4px;">
                    <h3>Q${questionKey}</h3>
                    <div class="polished-text">${displayText}</div>
                    <p><small>소스: ${answer.source || 'Unknown'}</small></p>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }).join('')}
      `;
      
      downloadAsWord(content, `GRI_Intake_보고서_${new Date().toISOString().split('T')[0]}`);
    };

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">공통 GRI INDEX (GRI Intake만)</h2>
          <button
            onClick={handleDownloadIntake}
            className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Word 다운로드
          </button>
        </div>
        <div className="text-sm text-gray-600 mb-4">
          GRI Intake에서 작성된 윤문 데이터만 표시합니다.
        </div>
        
        <div className="space-y-4">
          {intakeDataKeys.length > 0 ? (
            intakeDataKeys.map((griIndex) => {
              try {
                console.log(`🔍 GRI ${griIndex} 렌더링 시작 (Intake만)`);
                const indexData = intakeOnlyData[griIndex];
                if (!indexData || typeof indexData !== 'object') {
                  console.warn(`⚠️ GRI ${griIndex} 데이터가 유효하지 않음:`, indexData);
                  return null;
                }
                
                const questionKeys = Object.keys(indexData);
                console.log(`🔍 GRI ${griIndex} 질문 키들 (Intake만):`, questionKeys);
                
                return (
                  <div key={griIndex} className="border rounded p-4">
                    <h3 className="font-medium text-gray-900 mb-2">GRI {griIndex}</h3>
                    <div className="space-y-2">
                      {questionKeys.map((questionKey) => {
                        try {
                          console.log(`🔍 Q${questionKey} 렌더링 시작 (Intake만)`);
                          const answer = indexData[questionKey];
                          if (!answer || typeof answer !== 'object') {
                            console.warn(`⚠️ Q${questionKey} 답변이 유효하지 않음:`, answer);
                            return null;
                          }
                          
                          console.log(`🔍 Q${questionKey} 답변 데이터 (Intake만):`, answer);
                          
                          // getDisplayText 함수 안전하게 호출
                          let displayText = '데이터 로드 중...';
                          try {
                            if (getDisplayText && typeof getDisplayText === 'function') {
                              displayText = getDisplayText(answer);
                            } else {
                              // 함수가 없으면 직접 데이터에서 추출
                              displayText = answer.polished_text || answer.answer_text || '텍스트 없음';
                            }
                          } catch (error) {
                            console.warn(`⚠️ getDisplayText 호출 오류:`, error);
                            // 오류 발생 시 직접 데이터에서 추출
                            displayText = answer.polished_text || answer.answer_text || '텍스트 로드 실패';
                          }
                          
                          // getSourceBadge 함수 안전하게 호출
                          let sourceBadge = 'Unknown';
                          try {
                            if (getSourceBadge && typeof getSourceBadge === 'function') {
                              sourceBadge = getSourceBadge(answer);
                            } else {
                              // 함수가 없으면 직접 데이터에서 추출
                              sourceBadge = answer.source || 'Unknown';
                            }
                          } catch (error) {
                            console.warn(`⚠️ getSourceBadge 호출 오류:`, error);
                            // 오류 발생 시 직접 데이터에서 추출
                            sourceBadge = answer.source || 'Unknown';
                          }
                         
                          return (
                            <div key={questionKey} className="text-sm">
                              <span className="font-medium text-gray-700">Q{questionKey}:</span>
                              <div className="ml-2 mt-2">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    table: props => (
                                      <table className="min-w-full divide-y divide-gray-300 my-4">
                                        {props.children}
                                      </table>
                                    ),
                                    thead: props => (
                                      <thead className="bg-gray-50">
                                        {props.children}
                                      </thead>
                                    ),
                                    th: props => (
                                      <th className="py-2 px-4 text-left text-sm font-semibold text-gray-900">
                                        {props.children}
                                      </th>
                                    ),
                                    td: props => (
                                      <td className="py-2 px-4 text-sm text-gray-500 border-t">
                                        {props.children}
                                      </td>
                                    ),
                                  }}
                                >
                                  {displayText}
                                </ReactMarkdown>
                              </div>
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                                answer.source === 'mg' ? 'bg-blue-100 text-blue-800' :
                                answer.source === 'intake' ? 'bg-green-800 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {sourceBadge}
                              </span>
                            </div>
                          );
                        } catch (error) {
                          console.error(`❌ Q${questionKey} 렌더링 오류:`, error);
                          return (
                            <div key={questionKey} className="text-sm text-red-500">
                              Q{questionKey}: 렌더링 오류
                            </div>
                          );
                        }
                      })}
                    </div>
                  </div>
                );
              } catch (error) {
                console.error(`❌ GRI ${griIndex} 렌더링 오류:`, error);
                return (
                  <div key={griIndex} className="border rounded p-4 text-red-500">
                    GRI {griIndex}: 렌더링 오류
                  </div>
                );
              }
            })
          ) : (
            <div className="text-center text-gray-500 py-8">
              GRI Intake에서 작성된 윤문 데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('❌ SafeDataDisplay 전체 렌더링 오류:', error);
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-red-500">데이터 표시 중 오류가 발생했습니다.</p>
        <p className="text-sm text-gray-400 mt-2">오류: {error instanceof Error ? error.message : '알 수 없는 오류'}</p>
        <p className="text-sm text-gray-400 mt-2">페이지를 새로고침해주세요.</p>
      </div>
    );
  }
}

// 안전한 통계 표시 컴포넌트
function SafeStatsDisplay({ integratedData }: { integratedData: IntegratedAnswers }) {
  try {
    const safeData = integratedData || {};
    
    // getIntegrationSummary 함수를 사용하여 정확한 통계 계산
    const summary = getIntegrationSummary(safeData);
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
          <span className="text-sm text-gray-700">
            MG (Materiality→GRI): {summary.mgIndexes}개 인덱스
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-green-500 rounded-full"></span>
          <span className="text-sm text-gray-700">
            GRI Intake: {summary.intakeIndexes}개 인덱스
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
          <span className="text-sm text-gray-700">
            Server (기존): {summary.serverIndexes}개 인덱스
          </span>
        </div>
      </div>
    );
  } catch (error) {
    console.error('SafeStatsDisplay 렌더링 오류:', error);
    return (
      <div className="text-sm text-gray-500">
        통계 계산 중 오류가 발생했습니다.
      </div>
    );
  }
}

// ESG별 분류된 MG 데이터 표시 컴포넌트
function ESGClassifiedMGDisplay() {
  const { getESGIndexes } = useMGStore();
  const esgData = getESGIndexes();

  const handleDownloadMG = () => {
    const content = `
      <h1>MG (Materiality→GRI) - ESG별 분류 보고서</h1>
      <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
      
      <div class="esg-section environmental">
        <h2>Environmental (환경) - ${esgData.environmental.length}개</h2>
        ${esgData.environmental.map(({ griIndex, result, issuePool }) => `
          <div class="gri-item">
            <h3>GRI ${griIndex}</h3>
            <div class="issue-pool">이슈풀: ${issuePool?.issue_pool || '이슈풀 없음'}</div>
            <div class="polished-text">${result.polished_text || '윤문 텍스트 없음'}</div>
            <p><small>저장일: ${result.savedAt ? new Date(result.savedAt).toLocaleDateString('ko-KR') : '날짜 없음'}</small></p>
          </div>
        `).join('')}
      </div>

      <div class="esg-section social">
        <h2>Social (사회) - ${esgData.social.length}개</h2>
        ${esgData.social.map(({ griIndex, result, issuePool }) => `
          <div class="gri-item">
            <h3>GRI ${griIndex}</h3>
            <div class="issue-pool">이슈풀: ${issuePool?.issue_pool || '이슈풀 없음'}</div>
            <div class="polished-text">${result.polished_text || '윤문 텍스트 없음'}</div>
            <p><small>저장일: ${result.savedAt ? new Date(result.savedAt).toLocaleDateString('ko-KR') : '날짜 없음'}</small></p>
          </div>
        `).join('')}
      </div>

      <div class="esg-section governance">
        <h2>Governance (지배구조) - ${esgData.governance.length}개</h2>
        ${esgData.governance.map(({ griIndex, result, issuePool }) => `
          <div class="gri-item">
            <h3>GRI ${griIndex}</h3>
            <div class="issue-pool">이슈풀: ${issuePool?.issue_pool || '이슈풀 없음'}</div>
            <div class="polished-text">${result.polished_text || '윤문 텍스트 없음'}</div>
            <p><small>저장일: ${result.savedAt ? new Date(result.savedAt).toLocaleDateString('ko-KR') : '날짜 없음'}</small></p>
          </div>
        `).join('')}
      </div>
    `;
    
    downloadAsWord(content, `MG_ESG_분류_보고서_${new Date().toISOString().split('T')[0]}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">MG (Materiality→GRI) - ESG별 분류</h2>
        <button
          onClick={handleDownloadMG}
          className="flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4 mr-2" />
          Word 다운로드
        </button>
      </div>
      <div className="text-sm text-gray-600 mb-4">
        Materiality에서 윤문한 데이터를 ESG 카테고리별로 분류하여 표시합니다.
      </div>
      
      <div className="space-y-6">
        {/* Environmental (E) */}
        <div className="border border-green-200 rounded-lg p-6 bg-green-50">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
              E
            </div>
            <h3 className="font-semibold text-green-800 text-lg">Environmental</h3>
            <span className="ml-auto bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full">
              {esgData.environmental.length}개
            </span>
          </div>
          
          <div className="space-y-4">
            {esgData.environmental.map(({ griIndex, result, issuePool }) => (
              <div key={griIndex} className="bg-white rounded-lg p-4 border border-green-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-green-700 text-lg">GRI {griIndex}</span>
                  <span className="text-sm bg-green-100 text-green-700 px-3 py-1 rounded-full">
                    {issuePool?.issue_pool || '이슈풀 없음'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: props => (
                        <table className="min-w-full divide-y divide-gray-300 my-4">
                          {props.children}
                        </table>
                      ),
                      thead: props => (
                        <thead className="bg-gray-50">
                          {props.children}
                        </thead>
                      ),
                      th: props => (
                        <th className="py-2 px-4 text-left text-sm font-semibold text-gray-900">
                          {props.children}
                        </th>
                      ),
                      td: props => (
                        <td className="py-2 px-4 text-sm text-gray-500 border-t">
                          {props.children}
                        </td>
                      ),
                    }}
                  >
                    {result.polished_text || '윤문 텍스트 없음'}
                  </ReactMarkdown>
                </div>
                <div className="text-sm text-gray-500">
                  저장: {result.savedAt ? new Date(result.savedAt).toLocaleDateString() : '날짜 없음'}
                </div>
              </div>
            ))}
            
            {esgData.environmental.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Environmental 카테고리의 윤문 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Social (S) */}
        <div className="border border-blue-200 rounded-lg p-6 bg-blue-50">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
              S
            </div>
            <h3 className="font-semibold text-blue-800 text-lg">Social</h3>
            <span className="ml-auto bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full">
              {esgData.social.length}개
            </span>
          </div>
          
          <div className="space-y-4">
            {esgData.social.map(({ griIndex, result, issuePool }) => (
              <div key={griIndex} className="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-blue-700 text-lg">GRI {griIndex}</span>
                  <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                    {issuePool?.issue_pool || '이슈풀 없음'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: props => (
                        <table className="min-w-full divide-y divide-gray-300 my-4">
                          {props.children}
                        </table>
                      ),
                      thead: props => (
                        <thead className="bg-gray-50">
                          {props.children}
                        </thead>
                      ),
                      th: props => (
                        <th className="py-2 px-4 text-left text-sm font-semibold text-gray-900">
                          {props.children}
                        </th>
                      ),
                      td: props => (
                        <td className="py-2 px-4 text-sm text-gray-500 border-t">
                          {props.children}
                        </td>
                      ),
                    }}
                  >
                    {result.polished_text || '윤문 텍스트 없음'}
                  </ReactMarkdown>
                </div>
                <div className="text-sm text-gray-500">
                  저장: {result.savedAt ? new Date(result.savedAt).toLocaleDateString() : '날짜 없음'}
                </div>
              </div>
            ))}
            
            {esgData.social.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Social 카테고리의 윤문 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Governance (G) */}
        <div className="border border-purple-200 rounded-lg p-6 bg-purple-50">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg mr-3">
              G
            </div>
            <h3 className="font-semibold text-purple-800 text-lg">Governance</h3>
            <span className="ml-auto bg-purple-100 text-purple-800 text-sm px-3 py-1 rounded-full">
              {esgData.governance.length}개
            </span>
          </div>
          
          <div className="space-y-4">
            {esgData.governance.map(({ griIndex, result, issuePool }) => (
              <div key={griIndex} className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-purple-700 text-lg">GRI {griIndex}</span>
                  <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                    {issuePool?.issue_pool || '이슈풀 없음'}
                  </span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-3">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: props => (
                        <table className="min-w-full divide-y divide-gray-300 my-4">
                          {props.children}
                        </table>
                      ),
                      thead: props => (
                        <thead className="bg-gray-50">
                          {props.children}
                        </thead>
                      ),
                      th: props => (
                        <th className="py-2 px-4 text-left text-sm font-semibold text-gray-900">
                          {props.children}
                        </th>
                      ),
                      td: props => (
                        <td className="py-2 px-4 text-sm text-gray-500 border-t">
                          {props.children}
                        </td>
                      ),
                    }}
                  >
                    {result.polished_text || '윤문 텍스트 없음'}
                  </ReactMarkdown>
                </div>
                <div className="text-sm text-gray-500">
                  저장: {result.savedAt ? new Date(result.savedAt).toLocaleDateString() : '날짜 없음'}
                </div>
              </div>
            ))}
            
            {esgData.governance.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                Governance 카테고리의 윤문 데이터가 없습니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 깊은 비교를 위한 헬퍼 함수
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  
  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
  }
  
  return true;
};

export default function GriReportPage() {
  const { user } = useAuthStore();
  const corpId = Number(user?.corporation_id);
  const { ensureSession } = useSessionStore();

  // 🚨 무한 루프 방지: Zustand store 구독을 최적화
  // useShallow 또는 직접 값만 구독하여 불필요한 리렌더링 방지
  const mgResultsByIndex = useMGStore((state) => state.resultsByIndex);
  const intakeSavedItems = useIntakeStore((state) => state.savedItems);

  const [structure, setStructure] = useState<GRIReportStructure | null>(null);
  const [savedAnswers, setSavedAnswers] = useState<SavedAnswers>({});
  const [integratedData, setIntegratedData] = useState<IntegratedAnswers>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 🚨 무한 루프 방지: 이전 데이터 참조를 위한 ref
  const prevDataRef = useRef<{ mg: unknown; intake: unknown }>({ mg: null, intake: null });
  const isInitializedRef = useRef(false);

  // 세션 보장(폴리시 컴포넌트가 세션키 필요하면)
  useEffect(() => {
    ensureSession?.();
  }, [ensureSession]);

  // 🚨 무한 루프 방지: 최초 로드만 한 번 실행
  useEffect(() => {
    if (!corpId || isInitializedRef.current) return;

    setLoading(true);
    setErr(null);
    
    try {
      // 로컬 데이터 기반으로 기본 구조 생성
      const fallbackStructure = {
        corporation_id: corpId,
        companyname: user?.companyname || 'Unknown Company',
        environmental: [],
        social: [],
        governance: []
      };
      
      setStructure(fallbackStructure);
      setSavedAnswers({}); // 서버 데이터 사용하지 않음
      
      console.log('✅ 로컬 데이터만 사용하여 Report 페이지 로드');
      isInitializedRef.current = true;
      
    } catch (e: unknown) {
      console.error('로컬 데이터 처리 오류:', e);
      setErr('로컬 데이터 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [corpId, user?.companyname]);

  // 🚨 무한 루프 방지: 데이터 통합을 조건부로 실행
  const processDataIntegration = useCallback(() => {
    try {
      // 🚨 가드: 데이터가 실제로 변경되었는지 확인
      const currentData = { mg: mgResultsByIndex, intake: intakeSavedItems };
      const prevData = prevDataRef.current;
      
      // 깊은 비교로 실제 변경사항이 있는지 확인
      if (deepEqual(currentData, prevData)) {
        console.log('🔄 데이터 변경 없음, 통합 건너뛰기');
        return;
      }
      
      console.log('✅ 데이터 변경 감지, 통합 시작');
      
      const integrated = integrateReportData(
        { resultsByIndex: mgResultsByIndex }, 
        { savedItems: intakeSavedItems }, 
        savedAnswers
      );
      
      // 데이터 검증: integrated가 유효한 객체인지 확인
      if (integrated && typeof integrated === 'object' && !Array.isArray(integrated)) {
        // 데이터 구조 상세 로깅
        console.log('🔍 통합된 데이터 구조 분석:');
        console.log('전체 데이터:', integrated);
        
        // 데이터 구조 검증 및 정규화
        const normalizedData: IntegratedAnswers = {};
        
        Object.entries(integrated).forEach(([griIndex, indexData]) => {
          console.log(`GRI ${griIndex}:`, indexData);
          
          if (indexData && typeof indexData === 'object') {
            normalizedData[griIndex] = {};
            
            Object.entries(indexData).forEach(([questionKey, answer]) => {
              console.log(`  Q${questionKey}:`, answer);
              
              // 답변 데이터 정규화 - 로컬 데이터 구조에 맞춤
              if (answer && typeof answer === 'object') {
                // 안전한 데이터 추출을 위한 헬퍼 함수
                const safeGetAnswerText = (obj: unknown, key: string): string => {
                  if (obj && typeof obj === 'object' && obj !== null) {
                    const value = (obj as Record<string, unknown>)[key];
                    return value !== undefined && value !== null ? String(value) : '';
                  }
                  return '';
                };
                
                // 로컬 데이터에서 실제 존재하는 필드들 추출
                const normalizedAnswer = {
                  source: answer.source, // integrateReportData에서 설정한 source 값을 보존
                  answer_text: String(answer.answer_text || safeGetAnswerText(answer.answers, questionKey) || ''),
                  polished_text: String(answer.polished_text || ''),
                  display_mode: answer.display_mode || 'prose',
                  last_modified: answer.last_modified || new Date().toISOString(),
                  // 추가 필드들도 보존
                  gri_index: answer.gri_index || griIndex,
                  category_id: answer.category_id,
                  answers: answer.answers || {},
                  version: answer.version
                };
        
                console.log(`  🔍 정규화된 답변:`, normalizedAnswer);
                normalizedData[griIndex][questionKey] = normalizedAnswer;
              }
            });
          }
        });
        
        console.log('🔍 정규화된 데이터:', normalizedData);
        
        // 🚨 무한 루프 방지: 실제로 변경된 경우에만 상태 업데이트
        setIntegratedData(prevData => {
          // 깊은 비교로 실제 변경사항 확인
          if (deepEqual(prevData, normalizedData)) {
            console.log('🔄 정규화된 데이터도 동일, 상태 업데이트 건너뛰기');
            return prevData;
          }
          
          console.log('✅ 정규화된 데이터로 상태 업데이트');
          return normalizedData;
        });
        
        console.log('✅ 데이터 통합 및 정규화 성공:', Object.keys(normalizedData).length, '개 인덱스');
        
        // 🚨 무한 루프 방지: 현재 데이터를 이전 데이터로 저장
        prevDataRef.current = currentData;
        
      } else {
        console.warn('⚠️ 통합된 데이터가 유효하지 않음:', integrated);
        setIntegratedData({});
      }
    } catch (error) {
      console.error('❌ 데이터 통합 중 오류:', error);
      setIntegratedData({});
    }
  }, [mgResultsByIndex, intakeSavedItems, savedAnswers]);

  // 🚨 무한 루프 방지: 데이터 통합을 조건부로 실행
  useEffect(() => {
    if (!mgResultsByIndex || !intakeSavedItems) return;
    
    // 디바운싱을 위한 타이머
    const timer = setTimeout(() => {
      processDataIntegration();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [mgResultsByIndex, intakeSavedItems, processDataIntegration]);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">GRI 데이터를 불러오는 중...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (err) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <div className="max-w-3xl mx-auto px-6 py-10">
            <h1 className="text-2xl font-bold text-red-600">로드 실패</h1>
            <p className="mt-2 text-gray-700">{err}</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // 🚨 무한 루프 방지: structure가 없을 때 로딩 상태 표시
  if (!structure) {
    // 구조가 없어도 로컬 데이터가 있으면 계속 진행
    if (mgResultsByIndex && Object.keys(mgResultsByIndex).length > 0) {
      console.log('서버 구조 없지만 로컬 데이터가 있어 계속 진행');
      return (
        <ProtectedRoute>
          <div className="min-h-screen bg-gray-50">
            <Navigation />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">로컬 데이터를 불러오는 중...</p>
              </div>
            </div>
          </div>
        </ProtectedRoute>
      );
    } else {
      return null;
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">GRI Report</h1>
            <p className="mt-2 text-gray-600">
              {structure.companyname} (ID: {structure.corporation_id})
            </p>
          </header>

          {/* 데이터 소스별 섹션 구분 */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">데이터 소스별 구분</h2>
            
            {/* 로컬 데이터 전용 사용 안내 */}
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-green-600">✅</span>
                <span className="text-sm text-green-800">
                  <strong>로컬 데이터 전용 모드:</strong> 서버 API 호출 없이 로컬 데이터만 사용
                </span>
              </div>
              <div className="mt-2 text-xs text-green-700">
                빠른 응답 속도와 안정성을 위해 로컬 스토리지의 데이터만 사용합니다.
              </div>
            </div>
            
            <SafeStatsDisplay integratedData={integratedData} />
          </div>

          {/* ESG별 분류된 MG 데이터 표시 */}
          <ESGClassifiedMGDisplay />

          {/* 로컬 데이터 전용 표시 (서버 구조 사용하지 않음) */}
          <SafeDataDisplay integratedData={integratedData} />
        </div>
      </div>
    </ProtectedRoute>
  );
}