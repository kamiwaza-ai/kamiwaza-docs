import test from "node:test";
import assert from "node:assert/strict";
import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFHexString,
	PDFName,
	PDFNumber,
	PDFString,
} from "pdf-lib";

import {
	buildDocumentUrlVariants,
	buildLinkTargetUrlVariants,
	canonicalizeFileUrlForPdfMatching,
	fileOfflineUriToPublicDocsUrl,
	idShapedAliasesForDocSourceUrl,
	isAnnotatableDocHrefForPdfCapture,
	pathnameOnlyOfflineFileToPublicDocsUrl,
	publicHttpsAliasesForFileDocUrl,
	publicHttpsAliasesForFileLinkTarget,
	resolveDocRelativeHashRoute,
	resolveOfflineFileSpaHref,
	rewriteOfflineHrefToPublicDocsHttps,
	rewritePdfInternalLinks,
} from "./pdf-link-utils";

const createUriLinkAnnotation = (
	pdfDoc: PDFDocument,
	url: string,
	rect: [number, number, number, number],
) =>
	pdfDoc.context.register(
		pdfDoc.context.obj({
			Type: PDFName.of("Annot"),
			Subtype: PDFName.of("Link"),
			Rect: rect,
			Border: [0, 0, 0],
			A: {
				Type: PDFName.of("Action"),
				S: PDFName.of("URI"),
				URI: PDFString.of(url),
			},
		}),
	);

test("publicHttpsAliasesForFileDocUrl includes https equivalents of file hash routes", () => {
	const file =
		"file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process";
	const aliases = publicHttpsAliasesForFileDocUrl(
		file,
		"https://docs.kamiwaza.ai",
	);
	assert.ok(
		aliases.some(
			(a) =>
				a ===
					"https://docs.kamiwaza.ai/0.12.0/installation/installation_process" ||
				a ===
					"https://docs.kamiwaza.ai/0.12.0/installation/installation_process/",
		),
		`expected https alias, got: ${aliases.slice(0, 5).join(", ")}`,
	);
});

test("idShapedAliasesForDocSourceUrl re-adds /intro for the SDK home doc", () => {
	const aliases = idShapedAliasesForDocSourceUrl(
		"file:///tmp/docs/build-offline/index.html#/sdk",
		"sdk/intro",
	);
	assert.ok(
		aliases.some(
			(a) => a === "file:///tmp/docs/build-offline/index.html#/sdk/intro",
		),
		`expected #/sdk/intro alias, got: ${aliases.join(", ")}`,
	);
});

test("idShapedAliasesForDocSourceUrl re-adds /index for directory index docs", () => {
	const aliases = idShapedAliasesForDocSourceUrl(
		"file:///tmp/docs/build-offline/index.html#/use-cases",
		"use-cases/index",
	);
	assert.ok(
		aliases.some(
			(a) =>
				a === "file:///tmp/docs/build-offline/index.html#/use-cases/index",
		),
		`expected #/use-cases/index alias, got: ${aliases.join(", ")}`,
	);
});

test("idShapedAliasesForDocSourceUrl returns no extras when id already matches the route", () => {
	assert.deepEqual(
		idShapedAliasesForDocSourceUrl(
			"file:///tmp/docs/build-offline/index.html#/quickstart",
			"quickstart",
		),
		[],
	);
});

test("idShapedAliasesForDocSourceUrl ignores docs whose source url has no hash route", () => {
	assert.deepEqual(
		idShapedAliasesForDocSourceUrl(
			"https://docs.kamiwaza.ai/quickstart",
			"sdk/intro",
		),
		[],
	);
});

test("idShapedAliasesForDocSourceUrl returns no extras when Docusaurus did NOT collapse /intro", () => {
	// The extensions plugin keeps /intro in the route (no `slug: '/'`), so the
	// id form `extensions/intro` already matches the route `/extensions/intro`.
	// Generating an alias here would only add a redundant entry.
	assert.deepEqual(
		idShapedAliasesForDocSourceUrl(
			"file:///tmp/docs/build-offline/index.html#/extensions/intro",
			"extensions/intro",
		),
		[],
	);
});

test("idShapedAliasesForDocSourceUrl returns no extras when Docusaurus did NOT collapse /index", () => {
	// Most non-home docs that happen to be named `index` keep the literal
	// segment in their route — only docs whose plugin sets `slug: '/'` get the
	// collapse. Match the actual route, not the id-suffix shape.
	assert.deepEqual(
		idShapedAliasesForDocSourceUrl(
			"file:///tmp/docs/build-offline/index.html#/foo/index",
			"foo/index",
		),
		[],
	);
});

test("publicHttpsAliasesForFileLinkTarget preserves the heading fragment", () => {
	const file =
		"file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart#section-a";
	const aliases = publicHttpsAliasesForFileLinkTarget(
		file,
		"https://docs.kamiwaza.ai",
	);
	assert.ok(
		aliases.some(
			(a) => a === "https://docs.kamiwaza.ai/0.12.0/quickstart#section-a",
		),
		`expected fragmented https alias, got: ${aliases.slice(0, 5).join(", ")}`,
	);
});

test("pathnameOnlyOfflineFileToPublicDocsUrl maps filesystem paths under build-offline", () => {
	assert.equal(
		pathnameOnlyOfflineFileToPublicDocsUrl(
			"file:///home/user/project/docs/build-offline/installation/installation_process",
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/installation/installation_process",
	);
});

test("fileOfflineUriToPublicDocsUrl maps hash routes to the public docs origin", () => {
	assert.equal(
		fileOfflineUriToPublicDocsUrl(
			"file:///tmp/proj/docs/build-offline/index.html#/0.12.0/quickstart",
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/0.12.0/quickstart",
	);
	assert.equal(
		fileOfflineUriToPublicDocsUrl(
			"file:///tmp/index.html#/0.12.0/system_requirements#special-considerations",
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/0.12.0/system_requirements#special-considerations",
	);
});

test("canonicalizeFileUrlForPdfMatching leaves http(s) URLs unchanged", () => {
	assert.equal(
		canonicalizeFileUrlForPdfMatching("http://localhost:9003/a"),
		"http://localhost:9003/a",
	);
});

test("isAnnotatableDocHrefForPdfCapture accepts Docusaurus doc-relative hrefs", () => {
	assert.equal(isAnnotatableDocHrefForPdfCapture("security/admin-guide"), true);
	assert.equal(isAnnotatableDocHrefForPdfCapture("../observability"), true);
	assert.equal(isAnnotatableDocHrefForPdfCapture("/0.12.0/quickstart"), true);
	assert.equal(isAnnotatableDocHrefForPdfCapture("#anchor"), true);
	assert.equal(isAnnotatableDocHrefForPdfCapture("http://localhost:9003/a"), true);
	assert.equal(isAnnotatableDocHrefForPdfCapture("mailto:a@b"), false);
	assert.equal(isAnnotatableDocHrefForPdfCapture("javascript:void(0)"), false);
});

test("buildDocumentUrlVariants normalizes trailing slashes and hashes", () => {
	const variants = buildDocumentUrlVariants(
		"http://localhost:9003/installation/installation_process/#overview",
	);

	assert.deepEqual(variants, [
		"http://localhost:9003/installation/installation_process",
		"http://localhost:9003/installation/installation_process/",
	]);
});

test("buildDocumentUrlVariants includes versionless and index aliases", () => {
	const variants = buildDocumentUrlVariants(
		"http://localhost:9003/0.12.0/use-cases/index",
	);

	assert.deepEqual(variants, [
		"http://localhost:9003/0.12.0/use-cases/index",
		"http://localhost:9003/0.12.0/use-cases/index/",
		"http://localhost:9003/0.12.0/use-cases",
		"http://localhost:9003/0.12.0/use-cases/",
		"http://localhost:9003/use-cases/index",
		"http://localhost:9003/use-cases/index/",
		"http://localhost:9003/use-cases",
		"http://localhost:9003/use-cases/",
	]);
});

test("buildDocumentUrlVariants preserves offline hash-router routes", () => {
	const variants = buildDocumentUrlVariants(
		"file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process/",
	);

	assert.deepEqual(variants, [
		"file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process",
		"file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process/",
		"file:///tmp/docs/build-offline/index.html#/installation/installation_process",
		"file:///tmp/docs/build-offline/index.html#/installation/installation_process/",
	]);
});

test("buildDocumentUrlVariants strips nested section hashes from offline routes", () => {
	const variants = buildDocumentUrlVariants(
		"file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart#next-steps",
	);

	assert.deepEqual(variants, [
		"file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart",
		"file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart/",
		"file:///tmp/docs/build-offline/index.html#/quickstart",
		"file:///tmp/docs/build-offline/index.html#/quickstart/",
	]);
});

test("buildDocumentUrlVariants preserves plain file URLs", () => {
	const variants = buildDocumentUrlVariants(
		"file:///tmp/docs/build-offline/quickstart",
	);

	assert.deepEqual(variants, [
		"file:///tmp/docs/build-offline/quickstart",
		"file:///tmp/docs/build-offline/quickstart/",
	]);
});

test("buildLinkTargetUrlVariants preserves browser section fragments", () => {
	const variants = buildLinkTargetUrlVariants(
		"http://localhost:9003/installation/system_requirements/#special-considerations",
	);

	assert.deepEqual(variants, [
		"http://localhost:9003/installation/system_requirements#special-considerations",
		"http://localhost:9003/installation/system_requirements/#special-considerations",
	]);
});

test("buildLinkTargetUrlVariants preserves offline hash-router section fragments", () => {
	const variants = buildLinkTargetUrlVariants(
		"file:///tmp/docs/build-offline/index.html#/0.12.0/system_requirements#special-considerations",
	);

	assert.deepEqual(variants, [
		"file:///tmp/docs/build-offline/index.html#/0.12.0/system_requirements#special-considerations",
		"file:///tmp/docs/build-offline/index.html#/0.12.0/system_requirements/#special-considerations",
		"file:///tmp/docs/build-offline/index.html#/system_requirements#special-considerations",
		"file:///tmp/docs/build-offline/index.html#/system_requirements/#special-considerations",
	]);
});

test("rewritePdfInternalLinks converts local doc URLs into internal destinations", async () => {
	const pdfDoc = await PDFDocument.create();
	const page1 = pdfDoc.addPage([600, 800]);
	const page2 = pdfDoc.addPage([600, 800]);

	page1.node.addAnnot(
		createUriLinkAnnotation(pdfDoc, "http://localhost:9003/installation/process", [
			10, 10, 100, 30,
		]),
	);
	page1.node.addAnnot(
		createUriLinkAnnotation(pdfDoc, "https://docs.kamiwaza.ai/sdk/api/", [
			10, 40, 100, 60,
		]),
	);

	const replacements = rewritePdfInternalLinks(
		pdfDoc,
		new Map([
			["http://localhost:9003/installation/process", { pageIndex: 1 }],
		]),
	);

	assert.equal(replacements, 1);

	const annots = page1.node.lookup(PDFName.of("Annots"), PDFArray);
	const rewrittenAnnot = annots.lookup(0, PDFDict);
	const goto = rewrittenAnnot.lookup(PDFName.of("A"), PDFDict);
	assert.equal(goto.lookup(PDFName.of("S"), PDFName).asString(), "/GoTo");
	const dest = goto.lookup(PDFName.of("D"), PDFArray);
	assert.equal(dest.get(0), page2.ref);
	assert.equal(dest.lookup(1, PDFName).asString(), "/XYZ");
	assert.equal(dest.lookup(2, PDFNumber).asNumber(), 0);
	assert.equal(
		dest.lookup(3, PDFNumber).asNumber(),
		page2.getHeight(),
		"doc-level destinations should land at the top of the target page",
	);

	const untouchedAnnot = annots.lookup(1, PDFDict);
	const action = untouchedAnnot.lookup(PDFName.of("A"), PDFDict);
	const uri = action.lookup(
		PDFName.of("URI"),
		PDFString,
		PDFHexString,
	).decodeText();
	assert.equal(uri, "https://docs.kamiwaza.ai/sdk/api/");
});

test("rewritePdfInternalLinks converts offline file URLs into internal destinations", async () => {
	const pdfDoc = await PDFDocument.create();
	const page1 = pdfDoc.addPage([600, 800]);
	const page2 = pdfDoc.addPage([600, 800]);

	page1.node.addAnnot(
		createUriLinkAnnotation(
			pdfDoc,
			"file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart/",
			[10, 10, 100, 30],
		),
	);

	const replacements = rewritePdfInternalLinks(
		pdfDoc,
		new Map([
			[
				"file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart",
				{ pageIndex: 1 },
			],
		]),
	);

	assert.equal(replacements, 1);

	const annots = page1.node.lookup(PDFName.of("Annots"), PDFArray);
	const rewrittenAnnot = annots.lookup(0, PDFDict);
	const goto = rewrittenAnnot.lookup(PDFName.of("A"), PDFDict);
	assert.equal(goto.lookup(PDFName.of("S"), PDFName).asString(), "/GoTo");
	const dest = goto.lookup(PDFName.of("D"), PDFArray);
	assert.equal(dest.get(0), page2.ref);
});

test("rewritePdfInternalLinks preserves section destinations", async () => {
	const pdfDoc = await PDFDocument.create();
	const page1 = pdfDoc.addPage([600, 800]);
	const page2 = pdfDoc.addPage([600, 800]);

	page1.node.addAnnot(
		createUriLinkAnnotation(
			pdfDoc,
			"http://localhost:9003/installation/system_requirements#special-considerations",
			[10, 10, 100, 30],
		),
	);

	const replacements = rewritePdfInternalLinks(
		pdfDoc,
		new Map([
			[
				"http://localhost:9003/installation/system_requirements#special-considerations",
				{ pageIndex: 1, y: 512 },
			],
		]),
	);

	assert.equal(replacements, 1);

	const annots = page1.node.lookup(PDFName.of("Annots"), PDFArray);
	const rewrittenAnnot = annots.lookup(0, PDFDict);
	const goto = rewrittenAnnot.lookup(PDFName.of("A"), PDFDict);
	const dest = goto.lookup(PDFName.of("D"), PDFArray);
	assert.equal(dest.get(0), page2.ref);
	assert.equal(dest.lookup(2, PDFNumber).asNumber(), 0);
	assert.equal(dest.lookup(3, PDFNumber).asNumber(), 512);
});

test("resolveDocRelativeHashRoute traverses ../ segments under a versioned route", () => {
	assert.equal(
		resolveDocRelativeHashRoute(
			"#/0.12.0/security/admin-guide",
			"../quickstart.md",
		),
		"#/0.12.0/quickstart",
	);
});

test("resolveDocRelativeHashRoute joins ./ siblings under a nested SDK route", () => {
	assert.equal(
		resolveDocRelativeHashRoute(
			"#/sdk/0.12.0/current/services/apps",
			"./extensions",
		),
		"#/sdk/0.12.0/current/services/extensions",
	);
});

test("resolveDocRelativeHashRoute preserves an explicit fragment from the href", () => {
	assert.equal(
		resolveDocRelativeHashRoute(
			"#/0.12.0/security/admin-guide",
			"../quickstart#install",
		),
		"#/0.12.0/quickstart#install",
	);
});

test("resolveDocRelativeHashRoute strips .mdx extension when joining", () => {
	assert.equal(
		resolveDocRelativeHashRoute(
			"#/0.12.0/security/admin-guide",
			"../quickstart.mdx",
		),
		"#/0.12.0/quickstart",
	);
});

test("resolveDocRelativeHashRoute returns null when the location is not a hash route", () => {
	assert.equal(
		resolveDocRelativeHashRoute("", "../quickstart"),
		null,
	);
});

test("resolveDocRelativeHashRoute keeps the current route for fragment-only hrefs", () => {
	assert.equal(
		resolveDocRelativeHashRoute(
			"#/0.12.0/installation/system_requirements",
			"#special-considerations",
		),
		"#/0.12.0/installation/system_requirements#special-considerations",
	);
});

test("resolveDocRelativeHashRoute clamps ../ traversal at the route root", () => {
	assert.equal(
		resolveDocRelativeHashRoute("#/0.12.0/quickstart", "../../../../intro"),
		"#/intro",
	);
});

const OFFLINE_INDEX_HREF =
	"file:///tmp/build-offline/index.html#/0.12.0/installation/system_requirements";
const OFFLINE_INDEX_BASE = "file:///tmp/build-offline/index.html";
const OFFLINE_LOCATION = {
	protocol: "file:",
	href: OFFLINE_INDEX_HREF,
	hash: "#/0.12.0/installation/system_requirements",
};

test("resolveOfflineFileSpaHref preserves the route segment for fragment-only hrefs", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"#special-considerations",
			OFFLINE_LOCATION,
			"file:///tmp/build-offline/installation/system_requirements#special-considerations",
		),
		`${OFFLINE_INDEX_BASE}#/0.12.0/installation/system_requirements#special-considerations`,
	);
});

test("resolveOfflineFileSpaHref turns absolute paths into hash routes", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"/0.12.0/quickstart",
			OFFLINE_LOCATION,
			"file:///0.12.0/quickstart",
		),
		`${OFFLINE_INDEX_BASE}#/0.12.0/quickstart`,
	);
});

test("resolveOfflineFileSpaHref resolves doc-relative hrefs against the current route", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"../quickstart",
			OFFLINE_LOCATION,
			"file:///tmp/build-offline/installation/quickstart",
		),
		`${OFFLINE_INDEX_BASE}#/0.12.0/quickstart`,
	);
});

test("resolveOfflineFileSpaHref falls back to anchor.href on non-file protocols", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"#anchor",
			{
				protocol: "http:",
				href: "http://localhost:3000/foo",
				hash: "",
			},
			"http://localhost:3000/foo#anchor",
		),
		"http://localhost:3000/foo#anchor",
	);
});

test("resolveOfflineFileSpaHref falls back to baseFile + raw when current hash is not a route", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"#anchor",
			{
				protocol: "file:",
				href: OFFLINE_INDEX_BASE,
				hash: "",
			},
			`${OFFLINE_INDEX_BASE}#anchor`,
		),
		`${OFFLINE_INDEX_BASE}#anchor`,
	);
});

test("resolveOfflineFileSpaHref preserves Docusaurus Link hash routes (#/route)", () => {
	// Docusaurus' Link component renders most internal links as `#/route` when
	// the offline build uses HashRouter. The resolver must NOT route these
	// through the same-page-fragment branch — otherwise `#/installation/...`
	// becomes `#/<currentRoute>#/installation/...`, misses the merge map, and
	// every internal link silently falls back to docs.kamiwaza.ai.
	assert.equal(
		resolveOfflineFileSpaHref(
			"#/installation/installation_process",
			OFFLINE_LOCATION,
			`${OFFLINE_INDEX_BASE}#/installation/installation_process`,
		),
		`${OFFLINE_INDEX_BASE}#/installation/installation_process`,
	);
});

test("resolveOfflineFileSpaHref preserves hash routes that include a section anchor", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"#/quickstart#1-confirm-the-kubernetes-deployment-is-healthy",
			OFFLINE_LOCATION,
			`${OFFLINE_INDEX_BASE}#/quickstart#1-confirm-the-kubernetes-deployment-is-healthy`,
		),
		`${OFFLINE_INDEX_BASE}#/quickstart#1-confirm-the-kubernetes-deployment-is-healthy`,
	);
});

test("resolveOfflineFileSpaHref preserves the bare root hash route (#/)", () => {
	assert.equal(
		resolveOfflineFileSpaHref(
			"#/",
			OFFLINE_LOCATION,
			`${OFFLINE_INDEX_BASE}#/`,
		),
		`${OFFLINE_INDEX_BASE}#/`,
	);
});

test("rewriteOfflineHrefToPublicDocsHttps converts hash routes to canonical https URLs", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"#/installation/installation_process",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/installation/installation_process",
	);
});

test("rewriteOfflineHrefToPublicDocsHttps preserves nested hash route fragments", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"#/quickstart#section-a",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/quickstart#section-a",
	);
});

test("rewriteOfflineHrefToPublicDocsHttps converts the bare root route", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"#/",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/",
	);
});

test("rewriteOfflineHrefToPublicDocsHttps wraps absolute paths under the public docs origin", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"/0.12.0/quickstart",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/0.12.0/quickstart",
	);
});

test("rewriteOfflineHrefToPublicDocsHttps resolves doc-relative hrefs against the current route", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"../quickstart",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/0.12.0/quickstart",
	);
});

test("rewriteOfflineHrefToPublicDocsHttps resolves same-page anchors to the current route", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"#special-considerations",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		"https://docs.kamiwaza.ai/0.12.0/installation/system_requirements#special-considerations",
	);
});

test("rewriteOfflineHrefToPublicDocsHttps leaves external https links alone", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"https://example.com/page",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		null,
	);
});

test("rewriteOfflineHrefToPublicDocsHttps leaves docs.kamiwaza.ai absolute URLs alone (already public)", () => {
	// rewritePdfInternalLinks still maps these to internal GoTo when the route
	// is in the merged PDF, so we don't need to touch them here.
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"https://docs.kamiwaza.ai/quickstart",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai",
		),
		null,
	);
});

test("rewriteOfflineHrefToPublicDocsHttps skips mailto/tel/javascript schemes", () => {
	for (const href of [
		"mailto:a@b.com",
		"tel:+1-555-1234",
		"javascript:void(0)",
	]) {
		assert.equal(
			rewriteOfflineHrefToPublicDocsHttps(
				href,
				OFFLINE_LOCATION,
				"https://docs.kamiwaza.ai",
			),
			null,
		);
	}
});

test("rewriteOfflineHrefToPublicDocsHttps strips trailing slash from origin", () => {
	assert.equal(
		rewriteOfflineHrefToPublicDocsHttps(
			"#/quickstart",
			OFFLINE_LOCATION,
			"https://docs.kamiwaza.ai/",
		),
		"https://docs.kamiwaza.ai/quickstart",
	);
});
