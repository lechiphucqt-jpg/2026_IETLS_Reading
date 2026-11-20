import { useMemo, useState } from 'react';
import {
  BookOpen,
  Headphones,
  Presentation,
  Search,
  ArrowRight,
  Plus,
  Sparkles,
  Download,
} from 'lucide-react';
import { ReadingPassage, VocabEntry } from '../types/ielts';

interface LibraryViewProps {
  passages: ReadingPassage[];
  vocab: VocabEntry[];
  onStartStudent: (passageId: string) => void;
  onStartTeacher: (passageId: string) => void;
  onStartPreteach: (passageId: string) => void;
  onOpenExport: (passageId: string) => void;
  onOpenDigitize: () => void;
  onNavigateVocab: () => void;
}

export function LibraryView({
  passages,
  vocab,
  onStartStudent,
  onStartTeacher,
  onStartPreteach,
  onOpenExport,
  onOpenDigitize,
  onNavigateVocab,
}: LibraryViewProps) {
  const [selectedBook, setSelectedBook] = useState<string>('Tất cả');
  const [selectedTopic, setSelectedTopic] = useState<string>('Tất cả');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const books = useMemo(
    () => ['Tất cả', ...Array.from(new Set(passages.map((p) => p.sourceBook)))],
    [passages]
  );
  const topics = useMemo(
    () => ['Tất cả', ...Array.from(new Set(passages.map((p) => p.topic)))],
    [passages]
  );
  const difficulties = ['Tất cả', 'Passage 1', 'Passage 2', 'Passage 3'];

  const filteredPassages = useMemo(() => {
    return passages.filter((p) => {
      if (selectedBook !== 'Tất cả' && p.sourceBook !== selectedBook) return false;
      if (selectedTopic !== 'Tất cả' && p.topic !== selectedTopic) return false;
      if (selectedDifficulty !== 'Tất cả' && p.difficulty !== selectedDifficulty) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.topic.toLowerCase().includes(q) ||
          p.sourceBook.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [passages, selectedBook, selectedTopic, selectedDifficulty, searchQuery]);

  const weakWordCount = useMemo(() => vocab.filter((v) => v.mastery < 50).length, [vocab]);

  return (
    <main className="max-w-[1320px] mx-auto px-6 lg:px-8 py-10">
      {/* Editorial Intro Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end pb-8 border-b border-slate-200">
        <div className="lg:col-span-8">
          <p className="text-xs font-semibold text-teal-800 tracking-wide mb-2 uppercase">
            Hệ sinh thái IELTS Reading & Giảng dạy chuyên sâu
          </p>
          <h1 className="font-editorial text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
            Thư viện Bài đọc Chuẩn hóa Cambridge
          </h1>
          <p className="mt-3 text-base text-slate-600 max-w-2xl leading-relaxed">
            Hỗ trợ <strong>tải sách PDF lên tự động số hóa</strong>, chế độ <strong>Dạy từ vựng Pre-teach (cạc lật font to có ví dụ)</strong>, làm bài thi Split-screen 50/50, và <strong>xuất tài liệu Word (.docx) / Slide (.pptx)</strong> cho giáo viên.
          </p>
        </div>

        {/* Clean Unboxed Academic Summary Metrics */}
        <div className="lg:col-span-4 flex items-center justify-between lg:justify-end gap-8 pt-2">
          <div>
            <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {passages.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Bài đọc đã số hóa</div>
          </div>
          <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
          <div>
            <div className="font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {vocab.length}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">Từ vựng ngữ cảnh</div>
          </div>
          <div className="h-8 w-px bg-slate-200" aria-hidden="true" />
          <button
            type="button"
            onClick={onNavigateVocab}
            className="text-left group cursor-pointer"
          >
            <div className="font-mono text-2xl font-bold text-amber-700 tabular-nums group-hover:text-amber-800">
              {weakWordCount}
            </div>
            <div className="text-xs text-slate-500 group-hover:text-slate-800 mt-0.5 underline decoration-slate-300 underline-offset-4">
              Từ yếu cần ôn
            </div>
          </button>
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Interactive Topic Filter Tabs */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl overflow-x-auto max-w-full">
            {topics.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => setSelectedTopic(topic)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedTopic === topic
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {topic}
              </button>
            ))}
          </div>

          {/* Book Filter Dropdown */}
          <select
            value={selectedBook}
            onChange={(e) => setSelectedBook(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300"
          >
            {books.map((b) => (
              <option key={b} value={b}>
                {b === 'Tất cả' ? 'Tất cả nguồn sách' : b}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer hover:border-slate-300"
          >
            {difficulties.map((d) => (
              <option key={d} value={d}>
                {d === 'Tất cả' ? 'Mọi cấp độ đề' : d}
              </option>
            ))}
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, chủ đề..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-700 transition-colors"
          />
        </div>
      </section>

      {/* Grid of Reading Passage Cards */}
      {filteredPassages.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-2xl">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">Không tìm thấy bài đọc phù hợp</h3>
          <p className="text-xs text-slate-500 mt-1">
            Hãy thử tìm bằng từ khóa khác hoặc nạp bài đọc mới qua nút "Số hóa bài đọc".
          </p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredPassages.map((passage) => {
            const vocabCount = vocab.filter((v) => v.passageId === passage.id).length;
            const imgFailed = failedImages[passage.id] || !passage.coverImage;

            return (
              <article
                key={passage.id}
                className="group bg-white border border-slate-200 hover:border-teal-700/50 rounded-2xl overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg"
              >
                <div>
                  {/* 4:3 Editorial Cover */}
                  <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100 relative border-b border-slate-100">
                    {!imgFailed ? (
                      <img
                        src={passage.coverImage}
                        alt={passage.title}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setFailedImages((prev) => ({ ...prev, [passage.id]: true }))
                        }
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 via-teal-50/60 to-slate-200 flex flex-col items-center justify-center p-6 text-center">
                        <BookOpen className="w-8 h-8 text-teal-800/70 mb-2" />
                        <span className="font-editorial text-sm font-semibold text-slate-700 line-clamp-2">
                          {passage.title}
                        </span>
                      </div>
                    )}

                    {/* Pre-teach Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-teal-900/80 backdrop-blur-md text-teal-100 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-teal-500/40 shadow-xs">
                        {vocabCount} Từ vựng Pre-teach
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5">
                    <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
                      <span className="font-bold text-teal-800">{passage.sourceBook}</span>
                      <span aria-hidden="true">·</span>
                      <span>{passage.topic}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-700 font-bold">
                        {passage.bandLevel}
                      </span>
                    </div>

                    <h2 className="font-editorial text-lg font-bold text-slate-900 leading-snug group-hover:text-teal-900 transition-colors">
                      {passage.title}
                    </h2>

                    <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2">
                      {passage.subtitle}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono tabular-nums font-semibold">
                        {passage.questions.length} câu hỏi · {passage.wordCount || 850} từ
                      </span>
                      <span className="inline-flex items-center gap-1 text-teal-800 font-semibold">
                        <Headphones className="w-3.5 h-3.5" />
                        Shadowing
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions with Pre-teach, Student, 16:9, and Export */}
                <div className="px-5 pb-5 pt-1 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* PRE-TEACH VOCABULARY ACTION */}
                    <button
                      type="button"
                      onClick={() => onStartPreteach(passage.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-xl transition-colors cursor-pointer"
                      title="Dạy từ vựng trước khi đọc (Cạc lật font to có ví dụ)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-700" />
                      Pre-teach
                    </button>

                    {/* PRACTICE 50/50 ACTION */}
                    <button
                      type="button"
                      onClick={() => onStartStudent(passage.id)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer"
                    >
                      Làm bài 50/50
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* EXPORT TO WORD / PPTX ACTION */}
                    <button
                      type="button"
                      onClick={() => onOpenExport(passage.id)}
                      title="Xuất đề thi Word (.docx) và Bài giảng (.pptx)"
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-teal-700" />
                      Xuất Word / Slide
                    </button>

                    {/* 16:9 PRESENTATION MODE */}
                    <button
                      type="button"
                      onClick={() => onStartTeacher(passage.id)}
                      title="Mở chế độ Trình chiếu lớp học 16:9"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      <Presentation className="w-3.5 h-3.5" />
                      16:9
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {/* Import / Digitize Trigger Card */}
          <button
            type="button"
            onClick={onOpenDigitize}
            className="border-2 border-dashed border-teal-300 hover:border-teal-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-teal-50/20 hover:bg-teal-50/50 transition-colors cursor-pointer min-h-[340px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-teal-200 flex items-center justify-center mb-4 shadow-xs">
              <Plus className="w-6 h-6 text-teal-800" />
            </div>
            <h3 className="font-editorial text-lg font-bold text-slate-900">
              Số hóa Sách PDF hoặc Bài đọc mới
            </h3>
            <p className="mt-2 text-xs text-slate-600 max-w-xs leading-relaxed">
              Tải tệp sách PDF bài tập lên để AI tự động số hóa dạng câu hỏi và trích xuất danh mục từ vựng học thuật.
            </p>
          </button>
        </section>
      )}
    </main>
  );
}
