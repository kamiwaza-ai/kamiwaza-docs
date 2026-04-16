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

export function buildDocumentUrlVariants(url: string): string[] {
	return buildUrlVariants(url, false);
}

export function buildLinkTargetUrlVariants(url: string): string[] {
	return buildUrlVariants(url, true);
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

			annot.delete(ACTION);
			annot.set(DEST, destination);
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
	for (const variant of buildLinkTargetUrlVariants(url)) {
		const value = destinations.get(variant);
		if (value === undefined) {
			continue;
		}

		return typeof value === "number" ? { pageIndex: value } : value;
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
