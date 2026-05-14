#!/usr/bin/env node
/**
 * Offline Docusaurus build orchestrator.
 *
 * Wraps the Docusaurus offline build in a swap → build → restore loop so the
 * SDK versioned sidebar JSON files briefly take their offline (doc-form)
 * shape during the build and are unconditionally reverted to their canonical
 * (link-form) shape afterwards, even on build failure.
 *
 * The link form is what gets committed and what the hosted site needs (so the
 * REST API Reference sidebar item opens the live Redocusaurus page at
 * /sdk/api/). The doc form is what the offline build needs (so the same item
 * targets the in-bundle api-reference.mdx placeholder, avoiding a dead
 * /sdk/api/ click in the hash router and a dead link in the merged PDF).
 *
 * See ../../scripts/transform-versioned-sdk-sidebars.cjs for the JSON
 * mutation logic.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const transformerScript = path.join(
	repoRoot,
	"scripts",
	"transform-versioned-sdk-sidebars.cjs",
);

function runNode(args, opts = {}) {
	const result = spawnSync(process.execPath, args, {
		stdio: "inherit",
		...opts,
	});
	if (result.error) {
		throw result.error;
	}
	return result.status ?? 0;
}

function runDocusaurus() {
	const localBin =
		process.platform === "win32" ? "docusaurus.cmd" : "docusaurus";
	const docusaurusBin = path.join(__dirname, "..", "node_modules", ".bin", localBin);
	const result = spawnSync(
		docusaurusBin,
		["build", "--out-dir", "build-offline"],
		{
			stdio: "inherit",
			env: { ...process.env, DOCUSAURUS_OFFLINE_BUILD: "true" },
		},
	);
	if (result.error) {
		throw result.error;
	}
	return result.status ?? 0;
}

const swapStatus = runNode([transformerScript, "--to-doc-form"]);
if (swapStatus !== 0) {
	console.error(
		`SDK versioned sidebar swap failed (exit ${swapStatus}); aborting offline build.`,
	);
	process.exit(swapStatus);
}

let buildStatus = 1;
try {
	buildStatus = runDocusaurus();
} finally {
	const restoreStatus = runNode([transformerScript, "--restore"]);
	if (restoreStatus !== 0) {
		console.error(
			`SDK versioned sidebar restore failed (exit ${restoreStatus}); manual revert required.`,
		);
		if (buildStatus === 0) {
			process.exit(restoreStatus);
		}
	}
}

process.exit(buildStatus);
