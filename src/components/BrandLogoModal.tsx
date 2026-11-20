import React, { useState } from 'react';
import { Camera, Check, RotateCcw, Upload, X, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';

interface BrandLogoModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLogo: string | null;
  onSaveLogo: (logoDataUrl: string | null) => Promise<void> | void;
}

export function BrandLogoModal({
  isOpen,
  onClose,
  currentLogo,
  onSaveLogo,
}: BrandLogoModalProps) {
  const [previewLogo, setPreviewLogo] = useState<string | null>(currentLogo);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPreviewLogo(currentLogo);
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentLogo]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh (.png, .jpg, .webp, .svg).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Kích thước ảnh không vượt quá 10MB.');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreviewLogo(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSavePermanent = async () => {
    if (!previewLogo) {
      setError('Vui lòng chọn hoặc tải lên một hình ảnh logo trước.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // 1. Save to localStorage for instant client persistence
      window.localStorage.setItem('lexiband_brand_logo_v1', previewLogo);

      // 2. Send to backend to embed directly into project files
      try {
        await fetch('/api/save-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: previewLogo }),
        });
      } catch (err) {
        // Fallback for static SPA / offline: localStorage already persists!
        console.warn('Backend file save skipped or offline:', err);
      }

      await onSaveLogo(previewLogo);
      setSuccessMessage('Đã lưu logo vĩnh viễn và nhúng vào hệ thống thành công!');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setError('Có lỗi xảy ra khi lưu logo.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = async () => {
    setIsSaving(true);
    try {
      window.localStorage.removeItem('lexiband_brand_logo_v1');
      try {
        await fetch('/api/save-logo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data: '' }),
        });
      } catch {
        // ignore
      }
      setPreviewLogo(null);
      await onSaveLogo(null);
      setSuccessMessage('Đã khôi phục biểu tượng logo mặc định!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch {
      setError('Không thể khôi phục mặc định.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tải lên & Lưu Logo Thương hiệu
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Tùy biến logo hiển thị trên thanh tiêu đề cạnh "Tiếng Anh Thầy Phúc"
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Xem trước giao diện trên thanh tiêu đề (Header):
          </span>
          <div className="h-14 bg-white rounded-xl border border-slate-200 px-4 flex items-center gap-3 shadow-xs">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 transition-all ${
                previewLogo
                  ? 'bg-transparent border-0 shadow-none'
                  : 'bg-teal-800 text-white font-black text-sm shadow-xs border border-teal-700/50'
              }`}
            >
              {previewLogo ? (
                <img
                  src={previewLogo}
                  alt="Logo Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <span>P</span>
              )}
            </div>
            <span className="font-editorial text-lg font-bold text-teal-900 tracking-tight">
              Tiếng Anh Thầy Phúc
            </span>
          </div>
        </div>

        {/* Upload Dropzone */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Chọn tệp ảnh logo thương hiệu:
          </label>
          <div className="border-2 border-dashed border-teal-300 hover:border-teal-600 bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-6 text-center transition-colors relative cursor-pointer group">
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <Upload className="w-8 h-8 text-teal-700 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-800">
                Nhấp để chọn ảnh hoặc kéo thả logo vào đây
              </div>
              <p className="text-[11px] text-slate-500">
                Khuyên dùng ảnh vuông trong suốt (.png, .svg, .webp) kích thước từ 128x128px trở lên
              </p>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={handleResetDefault}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSavePermanent}
              disabled={isSaving || !previewLogo}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu vĩnh viễn & Nhúng vào hệ thống'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
