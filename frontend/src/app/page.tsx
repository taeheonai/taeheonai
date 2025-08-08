'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // axios를 브라우저 콘솔에서 사용할 수 있도록 바인딩 (경고 방지를 위한 사용 처리)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.axios = axios;
    }
  }, []);


  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // 시뮬레이션된 AI 응답
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `안녕하세요! "${inputValue}"에 대한 답변입니다. TaeheonAI가 도움을 드리겠습니다.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <header className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              TaeheonAI
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              AI와 대화하는 새로운 경험
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a
                href="/signup"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm font-medium hover:bg-blue-700"
              >
                회원가입
              </a>
              <a
                href="/login"
                className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                로그인
              </a>
            </div>
          </header>

          {/* 채팅 인터페이스 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg h-[600px] flex flex-col">
            {/* 채팅 헤더 */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                AI Assistant
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                무엇이든 물어보세요
              </p>
            </div>

            {/* 메시지 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-300">
                    안녕하세요! 무엇을 도와드릴까요?
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-4 py-2 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 입력 영역 - GPT 스타일 */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="relative">
                {/* 메인 입력 컨테이너 */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-[28px] shadow-sm border border-gray-200 dark:border-gray-600">
                  <div className="relative flex min-h-14 w-full items-end">
                    <div className="relative flex w-full flex-auto flex-col">
                      <div className="relative mx-5 flex min-h-14 flex-auto bg-transparent items-start">
                        {/* 텍스트 입력 영역 */}
                        <div className="flex-1 overflow-auto max-h-52">
                          <textarea
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className="w-full min-h-14 bg-transparent border-none outline-none resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm"
                            rows={1}
                            style={{ minHeight: '56px' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 액션 버튼들 */}
                  <div className="absolute bottom-2.5 flex items-center" style={{ left: 'calc(2.5*var(--spacing))', right: '102px' }}>
                    {/* 파일 업로드 버튼 */}
                    <button
                      type="button"
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      aria-label="파일 첨부"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5L16.6338 9.34863C16.9369 9.41057 17.165 9.67857 17.165 10C17.165 10.3214 16.9369 10.5894 16.6338 10.6514L16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z" />
                      </svg>
                    </button>

                    {/* 도구 버튼 */}
                    <button
                      type="button"
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors ml-1"
                      aria-label="도구 선택"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M7.91626 11.0013C9.43597 11.0013 10.7053 12.0729 11.011 13.5013H16.6663L16.801 13.515C17.1038 13.5771 17.3311 13.8453 17.3313 14.1663C17.3313 14.4875 17.1038 14.7555 16.801 14.8177L16.6663 14.8314H11.011C10.7056 16.2601 9.43619 17.3314 7.91626 17.3314C6.39643 17.3312 5.1269 16.2601 4.82153 14.8314H3.33325C2.96598 14.8314 2.66821 14.5336 2.66821 14.1663C2.66839 13.7992 2.96609 13.5013 3.33325 13.5013H4.82153C5.12713 12.0729 6.39665 11.0015 7.91626 11.0013ZM7.91626 12.3314C6.90308 12.3316 6.08148 13.1532 6.0813 14.1663C6.0813 15.1797 6.90297 16.0011 7.91626 16.0013C8.9297 16.0013 9.75122 15.1798 9.75122 14.1663C9.75104 13.153 8.92959 12.3314 7.91626 12.3314ZM12.0833 2.66829C13.6031 2.66829 14.8725 3.73966 15.178 5.16829H16.6663L16.801 5.18196C17.1038 5.24414 17.3313 5.51212 17.3313 5.83333C17.3313 6.15454 17.1038 6.42253 16.801 6.4847L16.6663 6.49837H15.178C14.8725 7.92701 13.6031 8.99837 12.0833 8.99837C10.5634 8.99837 9.29405 7.92701 8.98853 6.49837H3.33325C2.96598 6.49837 2.66821 6.2006 2.66821 5.83333C2.66821 5.46606 2.96598 5.16829 3.33325 5.16829H8.98853C9.29405 3.73966 10.5634 2.66829 12.0833 2.66829ZM12.0833 3.99837C11.0698 3.99837 10.2483 4.81989 10.2483 5.83333C10.2483 6.84677 11.0698 7.66829 12.0833 7.66829C13.0967 7.66829 13.9182 6.84677 13.9182 5.83333C13.9182 4.81989 13.0967 3.99837 12.0833 3.99837Z" />
                      </svg>
                    </button>
                  </div>

                  {/* 우측 액션 버튼들 */}
                  <div className="absolute end-2.5 bottom-2.5 flex items-center gap-2">
                    {/* 음성 입력 버튼 */}
                    <button
                      type="button"
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                      aria-label="음성 입력"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15.7806 10.1963C16.1326 10.3011 16.3336 10.6714 16.2288 11.0234L16.1487 11.2725C15.3429 13.6262 13.2236 15.3697 10.6644 15.6299L10.6653 16.835H12.0833L12.2171 16.8486C12.5202 16.9106 12.7484 17.1786 12.7484 17.5C12.7484 17.8214 12.5202 18.0894 12.2171 18.1514L12.0833 18.165H7.91632C7.5492 18.1649 7.25128 17.8672 7.25128 17.5C7.25128 17.1328 7.5492 16.8351 7.91632 16.835H9.33527L9.33429 15.6299C6.775 15.3697 4.6558 13.6262 3.84992 11.2725L3.76984 11.0234L3.74445 10.8906C3.71751 10.5825 3.91011 10.2879 4.21808 10.1963C4.52615 10.1047 4.84769 10.2466 4.99347 10.5195L5.04523 10.6436L5.10871 10.8418C5.8047 12.8745 7.73211 14.335 9.99933 14.335C12.3396 14.3349 14.3179 12.7789 14.9534 10.6436L15.0052 10.5195C15.151 10.2466 15.4725 10.1046 15.7806 10.1963ZM12.2513 5.41699C12.2513 4.17354 11.2437 3.16521 10.0003 3.16504C8.75675 3.16504 7.74835 4.17343 7.74835 5.41699V9.16699C7.74853 10.4104 8.75685 11.418 10.0003 11.418C11.2436 11.4178 12.2511 10.4103 12.2513 9.16699V5.41699ZM13.5814 9.16699C13.5812 11.1448 11.9781 12.7479 10.0003 12.748C8.02232 12.748 6.41845 11.1449 6.41828 9.16699V5.41699C6.41828 3.43889 8.02221 1.83496 10.0003 1.83496C11.9783 1.83514 13.5814 3.439 13.5814 5.41699V9.16699Z" />
                      </svg>
                    </button>

                    {/* 전송 버튼 */}
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim()}
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
                        inputValue.trim()
                          ? 'bg-blue-500 hover:bg-blue-600 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label="메시지 전송"
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8.99992 16V6.41407L5.70696 9.70704C5.31643 10.0976 4.68342 10.0976 4.29289 9.70704C3.90237 9.31652 3.90237 8.6835 4.29289 8.29298L9.29289 3.29298L9.36907 3.22462C9.76184 2.90427 10.3408 2.92686 10.707 3.29298L15.707 8.29298L15.7753 8.36915C16.0957 8.76192 16.0731 9.34092 15.707 9.70704C15.3408 10.0732 14.7618 10.0958 14.3691 9.7754L14.2929 9.70704L10.9999 6.41407V16C10.9999 16.5523 10.5522 17 9.99992 17C9.44764 17 8.99992 16.5523 8.99992 16Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
