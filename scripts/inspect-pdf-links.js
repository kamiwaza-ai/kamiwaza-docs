"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Inspect Link annotations in a PDF: count URI (external) vs Dest (internal).
 * Usage: npx ts-node scripts/inspect-pdf-links.ts path/to/file.pdf
 */
const fs = __importStar(require("node:fs"));
const pdf_lib_1 = require("pdf-lib");
const ANNOTS = pdf_lib_1.PDFName.of("Annots");
const SUBTYPE = pdf_lib_1.PDFName.of("Subtype");
const LINK = pdf_lib_1.PDFName.of("Link");
const A = pdf_lib_1.PDFName.of("A");
const S = pdf_lib_1.PDFName.of("S");
const URI = pdf_lib_1.PDFName.of("URI");
const DEST = pdf_lib_1.PDFName.of("Dest");
const GOTO = pdf_lib_1.PDFName.of("GoTo");
async function main() {
    const pdfPath = process.argv[2];
    if (!pdfPath) {
        console.error("Usage: inspect-pdf-links.ts <file.pdf>");
        process.exit(1);
    }
    const buf = fs.readFileSync(pdfPath);
    const pdf = await pdf_lib_1.PDFDocument.load(buf);
    const pages = pdf.getPages();
    let uriCount = 0;
    let internalNavCount = 0;
    let fileUriSamples = [];
    let otherUriSamples = [];
    for (let pi = 0; pi < pages.length; pi++) {
        const page = pages[pi];
        const annots = page.node.lookupMaybe(ANNOTS, pdf_lib_1.PDFArray);
        if (!annots) {
            continue;
        }
        for (let i = 0; i < annots.size(); i++) {
            const annot = annots.lookup(i, pdf_lib_1.PDFDict);
            const st = annot.lookupMaybe(SUBTYPE, pdf_lib_1.PDFName);
            if (!st || st.asString() !== LINK.asString()) {
                continue;
            }
            if (annot.get(DEST) !== undefined) {
                internalNavCount++;
                continue;
            }
            const action = annot.lookupMaybe(A, pdf_lib_1.PDFDict);
            if (!action) {
                continue;
            }
            const stype = action.lookupMaybe(S, pdf_lib_1.PDFName);
            if (stype?.asString() === GOTO.asString()) {
                internalNavCount++;
                continue;
            }
            if (!stype || stype.asString() !== pdf_lib_1.PDFName.of("URI").asString()) {
                continue;
            }
            const uriObj = action.lookupMaybe(URI, pdf_lib_1.PDFString, pdf_lib_1.PDFHexString);
            if (!uriObj) {
                continue;
            }
            const text = uriObj.decodeText();
            uriCount++;
            if (text.startsWith("file:") && fileUriSamples.length < 8) {
                fileUriSamples.push(`page ${pi + 1}: ${text.slice(0, 120)}`);
            }
            else if (!text.startsWith("file:") && otherUriSamples.length < 5) {
                otherUriSamples.push(`page ${pi + 1}: ${text.slice(0, 120)}`);
            }
        }
    }
    console.log(JSON.stringify({
        pages: pages.length,
        linkInternalNav: internalNavCount,
        linkWithUri: uriCount,
    }, null, 2));
    if (fileUriSamples.length) {
        console.log("\nRemaining file: URI samples:");
        for (const s of fileUriSamples) {
            console.log(" ", s);
        }
    }
    if (otherUriSamples.length) {
        console.log("\nNon-file URI samples:");
        for (const s of otherUriSamples) {
            console.log(" ", s);
        }
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
