#!/usr/bin/env node

/**
 * PDF Documentation Generator
 *
 * Generates PDF documentation from Docusaurus site based on profiles
 * defined in pdf-config.yaml
 *
 * Usage:
 *   npm run pdf -- --profile offline-install --version 0.5.1
 *   npm run pdf -- --profile full-docs
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as yaml from 'js-yaml';
import puppeteer, { Browser, Page } from 'puppeteer';
import { PDFDocument } from 'pdf-lib';
import { spawn, ChildProcess } from 'child_process';

interface PDFConfig {
  profiles: Record<string, ProfileConfig>;
  settings: GlobalSettings;
}

interface ProfileConfig {
  name: string;
  description: string;
  filename: string;
  cover: CoverConfig;
  documents: DocumentConfig[];
  options: PDFOptions;
}

interface CoverConfig {
  title: string;
  subtitle: string;
  includeVersion: boolean;
  includeLogo: boolean;
}

interface DocumentConfig {
  id: string;
  title: string;
}

interface PDFOptions {
  includeTOC: boolean;
  includePageNumbers: boolean;
  includeHeaders: boolean;
  includeFooters: boolean;
  pageNumberStart: number;
}

interface GlobalSettings {
  defaultVersion: string;
  outputDir: string;
  pdf: PDFSettings;
  server: ServerSettings;
  css: CSSSettings;
}

interface PDFSettings {
  format: string;
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground: boolean;
  preferCSSPageSize: boolean;
}

interface ServerSettings {
  port: number;
  baseUrl: string;
}

interface CSSSettings {
  customStylesheet: string;
}

class PDFGenerator {
  private config: PDFConfig;
  private projectRoot: string;
  private browser: Browser | null = null;
  private server: ChildProcess | null = null;

  constructor(configPath: string) {
    this.projectRoot = path.resolve(__dirname, '..');
    const configFile = fs.readFileSync(configPath, 'utf8');
    this.config = yaml.load(configFile) as PDFConfig;
  }

  async generate(profileName: string, version?: string): Promise<void> {
    console.log(`\n📄 Generating PDF for profile: ${profileName}`);

    const profile = this.config.profiles[profileName];
    if (!profile) {
      throw new Error(`Profile "${profileName}" not found in pdf-config.yaml`);
    }

    const targetVersion = version || this.config.settings.defaultVersion;
    console.log(`📌 Version: ${targetVersion}`);

    // Ensure output directory exists
    const outputDir = path.join(this.projectRoot, this.config.settings.outputDir);
    await fs.ensureDir(outputDir);

    try {
      // Start local server
      await this.startServer();

      // Launch browser
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      // Generate PDFs for each document
      const pdfBuffers: Buffer[] = [];

      console.log(`\n📑 Generating ${profile.documents.length} document(s)...\n`);

      for (const doc of profile.documents) {
        const pdfBuffer = await this.generateDocumentPDF(doc, targetVersion, profile);
        pdfBuffers.push(pdfBuffer);
      }

      // Merge PDFs
      console.log('\n📦 Merging PDFs...');
      const mergedPDF = await this.mergePDFs(pdfBuffers);

      // Save final PDF
      const filename = `${profile.filename}-v${targetVersion}.pdf`;
      const outputPath = path.join(outputDir, filename);
      await fs.writeFile(outputPath, mergedPDF);

      console.log(`\n✅ PDF generated successfully!`);
      console.log(`📍 Location: ${outputPath}`);
      console.log(`📊 Size: ${(mergedPDF.length / 1024 / 1024).toFixed(2)} MB\n`);

    } finally {
      await this.cleanup();
    }
  }

  private async findAvailablePort(startPort: number): Promise<number> {
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);

    for (let port = startPort; port < startPort + 10; port++) {
      try {
        const { stdout } = await execPromise(`lsof -i:${port}`);
        // If lsof returns output, port is in use
        if (stdout) {
          continue;
        }
      } catch (error) {
        // lsof returns error if port is free
        return port;
      }
    }

    throw new Error(`Could not find available port in range ${startPort}-${startPort + 9}`);
  }

  private async startServer(): Promise<void> {
    console.log('\n🚀 Starting local documentation server...');

    // Check if build directory exists
    const buildPath = path.join(this.projectRoot, 'docs', 'build');
    if (!await fs.pathExists(buildPath)) {
      throw new Error(
        'Build directory not found. Please run "npm run build" first.'
      );
    }

    // Find an available port
    const basePort = this.config.settings.server.port;
    const port = await this.findAvailablePort(basePort);

    if (port !== basePort) {
      console.log(`⚠️  Port ${basePort} is in use, using port ${port} instead`);
      // Update config with new port
      this.config.settings.server.port = port;
      this.config.settings.server.baseUrl = `http://localhost:${port}`;
    }

    return new Promise((resolve, reject) => {
      const docsPath = path.join(this.projectRoot, 'docs');
      const portStr = port.toString();

      this.server = spawn('npm', ['run', 'serve', '--', '--port', portStr], {
        cwd: docsPath,
        shell: true,
        stdio: 'pipe'
      });

      let serverReady = false;

      this.server.stdout?.on('data', (data) => {
        const output = data.toString();
        if (output.includes('Serving') || output.includes('localhost')) {
          if (!serverReady) {
            serverReady = true;
            console.log('✅ Server started');
            // Give server extra time to be fully ready
            setTimeout(() => resolve(), 2000);
          }
        }
      });

      this.server.stderr?.on('data', (data) => {
        console.error('Server error:', data.toString());
      });

      this.server.on('error', (error) => {
        reject(new Error(`Failed to start server: ${error.message}`));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!serverReady) {
          reject(new Error('Server failed to start within 30 seconds'));
        }
      }, 30000);
    });
  }

  private async generateDocumentPDF(
    doc: DocumentConfig,
    version: string,
    profile: ProfileConfig
  ): Promise<Buffer> {
    const page = await this.browser!.newPage();

    try {
      // Construct URL
      const versionPath = version === 'current' ? '' : `${version}/`;
      const url = `${this.config.settings.server.baseUrl}/${versionPath}${doc.id}`;

      console.log(`  📄 ${doc.title}`);
      console.log(`     ${url}`);

      // Navigate to page
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      // Wait for content to render
      await page.waitForSelector('article', { timeout: 10000 }).catch(() => {
        console.warn(`     ⚠️  Warning: Article selector not found for ${doc.id}`);
      });

      // Inject custom PDF CSS if it exists
      const customCSS = path.join(this.projectRoot, this.config.settings.css.customStylesheet);
      if (await fs.pathExists(customCSS)) {
        const cssContent = await fs.readFile(customCSS, 'utf8');
        await page.addStyleTag({ content: cssContent });
      }

      // Add document title as header and footer with documentation URL
      await page.addStyleTag({
        content: `
          @page {
            @top-center {
              content: "${doc.title}";
              font-size: 10pt;
              color: #666;
            }
            @bottom-center {
              content: "Complete updated Kamiwaza documentation is available at https://docs.kamiwaza.ai";
              font-size: 9pt;
              color: #888;
              font-style: italic;
            }
          }
        `
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: this.config.settings.pdf.format as any,
        margin: this.config.settings.pdf.margin,
        printBackground: this.config.settings.pdf.printBackground,
        preferCSSPageSize: this.config.settings.pdf.preferCSSPageSize
      });

      console.log(`     ✅ Generated (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

      return Buffer.from(pdfBuffer);

    } catch (error) {
      console.error(`     ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      await page.close();
    }
  }

  private async mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfBuffers) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

      for (const page of pages) {
        mergedPdf.addPage(page);
      }
    }

    const mergedPdfBytes = await mergedPdf.save();
    return Buffer.from(mergedPdfBytes);
  }

  private async cleanup(): Promise<void> {
    console.log('\n🧹 Cleaning up...');

    if (this.browser) {
      await this.browser.close();
      console.log('✅ Browser closed');
    }

    if (this.server) {
      this.server.kill();
      console.log('✅ Server stopped');
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let profile: string | undefined;
  let version: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) {
      profile = args[i + 1];
      i++;
    } else if (args[i] === '--version' && args[i + 1]) {
      version = args[i + 1];
      i++;
    }
  }

  if (!profile) {
    console.error(`
❌ Error: --profile is required

Usage:
  npm run pdf -- --profile <profile-name> [--version <version>]

Examples:
  npm run pdf -- --profile offline-install --version 0.5.1
  npm run pdf -- --profile full-docs

Available profiles:
  - offline-install: Essential docs for offline installations
  - full-docs: Complete platform documentation
`);
    process.exit(1);
  }

  const configPath = path.join(__dirname, '..', 'pdf-config.yaml');

  if (!fs.existsSync(configPath)) {
    console.error(`❌ Error: pdf-config.yaml not found at ${configPath}`);
    process.exit(1);
  }

  try {
    const generator = new PDFGenerator(configPath);
    await generator.generate(profile, version);
    process.exit(0);
  } catch (error) {
    console.error(`\n❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { PDFGenerator };
