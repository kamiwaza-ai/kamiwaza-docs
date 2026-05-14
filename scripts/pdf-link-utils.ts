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

// realpath is a stat syscall and link merging hits the same files repeatedly.
const realPathCache = new Map<string, string>();

function cachedRealPath(filePath: string): string {
	const cached = realPathCache.get(filePath);
	if (cached !== undefined) {
		return cached;
	}
	let resolved = filePath;
	try {
		resolved = fs.realpathSync(filePath);
	} catch {
		// keep filePath if the file is gone or not yet resolved
	}
	realPathCache.set(filePath, resolved);
	return resolved;
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
		const realPath = cachedRealPath(filePath);
		const rebased = pathToFileURL(realPath).href;
		return hash ? `${rebased}${hash}` : rebased;
	} catch {
		return url;
	}
}

/**
 * Resolve a doc-relative href against the current Docusaurus hash route,
 * mirroring browser semantics for `.` / `..` traversal so the result is a
 * normalized hash route (e.g. `#/0.12.0/quickstart`). Returns null when the
 * current location is not a hash route we can join against.
 *
 * Pure / SSR-safe: lifted out of the in-page evaluator so it can be unit
 * tested directly and shared with the browser via toString() injection.
 */
export const resolveDocRelativeHashRoute = (
	currentHash: string,
	rawHref: string,
): string | null => {
	if (!currentHash.startsWith("#/")) {
		return null;
	}
	const [routeOnly, ...nestedParts] = currentHash.slice(1).split("#");
	const nested = nestedParts.length > 0 ? nestedParts.join("#") : "";

	const [hrefPath, ...hrefHashParts] = rawHref.split("#");
	const hrefHash = hrefHashParts.join("#");

	const cleanedPath = hrefPath.replace(/\.mdx?$/i, "");
	if (!cleanedPath) {
		return hrefHash ? `#${routeOnly}#${hrefHash}` : `#${routeOnly}`;
	}

	// Resolve relative to the *directory* of the current route — anchors in
	// /a/b/c with href "../d" target /a/d, mirroring browser semantics.
	const baseSegments = routeOnly.replace(/^\//, "").split("/");
	if (baseSegments.length > 0) {
		baseSegments.pop();
	}

	for (const segment of cleanedPath.split("/")) {
		if (segment === "" || segment === ".") {
			continue;
		}
		if (segment === "..") {
			if (baseSegments.length > 0) {
				baseSegments.pop();
			}
			continue;
		}
		baseSegments.push(segment);
	}

	const joined = "/" + baseSegments.join("/");
	const fragment = hrefHash || nested;
	return fragment ? `#${joined}#${fragment}` : `#${joined}`;
};

/**
 * Translate an `<a href>` into the URL the PDF link annotation should target
 * when the offline shell is loaded under `file://` with the hash router.
 *
 * - Hash routes (`#/route`, `#/route#anchor`) → return as-is on the same
 *   `<index>.html` shell so PDF merge keys match. Docusaurus' Link component
 *   renders the bulk of internal links in this shape, so misclassifying them
 *   as bare fragments is the difference between every internal link landing
 *   on its target page in the merged PDF and every internal link silently
 *   falling back to the public docs site.
 * - Absolute paths (`/...`)            → `<index>.html#/...` so PDF merge keys
 *   match the hash-route entries instead of resolving against the filesystem
 *   root (`file:///0.12.0/...`).
 * - Same-page fragments (`#anchor`)    → preserve the current hash route so
 *   the link lands on the same doc inside the merged PDF instead of stripping
 *   the route segment to `<index>.html#anchor`.
 * - Doc-relative (`./x`, `../y`, `z`)  → resolve against the current hash
 *   route via {@link resolveDocRelativeHashRoute} so doc-to-doc navigation
 *   inside the offline build matches the merge map.
 *
 * Pure / SSR-safe: lifted out of the in-page evaluator so it can be unit
 * tested directly and shared with the browser via toString() injection.
 */
export const resolveOfflineFileSpaHref = (
	rawHref: string,
	location: { protocol: string; href: string; hash: string },
	anchorHref: string,
	resolveRelative: (
		currentHash: string,
		rawHref: string,
	) => string | null = resolveDocRelativeHashRoute,
): string => {
	if (location.protocol !== "file:") {
		return anchorHref;
	}

	const baseFile = location.href.split("#")[0] || location.href;

	// Hash route emitted by Docusaurus' Link component under HashRouter
	// (e.g. `#/quickstart`, `#/quickstart#section`, `#/`). These already encode
	// the full destination route — passing them through resolveDocRelativeHashRoute
	// would treat the leading `#/...` as a same-page fragment and produce
	// `#/<currentRoute>#/<route>` (a dead key that misses the merge map and
	// gets rewritten to a public docs URL).
	if (rawHref.startsWith("#/")) {
		return `${baseFile}${rawHref}`;
	}

	if (rawHref.startsWith("/") && !rawHref.startsWith("//") && rawHref.length > 1) {
		return `${baseFile}#${rawHref}`;
	}

	if (rawHref.startsWith("#")) {
		const resolved = resolveRelative(location.hash || "", rawHref);
		return resolved ? `${baseFile}${resolved}` : `${baseFile}${rawHref}`;
	}

	const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawHref);
	if (
		rawHref &&
		!hasScheme &&
		!rawHref.startsWith("/") &&
		!rawHref.startsWith("#") &&
		!rawHref.startsWith("?")
	) {
		const resolved = resolveRelative(location.hash || "", rawHref);
		if (resolved) {
			return `${baseFile}${resolved}`;
		}
	}

	return anchorHref;
};

/**
 * Rewrite an `<a href>` to the canonical `https://docs.kamiwaza.ai/<route>`
 * URL Chrome should embed natively as a PDF Link annotation.
 *
 * Why https instead of `file:///…#/<route>`:
 *   Chromium's print pipeline only emits Link/URI annotations for absolute
 *   http(s) URLs. `file:` URIs (and same-document fragment hrefs) are dropped
 *   silently, so the PDF renders the link text but has no clickable rect.
 *   By feeding Chrome an https URL we let it position the rect correctly via
 *   layout (which is the only thing we don't have a reliable substitute for —
 *   manual annotation rects derived from getClientRects() drift from the
 *   real PDF position when page-break-inside rules push content downward).
 *
 * Why https://docs.kamiwaza.ai specifically:
 *   The merge step already publishes `https://docs.kamiwaza.ai/<route>` aliases
 *   for every document and heading via {@link publicHttpsAliasesForFileDocUrl}.
 *   So Chrome-emitted URI links rewrite cleanly to internal GoTo destinations
 *   in {@link rewritePdfInternalLinks}; any link to a doc not in the merged
 *   PDF stays as a working https URL that resolves to the public docs site.
 *
 * Returns null when the href should not be rewritten (mailto:, tel:, external
 * https that already points elsewhere, javascript:, etc.).
 *
 * Pure / SSR-safe: shared with the in-page evaluator via toString() injection.
 */
export const rewriteOfflineHrefToPublicDocsHttps = (
	rawHref: string,
	location: { protocol: string; href: string; hash: string },
	publicDocsOrigin: string,
	resolveRelative: (
		currentHash: string,
		rawHref: string,
	) => string | null = resolveDocRelativeHashRoute,
): string | null => {
	const h = rawHref.trim();
	if (!h) {
		return null;
	}
	const lower = h.toLowerCase();
	if (
		lower.startsWith("mailto:") ||
		lower.startsWith("tel:") ||
		lower.startsWith("javascript:") ||
		lower.startsWith("data:") ||
		lower.startsWith("blob:")
	) {
		return null;
	}

	const hasScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(h);
	if (hasScheme) {
		// Leave external (and already-public) absolute URLs alone — Chromium
		// embeds them natively, and {@link rewritePdfInternalLinks} converts
		// them to GoTo destinations when their route is also in the merged PDF.
		return null;
	}

	const base = publicDocsOrigin.replace(/\/$/, "");

	if (h.startsWith("#/")) {
		return `${base}${h.slice(1)}`;
	}

	if (h.startsWith("/") && !h.startsWith("//")) {
		return `${base}${h}`;
	}

	if (h.startsWith("#")) {
		const resolved = resolveRelative(location.hash || "", h);
		if (resolved && resolved.startsWith("#/")) {
			return `${base}${resolved.slice(1)}`;
		}
		return null;
	}

	// Doc-relative (security/foo, ../bar, ./baz, plain.md, etc.)
	const resolved = resolveRelative(location.hash || "", h);
	if (resolved && resolved.startsWith("#/")) {
		return `${base}${resolved.slice(1)}`;
	}
	return null;
};

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
 * Like {@link publicHttpsAliasesForFileDocUrl} but preserves the heading
 * fragment so heading destinations (`…#section-id`) get registered with their
 * full https URL. Without this, `<a href="https://docs.kamiwaza.ai/quickstart#section">`
 * (the post-rewrite href Chromium embeds for in-doc TOC entries) misses the
 * heading destination and stays as a public URL instead of a same-PDF GoTo.
 */
export function publicHttpsAliasesForFileLinkTarget(
	fileLinkUrl: string,
	publicDocsOrigin: string,
): string[] {
	const out = new Set<string>();
	for (const variant of buildLinkTargetUrlVariants(fileLinkUrl)) {
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
 * Compute the additional `<index>.html#/<docId>` URL aliases that won't be
 * produced from a doc's route alone, because Docusaurus collapses certain
 * id suffixes when assigning slugs:
 *
 *   `sdk/intro`     → route `/sdk`     (SDK plugin home)
 *   `foo/index`     → route `/foo`     (directory index docs)
 *   `intro`         → route `/`        (main docs home)
 *
 * Markdown (and raw HTML) inside other docs frequently writes these links
 * using the original id form — e.g. `<a href="sdk/intro">` in the doc-card
 * grid on the intro page. The route-based merge keys
 * (`https://docs.kamiwaza.ai/sdk`) don't match the rewritten link
 * (`https://docs.kamiwaza.ai/sdk/intro`), so the link silently falls back to
 * the public docs site. Registering the id-shaped alias closes that gap.
 *
 * Returns an empty array if no extra alias is needed (the id already equals
 * the normalized route).
 */
export function idShapedAliasesForDocSourceUrl(
	fileDocUrl: string,
	docId: string,
): string[] {
	if (!docId) {
		return [];
	}
	let parsed: URL;
	try {
		parsed = new URL(fileDocUrl);
	} catch {
		return [];
	}
	if (parsed.protocol !== "file:" || !parsed.hash.startsWith("#/")) {
		return [];
	}

	// What does the docId imply the route should be? Mirror the in-script
	// `normalizeDocRouteId` collapse so we add aliases only when the id form
	// actually differs from the route form.
	const idAsRoute = "/" + docId.replace(/^\/+/, "");

	const collapsedFromId = idAsRoute
		.replace(/\/intro$/u, "")
		.replace(/\/index$/u, "");
	const normalizedIdRoute = collapsedFromId === "" ? "/" : collapsedFromId;
	if (normalizedIdRoute === idAsRoute) {
		// Id has no collapsible suffix — the standard alias generation
		// already covers this doc.
		return [];
	}

	const base = `file://${parsed.pathname}`;
	const idVariant = `${base}#${idAsRoute}`;
	const out = new Set<string>();
	for (const v of buildLinkTargetUrlVariants(idVariant)) {
		out.add(v);
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
			// PDF /XYZ with null y means "keep current vertical position" — for
			// doc-level targets (no heading anchor) we want the top of the page.
			const topY = target.y ?? targetPage.getHeight();
			const destination = PDFArray.withContext(pdfDoc.context);
			destination.push(targetPage.ref);
			destination.push(XYZ);
			destination.push(PDFNumber.of(0));
			destination.push(PDFNumber.of(topY));
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

		const stripped = route
			.replace(/^\/sdk\/\d+\.\d+\.\d+(?:[-+][\w.]+)?(\/.*)?$/u, "/sdk$1")
			.replace(/^\/\d+\.\d+\.\d+(?:[-+][\w.]+)?(\/.*)?$/u, "$1");
		const versionlessRoute = stripped === "" ? "/" : stripped;

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

	const strippedPath = parsed.pathname
		.replace(/^\/sdk\/\d+\.\d+\.\d+(?:[-+][\w.]+)?(\/.*)?$/u, "/sdk$1")
		.replace(/^\/\d+\.\d+\.\d+(?:[-+][\w.]+)?(\/.*)?$/u, "$1");
	const versionlessPath = strippedPath === "" ? "/" : strippedPath;

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
