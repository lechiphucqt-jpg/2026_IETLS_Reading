import { useMemo, useState } from 'react';
import {
  AlertCircle,
  BookMarked,
  CheckCircle2,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Shuffle,
  Trash2,
  Volume2,
  XCircle,
} from 'lucide-react';
import { VocabEntry } from '../types/ielts';

interface VocabularyStudioProps {
  vocab: VocabEntry[];
  onUpdateMastery: (id: string, delta: number) => void;
  onDeleteVocab: (id: string) => void;
  onOpenImportVocab: () => void;
}

type StudioTab = 'notebook' | 'practice';
type PracticeMode = 'flashcards' | 'matching' | 'fill_blanks';
type MasteryFilter = 'all' | 'weak' | 'learning' | 'mastered';

function getMasteryLabel(mastery: number): { label: string; colorClass: string; barClass: string } {
  if (mastery < 50) {
    return {
      label: 'Từ yếu',
      colorClass: 'text-amber-800',
      barClass: 'bg-amber-500',
    };
  }
  if (mastery < 80) {
    return {
      label: 'Đang ôn',
      colorClass: 'text-sky-800',
      barClass: 'bg-sky-600',
    };
  }
  return {
    label: 'Thành thạo',
    colorClass: 'text-emerald-800',
    barClass: 'bg-emerald-600',
  };
}

function speakEnglish(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.92;
    window.speechSynthesis.speak(u);
  }
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function maskWordInSentence(sentence: string, word: string): string {
  const regex = new RegExp(`\\b${escapeRegExp(word)}\\w*\\b`, 'gi');
  if (regex.test(sentence)) {
    return sentence.replace(regex, '_______');
  }
  return `${sentence} (Target: _______)`;
}

export function VocabularyStudio({
  vocab,
  onUpdateMastery,
  onDeleteVocab,
  onOpenImportVocab,
}: VocabularyStudioProps) {
  const [activeTab, setActiveTab] = useState<StudioTab>('notebook');
  const [topicFilter, setTopicFilter] = useState('Tất cả');
  const [passageFilter, setPassageFilter] = useState('Tất cả');
  const [masteryFilter, setMasteryFilter] = useState<MasteryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Practice Generator state
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('flashcards');
  const [onlyWeakWords, setOnlyWeakWords] = useState(true);
  const [seedNonce, setSeedNonce] = useState(0);

  // Flashcards state
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Matching state
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongPair, setWrongPair] = useState<{ wordId: string; defId: string } | null>(null);

  // Fill-in-the-blanks state
  const [fillInputs, setFillInputs] = useState<Record<string, string>>({});
  const [fillChecked, setFillChecked] = useState<Record<string, boolean>>({});

  const topics = useMemo(
    () => ['Tất cả', ...Array.from(new Set(vocab.map((v) => v.topicTag)))],
    [vocab]
  );
  const passages = useMemo(
    () => ['Tất cả', ...Array.from(new Set(vocab.map((v) => v.passageTag)))],
    [vocab]
  );

  const weakCount = useMemo(() => vocab.filter((v) => v.mastery < 50).length, [vocab]);
  const masteredCount = useMemo(() => vocab.filter((v) => v.mastery >= 80).length, [vocab]);

  const filteredVocab = useMemo(() => {
    return vocab.filter((v) => {
      if (topicFilter !== 'Tất cả' && v.topicTag !== topicFilter) return false;
      if (passageFilter !== 'Tất cả' && v.passageTag !== passageFilter) return false;
      if (masteryFilter === 'weak' && v.mastery >= 50) return false;
      if (masteryFilter === 'learning' && (v.mastery < 50 || v.mastery >= 80)) return false;
      if (masteryFilter === 'mastered' && v.mastery < 80) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          v.word.toLowerCase().includes(q) ||
          v.contextualMeaning.toLowerCase().includes(q) ||
          v.extendedMeaning.toLowerCase().includes(q) ||
          v.topicTag.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [vocab, topicFilter, passageFilter, masteryFilter, searchQuery]);

  // Adaptive weak-word queue: sorts by lowest mastery first
  const practiceQueue = useMemo(() => {
    const base = onlyWeakWords ? vocab.filter((v) => v.mastery < 60) : [...vocab];
    const pool = base.length >= 3 ? base : [...vocab];
    const sorted = [...pool].sort((a, b) => a.mastery - b.mastery);
    // Deterministic light rotation on regenerate so user gets fresh drills
    if (seedNonce === 0 || sorted.length <= 1) return sorted;
    const shift = seedNonce % sorted.length;
    return [...sorted.slice(shift), ...sorted.slice(0, shift)];
  }, [vocab, onlyWeakWords, seedNonce]);

  const matchingBatch = useMemo(() => practiceQueue.slice(0, 5), [practiceQueue]);
  const shuffledDefinitions = useMemo(() => {
    const items = [...matchingBatch];
    // Deterministic shuffle based on seedNonce
    for (let i = items.length - 1; i > 0; i--) {
      const j = (i * 7 + seedNonce * 3 + 1) % (i + 1);
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }, [matchingBatch, seedNonce]);

  const fillBatch = useMemo(() => practiceQueue.slice(0, 5), [practiceQueue]);

  const resetPracticeRound = () => {
    setSeedNonce((n) => n + 1);
    setCardIndex(0);
    setIsFlipped(false);
    setSelectedWordId(null);
    setMatchedIds([]);
    setWrongPair(null);
    setFillInputs({});
    setFillChecked({});
  };

  const handleMatchAttempt = (defId: string) => {
    if (!selectedWordId || matchedIds.includes(defId)) return;
    if (selectedWordId === defId) {
      setMatchedIds((prev) => [...prev, defId]);
      onUpdateMastery(defId, 16);
      setSelectedWordId(null);
      setWrongPair(null);
    } else {
      setWrongPair({ wordId: selectedWordId, defId });
      onUpdateMastery(selectedWordId, -8);
      window.setTimeout(() => setWrongPair(null), 700);
    }
  };

  const activeFlashcard = practiceQueue[cardIndex % Math.max(practiceQueue.length, 1)];

  return (
    <main className="max-w-[1320px] mx-auto px-6 lg:px-8 py-10">
      {/* Editorial Header */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-7 border-b border-slate-200">
        <div>
          <p className="text-xs font-medium text-teal-800 mb-2">
            Contextual Learning & Adaptive Spaced Retrieval
          </p>
          <h1 className="font-editorial text-3xl font-semibold text-slate-900 tracking-tight">
            Sổ tay Từ vựng Thông minh
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-2xl leading-relaxed">
            Mỗi từ vựng gắn chặt với phiên âm IPA, nghĩa trong bài đọc, collocations mở rộng và ví dụ gốc. Thuật toán tự động lọc các “từ yếu” để sinh bài tập Flashcards, Matching và Fill-in-the-blanks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-6">
            <div>
              <div className="font-mono text-2xl font-semibold text-amber-700 tabular-nums">
                {weakCount}
              </div>
              <div className="text-xs text-slate-500">Từ yếu (&lt;50%)</div>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div>
              <div className="font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
                {masteredCount}
              </div>
              <div className="text-xs text-slate-500">Thành thạo</div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenImportVocab}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-teal-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nhập danh sách từ
          </button>
        </div>
      </section>

      {/* Primary Sub-View Segmented Switch */}
      <div className="py-6 flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('notebook')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'notebook'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookMarked className="w-4 h-4" />
            Kho từ vựng ngữ cảnh ({vocab.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('practice')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-white text-teal-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            Tạo bài tập từ yếu ({weakCount})
          </button>
        </div>

        {activeTab === 'notebook' && (
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Lọc theo chủ đề IELTS"
              value={topicFilter}
              onChange={(e) => setTopicFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 cursor-pointer"
            >
              {topics.map((t) => (
                <option key={t} value={t}>
                  {t === 'Tất cả' ? 'Chủ đề: Tất cả' : t}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo bài đọc"
              value={passageFilter}
              onChange={(e) => setPassageFilter(e.target.value)}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 cursor-pointer"
            >
              {passages.map((p) => (
                <option key={p} value={p}>
                  {p === 'Tất cả' ? 'Bài đọc: Tất cả' : p}
                </option>
              ))}
            </select>

            <select
              aria-label="Lọc theo mức độ nhớ"
              value={masteryFilter}
              onChange={(e) => setMasteryFilter(e.target.value as MasteryFilter)}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 cursor-pointer"
            >
              <option value="all">Trạng thái: Tất cả</option>
              <option value="weak">Từ yếu (&lt;50%)</option>
              <option value="learning">Đang ôn (50–79%)</option>
              <option value="mastered">Thành thạo (≥80%)</option>
            </select>

            <div className="relative w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm từ hoặc nghĩa..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: CONTEXTUAL VOCABULARY NOTEBOOK */}
      {activeTab === 'notebook' && (
        <section className="space-y-4">
          {filteredVocab.length === 0 ? (
            <div className="py-16 text-center bg-white border border-dashed border-slate-300 rounded-xl">
              <p className="text-sm font-medium text-slate-700">
                Chưa có từ vựng nào khớp với bộ lọc hiện tại.
              </p>
              <button
                type="button"
                onClick={onOpenImportVocab}
                className="mt-4 px-4 py-2 text-xs font-medium text-white bg-teal-800 hover:bg-teal-900 rounded-lg cursor-pointer"
              >
                Phân tích & thêm từ vựng mới
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {filteredVocab.map((entry) => {
                const status = getMasteryLabel(entry.mastery);
                return (
                  <article
                    key={entry.id}
                    className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4 hover:border-slate-300 transition-colors"
                  >
                    <div>
                      {/* Top Row: Word + POS + IPA + Audio + Delete */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-baseline flex-wrap gap-x-2.5 gap-y-1">
                            <h2 className="font-editorial text-xl font-semibold text-slate-900">
                              {entry.word}
                            </h2>
                            <span className="text-xs font-medium text-slate-500 italic">
                              {entry.pos}
                            </span>
                            {entry.ipa && (
                              <span className="font-mono text-xs text-teal-800">
                                {entry.ipa}
                              </span>
                            )}
                            <button
                              type="button"
                              aria-label={`Phát âm ${entry.word}`}
                              onClick={() => speakEnglish(entry.word)}
                              className="p-1 text-slate-400 hover:text-teal-800 rounded transition-colors cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Clean Unboxed Auto-Tags */}
                          <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                            <span className="font-medium text-slate-700">{entry.topicTag}</span>
                            <span aria-hidden="true">·</span>
                            <span>{entry.passageTag}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          aria-label={`Xóa từ ${entry.word}`}
                          onClick={() => onDeleteVocab(entry.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Structured 6-Field Contextual Content */}
                      <dl className="mt-4 space-y-2.5 text-sm">
                        <div>
                          <dt className="text-xs font-semibold text-slate-500">
                            Nghĩa trong bài đọc
                          </dt>
                          <dd className="text-slate-900 font-medium mt-0.5">
                            {entry.contextualMeaning}
                          </dd>
                        </div>

                        <div>
                          <dt className="text-xs font-semibold text-slate-500">
                            Nghĩa mở rộng & Collocations
                          </dt>
                          <dd className="text-slate-600 text-xs leading-relaxed mt-0.5">
                            {entry.extendedMeaning}
                          </dd>
                        </div>

                        {entry.synonyms.length > 0 && (
                          <div className="text-xs text-slate-600">
                            <span className="font-semibold text-slate-500">Paraphrase: </span>
                            <span className="text-teal-900 font-medium">
                              {entry.synonyms.join(' · ')}
                            </span>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100">
                          <dt className="text-xs font-semibold text-slate-500 mb-1">
                            Ví dụ trong bài đọc
                          </dt>
                          <dd className="text-xs text-slate-700 leading-relaxed italic">
                            “{entry.example}”
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {/* Mastery Progress Footer */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className={`font-semibold ${status.colorClass}`}>
                            {status.label}
                          </span>
                          <span className="font-mono text-slate-600 tabular-nums">
                            {entry.mastery}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${status.barClass}`}
                            style={{ width: `${entry.mastery}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => onUpdateMastery(entry.id, -15)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-md cursor-pointer"
                        >
                          Đánh dấu yếu
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateMastery(entry.id, 20)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md cursor-pointer"
                        >
                          Đã nhớ
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 2: ADAPTIVE WEAK-WORD EXERCISE GENERATOR */}
      {activeTab === 'practice' && (
        <section className="space-y-6">
          {/* Exercise Controls Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-lg">
              {(
                [
                  { id: 'flashcards', label: 'Flashcards ngữ cảnh' },
                  { id: 'matching', label: 'Matching (Nối nghĩa)' },
                  { id: 'fill_blanks', label: 'Fill-in-the-blanks' },
                ] as { id: PracticeMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPracticeMode(m.id);
                    setIsFlipped(false);
                  }}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    practiceMode === m.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWeakWords}
                  onChange={(e) => {
                    setOnlyWeakWords(e.target.checked);
                    resetPracticeRound();
                  }}
                  className="accent-teal-800 rounded cursor-pointer"
                />
                Ưu tiên từ yếu (&lt;60%)
              </label>

              <button
                type="button"
                onClick={resetPracticeRound}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer whitespace-nowrap"
              >
                <Shuffle className="w-3.5 h-3.5" />
                Tạo bộ câu mới
              </button>
            </div>
          </div>

          {practiceQueue.length === 0 ? (
            <div className="py-16 text-center bg-white border border-slate-200 rounded-xl">
              <p className="text-sm text-slate-600">Chưa có từ vựng để tạo bài tập.</p>
            </div>
          ) : (
            <>
              {/* MODE 1: CONTEXTUAL FLASHCARDS */}
              {practiceMode === 'flashcards' && activeFlashcard && (
                <div className="max-w-2xl mx-auto space-y-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      Thẻ{' '}
                      <strong className="font-mono text-slate-900 tabular-nums">
                        {(cardIndex % practiceQueue.length) + 1}/{practiceQueue.length}
                      </strong>
                    </span>
                    <span className="font-mono tabular-nums">
                      Độ thành thạo hiện tại: {activeFlashcard.mastery}% · {activeFlashcard.topicTag}
                    </span>
                  </div>

                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setIsFlipped((f) => !f)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setIsFlipped((f) => !f);
                      }
                    }}
                    className="bg-white border border-slate-200 hover:border-teal-700 rounded-2xl p-8 sm:p-10 min-h-[300px] flex flex-col justify-between cursor-pointer transition-colors"
                  >
                    {!isFlipped ? (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>Mặt trước · Nhấn để lật xem nghĩa ngữ cảnh</span>
                          <span>{activeFlashcard.passageTag}</span>
                        </div>
                        <div className="my-8 text-center">
                          <h2 className="font-editorial text-4xl font-semibold text-slate-900">
                            {activeFlashcard.word}
                          </h2>
                          <div className="mt-2 flex items-center justify-center gap-3 text-sm text-slate-600">
                            <span className="italic">{activeFlashcard.pos}</span>
                            <span className="font-mono text-teal-800">{activeFlashcard.ipa}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                speakEnglish(activeFlashcard.word);
                              }}
                              aria-label="Nghe phát âm"
                              className="p-1.5 bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 rounded-md cursor-pointer"
                            >
                              <Volume2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="mt-6 text-sm text-slate-600 max-w-lg mx-auto italic leading-relaxed">
                            “{maskWordInSentence(activeFlashcard.example, activeFlashcard.word)}”
                          </p>
                        </div>
                        <div className="text-center text-xs font-medium text-teal-800">
                          Nhấn vào thẻ hoặc phím Space để kiểm tra đáp án
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>
                            {activeFlashcard.word} ({activeFlashcard.pos}) · {activeFlashcard.ipa}
                          </span>
                          <span>Mặt sau</span>
                        </div>
                        <div className="my-6 space-y-4">
                          <div>
                            <div className="text-xs font-semibold text-slate-500">
                              Nghĩa trong bài đọc
                            </div>
                            <div className="text-xl font-semibold text-slate-900 mt-1">
                              {activeFlashcard.contextualMeaning}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-slate-500">
                              Nghĩa mở rộng & Collocations
                            </div>
                            <div className="text-sm text-slate-700 mt-0.5 leading-relaxed">
                              {activeFlashcard.extendedMeaning}
                            </div>
                          </div>
                          {activeFlashcard.synonyms.length > 0 && (
                            <div className="text-xs text-teal-900 font-medium">
                              Paraphrase: {activeFlashcard.synonyms.join(' · ')}
                            </div>
                          )}
                          <div className="pt-3 border-t border-slate-100 text-xs text-slate-600 italic leading-relaxed">
                            “{activeFlashcard.example}”
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 text-center">
                          Đánh giá mức độ nhớ bên dưới để thuật toán cập nhật lịch ôn
                        </div>
                      </>
                    )}
                  </div>

                  {/* Spaced Repetition Self-Assessment Buttons */}
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateMastery(activeFlashcard.id, -15);
                        setIsFlipped(false);
                        setCardIndex((i) => i + 1);
                      }}
                      className="py-3 px-4 bg-white border border-amber-300 hover:bg-amber-50 text-amber-900 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Chưa nhớ (Giữ nhóm yếu)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateMastery(activeFlashcard.id, 12);
                        setIsFlipped(false);
                        setCardIndex((i) => i + 1);
                      }}
                      className="py-3 px-4 bg-white border border-sky-300 hover:bg-sky-50 text-sky-900 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Nhớ mang máng (+12%)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateMastery(activeFlashcard.id, 28);
                        setIsFlipped(false);
                        setCardIndex((i) => i + 1);
                      }}
                      className="py-3 px-4 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Đã thuộc vững (+28%)
                    </button>
                  </div>
                </div>
              )}

              {/* MODE 2: MATCHING (WORD <-> CONTEXTUAL MEANING) */}
              {practiceMode === 'matching' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    <div>
                      <h2 className="font-editorial text-xl font-semibold text-slate-900">
                        Nối từ học thuật với Nghĩa ngữ cảnh chính xác
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Chọn một từ ở cột trái, sau đó nhấn vào nghĩa tương ứng ở cột phải.
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-teal-800 tabular-nums">
                      Đã nối: {matchedIds.length}/{matchingBatch.length}
                    </span>
                  </div>

                  {matchedIds.length === matchingBatch.length && matchingBatch.length > 0 ? (
                    <div className="py-10 text-center space-y-3">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h3 className="font-editorial text-xl font-semibold text-slate-900">
                        Hoàn thành xuất sắc lượt Matching
                      </h3>
                      <p className="text-sm text-slate-600">
                        Điểm thành thạo của các từ yếu vừa luyện đã được tự động nâng lên.
                      </p>
                      <button
                        type="button"
                        onClick={resetPracticeRound}
                        className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-teal-800 hover:bg-teal-900 rounded-lg cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Luyện vòng tiếp theo
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Target Words */}
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-slate-500">
                          Từ vựng mục tiêu
                        </div>
                        {matchingBatch.map((item) => {
                          const isMatched = matchedIds.includes(item.id);
                          const isSelected = selectedWordId === item.id;
                          const isWrong = wrongPair?.wordId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={isMatched}
                              onClick={() => setSelectedWordId(item.id)}
                              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors flex items-center justify-between cursor-pointer disabled:cursor-default ${
                                isMatched
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-65'
                                  : isWrong
                                  ? 'bg-rose-50 border-rose-500 text-rose-900'
                                  : isSelected
                                  ? 'bg-teal-800 border-teal-800 text-white'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-400 text-slate-900'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-base">{item.word}</div>
                                <div
                                  className={`text-xs font-mono ${
                                    isSelected ? 'text-teal-100' : 'text-slate-500'
                                  }`}
                                >
                                  {item.pos} · {item.ipa}
                                </div>
                              </div>
                              {isMatched && <CheckCircle2 className="w-4 h-4 text-emerald-700" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Right Column: Contextual Meanings */}
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-slate-500">
                          Nghĩa trong ngữ cảnh IELTS
                        </div>
                        {shuffledDefinitions.map((item) => {
                          const isMatched = matchedIds.includes(item.id);
                          const isWrong = wrongPair?.defId === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={isMatched}
                              onClick={() => handleMatchAttempt(item.id)}
                              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-colors cursor-pointer disabled:cursor-default ${
                                isMatched
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-65'
                                  : isWrong
                                  ? 'bg-rose-50 border-rose-500 text-rose-900'
                                  : 'bg-white border-slate-200 hover:border-teal-700 text-slate-800'
                              }`}
                            >
                              <div className="text-sm font-medium leading-snug">
                                {item.contextualMeaning}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {item.topicTag} · {item.passageTag}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* MODE 3: CONTEXTUAL FILL-IN-THE-BLANKS */}
              {practiceMode === 'fill_blanks' && (
                <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
                  <div className="pb-4 border-b border-slate-100">
                    <h2 className="font-editorial text-xl font-semibold text-slate-900">
                      Điền từ vào ngữ cảnh câu bài đọc gốc
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Gõ từ chính xác dựa trên gợi ý nghĩa ngữ cảnh và loại từ, hoặc chọn từ ngân hàng từ gợi ý bên dưới.
                    </p>
                    {/* Interactive Word Bank */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-medium text-slate-500 mr-1">
                        Ngân hàng từ:
                      </span>
                      {shuffledDefinitions.map((w) => (
                        <span
                          key={w.id}
                          className="font-mono text-xs px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md"
                        >
                          {w.word}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-5">
                    {fillBatch.map((item, idx) => {
                      const val = fillInputs[item.id] || '';
                      const checked = fillChecked[item.id] || false;
                      const isCorrect =
                        val.trim().toLowerCase() === item.word.trim().toLowerCase();

                      return (
                        <div
                          key={item.id}
                          className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="font-mono text-xs font-semibold text-teal-800 pt-0.5 tabular-nums">
                              0{idx + 1}.
                            </span>
                            <p className="text-sm text-slate-800 leading-relaxed">
                              {maskWordInSentence(item.example, item.word)}
                            </p>
                          </div>

                          <div className="pl-7 text-xs text-slate-600">
                            Gợi ý ({item.pos}):{' '}
                            <strong className="text-slate-800">{item.contextualMeaning}</strong>
                          </div>

                          <div className="pl-7 flex flex-wrap items-center gap-2.5">
                            <input
                              type="text"
                              disabled={checked}
                              value={val}
                              onChange={(e) =>
                                setFillInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !checked && val.trim()) {
                                  setFillChecked((prev) => ({ ...prev, [item.id]: true }));
                                  onUpdateMastery(item.id, isCorrect ? 22 : -10);
                                }
                              }}
                              placeholder="Nhập từ vựng..."
                              className={`h-9 w-56 px-3 text-sm rounded-lg border bg-white focus:outline-none ${
                                checked
                                  ? isCorrect
                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                                    : 'border-rose-500 bg-rose-50 text-rose-950'
                                  : 'border-slate-300 focus:border-teal-700'
                              }`}
                            />

                            {!checked ? (
                              <button
                                type="button"
                                disabled={!val.trim()}
                                onClick={() => {
                                  setFillChecked((prev) => ({ ...prev, [item.id]: true }));
                                  onUpdateMastery(item.id, isCorrect ? 22 : -10);
                                }}
                                className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-teal-900 disabled:opacity-40 rounded-lg cursor-pointer"
                              >
                                Kiểm tra
                              </button>
                            ) : isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" />
                                Chính xác (+22% thành thạo)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                                <XCircle className="w-4 h-4" />
                                Đáp án: <span className="font-mono text-slate-900">{item.word}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-teal-700" />
                      Mỗi câu trả lời đúng/sai sẽ tự động điều chỉnh độ ưu tiên trong Sổ từ vựng.
                    </span>
                    <button
                      type="button"
                      onClick={resetPracticeRound}
                      className="text-teal-800 font-semibold hover:underline cursor-pointer"
                    >
                      Sinh bài tập mới
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
