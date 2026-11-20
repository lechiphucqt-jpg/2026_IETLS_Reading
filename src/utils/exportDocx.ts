import { ReadingPassage, VocabEntry } from '../types/ielts';

/**
 * Generate a complete, beautifully-formatted Cambridge IELTS Reading Word document (.doc/.docx)
 * Compatible with Microsoft Word, LibreOffice, WPS Office, and Google Docs.
 */
export function exportPassageToWord(passage: ReadingPassage, vocabList?: VocabEntry[]) {
  const matchingVocab = vocabList
    ? vocabList.filter((v) => v.passageId === passage.id)
    : [];

  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${passage.title} - Cambridge IELTS Reading</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page Section1 {
      size: 21.0cm 29.7cm;
      margin: 2.0cm 2.0cm 2.0cm 2.0cm;
      mso-header-margin: 1.0cm;
      mso-footer-margin: 1.0cm;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
      font-family: 'Times New Roman', Times, serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #111827;
    }
    h1 {
      font-size: 18pt;
      font-weight: bold;
      text-align: center;
      margin-top: 10pt;
      margin-bottom: 4pt;
      color: #0F2744;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    h2 {
      font-size: 13pt;
      font-weight: bold;
      margin-top: 16pt;
      margin-bottom: 6pt;
      color: #0F766E;
      border-bottom: 1.5pt solid #0F766E;
      padding-bottom: 3pt;
    }
    h3 {
      font-size: 11.5pt;
      font-weight: bold;
      margin-top: 12pt;
      margin-bottom: 4pt;
      color: #1F2937;
    }
    .subtitle {
      font-size: 11pt;
      font-style: italic;
      text-align: center;
      color: #4B5563;
      margin-bottom: 14pt;
    }
    .header-box {
      border: 1.5pt solid #0F766E;
      background-color: #F0FDFA;
      padding: 10pt 14pt;
      margin-bottom: 18pt;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .header-table td {
      padding: 3pt 6pt;
      vertical-align: top;
    }
    .paragraph-block {
      margin-bottom: 10pt;
      text-align: justify;
      text-justify: inter-word;
    }
    .paragraph-label {
      font-weight: bold;
      font-size: 11.5pt;
      color: #0F766E;
      margin-right: 6pt;
    }
    .question-block {
      margin-bottom: 10pt;
      padding-left: 8pt;
    }
    .question-prompt {
      font-weight: bold;
      margin-bottom: 3pt;
    }
    .question-options {
      margin-left: 14pt;
      margin-bottom: 6pt;
    }
    .answer-sheet-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10pt;
      margin-bottom: 18pt;
      font-size: 10pt;
    }
    .answer-sheet-table th, .answer-sheet-table td {
      border: 1pt solid #D1D5DB;
      padding: 5pt 8pt;
      text-align: left;
    }
    .answer-sheet-table th {
      background-color: #F3F4F6;
      font-weight: bold;
    }
    .vocab-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8pt;
      font-size: 9.5pt;
    }
    .vocab-table th, .vocab-table td {
      border: 1pt solid #E5E7EB;
      padding: 5pt 6pt;
      vertical-align: top;
    }
    .vocab-table th {
      background-color: #F0FDFA;
      color: #0F766E;
      font-weight: bold;
    }
    .page-break {
      page-break-before: always;
      mso-special-character: line-break;
    }
    .highlight {
      background-color: #FEF08A;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <!-- Header Block -->
    <div class="header-box">
      <table class="header-table">
        <tr>
          <td><strong>Kỳ thi thử:</strong> Cambridge IELTS Academic Reading</td>
          <td style="text-align: right;"><strong>Thời gian làm bài:</strong> ${passage.estimatedMinutes || 20} phút</td>
        </tr>
        <tr>
          <td><strong>Nguồn tài liệu:</strong> ${passage.sourceBook || 'Cambridge IELTS'} · ${passage.testRef || 'Passage'}</td>
          <td style="text-align: right;"><strong>Mục tiêu:</strong> ${passage.bandLevel || 'Band 7.0+'}</td>
        </tr>
        <tr>
          <td><strong>Chủ đề:</strong> ${passage.topic || 'Academic'}</td>
          <td style="text-align: right;"><strong>Tổng số câu hỏi:</strong> ${passage.questions.length} câu</td>
        </tr>
      </table>
    </div>

    <h1>${passage.title}</h1>
    <div class="subtitle">${passage.subtitle || 'Read the passage below and answer the questions.'}</div>

    <!-- READING PASSAGE -->
    <h2>READING PASSAGE</h2>
    <div style="margin-bottom: 16pt;">
      ${passage.paragraphs
        .map(
          (p) => `
        <div class="paragraph-block">
          <span class="paragraph-label">[Paragraph ${p.label}]</span>
          ${p.text}
        </div>
      `
        )
        .join('')}
    </div>

    <!-- QUESTIONS SECTION -->
    <div class="page-break"></div>
    <h2>QUESTIONS & EXERCISES</h2>

    ${passage.questions
      .map(
        (q) => `
      <div class="question-block">
        <div class="question-prompt">
          <strong>Question ${q.number}:</strong> [${q.type}] ${q.prompt}
        </div>
        ${
          q.instruction
            ? `<div style="font-size: 9.5pt; color: #4B5563; font-style: italic; margin-bottom: 4pt;">
                <em>Chỉ dẫn: ${q.instruction}</em>
              </div>`
            : ''
        }
        ${
          q.options && q.options.length > 0
            ? `<div class="question-options">
                ${q.options.map((opt) => `<div>${opt}</div>`).join('')}
              </div>`
            : `<div style="margin-left: 14pt; color: #6B7280; font-style: italic;">
                Trả lời: ____________________________________________________
              </div>`
        }
      </div>
    `
      )
      .join('')}

    <!-- CANDIDATE ANSWER SHEET -->
    <div class="page-break"></div>
    <h2>CANDIDATE ANSWER SHEET (PHIẾU TRẢ LỜI CỦA THÍ SINH)</h2>
    <p style="font-size: 10pt; color: #4B5563;">Học sinh ghi câu trả lời rõ ràng vào các ô bên dưới. Chú ý số lượng từ giới hạn nếu có.</p>
    <table class="answer-sheet-table">
      <thead>
        <tr>
          <th style="width: 15%;">Câu số</th>
          <th style="width: 55%;">Câu trả lời của thí sinh</th>
          <th style="width: 15%;">Chấm điểm</th>
          <th style="width: 15%;">Ghi chú</th>
        </tr>
      </thead>
      <tbody>
        ${passage.questions
          .map(
            (q) => `
          <tr>
            <td style="font-weight: bold; text-align: center;">${q.number}</td>
            <td style="height: 22pt;">&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- TEACHER KEY & DETAILED EXPLANATION -->
    <div class="page-break"></div>
    <h2>ANSWER KEY & PEDAGOGICAL ANALYSIS (ĐÁP ÁN & GIẢI THÍCH SƯ PHẠM)</h2>
    <p style="font-size: 10pt; color: #0F766E; font-weight: bold;">(Dành riêng cho Giáo viên & Học sinh tự đối chiếu phương pháp tư duy)</p>

    ${passage.questions
      .map(
        (q) => `
      <div style="margin-bottom: 14pt; padding: 8pt 10pt; background-color: #F9FAFB; border: 1pt solid #E5E7EB; border-left: 3pt solid #0F766E;">
        <div style="font-weight: bold; font-size: 11pt; color: #111827;">
          Question ${q.number}: <span style="color: #0F766E; font-size: 12pt;">${q.answer}</span>
        </div>
        <div style="font-size: 10pt; margin-top: 4pt; color: #374151;">
          <strong>Vị trí quét (Scanning Location):</strong> ${q.explanation?.scanningLocation || `Đoạn ${q.explanation?.paragraphLabel || 'A'}`}
        </div>
        <div style="font-size: 10pt; margin-top: 4pt; color: #1F2937;">
          <strong>Bằng chứng nguyên văn (Evidence Quote):</strong>
          <span class="highlight">"${q.explanation?.evidenceQuote || 'N/A'}"</span>
        </div>
        ${
          q.explanation?.paraphrasing && q.explanation.paraphrasing.length > 0
            ? `<div style="font-size: 9.5pt; margin-top: 4pt; color: #4B5563;">
                <strong>Cặp từ đồng nghĩa (Paraphrasing):</strong>
                ${q.explanation.paraphrasing.map((p) => `<em>"${p.questionTerm}"</em> ➔ <strong>"${p.passageTerm}"</strong>`).join('; ')}
              </div>`
            : ''
        }
        <div style="font-size: 9.5pt; margin-top: 4pt; color: #4B5563;">
          <strong>Phân tích bẫy đề thi (Distractor Analysis):</strong> ${q.explanation?.distractorAnalysis || 'Không có.'}
        </div>
      </div>
    `
      )
      .join('')}

    <!-- ACADEMIC VOCABULARY LIST -->
    ${
      matchingVocab.length > 0
        ? `
      <div class="page-break"></div>
      <h2>ACADEMIC VOCABULARY NOTEBOOK (SỔ TỪ VỰNG HỌC THUẬT)</h2>
      <p style="font-size: 10pt; color: #4B5563;">Từ vựng Band 7.0+ trích xuất tự động sát ngữ cảnh bài đọc:</p>
      <table class="vocab-table">
        <thead>
          <tr>
            <th style="width: 15%;">Từ vựng</th>
            <th style="width: 15%;">Phiên âm / Loại từ</th>
            <th style="width: 30%;">Nghĩa ngữ cảnh & Collocations</th>
            <th style="width: 40%;">Câu ví dụ trích từ bài đọc</th>
          </tr>
        </thead>
        <tbody>
          ${matchingVocab
            .map(
              (v) => `
            <tr>
              <td><strong style="color: #0F766E; font-size: 10.5pt;">${v.word}</strong></td>
              <td>${v.ipa || ''}<br><em style="color: #6B7280;">(${v.pos || 'n'})</em></td>
              <td>
                <strong>${v.contextualMeaning}</strong>
                ${v.extendedMeaning ? `<div style="font-size: 8.5pt; color: #6B7280; margin-top: 2pt;">${v.extendedMeaning}</div>` : ''}
              </td>
              <td style="font-style: italic; color: #374151;">"${v.example}"</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
        : ''
    }

    <div style="margin-top: 30pt; text-align: center; font-size: 9pt; color: #9CA3AF; border-top: 1pt solid #E5E7EB; padding-top: 8pt;">
      Tài liệu được số hóa và xuất tự động bởi LexiBand Studio — Nền tảng Giảng dạy & Luyện thi IELTS Reading
    </div>
  </div>
</body>
</html>
`;

  const blob = new Blob([htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const cleanTitle = passage.title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().slice(0, 40);
  const fileName = `${cleanTitle || 'IELTS_Reading'}_Cambridge_Exam.doc`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
