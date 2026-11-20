import React, { useState } from 'react';
import { Camera, HardDrive, Key, Sparkles } from 'lucide-react';
import { AppView } from '../types/ielts';
import { getStoredApiKey } from '../utils/geminiClient';
import defaultBrandConfig from '../data/brandConfig.json';
import { BrandLogoModal } from './BrandLogoModal';

interface TopNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenDigitize: () => void;
  onOpenApiKeyModal: () => void;
  onOpenDataModal?: () => void;
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
  onOpenDataModal,
}: TopNavProps) {
  const hasKey = Boolean(getStoredApiKey());
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);
  const [brandLogo, setBrandLogo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('lexiband_brand_logo_v1');
      if (stored) return stored;
    }
    return defaultBrandConfig.logoUrl || null;
  });

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Wordmark & Logo Uploader Container */}
        <div className="flex items-center gap-2.5">
          {/* LOGO CONTAINER: Clickable frame to upload / view logo */}
          <button
            type="button"
            onClick={() => setIsLogoModalOpen(true)}
            title="Nhấp để tải lên / đổi logo vĩnh viễn"
            className="relative group cursor-pointer w-9 h-9 rounded-xl overflow-hidden bg-teal-800 text-white flex items-center justify-center font-black text-sm shadow-xs transition-transform hover:scale-105 border border-teal-700/50"
          >
            {brandLogo ? (
              <img
                src={brandLogo}
                alt="Tiếng Anh Thầy Phúc Logo"
                className="w-full h-full object-contain p-0.5"
              />
            ) : (
              <span className="font-bold text-base text-white">P</span>
            )}
            {/* Hover overlay icon indicating uploadable logo */}
            <div className="absolute inset-0 bg-slate-950/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="w-4 h-4 text-white" />
            </div>
          </button>

          {/* Brand Name Text: Navigates to Library */}
          <button
            type="button"
            onClick={() => onNavigate('library')}
            className="font-editorial text-xl font-bold tracking-tight text-teal-900 hover:text-teal-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Tiếng Anh Thầy Phúc
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

        {/* Action Zone: Data Management, API Key Button & Digitize Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Local Data Management (Backup / Restore) Button */}
          {onOpenDataModal && (
            <button
              type="button"
              onClick={onOpenDataModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border border-teal-300 bg-teal-50/90 text-teal-900 hover:bg-teal-100 transition-colors whitespace-nowrap cursor-pointer shadow-xs"
              title="Quản lý lưu trữ & Sao lưu dữ liệu về máy tính (.json)"
            >
              <HardDrive className="w-3.5 h-3.5 text-teal-700 shrink-0" />
              <span className="hidden md:inline">Dữ liệu máy</span>
            </button>
          )}

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

      {/* Brand Logo Upload & Permanent Save Modal */}
      <BrandLogoModal
        isOpen={isLogoModalOpen}
        onClose={() => setIsLogoModalOpen(false)}
        currentLogo={brandLogo}
        onSaveLogo={(newLogo) => setBrandLogo(newLogo)}
      />
    </>
  );
}
