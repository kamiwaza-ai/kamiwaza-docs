#!/usr/bin/env node
/**
 * Offline Docusaurus build orchestrator.
 *
 * Wraps the Docusaurus offline build in a swap → build → restore loop so the
 * SDK versioned sidebar JSON files briefly take their offline (doc-form)
 * shape during the build and are unconditionally reverted to their canonical
 * (link-form) shape afterwards, even on build failure or interrupt.
 *
 * The link form is what gets committed and what the hosted site needs (so the
 * REST API Reference sidebar item opens the live Redocusaurus page at
 * /sdk/api/). The doc form is what the offline build needs (so the same item
 * targets the in-bundle api-reference.mdx placeholder, avoiding a dead
 * /sdk/api/ click in the hash router and a dead link in the merged PDF).
 *
 * Restore robustness:
 *   - try/finally covers normal completion and build-time exceptions.
 *   - SIGINT/SIGTERM handlers cover signal cases the finally block alone does
 *     not handle: when a TTY's Ctrl+C delivers SIGINT to the whole process
 *     group, the docusaurus child often dies but Node's default SIGINT
 *     behaviour terminates this process before control returns from
 *     spawnSync, skipping finally. The handler intercepts both signals,
 *     restores sidebars, then explicitly exits (130 for SIGINT, 143 for
 *     SIGTERM) so the parent shell sees the conventional code.
 *   - SIGKILL and hard process crashes are not recoverable; if the working
 *     tree ends up with mutated sidebar JSON, run
 *       node scripts/transform-versioned-sdk-sidebars.cjs --restore
 *     manually from the repo root.
 *
 * See ../../scripts/transform-versioned-sdk-sidebars.cjs for the JSON
 * mutation logic.
 */

const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..", "..");
const docsDir = path.resolve(__dirname, "..");
const transformerScript = path.join(
	repoRoot,
	"scripts",
	"transform-versioned-sdk-sidebars.cjs",
);

let sidebarsMutated = false;
let restoreInProgress = false;

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

function restoreSidebars(reason) {
	if (!sidebarsMutated || restoreInProgress) {
		return 0;
	}
	restoreInProgress = true;
	console.log(
		`Restoring SDK versioned sidebars to canonical link form (reason: ${reason}).`,
	);
	const status = spawnSync(
		process.execPath,
		[transformerScript, "--restore"],
		{ stdio: "inherit" },
	).status ?? 0;
	if (status === 0) {
		sidebarsMutated = false;
	}
	restoreInProgress = false;
	return status;
}

function handleSignal(signal) {
	const exitCode = signal === "SIGINT" ? 130 : 143;
	const restoreStatus = restoreSidebars(signal);
	if (restoreStatus !== 0) {
		console.error(
			`Sidebar restore failed during ${signal} handling (exit ${restoreStatus}); manual revert required.`,
		);
	}
	process.exit(exitCode);
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

function runDocusaurus() {
	const localBin =
		process.platform === "win32" ? "docusaurus.cmd" : "docusaurus";
	const docusaurusBin = path.join(docsDir, "node_modules", ".bin", localBin);
	const result = spawnSync(
		docusaurusBin,
		["build", "--out-dir", "build-offline"],
		{
			stdio: "inherit",
			cwd: docsDir,
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
sidebarsMutated = true;

let buildStatus = 1;
try {
	buildStatus = runDocusaurus();
} finally {
	const restoreStatus = restoreSidebars("build complete");
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
