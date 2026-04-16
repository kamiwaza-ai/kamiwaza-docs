"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDocumentUrlVariants = buildDocumentUrlVariants;
exports.buildLinkTargetUrlVariants = buildLinkTargetUrlVariants;
exports.rewritePdfInternalLinks = rewritePdfInternalLinks;
const pdf_lib_1 = require("pdf-lib");
const LINK = pdf_lib_1.PDFName.of("Link");
const SUBTYPE = pdf_lib_1.PDFName.of("Subtype");
const ACTION = pdf_lib_1.PDFName.of("A");
const ACTION_TYPE = pdf_lib_1.PDFName.of("S");
const URI_ACTION = pdf_lib_1.PDFName.of("URI");
const URI = pdf_lib_1.PDFName.of("URI");
const DEST = pdf_lib_1.PDFName.of("Dest");
const XYZ = pdf_lib_1.PDFName.of("XYZ");
const ANNOTS = pdf_lib_1.PDFName.of("Annots");
function buildDocumentUrlVariants(url) {
    return buildUrlVariants(url, false);
}
function buildLinkTargetUrlVariants(url) {
    return buildUrlVariants(url, true);
}
function rewritePdfInternalLinks(pdfDoc, pageIndexByUrl) {
    let rewrittenCount = 0;
    for (const page of pdfDoc.getPages()) {
        const annots = page.node.lookupMaybe(ANNOTS, pdf_lib_1.PDFArray);
        if (!annots) {
            continue;
        }
        for (let index = 0; index < annots.size(); index++) {
            const annot = annots.lookup(index, pdf_lib_1.PDFDict);
            const subtype = annot.lookupMaybe(SUBTYPE, pdf_lib_1.PDFName);
            if (!subtype || subtype.asString() !== LINK.asString()) {
                continue;
            }
            const action = annot.lookupMaybe(ACTION, pdf_lib_1.PDFDict);
            if (!action) {
                continue;
            }
            const actionType = action.lookupMaybe(ACTION_TYPE, pdf_lib_1.PDFName);
            if (!actionType || actionType.asString() !== URI_ACTION.asString()) {
                continue;
            }
            const uriObject = action.lookupMaybe(URI, pdf_lib_1.PDFString, pdf_lib_1.PDFHexString);
            if (!uriObject) {
                continue;
            }
            const target = findDestinationForUrl(uriObject.decodeText(), pageIndexByUrl);
            if (!target) {
                continue;
            }
            const targetPage = pdfDoc.getPage(target.pageIndex);
            const destination = pdf_lib_1.PDFArray.withContext(pdfDoc.context);
            destination.push(targetPage.ref);
            destination.push(XYZ);
            destination.push(pdf_lib_1.PDFNumber.of(0));
            destination.push(target.y === undefined ? pdf_lib_1.PDFNull : pdf_lib_1.PDFNumber.of(target.y));
            destination.push(pdf_lib_1.PDFNull);
            annot.delete(ACTION);
            annot.set(DEST, destination);
            rewrittenCount++;
        }
    }
    return rewrittenCount;
}
function buildUrlVariants(url, preserveFragment) {
    const normalized = normalizeDocumentUrl(url, preserveFragment);
    if (!normalized) {
        return [];
    }
    const parsed = new URL(normalized);
    const fragment = extractFragment(parsed, preserveFragment);
    const aliases = buildAliasCandidates(parsed);
    const variants = new Set();
    for (const alias of aliases) {
        if (parsed.protocol === "file:" &&
            parsed.hash.startsWith("#/") &&
            alias.startsWith("/")) {
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
function findDestinationForUrl(url, destinations) {
    for (const variant of buildLinkTargetUrlVariants(url)) {
        const value = destinations.get(variant);
        if (value === undefined) {
            continue;
        }
        return typeof value === "number" ? { pageIndex: value } : value;
    }
    return null;
}
function normalizeDocumentUrl(url, preserveFragment) {
    try {
        if (url.startsWith("#/")) {
            url = `file:///virtual-index.html${url}`;
        }
        const parsed = new URL(url);
        parsed.search = "";
        if (parsed.protocol === "file:" && parsed.hash.startsWith("#/")) {
            const [route, fragment] = splitHashRoute(parsed.hash);
            const normalizedRoute = route === "/" ? "/" : route.replace(/\/+$/, "");
            const fragmentSuffix = preserveFragment && fragment ? `#${fragment}` : "";
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
    }
    catch {
        return null;
    }
}
function buildAliasCandidates(parsed) {
    if (parsed.protocol === "file:" && parsed.hash.startsWith("#/")) {
        const aliases = new Set();
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
    const normalizedPath = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/+$/, "");
    const aliases = new Set([normalizedPath]);
    if (parsed.pathname.endsWith("/index")) {
        aliases.add(parsed.pathname.slice(0, -"/index".length) || "/");
    }
    const versionlessPath = parsed.pathname.replace(/^\/sdk\/\d+\.\d+\.\d+(\/.+)$/u, "/sdk$1").replace(/^\/\d+\.\d+\.\d+(\/.+)$/u, "$1");
    if (versionlessPath !== parsed.pathname) {
        aliases.add(versionlessPath);
        if (versionlessPath.endsWith("/index")) {
            aliases.add(versionlessPath.slice(0, -"/index".length) || "/");
        }
    }
    return [...aliases];
}
function splitHashRoute(hash) {
    const raw = hash.slice(1);
    const [route, fragment] = raw.split("#", 2);
    return [route, fragment];
}
function extractFragment(parsed, preserveFragment) {
    if (!preserveFragment) {
        return "";
    }
    if (parsed.protocol === "file:" && parsed.hash.startsWith("#/")) {
        return splitHashRoute(parsed.hash)[1] || "";
    }
    return parsed.hash.replace(/^#/, "");
}
function composeFileHashUrl(parsed, route, fragment) {
    return `${getUrlBase(parsed)}#${route}${fragment ? `#${fragment}` : ""}`;
}
function composePathUrl(parsed, pathname, fragment) {
    return `${getUrlBase(parsed, pathname)}${fragment ? `#${fragment}` : ""}`;
}
function getUrlBase(parsed, pathname = parsed.pathname) {
    if (parsed.protocol === "file:") {
        return `file://${pathname}`;
    }
    return `${parsed.origin}${pathname}`;
}
