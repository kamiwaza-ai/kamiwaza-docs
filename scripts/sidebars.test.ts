import assert from "node:assert/strict";
import test from "node:test";

import sidebars from "../docs/sidebars";

test("main sidebar contains one complete Runbooks category", () => {
	const mainSidebar = sidebars.mainSidebar;
	assert.ok(Array.isArray(mainSidebar));

	const runbookCategories = mainSidebar.filter(
		(item) =>
			typeof item === "object" &&
			item !== null &&
			"type" in item &&
			item.type === "category" &&
			"label" in item &&
			item.label === "Runbooks",
	);

	assert.equal(runbookCategories.length, 1);
	const runbookCategory = runbookCategories[0];
	assert.ok(
		typeof runbookCategory === "object" &&
			runbookCategory !== null &&
			"items" in runbookCategory,
	);
	assert.deepEqual(runbookCategory.items, [
		"runbooks/core-database-upgrade-1.2",
		"runbooks/ontology-graph-viewer",
	]);
});
