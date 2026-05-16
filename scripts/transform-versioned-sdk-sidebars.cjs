#!/usr/bin/env node
/**
 * Build-time mutator for SDK versioned sidebar JSON files.
 *
 * Versioned sidebars under docs/sdk_versioned_sidebars/version-X.Y.Z-sidebars.json
 * MUST be JSON (Docusaurus hardcodes the .json extension and parses with
 * fs.readJSON). They cannot conditionally branch on DOCUSAURUS_OFFLINE_BUILD
 * the way docs/sidebars-sdk.ts does.
 *
 * The hosted (non-offline) build needs the canonical link form so the SDK
 * sidebar opens the live Redocusaurus reference at /sdk/api/. The offline
 * build needs the doc form so the same sidebar item targets the
 * api-reference.mdx placeholder bundled into the offline output (no dead
 * /sdk/api/ click in the offline shell, no broken link in the merged PDF).
 *
 * Usage:
 *   node scripts/transform-versioned-sdk-sidebars.cjs --to-doc-form
 *   node scripts/transform-versioned-sdk-sidebars.cjs --restore
 *
 * The orchestrator in docs/scripts/build-offline.cjs runs --to-doc-form,
 * runs the offline Docusaurus build, and unconditionally runs --restore in
 * a finally block so a failed build never leaves the working tree mutated.
 */

const fs = require("node:fs");
const path = require("node:path");

const SIDEBARS_DIR = path.resolve(
	__dirname,
	"..",
	"docs",
	"sdk_versioned_sidebars",
);
const REDOCUSAURUS_HREF = "/sdk/api/";
const PLACEHOLDER_DOC_ID = "api-reference";
const DEFAULT_LABEL = "REST API Reference";

function transformItems(items, mode) {
	if (!Array.isArray(items)) {
		return items;
	}

	return items.map((item) => {
		if (typeof item !== "object" || item === null) {
			return item;
		}

		let next = item;

		if (Array.isArray(next.items)) {
			next = { ...next, items: transformItems(next.items, mode) };
		}

		if (mode === "to-doc-form") {
			if (next.type === "link" && next.href === REDOCUSAURUS_HREF) {
				return {
					type: "doc",
					id: PLACEHOLDER_DOC_ID,
					label: next.label || DEFAULT_LABEL,
				};
			}
		} else if (mode === "to-link-form") {
			if (next.type === "doc" && next.id === PLACEHOLDER_DOC_ID) {
				return {
					type: "link",
					label: next.label || DEFAULT_LABEL,
					href: REDOCUSAURUS_HREF,
				};
			}
		}

		return next;
	});
}

function processFile(filePath, mode) {
	const raw = fs.readFileSync(filePath, "utf-8");
	const parsed = JSON.parse(raw);

	const transformed = {};
	let mutated = false;

	for (const [sidebarName, items] of Object.entries(parsed)) {
		const newItems = transformItems(items, mode);
		transformed[sidebarName] = newItems;

		if (JSON.stringify(newItems) !== JSON.stringify(items)) {
			mutated = true;
		}
	}

	if (!mutated) {
		return false;
	}

	fs.writeFileSync(filePath, `${JSON.stringify(transformed, null, 2)}\n`);
	return true;
}

function main() {
	const arg = process.argv[2];

	let mode;
	if (arg === "--to-doc-form") {
		mode = "to-doc-form";
	} else if (arg === "--restore") {
		mode = "to-link-form";
	} else {
		console.error("Usage: transform-versioned-sdk-sidebars.cjs --to-doc-form|--restore");
		process.exit(2);
	}

	if (!fs.existsSync(SIDEBARS_DIR)) {
		console.log(`No SDK versioned sidebars directory at ${SIDEBARS_DIR}; nothing to do.`);
		return;
	}

	const files = fs
		.readdirSync(SIDEBARS_DIR)
		.filter((f) => /^version-.+-sidebars\.json$/.test(f))
		.map((f) => path.join(SIDEBARS_DIR, f));

	if (files.length === 0) {
		console.log("No versioned SDK sidebar files found.");
		return;
	}

	const action = mode === "to-doc-form" ? "swapped to doc" : "restored to link";
	for (const file of files) {
		const changed = processFile(file, mode);
		const rel = path.relative(process.cwd(), file);
		console.log(`${changed ? action : "no change"}: ${rel}`);
	}
}

main();
