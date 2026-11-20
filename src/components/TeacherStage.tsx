import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  Highlighter,
  Maximize2,
  Minimize2,
  MousePointer2,
  PenTool,
  Sparkles,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { ReadingPassage } from '../types/ielts';

interface TeacherStageProps {
  passages: ReadingPassage[];
  activePassage: ReadingPassage;
  onSelectPassage: (passageId: string) => void;
  onExitToStudent: () => void;
}

type AnnotationTool = 'cursor' | 'pen' | 'highlighter' | 'spotlight';
type SlideMode = 'split' | 'passage' | 'question';

interface Stroke {
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  points: { x: number; y: number }[];
}

const PEN_COLORS = [
  { label: 'Đỏ chấm bài', hex: '#DC2626' },
  { label: 'Xanh dương', hex: '#0284C7' },
  { label: 'Xanh ngọc', hex: '#0F766E' },
  { label: 'Vàng nổi bật', hex: '#D97706' },
];

export function TeacherStage({
  passages,
  activePassage,
  onSelectPassage,
  onExitToStudent,
}: TeacherStageProps) {
  const [slideMode, setSlideMode] = useState<SlideMode>('split');
  const [fontSizePx, setFontSizePx] = useState<number>(22);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [revealEvidence, setRevealEvidence] = useState<boolean>(false);
  const [revealAnswer, setRevealAnswer] = useState<boolean>(false);

  // Annotation Canvas state
  const [tool, setTool] = useState<AnnotationTool>('cursor');
  const [penColor, setPenColor] = useState<string>('#DC2626');
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [spotlightPos, setSpotlightPos] = useState<{ x: number; y: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const stageContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentStrokeRef = useRef<Stroke | null>(null);

  const activeQuestion = activePassage.questions[activeQuestionIdx] || activePassage.questions[0];

  // Reset question index & canvas when switching passage
  useEffect(() => {
    setActiveQuestionIdx(0);
    setRevealEvidence(false);
    setRevealAnswer(false);
    setStrokes([]);
  }, [activePassage.id]);

  // Keep canvas crisp & synced to 16:9 stage dimensions
  useEffect(() => {
    const redraw = () => {
      const canvas = canvasRef.current;
      const container = stageContainerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, rect.width, rect.height);

      const allStrokes = currentStrokeRef.current
        ? [...strokes, currentStrokeRef.current]
        : strokes;

      for (const stroke of allStrokes) {
        if (stroke.points.length < 2) continue;
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.globalAlpha = stroke.tool === 'highlighter' ? 0.32 : 0.92;
        ctx.moveTo(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height);
        for (let i = 1; i < stroke.points.length; i++) {
          ctx.lineTo(stroke.points[i].x * rect.width, stroke.points[i].y * rect.height);
        }
        ctx.stroke();
      }
      ctx.restore();
    };

    redraw();
    window.addEventListener('resize', redraw);
    return () => window.removeEventListener('resize', redraw);
  }, [strokes, isDrawing, isFullscreen, slideMode]);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!stageContainerRef.current) return;
    if (!document.fullscreenElement) {
      await stageContainerRef.current.requestFullscreen?.().catch(() => {});
    } else {
      await document.exitFullscreen?.().catch(() => {});
    }
  };

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== 'pen' && tool !== 'highlighter') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormalizedPoint(e);
    currentStrokeRef.current = {
      tool,
      color: tool === 'highlighter' ? '#FACC15' : penColor,
      width: tool === 'highlighter' ? 22 : 3.5,
      points: [pt],
    };
    setIsDrawing(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === 'spotlight') {
      const rect = e.currentTarget.getBoundingClientRect();
      setSpotlightPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      return;
    }

    if (!isDrawing || !currentStrokeRef.current) return;
    const pt = getNormalizedPoint(e);
    currentStrokeRef.current.points.push(pt);
    // Trigger immediate repaint
    const canvas = canvasRef.current;
    const container = stageContainerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pts = currentStrokeRef.current.points;
    if (pts.length >= 2) {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = currentStrokeRef.current.color;
      ctx.lineWidth = currentStrokeRef.current.width;
      ctx.globalAlpha = currentStrokeRef.current.tool === 'highlighter' ? 0.32 : 0.92;
      const p1 = pts[pts.length - 2];
      const p2 = pts[pts.length - 1];
      ctx.moveTo(p1.x * rect.width, p1.y * rect.height);
      ctx.lineTo(p2.x * rect.width, p2.y * rect.height);
      ctx.stroke();
      ctx.restore();
    }
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentStrokeRef.current) return;
    const finished = currentStrokeRef.current;
    currentStrokeRef.current = null;
    setIsDrawing(false);
    if (finished.points.length > 1) {
      setStrokes((prev) => [...prev, finished]);
    }
  };

  const renderSlideParagraph = (label: string, text: string) => {
    if (
      !revealEvidence ||
      !activeQuestion ||
      activeQuestion.explanation.paragraphLabel.toUpperCase() !== label.toUpperCase()
    ) {
      return text;
    }

    const quote = activeQuestion.explanation.evidenceQuote;
    const idx = text.toLowerCase().indexOf(quote.toLowerCase());
    if (idx === -1) return text;

    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-teal-200/80 text-slate-950 rounded px-1 font-medium">
          {text.slice(idx, idx + quote.length)}
        </mark>
        {text.slice(idx + quote.length)}
      </>
    );
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-slate-900 px-4 sm:px-8 py-6 flex flex-col items-center justify-center">
      {/* Minimalist Top Bar above 16:9 Stage */}
      <div className="w-full max-w-[1280px] mb-3 flex flex-wrap items-center justify-between gap-3 text-slate-200">
        <div className="flex items-center gap-3">
          <select
            aria-label="Chọn bài giảng trình chiếu"
            value={activePassage.id}
            onChange={(e) => onSelectPassage(e.target.value)}
            className="h-9 max-w-[340px] truncate px-3 text-xs font-medium bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            {passages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sourceBook} · {p.title}
              </option>
            ))}
          </select>

          <div className="inline-flex items-center p-0.5 bg-slate-800 rounded-lg text-xs">
            {(
              [
                { id: 'split', label: 'Song song' },
                { id: 'passage', label: 'Toàn văn' },
                { id: 'question', label: 'Câu hỏi' },
              ] as { id: SlideMode; label: string }[]
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSlideMode(m.id)}
                className={`px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  slideMode === m.id
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg border border-slate-700 cursor-pointer whitespace-nowrap"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" /> Thoát toàn màn hình
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Toàn màn hình 16:9
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onExitToStudent}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 rounded-lg cursor-pointer whitespace-nowrap"
          >
            Về chế độ Học viên
          </button>
        </div>
      </div>

      {/* 16:9 CLASSROOM PROJECTION STAGE */}
      <div
        ref={stageContainerRef}
        className={`relative w-full max-w-[1280px] aspect-video bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col ${
          isFullscreen ? 'max-w-none h-screen rounded-none border-0' : ''
        }`}
      >
        {/* Slide Content Layer */}
        <div
          className={`flex-1 min-h-0 grid ${
            slideMode === 'split' ? 'grid-cols-12 divide-x divide-slate-200' : 'grid-cols-1'
          }`}
        >
          {/* Passage Projection Column */}
          {(slideMode === 'split' || slideMode === 'passage') && (
            <div
              className={`${
                slideMode === 'split' ? 'col-span-7' : 'col-span-1'
              } h-full overflow-y-auto reading-scroll px-8 py-7 pb-24`}
            >
              <div className="text-xs font-medium text-teal-800 mb-1.5">
                {activePassage.sourceBook} · {activePassage.testRef} · {activePassage.topic}
              </div>
              <h1
                className="font-editorial font-semibold text-slate-900 leading-tight mb-5"
                style={{ fontSize: `${Math.min(fontSizePx + 8, 36)}px` }}
              >
                {activePassage.title}
              </h1>

              <div className="space-y-5">
                {activePassage.paragraphs.map((para) => {
                  const isTargetPara =
                    revealEvidence &&
                    activeQuestion?.explanation.paragraphLabel.toUpperCase() ===
                      para.label.toUpperCase();
                  return (
                    <div
                      key={para.id}
                      className={`rounded-lg p-3 -mx-3 transition-colors ${
                        isTargetPara ? 'bg-teal-50/70' : ''
                      }`}
                    >
                      <span className="font-mono text-sm font-semibold text-teal-800 mr-2.5">
                        [{para.label}]
                      </span>
                      <span
                        className="text-slate-800 leading-relaxed"
                        style={{ fontSize: `${fontSizePx}px`, lineHeight: 1.68 }}
                      >
                        {renderSlideParagraph(para.label, para.text)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Question & Lecture Analysis Column */}
          {(slideMode === 'split' || slideMode === 'question') && activeQuestion && (
            <div
              className={`${
                slideMode === 'split' ? 'col-span-5' : 'col-span-1 max-w-4xl mx-auto w-full'
              } h-full overflow-y-auto reading-scroll bg-slate-50 px-7 py-7 pb-24 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-200">
                  <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                    Câu hỏi {activeQuestion.number} / {activePassage.questions.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Câu hỏi trước"
                      disabled={activeQuestionIdx === 0}
                      onClick={() => {
                        setActiveQuestionIdx((i) => Math.max(0, i - 1));
                        setRevealAnswer(false);
                      }}
                      className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Câu hỏi tiếp theo"
                      disabled={activeQuestionIdx === activePassage.questions.length - 1}
                      onClick={() => {
                        setActiveQuestionIdx((i) =>
                          Math.min(activePassage.questions.length - 1, i + 1)
                        );
                        setRevealAnswer(false);
                      }}
                      className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-xs font-medium text-slate-500">
                  {activeQuestion.instruction}
                </p>

                <p
                  className="mt-3 font-semibold text-slate-900 leading-snug"
                  style={{ fontSize: `${Math.max(fontSizePx - 1, 18)}px` }}
                >
                  {activeQuestion.prompt}
                </p>

                {activeQuestion.options.length > 0 && (
                  <div className="mt-5 space-y-2.5">
                    {activeQuestion.options.map((opt) => {
                      const matches =
                        revealAnswer &&
                        (opt === activeQuestion.answer ||
                          opt.trim().charAt(0).toUpperCase() ===
                            activeQuestion.answer.toUpperCase());
                      return (
                        <div
                          key={opt}
                          className={`px-4 py-3 rounded-lg border transition-colors ${
                            matches
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-semibold'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                          style={{ fontSize: `${Math.max(fontSizePx - 4, 15)}px` }}
                        >
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Revealed Pedagogical Analysis for Classroom Discussion */}
                {revealAnswer && (
                  <div className="mt-6 bg-white border border-slate-200 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-emerald-800">
                        Đáp án chuẩn: {activeQuestion.answer}
                      </span>
                      <span className="font-mono text-xs text-teal-800">
                        {activeQuestion.explanation.scanningLocation}
                      </span>
                    </div>

                    {activeQuestion.explanation.paraphrasing.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-600">
                          Paraphrasing trọng tâm:
                        </p>
                        {activeQuestion.explanation.paraphrasing.map((pair, idx) => (
                          <div
                            key={idx}
                            className="text-sm text-slate-800 flex flex-wrap items-center gap-1.5"
                          >
                            <span>{pair.questionTerm}</span>
                            <span className="text-teal-700 font-mono">→</span>
                            <strong className="text-teal-900">{pair.passageTerm}</strong>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-slate-600 leading-relaxed pt-2 border-t border-slate-100">
                      <strong className="text-slate-800">Phân tích loại trừ: </strong>
                      {activeQuestion.explanation.distractorAnalysis}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Interactive Drawing & Spotlight Overlay */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => {
            if (tool === 'spotlight') setSpotlightPos(null);
            if (isDrawing) handlePointerUp();
          }}
          className={`absolute inset-0 w-full h-full z-20 ${
            tool === 'cursor'
              ? 'pointer-events-none'
              : tool === 'spotlight'
              ? 'cursor-none'
              : 'cursor-crosshair'
          }`}
        />

        {/* Spotlight Focus Mask */}
        {tool === 'spotlight' && spotlightPos && (
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: `radial-gradient(circle 125px at ${spotlightPos.x}px ${spotlightPos.y}px, transparent 0%, rgba(15, 23, 42, 0.56) 100%)`,
            }}
          />
        )}

        {/* Minimalist Floating Classroom Annotation Toolbar (Bottom Center) */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900/95 backdrop-blur text-white px-3 py-2 rounded-xl border border-slate-700 shadow-xl flex items-center gap-2 max-w-[95%] overflow-x-auto">
          {/* Drawing Tool Switcher */}
          <button
            type="button"
            onClick={() => setTool('cursor')}
            title="Chế độ con trỏ (Cuộn trang)"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              tool === 'cursor' ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            Cuộn
          </button>

          <button
            type="button"
            onClick={() => setTool('pen')}
            title="Bút vẽ giảng bài"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              tool === 'pen' ? 'bg-teal-700 text-white' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            Bút vẽ
          </button>

          <button
            type="button"
            onClick={() => setTool('highlighter')}
            title="Bút dạ quang đánh dấu từ khóa"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              tool === 'highlighter'
                ? 'bg-teal-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            Dạ quang
          </button>

          <button
            type="button"
            onClick={() => setTool('spotlight')}
            title="Đèn chiếu tập trung câu văn"
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              tool === 'spotlight'
                ? 'bg-teal-700 text-white'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Đèn chiếu
          </button>

          {/* Pen Color Dots (shown when pen active) */}
          {tool === 'pen' && (
            <div className="flex items-center gap-1.5 pl-1 border-l border-slate-700">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.label}
                  onClick={() => setPenColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                    penColor === c.hex ? 'ring-2 ring-white scale-110' : 'opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Undo & Clear Canvas */}
          <button
            type="button"
            onClick={() => setStrokes((prev) => prev.slice(0, -1))}
            disabled={strokes.length === 0}
            title="Hoàn tác nét vẽ"
            className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-35 cursor-pointer"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setStrokes([])}
            disabled={strokes.length === 0}
            title="Xóa toàn bộ nét vẽ"
            className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg disabled:opacity-35 cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Enlarged Font Controls */}
          <button
            type="button"
            aria-label="Giảm cỡ chữ"
            onClick={() => setFontSizePx((s) => Math.max(16, s - 2))}
            className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-xs text-slate-300 tabular-nums w-8 text-center">
            {fontSizePx}
          </span>
          <button
            type="button"
            aria-label="Tăng cỡ chữ"
            onClick={() => setFontSizePx((s) => Math.min(32, s + 2))}
            className="p-1.5 text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Pedagogical Reveal Switches */}
          <button
            type="button"
            onClick={() => setRevealEvidence((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              revealEvidence
                ? 'bg-amber-400 text-slate-950 font-semibold'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            {revealEvidence ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Scanning
          </button>
          <button
            type="button"
            onClick={() => {
              setRevealAnswer((v) => !v);
              if (!revealAnswer) setRevealEvidence(true);
            }}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer ${
              revealAnswer
                ? 'bg-emerald-500 text-slate-950 font-semibold'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            Đáp án
          </button>
        </div>
      </div>
    </main>
  );
}
