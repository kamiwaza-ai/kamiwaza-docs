import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..");
const read = (file: string) => readFileSync(path.join(root, file), "utf8");

test("current installation commands do not silently select an older release", () => {
  const current = JSON.parse(read("package.json")).version;
  const directory = "docs/docs/installation";
  for (const name of readdirSync(path.join(root, directory))) {
    if (!name.endsWith(".md")) continue;
    const source = read(`${directory}/${name}`);
    const blocks = [...source.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g)];
    for (const [, block] of blocks) {
      for (const match of block.matchAll(/(?:RELEASE|KAMIWAZA_VERSION|APP_TAG|FRONTEND_TAG|CONTAINERS_TAG|EXTENSION_OPERATOR_TAG)=["'](?:release-)?(\d+\.\d+\.\d+)["']/g)) {
        assert.equal(match[1], current, `${name}: stale release assignment ${match[0]}`);
      }
      for (const match of block.matchAll(/kamiwaza-prod-(\d+\.\d+\.\d+)-[\w.-]+\.rpm/g)) {
        assert.equal(match[1], current, `${name}: stale prerequisites RPM`);
      }
    }
  }
});

test("historical offline commands remain version-scoped and reachable", () => {
  const current = read("docs/docs/installation/offline_install.md");
  assert.match(current, /\]\(\/1\.2\.0\/installation\/offline_install\)/);
  const historical = read("docs/versioned_docs/version-1.2.0/installation/offline_install.md");
  assert.match(historical, /Release scope: 1\.2\.0 only/);
  assert.match(historical, /RELEASE="1\.2\.0"/);
  assert.match(historical, /kamiwaza-prod-1\.2\.0-1\.el9\.x86_64\.rpm/);
  assert.doesNotMatch(historical, /Installing before 1\.2\.0|1\.2\.0-rc\.3/);
});
