import { ReadingPassage, VocabEntry } from '../types/ielts';

/**
 * Generate a standalone 16:9 Classroom Slide Deck
 * Styled with Cambridge academic aesthetic, ready for offline projection, PowerPoint import, or web presentation.
 */
export function exportPassageToSlides(passage: ReadingPassage, vocabList?: VocabEntry[]) {
  const matchingVocab = vocabList
    ? vocabList.filter((v) => v.passageId === passage.id)
    : [];

  const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${passage.title} - 16:9 Classroom Slide Deck</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0F172A;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #F8FAFC;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 0;
    }
    .slide-container {
      width: 100%;
      max-width: 1100px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .slide {
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #FFFFFF;
      color: #0F172A;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      padding: 48px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    /* Slide 1: Cover */
    .cover-slide {
      background: linear-gradient(135deg, #0F2744 0%, #0F766E 100%);
      color: #FFFFFF;
      justify-content: center;
      text-align: center;
      align-items: center;
    }
    .cover-badge {
      display: inline-block;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 2px;
      padding: 6px 16px;
      border-radius: 9999px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      margin-bottom: 24px;
    }
    .cover-title {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.2;
      max-width: 850px;
      margin-bottom: 16px;
      letter-spacing: -0.5px;
    }
    .cover-subtitle {
      font-size: 18px;
      color: #99F6E4;
      max-width: 700px;
      line-height: 1.5;
    }
    .cover-footer {
      position: absolute;
      bottom: 32px;
      font-size: 14px;
      color: rgba(255, 255, 255, 0.8);
      display: flex;
      gap: 24px;
    }
    /* Standard Slide Header */
    .slide-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #CCFBF1;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .slide-header h2 {
      font-size: 24px;
      font-weight: 800;
      color: #0F766E;
    }
    .slide-header .tag {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      color: #0F2744;
      background: #F0FDFA;
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid #99F6E4;
    }
    /* Content Columns */
    .split-body {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 24px;
      height: 100%;
      overflow: hidden;
    }
    .passage-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      font-size: 15px;
      line-height: 1.6;
      color: #334155;
      overflow-y: auto;
    }
    .passage-label {
      font-weight: 800;
      color: #0F766E;
      margin-right: 6px;
    }
    .question-card {
      background: #FFFFFF;
      border: 2px solid #E2E8F0;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .q-prompt {
      font-size: 16px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 12px;
    }
    .q-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-size: 14px;
      color: #475569;
    }
    .q-option-item {
      padding: 8px 12px;
      background: #F1F5F9;
      border-radius: 8px;
    }
    .evidence-box {
      margin-top: 14px;
      background: #FEF9C3;
      border-left: 4px solid #CA8A04;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 13px;
      color: #854D0E;
    }
    /* Vocabulary Grid */
    .vocab-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      height: 100%;
      overflow-y: auto;
    }
    .vocab-card {
      background: #F0FDFA;
      border: 1px solid #CCFBF1;
      border-radius: 10px;
      padding: 16px;
    }
    .vocab-word {
      font-size: 20px;
      font-weight: 800;
      color: #0F766E;
    }
    .vocab-ipa {
      font-size: 13px;
      font-family: monospace;
      color: #64748B;
      margin-left: 8px;
    }
    .vocab-def {
      font-size: 14px;
      font-weight: 600;
      color: #0F172A;
      margin-top: 6px;
    }
    .vocab-example {
      font-size: 12.5px;
      font-style: italic;
      color: #475569;
      margin-top: 6px;
      line-height: 1.4;
    }
    /* Navigation bar for interactive presentation */
    .nav-bar {
      position: fixed;
      bottom: 16px;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(8px);
      padding: 8px 20px;
      border-radius: 9999px;
      display: flex;
      gap: 16px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      z-index: 50;
    }
    .nav-btn {
      background: #0F766E;
      color: #FFFFFF;
      border: none;
      padding: 6px 14px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .nav-btn:hover { background: #115E59; }
    @media print {
      body { background: transparent; padding: 0; }
      .nav-bar { display: none; }
      .slide { box-shadow: none; border-radius: 0; page-break-after: always; width: 100vw; height: 56.25vw; }
    }
  </style>
</head>
<body>

  <div class="nav-bar">
    <button class="nav-btn" onclick="window.print()">In hoặc Lưu PDF (Ctrl+P)</button>
    <span style="font-size: 13px; color: #94A3B8; align-self: center;">Chế độ trình chiếu 16:9</span>
  </div>

  <div class="slide-container">
    <!-- SLIDE 1: COVER -->
    <div class="slide cover-slide">
      <div class="cover-badge">${passage.sourceBook || 'Cambridge IELTS'} · ${passage.testRef || 'Passage'}</div>
      <h1 class="cover-title">${passage.title}</h1>
      <p class="cover-subtitle">${passage.subtitle || 'Academic Reading & Comprehension'}</p>
      <div class="cover-footer">
        <span>Chủ đề: <strong>${passage.topic}</strong></span>
        <span>Mục tiêu: <strong>${passage.bandLevel}</strong></span>
        <span>Thời lượng: <strong>${passage.estimatedMinutes} phút</strong></span>
      </div>
    </div>

    <!-- SLIDE 2: PRE-TEACH VOCABULARY -->
    ${
      matchingVocab.length > 0
        ? `
    <div class="slide">
      <div class="slide-header">
        <h2>PRE-TEACH VOCABULARY (TỪ VỰNG TRỌNG TÂM)</h2>
        <span class="tag">Stage 1 · Khởi động</span>
      </div>
      <div class="vocab-grid">
        ${matchingVocab.slice(0, 6).map((v) => `
          <div class="vocab-card">
            <div>
              <span class="vocab-word">${v.word}</span>
              <span class="vocab-ipa">${v.ipa || ''} (${v.pos || 'n'})</span>
            </div>
            <div class="vocab-def">${v.contextualMeaning}</div>
            <div class="vocab-example">"${v.example}"</div>
          </div>
        `).join('')}
      </div>
    </div>
    `
        : ''
    }

    <!-- SLIDES 3+: QUESTIONS & PASSAGES BREAKDOWN -->
    ${passage.questions.slice(0, 5).map((q) => {
      const targetParagraph = passage.paragraphs.find((p) => p.label === q.explanation?.paragraphLabel) || passage.paragraphs[0];
      return `
    <div class="slide">
      <div class="slide-header">
        <h2>QUESTION ${q.number} · PHÂN TÍCH ĐỌC HIỂU</h2>
        <span class="tag">${q.type}</span>
      </div>
      <div class="split-body">
        <div class="passage-card">
          <div style="font-weight: 800; color: #0F766E; margin-bottom: 8px; font-size: 13px; text-transform: uppercase;">
            ĐOẠN VĂN [${targetParagraph.label}]
          </div>
          <div>${targetParagraph.text}</div>
        </div>
        <div class="question-card">
          <div>
            <div class="q-prompt">Câu ${q.number}: ${q.prompt}</div>
            ${q.options && q.options.length > 0 ? `
              <div class="q-options">
                ${q.options.map((opt) => `<div class="q-option-item">${opt}</div>`).join('')}
              </div>
            ` : ''}
          </div>
          <div>
            <div class="evidence-box">
              <strong style="color: #0F766E; display: block; margin-bottom: 4px;">Đáp án: ${q.answer}</strong>
              <strong>Chứng cứ:</strong> "${q.explanation?.evidenceQuote || 'N/A'}"
              <div style="font-size: 11.5px; margin-top: 4px; color: #713F12;">
                Vị trí: ${q.explanation?.scanningLocation || `Đoạn ${targetParagraph.label}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
      `;
    }).join('')}
  </div>

</body>
</html>`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const cleanTitle = passage.title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().slice(0, 40);
  const fileName = `${cleanTitle || 'IELTS_Reading'}_16x9_SlideDeck.html`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
