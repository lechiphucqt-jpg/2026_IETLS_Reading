import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookmarkPlus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crosshair,
  Headphones,
  Highlighter,
  Loader2,
  MessageSquarePlus,
  Pause,
  Play,
  Presentation,
  Repeat,
  RotateCcw,
  Sparkles,
  Download,
  Trash2,
  Upload,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import {
  HighlightColor,
  ReadingPassage,
  ReadingQuestion,
  TextAnnotation,
  VocabEntry,
} from '../types/ielts';
import { useShadowingAudio } from '../hooks/useShadowingAudio';
import { lookupWordContextual, getStoredApiKey } from '../utils/geminiClient';

interface StudentWorkspaceProps {
  passages: ReadingPassage[];
  activePassage: ReadingPassage;
  onSelectPassage: (passageId: string) => void;
  annotations: TextAnnotation[];
  onAddAnnotation: (annotation: Omit<TextAnnotation, 'id' | 'createdAt'>) => void;
  onUpdateAnnotationNote: (id: string, note: string) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddVocab: (entry: Omit<VocabEntry, 'id'>) => void;
  onUploadAudio: (passageId: string, objectUrl: string) => void;
  onSwitchToTeacher: () => void;
  onSwitchToPreteach?: () => void;
  onOpenExport?: () => void;
}

interface PendingSelection {
  paragraphId: string;
  quote: string;
  sentence: string;
  x: number;
  y: number;
}

const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-amber-200/80 text-slate-950',
  mint: 'bg-emerald-200/80 text-slate-950',
  sky: 'bg-sky-200/80 text-slate-950',
  rose: 'bg-rose-200/80 text-slate-950',
};

const HIGHLIGHT_SWATCHES: { color: HighlightColor; label: string; bg: string }[] = [
  { color: 'yellow', label: 'Vàng', bg: 'bg-amber-300' },
  { color: 'mint', label: 'Xanh lục', bg: 'bg-emerald-300' },
  { color: 'sky', label: 'Xanh dương', bg: 'bg-sky-300' },
  { color: 'rose', label: 'Hồng', bg: 'bg-rose-300' },
];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function estimateBand(correct: number, total: number): string {
  if (total === 0) return '—';
  const ratio = correct / total;
  if (ratio >= 0.95) return 'Band 9.0';
  if (ratio >= 0.85) return 'Band 8.0–8.5';
  if (ratio >= 0.72) return 'Band 7.0–7.5';
  if (ratio >= 0.57) return 'Band 6.0–6.5';
  if (ratio >= 0.42) return 'Band 5.5';
  return 'Band 4.5–5.0';
}

function extractContainingSentence(paragraphText: string, quote: string): string {
  const idx = paragraphText.indexOf(quote);
  if (idx === -1) return paragraphText.slice(0, 220);
  const before = paragraphText.slice(0, idx);
  const after = paragraphText.slice(idx + quote.length);
  const startPunct = Math.max(before.lastIndexOf('.'), before.lastIndexOf('?'), before.lastIndexOf('!'));
  const endMatch = after.search(/[.?!]/);
  const start = startPunct === -1 ? 0 : startPunct + 1;
  const end = endMatch === -1 ? paragraphText.length : idx + quote.length + endMatch + 1;
  return paragraphText.slice(start, end).trim();
}

export function StudentWorkspace({
  passages,
  activePassage,
  onSelectPassage,
  annotations,
  onAddAnnotation,
  onUpdateAnnotationNote,
  onDeleteAnnotation,
  onAddVocab,
  onUploadAudio,
  onSwitchToTeacher,
  onSwitchToPreteach,
  onOpenExport,
}: StudentWorkspaceProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showExplanations, setShowExplanations] = useState(false);
  const [activeEvidence, setActiveEvidence] = useState<{
    questionId: string;
    paragraphLabel: string;
    quote: string;
  } | null>(null);

  // Countdown Exam Timer (default 20 min)
  const [secondsLeft, setSecondsLeft] = useState(activePassage.estimatedMinutes * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // Selection & Annotation states
  const [selection, setSelection] = useState<PendingSelection | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [isNoteMode, setIsNoteMode] = useState(false);
  const [showNotesPanel, setShowNotesPanel] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const leftPaneRef = useRef<HTMLDivElement | null>(null);
  const paragraphRefs = useRef<Record<string, HTMLElement | null>>({});
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const audio = useShadowingAudio({
    paragraphs: activePassage.paragraphs,
    customAudioUrl: activePassage.audioUrl,
  });

  // Reset exam state when switching passages
  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    setShowExplanations(false);
    setActiveEvidence(null);
    setSelection(null);
    setSecondsLeft(activePassage.estimatedMinutes * 60);
    setTimerRunning(false);
    audio.stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePassage.id]);

  // Countdown tick
  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, secondsLeft]);

  const passageAnnotations = useMemo(
    () => annotations.filter((a) => a.passageId === activePassage.id),
    [annotations, activePassage.id]
  );

  const answeredCount = useMemo(
    () =>
      activePassage.questions.filter((q) => (answers[q.id] || '').trim().length > 0).length,
    [activePassage.questions, answers]
  );

  const checkCorrect = (q: ReadingQuestion, userAns?: string): boolean => {
    if (!userAns) return false;
    return userAns.trim().toLowerCase() === q.answer.trim().toLowerCase();
  };

  const scoreCount = useMemo(
    () => activePassage.questions.filter((q) => checkCorrect(q, answers[q.id])).length,
    [activePassage.questions, answers]
  );

  const handleParagraphMouseUp = (paragraphId: string, paragraphText: string) => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) {
      return;
    }
    const text = sel.toString().trim();
    if (text.length < 2 || text.length > 260) {
      return;
    }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    setSelection({
      paragraphId,
      quote: text,
      sentence: extractContainingSentence(paragraphText, text),
      x: Math.min(Math.max(rect.left + rect.width / 2, 160), window.innerWidth - 180),
      y: Math.max(rect.top - 12, 80),
    });
    setIsNoteMode(false);
    setNoteDraft('');
  };

  const applyHighlight = (color: HighlightColor) => {
    if (!selection) return;
    onAddAnnotation({
      passageId: activePassage.id,
      paragraphId: selection.paragraphId,
      quote: selection.quote,
      color,
      note: noteDraft.trim() || undefined,
    });
    setSelection(null);
    setNoteDraft('');
    setIsNoteMode(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleContextualVocabLookup = async () => {
    if (!selection || lookupLoading) return;
    setLookupLoading(true);
    setLookupFeedback(null);
    try {
      let data: {
        word?: string;
        pos?: string;
        ipa?: string;
        contextualMeaning?: string;
        extendedMeaning?: string;
        synonyms?: string[];
        example?: string;
      };

      if (getStoredApiKey()) {
        data = await lookupWordContextual(
          selection.quote,
          selection.sentence,
          activePassage.title,
          activePassage.topic
        );
      } else {
        const res = await fetch('/api/lookup-word', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word: selection.quote,
            sentence: selection.sentence,
            passageTitle: activePassage.title,
            topic: activePassage.topic,
          }),
        });
        data = await res.json();
        if (!res.ok) {
          throw new Error((data as { error?: string }).error || 'Không thể phân tích từ vựng.');
        }
      }

      onAddVocab({
        word: data.word || selection.quote,
        pos: data.pos || 'phrase',
        ipa: data.ipa || '',
        contextualMeaning: data.contextualMeaning || '',
        extendedMeaning: data.extendedMeaning || '',
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        example: data.example || selection.sentence,
        topicTag: activePassage.topic,
        passageId: activePassage.id,
        passageTag: `${activePassage.sourceBook.replace('Cambridge IELTS ', 'Cam ')} · ${activePassage.testRef.split('·')[0].trim()}`,
        mastery: 25,
        attempts: 0,
      });

      onAddAnnotation({
        passageId: activePassage.id,
        paragraphId: selection.paragraphId,
        quote: selection.quote,
        color: 'mint',
        note: `Từ vựng: ${data.contextualMeaning}`,
      });

      setLookupFeedback({
        type: 'success',
        message: `Đã lưu "${data.word || selection.quote}" (${data.ipa || data.pos}) vào Sổ tay từ vựng.`,
      });
      setSelection(null);
      window.getSelection()?.removeAllRanges();
    } catch (err) {
      setLookupFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Lỗi kết nối dịch vụ tra từ AI.',
      });
    } finally {
      setLookupLoading(false);
    }
  };

  const locateEvidence = (q: ReadingQuestion) => {
    setActiveEvidence({
      questionId: q.id,
      paragraphLabel: q.explanation.paragraphLabel,
      quote: q.explanation.evidenceQuote,
    });
    const targetPara = activePassage.paragraphs.find(
      (p) => p.label.toUpperCase() === q.explanation.paragraphLabel.toUpperCase()
    );
    if (targetPara) {
      const node = paragraphRefs.current[targetPara.id];
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Render paragraph text with inline highlights + active Scanning evidence highlight
  const renderAnnotatedText = (paragraphId: string, paragraphLabel: string, text: string) => {
    type Segment = {
      start: number;
      end: number;
      type: 'evidence' | 'annotation';
      color?: HighlightColor;
      note?: string;
      annotationId?: string;
    };

    const matches: Segment[] = [];

    // 1. Active Evidence Scanning Match (highest priority)
    if (
      activeEvidence &&
      activeEvidence.paragraphLabel.toUpperCase() === paragraphLabel.toUpperCase() &&
      activeEvidence.quote
    ) {
      const idx = text.toLowerCase().indexOf(activeEvidence.quote.toLowerCase());
      if (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + activeEvidence.quote.length,
          type: 'evidence',
        });
      }
    }

    // 2. Student Highlights & Notes
    const paraAnns = passageAnnotations.filter((a) => a.paragraphId === paragraphId);
    for (const ann of paraAnns) {
      const idx = text.indexOf(ann.quote);
      if (idx !== -1) {
        matches.push({
          start: idx,
          end: idx + ann.quote.length,
          type: 'annotation',
          color: ann.color,
          note: ann.note,
          annotationId: ann.id,
        });
      }
    }

    if (matches.length === 0) return text;

    // Sort & resolve overlaps cleanly (evidence wins over highlight)
    matches.sort((a, b) => a.start - b.start || (a.type === 'evidence' ? -1 : 1));
    const resolved: Segment[] = [];
    let cursor = 0;
    for (const seg of matches) {
      if (seg.start < cursor) continue;
      resolved.push(seg);
      cursor = seg.end;
    }

    const nodes: React.ReactNode[] = [];
    let pos = 0;
    resolved.forEach((seg, i) => {
      if (seg.start > pos) {
        nodes.push(<span key={`t-${i}`}>{text.slice(pos, seg.start)}</span>);
      }
      const chunk = text.slice(seg.start, seg.end);
      if (seg.type === 'evidence') {
        nodes.push(
          <mark key={`e-${i}`} className="evidence-active text-slate-950 font-medium">
            {chunk}
          </mark>
        );
      } else {
        nodes.push(
          <mark
            key={`a-${seg.annotationId}`}
            title={seg.note ? `Ghi chú: ${seg.note}` : 'Highlight của bạn'}
            className={`${HIGHLIGHT_CLASSES[seg.color || 'yellow']} rounded-xs px-0.5 cursor-pointer`}
            onClick={() => setShowNotesPanel(true)}
          >
            {chunk}
            {seg.note && (
              <sup className="ml-0.5 text-[10px] font-mono text-teal-900 font-semibold">
                [N]
              </sup>
            )}
          </mark>
        );
      }
      pos = seg.end;
    });
    if (pos < text.length) {
      nodes.push(<span key="t-end">{text.slice(pos)}</span>);
    }
    return nodes;
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    onUploadAudio(activePassage.id, url);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-[#F8FAFC]">
      {/* Compact Workspace Control Strip */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <select
            aria-label="Chọn bài đọc IELTS"
            value={activePassage.id}
            onChange={(e) => onSelectPassage(e.target.value)}
            className="h-9 max-w-[300px] sm:max-w-[380px] truncate px-3 text-sm font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-teal-700 cursor-pointer"
          >
            {passages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sourceBook} · {p.title}
              </option>
            ))}
          </select>
          <span className="hidden xl:inline text-xs text-slate-500 whitespace-nowrap">
            {activePassage.topic} · {activePassage.bandLevel} · {activePassage.wordCount} từ
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Countdown Timer */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span
              className={`font-mono text-sm font-medium tabular-nums ${
                secondsLeft < 180 ? 'text-rose-700' : 'text-slate-800'
              }`}
            >
              {formatTimer(secondsLeft)}
            </span>
            <button
              type="button"
              onClick={() => setTimerRunning((r) => !r)}
              className="text-xs font-medium text-teal-800 hover:text-teal-950 ml-1 cursor-pointer whitespace-nowrap"
            >
              {timerRunning ? 'Tạm dừng' : 'Bắt đầu'}
            </button>
            <button
              type="button"
              aria-label="Đặt lại đồng hồ"
              onClick={() => {
                setTimerRunning(false);
                setSecondsLeft(activePassage.estimatedMinutes * 60);
              }}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {onSwitchToPreteach && (
            <button
              type="button"
              onClick={onSwitchToPreteach}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Dạy từ vựng trước khi đọc (Cạc lật font to)"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              Pre-teach
            </button>
          )}

          {onOpenExport && (
            <button
              type="button"
              onClick={onOpenExport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Xuất đề thi Word (.docx) và Slide bài giảng (.pptx)"
            >
              <Download className="w-3.5 h-3.5 text-teal-700" />
              Xuất Word/Slide
            </button>
          )}

          <button
            type="button"
            onClick={onSwitchToTeacher}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Presentation className="w-3.5 h-3.5" />
            Trình chiếu 16:9
          </button>
        </div>
      </div>

      {/* Feedback Banner for Contextual Vocab Save */}
      {lookupFeedback && (
        <div
          className={`px-6 py-2 text-xs font-medium flex items-center justify-between border-b shrink-0 ${
            lookupFeedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <span>{lookupFeedback.message}</span>
          <button
            type="button"
            onClick={() => setLookupFeedback(null)}
            className="text-current opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* MANDATORY 50/50 SPLIT-SCREEN WORKSPACE */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* LEFT PANE (50%): READING PASSAGE + SHADOWING AUDIO + HIGHLIGHT/NOTE TOOLS */}
        <section
          ref={leftPaneRef}
          aria-label="Văn bản bài đọc"
          className="h-full overflow-y-auto reading-scroll bg-white flex flex-col"
        >
          {/* Synchronized Shadowing Audio Bar */}
          <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200 px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={audio.togglePlay}
                  disabled={audio.isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 disabled:opacity-60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {audio.isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : audio.isPlaying ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  {audio.isLoading
                    ? 'Đang tạo giọng...'
                    : audio.isPlaying
                    ? 'Tạm dừng'
                    : 'Nghe Shadowing'}
                </button>

                {/* Engine Segmented Switch */}
                <div className="inline-flex items-center p-0.5 bg-slate-200/80 rounded-md text-[11px]">
                  <button
                    type="button"
                    onClick={() => audio.setEngine('browser')}
                    className={`px-2 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      audio.engine === 'browser'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tức thì
                  </button>
                  <button
                    type="button"
                    onClick={() => audio.setEngine('gemini')}
                    className={`px-2 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      audio.engine === 'gemini'
                        ? 'bg-white text-teal-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Giọng AI HD
                  </button>
                  {activePassage.audioUrl && (
                    <button
                      type="button"
                      onClick={() => audio.setEngine('custom')}
                      className={`px-2 py-1 rounded font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        audio.engine === 'custom'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Tệp MP3
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Speed Selector */}
                <select
                  aria-label="Tốc độ đọc Shadowing"
                  value={audio.playbackRate}
                  onChange={(e) => audio.setPlaybackRate(Number(e.target.value))}
                  className="h-7 px-2 text-xs font-mono bg-white border border-slate-200 rounded-md text-slate-700 cursor-pointer"
                >
                  <option value={0.75}>0.75x</option>
                  <option value={0.9}>0.9x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.15}>1.15x</option>
                  <option value={1.25}>1.25x</option>
                </select>

                {/* Loop Paragraph Toggle */}
                <button
                  type="button"
                  onClick={() => audio.setLoopParagraph((l) => !l)}
                  title="Lặp lại đoạn đang nghe để luyện Shadowing"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                    audio.loopParagraph
                      ? 'bg-teal-50 border-teal-700 text-teal-900'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Lặp đoạn
                </button>

                {/* Upload Custom MP3/WAV */}
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  title="Gắn tệp Audio MP3/WAV cho bài đọc này"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-white border border-slate-200 text-slate-600 hover:text-slate-900 whitespace-nowrap cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Gắn Audio
                </button>

                {/* Toggle Notes & Highlights Drawer */}
                <button
                  type="button"
                  onClick={() => setShowNotesPanel((s) => !s)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap cursor-pointer ${
                    showNotesPanel
                      ? 'bg-slate-900 border-slate-900 text-white'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Highlighter className="w-3.5 h-3.5" />
                  <span className="font-mono tabular-nums">{passageAnnotations.length}</span>
                </button>
              </div>
            </div>

            {audio.engine === 'custom' && activePassage.audioUrl && (
              <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-600">
                <Headphones className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={audio.customDuration || 100}
                  value={audio.customProgress}
                  onChange={(e) => audio.seekCustomAudio(Number(e.target.value))}
                  aria-label="Thanh tiến trình Audio"
                  className="flex-1 accent-teal-700 cursor-pointer"
                />
                <span className="font-mono tabular-nums">
                  {formatTimer(Math.floor(audio.customProgress))} /{' '}
                  {formatTimer(Math.floor(audio.customDuration))}
                </span>
              </div>
            )}

            {audio.error && (
              <div className="mt-2 text-xs text-rose-700 flex items-center justify-between">
                <span>{audio.error}</span>
                <button
                  type="button"
                  onClick={audio.clearError}
                  className="underline ml-2 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Highlights & Notes Review Panel */}
          {showNotesPanel && (
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-slate-800">
                  Highlight & Ghi chú của bạn ({passageAnnotations.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNotesPanel(false)}
                  className="text-xs text-slate-500 hover:text-slate-900 cursor-pointer"
                >
                  Thu gọn
                </button>
              </div>
              {passageAnnotations.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Bôi đen bất kỳ từ hoặc câu nào trong bài đọc để Highlight, thêm Ghi chú hoặc lưu trực tiếp vào Sổ tay từ vựng.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-48 overflow-y-auto reading-scroll pr-1">
                  {passageAnnotations.map((ann) => (
                    <div
                      key={ann.id}
                      className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`${HIGHLIGHT_CLASSES[ann.color]} px-1.5 py-0.5 rounded font-medium`}>
                          “{ann.quote}”
                        </span>
                        <button
                          type="button"
                          aria-label="Xóa ghi chú"
                          onClick={() => onDeleteAnnotation(ann.id)}
                          className="text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={ann.note || ''}
                        onChange={(e) => onUpdateAnnotationNote(ann.id, e.target.value)}
                        placeholder="Thêm ghi chú phân tích ngữ cảnh hoặc Paraphrase..."
                        className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-teal-700"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reading Passage Editorial Content */}
          <article className="px-6 sm:px-10 py-8 max-w-3xl">
            <div className="text-xs text-slate-500 mb-2">
              <span className="font-medium text-teal-800">{activePassage.sourceBook}</span>
              <span className="mx-2">·</span>
              <span>{activePassage.testRef}</span>
              <span className="mx-2">·</span>
              <span>Bôi đen văn bản để Highlight / Tra từ AI</span>
            </div>

            <h1 className="font-editorial text-2xl sm:text-3xl font-semibold text-slate-900 leading-snug">
              {activePassage.title}
            </h1>
            <p className="mt-2 text-sm text-slate-600 italic leading-relaxed pb-6 border-b border-slate-200">
              {activePassage.subtitle}
            </p>

            <div className="mt-6 space-y-6">
              {activePassage.paragraphs.map((para) => {
                const isSpeaking = audio.activeParagraphId === para.id && (audio.isPlaying || audio.isLoading);
                return (
                  <div
                    key={para.id}
                    ref={(el) => {
                      paragraphRefs.current[para.id] = el;
                    }}
                    className={`group rounded-lg p-3 -mx-3 transition-colors ${
                      isSpeaking ? 'bg-teal-50/70 ring-1 ring-teal-200' : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-semibold text-teal-800">
                        Đoạn {para.label}
                      </span>
                      <button
                        type="button"
                        onClick={() => audio.playParagraph(para.id)}
                        className={`inline-flex items-center gap-1 text-xs font-medium transition-opacity cursor-pointer ${
                          isSpeaking
                            ? 'text-teal-800 opacity-100'
                            : 'text-slate-500 hover:text-teal-800 opacity-0 group-hover:opacity-100 focus:opacity-100'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        {isSpeaking ? 'Đang phát đoạn này' : `Nghe đoạn ${para.label}`}
                      </button>
                    </div>
                    <p
                      onMouseUp={() => handleParagraphMouseUp(para.id, para.text)}
                      className="text-[15.5px] leading-[1.82] text-slate-800 select-text"
                    >
                      {renderAnnotatedText(para.id, para.label, para.text)}
                    </p>
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        {/* RIGHT PANE (50%): QUESTIONS + PEDAGOGICAL EXPLANATIONS */}
        <section
          aria-label="Câu hỏi và giải thích sư phạm"
          className="h-full overflow-y-auto reading-scroll bg-[#F8FAFC] flex flex-col"
        >
          <div className="p-6 sm:p-8 flex-1 space-y-6">
            {/* Score Summary Banner after Submission */}
            {submitted && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-teal-800">Kết quả bài làm</p>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                      {scoreCount}/{activePassage.questions.length} câu đúng
                    </span>
                    <span className="text-sm font-medium text-slate-600">
                      Ước tính: {estimateBand(scoreCount, activePassage.questions.length)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Nhấn “Định vị trong bài” ở từng câu để xem dẫn chứng Scanning và bảng Paraphrasing.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                    setShowExplanations(false);
                    setActiveEvidence(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Làm lại bài này
                </button>
              </div>
            )}

            {/* Question List */}
            <div className="space-y-5">
              {activePassage.questions.map((q, idx) => {
                const prevInstruction =
                  idx > 0 ? activePassage.questions[idx - 1].instruction : null;
                const showGroupHeader = q.instruction !== prevInstruction;
                const userAnswer = answers[q.id] || '';
                const isCorrect = checkCorrect(q, userAnswer);
                const revealExplanation = submitted || showExplanations;

                return (
                  <div key={q.id} className="space-y-3">
                    {showGroupHeader && (
                      <div className="pt-2 pb-1 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-800">
                          {q.instruction}
                        </p>
                      </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-xs font-semibold text-slate-500 pt-0.5 tabular-nums shrink-0">
                            Q{q.number}.
                          </span>
                          <p className="text-sm font-medium text-slate-900 leading-relaxed">
                            {q.prompt}
                          </p>
                        </div>

                        {submitted && (
                          <div className="shrink-0 flex items-center gap-1 text-xs font-semibold">
                            {isCorrect ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700">
                                <CheckCircle2 className="w-4 h-4" />
                                Đúng
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-700">
                                <XCircle className="w-4 h-4" />
                                Sai
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Question Controls by Type */}
                      <div className="mt-4 pl-7">
                        {(q.type === 'TFNG' || q.type === 'YNNG' || q.type === 'MATCHING') && (
                          <div className="flex flex-wrap gap-2">
                            {q.options.map((opt) => {
                              const selected = userAnswer === opt;
                              const isAnswer = opt === q.answer;
                              let btnClass =
                                'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-400';
                              if (submitted) {
                                if (isAnswer) {
                                  btnClass =
                                    'bg-emerald-50 border-emerald-600 text-emerald-900 font-semibold';
                                } else if (selected && !isAnswer) {
                                  btnClass =
                                    'bg-rose-50 border-rose-500 text-rose-900 font-semibold';
                                }
                              } else if (selected) {
                                btnClass =
                                  'bg-teal-800 border-teal-800 text-white font-semibold';
                              }
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={submitted}
                                  onClick={() =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: opt }))
                                  }
                                  className={`px-3.5 py-1.5 text-xs font-mono rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${btnClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'MCQ' && (
                          <div className="space-y-2">
                            {q.options.map((opt) => {
                              const letter = opt.trim().charAt(0).toUpperCase();
                              const selected = userAnswer === letter;
                              const isAnswer = letter === q.answer.toUpperCase();
                              let rowClass =
                                'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300';
                              if (submitted) {
                                if (isAnswer) {
                                  rowClass =
                                    'bg-emerald-50 border-emerald-600 text-emerald-950 font-medium';
                                } else if (selected && !isAnswer) {
                                  rowClass = 'bg-rose-50 border-rose-500 text-rose-950';
                                }
                              } else if (selected) {
                                rowClass =
                                  'bg-teal-50 border-teal-700 text-teal-950 font-medium';
                              }
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  disabled={submitted}
                                  onClick={() =>
                                    setAnswers((prev) => ({ ...prev, [q.id]: letter }))
                                  }
                                  className={`w-full text-left px-3.5 py-2.5 text-sm rounded-lg border transition-colors cursor-pointer disabled:cursor-default ${rowClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {q.type === 'FILL_BLANK' && (
                          <div className="flex flex-wrap items-center gap-3">
                            <input
                              type="text"
                              disabled={submitted}
                              value={userAnswer}
                              onChange={(e) =>
                                setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              }
                              placeholder="Nhập đáp án chính xác từ bài đọc..."
                              className={`h-9 w-64 px-3 text-sm rounded-lg border bg-white focus:outline-none ${
                                submitted
                                  ? isCorrect
                                    ? 'border-emerald-600 text-emerald-900 bg-emerald-50'
                                    : 'border-rose-500 text-rose-900 bg-rose-50'
                                  : 'border-slate-300 focus:border-teal-700'
                              }`}
                            />
                            {submitted && !isCorrect && (
                              <span className="text-xs font-medium text-emerald-800">
                                Đáp án đúng:{' '}
                                <strong className="font-mono">{q.answer}</strong>
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* PEDAGOGICAL EXPLANATION BLOCK (Scanning + Paraphrasing + Distractor Logic) */}
                      {revealExplanation && (
                        <div className="mt-5 pt-4 border-t border-slate-200 pl-7 space-y-3 text-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-slate-700">
                              <span className="font-semibold text-slate-900">
                                Đáp án: {q.answer}
                              </span>
                              <span className="mx-2 text-slate-300">·</span>
                              <span className="font-medium text-teal-800">
                                Scanning: {q.explanation.scanningLocation}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => locateEvidence(q)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-teal-900 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
                            >
                              <Crosshair className="w-3.5 h-3.5" />
                              Định vị trong bài
                            </button>
                          </div>

                          {/* Paraphrasing Table */}
                          {q.explanation.paraphrasing.length > 0 && (
                            <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden">
                              <div className="grid grid-cols-2 bg-slate-100/80 px-3 py-1.5 font-semibold text-slate-600">
                                <span>Từ khóa trong câu hỏi</span>
                                <span>Paraphrase trong bài đọc</span>
                              </div>
                              <div className="divide-y divide-slate-200">
                                {q.explanation.paraphrasing.map((pair, pIdx) => (
                                  <div
                                    key={pIdx}
                                    className="grid grid-cols-2 px-3 py-1.5 gap-3 text-slate-800"
                                  >
                                    <span>{pair.questionTerm}</span>
                                    <span className="font-medium text-teal-900">
                                      {pair.passageTerm}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Distractor Elimination */}
                          <p className="text-slate-600 leading-relaxed">
                            <strong className="text-slate-800">Tư duy loại trừ: </strong>
                            {q.explanation.distractorAnalysis}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Bottom Exam Submit Bar */}
          <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
            <div className="text-xs text-slate-600 font-mono tabular-nums">
              Đã trả lời: <strong className="text-slate-900">{answeredCount}</strong>/
              {activePassage.questions.length}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowExplanations((s) => !s)}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                {showExplanations ? (
                  <>
                    Ẩn giải thích <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Giải thích sư phạm <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              {!submitted && (
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(true);
                    setShowExplanations(true);
                    setTimerRunning(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-800 hover:bg-teal-900 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Nộp bài & Chấm điểm
                </button>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* FLOATING SELECTION TOOLBAR (Highlight / Add Note / Smart Vocab Lookup) */}
      {selection && (
        <div
          style={{
            left: `${selection.x}px`,
            top: `${selection.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="fixed z-40 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 p-2.5 flex flex-col gap-2 min-w-[270px]"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {HIGHLIGHT_SWATCHES.map((swatch) => (
                <button
                  key={swatch.color}
                  type="button"
                  title={`Highlight màu ${swatch.label}`}
                  onClick={() => applyHighlight(swatch.color)}
                  className={`w-5 h-5 rounded-full ${swatch.bg} border border-white/40 hover:scale-110 transition-transform cursor-pointer`}
                />
              ))}
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <button
              type="button"
              onClick={() => setIsNoteMode((v) => !v)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-md whitespace-nowrap cursor-pointer"
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              Ghi chú
            </button>

            <button
              type="button"
              disabled={lookupLoading}
              onClick={handleContextualVocabLookup}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-teal-700 hover:bg-teal-600 text-white rounded-md whitespace-nowrap cursor-pointer disabled:opacity-60"
            >
              {lookupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" />
              )}
              Lưu từ vựng
            </button>

            <button
              type="button"
              aria-label="Đóng thanh chọn"
              onClick={() => setSelection(null)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {isNoteMode && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800">
              <input
                type="text"
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') applyHighlight('yellow');
                }}
                placeholder="Nhập ghi chú học thuật..."
                className="flex-1 bg-slate-800 text-xs text-white placeholder:text-slate-400 px-2.5 py-1.5 rounded-md border border-slate-700 focus:outline-none focus:border-teal-500"
              />
              <button
                type="button"
                onClick={() => applyHighlight('yellow')}
                className="px-2.5 py-1.5 text-xs font-medium bg-amber-400 text-slate-950 rounded-md hover:bg-amber-300 cursor-pointer"
              >
                Lưu
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
