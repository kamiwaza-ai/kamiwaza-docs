import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sidebars from "../docs/sidebars";

test("local storage documentation follows the KKS local-path default", () => {
  const docsRoot = resolve(__dirname, "../docs/docs");
  const prerequisites = readFileSync(resolve(docsRoot, "installation/storage-prerequisites.md"), "utf8");
  const historical = readFileSync(resolve(docsRoot, "runbooks/k0s-openebs-local-storage.md"), "utf8");
  assert.match(prerequisites, /setup selects local-path by default, with Longhorn available as an explicit\s+opt-in/);
  assert.match(historical, /local-path by default, or explicitly selected Longhorn/);
  assert.doesNotMatch(prerequisites, /selects Longhorn by default/);
});

test("replacement storage prerequisites are discoverable in Installation", () => {
  const sidebar = sidebars.mainSidebar;
  assert.ok(Array.isArray(sidebar));
  const installation = sidebar.find((item) => {
    if (typeof item !== "object") return false;
    if (item === null) return false;
    return "label" in item && item.label === "Installation";
  });
  assert.ok(installation);
  assert.ok(typeof installation === "object");
  assert.ok("items" in installation);
  assert.ok(Array.isArray(installation.items));
  assert.equal(installation.items.filter((item) => item === "installation/storage-prerequisites").length, 1);
});

test("offline steps preserve the handoff extension bundle selection", () => {
  const doc = readFileSync(resolve(__dirname, "../docs/docs/installation/offline_install.md"), "utf8");
  assert.doesNotMatch(doc, /^(?:export\s+)?EXT_BUNDLE=/m);
  assert.equal((doc.match(/same extension bundle filename used in Step 1/g) || []).length, 2);
  assert.match(doc, /Step 0: Prepare the disconnected Kubernetes substrate/);
});

test("installation entry points expose storage ownership and historical boundaries", () => {
  const docsRoot = resolve(__dirname, "../docs/docs");
  const processDoc = readFileSync(resolve(docsRoot, "installation/installation_process.md"), "utf8");
  const requirements = readFileSync(resolve(docsRoot, "installation/system_requirements.md"), "utf8");
  const online = readFileSync(resolve(docsRoot, "installation/online_install.md"), "utf8");
  const openebs = readFileSync(resolve(docsRoot, "runbooks/k0s-openebs-local-storage.md"), "utf8");
  assert.match(processDoc, /Complete \[Storage prerequisites\]/);
  assert.match(requirements, /\*\*Persistent storage\*\*.*Administrator-provided/);
  assert.doesNotMatch(requirements, /You only need:|no manual installation required/);
  assert.match(online, /historical 1\.0 → 1\.2 database runbook/);
  assert.match(openebs, /Historical implementation — not the current develop install path/);
  assert.match(openebs, /has retired OpenEBS installation/);
});
