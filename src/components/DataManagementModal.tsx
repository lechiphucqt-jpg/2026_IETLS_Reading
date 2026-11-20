import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  HardDrive,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { ReadingPassage, TextAnnotation, VocabEntry } from '../types/ielts';
import {
  BackupDataPayload,
  exportBackupToFile,
  validateBackupJson,
} from '../utils/localDatabase';

interface DataManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  passages: ReadingPassage[];
  vocab: VocabEntry[];
  annotations: TextAnnotation[];
  onRestoreData: (
    restored: {
      passages: ReadingPassage[];
      vocab: VocabEntry[];
      annotations: TextAnnotation[];
    },
    mode: 'overwrite' | 'merge'
  ) => void;
  onResetToDefaults: () => void;
}

export function DataManagementModal({
  isOpen,
  onClose,
  passages,
  vocab,
  annotations,
  onRestoreData,
  onResetToDefaults,
}: DataManagementModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupDataPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setError('Vui lòng chọn tệp định dạng .json');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const validData = validateBackupJson(text);
        setParsedBackup(validData);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Tệp sao lưu không hợp lệ.');
        setParsedBackup(null);
      }
    };
    reader.onerror = () => {
      setError('Không thể đọc tệp sao lưu.');
    };
    reader.readAsText(file);
  };

  const handleExportBackup = () => {
    try {
      exportBackupToFile(passages, vocab, annotations, 'Tiếng Anh Thầy Phúc');
      setSuccessMessage('Đã tải tệp sao lưu về máy tính thành công!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch {
      setError('Không thể xuất tệp sao lưu.');
    }
  };

  const handleExecuteRestore = () => {
    if (!parsedBackup) {
      setError('Chưa có tệp sao lưu hợp lệ.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      onRestoreData(
        {
          passages: parsedBackup.passages,
          vocab: parsedBackup.vocab,
          annotations: parsedBackup.annotations,
        },
        restoreMode
      );

      setSuccessMessage(
        restoreMode === 'overwrite'
          ? `Đã khôi phục thành công ${parsedBackup.passages.length} bài đọc và ${parsedBackup.vocab.length} từ vựng!`
          : `Đã gộp thành công dữ liệu từ tệp sao lưu vào máy!`
      );

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch {
      setError('Có lỗi xảy ra trong quá trình khôi phục dữ liệu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Lưu trữ & Quản lý Dữ liệu trên Máy tính
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Toàn bộ dữ liệu được lưu cục bộ trên máy tính của bạn (Local-First), an toàn và không phụ thuộc server.
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

        {/* SECTION 1: Local Storage Health Card */}
        <div className="p-4 bg-gradient-to-r from-teal-50 via-emerald-50/60 to-slate-50 rounded-2xl border border-teal-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Trạng thái: Hoạt động trên máy tính cá nhân</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
              IndexedDB + LocalStorage
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100 shadow-2xs">
              <div className="font-mono text-xl font-black text-teal-950">
                {passages.length}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Bài đọc trên máy</div>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100 shadow-2xs">
              <div className="font-mono text-xl font-black text-teal-950">
                {vocab.length}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Từ vựng Pre-teach</div>
            </div>
            <div className="bg-white/80 p-2.5 rounded-xl border border-teal-100 shadow-2xs">
              <div className="font-mono text-xl font-black text-teal-950">
                {annotations.length}
              </div>
              <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Ghi chú & Tô màu</div>
            </div>
          </div>
        </div>

        {/* SECTION 2: EXPORT BACKUP TO LOCAL FILE */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-teal-800" />
            <h3 className="text-sm font-bold text-slate-900">
              1. Sao lưu dữ liệu về máy tính (Export Backup .json)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tải toàn bộ bài đọc, từ vựng, hình ảnh và ghi chú về ổ cứng máy tính (ổ D:, E: hoặc Google Drive) thành 1 tệp tin duy nhất. Đảm bảo dữ liệu không bao giờ bị mất kể cả khi cài lại Win hoặc đổi máy tính khác.
          </p>

          <button
            type="button"
            onClick={handleExportBackup}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-all shadow-xs cursor-pointer hover:shadow-md"
          >
            <Download className="w-4 h-4 text-teal-200" />
            <span>Tải tệp sao lưu (.json) về máy tính ngay</span>
          </button>
        </div>

        {/* SECTION 3: IMPORT BACKUP FROM LOCAL FILE */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-800" />
            <h3 className="text-sm font-bold text-slate-900">
              2. Khôi phục dữ liệu từ tệp sao lưu trên máy (Import Restore)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Chọn tệp sao lưu <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px]">.json</code> từ máy tính của bạn để phục hồi lại bài học:
          </p>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Dropzone trigger */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-teal-300 hover:border-teal-600 bg-white hover:bg-teal-50/30 rounded-2xl p-4 text-center transition-colors cursor-pointer"
          >
            <div className="flex flex-col items-center justify-center space-y-1">
              <FileJson className="w-6 h-6 text-teal-700" />
              <div className="text-xs font-bold text-slate-800">
                {selectedFile ? (
                  <span className="text-teal-900 font-extrabold">
                    Đã chọn: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                  </span>
                ) : (
                  'Nhấp vào đây để chọn tệp sao lưu .json từ máy tính'
                )}
              </div>
            </div>
          </div>

          {/* Parsed File Preview & Options */}
          {parsedBackup && (
            <div className="p-4 bg-teal-50 border border-teal-300 rounded-2xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-xs font-bold text-teal-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tệp sao lưu hợp lệ! Thông tin dữ liệu:</span>
              </div>

              <div className="text-xs text-slate-700 space-y-1 pl-6">
                <div>
                  • Thương hiệu: <strong>{parsedBackup.brandName}</strong>
                </div>
                <div>
                  • Số bài đọc: <strong>{parsedBackup.passages.length}</strong> bài
                </div>
                <div>
                  • Số từ vựng: <strong>{parsedBackup.vocab.length}</strong> từ
                </div>
                <div>
                  • Ngày sao lưu: <strong>{new Date(parsedBackup.exportedAt).toLocaleString('vi-VN')}</strong>
                </div>
              </div>

              {/* Mode Selection */}
              <div className="pt-2 border-t border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <label className="text-xs font-bold text-slate-800">Phương thức khôi phục:</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRestoreMode('overwrite')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      restoreMode === 'overwrite'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Ghi đè hoàn toàn
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreMode('merge')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                      restoreMode === 'merge'
                        ? 'bg-teal-800 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Gộp thêm vào máy
                  </button>
                </div>
              </div>

              {/* Confirm Restore Button */}
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isProcessing}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>{isProcessing ? 'Đang khôi phục...' : 'Bắt đầu nạp dữ liệu vào máy'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Feedback Alerts */}
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

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Reset to Seed Data */}
          <div>
            {!confirmResetOpen ? (
              <button
                type="button"
                onClick={() => setConfirmResetOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-rose-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục các bài đọc Cambridge mẫu gốc</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-rose-700 font-bold">Xác nhận đặt lại?</span>
                <button
                  type="button"
                  onClick={() => {
                    onResetToDefaults();
                    setConfirmResetOpen(false);
                    setSuccessMessage('Đã khôi phục dữ liệu mẫu ban đầu!');
                    setTimeout(() => onClose(), 1200);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
                >
                  Có, đặt lại
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
