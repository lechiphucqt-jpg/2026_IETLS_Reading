import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Database,
  Download,
  FileJson,
  Folder,
  FolderCheck,
  FolderOpen,
  HardDrive,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ReadingPassage, TextAnnotation, VocabEntry } from '../types/ielts';
import {
  BackupDataPayload,
  chooseDirectoryOnDisk,
  clearSavedDirectory,
  exportBackupToFile,
  getSavedDirectoryInfo,
  loadDataFromSavedDirectory,
  saveBackupWithFilePicker,
  saveDataToSavedDirectory,
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
  // Directory Binding States
  const [localDirHandle, setLocalDirHandle] = useState<unknown | null>(null);
  const [localDirName, setLocalDirName] = useState<string | null>(null);
  const [customPathNote, setCustomPathNote] = useState<string>('');
  const [isEditingPathNote, setIsEditingPathNote] = useState<boolean>(false);
  const [isSelectingDir, setIsSelectingDir] = useState<boolean>(false);
  const [isSavingToDir, setIsSavingToDir] = useState<boolean>(false);
  const [isLoadingFromDir, setIsLoadingFromDir] = useState<boolean>(false);

  // File Backup & Restore States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupDataPayload | null>(null);
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load directory info from IndexedDB / LocalStorage on mount
  useEffect(() => {
    if (isOpen) {
      getSavedDirectoryInfo().then(({ handle, name }) => {
        setLocalDirHandle(handle);
        setLocalDirName(name);
      });
      const savedPathLabel =
        (typeof window !== 'undefined' &&
          window.localStorage.getItem('lexiband_custom_dir_path_label')) ||
        '';
      setCustomPathNote(savedPathLabel);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle pick directory from disk (D:, E:, USB, Google Drive, etc.)
  const handleChooseDirectory = async () => {
    setIsSelectingDir(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const result = await chooseDirectoryOnDisk();
      if (result) {
        setLocalDirHandle(result.handle);
        setLocalDirName(result.name);
        setSuccessMessage(`Đã định vị thành công thư mục: "${result.name}" trên máy tính!`);
        setTimeout(() => setSuccessMessage(null), 3500);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể chọn thư mục. Hãy đảm bảo bạn dùng trình duyệt Chrome/Edge và cấp quyền truy cập.'
      );
    } finally {
      setIsSelectingDir(false);
    }
  };

  // Save data directly into the bound folder on disk
  const handleSaveToDirectory = async () => {
    if (!localDirHandle) {
      setError('Chưa chọn thư mục nào trên máy tính. Hãy bấm "Chọn thư mục lưu trữ" trước.');
      return;
    }

    setIsSavingToDir(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await saveDataToSavedDirectory(
        localDirHandle,
        passages,
        vocab,
        annotations,
        'Tiếng Anh Thầy Phúc'
      );
      setSuccessMessage(
        `Đã lưu trực tiếp tệp "${result.fileName}" (${(result.size / 1024).toFixed(1)} KB) vào thư mục "${localDirName || 'đã chọn'}" trên ổ đĩa thành công!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể lưu vào thư mục này. Vui lòng cấp quyền ghi khi trình duyệt hỏi.'
      );
    } finally {
      setIsSavingToDir(false);
    }
  };

  // Load data directly from the bound folder on disk
  const handleLoadFromDirectory = async () => {
    if (!localDirHandle) {
      setError('Chưa chọn thư mục nào trên máy tính.');
      return;
    }

    setIsLoadingFromDir(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await loadDataFromSavedDirectory(localDirHandle);
      setParsedBackup(data);
      setSelectedFile(new File([], 'Du_Lieu_Thay_Phuc.json'));
      setSuccessMessage(
        `Đã đọc thành công tệp dữ liệu từ thư mục "${localDirName || 'đã chọn'}" (${data.passages.length} bài đọc, ${data.vocab.length} từ vựng). Vui lòng chọn cách nạp bên dưới!`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Không thể đọc tệp dữ liệu từ thư mục này.'
      );
    } finally {
      setIsLoadingFromDir(false);
    }
  };

  // Unlink folder binding
  const handleClearDirectory = async () => {
    await clearSavedDirectory();
    setLocalDirHandle(null);
    setLocalDirName(null);
    setCustomPathNote('');
    setSuccessMessage('Đã hủy liên kết thư mục trên máy tính.');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  // Save custom path note (e.g. D:\Du_Lieu_Thay_Phuc)
  const handleSavePathNote = (value: string) => {
    setCustomPathNote(value);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('lexiband_custom_dir_path_label', value);
    }
    setIsEditingPathNote(false);
  };

  // Export with Windows Save As file picker (user picks drive D:, E:, etc.)
  const handleExportWithFilePicker = async () => {
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await saveBackupWithFilePicker(passages, vocab, annotations, 'Tiếng Anh Thầy Phúc');
      if (res.canceled) {
        return; // user simply closed dialog
      }
      setSuccessMessage(
        res.method === 'picker'
          ? `Đã lưu tệp "${res.fileName}" vào vị trí ổ đĩa bạn đã chọn thành công!`
          : `Đã tải tệp sao lưu "${res.fileName}" về máy tính thành công!`
      );
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch {
      setError('Không thể xuất tệp sao lưu.');
    }
  };

  // Traditional download fallback
  const handleExportStandardDownload = () => {
    try {
      exportBackupToFile(passages, vocab, annotations, 'Tiếng Anh Thầy Phúc');
      setSuccessMessage('Đã tải tệp sao lưu về máy tính thành công!');
      setTimeout(() => setSuccessMessage(null), 3500);
    } catch {
      setError('Không thể xuất tệp sao lưu.');
    }
  };

  // Handle selected file for import
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

  // Restore execution
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

        {/* SECTION 2: CHỌN ĐƯỜNG DẪN / ĐỊNH VỊ Ổ ĐĨA TRÊN MÁY TÍNH */}
        <div className="p-5 bg-gradient-to-br from-amber-50/70 via-teal-50/40 to-slate-50 rounded-2xl border-2 border-teal-300/80 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-teal-800" />
              <h3 className="text-sm font-bold text-slate-900">
                Định vị Thư mục / Ổ đĩa lưu trữ trên máy (Ổ D:, E:, Google Drive...)
              </h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-md border border-teal-300">
              Trực tiếp trên ổ đĩa
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Chỉ định trực tiếp ổ đĩa và thư mục trên máy tính (ví dụ <code className="bg-white px-1.5 py-0.5 rounded font-mono font-bold text-teal-900 border border-slate-200">D:\Du_Lieu_Thay_Phuc</code> hoặc thư mục đồng bộ Google Drive/OneDrive). Bạn có thể bấm lưu dữ liệu hoặc đọc dữ liệu từ thư mục đó bất kỳ lúc nào.
          </p>

          {/* Directory Status Box */}
          {localDirName ? (
            <div className="p-3.5 bg-white rounded-xl border border-teal-300 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FolderCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                      <span>Đang định vị tại thư mục:</span>
                      <span className="font-mono bg-teal-100 text-teal-950 px-2 py-0.5 rounded-md font-bold border border-teal-300">
                        {localDirName}
                      </span>
                    </div>
                    {customPathNote && (
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Đường dẫn: <strong>{customPathNote}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleChooseDirectory}
                    disabled={isSelectingDir}
                    className="px-2.5 py-1 text-[11px] font-bold text-teal-800 hover:text-teal-950 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg cursor-pointer transition-colors"
                  >
                    Đổi thư mục
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDirectory}
                    title="Hủy liên kết thư mục"
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Action Buttons for Bound Folder */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleSaveToDirectory}
                  disabled={isSavingToDir}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className={`w-3.5 h-3.5 ${isSavingToDir ? 'animate-spin' : ''}`} />
                  <span>{isSavingToDir ? 'Đang lưu vào ổ đĩa...' : 'Lưu dữ liệu ngay vào thư mục này'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadFromDirectory}
                  disabled={isLoadingFromDir}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-bold text-teal-900 bg-teal-100 hover:bg-teal-200 border border-teal-300 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFromDir ? 'animate-spin' : ''}`} />
                  <span>{isLoadingFromDir ? 'Đang đọc từ ổ đĩa...' : 'Đọc dữ liệu từ thư mục này'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleChooseDirectory}
                disabled={isSelectingDir}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-teal-950 bg-teal-100 hover:bg-teal-200 border-2 border-teal-400 rounded-xl transition-all shadow-2xs hover:shadow-md cursor-pointer disabled:opacity-50"
              >
                <FolderOpen className={`w-4 h-4 text-teal-800 ${isSelectingDir ? 'animate-bounce' : ''}`} />
                <span>
                  {isSelectingDir
                    ? 'Đang mở cửa sổ chọn ổ đĩa...'
                    : '📂 Nhấp để chọn Thư mục / Ổ đĩa trên máy tính (Ổ D:, E:, USB...)'}
                </span>
              </button>

              {/* Manual Path Label Input for Reference */}
              <div className="flex items-center gap-2 text-xs text-slate-600 bg-white/70 p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold shrink-0 text-slate-700">Đường dẫn ổ đĩa:</span>
                {!isEditingPathNote && customPathNote ? (
                  <div className="flex-1 flex items-center justify-between">
                    <span className="font-mono text-teal-900 font-bold truncate">{customPathNote}</span>
                    <button
                      type="button"
                      onClick={() => setIsEditingPathNote(true)}
                      className="text-[11px] text-teal-700 hover:underline cursor-pointer ml-2 shrink-0"
                    >
                      Sửa
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    defaultValue={customPathNote}
                    placeholder="Ví dụ: D:\Du_Lieu_Thay_Phuc hoặc E:\IELTS_Reading"
                    onBlur={(e) => handleSavePathNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePathNote((e.target as HTMLInputElement).value);
                    }}
                    className="flex-1 px-2.5 py-1 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: SAO LƯU TỆP (.JSON) & CHỌN VỊ TRÍ LƯU (SAVE AS DIALOG) */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-teal-800" />
              <h3 className="text-sm font-bold text-slate-900">
                1. Sao lưu & Chọn vị trí lưu tệp (Save As to Drive D:, E:...)
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-500 bg-slate-200/80 px-2 py-0.5 rounded">
              .json
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Mở cửa sổ duyệt ổ đĩa Windows <strong>(Save As)</strong> để bạn tự do chọn ổ D:, E:, USB hoặc Google Drive, đặt tên file và bấm Save.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportWithFilePicker}
              className="flex-1 w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-all shadow-xs cursor-pointer hover:shadow-md"
            >
              <Download className="w-4 h-4 text-teal-200" />
              <span>💾 Chọn ổ đĩa & Lưu tệp sao lưu (.json)</span>
            </button>

            <button
              type="button"
              onClick={handleExportStandardDownload}
              title="Tải nhanh về thư mục Downloads mặc định"
              className="w-full sm:w-auto px-3.5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Tải nhanh về máy
            </button>
          </div>
        </div>

        {/* SECTION 4: KHÔI PHỤC DỮ LIỆU TỪ TỆP SAO LƯU TRÊN MÁY (IMPORT RESTORE) */}
        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-teal-800" />
            <h3 className="text-sm font-bold text-slate-900">
              2. Khôi phục dữ liệu từ tệp sao lưu trên máy (Import Restore)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Chọn tệp sao lưu <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[11px]">.json</code> từ bất kỳ ổ đĩa nào trên máy tính để phục hồi bài học:
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
                    Đã chọn: {selectedFile.name} {selectedFile.size > 0 ? `(${(selectedFile.size / 1024).toFixed(0)} KB)` : ''}
                  </span>
                ) : (
                  'Nhấp vào đây để chọn tệp sao lưu .json từ ổ đĩa máy tính'
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
