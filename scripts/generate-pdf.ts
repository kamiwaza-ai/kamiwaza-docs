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
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import puppeteer, { type Browser, Page } from "puppeteer";
import { buildTocHtml } from "./pdf-layout-utils";
import {
	buildDocumentUrlVariants,
	buildLinkTargetUrlVariants,
	canonicalizeFileUrlForPdfMatching,
	idShapedAliasesForDocSourceUrl,
	publicHttpsAliasesForFileDocUrl,
	publicHttpsAliasesForFileLinkTarget,
	type PDFDestinationTarget,
	resolveDocRelativeHashRoute,
	rewriteOfflineHrefToPublicDocsHttps,
	rewritePdfInternalLinks,
	rewriteRemainingOfflineFileUrisToPublicDocsSite,
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
	/** Optional PDF TOC section (otherwise inferred from id or Docusaurus sidebar category). */
	section?: string;
}

interface GeneratedPDFPart {
	kind: "toc" | "document";
	pdfBuffer: Buffer;
	sourceUrl?: string;
	/**
	 * Original (un-normalized) doc id from the sidebar — e.g. `sdk/intro`,
	 * `use-cases/index`. Some Docusaurus doc IDs collapse to a shorter route
	 * (`sdk/intro` → `/sdk`, `foo/index` → `/foo`), so links that reference
	 * the original id form (`<a href="sdk/intro">`) won't match a merge key
	 * derived from the normalized route alone. We carry the id forward so
	 * mergePDFs can register the additional alias.
	 */
	docId?: string;
	localDestinations?: CapturedLocalDestination[];
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
	pageNumberStart: number;
}

interface GlobalSettings {
	defaultVersion: string;
	outputDir: string;
	pdf: PDFSettings;
	source: SourceSettings;
	server: ServerSettings;
	css: CSSSettings;
	/** Base URL for links to pages not included in the merged PDF (offline `file:` fallback). */
	publicDocsBaseUrl?: string;
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

		// Ensure output directory exists
		const outputDir = this.safePath(this.config.settings.outputDir);
		await fs.ensureDir(outputDir);

		try {
			// Prepare the document source (offline build or local server) BEFORE
			// discovery: when docs/build-offline is missing, prepareDocumentSource
			// auto-runs `npm run build:offline`, which in turn runs sync-sdk and
			// writes docs/sdk-services.generated.json + docs/sdk/current/services/.
			// `sidebars-sdk.ts` `require()`s the generated JSON at module-load
			// time, so discovery has to read the sidebar AFTER the auto-build —
			// otherwise freshly synced SDK service pages render in the offline
			// site but get silently dropped from the merged PDF.
			await this.prepareDocumentSource();

			// If includeAll is enabled, discover all documents
			if (profile.includeAll) {
				profile.documents = await this.discoverAllDocuments(
					profile.excludeDocs || [],
					targetVersion,
				);
			}

			// Launch browser
			this.browser = await puppeteer.launch({
				headless: true,
				args: ["--no-sandbox", "--disable-setuid-sandbox"],
			});

			// Generate document PDFs first so we can compute accurate TOC page numbers
			const concurrency = this.resolvePdfConcurrency();
			console.log(
				`\n📑 Generating ${profile.documents.length} document(s) (concurrency=${concurrency})...\n`,
			);

			const docParts = await this.mapWithConcurrency(
				profile.documents,
				concurrency,
				(doc) => this.generateDocumentPDF(doc, targetVersion, profile),
			);

			const pdfParts: GeneratedPDFPart[] = [];

			if (profile.options.includeTOC) {
				console.log("\n📋 Generating Table of Contents...\n");
				const draftTocBuffer = await this.generateTOC(profile, targetVersion, {
					silent: true,
				});
				const draftPdf = await PDFDocument.load(draftTocBuffer);
				const tocPageCount = draftPdf.getPageCount();

				const docPageCounts = await Promise.all(
					docParts.map(async (part) => {
						const loaded = await PDFDocument.load(part.pdfBuffer);
						return loaded.getPageCount();
					}),
				);

				const pnStart = profile.options.pageNumberStart ?? 1;
				const entryPageNumbers: number[] = [];
				let cumulative = 0;
				for (let i = 0; i < profile.documents.length; i++) {
					entryPageNumbers.push(pnStart + tocPageCount + cumulative);
					cumulative += docPageCounts[i]!;
				}

				const tocBuffer = await this.generateTOC(profile, targetVersion, {
					entryPageNumbers,
				});
				pdfParts.push({
					kind: "toc",
					pdfBuffer: tocBuffer,
				});
			}

			pdfParts.push(...docParts);

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

			if (
				versionedSidebar.mainSidebar &&
				Array.isArray(versionedSidebar.mainSidebar)
			) {
				this.extractSidebarDocuments(
					versionedSidebar.mainSidebar,
					documents,
					seenIds,
					excludeSet,
				);
			}

			// Check for versioned SDK sidebar
			const versionedSdkSidebarPath = this.safePath(
				"docs",
				"sdk_versioned_sidebars",
				`version-${version}-sidebars.json`,
			);

			if (await fs.pathExists(versionedSdkSidebarPath)) {
				console.log(
					`   Using versioned SDK sidebar: version-${version}-sidebars.json`,
				);
				const versionedSdkSidebar = JSON.parse(
					await fs.readFile(versionedSdkSidebarPath, "utf8"),
				);

				if (versionedSdkSidebar.sdk && Array.isArray(versionedSdkSidebar.sdk)) {
					this.extractSidebarDocuments(
						versionedSdkSidebar.sdk,
						documents,
						seenIds,
						excludeSet,
						"sdk",
					);
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

		// Extensions plugin (unversioned): routes are /extensions/... — not listed in main sidebars.json
		const extensionsSidebarPath = this.safePath("docs", "sidebars-extensions.ts");
		if (await fs.pathExists(extensionsSidebarPath)) {
			console.log("   Using extensions sidebar: sidebars-extensions.ts");
			const extSidebar = this.loadSidebarConfig(extensionsSidebarPath);
			if (extSidebar.extensions && Array.isArray(extSidebar.extensions)) {
				this.extractSidebarDocuments(
					extSidebar.extensions,
					documents,
					seenIds,
					excludeSet,
					"extensions",
				);
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
		namespace?: "sdk" | "extensions",
		sectionLabel?: string,
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
					sectionLabel,
				);
				continue;
			}

			if (!item || typeof item !== "object") {
				continue;
			}

			if (item.type === "link") {
				// Versioned SDK sidebars are committed in their canonical link form
				// (`/sdk/api/` opens the live Redocusaurus reference), and the offline
				// build mutator (scripts/transform-versioned-sdk-sidebars.cjs) only
				// rewrites them to a `type: "doc"` referencing the api-reference
				// placeholder once the offline Docusaurus build starts — which
				// happens after discovery. Without this branch, every versioned PDF
				// (`--version latest` or a specific version) would silently drop the
				// REST API Reference page from its TOC and leave that link
				// resolving to the public docs site instead of an in-PDF GoTo.
				if (
					this.isOfflineBuildMode() &&
					namespace === "sdk" &&
					typeof item.href === "string" &&
					item.href.replace(/\/+$/, "") === "/sdk/api"
				) {
					this.addSidebarDocument(
						"api-reference",
						item.label || "REST API Reference",
						documents,
						seenIds,
						excludeSet,
						namespace,
						sectionLabel,
					);
				}
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
					sectionLabel,
				);
			} else if (item.type === "category" && Array.isArray(item.items)) {
				const childSection = item.label ?? sectionLabel;
				this.extractSidebarDocuments(
					item.items,
					documents,
					seenIds,
					excludeSet,
					namespace,
					childSection,
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
		namespace?: "sdk" | "extensions",
		sectionLabel?: string,
	): void {
		const fullId = namespace ? `${namespace}/${docId}` : docId;
		if (seenIds.has(fullId) || excludeSet.has(fullId)) {
			return;
		}

		seenIds.add(fullId);

		if (namespace === "extensions") {
			const section = sectionLabel ?? "Extensions";
			documents.push({
				id: fullId,
				title:
					label ||
					(docId === "intro"
						? "Kamiwaza Extensions"
						: this.generateTitleFromId(docId)),
				section,
			});
			return;
		}

		if (namespace === "sdk") {
			const section = sectionLabel ?? "SDK";
			documents.push({
				id: fullId,
				title: `SDK - ${label || (docId === "intro" ? "Introduction" : this.generateTitleFromId(docId))}`,
				section,
			});
			return;
		}

		// Keep the original sidebar id (including "intro") so it flows through
		// to `GeneratedPDFPart.docId` and `idShapedAliasesForDocSourceUrl` can
		// register the `/intro` alias when Docusaurus collapses it to `/`.
		// Route normalization (`intro` → ``) happens in {@link normalizeDocRouteId}
		// at URL build time.
		const title =
			label || (docId === "intro" ? "Introduction" : this.generateTitleFromId(docId));

		if (sectionLabel) {
			documents.push({ id: docId, title, section: sectionLabel });
			return;
		}

		documents.push({ id: docId, title });
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
		// Main-docs root has slug `/`, so its sidebar id collapses to the empty
		// route. Map it here (instead of in addSidebarDocument) so the original
		// id form survives onto `GeneratedPDFPart.docId` and reaches
		// {@link idShapedAliasesForDocSourceUrl}, where it picks up the
		// `#/intro` alias that `<a href="../intro.md#need-help">` style links
		// in troubleshooting/GPU/Windows guides match against.
		if (docId === "intro") {
			return "";
		}

		if (docId === "sdk/intro") {
			return "sdk";
		}

		if (docId.endsWith("/index")) {
			return docId.slice(0, -"/index".length);
		}

		return docId;
	}

	private resolvePdfConcurrency(): number {
		const fromEnv = Number(process.env.PDF_CONCURRENCY);
		if (Number.isFinite(fromEnv) && fromEnv > 0) {
			// Each puppeteer page shares one CDP connection; >4 risks
			// Runtime.evaluate protocol timeouts on large doc sets.
			return Math.min(8, Math.max(1, Math.floor(fromEnv)));
		}
		// Default to sequential for parity with prior behavior; opt in via
		// PDF_CONCURRENCY for parallel runs once the host can spare RAM/CPU.
		return 1;
	}

	private async mapWithConcurrency<T, R>(
		items: T[],
		limit: number,
		fn: (item: T, index: number) => Promise<R>,
	): Promise<R[]> {
		const results = new Array<R>(items.length);
		let cursor = 0;
		const workerCount = Math.max(1, Math.min(limit, items.length));
		const workers: Promise<void>[] = [];
		for (let w = 0; w < workerCount; w++) {
			workers.push(
				(async () => {
					while (true) {
						const index = cursor++;
						if (index >= items.length) {
							return;
						}
						results[index] = await fn(items[index]!, index);
					}
				})(),
			);
		}
		await Promise.all(workers);
		return results;
	}

	private async findAvailablePort(startPort: number): Promise<number> {
		// Probe each candidate port by trying to bind a throwaway server. This
		// works on every platform Node supports (the previous lsof shell-out was
		// POSIX-only). EADDRINUSE → port is taken, try the next; any other bind
		// error → propagate so we fail loudly instead of silently picking a
		// port we can't actually use.
		const net = await import("node:net");

		const isAvailable = (port: number): Promise<boolean> =>
			new Promise((resolve, reject) => {
				const server = net.createServer();
				server.once("error", (err: NodeJS.ErrnoException) => {
					if (err.code === "EADDRINUSE") {
						resolve(false);
						return;
					}
					reject(err);
				});
				server.once("listening", () => {
					server.close((closeErr) =>
						closeErr ? reject(closeErr) : resolve(true),
					);
				});
				server.listen(port, "127.0.0.1");
			});

		for (let port = startPort; port < startPort + 10; port++) {
			if (await isAvailable(port)) {
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
				if (process.env.PDF_SKIP_AUTO_BUILD === "1") {
					throw new Error(
						`Offline build directory not found at ${buildPath}. Run "npm run build:offline" first or unset PDF_SKIP_AUTO_BUILD.`,
					);
				}
				console.log(
					`⚠️  Offline build directory missing at ${buildPath} — running build:offline...`,
				);
				await this.runOfflineBuild();
				if (!(await fs.pathExists(buildPath))) {
					throw new Error(
						`Offline build still missing at ${buildPath} after build:offline. Investigate the build output above.`,
					);
				}
			}
			console.log(`✅ Offline build ready: ${buildPath}`);
			return;
		}

		await this.startServer();
	}

	private async runOfflineBuild(): Promise<void> {
		const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
		await new Promise<void>((resolve, reject) => {
			const child = spawn(npmCmd, ["run", "build:offline"], {
				cwd: this.projectRoot,
				stdio: "inherit",
			});
			child.on("error", reject);
			child.on("exit", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`build:offline exited with code ${code}`));
				}
			});
		});
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

			const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
			this.server = spawn(npmCmd, ["run", "serve", "--", "--port", portStr], {
				cwd: docsPath,
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

			// Separate docs plugins (not versioned with main docs): hash is #/extensions/... or #/research/...
			if (normalizedDocId.startsWith("extensions/")) {
				return `${offlineIndexUrl}#/${normalizedDocId}`;
			}

			if (normalizedDocId.startsWith("research/")) {
				return `${offlineIndexUrl}#/${normalizedDocId}`;
			}

			// Intro uses doc id ""; without a version in the hash, the SPA resolves the default
			// route (current /docs/docs content), not the versioned snapshot — wrong for PDF.
			if (!normalizedDocId) {
				return version === "current"
					? `${offlineIndexUrl}#/`
					: `${offlineIndexUrl}#${versionPath}/`;
			}

			return `${offlineIndexUrl}#${versionPath}/${normalizedDocId}`;
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

		if (normalizedDocId.startsWith("extensions/")) {
			return `${this.config.settings.server.baseUrl}/${normalizedDocId}`;
		}

		if (normalizedDocId.startsWith("research/")) {
			return `${this.config.settings.server.baseUrl}/${normalizedDocId}`;
		}

		const versionPath = version === "current" ? "" : `${version}/`;
		// Intro (empty id): same as offline — avoid bare / which serves unversioned current.
		if (!normalizedDocId) {
			return `${this.config.settings.server.baseUrl}/${versionPath}`;
		}
		return `${this.config.settings.server.baseUrl}/${versionPath}${normalizedDocId}`;
	}

	private async generateTOC(
		profile: ProfileConfig,
		version: string,
		options?: {
			entryPageNumbers?: number[];
			silent?: boolean;
		},
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
				entryPageNumbers: options?.entryPageNumbers,
				documents: profile.documents.map((doc) => ({
					id: doc.id,
					title: doc.title,
					url: this.buildDocumentUrl(doc, version),
					section: doc.section,
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

			if (!options?.silent) {
				console.log(
					`     ✅ Generated TOC (${(pdfBuffer.length / 1024).toFixed(0)} KB)`,
				);
			}

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
		// Note: Page numbers are added in mergePDFs for consistent positioning across all pages
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

		// Rewrite article <a href> values to absolute https://docs.kamiwaza.ai/<route>
		// URLs *before* page.pdf() so Chromium embeds them as native PDF Link
		// annotations with correctly positioned rects. Manual annotation rects
		// derived from getClientRects() drift from the real PDF position when
		// page-break-inside rules push content downward (the user-visible
		// "have to click below the link" symptom). The merge step republishes
		// every doc as a https alias key, so URI links rewrite cleanly to
		// internal GoTo destinations in rewritePdfInternalLinks; any link to a
		// page not in the merged PDF stays as a working public docs URL.
		const publicBase =
			this.config.settings.publicDocsBaseUrl ?? "https://docs.kamiwaza.ai";
		await this.rewriteArticleHrefsForPdf(page, publicBase);

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

			return {
				kind: "document",
				pdfBuffer: Buffer.from(pdfBuffer),
				sourceUrl: url,
				docId: doc.id,
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

	private async rewriteArticleHrefsForPdf(
		page: Page,
		publicDocsOrigin: string,
	): Promise<void> {
		const resolverSource = resolveDocRelativeHashRoute.toString();
		const rewriterSource = rewriteOfflineHrefToPublicDocsHttps.toString();

		await page.evaluate(
			(resolverSrc: string, rewriterSrc: string, publicOrigin: string) => {
				const resolveDocRelativeHashRoute = new Function(
					`"use strict"; return (${resolverSrc});`,
				)() as (currentHash: string, rawHref: string) => string | null;
				const rewriteOfflineHrefToPublicDocsHttps = new Function(
					`"use strict"; return (${rewriterSrc});`,
				)() as (
					rawHref: string,
					location: { protocol: string; href: string; hash: string },
					publicDocsOrigin: string,
					resolveRelative?: (
						currentHash: string,
						rawHref: string,
					) => string | null,
				) => string | null;

				const doc = (globalThis as any).document;
				const loc = globalThis.location;
				for (const anchor of Array.from(
					doc.querySelectorAll("article a[href]"),
				) as any[]) {
					const rawHref = (anchor.getAttribute("href") || "").trim();
					if (!rawHref) {
						continue;
					}
					const rewritten = rewriteOfflineHrefToPublicDocsHttps(
						rawHref,
						{
							protocol: loc.protocol,
							href: loc.href,
							hash: loc.hash,
						},
						publicOrigin,
						resolveDocRelativeHashRoute,
					);
					if (rewritten) {
						anchor.setAttribute("href", rewritten);
					}
				}
			},
			resolverSource,
			rewriterSource,
			publicDocsOrigin,
		);
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
		// The number portion is everything before the trailing unit letters; capture
		// it explicitly so an unknown suffix can't fall through to a silent
		// `parseFloat(trimmed)` that drops the unit and quietly miscalculates page
		// Y. Page-Y math feeds GoTo destinations and TOC headings, so a typoed
		// `cm`/`px`/`em` margin in pdf-config.yaml needs to fail loudly rather than
		// scroll the reader half a page off-target.
		const match = /^(-?\d*\.?\d+)\s*([a-zA-Z]*)$/.exec(trimmed);
		if (!match) {
			throw new Error(
				`Invalid length value '${value}' (expected '<number>[mm|in|pt]').`,
			);
		}
		const numeric = parseFloat(match[1]);
		const unit = match[2].toLowerCase();
		if (unit === "" || unit === "pt") {
			return numeric;
		}
		if (unit === "mm") {
			return numeric * 2.83465;
		}
		if (unit === "in") {
			return numeric * 72;
		}
		throw new Error(
			`Unsupported length unit '${match[2]}' in '${value}'. Use 'mm', 'in', or 'pt'.`,
		);
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
		const publicBase =
			this.config.settings.publicDocsBaseUrl ?? "https://docs.kamiwaza.ai";

		// Merge all PDFs
		for (const pdfPart of pdfParts) {
			const pdf = await PDFDocument.load(pdfPart.pdfBuffer);
			const startPageIndex = mergedPdf.getPageCount();
			const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());

			for (const page of pages) {
				mergedPdf.addPage(page);
			}

			if (pdfPart.kind === "document" && pdfPart.sourceUrl) {
				const dest: PDFDestinationTarget = { pageIndex: startPageIndex };
				for (const variant of buildDocumentUrlVariants(pdfPart.sourceUrl)) {
					pageIndexByUrl.set(variant, dest);
					const canon = canonicalizeFileUrlForPdfMatching(variant);
					if (canon !== variant) {
						pageIndexByUrl.set(canon, dest);
					}
				}
				for (const httpsAlias of publicHttpsAliasesForFileDocUrl(
					pdfPart.sourceUrl,
					publicBase,
				)) {
					pageIndexByUrl.set(httpsAlias, dest);
				}
				// Also register `…/sdk/intro`, `…/foo/index`, `…/intro`
				// shapes. Docusaurus collapses these suffixes when assigning
				// slugs, so the standard route-based aliases above only cover
				// `/sdk`, `/foo`, `/`. Links written with the id form (the
				// "Explore the SDK" doc card on the intro page is the
				// canonical example) need the un-normalized alias too.
				if (pdfPart.docId) {
					for (const idVariant of idShapedAliasesForDocSourceUrl(
						pdfPart.sourceUrl,
						pdfPart.docId,
					)) {
						pageIndexByUrl.set(idVariant, dest);
						const canon = canonicalizeFileUrlForPdfMatching(idVariant);
						if (canon !== idVariant) {
							pageIndexByUrl.set(canon, dest);
						}
						for (const httpsAlias of publicHttpsAliasesForFileLinkTarget(
							idVariant,
							publicBase,
						)) {
							pageIndexByUrl.set(httpsAlias, dest);
						}
					}
				}

				for (const destination of pdfPart.localDestinations || []) {
					const destWithHeading: PDFDestinationTarget = {
						pageIndex: startPageIndex + destination.pageIndex,
						y: destination.y,
					};
					for (const variant of buildLinkTargetUrlVariants(destination.url)) {
						pageIndexByUrl.set(variant, destWithHeading);
						const canon = canonicalizeFileUrlForPdfMatching(variant);
						if (canon !== variant) {
							pageIndexByUrl.set(canon, destWithHeading);
						}
					}
					// Use the link-target alias helper so the heading fragment
					// survives into the https key — Chromium-emitted href
					// `https://docs.kamiwaza.ai/<route>#<heading>` only matches
					// when the destinations map has that exact fragmented URL.
					for (const httpsAlias of publicHttpsAliasesForFileLinkTarget(
						destination.url,
						publicBase,
					)) {
						pageIndexByUrl.set(httpsAlias, destWithHeading);
					}
				}
			}
		}

		const rewrittenLinkCount = rewritePdfInternalLinks(mergedPdf, pageIndexByUrl);
		if (rewrittenLinkCount > 0) {
			console.log(
				`🔗 Rewrote ${rewrittenLinkCount} PDF link(s) to internal destinations...`,
			);
		}
		const publicFallbackCount = rewriteRemainingOfflineFileUrisToPublicDocsSite(
			mergedPdf,
			publicBase,
		);
		if (publicFallbackCount > 0) {
			console.log(
				`🌐 Mapped ${publicFallbackCount} offline file link(s) to ${publicBase} (pages not in this PDF)...`,
			);
		}

		// Add page numbers if enabled
		if (profile.options.includePageNumbers) {
			console.log("📄 Adding page numbers...");
			const pages = mergedPdf.getPages();
			const totalPages = pages.length;
			const footerFont = await mergedPdf.embedFont(StandardFonts.Helvetica);
			const pnStart = profile.options.pageNumberStart ?? 1;
			const pageNumSize = 9;
			const mm = 2.83465;

			for (let i = 0; i < totalPages; i++) {
				const page = pages[i];
				const { width } = page.getSize();

				const pageNumber = pnStart + i;
				const pageText = `Page ${pageNumber} of ${totalPages}`;
				const textWidth = footerFont.widthOfTextAtSize(pageText, pageNumSize);
				page.drawText(pageText, {
					x: (width - textWidth) / 2,
					y: 10 * mm,
					size: pageNumSize,
					font: footerFont,
					color: rgb(0.4, 0.4, 0.4),
				});
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
