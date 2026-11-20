import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCw,
  Sparkles,
  Volume2,
  List,
  Layers,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ReadingPassage, VocabEntry } from '../types/ielts';

interface PreteachVocabularyViewProps {
  passages: ReadingPassage[];
  activePassage: ReadingPassage;
  onSelectPassage: (id: string) => void;
  vocab: VocabEntry[];
  onUpdateMastery: (id: string, delta: number) => void;
  onStartStudent: (passageId: string) => void;
  onStartTeacher: (passageId: string) => void;
}

export function PreteachVocabularyView({
  passages,
  activePassage,
  onSelectPassage,
  vocab,
  onUpdateMastery,
  onStartStudent,
  onStartTeacher,
}: PreteachVocabularyViewProps) {
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [onlyWeak, setOnlyWeak] = useState(false);
  const [listSearch, setListSearch] = useState('');

  // Filter vocabulary belonging to the active passage
  const passageVocab = useMemo(() => {
    const list = vocab.filter((v) => v.passageId === activePassage.id);
    if (onlyWeak) {
      return list.filter((v) => v.mastery < 60);
    }
    return list;
  }, [vocab, activePassage.id, onlyWeak]);

  // Filter for the list table mode
  const filteredListVocab = useMemo(() => {
    if (!listSearch.trim()) return passageVocab;
    const q = listSearch.toLowerCase().trim();
    return passageVocab.filter(
      (v) =>
        v.word.toLowerCase().includes(q) ||
        v.contextualMeaning.toLowerCase().includes(q) ||
        (v.extendedMeaning && v.extendedMeaning.toLowerCase().includes(q)) ||
        (v.example && v.example.toLowerCase().includes(q))
    );
  }, [passageVocab, listSearch]);

  // Reset index when changing passage or filter
  useEffect(() => {
    setCardIndex(0);
    setIsFlipped(false);
  }, [activePassage.id, onlyWeak]);

  const totalCards = passageVocab.length;
  const safeIndex = Math.min(Math.max(0, cardIndex), Math.max(0, totalCards - 1));
  const currentCard = passageVocab[safeIndex];

  const speakWord = (word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(word);
    utter.lang = 'en-GB';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  };

  const handleNext = () => {
    if (safeIndex < totalCards - 1) {
      setCardIndex((prev) => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (safeIndex > 0) {
      setCardIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  };

  // Keyboard navigation: Arrow Left/Right to change, Space to flip (only in cards mode)
  useEffect(() => {
    if (viewMode !== 'cards') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, safeIndex, totalCards]);

  const highlightWordInSentence = (sentence: string, targetWord: string) => {
    if (!sentence || !targetWord) return sentence;
    const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${escaped}\\w*\\b)`, 'gi');
    const parts = sentence.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span
          key={i}
          className="bg-amber-300 text-slate-950 font-black px-1.5 py-0.5 rounded-sm mx-0.5 underline decoration-amber-500 decoration-2"
        >
          {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <main className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Academic Pre-teach */}
      <section className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-teal-200 bg-teal-950/70 px-3 py-1 rounded-full border border-teal-500/30">
                PRE-TEACH VOCABULARY · KHỞI ĐỘNG BÀI ĐỌC
              </span>
              <span className="text-[11px] font-bold text-amber-300 bg-amber-950/50 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                {activePassage.bandLevel}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
              {activePassage.title}
            </h1>
            <p className="mt-2 text-sm text-teal-100 max-w-2xl leading-relaxed">
              Dạy và nạp trước các từ vựng học thuật trọng tâm xuất hiện trong bài đọc. Học qua <strong>Cạc lật font chữ to</strong> kèm IPA, câu ví dụ trích từ bài, hoặc xem <strong>Bảng danh sách toàn bộ từ vựng</strong> theo bài.
            </p>
          </div>

          {/* Quick Passage Selector */}
          <div className="shrink-0 bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20">
            <label className="block text-xs font-semibold text-teal-200 mb-1.5">
              Chọn bài đọc để Pre-teach:
            </label>
            <select
              value={activePassage.id}
              onChange={(e) => onSelectPassage(e.target.value)}
              className="bg-white text-slate-900 text-xs sm:text-sm font-semibold rounded-xl px-3 py-2 outline-none border-0 cursor-pointer shadow-xs max-w-[260px] truncate"
            >
              {passages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.sourceBook})
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Stage Controls: View Mode Toggle & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* Toggle between 3D Flashcard and Full List Mode */}
        <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'cards'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Học từng cạc (Flashcard)
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-teal-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="w-4 h-4" />
            Danh sách toàn bộ ({passageVocab.length} từ)
          </button>
        </div>

        {/* Progress or Quick Filter */}
        <div className="flex items-center gap-3">
          {viewMode === 'cards' ? (
            <>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tiến độ:
              </span>
              <span className="font-mono text-sm font-black text-teal-900 bg-teal-50 px-3 py-1 rounded-full border border-teal-200">
                {totalCards > 0 ? safeIndex + 1 : 0} / {totalCards} Từ
              </span>
              {currentCard && (
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    currentCard.mastery >= 75
                      ? 'bg-emerald-100 text-emerald-800'
                      : currentCard.mastery >= 50
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Mastery: {currentCard.mastery}%
                </span>
              )}
            </>
          ) : (
            <span className="text-xs font-bold text-slate-600">
              Tổng cộng <strong>{passageVocab.length}</strong> từ vựng trọng tâm trong bài
            </span>
          )}

          <button
            type="button"
            onClick={() => setOnlyWeak((prev) => !prev)}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              onlyWeak
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {onlyWeak ? 'Đang lọc: Từ yếu (<60%)' : 'Lọc từ yếu'}
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: 3D FLASHCARD STAGE */}
      {viewMode === 'cards' && (
        <>
          {totalCards > 0 && currentCard ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* THE GIANT 3D FLIP CARD */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setIsFlipped((prev) => !prev)}
                className={`relative min-h-[380px] sm:min-h-[420px] rounded-3xl p-8 sm:p-12 shadow-2xl transition-all duration-300 cursor-pointer select-none border-4 flex flex-col justify-between ${
                  !isFlipped
                    ? 'bg-[#0F766E] hover:bg-[#115E59] text-white border-teal-400/80'
                    : 'bg-white text-slate-900 border-teal-600'
                }`}
              >
                {!isFlipped ? (
                  /* FRONT OF THE CARD: Huge Font & IPA & Audio */
                  <div className="flex flex-col items-center justify-center text-center my-auto space-y-5">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-950/60 border border-teal-400/40 text-xs sm:text-sm font-bold text-teal-200 uppercase tracking-wider">
                      <span>{currentCard.pos || 'academic'}</span>
                      <span>·</span>
                      <span>Band 7.0+</span>
                    </div>

                    {/* THE 40PT+ GIANT WORD */}
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-md">
                      {currentCard.word}
                    </h2>

                    {currentCard.ipa && (
                      <div className="inline-flex items-center gap-3 bg-teal-900/90 border border-teal-400/40 px-5 py-2 rounded-full shadow-inner">
                        <span className="text-lg sm:text-2xl font-mono text-teal-100 font-bold">
                          {currentCard.ipa}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakWord(currentCard.word);
                          }}
                          title="Phát âm giọng Anh chuẩn (en-GB)"
                          className="p-2 bg-teal-700 hover:bg-teal-600 text-white rounded-full transition-transform active:scale-90 cursor-pointer"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}

                    <div className="pt-4 flex items-center gap-2 text-xs text-teal-200 font-medium">
                      <RotateCw className="w-4 h-4 animate-spin-slow" />
                      <span>Nhấn vào thẻ hoặc nhấn phím Space để lật xem nghĩa & câu ví dụ</span>
                    </div>
                  </div>
                ) : (
                  /* BACK OF THE CARD: Contextual Meaning, Collocations, Example Sentence */
                  <div className="space-y-6 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl sm:text-3xl font-black text-teal-800">
                            {currentCard.word}
                          </span>
                          <span className="text-sm font-mono text-slate-500 font-bold">
                            {currentCard.ipa}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            speakWord(currentCard.word);
                          }}
                          className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-xl transition-colors cursor-pointer"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Contextual Meaning */}
                      <div className="mt-4">
                        <span className="text-xs font-bold text-teal-700 uppercase tracking-wider block mb-1">
                          Nghĩa chính xác trong ngữ cảnh bài đọc:
                        </span>
                        <p className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
                          {currentCard.contextualMeaning}
                        </p>
                      </div>

                      {/* Extended Meaning & Collocations */}
                      {currentCard.extendedMeaning && (
                        <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
                          <strong className="text-slate-900 block mb-0.5">Collocations & Mở rộng:</strong>
                          {currentCard.extendedMeaning}
                        </div>
                      )}

                      {/* EXAMPLE SENTENCE FROM THE READING PASSAGE */}
                      <div className="mt-4 p-4 sm:p-5 bg-amber-50/90 border-2 border-amber-300/80 rounded-2xl shadow-xs">
                        <span className="text-xs font-extrabold text-amber-900 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-amber-700" />
                          Câu ví dụ trích từ bài đọc IELTS:
                        </span>
                        <p className="text-sm sm:text-base text-slate-900 font-medium leading-relaxed italic">
                          "{highlightWordInSentence(currentCard.example, currentCard.word)}"
                        </p>
                      </div>
                    </div>

                    <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
                      Nhấn lại để lật về mặt trước
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation & Mastery Update Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                {/* Prev / Next Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handlePrev}
                    disabled={safeIndex === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Từ trước
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={safeIndex >= totalCards - 1}
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                  >
                    Từ tiếp theo
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Mastery evaluation buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateMastery(currentCard.id, -10)}
                    className="px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    Cần ôn lại (-10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateMastery(currentCard.id, 20)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-colors cursor-pointer shadow-xs"
                  >
                    <Check className="w-4 h-4 text-emerald-600" />
                    Đã thuộc (+20%)
                  </button>
                </div>
              </div>

              {/* Call-to-action button to view FULL LIST of vocabulary */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="w-full flex items-center justify-center gap-2.5 py-3 px-5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 hover:from-teal-100 hover:to-emerald-100 border-2 border-teal-300 text-teal-900 rounded-2xl font-bold text-sm shadow-xs transition-all cursor-pointer group"
                >
                  <List className="w-4 h-4 text-teal-700 group-hover:scale-110 transition-transform" />
                  <span>
                    {safeIndex >= totalCards - 1
                      ? '🎉 Đã duyệt hết các từ! Bấm vào đây để xem toàn bộ danh sách từ vựng bài học'
                      : `Hiển thị bảng tổng hợp toàn bộ ${totalCards} từ vựng Pre-teach`}
                  </span>
                  <ArrowRight className="w-4 h-4 text-teal-700 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800">Chưa có từ vựng cho bài đọc này</h3>
              <p className="text-sm text-slate-500 mt-1">
                {onlyWeak
                  ? 'Tất cả các từ trong bài đều đã đạt mức thành thạo trên 60%!'
                  : 'Hãy sử dụng tính năng "Số hóa bài đọc" để AI tự động tách và phân tích danh mục từ vựng.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* VIEW MODE 2: FULL PRE-TEACH VOCABULARY LIST TABLE */}
      {viewMode === 'list' && (
        <section className="space-y-6">
          {/* Header & Search in Full List Mode */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <List className="w-5 h-5 text-teal-800" />
                Danh mục toàn bộ từ vựng Pre-teach ({passageVocab.length} từ)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Bài đọc: <strong className="text-slate-800">{activePassage.title}</strong> · {activePassage.sourceBook}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Search input for list */}
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={listSearch}
                  onChange={(e) => setListSearch(e.target.value)}
                  placeholder="Tìm từ vựng hoặc nghĩa..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-teal-700 transition-colors"
                />
              </div>

              {/* Switch back to Card button */}
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                Học qua Cạc lật
              </button>
            </div>
          </div>

          {/* Vocabulary Table */}
          {filteredListVocab.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <Search className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">Không tìm thấy từ vựng phù hợp</h3>
              <p className="text-xs text-slate-500 mt-1">
                Hãy thử xóa ô tìm kiếm hoặc tắt bộ lọc từ yếu.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-4 px-4 w-12 text-center">STT</th>
                      <th className="py-4 px-5 w-56">Từ vựng & Phát âm</th>
                      <th className="py-4 px-5 w-64">Nghĩa ngữ cảnh trong bài</th>
                      <th className="py-4 px-5">Collocations & Mở rộng</th>
                      <th className="py-4 px-5 w-80">Câu ví dụ trong bài đọc IELTS</th>
                      <th className="py-4 px-5 w-40 text-center">Thành thạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredListVocab.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-teal-50/30 transition-colors group"
                      >
                        {/* STT */}
                        <td className="py-4 px-4 text-center font-mono text-xs font-bold text-slate-400">
                          {idx + 1}
                        </td>

                        {/* Word & IPA */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-teal-900 group-hover:text-teal-700">
                              {item.word}
                            </span>
                            <button
                              type="button"
                              onClick={() => speakWord(item.word)}
                              title="Phát âm (en-GB)"
                              className="p-1.5 text-slate-400 hover:text-teal-700 hover:bg-teal-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono text-slate-500 font-semibold">
                              {item.ipa || '/.../'}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                              {item.pos || 'acad'}
                            </span>
                          </div>
                        </td>

                        {/* Contextual Meaning */}
                        <td className="py-4 px-5">
                          <p className="font-bold text-slate-900 leading-snug">
                            {item.contextualMeaning}
                          </p>
                        </td>

                        {/* Collocations & Extension */}
                        <td className="py-4 px-5">
                          {item.extendedMeaning ? (
                            <span className="text-xs text-slate-600 leading-relaxed block bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              {item.extendedMeaning}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Example sentence with highlighting */}
                        <td className="py-4 px-5">
                          {item.example ? (
                            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs leading-relaxed text-slate-800 italic">
                              "{highlightWordInSentence(item.example, item.word)}"
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">—</span>
                          )}
                        </td>

                        {/* Mastery status & Quick adjust */}
                        <td className="py-4 px-5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                  item.mastery >= 75
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.mastery >= 50
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {item.mastery}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onUpdateMastery(item.id, -10)}
                                title="Cần ôn lại (-10%)"
                                className="px-2 py-1 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors cursor-pointer"
                              >
                                -10%
                              </button>
                              <button
                                type="button"
                                onClick={() => onUpdateMastery(item.id, 20)}
                                title="Đã thuộc (+20%)"
                                className="px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition-colors cursor-pointer"
                              >
                                +20%
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick jump to Cards or Practice */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setCardIndex(0);
                setViewMode('cards');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Layers className="w-4 h-4 text-slate-600" />
              Luyện lại từ đầu bằng Cạc lật (Flashcard)
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onStartTeacher(activePassage.id)}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Trình chiếu 16:9
              </button>
              <button
                type="button"
                onClick={() => onStartStudent(activePassage.id)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-teal-800 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer shadow-md"
              >
                Làm bài đọc 50/50 ngay
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Direct Transition to Practice Actions (always shown at bottom) */}
      <section className="bg-slate-100/80 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-200">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            Sẵn sàng thử sức với bài đọc?
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            Sau khi nắm vững từ vựng trọng tâm, bạn có thể chuyển sang phòng thi để làm bài 50/50 hoặc mở trình chiếu lớp học.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onStartTeacher(activePassage.id)}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl transition-colors cursor-pointer"
          >
            Trình chiếu 16:9
          </button>
          <button
            type="button"
            onClick={() => onStartStudent(activePassage.id)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-black text-white bg-slate-900 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Làm bài đọc 50/50 ngay
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>
    </main>
  );
}
