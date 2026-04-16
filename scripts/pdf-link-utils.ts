import * as fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFHexString,
	PDFName,
	PDFNull,
	PDFNumber,
	PDFString,
} from "pdf-lib";

export interface PDFDestinationTarget {
	pageIndex: number;
	y?: number;
}

const LINK = PDFName.of("Link");
const SUBTYPE = PDFName.of("Subtype");
const ACTION = PDFName.of("A");
const ACTION_TYPE = PDFName.of("S");
const URI_ACTION = PDFName.of("URI");
const URI = PDFName.of("URI");
const DEST = PDFName.of("Dest");
const XYZ = PDFName.of("XYZ");
const ANNOTS = PDFName.of("Annots");
const GOTO = PDFName.of("GoTo");

export function buildDocumentUrlVariants(url: string): string[] {
	return buildUrlVariants(url, false);
}

export function buildLinkTargetUrlVariants(url: string): string[] {
	return buildUrlVariants(url, true);
}

/**
 * Whether to add a PDF link annotation for this raw `<a href>`.
 * Docusaurus often emits Markdown doc links as relative paths without a leading
 * slash (e.g. `security/admin-guide`); capture previously only accepted `#` and
 * `/`, so those links had no clickable region in the PDF.
 */
/**
 * Resolves symlink/casing differences so the same build path matches between
 * `pageIndexByUrl` keys and link URI strings embedded in PDF annotations.
 */
export function canonicalizeFileUrlForPdfMatching(url: string): string {
	try {
		const u = new URL(url);
		if (u.protocol !== "file:") {
			return url;
		}
		const hash = u.hash;
		const withoutHash = hash ? url.slice(0, url.length - hash.length) : url;
		let filePath: string;
		try {
			filePath = fileURLToPath(withoutHash);
		} catch {
			return url;
		}
		let realPath = filePath;
		try {
			realPath = fs.realpathSync(filePath);
		} catch {
			// keep filePath if the file is gone or not yet resolved
		}
		const rebased = pathToFileURL(realPath).href;
		return hash ? `${rebased}${hash}` : rebased;
	} catch {
		return url;
	}
}

export const isAnnotatableDocHrefForPdfCapture = (rawHref: string): boolean => {
	const h = rawHref.trim();
	if (!h) {
		return false;
	}
	const lower = h.toLowerCase();
	if (
		lower.startsWith("mailto:") ||
		lower.startsWith("tel:") ||
		lower.startsWith("javascript:") ||
		lower.startsWith("data:") ||
		lower.startsWith("blob:")
	) {
		return false;
	}
	if (h.startsWith("#") || h.startsWith("/")) {
		return true;
	}
	if (lower.startsWith("http://") || lower.startsWith("https://")) {
		return true;
	}
	// Doc-relative: security/foo, ../bar, ./baz
	if (!h.includes(":")) {
		return true;
	}
	return false;
};

/**
 * Map an offline `file:///…/index.html#/…` client-router URL to the public docs site.
 * Used when a page is not included in the merged PDF so we still replace `file:` with https
 * (avoids Acrobat "connect to local file" warnings).
 */
/**
 * Map the client-router path in a file URL (`#/…`) to the same path on the public docs origin.
 */
export function fileHashUriToPublicDocsHttps(
	uri: string,
	publicDocsOrigin: string,
): string | null {
	try {
		const u = new URL(uri);
		if (u.protocol !== "file:" || !u.hash.startsWith("#/")) {
			return null;
		}
		const inner = u.hash.slice(1);
		const hashParts = inner.split("#");
		const routePath = hashParts[0] ?? "";
		const nested = hashParts.slice(1).join("#");
		const base = publicDocsOrigin.replace(/\/$/, "");
		let out = `${base}${routePath.startsWith("/") ? routePath : `/${routePath}`}`;
		if (nested) {
			out += `#${nested}`;
		}
		return out;
	} catch {
		return null;
	}
}

export function fileOfflineUriToPublicDocsUrl(
	uri: string,
	publicDocsOrigin: string,
): string | null {
	return fileHashUriToPublicDocsHttps(uri, publicDocsOrigin);
}

/**
 * For merge: every `file:///…/index.html#/route` key should also match absolute
 * `https://docs…/route` link annotations (Docusaurus sets `url` in config).
 */
export function publicHttpsAliasesForFileDocUrl(
	fileDocUrl: string,
	publicDocsOrigin: string,
): string[] {
	const out = new Set<string>();
	for (const variant of buildDocumentUrlVariants(fileDocUrl)) {
		const https = fileHashUriToPublicDocsHttps(variant, publicDocsOrigin);
		if (!https) {
			continue;
		}
		for (const t of buildLinkTargetUrlVariants(https)) {
			out.add(t);
		}
	}
	return [...out];
}

/**
 * When the browser wrongly resolves a doc-relative href to a bare file path under
 * `…/build-offline/…` (no `#/…` hash), map it to the public site URL so we can strip file: prompts.
 */
export function pathnameOnlyOfflineFileToPublicDocsUrl(
	uri: string,
	publicDocsOrigin: string,
): string | null {
	try {
		const u = new URL(uri);
		if (u.protocol !== "file:" || u.hash) {
			return null;
		}
		const p = u.pathname.replace(/\\/g, "/");
		const marker = "/build-offline/";
		const idx = p.indexOf(marker);
		if (idx === -1) {
			return null;
		}
		const tail = p.slice(idx + marker.length).replace(/\/+$/, "");
		if (!tail) {
			return null;
		}
		const base = publicDocsOrigin.replace(/\/$/, "");
		return `${base}/${tail}`;
	} catch {
		return null;
	}
}

/**
 * Replace remaining `file:` URI actions (not mapped into this PDF) with https://docs… URLs.
 */
export function rewriteRemainingOfflineFileUrisToPublicDocsSite(
	pdfDoc: PDFDocument,
	publicDocsOrigin: string,
): number {
	let rewrittenCount = 0;

	for (const page of pdfDoc.getPages()) {
		const annots = page.node.lookupMaybe(ANNOTS, PDFArray);
		if (!annots) {
			continue;
		}

		for (let index = 0; index < annots.size(); index++) {
			const annot = annots.lookup(index, PDFDict);
			const subtype = annot.lookupMaybe(SUBTYPE, PDFName);
			if (!subtype || subtype.asString() !== LINK.asString()) {
				continue;
			}

			if (annot.get(DEST) !== undefined) {
				continue;
			}

			const action = annot.lookupMaybe(ACTION, PDFDict);
			if (!action) {
				continue;
			}

			const actionType = action.lookupMaybe(ACTION_TYPE, PDFName);
			if (!actionType || actionType.asString() !== URI_ACTION.asString()) {
				continue;
			}

			const uriObject = action.lookupMaybe(URI, PDFString, PDFHexString);
			if (!uriObject) {
				continue;
			}

			const text = uriObject.decodeText();
			if (!text.startsWith("file:")) {
				continue;
			}

			let mapped =
				fileOfflineUriToPublicDocsUrl(text, publicDocsOrigin) ??
				pathnameOnlyOfflineFileToPublicDocsUrl(text, publicDocsOrigin);
			if (!mapped) {
				continue;
			}

			action.set(URI, PDFString.of(mapped));
			rewrittenCount++;
		}
	}

	return rewrittenCount;
}

export function rewritePdfInternalLinks(
	pdfDoc: PDFDocument,
	pageIndexByUrl: Map<string, number | PDFDestinationTarget>,
): number {
	let rewrittenCount = 0;

	for (const page of pdfDoc.getPages()) {
		const annots = page.node.lookupMaybe(ANNOTS, PDFArray);
		if (!annots) {
			continue;
		}

		for (let index = 0; index < annots.size(); index++) {
			const annot = annots.lookup(index, PDFDict);
			const subtype = annot.lookupMaybe(SUBTYPE, PDFName);
			if (!subtype || subtype.asString() !== LINK.asString()) {
				continue;
			}

			const action = annot.lookupMaybe(ACTION, PDFDict);
			if (!action) {
				continue;
			}

			const actionType = action.lookupMaybe(ACTION_TYPE, PDFName);
			if (!actionType || actionType.asString() !== URI_ACTION.asString()) {
				continue;
			}

			const uriObject = action.lookupMaybe(URI, PDFString, PDFHexString);
			if (!uriObject) {
				continue;
			}

			const target = findDestinationForUrl(
				uriObject.decodeText(),
				pageIndexByUrl,
			);
			if (!target) {
				continue;
			}

			const targetPage = pdfDoc.getPage(target.pageIndex);
			const destination = PDFArray.withContext(pdfDoc.context);
			destination.push(targetPage.ref);
			destination.push(XYZ);
			destination.push(PDFNumber.of(0));
			destination.push(
				target.y === undefined ? PDFNull : PDFNumber.of(target.y),
			);
			destination.push(PDFNull);

			// Use a GoTo action instead of a /Dest key — Acrobat reliably follows
			// intra-document navigation for /A/S/GoTo; a bare /Dest is sometimes ignored.
			const gotoAction = pdfDoc.context.register(
				pdfDoc.context.obj({
					Type: PDFName.of("Action"),
					S: GOTO,
					D: destination,
				}),
			);

			annot.delete(ACTION);
			annot.set(ACTION, gotoAction);
			if (annot.get(DEST) !== undefined) {
				annot.delete(DEST);
			}
			rewrittenCount++;
		}
	}

	return rewrittenCount;
}

function buildUrlVariants(url: string, preserveFragment: boolean): string[] {
	const normalized = normalizeDocumentUrl(url, preserveFragment);
	if (!normalized) {
		return [];
	}

	const parsed = new URL(normalized);
	const fragment = extractFragment(parsed, preserveFragment);
	const aliases = buildAliasCandidates(parsed);
	const variants = new Set<string>();

	for (const alias of aliases) {
		if (
			parsed.protocol === "file:" &&
			parsed.hash.startsWith("#/") &&
			alias.startsWith("/")
		) {
			const trimmedRoute = alias === "/" ? "/" : alias.replace(/\/+$/, "");
			variants.add(composeFileHashUrl(parsed, trimmedRoute, fragment));

			if (trimmedRoute !== "/") {
				variants.add(composeFileHashUrl(parsed, `${trimmedRoute}/`, fragment));
			}
			continue;
		}

		const trimmedPath = alias === "/" ? "/" : alias.replace(/\/+$/, "");
		variants.add(composePathUrl(parsed, trimmedPath, fragment));

		if (trimmedPath !== "/") {
			variants.add(composePathUrl(parsed, `${trimmedPath}/`, fragment));
		}
	}

	return [...variants];
}

function findDestinationForUrl(
	url: string,
	destinations: Map<string, number | PDFDestinationTarget>,
): PDFDestinationTarget | null {
	const seeds = new Set<string>([url, canonicalizeFileUrlForPdfMatching(url)]);

	for (const seed of seeds) {
		for (const variant of buildLinkTargetUrlVariants(seed)) {
			const value = destinations.get(variant);
			if (value === undefined) {
				continue;
			}

			return typeof value === "number" ? { pageIndex: value } : value;
		}
	}

	return null;
}

function normalizeDocumentUrl(
	url: string,
	preserveFragment: boolean,
): string | null {
	try {
		if (url.startsWith("#/")) {
			url = `file:///virtual-index.html${url}`;
		}

		const parsed = new URL(url);
		parsed.search = "";

		if (parsed.protocol === "file:" && parsed.hash.startsWith("#/")) {
			const [route, fragment] = splitHashRoute(parsed.hash);
			const normalizedRoute = route === "/" ? "/" : route.replace(/\/+$/, "");
			const fragmentSuffix =
				preserveFragment && fragment ? `#${fragment}` : "";
			return `${getUrlBase(parsed)}#${normalizedRoute}${fragmentSuffix}`;
		}

		const fragment = preserveFragment ? parsed.hash : "";
		parsed.hash = "";

		if (parsed.pathname.endsWith("/index.html")) {
			parsed.pathname = parsed.pathname.slice(0, -"/index.html".length) || "/";
		}

		if (parsed.pathname !== "/") {
			parsed.pathname = parsed.pathname.replace(/\/+$/, "");
		}

		return `${getUrlBase(parsed, parsed.pathname)}${fragment}`;
	} catch {
		return null;
	}
}

function buildAliasCandidates(parsed: URL): string[] {
	if (parsed.protocol === "file:" && parsed.hash.startsWith("#/")) {
		const aliases = new Set<string>();
		const [route] = splitHashRoute(parsed.hash);
		aliases.add(route);

		if (route.endsWith("/index")) {
			aliases.add(route.slice(0, -"/index".length) || "/");
		}

		const versionlessRoute = route
			.replace(/^\/sdk\/\d+\.\d+\.\d+(\/.+)$/u, "/sdk$1")
			.replace(/^\/\d+\.\d+\.\d+(\/.+)$/u, "$1");

		if (versionlessRoute !== route) {
			aliases.add(versionlessRoute);

			if (versionlessRoute.endsWith("/index")) {
				aliases.add(versionlessRoute.slice(0, -"/index".length) || "/");
			}
		}

		return [...aliases];
	}

	const normalizedPath =
		parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
	const aliases = new Set<string>([normalizedPath]);

	if (parsed.pathname.endsWith("/index")) {
		aliases.add(parsed.pathname.slice(0, -"/index".length) || "/");
	}

	const versionlessPath = parsed.pathname.replace(
		/^\/sdk\/\d+\.\d+\.\d+(\/.+)$/u,
		"/sdk$1",
	).replace(/^\/\d+\.\d+\.\d+(\/.+)$/u, "$1");

	if (versionlessPath !== parsed.pathname) {
		aliases.add(versionlessPath);

		if (versionlessPath.endsWith("/index")) {
			aliases.add(versionlessPath.slice(0, -"/index".length) || "/");
		}
	}

	return [...aliases];
}

function splitHashRoute(hash: string): [string, string | undefined] {
	const raw = hash.slice(1);
	const [route, fragment] = raw.split("#", 2);
	return [route, fragment];
}

function extractFragment(parsed: URL, preserveFragment: boolean): string {
	if (!preserveFragment) {
		return "";
	}

	if (parsed.protocol === "file:" && parsed.hash.startsWith("#/")) {
		return splitHashRoute(parsed.hash)[1] || "";
	}

	return parsed.hash.replace(/^#/, "");
}

function composeFileHashUrl(
	parsed: URL,
	route: string,
	fragment: string,
): string {
	return `${getUrlBase(parsed)}#${route}${fragment ? `#${fragment}` : ""}`;
}

function composePathUrl(parsed: URL, pathname: string, fragment: string): string {
	return `${getUrlBase(parsed, pathname)}${fragment ? `#${fragment}` : ""}`;
}

function getUrlBase(parsed: URL, pathname = parsed.pathname): string {
	if (parsed.protocol === "file:") {
		return `file://${pathname}`;
	}

	return `${parsed.origin}${pathname}`;
}
