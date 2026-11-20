import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookPlus,
  FileText,
  FileUp,
  Key,
  Layers,
  Loader2,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';
import { IELTS_TOPICS, SOURCE_BOOKS } from '../data/seedData';
import { ReadingPassage, VocabEntry } from '../types/ielts';
import {
  digitizeFromPdfOrImage,
  digitizeFromRawText,
  getStoredApiKey,
} from '../utils/geminiClient';

interface DigitizeModalProps {
  isOpen: boolean;
  initialTab?: 'pdf' | 'passage' | 'vocab';
  onClose: () => void;
  onPassageCreated: (
    passage: ReadingPassage,
    extractedVocab: Omit<VocabEntry, 'id'>[]
  ) => void;
  onVocabBatchCreated: (items: Omit<VocabEntry, 'id'>[]) => void;
  onOpenApiKeyModal?: () => void;
}

const SAMPLE_PASSAGE_TEXT = `Urban acoustic ecologists have begun mapping the hidden soundscapes of major metropolitan parks. While city residents typically value green spaces for shade and recreation, researchers at Delft University found that dense belts of broadleaf shrubs can attenuate low-frequency traffic rumble by up to eight decibels—a noticeable threshold for human stress recovery.

Interestingly, the psychological benefit depends not merely on quietness, but on acoustic masking. Flowing water features and wind rustling through poplar leaves introduce broadband natural frequencies that gently obscure intermittent mechanical sounds such as bus brakes or construction sirens. Participants walking near veiled acoustic fountains reported significantly lower cortisol levels than peers resting in equally quiet concrete courtyards.

Municipal architects warn, however, that poorly sited foliage offers negligible acoustic shielding. Narrow strips of ornamental grass fail to deflect sound waves, whereas multi-layered earthen berms planted with evergreens redirect noise upward away from pedestrian benches. Integrating bio-acoustic principles early in city masterplans could transform modest pocket parks into restorative urban sanctuaries.`;

const SAMPLE_VOCAB_LIST = `attenuate
unprecedented
mitigate
corroborate
ubiquitous
pragmatic`;

export function DigitizeModal({
  isOpen,
  initialTab = 'pdf',
  onClose,
  onPassageCreated,
  onVocabBatchCreated,
  onOpenApiKeyModal,
}: DigitizeModalProps) {
  const [tab, setTab] = useState<'pdf' | 'passage' | 'vocab'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setError(null);
      setStatusMessage('');
    }
  }, [isOpen, initialTab]);

  // PDF Book Digitize state
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfSourceBook, setPdfSourceBook] = useState(SOURCE_BOOKS[0]);
  const [pdfTopic, setPdfTopic] = useState(IELTS_TOPICS[0]);
  const [pdfBandLevel, setPdfBandLevel] = useState('Band 7.0');

  // Passage text digitizer state
  const [title, setTitle] = useState('');
  const [sourceBook, setSourceBook] = useState(SOURCE_BOOKS[0]);
  const [topic, setTopic] = useState(IELTS_TOPICS[0]);
  const [bandLevel, setBandLevel] = useState('Band 7.0');
  const [questionCount, setQuestionCount] = useState(5);
  const [rawText, setRawText] = useState('');

  // Vocab batch form state
  const [vocabListText, setVocabListText] = useState('');
  const [vocabTopic, setVocabTopic] = useState(IELTS_TOPICS[0]);
  const [vocabPassageRef, setVocabPassageRef] = useState('Cambridge IELTS · Tự nhập');

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const storedKey = getStoredApiKey();
  const hasApiKey = Boolean(storedKey && storedKey.length > 5);

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile) {
      setError('Vui lòng chọn một tệp sách PDF hoặc ảnh trang sách bài tập.');
      return;
    }

    if (!hasApiKey) {
      setError('Bạn chưa nhập Gemini API Key. Vui lòng bấm nút "Cài đặt API Key" để nhập khóa từ Google AI Studio.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Đang chuẩn bị tệp PDF...');

    try {
      const data = await digitizeFromPdfOrImage(
        pdfFile,
        {
          sourceBook: pdfSourceBook,
          topic: pdfTopic,
          bandLevel: pdfBandLevel,
        },
        (msg) => setStatusMessage(msg)
      );

      const passageId = `custom-pdf-${Date.now()}`;
      const paragraphs = (data.paragraphs || []).map(
        (p: { label: string; text: string }, idx: number) => ({
          id: `${passageId}-p-${idx}`,
          label: p.label || String.fromCharCode(65 + idx),
          text: p.text,
        })
      );

      const questions = (data.questions || []).map((q, idx) => ({
        id: `${passageId}-q-${idx + 1}`,
        number: q.number || idx + 1,
        type: q.type || 'TFNG',
        instruction: q.instruction || 'Answer the questions according to the passage.',
        prompt: q.prompt,
        options: q.options || [],
        answer: q.answer,
        explanation: {
          paragraphLabel: q.explanation?.paragraphLabel || 'A',
          scanningLocation: q.explanation?.scanningLocation || 'Đoạn A',
          evidenceQuote: q.explanation?.evidenceQuote || '',
          paraphrasing: q.explanation?.paraphrasing || [],
          distractorAnalysis: q.explanation?.distractorAnalysis || '',
        },
      }));

      const newPassage: ReadingPassage = {
        id: passageId,
        title: data.title || pdfFile.name.replace(/\.[^/.]+$/, ''),
        subtitle: data.subtitle || 'Số hóa tự động từ sách PDF bài tập',
        sourceBook: pdfSourceBook,
        testRef: `${pdfSourceBook} · Sách số hóa`,
        topic: data.topic || pdfTopic,
        bandLevel: data.bandLevel || pdfBandLevel,
        difficulty: 'Passage 2',
        estimatedMinutes: data.estimatedMinutes || 20,
        wordCount: paragraphs.reduce(
          (acc, cur) => acc + cur.text.split(/\s+/).length,
          0
        ),
        paragraphs,
        questions,
      };

      const extractedVocab: Omit<VocabEntry, 'id'>[] = (data.vocabulary || []).map(
        (v) => ({
          word: v.word,
          pos: v.pos || 'academic',
          ipa: v.ipa || '/.../',
          contextualMeaning: v.contextualMeaning || '',
          extendedMeaning: v.extendedMeaning || '',
          synonyms: v.synonyms || [],
          example: v.example || '',
          topicTag: data.topic || pdfTopic,
          passageId,
          passageTag: newPassage.title,
          mastery: 20,
          attempts: 0,
        })
      );

      onPassageCreated(newPassage, extractedVocab);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể số hóa sách PDF.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleDigitizePassage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || rawText.trim().length < 120) {
      setError('Vui lòng dán văn bản tiếng Anh dài tối thiểu 120 ký tự để hệ thống phân tích.');
      return;
    }

    if (!hasApiKey) {
      setError('Bạn cần nhập Gemini API Key để số hóa bài đọc. Vui lòng bấm "Cài đặt API Key".');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Đang khởi tạo kết nối Gemini...');

    try {
      const data = await digitizeFromRawText(
        rawText,
        {
          title,
          sourceBook,
          topic,
          bandLevel,
          questionCount,
        },
        (msg) => setStatusMessage(msg)
      );

      const passageId = `custom-${Date.now()}`;
      const paragraphs = (data.paragraphs || []).map(
        (p: { label: string; text: string }, idx: number) => ({
          id: `${passageId}-p-${idx}`,
          label: p.label || String.fromCharCode(65 + idx),
          text: p.text,
        })
      );

      const questions = (data.questions || []).map((q, idx) => ({
        id: `${passageId}-q-${idx + 1}`,
        number: q.number || idx + 1,
        type: q.type || 'TFNG',
        instruction: q.instruction || 'Answer the questions according to the passage.',
        prompt: q.prompt,
        options: q.options || [],
        answer: q.answer,
        explanation: {
          paragraphLabel: q.explanation?.paragraphLabel || 'A',
          scanningLocation: q.explanation?.scanningLocation || 'Đoạn A',
          evidenceQuote: q.explanation?.evidenceQuote || '',
          paraphrasing: q.explanation?.paraphrasing || [],
          distractorAnalysis: q.explanation?.distractorAnalysis || '',
        },
      }));

      const newPassage: ReadingPassage = {
        id: passageId,
        title: data.title || title || 'IELTS Academic Reading',
        subtitle: data.subtitle || 'Văn bản số hóa tự động',
        sourceBook,
        testRef: `${sourceBook} · Custom Passage`,
        topic: data.topic || topic,
        bandLevel: data.bandLevel || bandLevel,
        difficulty: 'Passage 2',
        estimatedMinutes: data.estimatedMinutes || 20,
        wordCount: paragraphs.reduce(
          (acc, cur) => acc + cur.text.split(/\s+/).length,
          0
        ),
        paragraphs,
        questions,
      };

      const extractedVocab: Omit<VocabEntry, 'id'>[] = (data.vocabulary || []).map(
        (v) => ({
          word: v.word,
          pos: v.pos || 'academic',
          ipa: v.ipa || '/.../',
          contextualMeaning: v.contextualMeaning || '',
          extendedMeaning: v.extendedMeaning || '',
          synonyms: v.synonyms || [],
          example: v.example || '',
          topicTag: data.topic || topic,
          passageId,
          passageTag: newPassage.title,
          mastery: 20,
          attempts: 0,
        })
      );

      onPassageCreated(newPassage, extractedVocab);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể số hóa bài đọc.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleAnalyzeVocabBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vocabListText.trim()) {
      setError('Vui lòng nhập ít nhất một từ vựng.');
      return;
    }

    if (!hasApiKey) {
      setError('Bạn cần nhập Gemini API Key để phân tích từ vựng. Vui lòng bấm "Cài đặt API Key".');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusMessage('Đang phân tích từ vựng học thuật...');

    try {
      const words = vocabListText
        .split('\n')
        .map((w) => w.trim())
        .filter(Boolean)
        .slice(0, 15);

      const items: Omit<VocabEntry, 'id'>[] = words.map((w) => ({
        word: w,
        pos: 'academic',
        ipa: '/.../',
        contextualMeaning: 'Đang cập nhật nghĩa ngữ cảnh...',
        extendedMeaning: '',
        synonyms: [],
        example: `Academic usage of ${w} in Cambridge IELTS Reading passages.`,
        topicTag: vocabTopic,
        passageId: 'batch-import',
        passageTag: vocabPassageRef,
        mastery: 25,
        attempts: 0,
      }));

      onVocabBatchCreated(items);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể nạp từ vựng.');
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
    >
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">
                Số hóa Bài đọc & Sách bài tập IELTS
              </h2>
              <p className="text-xs text-teal-200">
                Tự động tách đoạn văn, dạng câu hỏi và trích xuất Sổ từ vựng
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

        {/* Missing API Key Alert */}
        {!hasApiKey && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-300 text-amber-950 text-xs flex flex-wrap items-center justify-between gap-3 px-6">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Bạn chưa cài đặt khóa Gemini API Key để số hóa bài đọc & tệp PDF.</span>
            </div>
            <button
              type="button"
              onClick={() => onOpenApiKeyModal?.()}
              className="font-bold px-3.5 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded-xl cursor-pointer text-xs shadow-xs"
            >
              Nhập API Key ngay
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-slate-200 flex gap-3 shrink-0 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              setTab('pdf');
              setError(null);
            }}
            className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
              tab === 'pdf'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileUp className="w-4 h-4 text-teal-700" />
            Tải Sách PDF / Ảnh Bài Tập ⭐
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('passage');
              setError(null);
            }}
            className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
              tab === 'passage'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            Dán Văn Bản Thuần
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('vocab');
              setError(null);
            }}
            className={`pb-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-2 ${
              tab === 'vocab'
                ? 'border-teal-700 text-teal-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            Nạp Danh Sách Từ Vựng
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-2xl text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="block font-bold text-rose-900 text-sm">
                    Đã dừng do lỗi API:
                  </strong>
                  <p className="leading-relaxed font-mono text-slate-800">{error}</p>
                </div>
              </div>

              {(error.toLowerCase().includes('api key') ||
                error.toLowerCase().includes('api_key') ||
                error.toLowerCase().includes('permission_denied')) && (
                <div className="pt-2 border-t border-rose-200 flex flex-wrap items-center justify-between gap-2.5">
                  <span className="text-[11px] text-rose-800">
                    👉 Khóa API của bạn chưa chính xác hoặc đã hết hạn. Hãy lấy key mới từ Google AI Studio:
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenApiKeyModal?.()}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
                  >
                    Đổi API Key ngay
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 1: PDF BOOK DIGITIZER */}
          {tab === 'pdf' && (
            <form onSubmit={handlePdfUpload} className="space-y-4">
              <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-2xl text-xs text-teal-900 leading-relaxed">
                <span className="font-bold block mb-1">
                  💡 Số hóa tự động từ Sách bài tập Cambridge:
                </span>
                Tải lên tệp <strong>.pdf</strong> hoặc <strong>ảnh chụp trang sách</strong> đã thiết kế bài đọc & câu hỏi. AI sẽ tự động nhận diện đúng dạng bài tập (TFNG, MCQ, Matching, Điền từ) và <strong>tự động tách phần từ vựng</strong> trọng tâm kèm câu ví dụ!
              </div>

              {/* File Dropzone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn tệp PDF hoặc ảnh trang sách bài tập <span className="text-red-500">*</span>
                </label>
                <div className="border-2 border-dashed border-teal-300 hover:border-teal-600 bg-slate-50 hover:bg-teal-50/30 rounded-2xl p-6 text-center transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/webp"
                    required
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setPdfFile(f);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Upload className="w-8 h-8 text-teal-700 animate-bounce-slow" />
                    <div className="text-xs font-bold text-slate-800">
                      {pdfFile ? (
                        <span className="text-teal-900 font-black">
                          Đã chọn: {pdfFile.name} ({(pdfFile.size / 1024).toFixed(0)} KB)
                        </span>
                      ) : (
                        'Kéo thả tệp PDF vào đây, hoặc nhấp để chọn tệp'
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Hỗ trợ tệp sách PDF bài đọc, hoặc ảnh chụp (.jpg, .png, .pdf)
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadata Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nguồn sách
                  </label>
                  <select
                    value={pdfSourceBook}
                    onChange={(e) => setPdfSourceBook(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    {SOURCE_BOOKS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chủ đề IELTS
                  </label>
                  <select
                    value={pdfTopic}
                    onChange={(e) => setPdfTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    {IELTS_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mục tiêu Band
                  </label>
                  <select
                    value={pdfBandLevel}
                    onChange={(e) => setPdfBandLevel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    <option value="Band 6.0-6.5">Band 6.0 - 6.5</option>
                    <option value="Band 7.0">Band 7.0</option>
                    <option value="Band 7.5">Band 7.5</option>
                    <option value="Band 8.0+">Band 8.0+</option>
                  </select>
                </div>
              </div>

              {/* Status Message while loading */}
              {loading && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-teal-700 animate-spin shrink-0" />
                  <span className="font-semibold">{statusMessage}</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !pdfFile}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang số hóa PDF...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Số hóa tự động từ PDF
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: RAW TEXT DIGITIZER */}
          {tab === 'passage' && (
            <form onSubmit={handleDigitizePassage} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tiêu đề (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: Urban Acoustic Ecology"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chủ đề
                  </label>
                  <select
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    {IELTS_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số lượng câu hỏi
                  </label>
                  <select
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    <option value={4}>4 câu hỏi</option>
                    <option value={5}>5 câu hỏi</option>
                    <option value={6}>6 câu hỏi</option>
                    <option value={8}>8 câu hỏi</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nội dung văn bản tiếng Anh <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setRawText(SAMPLE_PASSAGE_TEXT)}
                    className="text-[11px] text-teal-800 font-bold hover:underline cursor-pointer"
                  >
                    Dán văn bản mẫu
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Dán bài đọc Cambridge IELTS vào đây..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-700 rounded-xl p-3 text-xs font-sans text-slate-900 outline-none leading-relaxed"
                />
              </div>

              {loading && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-900 flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-teal-700 animate-spin shrink-0" />
                  <span className="font-semibold">{statusMessage}</span>
                </div>
              )}

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !rawText.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Số hóa bài đọc
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: VOCAB BATCH */}
          {tab === 'vocab' && (
            <form onSubmit={handleAnalyzeVocabBatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chủ đề IELTS
                  </label>
                  <select
                    value={vocabTopic}
                    onChange={(e) => setVocabTopic(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  >
                    {IELTS_TOPICS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ghi chú nguồn
                  </label>
                  <input
                    type="text"
                    value={vocabPassageRef}
                    onChange={(e) => setVocabPassageRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Danh sách từ vựng (mỗi từ một dòng)
                  </label>
                  <button
                    type="button"
                    onClick={() => setVocabListText(SAMPLE_VOCAB_LIST)}
                    className="text-[11px] text-teal-800 font-bold hover:underline cursor-pointer"
                  >
                    Dán danh sách mẫu
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={vocabListText}
                  onChange={(e) => setVocabListText(e.target.value)}
                  placeholder="attenuate&#10;mitigate&#10;unprecedented"
                  required
                  className="w-full bg-slate-50 border border-slate-300 focus:bg-white focus:border-teal-700 rounded-xl p-3 text-xs font-mono text-slate-900 outline-none leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading || !vocabListText.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <BookPlus className="w-4 h-4" />
                  Nạp vào Sổ từ vựng
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
