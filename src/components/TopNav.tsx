import React from 'react';
import { Key, Sparkles } from 'lucide-react';
import { AppView } from '../types/ielts';
import { getStoredApiKey } from '../utils/geminiClient';

interface TopNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenDigitize: () => void;
  onOpenApiKeyModal: () => void;
}

const NAV_ITEMS: { id: AppView; label: string }[] = [
  { id: 'library', label: 'Thư viện' },
  { id: 'preteach', label: 'Dạy từ vựng (Pre-teach)' },
  { id: 'student', label: 'Phòng thi' },
  { id: 'vocabulary', label: 'Sổ từ vựng' },
  { id: 'teacher', label: 'Trình chiếu 16:9' },
];

export function TopNav({
  activeView,
  onNavigate,
  onOpenDigitize,
  onOpenApiKeyModal,
}: TopNavProps) {
  const hasKey = Boolean(getStoredApiKey());

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
      {/* Brand Wordmark */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate('library')}
          className="font-editorial text-xl font-bold tracking-tight text-teal-900 hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2"
        >
          <div className="w-8 h-8 rounded-xl bg-teal-800 text-white flex items-center justify-center font-black text-sm shadow-xs">
            L
          </div>
          <span>LexiBand</span>
        </button>
      </div>

      {/* Main Navigation Links */}
      <nav
        aria-label="Điều hướng chính"
        className="flex items-center gap-3 sm:gap-6 overflow-x-auto py-1"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`relative py-5 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-teal-900 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-teal-800"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* Action Zone: API Key Button with Mandatory Red Prompt & Digitize Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Settings (API Key) Button with RED text per AI_INSTRUCTIONS.md line 25 */}
        <button
          type="button"
          onClick={onOpenApiKeyModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-rose-300 bg-rose-50/90 text-rose-900 hover:bg-rose-100 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
          title="Cài đặt khóa Gemini API Key & Model AI"
        >
          <Key className="w-3.5 h-3.5 text-rose-600 shrink-0" />
          <span className="text-slate-900 hidden sm:inline">Settings:</span>
          <span className="text-red-600 font-extrabold animate-pulse">
            {hasKey ? 'Đổi API Key' : 'Lấy API key để sử dụng app'}
          </span>
        </button>

        {/* Primary Digitize Action */}
        <button
          type="button"
          onClick={onOpenDigitize}
          className="px-3.5 sm:px-4 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-xs flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Số hóa bài đọc</span>
        </button>
      </div>
    </header>
  );
}
