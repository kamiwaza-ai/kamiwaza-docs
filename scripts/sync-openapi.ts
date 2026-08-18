#!/usr/bin/env npx ts-node

/**
 * Sync OpenAPI spec from kamiwaza repo for API documentation generation.
 *
 * The OpenAPI spec is generated dynamically by the Kamiwaza platform (FastAPI),
 * so we sync from the local working directory. When the live API endpoint is
 * unavailable or requires authentication, this script can generate the schema
 * directly from the local source tree using temporary SQLite files.
 *
 * To sync from a specific branch:
 * 1. Checkout the desired branch in the kamiwaza repo
 * 2. Run the platform to generate openapi.json (or use existing generated file)
 * 3. Run this script without arguments
 *
 * Usage:
 *   npx ts-node scripts/sync-openapi.ts [--generate]
 *
 * Options:
 *   --generate    Prefer a fresh spec from the running platform, then fall back
 *                 to generating it directly from the local source tree
 *
 * Examples:
 *   npx ts-node scripts/sync-openapi.ts                    # Uses existing openapi.json from local repo, or falls back to local source generation
 *   npx ts-node scripts/sync-openapi.ts --generate         # Prefers the running platform, then falls back to local source generation
 *
 * To sync from a specific release:
 *   cd ../platform/kamiwaza && git checkout release/0.9.3
 *   # Ensure openapi.json is generated (run platform or use existing)
 *   cd ../docs/kamiwaza-docs && npm run sync-openapi
 *
 * Environment variables:
 *   KAMIWAZA_REPO_PATH - Path to local kamiwaza repo (default: ../platform/kamiwaza)
 *   KAMIWAZA_API_URL   - URL to fetch OpenAPI spec from (default: http://localhost:7777/openapi.json)
 */

import { execFileSync } from "child_process";
import crypto from "crypto";
import fs from "fs-extra";
import os from "os";
import path from "path";

const OPENAPI_FILENAME = "openapi.json";
const TARGET_DIR = path.resolve(__dirname, "../docs/api");
const TARGET_FILE = path.join(TARGET_DIR, OPENAPI_FILENAME);

function resolveKamiwazaRepoPath(): string {
	const override = process.env.KAMIWAZA_REPO_PATH;
	const candidates = [
		override,
		path.resolve(__dirname, "../../platform/kamiwaza"),
		path.resolve(__dirname, "../../../platform/kamiwaza"),
		path.resolve(__dirname, "../../kamiwaza"),
	].filter(Boolean) as string[];

	for (const candidate of candidates) {
		if (fs.existsSync(path.join(candidate, ".git"))) {
			return candidate;
		}
	}

	const tried = candidates.map((c) => `  - ${c}`).join("\n");
	throw new Error(
		`Unable to locate kamiwaza repo. Set KAMIWAZA_REPO_PATH or place the repo in one of the expected locations:\n${tried}`,
	);
}

function getCurrentBranch(repoPath: string): string {
	try {
		const result = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
			cwd: repoPath,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return result.trim();
	} catch {
		return "unknown";
	}
}

function getCurrentCommit(repoPath: string): string {
	try {
		const result = execFileSync("git", ["rev-parse", "HEAD"], {
			cwd: repoPath,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
		});
		return result.trim();
	} catch {
		return "unknown";
	}
}

/**
 * Strip user-info (e.g. `https://<token>@github.com/...`) from the remote URL
 * before persisting it to tracked metadata. Git lets users embed access
 * tokens directly in `remote.origin.url`, and a previous fix that swapped a
 * leaky absolute path for the remote URL would otherwise re-introduce a
 * different leak. Normalize GitHub SSH remotes to portable HTTPS metadata so
 * the generated artifact does not vary with the checkout transport.
 */
function canonicalGitHubRemote(repositoryPath: string): string {
	const repository = repositoryPath
		.replace(/^\/+|\/+$/g, "")
		.replace(/\.git$/i, "");
	return `https://github.com/${repository}`;
}

export function sanitizeRemoteUrl(raw: string): string {
	if (!raw) {
		return raw;
	}
	const githubSshRemote = raw.trim().match(/^git@github\.com:(.+)$/);
	if (githubSshRemote) {
		return canonicalGitHubRemote(githubSshRemote[1]);
	}
	if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(raw)) {
		try {
			const parsed = new URL(raw);
			parsed.username = "";
			parsed.password = "";
			if (parsed.hostname.toLowerCase() === "github.com") {
				return canonicalGitHubRemote(parsed.pathname);
			}
			return parsed.toString();
		} catch {
			// Fall through and return the raw value if URL parsing failed —
			// better to skip sanitization than to drop the field entirely on
			// an unexpectedly shaped URL.
			return raw;
		}
	}
	return raw;
}

function getOriginUrl(repoPath: string): string {
	try {
		const result = execFileSync(
			"git",
			["config", "--get", "remote.origin.url"],
			{
				cwd: repoPath,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
			},
		);
		return sanitizeRemoteUrl(result.trim());
	} catch {
		return "unknown";
	}
}

async function fetchFromRunningPlatform(): Promise<string> {
	const apiUrl =
		process.env.KAMIWAZA_API_URL || "http://localhost:7777/openapi.json";
	console.log(`Fetching OpenAPI spec from running platform: ${apiUrl}`);

	try {
		const response = await fetch(apiUrl);
		if (!response.ok) {
			throw new Error(
				`Failed to fetch from ${apiUrl}: ${response.status} ${response.statusText}`,
			);
		}
		return response.text();
	} catch (error) {
		const cause =
			error && typeof error === "object" && "cause" in error
				? (error as { cause?: unknown }).cause
				: undefined;
		const detail =
			error instanceof Error
				? cause instanceof Error
					? `${error.message} (${cause.message})`
					: error.message
				: String(error);
		throw new Error(`Failed to fetch from ${apiUrl}: ${detail}`);
	}
}

function getOpenAPIFromLocalRepo(repoPath: string): string {
	const openapiPath = path.join(repoPath, OPENAPI_FILENAME);
	const branch = getCurrentBranch(repoPath);

	console.log(`Using OpenAPI spec from local repo: ${repoPath}`);
	console.log(`  Current branch: ${branch}`);

	if (!fs.existsSync(openapiPath)) {
		throw new Error(
			`OpenAPI spec not found at: ${openapiPath}\n\n` +
				`The openapi.json file is generated by the Kamiwaza platform.\n` +
				`To generate it:\n` +
				`  1. Run this script with --generate to prefer the running platform\n` +
				`  2. Or let the script fall back to generating the schema from the local source tree\n` +
				`  3. Or copy an existing openapi.json to the repo root.`,
		);
	}
	return fs.readFileSync(openapiPath, "utf-8");
}

function generateOpenAPIFromLocalSource(repoPath: string): string {
	const branch = getCurrentBranch(repoPath);
	console.log(`Generating OpenAPI spec from local source: ${repoPath}`);
	console.log(`  Current branch: ${branch}`);

	const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kamiwaza-openapi-"));
	const tempRoot = path.join(tempDir, "root");
	fs.ensureDirSync(tempRoot);

	const pythonScript = `
import json
from kamiwaza.app import create_app

app = create_app(root_path="/api", lifespan=None)
print(json.dumps(app.openapi()))
`.trim();

	try {
		return execFileSync(
			"uv",
			["--project", repoPath, "run", "python", "-c", pythonScript],
			{
				cwd: repoPath,
				encoding: "utf-8",
				stdio: ["pipe", "pipe", "pipe"],
				maxBuffer: 16 * 1024 * 1024,
				env: {
					...process.env,
					KAMIWAZA_ENV: process.env.KAMIWAZA_ENV || "dev",
					KAMIWAZA_LITE: process.env.KAMIWAZA_LITE || "true",
					KAMIWAZA_ROOT: process.env.KAMIWAZA_ROOT || tempRoot,
					// create_app() -> init_auth() requires the RBAC policy file; its
					// default derives from KAMIWAZA_ROOT (<root>/runtime/auth_gateway_policy.yaml),
					// which the ephemeral tempRoot does not have. Point at the policy
					// shipped in the kamiwaza repo so from-source generation is
					// self-contained (no running platform, no manual staging).
					AUTH_GATEWAY_POLICY_FILE:
						process.env.AUTH_GATEWAY_POLICY_FILE ||
						path.join(repoPath, "config", "auth_gateway_policy.yaml"),
					DATABASE_URL:
						process.env.DATABASE_URL ||
						`sqlite:///${path.join(tempDir, "main.db")}`,
					CLUSTER_DATABASE_URL:
						process.env.CLUSTER_DATABASE_URL ||
						`sqlite:///${path.join(tempDir, "cluster.db")}`,
					AUTH_DATABASE_URL:
						process.env.AUTH_DATABASE_URL ||
						`sqlite:///${path.join(tempDir, "auth.db")}`,
					// Ephemeral per-invocation secret so no literal is committed.
					AUTH_FORWARD_HEADER_SECRET:
						process.env.AUTH_FORWARD_HEADER_SECRET ||
						crypto.randomBytes(32).toString("hex"),
				},
			},
		);
	} catch (error: any) {
		const stderr =
			typeof error?.stderr === "string" && error.stderr.trim()
				? error.stderr.trim()
				: typeof error?.stdout === "string" && error.stdout.trim()
					? error.stdout.trim()
					: error instanceof Error
						? error.message
						: String(error);
		throw new Error(`Local source generation failed:\n${stderr}`);
	} finally {
		fs.removeSync(tempDir);
	}
}

async function resolveOpenAPIContent(
	repoPath: string,
	generateFromPlatform: boolean,
): Promise<string> {
	if (!generateFromPlatform) {
		try {
			return getOpenAPIFromLocalRepo(repoPath);
		} catch (error) {
			console.warn(
				`\nLocal openapi.json not available; falling back to local source generation.\n  Reason: ${
					error instanceof Error ? error.message : String(error)
				}\n`,
			);
			return generateOpenAPIFromLocalSource(repoPath);
		}
	}

	try {
		return await fetchFromRunningPlatform();
	} catch (error) {
		console.warn(
			`\nLive OpenAPI fetch failed; falling back to local source generation.\n  Reason: ${
				error instanceof Error ? error.message : String(error)
			}\n`,
		);
		return generateOpenAPIFromLocalSource(repoPath);
	}
}

function getDocsVersion(): string {
	const packageJsonPaths = [
		path.resolve(__dirname, "../package.json"),
		path.resolve(__dirname, "../docs/package.json"),
	];

	for (const packageJsonPath of packageJsonPaths) {
		try {
			const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
			if (packageJson.version) {
				return packageJson.version;
			}
		} catch {
			// Try the next known package manifest.
		}
	}

	console.warn(
		"Unable to determine docs version from package.json; defaulting API docs version to 0.0.0.",
	);
	return "0.0.0";
}

function patchSpecForDocs(spec: any): void {
	// Use Kamiwaza branding/versioning in the published API docs rather than the
	// generic FastAPI defaults emitted by the backend generator.
	if (!spec.info) {
		spec.info = {};
	}
	spec.info.title = "Kamiwaza REST API";

	const chunkResponse =
		spec?.paths?.["/embedding/chunk"]?.post?.responses?.["200"];

	if (chunkResponse?.content?.["application/json"]?.schema && spec.components?.schemas) {
		spec.components.schemas.ChunkTextListResponse = {
			type: "array",
			items: {
				type: "string",
			},
			title: "ChunkTextListResponse",
		};
		chunkResponse.description =
			"Successful Response. Returns an array of chunk strings by default, or a ChunkResponse object when return_metadata=true.";
		chunkResponse.content["application/json"].schema = {
			title: "ChunkTextResponse",
			anyOf: [
				{
					$ref: "#/components/schemas/ChunkTextListResponse",
				},
				{
					$ref: "#/components/schemas/ChunkResponse",
				},
			],
		};
	}
}

async function main() {
	const args = process.argv.slice(2);
	const generateFromPlatform = args.includes("--generate");

	console.log("=== Kamiwaza OpenAPI Sync ===\n");

	// Find kamiwaza repo
	const repoPath = resolveKamiwazaRepoPath();
	console.log(`Kamiwaza repo: ${repoPath}`);

	// Get OpenAPI spec
	const content = await resolveOpenAPIContent(repoPath, generateFromPlatform);

	// Parse and validate
	let spec: any;
	try {
		spec = JSON.parse(content);
	} catch (e) {
		throw new Error(`Invalid JSON in OpenAPI spec: ${e}`);
	}

	if (!spec.openapi || !spec.paths) {
		throw new Error("Invalid OpenAPI spec: missing required fields");
	}

	// Patch the API version to match docs version
	const docsVersion = getDocsVersion();
	const originalVersion = spec?.info?.version || "unknown";
	if (spec.info) {
		spec.info.version = docsVersion;
	}

	patchSpecForDocs(spec);

	const pathCount = Object.keys(spec.paths).length;
	const schemaCount = Object.keys(spec.components?.schemas || {}).length;

	console.log(`\nOpenAPI spec info:`);
	console.log(`  - OpenAPI version: ${spec.openapi}`);
	console.log(`  - Original API version: ${originalVersion}`);
	console.log(`  - Patched API version: ${docsVersion}`);
	console.log(`  - Endpoints: ${pathCount}`);
	console.log(`  - Schemas: ${schemaCount}`);

	// Ensure target directory exists
	await fs.ensureDir(TARGET_DIR);

	// Write the spec
	await fs.writeFile(TARGET_FILE, JSON.stringify(spec, null, 2));
	console.log(`\nWritten to: ${TARGET_FILE}`);

	const sourceBranch = getCurrentBranch(repoPath);
	const sourceCommit = getCurrentCommit(repoPath);
	const sourceRemote = getOriginUrl(repoPath);

	// Identify the SDK source by stable, machine-independent fields rather than
	// the absolute checkout path. The path leaks the developer / CI workspace
	// location (often including a username) into a tracked metadata file, which
	// then ends up in commits / image layers consumed elsewhere.
	const metadata = {
		syncedAt: new Date().toISOString(),
		sourceRemote,
		sourceBranch,
		sourceCommit,
		originalApiVersion: originalVersion,
		patchedApiVersion: docsVersion,
		endpoints: pathCount,
		schemas: schemaCount,
	};
	await fs.writeFile(
		path.join(TARGET_DIR, "openapi-metadata.json"),
		JSON.stringify(metadata, null, 2),
	);

	console.log("\nSync complete!");
	console.log("\nNext steps:");
	console.log("  1. Run `npm run build` to regenerate API docs");
	console.log("  2. Review changes at /sdk/api-reference");
}

if (require.main === module) {
	main().catch((err) => {
		console.error("\nError:", err.message);
		process.exit(1);
	});
}
