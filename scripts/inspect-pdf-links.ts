/**
 * Inspect Link annotations in a PDF: count URI (external) vs Dest (internal).
 * Usage: npx ts-node scripts/inspect-pdf-links.ts path/to/file.pdf
 */
import * as fs from "node:fs";
import {
	PDFArray,
	PDFDict,
	PDFDocument,
	PDFHexString,
	PDFName,
	PDFString,
} from "pdf-lib";

const ANNOTS = PDFName.of("Annots");
const SUBTYPE = PDFName.of("Subtype");
const LINK = PDFName.of("Link");
const A = PDFName.of("A");
const S = PDFName.of("S");
const URI = PDFName.of("URI");
const DEST = PDFName.of("Dest");
const GOTO = PDFName.of("GoTo");

async function main() {
	const pdfPath = process.argv[2];
	if (!pdfPath) {
		console.error("Usage: inspect-pdf-links.ts <file.pdf>");
		process.exit(1);
	}
	const buf = fs.readFileSync(pdfPath);
	const pdf = await PDFDocument.load(buf);
	const pages = pdf.getPages();
	let uriCount = 0;
	let internalNavCount = 0;
	let fileUriSamples: string[] = [];
	let otherUriSamples: string[] = [];

	for (let pi = 0; pi < pages.length; pi++) {
		const page = pages[pi]!;
		const annots = page.node.lookupMaybe(ANNOTS, PDFArray);
		if (!annots) {
			continue;
		}
		for (let i = 0; i < annots.size(); i++) {
			const annot = annots.lookup(i, PDFDict);
			const st = annot.lookupMaybe(SUBTYPE, PDFName);
			if (!st || st.asString() !== LINK.asString()) {
				continue;
			}
			if (annot.get(DEST) !== undefined) {
				internalNavCount++;
				continue;
			}
			const action = annot.lookupMaybe(A, PDFDict);
			if (!action) {
				continue;
			}
			const stype = action.lookupMaybe(S, PDFName);
			if (stype?.asString() === GOTO.asString()) {
				internalNavCount++;
				continue;
			}
			if (!stype || stype.asString() !== PDFName.of("URI").asString()) {
				continue;
			}
			const uriObj = action.lookupMaybe(URI, PDFString, PDFHexString);
			if (!uriObj) {
				continue;
			}
			const text = uriObj.decodeText();
			uriCount++;
			if (text.startsWith("file:") && fileUriSamples.length < 8) {
				fileUriSamples.push(`page ${pi + 1}: ${text.slice(0, 120)}`);
			} else if (!text.startsWith("file:") && otherUriSamples.length < 5) {
				otherUriSamples.push(`page ${pi + 1}: ${text.slice(0, 120)}`);
			}
		}
	}

	console.log(
		JSON.stringify(
			{
				pages: pages.length,
				linkInternalNav: internalNavCount,
				linkWithUri: uriCount,
			},
			null,
			2,
		),
	);
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
