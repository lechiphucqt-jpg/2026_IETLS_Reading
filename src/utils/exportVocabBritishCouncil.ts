import { ReadingPassage, VocabEntry } from '../types/ielts';

/**
 * Export Pre-teach Vocabulary List to Microsoft Word (.doc/.docx)
 * Formatted according to official British Council & Cambridge Assessment English standards.
 */
export function exportVocabToWordBritishCouncil(
  passage: ReadingPassage,
  vocabList: VocabEntry[]
) {
  const matchingVocab = vocabList.filter((v) => v.passageId === passage.id);
  const now = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const htmlContent = `
<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${passage.title} - British Council IELTS Vocabulary</title>
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
      margin: 1.8cm 1.8cm 1.8cm 1.8cm;
      mso-header-margin: 1.0cm;
      mso-footer-margin: 1.0cm;
    }
    div.Section1 {
      page: Section1;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      color: #1E293B;
    }
    .bc-header {
      border-bottom: 3pt solid #002F6C;
      padding-bottom: 8pt;
      margin-bottom: 14pt;
    }
    .bc-top-row {
      display: table;
      width: 100%;
    }
    .bc-title {
      font-size: 15pt;
      font-weight: 800;
      color: #002F6C;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin: 0;
    }
    .bc-badge {
      font-size: 9pt;
      font-weight: bold;
      color: #E4002B;
      text-transform: uppercase;
      letter-spacing: 1pt;
    }
    .meta-box {
      background-color: #F8FAFC;
      border: 1pt solid #CBD5E1;
      border-left: 4pt solid #002F6C;
      padding: 8pt 12pt;
      margin-bottom: 16pt;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5pt;
    }
    .meta-table td {
      padding: 2.5pt 6pt;
    }
    .vocab-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10pt;
      font-size: 10pt;
    }
    .vocab-table th {
      background-color: #002F6C;
      color: #FFFFFF;
      font-weight: bold;
      text-align: left;
      padding: 7pt 8pt;
      border: 1pt solid #002F6C;
      font-size: 9pt;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
    }
    .vocab-table td {
      border: 1pt solid #E2E8F0;
      padding: 7pt 8pt;
      vertical-align: top;
    }
    .vocab-table tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .word-title {
      font-size: 11pt;
      font-weight: bold;
      color: #002F6C;
      margin-bottom: 2pt;
    }
    .word-ipa {
      font-family: 'Lucida Sans', Monaco, monospace;
      color: #475569;
      font-size: 9pt;
    }
    .word-pos {
      font-size: 8pt;
      color: #0F766E;
      background-color: #CCFBF1;
      padding: 1pt 4pt;
      border-radius: 3pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .meaning {
      font-weight: 600;
      color: #0F172A;
    }
    .example-quote {
      font-style: italic;
      color: #334155;
      background-color: #FFFBEB;
      border-left: 2pt solid #F59E0B;
      padding: 4pt 6pt;
      margin-top: 3pt;
      font-size: 9pt;
    }
    .collocation-box {
      font-size: 8.5pt;
      color: #475569;
      background-color: #F1F5F9;
      padding: 3pt 5pt;
      border-radius: 3pt;
      margin-top: 2pt;
    }
    .footer {
      margin-top: 24pt;
      padding-top: 8pt;
      border-top: 1pt solid #CBD5E1;
      font-size: 8.5pt;
      color: #64748B;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="Section1">
    <!-- British Council Academic Header -->
    <div class="bc-header">
      <div class="bc-badge">BRITISH COUNCIL · IELTS PREPARATION ACADEMY</div>
      <h1 class="bc-title">IELTS Academic Reading — Pre-teach Vocabulary Dossier</h1>
      <div style="font-size: 9pt; color: #475569; margin-top: 2pt;">
        Chuẩn hóa học thuật Anh ngữ Quốc tế · Tài liệu giảng dạy chuyên sâu
      </div>
    </div>

    <!-- Lesson Metadata Box -->
    <div class="meta-box">
      <table class="meta-table">
        <tr>
          <td style="width: 18%; font-weight: bold; color: #002F6C;">Bài đọc:</td>
          <td style="width: 47%; font-weight: bold; color: #0F172A;">${passage.title}</td>
          <td style="width: 15%; font-weight: bold; color: #002F6C;">Mục tiêu Band:</td>
          <td style="width: 20%; font-weight: bold; color: #0F766E;">${passage.bandLevel}</td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #002F6C;">Nguồn sách:</td>
          <td>${passage.sourceBook}</td>
          <td style="font-weight: bold; color: #002F6C;">Tổng số từ:</td>
          <td><strong>${matchingVocab.length}</strong> từ vựng trọng tâm</td>
        </tr>
        <tr>
          <td style="font-weight: bold; color: #002F6C;">Chủ đề IELTS:</td>
          <td>${passage.topic}</td>
          <td style="font-weight: bold; color: #002F6C;">Giảng viên:</td>
          <td style="color: #002F6C; font-weight: bold;">Tiếng Anh Thầy Phúc</td>
        </tr>
      </table>
    </div>

    <!-- Vocabulary Academic Table -->
    <table class="vocab-table">
      <thead>
        <tr>
          <th style="width: 5%; text-align: center;">STT</th>
          <th style="width: 23%;">Từ vựng & Phát âm</th>
          <th style="width: 24%;">Nghĩa ngữ cảnh trong bài</th>
          <th style="width: 20%;">Collocations & Mở rộng</th>
          <th style="width: 28%;">Câu ví dụ trích từ bài đọc</th>
        </tr>
      </thead>
      <tbody>
        ${matchingVocab
          .map(
            (v, idx) => `
          <tr>
            <td style="text-align: center; font-weight: bold; color: #64748B;">${idx + 1}</td>
            <td>
              <div class="word-title">${v.word}</div>
              <div style="margin-top: 2pt;">
                <span class="word-ipa">${v.ipa || ''}</span>
                <span class="word-pos">${v.pos || 'acad'}</span>
              </div>
            </td>
            <td>
              <div class="meaning">${v.contextualMeaning}</div>
            </td>
            <td>
              ${
                v.extendedMeaning
                  ? `<div class="collocation-box">${v.extendedMeaning}</div>`
                  : '<span style="color: #94A3B8; font-size: 8.5pt;">—</span>'
              }
            </td>
            <td>
              ${
                v.example
                  ? `<div class="example-quote">"${v.example}"</div>`
                  : '<span style="color: #94A3B8; font-size: 8.5pt;">—</span>'
              }
            </td>
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>

    <!-- Footer -->
    <div class="footer">
      British Council & Cambridge Assessment English Standards · Biên soạn bởi: <strong>Tiếng Anh Thầy Phúc</strong> · Xuất ngày: ${now}
    </div>
  </div>
</body>
</html>
`;

  const blob = new Blob([htmlContent], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const cleanTitle = passage.title.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().slice(0, 30);
  const fileName = `${cleanTitle || 'IELTS_Passage'}_Preteach_Vocab_BritishCouncil.doc`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Pre-teach Vocabulary List to PDF (via pixel-perfect print layout)
 * Formatted with official British Council academic styling and A4 page geometry.
 */
export function exportVocabToPdfBritishCouncil(
  passage: ReadingPassage,
  vocabList: VocabEntry[]
) {
  const matchingVocab = vocabList.filter((v) => v.passageId === passage.id);
  const now = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const printWindow = window.open('', '_blank', 'width=1000,height=800');
  if (!printWindow) {
    alert('Trình duyệt đang chặn cửa sổ pop-up. Vui lòng cho phép pop-up để xuất PDF.');
    return;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>${passage.title} - British Council Vocabulary Dossier</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 15mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #0F172A;
      background: #FFFFFF;
      margin: 0;
      padding: 10px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 3px solid #002F6C;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .bc-tag {
      font-size: 8pt;
      font-weight: 800;
      letter-spacing: 1.5px;
      color: #E4002B;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .doc-title {
      font-size: 15pt;
      font-weight: 800;
      color: #002F6C;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .author-tag {
      font-size: 9pt;
      font-weight: bold;
      color: #0F766E;
      text-align: right;
    }
    .meta-box {
      background: #F8FAFC;
      border: 1px solid #CBD5E1;
      border-left: 4px solid #002F6C;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 8px;
      font-size: 9pt;
    }
    .meta-item {
      display: flex;
      gap: 6px;
    }
    .meta-label {
      font-weight: bold;
      color: #002F6C;
      min-width: 80px;
    }
    .vocab-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-top: 8px;
    }
    .vocab-table th {
      background-color: #002F6C;
      color: #FFFFFF;
      font-weight: bold;
      text-align: left;
      padding: 6px 8px;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid #002F6C;
    }
    .vocab-table td {
      border: 1px solid #E2E8F0;
      padding: 7px 8px;
      vertical-align: top;
    }
    .vocab-table tr:nth-child(even) {
      background-color: #F8FAFC;
    }
    .vocab-table tr {
      page-break-inside: avoid;
    }
    .word-name {
      font-size: 11pt;
      font-weight: 800;
      color: #002F6C;
    }
    .ipa-badge {
      font-family: monospace;
      font-size: 8.5pt;
      color: #475569;
      font-weight: 600;
    }
    .pos-badge {
      display: inline-block;
      font-size: 7.5pt;
      font-weight: bold;
      text-transform: uppercase;
      background-color: #E6FFFA;
      color: #0F766E;
      border: 1px solid #A7F3D0;
      padding: 1px 4px;
      border-radius: 4px;
      margin-left: 4px;
    }
    .meaning-vi {
      font-weight: 700;
      color: #0F172A;
      font-size: 9.5pt;
    }
    .collocation-text {
      font-size: 8pt;
      color: #475569;
      background: #F1F5F9;
      padding: 4px 6px;
      border-radius: 4px;
      margin-top: 2px;
      line-height: 1.35;
    }
    .example-box {
      font-style: italic;
      color: #1E293B;
      background-color: #FEF9C3;
      border-left: 3px solid #EAB308;
      padding: 4px 6px;
      border-radius: 0 4px 4px 0;
      font-size: 8.5pt;
      line-height: 1.35;
    }
    .footer-note {
      margin-top: 18px;
      padding-top: 8px;
      border-top: 1px solid #CBD5E1;
      text-align: center;
      font-size: 8pt;
      color: #64748B;
    }
    .print-bar {
      background: #002F6C;
      color: white;
      padding: 10px 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 8px;
      margin-bottom: 14px;
    }
    @media print {
      .print-bar {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div>
      <strong>British Council IELTS Pre-teach Vocabulary Export</strong>
      <div style="font-size: 8pt; opacity: 0.9;">Nhấn nút bên cạnh hoặc dùng phím Ctrl + P để lưu file PDF</div>
    </div>
    <button onclick="window.print()" style="background: #E4002B; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-weight: bold; cursor: pointer;">
      🖨️ In / Lưu thành file PDF
    </button>
  </div>

  <div class="header-bar">
    <div>
      <div class="bc-tag">BRITISH COUNCIL · IELTS PREPARATION ACADEMY</div>
      <h1 class="doc-title">Pre-teach Vocabulary Dossier</h1>
    </div>
    <div class="author-tag">
      <div>Giảng dạy: <strong>Tiếng Anh Thầy Phúc</strong></div>
      <div style="font-size: 7.5pt; color: #64748B; font-weight: normal;">Ngày xuất: ${now}</div>
    </div>
  </div>

  <div class="meta-box">
    <div>
      <div class="meta-item">
        <span class="meta-label">Bài đọc:</span>
        <strong>${passage.title}</strong>
      </div>
      <div class="meta-item" style="margin-top: 4px;">
        <span class="meta-label">Nguồn sách:</span>
        <span>${passage.sourceBook}</span>
      </div>
    </div>
    <div>
      <div class="meta-item">
        <span class="meta-label">Chủ đề:</span>
        <span>${passage.topic}</span>
      </div>
      <div class="meta-item" style="margin-top: 4px;">
        <span class="meta-label">Mục tiêu:</span>
        <strong style="color: #0F766E;">${passage.bandLevel} · ${matchingVocab.length} Từ vựng</strong>
      </div>
    </div>
  </div>

  <table class="vocab-table">
    <thead>
      <tr>
        <th style="width: 5%; text-align: center;">STT</th>
        <th style="width: 24%;">Từ vựng & Phát âm</th>
        <th style="width: 24%;">Nghĩa ngữ cảnh trong bài</th>
        <th style="width: 20%;">Collocations & Mở rộng</th>
        <th style="width: 27%;">Câu ví dụ trích từ bài đọc</th>
      </tr>
    </thead>
    <tbody>
      ${matchingVocab
        .map(
          (v, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold; color: #64748B;">${idx + 1}</td>
          <td>
            <div class="word-name">${v.word}</div>
            <div style="margin-top: 2px;">
              <span class="ipa-badge">${v.ipa || ''}</span>
              <span class="pos-badge">${v.pos || 'acad'}</span>
            </div>
          </td>
          <td>
            <div class="meaning-vi">${v.contextualMeaning}</div>
          </td>
          <td>
            ${
              v.extendedMeaning
                ? `<div class="collocation-text">${v.extendedMeaning}</div>`
                : '<span style="color: #94A3B8;">—</span>'
            }
          </td>
          <td>
            ${
              v.example
                ? `<div class="example-box">"${v.example}"</div>`
                : '<span style="color: #94A3B8;">—</span>'
            }
          </td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>

  <div class="footer-note">
    Chuẩn học thuật British Council & Cambridge Assessment English · Biên soạn & Bản quyền: <strong>Tiếng Anh Thầy Phúc</strong>
  </div>

  <script>
    window.onload = function() {
      // Auto trigger print after brief render delay
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
