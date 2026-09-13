import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const doc = readFileSync(resolve(__dirname, "../docs/docs/installation/offline_install.md"), "utf8");
const inputs = {
  EXT_BUNDLE: "validation.tar.gz",
  APP_TAG: "validation",
  FRONTEND_TAG: "validation",
  CONTAINERS_TAG: "validation",
  EXTENSION_OPERATOR_TAG: "validation",
  KAMIWAZA_IMAGE_OVERRIDES: "postgres=validation,keycloak=validation,etcd=validation",
};

test("offline guide documents the required override map syntax without pinned release tags", () => {
  const example = doc.match(/^KAMIWAZA_IMAGE_OVERRIDES="([^"]+)"$/m);
  assert.ok(example);
  const entries = example[1].split(",");
  assert.deepEqual(entries.map((entry) => entry.split("=")[0]), ["postgres", "keycloak", "etcd"]);
  for (const entry of entries) assert.match(entry, /^[a-z]+=<[a-z-]+>$/);
});

function blockFor(step: number): string {
  const section = doc.split(`## Step ${step}:`)[1].split("## Step ")[0];
  const blocks = [...section.matchAll(/^```bash\n([\s\S]*?)^```/gm)];
  assert.equal(blocks.length, 1);
  return blocks[0][1];
}

function runBlock(step: number, variables: Record<string, string>) {
  // Never execute install commands: override every external command in these
  // snippets, omit all ambient credentials, and keep filesystem calls inert.
  const stubs = `
cd() { :; }
sudo() { echo SIDE_EFFECT_sudo; }
rm() { echo SIDE_EFFECT_rm; }
mkdir() { echo SIDE_EFFECT_mkdir; }
tar() { echo SIDE_EFFECT_tar; }
curl() { echo SIDE_EFFECT_curl; }
`;
  return spawnSync("bash", ["--noprofile", "--norc", "-i"], {
    input: `${stubs}\n${blockFor(step)}\necho CALLER_SURVIVED\nexit\n`,
    env: { PATH: process.env.PATH, ...variables },
    encoding: "utf8",
    timeout: 5000,
  });
}

for (const step of [4, 5, 6]) {
  const required = step === 5 ? Object.keys(inputs).filter((key) => key !== "EXT_BUNDLE") : ["EXT_BUNDLE"];
  for (const key of required) {
    test(`offline step ${step} stops before side effects when ${key} is missing`, () => {
      const variables: Record<string, string> = { ...inputs };
      delete variables[key];
      const result = runBlock(step, variables);
      assert.ifError(result.error);
      assert.match(result.stderr, new RegExp(`${key}:`));
      assert.doesNotMatch(result.stdout, /SIDE_EFFECT_/);
      assert.match(result.stdout, /CALLER_SURVIVED/);
    });
  }
  test(`offline step ${step} reaches the installer with complete handoff inputs`, () => {
    const result = runBlock(step, inputs);
    assert.ifError(result.error);
    assert.match(result.stdout, /SIDE_EFFECT_sudo/);
    assert.match(result.stdout, /CALLER_SURVIVED/);
  });
}

test("online and offline capacity guidance includes same-disk PVC requests", () => {
  for (const page of ["online_install", "offline_install"]) {
    const text = readFileSync(resolve(__dirname, `../docs/docs/installation/${page}.md`), "utf8");
    const capacity = text.split("**`/var/lib` ≥ 350 GB**")[1].split("\n")[0];
    assert.match(capacity, /Add the rendered PVC requests.*same disk/);
  }
});
