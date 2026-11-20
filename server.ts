import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY chưa được cấu hình. Vui lòng thiết lập khóa API trong Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function handleApiError(res: express.Response, err: unknown, fallbackMsg: string) {
  console.error('[API Error]', err);
  const message = err instanceof Error ? err.message : fallbackMsg;
  const status =
    message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')
      ? 403
      : message.includes('RESOURCE_EXHAUSTED')
      ? 429
      : message.includes('GEMINI_API_KEY')
      ? 500
      : 500;
  res.status(status).json({ error: message });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // 0. Save Brand Logo directly to project system files
  app.post('/api/save-logo', async (req, res) => {
    try {
      const { base64Data } = req.body as {
        base64Data?: string;
      };
      if (!base64Data) {
        res.status(400).json({ error: 'Không có dữ liệu logo.' });
        return;
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');

      const publicDir = path.resolve(__dirname, 'public');
      const assetsDir = path.resolve(__dirname, 'src', 'assets');
      const dataDir = path.resolve(__dirname, 'src', 'data');
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
      if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      // Save as public/brand-logo.png and src/assets/brand-logo.png
      fs.writeFileSync(path.join(publicDir, 'brand-logo.png'), buffer);
      fs.writeFileSync(path.join(assetsDir, 'brand-logo.png'), buffer);

      // Save brandConfig.json
      const configPath = path.join(dataDir, 'brandConfig.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify(
          {
            brandName: 'Tiếng Anh Thầy Phúc',
            logoUrl: base64Data,
            savedAt: new Date().toISOString(),
          },
          null,
          2
        )
      );

      res.json({ success: true, message: 'Đã lưu logo vào file hệ thống thành công!' });
    } catch (err) {
      console.error('[Save Logo Error]', err);
      res.status(500).json({ error: 'Không thể lưu logo vào file hệ thống.' });
    }
  });

  // 0.1 Save Passage Cover Image directly to project system files
  app.post('/api/save-passage-image', async (req, res) => {
    try {
      const { passageId, base64Data } = req.body as {
        passageId?: string;
        base64Data?: string;
      };
      if (!passageId || !base64Data) {
        res.status(400).json({ error: 'Thiếu passageId hoặc dữ liệu ảnh.' });
        return;
      }

      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      const ext = matches
        ? matches[1].includes('png')
          ? '.png'
          : matches[1].includes('webp')
          ? '.webp'
          : matches[1].includes('svg')
          ? '.svg'
          : '.jpg'
        : '.jpg';
      const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(base64Data, 'base64');

      const publicImagesDir = path.resolve(__dirname, 'public', 'images', 'passages');
      const srcImagesDir = path.resolve(__dirname, 'src', 'assets', 'images');
      if (!fs.existsSync(publicImagesDir)) fs.mkdirSync(publicImagesDir, { recursive: true });
      if (!fs.existsSync(srcImagesDir)) fs.mkdirSync(srcImagesDir, { recursive: true });

      const safeId = passageId.replace(/[^a-zA-Z0-9_-]/g, '_');
      const savedFileName = `cover_${safeId}_${Date.now()}${ext}`;

      fs.writeFileSync(path.join(publicImagesDir, savedFileName), buffer);
      fs.writeFileSync(path.join(srcImagesDir, savedFileName), buffer);

      const publicUrl = `/images/passages/${savedFileName}`;

      res.json({
        success: true,
        imageUrl: publicUrl,
        message: 'Đã lưu ảnh bìa bài đọc vào file hệ thống thành công!',
      });
    } catch (err) {
      console.error('[Save Passage Image Error]', err);
      res.status(500).json({ error: 'Không thể lưu ảnh vào file hệ thống.' });
    }
  });

  // 1. Contextual Word Lookup for Smart Vocabulary Notebook
  app.post('/api/lookup-word', async (req, res) => {
    try {
      const { word, sentence, passageTitle, topic } = req.body as {
        word?: string;
        sentence?: string;
        passageTitle?: string;
        topic?: string;
      };
      if (!word || !word.trim()) {
        res.status(400).json({ error: 'Vui lòng cung cấp từ hoặc cụm từ cần tra cứu.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Phân tích từ/cụm từ học thuật IELTS sau trong đúng ngữ cảnh bài đọc:
- Từ cần phân tích: "${word.trim()}"
- Câu chứa từ trong bài đọc: "${sentence || 'Không có câu ngữ cảnh cụ thể'}"
- Tiêu đề bài đọc: "${passageTitle || 'IELTS Academic Reading'}"
- Chủ đề IELTS: "${topic || 'Academic'}"

Hãy trả về đầy đủ: loại từ (pos), phiên âm chuẩn Anh-Anh (ipa), nghĩa chính xác trong ngữ cảnh câu bài đọc bằng tiếng Việt (contextualMeaning), nghĩa mở rộng & collocations học thuật (extendedMeaning), 2-3 từ đồng nghĩa / paraphrase hay gặp trong đề IELTS (synonyms), và câu ví dụ trích từ bài đọc (example).`,
        config: {
          systemInstruction:
            'Bạn là chuyên gia sư phạm IELTS (TESOL/CELTA). Giải thích ngắn gọn, học thuật, chính xác bằng tiếng Việt, giữ nguyên thuật ngữ tiếng Anh và phiên âm IPA chuẩn.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              pos: { type: Type.STRING, description: 'e.g. noun, verb, adjective, phrase' },
              ipa: { type: Type.STRING, description: 'British IPA transcription e.g. /ˌhaɪ.drəˈpɒn.ɪks/' },
              contextualMeaning: { type: Type.STRING },
              extendedMeaning: { type: Type.STRING },
              synonyms: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              example: { type: Type.STRING },
            },
            required: ['word', 'pos', 'ipa', 'contextualMeaning', 'extendedMeaning', 'synonyms', 'example'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      handleApiError(res, err, 'Không thể phân tích từ vựng từ hệ thống AI.');
    }
  });

  // 2. Digitalize & Import a Raw IELTS Reading Passage
  app.post('/api/import-passage', async (req, res) => {
    try {
      const { rawText, title, sourceBook, topic, bandLevel, questionCount } = req.body as {
        rawText?: string;
        title?: string;
        sourceBook?: string;
        topic?: string;
        bandLevel?: string;
        questionCount?: number;
      };

      if (!rawText || rawText.trim().length < 120) {
        res.status(400).json({ error: 'Văn bản bài đọc quá ngắn (tối thiểu 120 ký tự) để số hóa.' });
        return;
      }

      const count = Math.min(Math.max(Number(questionCount) || 5, 3), 8);
      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Hãy số hóa đoạn văn IELTS Reading dưới đây thành một bài học hoàn chỉnh theo chuẩn Cambridge IELTS:

Tiêu đề gợi ý: ${title || '(Tự đề xuất tiêu đề học thuật phù hợp)'}
Nguồn sách: ${sourceBook || 'Custom Imported'}
Chủ đề: ${topic || 'Academic'}
Độ khó mục tiêu: ${bandLevel || 'Band 7.0'}
Số lượng câu hỏi cần tạo: ${count} (kết hợp đa dạng giữa TFNG, MCQ và FILL_BLANK)

VĂN BẢN GỐC:
"""
${rawText.trim()}
"""

Yêu cầu bắt buộc:
1. Tách văn bản gốc thành các đoạn có nhãn A, B, C... giữ nguyên văn bản tiếng Anh chuẩn xác.
2. Tạo đúng ${count} câu hỏi đọc hiểu chuẩn IELTS. Với mỗi câu hỏi:
   - type là một trong: "TFNG", "MCQ", "FILL_BLANK"
   - Nếu type là "TFNG": options là ["TRUE", "FALSE", "NOT GIVEN"], answer là một trong 3 giá trị đó.
   - Nếu type là "MCQ": options là mảng 4 lựa chọn dạng ["A. ...", "B. ...", "C. ...", "D. ..."], answer là chữ cái "A"|"B"|"C"|"D".
   - Nếu type là "FILL_BLANK": prompt chứa chỗ trống "_____", options là [], answer là 1-2 từ chính xác trích từ bài đọc.
   - explanation BẮT BUỘC gồm:
     * paragraphLabel: nhãn đoạn chứa bằng chứng (ví dụ "A", "B"...)
     * scanningLocation: vị trí cụ thể bằng tiếng Việt (ví dụ "Đoạn B, câu thứ 2")
     * evidenceQuote: trích dẫn CHÍNH XÁC nguyên văn 1 câu hoặc cụm câu ngắn (10-25 từ) tồn tại y nguyên trong đoạn văn đó để hệ thống tự động highlight!
     * paraphrasing: mảng 2-3 cặp { questionTerm, passageTerm }
     * distractorAnalysis: phân tích tư duy loại trừ phương án nhiễu bằng tiếng Việt.
3. Trích xuất 6 từ vựng học thuật (Band 7.0+) quan trọng nhất từ bài đọc với đầy đủ 6 trường: word, pos, ipa, contextualMeaning (tiếng Việt), extendedMeaning (tiếng Việt + collocations), synonyms (mảng tiếng Anh), example (câu trích từ bài đọc).`,
        config: {
          systemInstruction:
            'Bạn là Kiến trúc sư nền tảng EdTech và Chuyên gia khảo thí IELTS Reading cao cấp. Luôn trả về JSON hợp lệ theo schema. Các trích dẫn evidenceQuote phải khớp chính xác từng ký tự với nội dung trong paragraphs.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              topic: { type: Type.STRING },
              bandLevel: { type: Type.STRING },
              estimatedMinutes: { type: Type.INTEGER },
              paragraphs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    text: { type: Type.STRING },
                  },
                  required: ['label', 'text'],
                },
              },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    number: { type: Type.INTEGER },
                    type: { type: Type.STRING, description: 'TFNG | MCQ | FILL_BLANK' },
                    instruction: { type: Type.STRING },
                    prompt: { type: Type.STRING },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    answer: { type: Type.STRING },
                    explanation: {
                      type: Type.OBJECT,
                      properties: {
                        paragraphLabel: { type: Type.STRING },
                        scanningLocation: { type: Type.STRING },
                        evidenceQuote: { type: Type.STRING },
                        paraphrasing: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              questionTerm: { type: Type.STRING },
                              passageTerm: { type: Type.STRING },
                            },
                            required: ['questionTerm', 'passageTerm'],
                          },
                        },
                        distractorAnalysis: { type: Type.STRING },
                      },
                      required: [
                        'paragraphLabel',
                        'scanningLocation',
                        'evidenceQuote',
                        'paraphrasing',
                        'distractorAnalysis',
                      ],
                    },
                  },
                  required: ['number', 'type', 'instruction', 'prompt', 'options', 'answer', 'explanation'],
                },
              },
              vocabulary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    pos: { type: Type.STRING },
                    ipa: { type: Type.STRING },
                    contextualMeaning: { type: Type.STRING },
                    extendedMeaning: { type: Type.STRING },
                    synonyms: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    example: { type: Type.STRING },
                  },
                  required: [
                    'word',
                    'pos',
                    'ipa',
                    'contextualMeaning',
                    'extendedMeaning',
                    'synonyms',
                    'example',
                  ],
                },
              },
            },
            required: ['title', 'subtitle', 'topic', 'bandLevel', 'estimatedMinutes', 'paragraphs', 'questions', 'vocabulary'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (err) {
      handleApiError(res, err, 'Không thể số hóa bài đọc. Vui lòng thử lại.');
    }
  });

  // 3. Batch Analyze Vocabulary List
  app.post('/api/analyze-vocab', async (req, res) => {
    try {
      const { rawList, topic, passageRef } = req.body as {
        rawList?: string;
        topic?: string;
        passageRef?: string;
      };
      if (!rawList || !rawList.trim()) {
        res.status(400).json({ error: 'Vui lòng nhập danh sách từ vựng cần phân tích.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Phân tích danh sách từ vựng IELTS sau thành cấu trúc Sổ tay từ vựng thông minh (tối đa 12 từ):
Danh sách đầu vào:
${rawList.trim()}

Chủ đề IELTS: ${topic || 'Academic'}
Nguồn bài đọc: ${passageRef || 'Danh sách tự nhập'}

Với mỗi từ, cung cấp: word, pos, ipa (Anh-Anh), contextualMeaning (nghĩa học thuật cốt lõi bằng tiếng Việt), extendedMeaning (nghĩa mở rộng & collocations), synonyms (2-3 từ đồng nghĩa IELTS), example (1 câu ví dụ học thuật kiểu IELTS Reading chứa chính từ đó).`,
        config: {
          systemInstruction:
            'Bạn là chuyên gia từ vựng học thuật IELTS. Trả về JSON mảng các mục từ vựng chuẩn xác, giàu sắc thái ngữ cảnh.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    pos: { type: Type.STRING },
                    ipa: { type: Type.STRING },
                    contextualMeaning: { type: Type.STRING },
                    extendedMeaning: { type: Type.STRING },
                    synonyms: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    example: { type: Type.STRING },
                  },
                  required: [
                    'word',
                    'pos',
                    'ipa',
                    'contextualMeaning',
                    'extendedMeaning',
                    'synonyms',
                    'example',
                  ],
                },
              },
            },
            required: ['items'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{"items":[]}').trim());
      res.json(parsed);
    } catch (err) {
      handleApiError(res, err, 'Không thể phân tích danh sách từ vựng.');
    }
  });

  // 4. Synchronized Shadowing TTS via Gemini 3.8 Flash Lite TTS
  app.post('/api/tts', async (req, res) => {
    try {
      const { text, voiceName } = req.body as { text?: string; voiceName?: string };
      if (!text || !text.trim()) {
        res.status(400).json({ error: 'Thiếu văn bản để tổng hợp giọng đọc.' });
        return;
      }

      const safeText = text.trim().slice(0, 1800);
      const allowedVoices = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];
      const chosenVoice = voiceName && allowedVoices.includes(voiceName) ? voiceName : 'Kore';

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: safeText,
                speechMetadata: {
                  style: 'Clear, measured British academic narrator for IELTS shadowing practice',
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        res.status(502).json({ error: 'Không nhận được dữ liệu âm thanh từ dịch vụ TTS.' });
        return;
      }

      res.json({
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    } catch (err) {
      handleApiError(res, err, 'Không thể tổng hợp giọng đọc Shadowing.');
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LexiBand Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
