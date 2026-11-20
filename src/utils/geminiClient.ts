/**
 * Client-side Gemini API Integration with Automatic Fallback & Multimodal PDF Processing
 * Compliant with AI_INSTRUCTIONS.md:
 * - Default model: gemini-3-flash-preview
 * - Fallback models: gemini-3-flash-preview -> gemini-3-pro-preview -> gemini-2.5-flash -> gemini-2.0-flash
 * - Dynamic retry on 429/quota exhaustion
 * - Client-side localStorage persistence
 */

export const STORAGE_KEYS = {
  apiKey: 'lexiband_gemini_api_key',
  selectedModel: 'lexiband_gemini_model',
  fallbackEnabled: 'lexiband_fallback_enabled',
};

// Priority ordered models list for fallback according to AI_INSTRUCTIONS.md
export const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

export const AVAILABLE_MODELS = [
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    badge: 'Mặc định (Siêu tốc)',
    desc: 'Tối ưu tốc độ & phân tích đề thi IELTS xuất sắc.',
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    badge: 'Tư duy sư phạm cao cấp',
    desc: 'Lý luận chuyên sâu, phân tích bẫy đề và giải thích chuẩn mực.',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    badge: 'Hạn mức cao & Ổn định',
    desc: 'Model thế hệ 2.5 với độ tin cậy và hạn mức xử lý tối ưu.',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    badge: 'Dự phòng siêu bền',
    desc: 'Phản hồi nhanh, ổn định khi các model preview quá tải.',
  },
];

export function getStoredApiKey(): string {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem(STORAGE_KEYS.apiKey) ||
    localStorage.getItem('GEMINI_API_KEY') ||
    ''
  ).trim();
}

export function setStoredApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  const clean = key.trim();
  localStorage.setItem(STORAGE_KEYS.apiKey, clean);
  localStorage.setItem('GEMINI_API_KEY', clean);
}

export function getStoredModel(): string {
  if (typeof window === 'undefined') return FALLBACK_MODELS[0];
  return localStorage.getItem(STORAGE_KEYS.selectedModel) || FALLBACK_MODELS[0];
}

export function setStoredModel(model: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.selectedModel, model);
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function cleanJsonFences(rawText: string): string {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Find first { and last }
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned.trim();
}

interface GenerateContentOptions {
  contents: Array<{
    role?: string;
    parts: Array<
      | { text: string }
      | { inlineData: { mimeType: string; data: string } }
    >;
  }>;
  systemInstruction?: string;
  responseMimeType?: string;
  onModelAttempt?: (modelName: string, attemptIndex: number) => void;
}

/**
 * Execute Gemini call with automatic fallback across models when error occurs
 */
export async function callGeminiWithFallback(options: GenerateContentOptions): Promise<{ text: string; modelUsed: string }> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình API Key. Vui lòng bấm "API Key" trên góc màn hình để nhập khóa Gemini.');
  }

  const preferredModel = getStoredModel();
  // Build priority model list starting with the preferred model
  const candidateModels = [
    preferredModel,
    ...FALLBACK_MODELS.filter((m) => m !== preferredModel),
  ];

  let lastError: Error | null = null;

  for (let idx = 0; idx < candidateModels.length; idx++) {
    const model = candidateModels[idx];
    options.onModelAttempt?.(model, idx);

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const bodyPayload: Record<string, unknown> = {
        contents: options.contents,
      };

      if (options.systemInstruction) {
        bodyPayload.systemInstruction = {
          parts: [{ text: options.systemInstruction }],
        };
      }

      const generationConfig: Record<string, unknown> = {
        temperature: 0.2,
      };

      if (options.responseMimeType) {
        generationConfig.responseMimeType = options.responseMimeType;
      }

      bodyPayload.generationConfig = generationConfig;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errMessage = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.warn(`[Gemini Fallback] Model ${model} failed: ${errMessage}. Attempting next model...`);
        lastError = new Error(`Model ${model}: ${errMessage}`);
        continue; // Try next model in fallback list
      }

      const data = await response.json();
      const outputText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!outputText) {
        throw new Error(`Model ${model} trả về nội dung rỗng.`);
      }

      return { text: outputText, modelUsed: model };
    } catch (err) {
      console.warn(`[Gemini Fallback] Error with ${model}:`, err);
      lastError = err instanceof Error ? err : new Error(String(err));
      // Continue to next model
    }
  }

  // If all models failed, throw clear formatted error per AI_INSTRUCTIONS.md
  throw new Error(
    `Tất cả các model AI đều thất bại. Lỗi chi tiết: ${lastError?.message || 'RESOURCE_EXHAUSTED hoặc mất kết nối mạng'}`
  );
}

export interface DigitizePassageResult {
  title: string;
  subtitle: string;
  sourceBook?: string;
  topic: string;
  bandLevel: string;
  estimatedMinutes: number;
  paragraphs: Array<{ label: string; text: string }>;
  questions: Array<{
    number: number;
    type: 'TFNG' | 'YNNG' | 'MCQ' | 'FILL_BLANK' | 'MATCHING';
    instruction: string;
    prompt: string;
    options: string[];
    answer: string;
    explanation: {
      paragraphLabel: string;
      scanningLocation: string;
      evidenceQuote: string;
      paraphrasing: Array<{ questionTerm: string; passageTerm: string }>;
      distractorAnalysis: string;
    };
  }>;
  vocabulary: Array<{
    word: string;
    pos: string;
    ipa: string;
    contextualMeaning: string;
    extendedMeaning: string;
    synonyms: string[];
    example: string;
  }>;
}

const IELTS_SYSTEM_PROMPT = `Bạn là Giám đốc Học thuật EdTech và Chuyên gia Khảo thí IELTS cấp cao.
Nhiệm vụ của bạn là số hóa bài đọc hoặc tài liệu/sách PDF IELTS thành một bài học tương tác chuẩn xác tuyệt đối:
1. Tách văn bản bài đọc thành các đoạn có nhãn A, B, C... Giữ nguyên văn bản tiếng Anh học thuật chuẩn xác.
2. Trích xuất chính xác tất cả các câu hỏi bài tập có trong tài liệu/sách (hoặc tạo các câu hỏi chuẩn format Cambridge nếu tài liệu chưa đủ).
   - Với câu hỏi TFNG/YNNG: options là ["TRUE", "FALSE", "NOT GIVEN"] hoặc ["YES", "NO", "NOT GIVEN"], answer là 1 trong các giá trị đó.
   - Với câu hỏi MCQ: options là mảng ["A. ...", "B. ...", "C. ...", "D. ..."], answer là chữ cái A, B, C, D.
   - Với câu hỏi FILL_BLANK: prompt có chỗ trống "_____", options là [], answer là 1-2 từ chính xác trích từ bài đọc.
   - Với câu hỏi MATCHING: prompt ghi rõ yêu cầu nối tiêu đề/thông tin với đoạn văn.
   - BẮT BUỘC mỗi câu hỏi phải có explanation gồm:
     * paragraphLabel: Nhãn đoạn chứa bằng chứng (ví dụ "B")
     * scanningLocation: Vị trí cụ thể tiếng Việt (ví dụ "Đoạn B, câu thứ 2")
     * evidenceQuote: Trích dẫn CHÍNH XÁC NGUYÊN VĂN 1 câu hoặc cụm từ ngắn (10-25 từ) tồn tại y nguyên trong đoạn văn đó để hệ thống tự động highlight!
     * paraphrasing: Mảng 2-3 cặp { questionTerm, passageTerm }
     * distractorAnalysis: Phân tích tư duy loại trừ phương án nhiễu bằng tiếng Việt.
3. TỰ ĐỘNG TÁCH PHẦN TỪ VỰNG HỌC THUẬT:
   - Trích xuất 6-12 từ/cụm từ học thuật quan trọng nhất (Band 7.0+) xuất hiện trong bài đọc.
   - Đầy đủ: word, pos, phiên âm chuẩn Anh-Anh ipa, contextualMeaning (nghĩa chính xác trong ngữ cảnh câu bài đọc bằng tiếng Việt), extendedMeaning (nghĩa mở rộng & collocations), synonyms (mảng từ đồng nghĩa), example (CÂU VÍ DỤ TRÍCH NGUYÊN VĂN TỪ BÀI ĐỌC).
Luôn trả về định dạng JSON thuần hợp lệ.`;

/**
 * Digitize IELTS Reading from uploaded PDF file or Book scan Image
 */
export async function digitizeFromPdfOrImage(
  file: File,
  meta: {
    title?: string;
    sourceBook?: string;
    topic?: string;
    bandLevel?: string;
  },
  onStatusUpdate?: (status: string) => void
): Promise<DigitizePassageResult> {
  onStatusUpdate?.('Đang mã hóa tệp PDF/ảnh bài đọc...');
  const base64Data = await fileToBase64(file);
  const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

  onStatusUpdate?.('Đang gửi dữ liệu đến AI và nhận diện cấu trúc sách bài tập...');

  const promptText = `Hãy phân tích tài liệu/trang sách PDF đính kèm này:
- Tiêu đề gợi ý: ${meta.title || '(Tự nhận diện từ tài liệu)'}
- Nguồn sách: ${meta.sourceBook || 'Sách bài tập IELTS tự tải lên'}
- Chủ đề: ${meta.topic || 'Tự động phân loại theo nội dung'}
- Độ khó mục tiêu: ${meta.bandLevel || 'Band 7.0'}

Yêu cầu quan trọng:
1. Đọc và số hóa toàn bộ nội dung bài đọc Reading Passage từ tài liệu, chia đoạn A, B, C...
2. Tự động nhận diện và số hóa đúng dạng bài tất cả các bài tập/câu hỏi có trong trang sách (TFNG, Multiple Choice, Điền từ vào chỗ trống, Nối tiêu đề...).
3. Với mỗi câu hỏi, cung cấp vị trí scanningLocation, trích dẫn chứng cứ evidenceQuote nguyên văn để highlight, và phân tích bẫy distractorAnalysis.
4. TỰ ĐỘNG TÁCH PHẦN TỪ VỰNG: Trích xuất các từ vựng học thuật cốt lõi (Band 7.0+) với phiên âm IPA, nghĩa tiếng Việt chuẩn ngữ cảnh, và câu ví dụ trích từ bài.

Trả về duy nhất JSON theo cấu trúc:
{
  "title": "string",
  "subtitle": "string",
  "topic": "string",
  "bandLevel": "string",
  "estimatedMinutes": 20,
  "paragraphs": [{ "label": "A", "text": "..." }],
  "questions": [
    {
      "number": 1,
      "type": "TFNG",
      "instruction": "Do the following statements agree...",
      "prompt": "...",
      "options": ["TRUE", "FALSE", "NOT GIVEN"],
      "answer": "TRUE",
      "explanation": {
        "paragraphLabel": "A",
        "scanningLocation": "Đoạn A, câu 2",
        "evidenceQuote": "exact quote from paragraph A",
        "paraphrasing": [{ "questionTerm": "...", "passageTerm": "..." }],
        "distractorAnalysis": "..."
      }
    }
  ],
  "vocabulary": [
    {
      "word": "...",
      "pos": "verb",
      "ipa": "/.../",
      "contextualMeaning": "...",
      "extendedMeaning": "...",
      "synonyms": ["..."],
      "example": "exact sentence from passage"
    }
  ]
}`;

  const { text } = await callGeminiWithFallback({
    contents: [
      {
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          { text: promptText },
        ],
      },
    ],
    systemInstruction: IELTS_SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    onModelAttempt: (modelName, idx) => {
      onStatusUpdate?.(
        idx === 0
          ? `Đang xử lý phân tích PDF với model ${modelName}...`
          : `Model trước bận, đang tự động chuyển sang model dự phòng ${modelName}...`
      );
    },
  });

  const cleaned = cleanJsonFences(text);
  const parsed = JSON.parse(cleaned) as DigitizePassageResult;
  return parsed;
}

/**
 * Digitize IELTS Reading from raw pasted text
 */
export async function digitizeFromRawText(
  rawText: string,
  meta: {
    title?: string;
    sourceBook?: string;
    topic?: string;
    bandLevel?: string;
    questionCount?: number;
  },
  onStatusUpdate?: (status: string) => void
): Promise<DigitizePassageResult> {
  onStatusUpdate?.('Đang gửi văn bản tới Gemini AI để phân đoạn và sinh câu hỏi...');

  const promptText = `Hãy số hóa văn bản IELTS Reading sau thành bài học hoàn chỉnh:
Tiêu đề gợi ý: ${meta.title || '(Tự đề xuất tiêu đề học thuật)'}
Nguồn sách: ${meta.sourceBook || 'Cambridge IELTS · Tự nhập'}
Chủ đề: ${meta.topic || 'Academic'}
Độ khó: ${meta.bandLevel || 'Band 7.0'}
Số lượng câu hỏi: ${meta.questionCount || 5}

VĂN BẢN GỐC:
"""
${rawText.trim()}
"""

Yêu cầu bắt buộc:
1. Tách thành các đoạn A, B, C...
2. Tạo các câu hỏi chuẩn format Cambridge (kết hợp TFNG, MCQ, FILL_BLANK) kèm evidenceQuote chính xác nguyên văn trong đoạn văn.
3. Tách tự động 6-10 từ vựng học thuật Band 7.0+ có câu ví dụ trích từ bài đọc.`;

  const { text } = await callGeminiWithFallback({
    contents: [{ parts: [{ text: promptText }] }],
    systemInstruction: IELTS_SYSTEM_PROMPT,
    responseMimeType: 'application/json',
    onModelAttempt: (modelName, idx) => {
      onStatusUpdate?.(
        idx === 0
          ? `Đang phân tích bài đọc với model ${modelName}...`
          : `Model trước bận, đang tự động kích hoạt model dự phòng ${modelName}...`
      );
    },
  });

  const cleaned = cleanJsonFences(text);
  const parsed = JSON.parse(cleaned) as DigitizePassageResult;
  return parsed;
}

/**
 * Contextual Vocabulary Lookup for clicked/selected words
 */
export async function lookupWordContextual(
  word: string,
  sentence: string,
  passageTitle: string,
  topic: string
): Promise<{
  word: string;
  pos: string;
  ipa: string;
  contextualMeaning: string;
  extendedMeaning: string;
  synonyms: string[];
  example: string;
}> {
  const prompt = `Phân tích từ/cụm từ học thuật IELTS sau trong đúng ngữ cảnh câu bài đọc:
- Từ: "${word.trim()}"
- Câu chứa từ trong bài đọc: "${sentence || 'Không có câu ngữ cảnh'}"
- Tiêu đề bài: "${passageTitle || 'IELTS Reading'}"
- Chủ đề: "${topic || 'Academic'}"

Trả về JSON với các trường: word, pos, ipa (Anh-Anh), contextualMeaning (tiếng Việt sát ngữ cảnh câu), extendedMeaning (nghĩa mở rộng + collocations), synonyms (mảng 2-3 từ đồng nghĩa), example (câu trích từ bài đọc chứa từ).`;

  const { text } = await callGeminiWithFallback({
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction:
      'Bạn là chuyên gia sư phạm IELTS. Giải thích chuẩn mực bằng tiếng Việt, phiên âm IPA chuẩn Anh-Anh.',
    responseMimeType: 'application/json',
  });

  const cleaned = cleanJsonFences(text);
  return JSON.parse(cleaned);
}
