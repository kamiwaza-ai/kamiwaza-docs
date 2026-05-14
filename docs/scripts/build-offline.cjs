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
const fs = require("node:fs");
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

/**
 * Map a spawnSync result to a non-zero exit code on signal-killed children.
 *
 * `result.status` is null when the OS killed the child with a signal (OOM,
 * SIGTERM from a parent orchestrator, etc.). The previous implementation
 * coerced that to 0 with `?? 0`, which would (a) skip the abort branch in
 * the swap step and (b) make this script claim a successful offline build
 * despite missing or partial output. Map signal kills to 128 + the signal
 * number when we can resolve it, falling back to 1 otherwise so the
 * non-zero contract is preserved either way.
 */
function statusFromSpawnResult(result) {
	if (typeof result.status === "number") {
		return result.status;
	}
	if (result.signal) {
		const sigNumber = require("node:os").constants?.signals?.[result.signal];
		return typeof sigNumber === "number" ? 128 + sigNumber : 1;
	}
	return 1;
}

function runNode(args, opts = {}) {
	const result = spawnSync(process.execPath, args, {
		stdio: "inherit",
		...opts,
	});
	if (result.error) {
		throw result.error;
	}
	return statusFromSpawnResult(result);
}

function restoreSidebars(reason) {
	if (!sidebarsMutated || restoreInProgress) {
		return 0;
	}
	restoreInProgress = true;
	console.log(
		`Restoring SDK versioned sidebars to canonical link form (reason: ${reason}).`,
	);
	const result = spawnSync(
		process.execPath,
		[transformerScript, "--restore"],
		{ stdio: "inherit" },
	);
	const status = statusFromSpawnResult(result);
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

/**
 * Resolve the docusaurus binary across the install layouts contributors and
 * CI use:
 *   - `npm install` from `docs/`  → docs/node_modules/.bin/docusaurus
 *   - `npm install` from repo root only → root node_modules/.bin/docusaurus
 *     (root package.json declares @docusaurus/core; that's how the PDF
 *     auto-build path can run after a single root install)
 *   - PATH-resolved `docusaurus` (managed installs / Nix / corepack-style
 *     setups)
 *
 * Falling back to `null` when nothing resolves lets {@link runDocusaurus}
 * surface a clear ENOENT-equivalent error message instead of spawning a
 * non-existent binary.
 */
function resolveDocusaurusBin() {
	const localBin =
		process.platform === "win32" ? "docusaurus.cmd" : "docusaurus";
	const candidates = [
		path.join(docsDir, "node_modules", ".bin", localBin),
		path.join(repoRoot, "node_modules", ".bin", localBin),
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return { bin: candidate, viaPath: false };
		}
	}
	return { bin: localBin, viaPath: true };
}

function runDocusaurus() {
	const { bin, viaPath } = resolveDocusaurusBin();
	const result = spawnSync(bin, ["build", "--out-dir", "build-offline"], {
		stdio: "inherit",
		cwd: docsDir,
		env: { ...process.env, DOCUSAURUS_OFFLINE_BUILD: "true" },
		// PATH lookup needs `shell: true` on Windows for the .cmd shim; on POSIX
		// spawnSync handles it natively.
		shell: viaPath && process.platform === "win32",
	});
	if (result.error) {
		if (viaPath && result.error.code === "ENOENT") {
			throw new Error(
				`docusaurus binary not found in docs/node_modules/.bin, root node_modules/.bin, or PATH.\n` +
					`Run 'npm install' from either the repo root or the docs/ directory before invoking the offline build.`,
			);
		}
		throw result.error;
	}
	return statusFromSpawnResult(result);
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
