"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTocHtml = buildTocHtml;
const tocStyles = `
  @page {
    size: A4;
    margin: 20mm 15mm;
  }

  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: Arial, sans-serif;
    font-size: 11pt;
    color: #000000;
    line-height: 1.15;
    margin: 0;
    padding: 0;
  }

  .cover-page {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    text-align: center;
    padding-top: 50mm;
    padding-bottom: 20mm;
    page-break-after: always;
  }

  .cover-logo {
    display: block;
    margin: 0 auto 18pt;
    max-width: 180px;
    max-height: 64px;
  }

  .cover-title {
    margin: 0;
    font-size: 24pt;
    font-weight: bold;
    color: #0ecc8a;
  }

  .cover-subtitle {
    margin: 12pt 0 0;
    font-size: 14pt;
    color: #3d4a57;
  }

  .cover-version {
    margin: 8pt 0 0;
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #66707a;
  }

  .toc-page {
    page-break-after: always;
  }

  .toc-heading {
    margin: 0 0 20pt;
    font-size: 18pt;
    font-weight: bold;
    color: #0ecc8a;
  }

  .toc-content {
    margin-top: 20pt;
  }

  .toc-item {
    margin: 6pt 0;
    page-break-inside: avoid;
  }

  .toc-item-h1 {
    font-weight: bold;
    font-size: 11pt;
  }

  .toc-item-h2 {
    padding-left: 0.25in;
    font-size: 10pt;
  }

  .toc-item a {
    display: flex;
    align-items: baseline;
    color: #000000;
    text-decoration: none;
  }

  .toc-index {
    flex: 0 0 auto;
    min-width: 22pt;
    color: #0ecc8a;
    font-weight: bold;
  }

  .toc-text {
    flex: 0 1 auto;
    padding-right: 6pt;
  }

  .toc-leader {
    flex: 1 1 auto;
    border-bottom: 1px dotted #999;
    margin: 0 4pt;
    min-width: 20px;
  }
`;
function buildTocHtml({ title, subtitle, versionLabel, logoBase64, documents, }) {
    const tocItems = documents
        .map((doc, index) => {
        const levelClass = doc.level === 2 ? "toc-item toc-item-h2" : "toc-item toc-item-h1";
        return `
        <div class="${levelClass}">
          <a href="${escapeHtml(doc.url)}">
            <span class="toc-index">${index + 1}.</span>
            <span class="toc-text">${escapeHtml(doc.title)}</span>
            <span class="toc-leader"></span>
          </a>
        </div>`;
    })
        .join("");
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${tocStyles}</style>
</head>
<body>
  <div class="cover-page">
    <div class="cover-content">
      ${logoBase64
        ? `<img src="data:image/png;base64,${logoBase64}" class="cover-logo" alt="Kamiwaza Logo" />`
        : ""}
      <h1 class="cover-title">${escapeHtml(title)}</h1>
      <div class="cover-subtitle">${escapeHtml(subtitle)}</div>
      ${versionLabel ? `<div class="cover-version">${escapeHtml(versionLabel)}</div>` : ""}
    </div>
  </div>
  <div class="toc-page">
    <h2 class="toc-heading">Table of Contents</h2>
    <div class="toc-content">${tocItems}</div>
  </div>
</body>
</html>`;
}
function escapeHtml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
