import React from 'react';
import {
  Download,
  FileText,
  Presentation,
  X,
} from 'lucide-react';
import { ReadingPassage, VocabEntry } from '../types/ielts';
import { exportPassageToWord } from '../utils/exportDocx';
import { exportPassageToSlides } from '../utils/exportPptx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passage: ReadingPassage;
  vocab: VocabEntry[];
}

export function ExportModal({
  isOpen,
  onClose,
  passage,
  vocab,
}: ExportModalProps) {
  if (!isOpen) return null;

  const passageVocab = vocab.filter((v) => v.passageId === passage.id);

  const handleDownloadWord = () => {
    exportPassageToWord(passage, vocab);
    onClose();
  };

  const handleDownloadSlides = () => {
    exportPassageToSlides(passage, vocab);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Download className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Xuất Tài Liệu & Bài Giảng</h2>
              <p className="text-xs text-teal-200">
                Tải về định dạng Word (.docx) và Slide 16:9 (.pptx)
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

        <div className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
            Đang xuất tài liệu cho bài đọc: <strong className="text-slate-900">{passage.title}</strong>
            <span className="block text-slate-500 mt-0.5">
              Bao gồm {passage.paragraphs.length} đoạn văn, {passage.questions.length} câu hỏi và {passageVocab.length} từ vựng học thuật.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {/* OPTION 1: Word Document */}
            <button
              type="button"
              onClick={handleDownloadWord}
              className="p-4 border-2 border-slate-200 hover:border-teal-700 bg-white hover:bg-teal-50/40 rounded-2xl text-left transition-all flex items-start gap-3.5 group cursor-pointer shadow-xs"
            >
              <div className="p-2.5 bg-teal-50 group-hover:bg-teal-100 rounded-xl text-teal-800 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-teal-950 flex items-center gap-2">
                  <span>Xuất Đề Thi & Phiếu Bài Tập Word (.doc/.docx)</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                    Cambridge Standard
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bao gồm: Trang bìa chuẩn khảo thí, Bài đọc chia đoạn A-B-C, Bộ câu hỏi, Phiếu trả lời Candidate Answer Sheet và Tờ Đáp án kèm Giải thích chi tiết cho giáo viên.
                </p>
              </div>
            </button>

            {/* OPTION 2: 16:9 Presentation Slides */}
            <button
              type="button"
              onClick={handleDownloadSlides}
              className="p-4 border-2 border-slate-200 hover:border-teal-700 bg-white hover:bg-teal-50/40 rounded-2xl text-left transition-all flex items-start gap-3.5 group cursor-pointer shadow-xs"
            >
              <div className="p-2.5 bg-amber-50 group-hover:bg-amber-100 rounded-xl text-amber-800 shrink-0">
                <Presentation className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-teal-950 flex items-center gap-2">
                  <span>Xuất Bài Giảng Trình Chiếu 16:9 (.pptx)</span>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    Offline Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Bao gồm: Slide bìa bài giảng, Slide Pre-teach Từ vựng, Slide phân tích từng câu hỏi song song đoạn văn và Slide trích dẫn chứng cứ (Evidence Quote).
                </p>
              </div>
            </button>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
