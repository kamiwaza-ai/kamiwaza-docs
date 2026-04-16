"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inferTocSectionFromDocId = inferTocSectionFromDocId;
exports.buildTocHtml = buildTocHtml;
/**
 * Infer a PDF TOC section title from a docs route id when the sidebar did not
 * attach an explicit category label (matches main docs nav groupings).
 */
function inferTocSectionFromDocId(docId) {
    const id = docId === "" ? "intro" : docId;
    if (id === "intro" || id === "quickstart") {
        return "Getting started";
    }
    if (id.startsWith("installation/")) {
        return "Installation";
    }
    if (id === "configuration" ||
        id === "workroom-storage-s3" ||
        id === "routing-modes") {
        return "Configuration";
    }
    if (id.startsWith("security/")) {
        return "Security";
    }
    if (id.startsWith("federal/")) {
        return "Federal";
    }
    if (id.startsWith("models/")) {
        return "Models";
    }
    if (id === "app-garden" || id === "tool-garden") {
        return "Extensions";
    }
    if (id === "data-engine" ||
        id === "data-connectors" ||
        id === "data-catalog" ||
        id === "retrieval-service") {
        return "Distributed Data Engine";
    }
    if (id === "observability") {
        return "Observability";
    }
    if (id.startsWith("architecture/")) {
        return "Architecture";
    }
    if (id.startsWith("use-cases/")) {
        return "Use Cases";
    }
    if (id === "help-and-fixes") {
        return "Help & Fixes";
    }
    if (id.startsWith("team/")) {
        return "Our Team";
    }
    if (id.startsWith("sdk/")) {
        return "SDK";
    }
    return undefined;
}
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

  /* Primary: 1. Section — bold, flush; sub: 1.1 — regular, indented under primary text */
  .toc-section {
    margin: 0 0 8pt 0;
  }

  .toc-section:first-child {
    margin-top: 0;
  }

  .toc-section-entries {
    display: block;
    margin: 0;
    padding: 0 0 0 26pt;
    box-sizing: border-box;
  }

  /* Grouped TOC: parent row stays at the content margin; subs must sit clearly to the right
     (otherwise 26pt + index columns visually lines up with the parent title text). */
  .toc-section:not(.toc-section--flat) .toc-section-entries {
    padding-left: 44pt;
  }

  .toc-section--flat .toc-section-entries {
    padding-left: 0;
  }

  .toc-item {
    margin: 3pt 0;
    page-break-inside: avoid;
  }

  .toc-item-primary {
    font-size: 11pt;
  }

  .toc-item-primary a {
    font-weight: bold;
    color: #000000;
  }

  .toc-item-sub {
    font-size: 10.5pt;
  }

  .toc-item-sub a {
    font-weight: normal;
    color: #000000;
  }

  .toc-item a {
    display: flex;
    align-items: baseline;
    text-decoration: none;
  }

  .toc-index {
    flex: 0 0 auto;
    min-width: 26pt;
    padding-right: 4pt;
    font-variant-numeric: tabular-nums;
    color: #000000;
  }

  .toc-item-primary .toc-index {
    font-weight: bold;
  }

  .toc-item-sub .toc-index {
    font-weight: normal;
    min-width: 32pt;
  }

  .toc-text {
    flex: 0 1 auto;
    padding-right: 6pt;
  }

  .toc-item-primary .toc-page-num {
    font-weight: bold;
  }

  .toc-item-sub .toc-page-num {
    font-weight: normal;
  }

  .toc-leader {
    flex: 1 1 auto;
    border-bottom: 1px dotted #999;
    margin: 0 4pt;
    min-width: 20px;
  }

  .toc-page-num {
    flex: 0 0 auto;
    min-width: 22pt;
    text-align: right;
    font-variant-numeric: tabular-nums;
    color: #000000;
  }
`;
function tocPageSpan(entryPageNumbers, docIndex) {
    const p = entryPageNumbers?.[docIndex];
    if (p === undefined || p === null) {
        return "";
    }
    return `<span class="toc-page-num">${p}</span>`;
}
function buildTocHtml({ title, subtitle, versionLabel, logoBase64, entryPageNumbers, documents, }) {
    let docIndex = 0;
    let primaryNum = 0;
    const tocItemParts = [];
    for (const group of groupDocumentsForToc(documents)) {
        const sec = group.section?.trim();
        const docs = group.docs;
        if (!sec) {
            tocItemParts.push(`<div class="toc-section toc-section--flat">`);
            tocItemParts.push(`<div class="toc-section-entries">`);
            for (const doc of docs) {
                primaryNum++;
                const pageNum = tocPageSpan(entryPageNumbers, docIndex);
                tocItemParts.push(`
        <div class="toc-item toc-item-primary">
          <a href="${escapeHtml(doc.url)}">
            <span class="toc-index">${primaryNum}.</span>
            <span class="toc-text">${escapeHtml(doc.title)}</span>
            <span class="toc-leader"></span>${pageNum}
          </a>
        </div>`);
                docIndex++;
            }
            tocItemParts.push(`</div></div>`);
            continue;
        }
        primaryNum++;
        tocItemParts.push(`<div class="toc-section">`);
        // Always show section title + N.1, N.2, … so single-doc sections (e.g. Installation)
        // still appear under their parent name instead of as a lone "2. Doc title" row.
        const first = docs[0];
        const sectionPage = tocPageSpan(entryPageNumbers, docIndex);
        tocItemParts.push(`
        <div class="toc-item toc-item-primary">
          <a href="${escapeHtml(first.url)}">
            <span class="toc-index">${primaryNum}.</span>
            <span class="toc-text">${escapeHtml(sec)}</span>
            <span class="toc-leader"></span>${sectionPage}
          </a>
        </div>`);
        tocItemParts.push(`<div class="toc-section-entries">`);
        let subNum = 0;
        for (const doc of docs) {
            subNum++;
            const pageNum = tocPageSpan(entryPageNumbers, docIndex);
            tocItemParts.push(`
        <div class="toc-item toc-item-sub">
          <a href="${escapeHtml(doc.url)}">
            <span class="toc-index">${primaryNum}.${subNum}</span>
            <span class="toc-text">${escapeHtml(doc.title)}</span>
            <span class="toc-leader"></span>${pageNum}
          </a>
        </div>`);
            docIndex++;
        }
        tocItemParts.push(`</div>`);
        tocItemParts.push(`</div>`);
    }
    const tocItems = tocItemParts.join("");
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
/** Group consecutive documents that share the same effective TOC section. */
function groupDocumentsForToc(documents) {
    const groups = [];
    for (const doc of documents) {
        const effective = doc.section?.trim() || inferTocSectionFromDocId(doc.id);
        const prev = groups[groups.length - 1];
        if (!prev || (prev.section ?? "") !== (effective ?? "")) {
            groups.push({ section: effective, docs: [doc] });
        }
        else {
            prev.docs.push(doc);
        }
    }
    return groups;
}
