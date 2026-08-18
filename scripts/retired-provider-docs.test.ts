import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(__dirname, "..");
const retiredProvider = "trae" + "fik";

const intentionalHistory: Record<string, RegExp[]> = {
  "docs/docs/installation/offline_install.md": [
    new RegExp(
      `KAMIWAZA_IMAGE_OVERRIDES=.*${retiredProvider}=v3\\.6\\.20-kz\\.1`,
      "i",
    ),
  ],
  "docs/docs/routing-modes.md": [
    new RegExp(`Migrating from ${retiredProvider}`, "i"),
    new RegExp(`${retiredProvider} routing support was removed`, "i"),
    new RegExp(`KAMIWAZA_ROUTING_PROVIDER=${retiredProvider}`, "i"),
    new RegExp("Remove the `" + retiredProvider + "` provider override", "i"),
    new RegExp(
      "custom " + retiredProvider + " `IngressRoute` and `Middleware`",
      "i",
    ),
    new RegExp(`${retiredProvider} ForwardAuth headers`, "i"),
  ],
};

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
      const index = allowed.findIndex((pattern) => pattern.test(line));
      if (index === -1) {
        offenders.push(`${relative}: ${line.trim()}`);
      } else {
        allowed.splice(index, 1);
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
