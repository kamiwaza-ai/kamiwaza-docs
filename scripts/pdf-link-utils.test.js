"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pdf_lib_1 = require("pdf-lib");
const pdf_link_utils_1 = require("./pdf-link-utils");
const createUriLinkAnnotation = (pdfDoc, url, rect) => pdfDoc.context.register(pdfDoc.context.obj({
    Type: pdf_lib_1.PDFName.of("Annot"),
    Subtype: pdf_lib_1.PDFName.of("Link"),
    Rect: rect,
    Border: [0, 0, 0],
    A: {
        Type: pdf_lib_1.PDFName.of("Action"),
        S: pdf_lib_1.PDFName.of("URI"),
        URI: pdf_lib_1.PDFString.of(url),
    },
}));
(0, node_test_1.default)("buildDocumentUrlVariants normalizes trailing slashes and hashes", () => {
    const variants = (0, pdf_link_utils_1.buildDocumentUrlVariants)("http://localhost:9003/installation/installation_process/#overview");
    strict_1.default.deepEqual(variants, [
        "http://localhost:9003/installation/installation_process",
        "http://localhost:9003/installation/installation_process/",
    ]);
});
(0, node_test_1.default)("buildDocumentUrlVariants includes versionless and index aliases", () => {
    const variants = (0, pdf_link_utils_1.buildDocumentUrlVariants)("http://localhost:9003/0.12.0/use-cases/index");
    strict_1.default.deepEqual(variants, [
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
(0, node_test_1.default)("buildDocumentUrlVariants preserves offline hash-router routes", () => {
    const variants = (0, pdf_link_utils_1.buildDocumentUrlVariants)("file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process/");
    strict_1.default.deepEqual(variants, [
        "file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process",
        "file:///tmp/docs/build-offline/index.html#/0.12.0/installation/installation_process/",
        "file:///tmp/docs/build-offline/index.html#/installation/installation_process",
        "file:///tmp/docs/build-offline/index.html#/installation/installation_process/",
    ]);
});
(0, node_test_1.default)("buildDocumentUrlVariants strips nested section hashes from offline routes", () => {
    const variants = (0, pdf_link_utils_1.buildDocumentUrlVariants)("file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart#next-steps");
    strict_1.default.deepEqual(variants, [
        "file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart",
        "file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart/",
        "file:///tmp/docs/build-offline/index.html#/quickstart",
        "file:///tmp/docs/build-offline/index.html#/quickstart/",
    ]);
});
(0, node_test_1.default)("buildLinkTargetUrlVariants preserves browser section fragments", () => {
    const variants = (0, pdf_link_utils_1.buildLinkTargetUrlVariants)("http://localhost:9003/installation/system_requirements/#special-considerations");
    strict_1.default.deepEqual(variants, [
        "http://localhost:9003/installation/system_requirements#special-considerations",
        "http://localhost:9003/installation/system_requirements/#special-considerations",
    ]);
});
(0, node_test_1.default)("buildLinkTargetUrlVariants preserves offline hash-router section fragments", () => {
    const variants = (0, pdf_link_utils_1.buildLinkTargetUrlVariants)("file:///tmp/docs/build-offline/index.html#/0.12.0/system_requirements#special-considerations");
    strict_1.default.deepEqual(variants, [
        "file:///tmp/docs/build-offline/index.html#/0.12.0/system_requirements#special-considerations",
        "file:///tmp/docs/build-offline/index.html#/0.12.0/system_requirements/#special-considerations",
        "file:///tmp/docs/build-offline/index.html#/system_requirements#special-considerations",
        "file:///tmp/docs/build-offline/index.html#/system_requirements/#special-considerations",
    ]);
});
(0, node_test_1.default)("rewritePdfInternalLinks converts local doc URLs into internal destinations", async () => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page1 = pdfDoc.addPage([600, 800]);
    const page2 = pdfDoc.addPage([600, 800]);
    page1.node.addAnnot(createUriLinkAnnotation(pdfDoc, "http://localhost:9003/installation/process", [
        10, 10, 100, 30,
    ]));
    page1.node.addAnnot(createUriLinkAnnotation(pdfDoc, "https://docs.kamiwaza.ai/sdk/api/", [
        10, 40, 100, 60,
    ]));
    const replacements = (0, pdf_link_utils_1.rewritePdfInternalLinks)(pdfDoc, new Map([["http://localhost:9003/installation/process", 1]]));
    strict_1.default.equal(replacements, 1);
    const annots = page1.node.lookup(pdf_lib_1.PDFName.of("Annots"), pdf_lib_1.PDFArray);
    const rewrittenAnnot = annots.lookup(0, pdf_lib_1.PDFDict);
    strict_1.default.equal(rewrittenAnnot.lookupMaybe(pdf_lib_1.PDFName.of("A"), pdf_lib_1.PDFDict), undefined);
    const dest = rewrittenAnnot.lookup(pdf_lib_1.PDFName.of("Dest"), pdf_lib_1.PDFArray);
    strict_1.default.equal(dest.get(0), page2.ref);
    strict_1.default.equal(dest.lookup(1, pdf_lib_1.PDFName).asString(), "/XYZ");
    strict_1.default.equal(dest.lookup(2, pdf_lib_1.PDFNumber).asNumber(), 0);
    const untouchedAnnot = annots.lookup(1, pdf_lib_1.PDFDict);
    const action = untouchedAnnot.lookup(pdf_lib_1.PDFName.of("A"), pdf_lib_1.PDFDict);
    const uri = action.lookup(pdf_lib_1.PDFName.of("URI"), pdf_lib_1.PDFString, pdf_lib_1.PDFHexString).decodeText();
    strict_1.default.equal(uri, "https://docs.kamiwaza.ai/sdk/api/");
});
(0, node_test_1.default)("rewritePdfInternalLinks converts offline file URLs into internal destinations", async () => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page1 = pdfDoc.addPage([600, 800]);
    const page2 = pdfDoc.addPage([600, 800]);
    page1.node.addAnnot(createUriLinkAnnotation(pdfDoc, "file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart/", [10, 10, 100, 30]));
    const replacements = (0, pdf_link_utils_1.rewritePdfInternalLinks)(pdfDoc, new Map([["file:///tmp/docs/build-offline/index.html#/0.12.0/quickstart", 1]]));
    strict_1.default.equal(replacements, 1);
    const annots = page1.node.lookup(pdf_lib_1.PDFName.of("Annots"), pdf_lib_1.PDFArray);
    const rewrittenAnnot = annots.lookup(0, pdf_lib_1.PDFDict);
    strict_1.default.equal(rewrittenAnnot.lookupMaybe(pdf_lib_1.PDFName.of("A"), pdf_lib_1.PDFDict), undefined);
    const dest = rewrittenAnnot.lookup(pdf_lib_1.PDFName.of("Dest"), pdf_lib_1.PDFArray);
    strict_1.default.equal(dest.get(0), page2.ref);
});
(0, node_test_1.default)("rewritePdfInternalLinks preserves section destinations", async () => {
    const pdfDoc = await pdf_lib_1.PDFDocument.create();
    const page1 = pdfDoc.addPage([600, 800]);
    const page2 = pdfDoc.addPage([600, 800]);
    page1.node.addAnnot(createUriLinkAnnotation(pdfDoc, "http://localhost:9003/installation/system_requirements#special-considerations", [10, 10, 100, 30]));
    const replacements = (0, pdf_link_utils_1.rewritePdfInternalLinks)(pdfDoc, new Map([
        [
            "http://localhost:9003/installation/system_requirements#special-considerations",
            { pageIndex: 1, y: 512 },
        ],
    ]));
    strict_1.default.equal(replacements, 1);
    const annots = page1.node.lookup(pdf_lib_1.PDFName.of("Annots"), pdf_lib_1.PDFArray);
    const rewrittenAnnot = annots.lookup(0, pdf_lib_1.PDFDict);
    const dest = rewrittenAnnot.lookup(pdf_lib_1.PDFName.of("Dest"), pdf_lib_1.PDFArray);
    strict_1.default.equal(dest.get(0), page2.ref);
    strict_1.default.equal(dest.lookup(2, pdf_lib_1.PDFNumber).asNumber(), 0);
    strict_1.default.equal(dest.lookup(3, pdf_lib_1.PDFNumber).asNumber(), 512);
});
