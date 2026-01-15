#!/usr/bin/env node
/**
 * Kamiwaza Documentation PDF Generator
 * Reads markdown files and generates professionally formatted PDFs
 * Two-pass generation with accurate page number extraction
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import puppeteer from 'puppeteer';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';

// Configuration interfaces
interface DocumentConfig {
  id: string;
  title: string;
  path?: string;
}

interface CoverConfig {
  title: string;
  subtitle: string;
  includeVersion: boolean;
}

interface ProfileConfig {
  name: string;
  filename: string;
  cover: CoverConfig;
  documents: DocumentConfig[];
  options: {
    includeTOC: boolean;
    includePageNumbers: boolean;
  };
}

interface PDFConfig {
  profiles: Record<string, ProfileConfig>;
  settings: {
    pdf: {
      format: string;
      printBackground: boolean;
      preferCSSPageSize: boolean;
      margin: {
        top: string;
        right: string;
        bottom: string;
        left: string;
      };
    };
  };
}

interface MarkdownFile {
  path: string;
  relativePath: string;
  content: string;
  title: string;
  htmlContent: string;
}

class PDFGenerator {
  private config: PDFConfig;
  private docsPath: string;
  private outputPath: string;
  private docTitle: string;
  private subtitle: string;
  private version: string;
  private includeVersion: boolean;
  private markdownFiles: MarkdownFile[] = [];
  private logoBase64: string = '';
  private pageNumbers: Map<string, number> = new Map();
  private md: MarkdownIt;

  constructor(configPath: string, docsPath: string, profile: string, version: string) {
    // Load config
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(configContent) as PDFConfig;

    const profileConfig = this.config.profiles[profile];
    if (!profileConfig) {
      throw new Error(`Profile "${profile}" not found in config`);
    }

    this.docsPath = docsPath;
    this.outputPath = path.join(
      process.cwd(),
      'dist',
      'pdf',
      `${profileConfig.filename}-v${version}.pdf`
    );
    this.docTitle = profileConfig.cover.title;
    this.subtitle = profileConfig.cover.subtitle;
    this.version = version;
    this.includeVersion = profileConfig.cover.includeVersion;

    // Initialize markdown-it
    this.md = new MarkdownIt({
      html: true,
      breaks: true,
      linkify: true,
    });

    console.log(`\n📄 Generating PDF for profile: ${profile}`);
    console.log(`📌 Version: ${version}\n`);
  }

  /**
   * Collect markdown files from docs directory based on profile configuration
   */
  private collectMarkdownFiles(profileConfig: ProfileConfig): void {
    console.log('📑 Collecting markdown files...\n');

    for (const doc of profileConfig.documents) {
      try {
        // Resolve markdown file path
        const docPath = doc.path || doc.id;
        let mdFilePath: string;

        // Try various path combinations
        const possiblePaths = [
          path.join(this.docsPath, `${docPath}.md`),
          path.join(this.docsPath, `${docPath}.mdx`),
          path.join(this.docsPath, docPath, 'index.md'),
          path.join(this.docsPath, docPath, 'index.mdx'),
          path.join(this.docsPath, `${docPath}/README.md`),
        ];

        mdFilePath = possiblePaths.find(p => fs.existsSync(p)) || '';

        if (!mdFilePath || !fs.existsSync(mdFilePath)) {
          console.log(`  ⚠️  Skipping: ${doc.title} (file not found at ${docPath})`);
          continue;
        }

        const content = fs.readFileSync(mdFilePath, 'utf8');
        const relativePath = path.relative(this.docsPath, mdFilePath);

        this.markdownFiles.push({
          path: mdFilePath,
          relativePath,
          content,
          title: doc.title,
          htmlContent: '',
        });

        console.log(`  ✅ ${doc.title}`);
      } catch (error) {
        console.error(`  ❌ Error loading ${doc.title}:`, error);
      }
    }

    console.log(`\n📊 Collected ${this.markdownFiles.length} markdown files\n`);
  }

  /**
   * Remove frontmatter from markdown content
   */
  private removeFrontmatter(content: string): string {
    const { content: cleanContent } = matter(content);
    return cleanContent;
  }

  /**
   * Convert Docusaurus admonitions to HTML
   */
  private convertAdmonitions(content: string): string {
    const admonitionStyles: Record<string, { icon: string; color: string; bg: string; label: string }> = {
      tip: { icon: '💡', color: '#00a86b', bg: '#e6f7f0', label: 'Tip' },
      note: { icon: '📝', color: '#1976d2', bg: '#e3f2fd', label: 'Note' },
      info: { icon: 'ℹ️', color: '#0288d1', bg: '#e1f5fe', label: 'Info' },
      warning: { icon: '⚠️', color: '#f57c00', bg: '#fff3e0', label: 'Warning' },
      caution: { icon: '⚠️', color: '#f57c00', bg: '#fff3e0', label: 'Caution' },
      danger: { icon: '🚨', color: '#d32f2f', bg: '#ffebee', label: 'Danger' },
    };

    const lines = content.split('\n');
    const result: string[] = [];
    let inAdmonition = false;
    let admonitionType = '';
    let admonitionTitle = '';
    let admonitionContent: string[] = [];

    for (const line of lines) {
      const stripped = line.trim();
      const admonitionMatch = stripped.match(/^:::(\w+)\s*(.*)$/);

      if (admonitionMatch && !inAdmonition) {
        inAdmonition = true;
        admonitionType = admonitionMatch[1].toLowerCase();
        admonitionTitle = admonitionMatch[2].trim();
        admonitionContent = [];
        continue;
      }

      if (inAdmonition && stripped === ':::') {
        const style = admonitionStyles[admonitionType] || admonitionStyles.note;
        const title = admonitionTitle || style.label;

        result.push(
          `<div style="border-left: 4px solid ${style.color}; background-color: ${style.bg}; padding: 12px 16px; margin: 12px 0; border-radius: 4px;">`,
          `<p style="margin: 0 0 8px 0; font-weight: bold; color: ${style.color};">${style.icon} ${title}</p>`
        );

        const contentText = admonitionContent.join('\n').trim();
        if (contentText) {
          result.push(`<p style="margin: 0; color: #333;">${contentText}</p>`);
        }

        result.push('</div>', '');

        inAdmonition = false;
        admonitionType = '';
        admonitionTitle = '';
        admonitionContent = [];
        continue;
      }

      if (inAdmonition) {
        admonitionContent.push(line);
      } else {
        result.push(line);
      }
    }

    return result.join('\n');
  }

  /**
   * Convert mermaid blocks to placeholder
   */
  private convertMermaidBlocks(content: string): string {
    const placeholder = '<div style="border: 1px solid #ccc; background-color: #f9f9f9; padding: 16px; margin: 12px 0; border-radius: 4px; text-align: center; color: #666;"><em>[Diagram - see online documentation for interactive version]</em></div>\n';
    return content.replace(/```mermaid\s*.*?```/gs, placeholder);
  }

  /**
   * Remove images from content
   */
  private handleImages(content: string): string {
    return content.replace(/!\[([^\]]*)\]\([^)]+\)/g, '');
  }

  /**
   * Convert markdown to HTML
   */
  private convertMarkdownToHTML(): void {
    console.log('🔄 Converting markdown to HTML...\n');

    for (const mdFile of this.markdownFiles) {
      try {
        let content = mdFile.content;

        // Process content
        content = this.removeFrontmatter(content);
        content = this.convertAdmonitions(content);
        content = this.convertMermaidBlocks(content);
        content = this.handleImages(content);

        // Convert to HTML
        const html = this.md.render(content);
        mdFile.htmlContent = html;

        console.log(`  ✅ ${mdFile.title}`);
      } catch (error) {
        console.error(`  ❌ Error converting ${mdFile.title}:`, error);
        mdFile.htmlContent = `<p>Error converting file: ${error}</p>`;
      }
    }

    console.log();
  }

  /**
   * Decode HTML entities
   */
  private decodeHTMLEntities(text: string): string {
    const entities: Record<string, string> = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&#39;': "'",
      '&nbsp;': ' ',
    };

    return text.replace(/&[a-z]+;|&#\d+;/gi, (match) => entities[match] || match);
  }

  /**
   * Sanitize text for use as HTML ID
   */
  private sanitizeId(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Generate table of contents HTML
   */
  private generateTOC(includePageNumbers: boolean = false): string {
    console.log('📋 Generating table of contents...');

    const tocItems: string[] = ['<div class="toc-content">'];
    let h1Counter = 0;

    for (const mdFile of this.markdownFiles) {
      h1Counter++;
      const fileId = this.sanitizeId(mdFile.relativePath);
      const h1PageNum = includePageNumbers && this.pageNumbers.has(fileId)
        ? this.pageNumbers.get(fileId)
        : null;

      // H1 entry
      if (h1PageNum !== null) {
        tocItems.push(
          `<div class="toc-item-h1">`,
          `<a href="#${fileId}">`,
          `<span class="toc-text">${h1Counter}. ${mdFile.title}</span>`,
          `<span class="toc-leader"></span>`,
          `<span class="toc-page-num">${h1PageNum}</span>`,
          `</a>`,
          `</div>`
        );
      } else {
        tocItems.push(
          `<div class="toc-item-h1">`,
          `<a href="#${fileId}">${h1Counter}. ${mdFile.title}</a>`,
          `</div>`
        );
      }

      // Extract and add H2 entries
      const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
      let h2Counter = 0;
      let match: RegExpExecArray | null;

      while ((match = h2Regex.exec(mdFile.htmlContent)) !== null) {
        h2Counter++;
        let h2Text = match[1].replace(/<[^>]*>/g, '').trim();

        // Decode HTML entities (&amp; -> &, etc.)
        h2Text = this.decodeHTMLEntities(h2Text);

        // Strip leading numbers from H2 text (e.g., "1. Auth" -> "Auth")
        h2Text = h2Text.replace(/^\d+[\.\)]\s*/, '');

        const h2Id = `${fileId}-h2-${h2Counter - 1}`;

        // Add ID to H2 in HTML content
        mdFile.htmlContent = mdFile.htmlContent.replace(
          match[0],
          match[0].replace('<h2', `<h2 id="${h2Id}"`)
        );

        const h2PageNum = includePageNumbers && this.pageNumbers.has(h2Id)
          ? this.pageNumbers.get(h2Id)
          : null;

        if (h2PageNum !== null) {
          tocItems.push(
            `<div class="toc-item-h2">`,
            `<a href="#${h2Id}">`,
            `<span class="toc-text">${h1Counter}.${h2Counter} ${h2Text}</span>`,
            `<span class="toc-leader"></span>`,
            `<span class="toc-page-num">${h2PageNum}</span>`,
            `</a>`,
            `</div>`
          );
        } else {
          tocItems.push(
            `<div class="toc-item-h2">`,
            `<a href="#${h2Id}">${h1Counter}.${h2Counter} ${h2Text}</a>`,
            `</div>`
          );
        }
      }
    }

    tocItems.push('</div>');
    return tocItems.join('\n');
  }

  /**
   * Load logo and convert to base64
   */
  private loadLogo(): void {
    const logoPath = path.join(process.cwd(), 'kamiwaza-logo.png');
    if (fs.existsSync(logoPath)) {
      const logoData = fs.readFileSync(logoPath);
      this.logoBase64 = logoData.toString('base64');
    } else {
      console.log('⚠️  Logo not found at kamiwaza-logo.png');
    }
  }

  /**
   * Generate header HTML
   */
  private generateHeaderHTML(): string {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const logoImg = this.logoBase64
      ? `<img src='data:image/png;base64,${this.logoBase64}' style='height: 15mm; width: auto; vertical-align: bottom;'>`
      : '';

    return `<div style="width: 100%; margin: 0 auto; max-width: calc(100% - 40mm); display: table; font-family: Arial, sans-serif; font-size: 10pt; border-bottom: 1pt solid #0ecc8a; padding-bottom: 3pt;">
    <div style="display: table-cell; vertical-align: bottom; text-align: left;">
        ${logoImg}
    </div>
    <div style="display: table-cell; vertical-align: bottom; text-align: right; line-height: 1.2;">
        <div>${this.docTitle}</div>
        <div>${currentDate}</div>
        <div>${this.version}</div>
    </div>
</div>`;
  }

  /**
   * Generate footer HTML
   */
  private generateFooterHTML(): string {
    return `<div style="width: 100%; margin: 0 auto; max-width: calc(100% - 40mm); display: flex; justify-content: space-between; align-items: center; padding-top: 3pt; font-family: Arial, sans-serif; font-size: 10pt; border-top: 1pt solid #0ecc8a;">
    <div>kamiwaza.ai</div>
    <div>Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>
</div>`;
  }

  /**
   * Generate complete HTML document
   */
  private generateHTML(includePageNumbers: boolean = false): string {
    console.log('📝 Generating HTML document...');

    this.loadLogo();

    // Load CSS
    const cssPath = path.join(process.cwd(), 'templates', 'print-styles.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Generate TOC
    const tocHTML = this.generateTOC(includePageNumbers);

    // Generate content
    const contentParts: string[] = [];
    for (const mdFile of this.markdownFiles) {
      const fileId = this.sanitizeId(mdFile.relativePath);
      contentParts.push(`<div id="${fileId}" class="doc-section">`);
      contentParts.push(mdFile.htmlContent);
      contentParts.push('</div>');
    }

    const contentHTML = contentParts.join('\n');

    // Generate complete HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${this.docTitle}</title>
    <style>
${css}
    </style>
</head>
<body>
<div class="cover-page">
    <div class="cover-content">
        ${this.logoBase64 ? `<img src='data:image/png;base64,${this.logoBase64}' alt='Logo' class='cover-logo'>` : ''}
        <h1 class="cover-title">${this.docTitle}</h1>
        ${this.subtitle ? `<div class="subtitle">${this.subtitle}</div>` : ''}
        ${this.includeVersion ? `<div class="version">Version ${this.version}</div>` : ''}
    </div>
</div>
<div class="toc-page">
    <h2 class="toc-heading">Table of Contents</h2>
    ${tocHTML}
</div>
<div class="doc-content">
    ${contentHTML}
</div>
</body>
</html>`;

    return html;
  }

  /**
   * Generate PDF from HTML
   */
  private async generatePDF(htmlContent: string, outputPath: string, includeHeaderFooter: boolean = true): Promise<void> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: includeHeaderFooter,
        headerTemplate: includeHeaderFooter ? this.generateHeaderHTML() : '<span></span>',
        footerTemplate: includeHeaderFooter ? this.generateFooterHTML() : '<span></span>',
        margin: {
          top: '30mm',
          right: '20mm',
          bottom: '25mm',
          left: '20mm',
        },
      });

      const stats = fs.statSync(outputPath);
      console.log(`✅ PDF generated: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract page numbers from PDF
   */
  private async extractPageNumbers(pdfPath: string): Promise<void> {
    console.log('\n🔍 Extracting page numbers from PDF...');

    // Read PDF file
    const pdfBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(pdfBuffer);

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDocument = await loadingTask.promise;
    const totalPages = pdfDocument.numPages;

    console.log(`  Found ${totalPages} pages in PDF`);

    // Extract text from each page
    const pageTexts: string[] = [];
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      // Join text items with space, handling empty items
      const text = textContent.items
        .map((item: any) => item.str)
        .filter((str: string) => str.trim().length > 0)
        .join(' ');
      pageTexts.push(text);
    }

    // Find content start (after TOC)
    let contentStart = 3;
    for (let i = 1; i < Math.min(15, totalPages); i++) {
      const textLower = pageTexts[i].toLowerCase();
      if (textLower.includes('table of contents')) {
        contentStart = i + 1;
      }
    }

    console.log(`  Content starts at page ${contentStart + 1}`);

    // Find each section
    let currentPage = contentStart;
    for (const mdFile of this.markdownFiles) {
      const fileId = this.sanitizeId(mdFile.relativePath);
      const titleLower = mdFile.title.toLowerCase();

      let found = false;
      for (let i = currentPage; i < totalPages; i++) {
        if (pageTexts[i].toLowerCase().includes(titleLower)) {
          this.pageNumbers.set(fileId, i + 1);
          currentPage = i;
          found = true;
          break;
        }
      }

      if (!found) {
        this.pageNumbers.set(fileId, currentPage + 1);
      }

      // Find H2s
      const h2Regex = /<h2[^>]*id="([^"]+)"[^>]*>(.*?)<\/h2>/gi;
      let h2Match: RegExpExecArray | null;
      let h2Index = 0;
      let lastFoundPage = currentPage;

      while ((h2Match = h2Regex.exec(mdFile.htmlContent)) !== null) {
        h2Index++;
        const h2Id = h2Match[1];
        let h2Text = h2Match[2].replace(/<[^>]*>/g, '').trim();

        // Decode HTML entities (&amp; -> &, etc.)
        h2Text = this.decodeHTMLEntities(h2Text);

        // Strip leading numbers from H2 text for search (e.g., "1. Auth" -> "Auth")
        h2Text = h2Text.replace(/^\d+[\.\)]\s*/, '');

        // The PDF renders H2 with CSS counter prefix: "1.X SectionName"
        // So we need to search for the counter prefix + text
        const h1Num = this.markdownFiles.indexOf(mdFile) + 1;
        const prefixedH2Text = `${h1Num}.${h2Index} ${h2Text}`;

        // Try multiple search variations to handle PDF text extraction quirks
        const searchVariations = [
          prefixedH2Text.toLowerCase(),
          // Remove spaces to handle "Con fi guration" -> "Configuration"
          prefixedH2Text.toLowerCase().replace(/\s+/g, ''),
          h2Text.toLowerCase(),
          h2Text.toLowerCase().replace(/\s+/g, ''),
        ];

        let h2Found = false;
        // Always start from parent document's page, not last H2 page (handles same-page H2s)
        for (let i = currentPage; i < totalPages; i++) {
          const pageTextLower = pageTexts[i].toLowerCase();
          const pageTextNoSpaces = pageTextLower.replace(/\s+/g, '');

          for (const searchText of searchVariations) {
            const textToSearch = searchText.includes(prefixedH2Text.toLowerCase().substring(0, 3))
              ? pageTextLower
              : pageTextNoSpaces;

            if (textToSearch.includes(searchText)) {
              // Only accept this page if it's >= last found page (maintains order)
              if (i >= lastFoundPage) {
                this.pageNumbers.set(h2Id, i + 1);
                lastFoundPage = i;
                h2Found = true;
                break;
              }
            }
          }

          if (h2Found) break;
        }

        if (!h2Found) {
          // Debug: Log when we can't find an H2
          if (process.env.DEBUG_PDF) {
            console.log(`  ⚠️  Could not find H2: "${prefixedH2Text}" (searching from page ${currentPage + 1})`);
          }
          // Default to parent section's page number
          this.pageNumbers.set(h2Id, this.pageNumbers.get(fileId) || lastFoundPage + 1);
        }
      }
    }

    console.log(`  Extracted ${this.pageNumbers.size} page number mappings\n`);
  }

  /**
   * Main generation process
   */
  async generate(profile: string): Promise<void> {
    const profileConfig = this.config.profiles[profile];

    // Collect and convert markdown files
    this.collectMarkdownFiles(profileConfig);
    this.convertMarkdownToHTML();

    // Ensure output directory exists
    const outputDir = path.dirname(this.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (profileConfig.options.includeTOC) {
      console.log('📋 Two-pass generation for accurate page numbers...\n');

      // Pass 1: Generate without page numbers
      console.log('Pass 1: Generating PDF without page numbers...');
      const html1 = this.generateHTML(false);
      const tempPath = path.join(outputDir, `temp_${path.basename(this.outputPath)}`);
      await this.generatePDF(html1, tempPath, false);

      // Extract page numbers
      await this.extractPageNumbers(tempPath);

      // Clean up temp file
      fs.unlinkSync(tempPath);

      // Pass 2: Generate with page numbers
      console.log('Pass 2: Generating final PDF with page numbers...');
      const html2 = this.generateHTML(true);
      await this.generatePDF(html2, this.outputPath, true);
    } else {
      // Single pass
      const html = this.generateHTML(false);
      await this.generatePDF(html, this.outputPath, true);
    }

    console.log(`\n✅ PDF generated successfully!`);
    console.log(`📍 Location: ${this.outputPath}\n`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const profileIndex = args.indexOf('--profile');
  const versionIndex = args.indexOf('--version');

  const profile = profileIndex >= 0 ? args[profileIndex + 1] : 'offline-install';
  const version = versionIndex >= 0 ? args[versionIndex + 1] : '0.9.2';

  const configPath = path.join(process.cwd(), 'pdf-config.yaml');
  const docsPath = path.join(process.cwd(), 'docs', 'versioned_docs', `version-${version}`);

  if (!fs.existsSync(docsPath)) {
    console.error(`❌ Documentation not found for version ${version} at ${docsPath}`);
    console.error(`   Make sure the version exists in docs/versioned_docs/`);
    process.exit(1);
  }

  const generator = new PDFGenerator(configPath, docsPath, profile, version);
  await generator.generate(profile);
}

main().catch(error => {
  console.error('❌ Error generating PDF:', error);
  process.exit(1);
});
