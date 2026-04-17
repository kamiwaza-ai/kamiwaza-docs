import test from "node:test";
import assert from "node:assert/strict";
import path from "path";
import { pathToFileURL } from "url";

// Prefer the TypeScript source over the stale compiled JS in this folder.
const { PDFGenerator } = require("./generate-pdf");

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "pdf-config.yaml");
const offlineIndexHref = pathToFileURL(
	path.join(repoRoot, "docs", "build-offline", "index.html"),
).href;

test("buildDocumentUrl normalizes folder index docs for offline versioned routes", () => {
	const generator = new PDFGenerator(configPath) as any;

	const url = generator.buildDocumentUrl(
		{ id: "use-cases/index", title: "Use Cases" },
		"0.12.0",
	);

	assert.equal(url, `${offlineIndexHref}#/0.12.0/use-cases`);
});

test("generateTitleFromId uses parent folder name for index docs", () => {
	const generator = new PDFGenerator(configPath) as any;

	assert.equal(generator.generateTitleFromId("use-cases/index"), "Use Cases");
});

test("buildDocumentUrl maps sdk intro to the version root route", () => {
	const generator = new PDFGenerator(configPath) as any;

	const url = generator.buildDocumentUrl(
		{ id: "sdk/intro", title: "SDK - Introduction" },
		"0.12.0",
	);

	assert.equal(url, `${offlineIndexHref}#/sdk/0.12.0`);
});
