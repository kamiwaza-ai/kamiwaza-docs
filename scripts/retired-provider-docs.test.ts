import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..");
const retiredProvider = "trae" + "fik";

const providerTitle = `${retiredProvider[0].toUpperCase()}${retiredProvider.slice(1)}`;

const intentionalHistory: Record<string, string[]> = {
  "docs/docs/installation/offline_install.md": [
    `export KAMIWAZA_IMAGE_OVERRIDES="keycloak=\${CONTAINERS_TAG},postgres=v18.4,etcd=v3.6.10,kubectl=v1.35.5-dev,chainguard-base=\${CONTAINERS_TAG},${retiredProvider}=v3.6.20-kz.1,kafka-iamguarded=v4.3.0,neo4j=v5.26.25-kz.1,datahub-gms=\${CONTAINERS_TAG},datahub-frontend=\${CONTAINERS_TAG},datahub-upgrade=\${CONTAINERS_TAG},datahub-postgres-setup=\${CONTAINERS_TAG},vram-plugin=\${APP_TAG},opensearch=v2.19.5,extension-operator=\${EXTENSION_OPERATOR_TAG}"`,
  ],
  "docs/docs/routing-modes.md": [
    `## Migrating from ${providerTitle}`,
    `${providerTitle} routing support was removed after the platform moved to Istio and`,
    `\`KAMIWAZA_ROUTING_PROVIDER=${retiredProvider}\` now fails during startup with migration`,
    `1. Remove the \`${retiredProvider}\` provider override and any \`network.${retiredProvider}\` values.`,
    `3. Replace custom ${providerTitle} \`IngressRoute\` and \`Middleware\` resources with the`,
    `Do not translate ${providerTitle} ForwardAuth headers into application configuration.`,
  ],
};

function consumeIntentionalHistory(allowed: string[], line: string): boolean {
  const trimmed = line.trim();
  const index = allowed.indexOf(trimmed);
  if (index === -1) return false;
  allowed.splice(index, 1);
  return true;
}

function markdownFiles(directory: string): string[] {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const candidate = path.join(directory, entry.name);
    return entry.isDirectory()
      ? markdownFiles(candidate)
      : entry.isFile() && /\.(md|mdx|json)$/i.test(entry.name)
        ? [candidate]
        : [];
  });
}

test("current public, SDK, and API docs do not restore retired-provider guidance", () => {
  const currentRoots = [
    "docs/docs",
    "docs/extensions",
    "docs/sdk",
    "docs/api",
    "docs/research",
  ].map((directory) => path.join(root, directory));
  const offenders: string[] = [];

  for (const file of currentRoots.flatMap(markdownFiles)) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    const allowed = [...(intentionalHistory[relative] ?? [])];
    const matchingLines = fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((line) => line.toLowerCase().includes(retiredProvider));

    for (const line of matchingLines) {
      if (!consumeIntentionalHistory(allowed, line)) {
        offenders.push(`${relative}: ${line.trim()}`);
      }
    }

    if (matchingLines.length > 0) {
      assert.equal(
        allowed.length,
        0,
        `${relative} no longer matches its reviewed historical allowlist`,
      );
    }
  }

  assert.deepEqual(offenders, []);
});

test("historical allowlist entries match the complete reviewed line", () => {
  const reviewed = `${providerTitle} routing support was removed after the platform moved to Istio and`;
  const pattern = intentionalHistory["docs/docs/routing-modes.md"][1];

  assert.equal(consumeIntentionalHistory([pattern], reviewed), true);
  assert.equal(
    consumeIntentionalHistory(
      [pattern],
      `${reviewed} Restore the retired provider with a custom chart.`,
    ),
    false,
  );
  assert.equal(
    consumeIntentionalHistory([pattern], `${reviewed} ${retiredProvider}`),
    false,
  );
});

test("CI materializes and watches every guarded documentation root", () => {
  const workflow = fs.readFileSync(
    path.join(root, ".github", "workflows", "scripts-test.yml"),
    "utf8",
  );

  for (const guardedRoot of [
    "docs/docs",
    "docs/extensions",
    "docs/sdk",
    "docs/api",
    "docs/research",
  ]) {
    assert.ok(workflow.includes(`- "${guardedRoot}/**"`), guardedRoot);
  }
  assert.match(workflow, /Checkout SDK documentation source/);
  assert.match(workflow, /ref: [0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /ref: develop/);
  assert.match(workflow, /npm run sync-sdk/);
  assert.match(workflow, /KW_SDK_DOCS:/);
  assert.match(workflow, /Verify generated SDK documentation/);
  assert.match(workflow, /docs\/sdk\/current\/services/);
  assert.match(workflow, /test -n "\$\{generated_page\}"/);
  assert.match(workflow, /-size 0c/);
  assert.match(workflow, /Generated SDK page is empty/);
});
