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
} from 'lucide-react';
import {
  AVAILABLE_MODELS,
  getStoredApiKey,
  getStoredModel,
  setStoredApiKey,
  setStoredModel,
  callGeminiWithFallback,
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) return;

    setStoredApiKey(cleanKey);
    setStoredModel(selectedModel);
    setSavedSuccess(true);
    onSaved?.(cleanKey);

    setTimeout(() => {
      onClose();
    }, 700);
  };

  const handleTestConnection = async () => {
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setTestResult({
        ok: false,
        message: 'Vui lòng nhập API Key trước khi kiểm tra.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    // Temporarily set to test
    setStoredApiKey(cleanKey);
    setStoredModel(selectedModel);

    try {
      const res = await callGeminiWithFallback({
        contents: [
          {
            parts: [{ text: 'Trả về chuỗi JSON {"status": "ok", "message": "connected"}' }],
          },
        ],
        responseMimeType: 'application/json',
      });
      setTestResult({
        ok: true,
        message: `Kết nối thành công qua ${res.modelUsed}! Khóa API hoàn toàn hợp lệ.`,
      });
    } catch (err: unknown) {
      setTestResult({
        ok: false,
        message:
          err instanceof Error
            ? err.message
            : 'Không thể kết nối với Gemini API. Vui lòng kiểm tra lại khóa.',
      });
    } finally {
      setTesting(false);
    }
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
                Để số hóa sách PDF, tạo bài tập và phát âm Shadowing
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
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-slate-800">
            <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block text-amber-900">
                Chưa có khóa API hoặc hết hạn mức (Quota)?
              </span>
              <p className="text-slate-600 leading-relaxed">
                Google cung cấp API Key Gemini hoàn toàn miễn phí. Bạn có thể tạo khóa mới trong 30 giây tại Google AI Studio:
              </p>
              <a
                href="https://aistudio.google.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-bold text-teal-800 hover:text-teal-950 underline pt-1"
              >
                https://aistudio.google.com/api-keys
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
                <ShieldCheck className="w-3.5 h-3.5" /> Lưu an toàn trên máy
              </span>
            </div>
            <input
              id="gemini-api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              required
              className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-900 outline-none transition-all"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Khóa API được lưu cục bộ trong trình duyệt (localStorage), không gửi về máy chủ thứ ba.
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
              ℹ️ <strong>Cơ chế Retry & Fallback:</strong> Nếu model gặp lỗi hạn mức (429 RESOURCE_EXHAUSTED), hệ thống sẽ tự động chuyển sang model tiếp theo trong danh sách mà không làm gián đoạn bài đọc.
            </p>
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
                testResult.ok
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border border-rose-200 text-rose-900'
              }`}
            >
              {testResult.ok ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{testResult.message}</div>
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
              disabled={testing || !apiKey.trim()}
              onClick={handleTestConnection}
              className="px-3.5 py-2 text-xs font-semibold text-teal-800 hover:text-teal-950 hover:bg-teal-50 border border-teal-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}
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
                disabled={!apiKey.trim()}
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
