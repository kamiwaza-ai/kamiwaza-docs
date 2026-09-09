import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import sidebars from "../docs/sidebars";

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
