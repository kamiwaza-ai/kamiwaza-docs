import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { sanitizeRemoteUrl } from "./sync-openapi";

const syncScript = fs.readFileSync(
	path.resolve(__dirname, "sync-openapi.ts"),
	"utf-8",
);
const publishedSpec = fs.readFileSync(
	path.resolve(__dirname, "../docs/api/openapi.json"),
	"utf-8",
);
const publishedMetadata = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../docs/api/openapi-metadata.json"),
		"utf-8",
	),
);

test("local OpenAPI generation uses the selected core project environment", () => {
	assert.match(
		syncScript,
		/execFileSync\(\s*"uv",\s*\["--project", repoPath, "run", "python", "-c", pythonScript\]/,
	);
	assert.doesNotMatch(syncScript, /execFileSync\("\.\/scripts\/kw_py"/);
	assert.match(syncScript, /maxBuffer:\s*16 \* 1024 \* 1024/);
});

test("published OpenAPI surface does not name the retired Traefik provider", () => {
	assert.doesNotMatch(publishedSpec, /traefik/i);
});

test("published OpenAPI metadata uses a portable GitHub source URL", () => {
	assert.equal(
		publishedMetadata.sourceRemote,
		"https://github.com/kamiwaza-internal/kamiwaza",
	);
});

test("GitHub source remotes normalize to one portable HTTPS URL", () => {
	const expected = "https://github.com/kamiwaza-internal/kamiwaza";
	for (const remote of [
		"git@github.com:kamiwaza-internal/kamiwaza.git",
		"git@github.com:kamiwaza-internal/kamiwaza.git/",
		"ssh://git@github.com/kamiwaza-internal/kamiwaza.git",
		"https://github.com/kamiwaza-internal/kamiwaza.git",
		"https://token@github.com/kamiwaza-internal/kamiwaza/",
	]) {
		assert.equal(sanitizeRemoteUrl(remote), expected);
	}
});
