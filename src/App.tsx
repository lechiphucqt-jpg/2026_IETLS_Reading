import { useEffect, useState } from 'react';
import { INITIAL_PASSAGES, INITIAL_VOCAB } from './data/seedData';
import { AppView, ReadingPassage, TextAnnotation, VocabEntry } from './types/ielts';
import { TopNav } from './components/TopNav';
import { LibraryView } from './components/LibraryView';
import { StudentWorkspace } from './components/StudentWorkspace';
import { VocabularyStudio } from './components/VocabularyStudio';
import { TeacherStage } from './components/TeacherStage';
import { DigitizeModal } from './components/DigitizeModal';
import { PreteachVocabularyView } from './components/PreteachVocabularyView';
import { ApiKeyModal } from './components/ApiKeyModal';
import { ExportModal } from './components/ExportModal';
import { getStoredApiKey } from './utils/geminiClient';

const STORAGE_KEYS = {
  passages: 'lexiband_passages_v1',
  vocab: 'lexiband_vocab_v1',
  annotations: 'lexiband_annotations_v1',
};

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('library');
  const [passages, setPassages] = useState<ReadingPassage[]>(() =>
    loadFromStorage(STORAGE_KEYS.passages, INITIAL_PASSAGES)
  );
  const [vocab, setVocab] = useState<VocabEntry[]>(() =>
    loadFromStorage(STORAGE_KEYS.vocab, INITIAL_VOCAB)
  );
  const [annotations, setAnnotations] = useState<TextAnnotation[]>(() =>
    loadFromStorage(STORAGE_KEYS.annotations, [])
  );
  const [activePassageId, setActivePassageId] = useState<string>(
    passages[0]?.id || INITIAL_PASSAGES[0].id
  );

  // Modals state
  const [digitizeModal, setDigitizeModal] = useState<{
    open: boolean;
    tab: 'pdf' | 'passage' | 'vocab';
  }>({ open: false, tab: 'pdf' });

  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [exportModal, setExportModal] = useState<{
    open: boolean;
    passageId: string;
  }>({ open: false, passageId: '' });

  // Prompt user for API key on first startup if not already stored
  useEffect(() => {
    const key = getStoredApiKey();
    if (!key) {
      setApiKeyModalOpen(true);
    }
  }, []);

  // Persist user data locally (excluding ephemeral blob audioUrls)
  useEffect(() => {
    try {
      const serializable = passages.map((p) =>
        p.audioUrl?.startsWith('blob:') ? { ...p, audioUrl: undefined } : p
      );
      window.localStorage.setItem(STORAGE_KEYS.passages, JSON.stringify(serializable));
    } catch {
      // Ignore quota errors
    }
  }, [passages]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.vocab, JSON.stringify(vocab));
    } catch {
      // Ignore quota errors
    }
  }, [vocab]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.annotations, JSON.stringify(annotations));
    } catch {
      // Ignore quota errors
    }
  }, [annotations]);

  const activePassage =
    passages.find((p) => p.id === activePassageId) || passages[0] || INITIAL_PASSAGES[0];

  const exportPassage =
    passages.find((p) => p.id === exportModal.passageId) || activePassage;

  const handleAddAnnotation = (item: Omit<TextAnnotation, 'id' | 'createdAt'>) => {
    setAnnotations((prev) => [
      {
        ...item,
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
  };

  const handleUpdateAnnotationNote = (id: string, note: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, note } : a)));
  };

  const handleDeleteAnnotation = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddVocab = (entry: Omit<VocabEntry, 'id'>) => {
    setVocab((prev) => {
      const exists = prev.some(
        (v) =>
          v.word.toLowerCase() === entry.word.toLowerCase() &&
          v.passageId === entry.passageId
      );
      if (exists) return prev;
      return [
        {
          ...entry,
          id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
        ...prev,
      ];
    });
  };

  const handleUpdateMastery = (id: string, delta: number) => {
    setVocab((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const nextMastery = Math.max(5, Math.min(100, v.mastery + delta));
        return {
          ...v,
          mastery: nextMastery,
          attempts: v.attempts + 1,
          lastReviewedAt: Date.now(),
        };
      })
    );
  };

  const handleDeleteVocab = (id: string) => {
    setVocab((prev) => prev.filter((v) => v.id !== id));
  };

  const handleUploadAudio = (passageId: string, objectUrl: string) => {
    setPassages((prev) =>
      prev.map((p) => (p.id === passageId ? { ...p, audioUrl: objectUrl } : p))
    );
  };

  const handlePassageCreated = (
    passage: ReadingPassage,
    extractedVocab: Omit<VocabEntry, 'id'>[]
  ) => {
    setPassages((prev) => [passage, ...prev]);
    if (extractedVocab.length > 0) {
      setVocab((prev) => [
        ...extractedVocab.map((v, idx) => ({
          ...v,
          id: `v-${Date.now()}-${idx}`,
        })),
        ...prev,
      ]);
    }
    setActivePassageId(passage.id);
    // After creating, route straight to Pre-teach vocabulary view so user learns key words first!
    setActiveView('preteach');
  };

  const handleVocabBatchCreated = (items: Omit<VocabEntry, 'id'>[]) => {
    if (items.length === 0) return;
    setVocab((prev) => [
      ...items.map((v, idx) => ({
        ...v,
        id: `v-${Date.now()}-${idx}`,
      })),
      ...prev,
    ]);
    setActiveView('vocabulary');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased">
      {/* Top Navigation Bar with Settings (API Key) & Digitize buttons */}
      <TopNav
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenDigitize={() => setDigitizeModal({ open: true, tab: 'pdf' })}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
      />

      {/* VIEW 1: Library View */}
      {activeView === 'library' && (
        <LibraryView
          passages={passages}
          vocab={vocab}
          onStartStudent={(id) => {
            setActivePassageId(id);
            setActiveView('student');
          }}
          onStartTeacher={(id) => {
            setActivePassageId(id);
            setActiveView('teacher');
          }}
          onStartPreteach={(id) => {
            setActivePassageId(id);
            setActiveView('preteach');
          }}
          onOpenExport={(id) => {
            setExportModal({ open: true, passageId: id });
          }}
          onOpenDigitize={() => setDigitizeModal({ open: true, tab: 'pdf' })}
          onNavigateVocab={() => setActiveView('vocabulary')}
        />
      )}

      {/* VIEW 2: Pre-teach Vocabulary Studio (Large Flip Card with Example Sentences) */}
      {activeView === 'preteach' && activePassage && (
        <PreteachVocabularyView
          passages={passages}
          activePassage={activePassage}
          onSelectPassage={setActivePassageId}
          vocab={vocab}
          onUpdateMastery={handleUpdateMastery}
          onStartStudent={(id) => {
            setActivePassageId(id);
            setActiveView('student');
          }}
          onStartTeacher={(id) => {
            setActivePassageId(id);
            setActiveView('teacher');
          }}
        />
      )}

      {/* VIEW 3: Student 50/50 Workspace */}
      {activeView === 'student' && activePassage && (
        <StudentWorkspace
          passages={passages}
          activePassage={activePassage}
          onSelectPassage={setActivePassageId}
          annotations={annotations}
          onAddAnnotation={handleAddAnnotation}
          onUpdateAnnotationNote={handleUpdateAnnotationNote}
          onDeleteAnnotation={handleDeleteAnnotation}
          onAddVocab={handleAddVocab}
          onUploadAudio={handleUploadAudio}
          onSwitchToTeacher={() => setActiveView('teacher')}
          onSwitchToPreteach={() => setActiveView('preteach')}
          onOpenExport={() => setExportModal({ open: true, passageId: activePassage.id })}
        />
      )}

      {/* VIEW 4: Vocabulary Notebook & Practice Studio */}
      {activeView === 'vocabulary' && (
        <VocabularyStudio
          vocab={vocab}
          onUpdateMastery={handleUpdateMastery}
          onDeleteVocab={handleDeleteVocab}
          onOpenImportVocab={() => setDigitizeModal({ open: true, tab: 'vocab' })}
        />
      )}

      {/* VIEW 5: Teacher 16:9 Presentation Stage */}
      {activeView === 'teacher' && activePassage && (
        <TeacherStage
          passages={passages}
          activePassage={activePassage}
          onSelectPassage={setActivePassageId}
          onExitToStudent={() => setActiveView('student')}
        />
      )}

      {/* Digitize Modal (supports PDF, Raw Text, Vocab Batch) */}
      <DigitizeModal
        isOpen={digitizeModal.open}
        initialTab={digitizeModal.tab}
        onClose={() => setDigitizeModal((prev) => ({ ...prev, open: false }))}
        onPassageCreated={handlePassageCreated}
        onVocabBatchCreated={handleVocabBatchCreated}
        onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
      />

      {/* ApiKey Modal (compliant with AI_INSTRUCTIONS.md) */}
      <ApiKeyModal
        isOpen={apiKeyModalOpen}
        onClose={() => setApiKeyModalOpen(false)}
      />

      {/* Document & Slides Export Modal (.docx & .pptx) */}
      <ExportModal
        isOpen={exportModal.open}
        onClose={() => setExportModal({ open: false, passageId: '' })}
        passage={exportPassage}
        vocab={vocab}
      />
    </div>
  );
}
