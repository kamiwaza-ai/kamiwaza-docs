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

import { type ChildProcess, spawn } from "child_process";
import * as fs from "fs-extra";
import * as yaml from "js-yaml";
import * as path from "path";
import { pathToFileURL } from "url";
import {
	PDFDocument,
	PDFName,
	PDFString,
	rgb,
} from "pdf-lib";
import puppeteer, { type Browser, Page } from "puppeteer";
import { buildTocHtml } from "./pdf-layout-utils";
import {
	buildDocumentUrlVariants,
	buildLinkTargetUrlVariants,
	type PDFDestinationTarget,
	rewritePdfInternalLinks,
} from "./pdf-link-utils";
import { isDocusaurusNotFoundPage } from "./pdf-page-utils";

interface PDFConfig {
	profiles: Record<string, ProfileConfig>;
	settings: GlobalSettings;
}

interface ProfileConfig {
	name: string;
	description: string;
	filename: string;
	cover: CoverConfig;
	documents?: DocumentConfig[];
	includeAll?: boolean;
	excludeDocs?: string[];
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

interface GeneratedPDFPart {
	kind: "toc" | "document";
	pdfBuffer: Buffer;
	sourceUrl?: string;
	localDestinations?: CapturedLocalDestination[];
}

interface CapturedLinkRect {
	left: number;
	top: number;
	width: number;
	height: number;
}

interface CapturedLocalLink {
	url: string;
	rects: CapturedLinkRect[];
}

interface CapturedLocalDestination {
	url: string;
	pageIndex: number;
	y: number;
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
	source: SourceSettings;
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

interface SourceSettings {
	mode: "offline-build" | "local-server";
	buildDir: string;
}

interface CSSSettings {
	customStylesheet: string;
}

class PDFGenerator {
	private config: PDFConfig;
	private projectRoot: string;
	private browser: Browser | null = null;
	private server: ChildProcess | null = null;

	/**
	 * Resolve a file path and ensure it stays within projectRoot.
	 * Prevents path traversal via crafted version strings or config values.
	 */
	private safePath(...segments: string[]): string {
		const resolved = path.resolve(this.projectRoot, ...segments);
		if (
			!resolved.startsWith(this.projectRoot + path.sep) &&
			resolved !== this.projectRoot
		) {
			throw new Error(
				`Path traversal blocked: ${resolved} is outside ${this.projectRoot}`,
			);
		}
		return resolved;
	}

	constructor(configPath: string) {
		this.projectRoot = path.resolve(__dirname, "..");
		const resolvedConfigPath = path.resolve(configPath);
		if (
			!resolvedConfigPath.startsWith(this.projectRoot + path.sep) &&
			resolvedConfigPath !== this.projectRoot
		) {
			throw new Error(
				`Config path must be within project root: ${this.projectRoot}`,
			);
		}
		const configFile = fs.readFileSync(resolvedConfigPath, "utf8");
		this.config = yaml.load(configFile, {
			schema: yaml.JSON_SCHEMA,
		}) as PDFConfig;
	}

	async generate(profileName: string, version?: string): Promise<void> {
		console.log(`\n📄 Generating PDF for profile: ${profileName}`);

		const profile = this.config.profiles[profileName];
		if (!profile) {
			throw new Error(`Profile "${profileName}" not found in pdf-config.yaml`);
		}

		// "current" means the unversioned docs; "latest" resolves to the
		// newest version snapshot in versions.json.
		let targetVersion = version || this.config.settings.defaultVersion;
		if (targetVersion === "latest") {
			targetVersion = await this.getLatestVersion();
		}
		console.log(`📌 Version: ${targetVersion}`);

		// If includeAll is enabled, discover all documents
		if (profile.includeAll) {
			profile.documents = await this.discoverAllDocuments(
				profile.excludeDocs || [],
				targetVersion,
			);
		}

		// Ensure output directory exists
		const outputDir = this.safePath(this.config.settings.outputDir);
		await fs.ensureDir(outputDir);

		try {
			// Prepare the document source (offline build or local server)
			await this.prepareDocumentSource();

			// Launch browser
			this.browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			// Generate cover page with TOC if enabled
			const pdfParts: GeneratedPDFPart[] = [];

			if (profile.options.includeTOC) {
				console.log("\n📋 Generating Table of Contents...\n");
				const tocBuffer = await this.generateTOC(profile, targetVersion);
				pdfParts.push({
					kind: "toc",
					pdfBuffer: tocBuffer,
				});
			}

			console.log(
				`\n📑 Generating ${profile.documents.length} document(s)...\n`,
			);

			for (const doc of profile.documents) {
				const pdfPart = await this.generateDocumentPDF(
					doc,
					targetVersion,
					profile,
				);
				pdfParts.push(pdfPart);
			}

			// Merge PDFs
			console.log("\n📦 Merging PDFs...");
			const mergedPDF = await this.mergePDFs(pdfParts, profile);

			// Save final PDF
			const filename = `${profile.filename}-v${targetVersion}.pdf`;
			const outputPath = path.join(outputDir, filename);
			await fs.writeFile(outputPath, mergedPDF);

			console.log(`\n✅ PDF generated successfully!`);
			console.log(`📍 Location: ${outputPath}`);
			console.log(
				`📊 Size: ${(mergedPDF.length / 1024 / 1024).toFixed(2)} MB\n`,
			);
		} finally {
			await this.cleanup();
		}
	}

	private async getLatestVersion(): Promise<string> {
		const versionsPath = this.safePath("docs", "versions.json");
		if (await fs.pathExists(versionsPath)) {
			const versions = JSON.parse(
				await fs.readFile(versionsPath, "utf8"),
			) as string[];
			if (versions.length > 0) {
				return versions[0]; // First entry is the latest version
			}
		}
		return "current"; // Fallback to 'current' if versions.json doesn't exist or is empty
	}

	private async discoverAllDocuments(
		excludeDocs: string[],
		version: string,
	): Promise<DocumentConfig[]> {
		console.log("🔍 Discovering all available documents...");

		const documents: DocumentConfig[] = [];
		const excludeSet = new Set(excludeDocs);
		const seenIds = new Set<string>();

		// Check if we should use versioned sidebar
		const versionedSidebarPath = this.safePath(
			"docs",
			"versioned_sidebars",
			`version-${version}-sidebars.json`,
		);

		if (version !== "current" && (await fs.pathExists(versionedSidebarPath))) {
			// Use versioned sidebar (JSON format)
			console.log(
				`   Using versioned sidebar: version-${version}-sidebars.json`,
			);
			const versionedSidebar = JSON.parse(
				await fs.readFile(versionedSidebarPath, "utf8"),
			);

			// Extract document IDs from JSON sidebar
			const extractIds = (items: any[]): void => {
				for (const item of items) {
					if (typeof item === "string") {
						const docId = item;
						if (!seenIds.has(docId) && !excludeSet.has(docId)) {
							seenIds.add(docId);
							const title = this.generateTitleFromId(docId);
							documents.push({ id: docId, title });
						}
					} else if (item && typeof item === "object") {
						if (item.type === "doc" && item.id) {
							const docId = item.id;
							if (!seenIds.has(docId) && !excludeSet.has(docId)) {
								seenIds.add(docId);
								const title = item.label || this.generateTitleFromId(docId);
								// Use empty ID for intro to get the root URL
								const pdfId = docId === "intro" ? "" : docId;
								documents.push({ id: pdfId, title });
							}
						} else if (item.type === "category" && Array.isArray(item.items)) {
							extractIds(item.items);
						}
					}
				}
			};

			// Extract from mainSidebar
			if (
				versionedSidebar.mainSidebar &&
				Array.isArray(versionedSidebar.mainSidebar)
			) {
				extractIds(versionedSidebar.mainSidebar);
			}

			// Check for versioned SDK sidebar
			const versionedSdkSidebarPath = this.safePath(
				"docs",
				"sdk_versioned_sidebars",
				`version-${version}-sidebars.json`,
			);

			// Helper function to extract SDK IDs from JSON sidebar structure
			const extractSdkIds = (items: any[]): void => {
				for (const item of items) {
					if (typeof item === "string") {
						const docId = item;
						const fullId = `sdk/${docId}`;
						if (!seenIds.has(fullId) && !excludeSet.has(fullId)) {
							seenIds.add(fullId);
							const title = `SDK - ${this.generateTitleFromId(docId)}`;
							documents.push({ id: fullId, title });
						}
					} else if (item && typeof item === "object") {
						if (item.type === "doc" && item.id) {
							const docId = item.id;
							const fullId = `sdk/${docId}`;
							if (!seenIds.has(fullId) && !excludeSet.has(fullId)) {
								seenIds.add(fullId);
								const title = `SDK - ${item.label || this.generateTitleFromId(docId)}`;
								documents.push({ id: fullId, title });
							}
						} else if (item.type === "category" && Array.isArray(item.items)) {
							extractSdkIds(item.items);
						}
					}
				}
			};

			if (await fs.pathExists(versionedSdkSidebarPath)) {
				console.log(
					`   Using versioned SDK sidebar: version-${version}-sidebars.json`,
				);
				const versionedSdkSidebar = JSON.parse(
					await fs.readFile(versionedSdkSidebarPath, "utf8"),
				);

				// Extract from sdk sidebar
				if (versionedSdkSidebar.sdk && Array.isArray(versionedSdkSidebar.sdk)) {
					extractSdkIds(versionedSdkSidebar.sdk);
				}
			} else {
				// Fallback to current SDK sidebar if versioned one doesn't exist
				console.log(
					`   No versioned SDK sidebar found, using current SDK sidebar`,
				);
				const currentSdkSidebarPath = this.safePath("docs", "sidebars-sdk.ts");
				if (await fs.pathExists(currentSdkSidebarPath)) {
					const currentSdkSidebar = this.loadSidebarConfig(currentSdkSidebarPath);
					if (currentSdkSidebar.sdk && Array.isArray(currentSdkSidebar.sdk)) {
						this.extractSidebarDocuments(
							currentSdkSidebar.sdk,
							documents,
							seenIds,
							excludeSet,
							"sdk",
						);
					}
				}
			}
		} else {
			// Use current sidebar modules so we can read the actual structure.
			console.log("   Using current sidebar: sidebars.ts");
			const currentSidebarPath = this.safePath("docs", "sidebars.ts");
			const currentSidebar = this.loadSidebarConfig(currentSidebarPath);
			if (currentSidebar.mainSidebar && Array.isArray(currentSidebar.mainSidebar)) {
				this.extractSidebarDocuments(
					currentSidebar.mainSidebar,
					documents,
					seenIds,
					excludeSet,
				);
			}

			// Read SDK sidebar
			const sdkSidebarPath = this.safePath("docs", "sidebars-sdk.ts");
			if (await fs.pathExists(sdkSidebarPath)) {
				const sdkSidebar = this.loadSidebarConfig(sdkSidebarPath);
				if (sdkSidebar.sdk && Array.isArray(sdkSidebar.sdk)) {
					this.extractSidebarDocuments(
						sdkSidebar.sdk,
						documents,
						seenIds,
						excludeSet,
						"sdk",
					);
				}
			}
		}

		console.log(
			`   Found ${documents.length} documents (excluded ${excludeDocs.length})`,
		);

		return documents;
	}

	private loadSidebarConfig(modulePath: string): any {
		const previousOfflineValue = process.env.DOCUSAURUS_OFFLINE_BUILD;
		if (this.isOfflineBuildMode()) {
			process.env.DOCUSAURUS_OFFLINE_BUILD = "true";
		}

		try {
			const resolvedModulePath = require.resolve(modulePath);
			delete require.cache[resolvedModulePath];
			const loadedModule = require(resolvedModulePath);
			return loadedModule.default ?? loadedModule;
		} finally {
			if (previousOfflineValue === undefined) {
				delete process.env.DOCUSAURUS_OFFLINE_BUILD;
			} else {
				process.env.DOCUSAURUS_OFFLINE_BUILD = previousOfflineValue;
			}
		}
	}

	private extractSidebarDocuments(
		items: any[],
		documents: DocumentConfig[],
		seenIds: Set<string>,
		excludeSet: Set<string>,
		namespace?: "sdk",
	): void {
		for (const item of items) {
			if (typeof item === "string") {
				this.addSidebarDocument(
					item,
					undefined,
					documents,
					seenIds,
					excludeSet,
					namespace,
				);
				continue;
			}

			if (!item || typeof item !== "object") {
				continue;
			}

			if (item.type === "doc" && item.id) {
				this.addSidebarDocument(
					item.id,
					item.label,
					documents,
					seenIds,
					excludeSet,
					namespace,
				);
			} else if (item.type === "category" && Array.isArray(item.items)) {
				this.extractSidebarDocuments(
					item.items,
					documents,
					seenIds,
					excludeSet,
					namespace,
				);
			}
		}
	}

	private addSidebarDocument(
		docId: string,
		label: string | undefined,
		documents: DocumentConfig[],
		seenIds: Set<string>,
		excludeSet: Set<string>,
		namespace?: "sdk",
	): void {
		const fullId = namespace ? `${namespace}/${docId}` : docId;
		if (seenIds.has(fullId) || excludeSet.has(fullId)) {
			return;
		}

		seenIds.add(fullId);

		if (namespace === "sdk") {
			documents.push({
				id: fullId,
				title: `SDK - ${label || (docId === "intro" ? "Introduction" : this.generateTitleFromId(docId))}`,
			});
			return;
		}

		documents.push({
			id: docId === "intro" ? "" : docId,
			title: label || (docId === "intro" ? "Introduction" : this.generateTitleFromId(docId)),
		});
	}

	private generateTitleFromId(docId: string): string {
		// Convert doc ID to readable title
		// e.g., "installation/system_requirements" -> "System Requirements"
		// e.g., "services/auth/README" -> "Auth Service"

		const parts = docId.split("/");
		let lastPart = parts[parts.length - 1];

		// Treat directory index docs as the parent section title.
		if (lastPart === "index" && parts.length > 1) {
			lastPart = parts[parts.length - 2];
		}

		// Remove README
		if (lastPart === "README" && parts.length > 1) {
			lastPart = parts[parts.length - 2];
		}

		// Remove file extensions
		lastPart = lastPart.replace(/\.(md|mdx)$/, "");

		// Convert snake_case or kebab-case to Title Case
		return lastPart
			.replace(/[_-]/g, " ")
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	}

	private normalizeDocRouteId(docId: string): string {
		if (docId === "sdk/intro") {
			return "sdk";
		}

		if (docId.endsWith("/index")) {
			return docId.slice(0, -"/index".length);
		}

		return docId;
	}

	private async findAvailablePort(startPort: number): Promise<number> {
		const { exec } = require("child_process");
		const util = require("util");
		const execPromise = util.promisify(exec);

		for (let port = startPort; port < startPort + 10; port++) {
			try {
				const { stdout } = await execPromise(`lsof -i:${port}`);
				// If lsof returns output, port is in use
				if (stdout) {
				}
			} catch (error) {
				// lsof returns error if port is free
				return port;
			}
		}

		throw new Error(
			`Could not find available port in range ${startPort}-${startPort + 9}`,
		);
	}

	private getSourceBuildPath(): string {
		return this.safePath(this.config.settings.source.buildDir);
	}

	private isOfflineBuildMode(): boolean {
		return this.config.settings.source.mode === "offline-build";
	}

	private async prepareDocumentSource(): Promise<void> {
		if (this.isOfflineBuildMode()) {
			console.log("\n📁 Using offline documentation build...");
			const buildPath = this.getSourceBuildPath();
			if (!(await fs.pathExists(buildPath))) {
				throw new Error(
					`Offline build directory not found at ${buildPath}. Please run "npm run build:offline" first.`,
				);
			}
			console.log(`✅ Offline build ready: ${buildPath}`);
			return;
		}

		await this.startServer();
	}

	private async startServer(): Promise<void> {
		console.log("\n🚀 Starting local documentation server...");

		// Check if build directory exists
		const buildPath = this.getSourceBuildPath();
		if (!(await fs.pathExists(buildPath))) {
			throw new Error(
				`Build directory not found at ${buildPath}. Please run "npm run build" first.`,
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
			const docsPath = path.join(this.projectRoot, "docs");
			const portStr = port.toString();

			this.server = spawn("npm", ["run", "serve", "--", "--port", portStr], {
				cwd: docsPath,
				shell: true,
				stdio: "pipe",
			});

			let serverReady = false;

			this.server.stdout?.on("data", (data) => {
				const output = data.toString();
				if (output.includes("Serving") || output.includes("localhost")) {
					if (!serverReady) {
						serverReady = true;
						console.log("✅ Server started");
						// Give server extra time to be fully ready
						setTimeout(() => resolve(), 2000);
					}
				}
			});

			this.server.stderr?.on("data", (data) => {
				console.error("Server error:", data.toString());
			});

			this.server.on("error", (error) => {
				reject(new Error(`Failed to start server: ${error.message}`));
			});

			// Timeout after 30 seconds
			setTimeout(() => {
				if (!serverReady) {
					reject(new Error("Server failed to start within 30 seconds"));
				}
			}, 30000);
		});
	}

	private buildDocumentUrl(doc: DocumentConfig, version: string): string {
		const normalizedDocId = this.normalizeDocRouteId(doc.id);

		if (this.isOfflineBuildMode()) {
			const offlineIndexUrl = pathToFileURL(
				path.join(this.getSourceBuildPath(), "index.html"),
			).toString();
			const versionPath = version === "current" ? "" : `/${version}`;

			if (normalizedDocId === "sdk") {
				return `${offlineIndexUrl}#/sdk${versionPath}`;
			}

			if (normalizedDocId.startsWith("sdk/")) {
				let sdkPath = normalizedDocId.substring(4);
				sdkPath = sdkPath.replace(/\/README$/, "");
				const sdkVersionPath = version === "current" ? "" : `/${version}`;
				return `${offlineIndexUrl}#/sdk${sdkVersionPath}/${sdkPath}`;
			}

			return normalizedDocId
				? `${offlineIndexUrl}#${versionPath}/${normalizedDocId}`
				: `${offlineIndexUrl}#/`;
		}

		if (normalizedDocId === "sdk") {
			const versionPath = version === "current" ? "" : `${version}/`;
			return `${this.config.settings.server.baseUrl}/sdk/${versionPath}`;
		}

		if (normalizedDocId.startsWith("sdk/")) {
			let sdkPath = normalizedDocId.substring(4);
			sdkPath = sdkPath.replace(/\/README$/, "");
			const versionPath = version === "current" ? "" : `${version}/`;
			return `${this.config.settings.server.baseUrl}/sdk/${versionPath}${sdkPath}`;
		}

		const versionPath = version === "current" ? "" : `${version}/`;
		return `${this.config.settings.server.baseUrl}/${versionPath}${normalizedDocId}`;
	}

	private async generateTOC(
		profile: ProfileConfig,
		version: string,
	): Promise<Buffer> {
		const page = await this.browser!.newPage();

		try {
			// Read and encode logo if needed
			let logoBase64 = "";
			if (profile.cover.includeLogo) {
				const logoPath = path.join(
					this.projectRoot,
					"docs",
					"static",
					"img",
					"KW_logo.png",
				);
				if (await fs.pathExists(logoPath)) {
					const logoBuffer = await fs.readFile(logoPath);
					logoBase64 = logoBuffer.toString("base64");
				}
			}

			const tocHTML = buildTocHtml({
				title: profile.cover.title,
				subtitle: profile.cover.subtitle,
				versionLabel: profile.cover.includeVersion ? `Version ${version}` : undefined,
				logoBase64,
				documents: profile.documents.map((doc) => ({
					title: doc.title,
					url: this.buildDocumentUrl(doc, version),
					level: doc.id.startsWith("sdk/") ? 2 : 1,
				})),
			});

			await page.setContent(tocHTML, { waitUntil: "networkidle0" });

			// Generate PDF
			const pdfBuffer = await page.pdf({
				format: this.config.settings.pdf.format as any,
				margin: this.config.settings.pdf.margin,
				printBackground: this.config.settings.pdf.printBackground,
				preferCSSPageSize: this.config.settings.pdf.preferCSSPageSize,
			});

			console.log(
				`     ✅ Generated TOC (${(pdfBuffer.length / 1024).toFixed(0)} KB)`,
			);

			return Buffer.from(pdfBuffer);
		} catch (error) {
			console.error(
				`     ❌ Failed to generate TOC: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		} finally {
			await page.close();
		}
	}

	private async generateDocumentPDF(
		doc: DocumentConfig,
		version: string,
		profile: ProfileConfig,
	): Promise<GeneratedPDFPart> {
		const page = await this.browser!.newPage();

		try {
			const url = this.buildDocumentUrl(doc, version);

			console.log(`  📄 ${doc.title}`);
			console.log(`     ${url}`);

			// Navigate to page
			await page.goto(url, {
				waitUntil: "networkidle0",
				timeout: 30000,
			});

			const pageSnapshot = await page.evaluate(() => {
				const doc = (globalThis as any).document;
				return {
					title: doc?.title || "",
					bodyText: doc?.body?.innerText || "",
					hasArticle: Boolean(doc?.querySelector("article")),
				};
			});

			if (
				isDocusaurusNotFoundPage(pageSnapshot.title, pageSnapshot.bodyText)
			) {
				throw new Error(
					`Docusaurus page not found for "${doc.title}" (${doc.id}) at ${url}`,
				);
			}

			// Wait for content to render
			if (!pageSnapshot.hasArticle) {
				await page.waitForSelector("article", { timeout: 10000 }).catch(() => {
					console.warn(
						`     ⚠️  Warning: Article selector not found for ${doc.id}`,
					);
				});
			}

			// Scroll through page to trigger lazy-loaded images
			await page.evaluate(`(async () => {
        await new Promise((resolve) => {
          let totalHeight = 0;
          const distance = 100;
          const timer = setInterval(() => {
            const scrollHeight = document.body.scrollHeight;
            window.scrollBy(0, distance);
            totalHeight += distance;

            if(totalHeight >= scrollHeight){
              clearInterval(timer);
              resolve();
            }
          }, 100);
        });
      })()`);

			// Wait for all images to finish loading
			await page.evaluate(`(() => {
        const images = Array.from(document.images);
        return Promise.all(
          images
            .filter(img => !img.complete)
            .map(img => new Promise(resolve => {
              img.onload = img.onerror = resolve;
            }))
        );
      })()`);

			// Scroll back to top for proper PDF generation
			await page.evaluate(`window.scrollTo(0, 0)`);

			// Brief wait for scroll position to settle
			await new Promise((resolve) => setTimeout(resolve, 500));

			// Inject custom PDF CSS if it exists
			const customCSS = path.join(
				this.projectRoot,
				this.config.settings.css.customStylesheet,
			);
			if (await fs.pathExists(customCSS)) {
				const cssContent = await fs.readFile(customCSS, "utf8");
				await page.addStyleTag({ content: cssContent });
			}

			await page.emulateMediaType("print");
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Add document title as header (if enabled)
			// Note: Footer is added in mergePDFs for consistent positioning across all pages
			if (profile.options.includeHeaders) {
				const headerCSS = `
          @page {
            @top-center {
              content: "${doc.title}";
              font-size: 10pt;
              color: #666;
            }
          }
        `;

				await page.addStyleTag({ content: headerCSS });
			}

			const capturedLocalLinks = await this.captureLocalPdfLinks(page);
			const capturedLocalDestinations = await this.captureLocalPdfDestinations(
				page,
				url,
			);

			// Generate PDF
			const pdfBuffer = await page.pdf({
				format: this.config.settings.pdf.format as any,
				margin: this.config.settings.pdf.margin,
				printBackground: this.config.settings.pdf.printBackground,
				preferCSSPageSize: this.config.settings.pdf.preferCSSPageSize,
			});

			console.log(
				`     ✅ Generated (${(pdfBuffer.length / 1024).toFixed(0)} KB)`,
			);

			const enrichedPdfBuffer =
				capturedLocalLinks.length > 0
					? await this.addPdfLinkAnnotations(
							Buffer.from(pdfBuffer),
							capturedLocalLinks,
						)
					: Buffer.from(pdfBuffer);

			return {
				kind: "document",
				pdfBuffer: enrichedPdfBuffer,
				sourceUrl: url,
				localDestinations: capturedLocalDestinations,
			};
		} catch (error) {
			console.error(
				`     ❌ Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
			throw error;
		} finally {
			await page.close();
		}
	}

	private async captureLocalPdfLinks(page: Page): Promise<CapturedLocalLink[]> {
		return page.evaluate(() => {
			const doc = (globalThis as any).document;
			const links: CapturedLocalLink[] = [];

			for (const anchor of Array.from(doc.querySelectorAll("article a")) as any[]) {
				const rawHref = anchor.getAttribute("href") || "";
				const text = (anchor.textContent || "").trim();
				if (!text || !(rawHref.startsWith("#") || rawHref.startsWith("/"))) {
					continue;
				}

				const rects = Array.from(anchor.getClientRects())
					.map((rect: any) => ({
						left: rect.left,
						top: rect.top,
						width: rect.width,
						height: rect.height,
					}))
					.filter((rect) => rect.width > 0 && rect.height > 0);

				if (rects.length === 0) {
					continue;
				}

				links.push({
					url: anchor.href,
					rects,
				});
			}

			return links;
		});
	}

	private async captureLocalPdfDestinations(
		page: Page,
		documentUrl: string,
	): Promise<CapturedLocalDestination[]> {
		const headings = await page.evaluate(() => {
			const doc = (globalThis as any).document;
			return Array.from(
				doc.querySelectorAll(
					"article h1[id], article h2[id], article h3[id], article h4[id], article h5[id], article h6[id]",
				),
			).map((heading: any) => {
				const rect = heading.getBoundingClientRect();
				return {
					id: heading.id,
					top: rect.top,
				};
			});
		});

		return headings
			.filter((heading) => heading.id && heading.top >= 0)
			.map((heading) => {
				const position = this.locatePdfPosition(heading.top);
				return {
					url: `${documentUrl}#${heading.id}`,
					pageIndex: position.pageIndex,
					y: position.y,
				};
			});
	}

	private async addPdfLinkAnnotations(
		pdfBuffer: Buffer,
		links: CapturedLocalLink[],
	): Promise<Buffer> {
		const pdfDoc = await PDFDocument.load(pdfBuffer);
		const pxToPt = 72 / 96;
		const leftMargin = this.parseLengthToPoints(this.config.settings.pdf.margin.left);

		for (const link of links) {
			for (const rect of link.rects) {
				const position = this.locatePdfPosition(rect.top);
				const pageIndex = position.pageIndex;
				if (pageIndex < 0 || pageIndex >= pdfDoc.getPageCount()) {
					continue;
				}

				const page = pdfDoc.getPage(pageIndex);
				const x1 = leftMargin + rect.left * pxToPt;
				const x2 = x1 + rect.width * pxToPt;
				const y2 = position.y;
				const y1 = y2 - rect.height * pxToPt;

				const annotation = pdfDoc.context.register(
					pdfDoc.context.obj({
						Type: PDFName.of("Annot"),
						Subtype: PDFName.of("Link"),
						Rect: [x1, y1, x2, y2],
						Border: [0, 0, 0],
						A: {
							Type: PDFName.of("Action"),
							S: PDFName.of("URI"),
							URI: PDFString.of(link.url),
						},
					}),
				);

				page.node.addAnnot(annotation);
			}
		}

		return Buffer.from(await pdfDoc.save());
	}

	private locatePdfPosition(topPx: number): { pageIndex: number; y: number } {
		const pageSize = this.getPageSizeInPoints();
		const margin = {
			top: this.parseLengthToPoints(this.config.settings.pdf.margin.top),
			bottom: this.parseLengthToPoints(this.config.settings.pdf.margin.bottom),
		};
		const printableHeightPx =
			((pageSize.height - margin.top - margin.bottom) * 96) / 72;
		const pageIndex = Math.floor(topPx / printableHeightPx);
		const localTopPx = topPx - pageIndex * printableHeightPx;
		const y = pageSize.height - margin.top - localTopPx * (72 / 96);

		return { pageIndex, y };
	}

	private parseLengthToPoints(value: string): number {
		const trimmed = value.trim();
		if (trimmed.endsWith("mm")) {
			return parseFloat(trimmed) * 2.83465;
		}
		if (trimmed.endsWith("in")) {
			return parseFloat(trimmed) * 72;
		}
		if (trimmed.endsWith("pt")) {
			return parseFloat(trimmed);
		}
		return parseFloat(trimmed);
	}

	private getPageSizeInPoints(): { width: number; height: number } {
		const format = this.config.settings.pdf.format.toUpperCase();
		if (format === "LETTER") {
			return { width: 612, height: 792 };
		}
		return { width: 595.28, height: 841.89 };
	}

	private async mergePDFs(
		pdfParts: GeneratedPDFPart[],
		profile: ProfileConfig,
	): Promise<Buffer> {
		const mergedPdf = await PDFDocument.create();
		const pageIndexByUrl = new Map<string, PDFDestinationTarget>();

		// Merge all PDFs
		for (const pdfPart of pdfParts) {
			const pdf = await PDFDocument.load(pdfPart.pdfBuffer);
			const startPageIndex = mergedPdf.getPageCount();
			const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

			for (const page of pages) {
				mergedPdf.addPage(page);
			}

			if (pdfPart.kind === "document" && pdfPart.sourceUrl) {
				for (const variant of buildDocumentUrlVariants(pdfPart.sourceUrl)) {
					pageIndexByUrl.set(variant, { pageIndex: startPageIndex });
				}

				for (const destination of pdfPart.localDestinations || []) {
					for (const variant of buildLinkTargetUrlVariants(destination.url)) {
						pageIndexByUrl.set(variant, {
							pageIndex: startPageIndex + destination.pageIndex,
							y: destination.y,
						});
					}
				}
			}
		}

		const rewrittenLinkCount = rewritePdfInternalLinks(mergedPdf, pageIndexByUrl);
		if (rewrittenLinkCount > 0) {
			console.log(`🔗 Rewrote ${rewrittenLinkCount} PDF link(s) to internal destinations...`);
		}

		// Add footer and page numbers if enabled
		if (profile.options.includePageNumbers || profile.options.includeFooters) {
			console.log("📄 Adding continuous page numbers and footers...");
			const pages = mergedPdf.getPages();
			const totalPages = pages.length;

			for (let i = 0; i < totalPages; i++) {
				const page = pages[i];
				const { width, height } = page.getSize();

				// Add documentation URL footer in bottom-center
				if (profile.options.includeFooters) {
					const footerText =
						"Complete updated Kamiwaza documentation is available at https://docs.kamiwaza.ai";
					const footerFontSize = 9;

					// Calculate center position for footer text
					const footerWidth = footerText.length * footerFontSize * 0.5; // Approximate width
					const footerX = (width - footerWidth) / 2;

					page.drawText(footerText, {
						x: footerX,
						y: 10 * 2.83465, // 10mm from bottom
						size: footerFontSize,
						color: rgb(0.53, 0.53, 0.53), // #888
					});
				}

				// Add page number in bottom-left corner
				if (profile.options.includePageNumbers) {
					const pageNumber = i + 1;
					const pageText = `Page ${pageNumber} of ${totalPages}`;

					page.drawText(pageText, {
						x: 15 * 2.83465, // 15mm in points (1mm = 2.83465 points)
						y: 15 * 2.83465, // 15mm from bottom
						size: 9,
						color: rgb(0.4, 0.4, 0.4), // #666
					});
				}
			}
		}

		const mergedPdfBytes = await mergedPdf.save();
		return Buffer.from(mergedPdfBytes);
	}

	private async cleanup(): Promise<void> {
		console.log("\n🧹 Cleaning up...");

		if (this.browser) {
			await this.browser.close();
			console.log("✅ Browser closed");
		}

		if (this.server) {
			this.server.kill();
			console.log("✅ Server stopped");
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
		if (args[i] === "--profile" && args[i + 1]) {
			profile = args[i + 1];
			i++;
		} else if (args[i] === "--version" && args[i + 1]) {
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

	const configPath = path.join(__dirname, "..", "pdf-config.yaml");

	if (!fs.existsSync(configPath)) {
		console.error(`❌ Error: pdf-config.yaml not found at ${configPath}`);
		process.exit(1);
	}

	try {
		const generator = new PDFGenerator(configPath);
		await generator.generate(profile, version);
		process.exit(0);
	} catch (error) {
		console.error(
			`\n❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		console.error(error);
		process.exit(1);
	}
}

// Run if called directly
if (require.main === module) {
	main();
}

export { PDFGenerator };
