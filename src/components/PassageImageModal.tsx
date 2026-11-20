import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Camera,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { ReadingPassage } from '../types/ielts';

interface PassageImageModalProps {
  isOpen: boolean;
  passage: ReadingPassage | null;
  onClose: () => void;
  onSaveImage: (passageId: string, imageUrl: string | undefined) => Promise<void> | void;
}

// Curated high-res academic cover presets for IELTS topics
const ACADEMIC_PRESETS = [
  {
    name: 'Công nghệ & Trí tuệ nhân tạo (AI)',
    url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&w=1200&q=80',
    tag: 'AI & Tech',
  },
  {
    name: 'Nông nghiệp đô thị & Môi trường',
    url: 'https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=1200&q=80',
    tag: 'Environment',
  },
  {
    name: 'Khoa học thực nghiệm & Thí nghiệm',
    url: 'https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=1200&q=80',
    tag: 'Science',
  },
  {
    name: 'Tâm lý học nhận thức & Bộ não',
    url: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?auto=format&fit=crop&w=1200&q=80',
    tag: 'Psychology',
  },
  {
    name: 'Kiến trúc đô thị bền vững',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    tag: 'Architecture',
  },
  {
    name: 'Lịch sử & Khảo cổ học',
    url: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&w=1200&q=80',
    tag: 'History',
  },
];

export function PassageImageModal({
  isOpen,
  passage,
  onClose,
  onSaveImage,
}: PassageImageModalProps) {
  const [previewImage, setPreviewImage] = useState<string | undefined>(
    passage?.coverImage
  );
  const [urlInput, setUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && passage) {
      setPreviewImage(passage.coverImage);
      setUrlInput(passage.coverImage?.startsWith('http') ? passage.coverImage : '');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, passage]);

  if (!isOpen || !passage) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn một tệp hình ảnh (.jpg, .jpeg, .png, .webp).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('Kích thước ảnh không vượt quá 15MB.');
      return;
    }

    setError(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreviewImage(result);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setPreviewImage(urlInput.trim());
    setError(null);
  };

  const handleSavePermanent = async () => {
    if (!previewImage) {
      setError('Vui lòng chọn một ảnh trước khi lưu.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let finalUrl = previewImage;

      // If the image is base64, attempt to save to server file system
      if (previewImage.startsWith('data:image/')) {
        try {
          const res = await fetch('/api/save-passage-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              passageId: passage.id,
              base64Data: previewImage,
            }),
          });
          const json = await res.json();
          if (json.imageUrl) {
            finalUrl = json.imageUrl;
          }
        } catch (serverErr) {
          // If offline or on Vercel without express server, base64 data persists directly!
          console.warn('Backend file save skipped or running on static host:', serverErr);
        }
      }

      await onSaveImage(passage.id, finalUrl);
      setSuccessMessage('Đã lưu ảnh bìa vĩnh viễn và nhúng vào hệ thống thành công!');
      setTimeout(() => {
        onClose();
      }, 1100);
    } catch (err) {
      setError('Có lỗi xảy ra khi lưu ảnh bìa.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveCover = async () => {
    setIsSaving(true);
    try {
      setPreviewImage(undefined);
      await onSaveImage(passage.id, undefined);
      setSuccessMessage('Đã gỡ ảnh bìa về biểu tượng mặc định!');
      setTimeout(() => {
        onClose();
      }, 900);
    } catch {
      setError('Không thể gỡ ảnh bìa.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800 shrink-0">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Chèn & Lưu Ảnh Bìa Bài Đọc Vĩnh Viễn
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bài đọc: <strong className="text-slate-800">{passage.title}</strong> · {passage.sourceBook}
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
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Xem trước ảnh bìa thẻ bài đọc (Tỷ lệ 4:3):
          </span>
          <div className="aspect-[16/9] sm:aspect-[21/9] w-full rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 relative shadow-inner flex items-center justify-center">
            {previewImage ? (
              <img
                src={previewImage}
                alt="Xem trước ảnh bìa"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <ImageIcon className="w-10 h-10 mb-2 stroke-1" />
                <span className="text-xs font-semibold">Chưa có ảnh bìa</span>
                <span className="text-[11px] text-slate-400 mt-0.5">
                  Chọn ảnh từ máy tính hoặc bộ sưu tập bên dưới
                </span>
              </div>
            )}
            <div className="absolute top-3 right-3 bg-teal-900/80 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-xs">
              {passage.bandLevel} · {passage.topic}
            </div>
          </div>
        </div>

        {/* Method 1: Upload from Computer */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            1. Tải ảnh từ máy tính (Kéo thả hoặc duyệt tệp):
          </label>
          <div className="border-2 border-dashed border-teal-300 hover:border-teal-600 bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-5 text-center transition-colors relative cursor-pointer group">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/jpg"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-1.5">
              <Upload className="w-7 h-7 text-teal-700 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-800">
                Nhấp để chọn ảnh hoặc kéo tệp vào đây
              </div>
              <p className="text-[11px] text-slate-500">
                Hỗ trợ tệp ảnh .jpg, .png, .webp (Tối đa 15MB)
              </p>
            </div>
          </div>
        </div>

        {/* Method 2: Direct URL */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            2. Hoặc dán đường dẫn ảnh Internet (URL):
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-teal-700"
              />
            </div>
            <button
              type="button"
              onClick={handleApplyUrl}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>

        {/* Method 3: Curated Academic Presets */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-2">
            3. Hoặc chọn nhanh từ bộ sưu tập ảnh học thuật IELTS chất lượng cao:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {ACADEMIC_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  setPreviewImage(preset.url);
                  setError(null);
                }}
                className={`group relative aspect-[16/10] rounded-xl overflow-hidden border-2 text-left transition-all cursor-pointer ${
                  previewImage === preset.url
                    ? 'border-teal-600 ring-2 ring-teal-400/50 scale-[1.02]'
                    : 'border-slate-200 hover:border-teal-400'
                }`}
              >
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent flex items-end p-2">
                  <span className="text-[10px] font-bold text-white line-clamp-1">
                    {preset.tag}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Status Alerts */}
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

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleRemoveCover}
            disabled={isSaving || !passage.coverImage}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-rose-700 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer w-full sm:w-auto justify-center disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Gỡ ảnh (Mặc định)
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
              disabled={isSaving || !previewImage}
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
