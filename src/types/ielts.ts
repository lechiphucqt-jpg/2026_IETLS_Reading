export type AppView = 'library' | 'student' | 'vocabulary' | 'teacher' | 'preteach';

export type QuestionType = 'TFNG' | 'YNNG' | 'MCQ' | 'FILL_BLANK' | 'MATCHING';

export type HighlightColor = 'yellow' | 'mint' | 'sky' | 'rose';

export interface Paragraph {
  id: string;
  label: string; // 'A', 'B', 'C'...
  text: string;
}

export interface ParaphrasePair {
  questionTerm: string;
  passageTerm: string;
}

export interface PedagogicalExplanation {
  paragraphLabel: string;
  scanningLocation: string; // e.g., "Đoạn B, câu 2"
  evidenceQuote: string; // Exact substring inside the paragraph for auto-highlighting
  paraphrasing: ParaphrasePair[];
  distractorAnalysis: string;
}

export interface ReadingQuestion {
  id: string;
  number: number;
  type: QuestionType;
  instruction: string;
  prompt: string;
  options: string[]; // Empty for FILL_BLANK
  answer: string;
  explanation: PedagogicalExplanation;
}

export interface ReadingPassage {
  id: string;
  title: string;
  subtitle: string;
  sourceBook: string; // e.g., "Cambridge IELTS 18"
  testRef: string; // e.g., "Test 1 · Passage 1"
  topic: string; // e.g., "Environment", "Technology", "Psychology"
  bandLevel: string; // e.g., "Band 6.5", "Band 7.5", "Band 8.5"
  difficulty: 'Passage 1' | 'Passage 2' | 'Passage 3';
  estimatedMinutes: number;
  wordCount: number;
  coverImage?: string;
  audioUrl?: string; // Optional user-uploaded MP3/WAV blob URL
  paragraphs: Paragraph[];
  questions: ReadingQuestion[];
}

export interface TextAnnotation {
  id: string;
  passageId: string;
  paragraphId: string;
  quote: string;
  color: HighlightColor;
  note?: string;
  createdAt: number;
}

export interface VocabEntry {
  id: string;
  word: string;
  pos: string; // noun, verb, adj, adv, phrase
  ipa: string;
  contextualMeaning: string; // Nghĩa trong bài
  extendedMeaning: string; // Nghĩa mở rộng & collocations
  synonyms: string[];
  example: string; // Ví dụ trích từ bài đọc
  topicTag: string; // Auto-tag theo chủ đề IELTS
  passageId: string;
  passageTag: string; // Auto-tag theo bài đọc cụ thể
  mastery: number; // 0 - 100 (dưới 50 = Từ yếu)
  attempts: number;
  lastReviewedAt?: number;
}
