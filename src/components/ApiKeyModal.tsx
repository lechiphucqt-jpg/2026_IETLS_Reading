import React, { useState, useEffect } from 'react';
import {
  Key,
  ExternalLink,
  Check,
  AlertCircle,
  X,
  Sparkles,
  ShieldCheck,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import {
  AVAILABLE_MODELS,
  cleanApiKey,
  getStoredApiKey,
  getStoredModel,
  setStoredApiKey,
  setStoredModel,
  validateApiKey,
} from '../utils/geminiClient';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (key: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('gemini-3-flash-preview');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setSelectedModel(getStoredModel());
      setSavedSuccess(false);
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const clean = cleanApiKey(apiKey);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clean) {
      setTestResult({
        ok: false,
        message: 'Vui lòng nhập khóa API trước khi lưu.',
      });
      return;
    }

    setStoredApiKey(clean);
    setStoredModel(selectedModel);
    setSavedSuccess(true);
    onSaved?.(clean);

    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleTestConnection = async () => {
    if (!clean) {
      setTestResult({
        ok: false,
        message: 'Vui lòng nhập khóa API trước khi kiểm tra.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await validateApiKey(clean);
    setTestResult({
      ok: result.valid,
      message: result.message,
    });
    setTesting(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="api-key-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Key className="w-5 h-5 text-teal-200" aria-hidden="true" />
            </div>
            <div>
              <h2 id="api-key-modal-title" className="text-base font-bold">
                Cài đặt Gemini API Key & Model AI
              </h2>
              <p className="text-xs text-teal-200">
                Để số hóa sách PDF, làm bài tập và phát âm Shadowing
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto">
          {/* Instructions Link */}
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-2xl flex items-start gap-3 text-xs text-slate-800">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-950">
                Lấy khóa Gemini API Key miễn phí từ Google:
              </span>
              <p className="text-slate-700 leading-relaxed">
                1. Nhấp vào liên kết bên dưới để mở trang <strong>Google AI Studio</strong>:
              </p>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-teal-800 hover:text-teal-950 underline py-0.5"
              >
                https://aistudio.google.com/api-keys
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                2. Nhấn nút <strong>"Create API key"</strong>, sao chép khóa (bắt đầu bằng <code>AIzaSy...</code>) và dán vào ô bên dưới.
              </p>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="gemini-api-key-input"
                className="block text-xs font-semibold text-slate-800"
              >
                Khóa Gemini API Key của bạn <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-teal-800 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Lưu trực tiếp trên trình duyệt
              </span>
            </div>
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type="text"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="AIzaSy..."
                required
                className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-mono text-slate-900 outline-none transition-all"
              />
              {apiKey.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setApiKey('');
                    setTestResult(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  Xóa
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-1">
              Khóa API được lưu an toàn trong <code>localStorage</code>, không gửi về bất kỳ máy chủ trung gian nào.
            </p>
          </div>

          {/* Model Selection Cards according to AI_INSTRUCTIONS.md */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-teal-700" />
                Chọn Model AI ưu tiên (Có cơ chế Fallback tự động)
              </label>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {AVAILABLE_MODELS.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-3 text-left border rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'border-teal-700 bg-teal-50/60 text-teal-950 font-bold ring-2 ring-teal-700/20 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{m.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-teal-700" />}
                    </div>
                    <div className="text-[10px] font-semibold text-teal-800 mt-0.5">
                      {m.badge}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal mt-1 leading-snug">
                      {m.desc}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-2 bg-slate-100 p-2 rounded-lg">
              ℹ️ <strong>Cơ chế Retry & Fallback:</strong> Nếu model gặp lỗi hạn mức (429 RESOURCE_EXHAUSTED), hệ thống tự động chuyển sang model tiếp theo trong danh sách mà không làm gián đoạn bài đọc.
            </p>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-50 border border-emerald-300 text-emerald-950'
                  : 'bg-rose-50 border border-rose-300 text-rose-950'
              }`}
            >
              {testResult.ok ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed font-medium">{testResult.message}</div>
            </div>
          )}

          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              Đã lưu API Key & cấu hình Model thành công!
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <button
              type="button"
              disabled={testing || !clean}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-teal-800 hover:text-teal-950 hover:bg-teal-50 border border-teal-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                'Kiểm tra kết nối'
              )}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={!clean}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Lưu & Áp dụng
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
