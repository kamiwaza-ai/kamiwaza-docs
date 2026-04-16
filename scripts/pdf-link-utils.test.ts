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
		new Map([["http://localhost:9003/installation/process", 1]]),
	);

	assert.equal(replacements, 1);

	const annots = page1.node.lookup(PDFName.of("Annots"), PDFArray);
	const rewrittenAnnot = annots.lookup(0, PDFDict);
	assert.equal(rewrittenAnnot.lookupMaybe(PDFName.of("A"), PDFDict), undefined);

	const dest = rewrittenAnnot.lookup(PDFName.of("Dest"), PDFArray);
	assert.equal(dest.get(0), page2.ref);
	assert.equal(dest.lookup(1, PDFName).asString(), "/XYZ");
	assert.equal(dest.lookup(2, PDFNumber).asNumber(), 0);

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
		new Map([["file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart", 1]]),
	);

	assert.equal(replacements, 1);

	const annots = page1.node.lookup(PDFName.of("Annots"), PDFArray);
	const rewrittenAnnot = annots.lookup(0, PDFDict);
	assert.equal(rewrittenAnnot.lookupMaybe(PDFName.of("A"), PDFDict), undefined);

	const dest = rewrittenAnnot.lookup(PDFName.of("Dest"), PDFArray);
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
	const dest = rewrittenAnnot.lookup(PDFName.of("Dest"), PDFArray);
	assert.equal(dest.get(0), page2.ref);
	assert.equal(dest.lookup(2, PDFNumber).asNumber(), 0);
	assert.equal(dest.lookup(3, PDFNumber).asNumber(), 512);
});
