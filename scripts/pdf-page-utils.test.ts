import test from "node:test";
import assert from "node:assert/strict";

import { isDocusaurusNotFoundPage } from "./pdf-page-utils";

test("isDocusaurusNotFoundPage detects the Docusaurus 404 content", () => {
	assert.equal(
		isDocusaurusNotFoundPage(
			"Kamiwaza Docs",
			"Page Not Found\nWe could not find what you were looking for.\nPlease contact the owner of the site that linked you to the original URL and let them know their link is broken.",
		),
		true,
	);
});

test("isDocusaurusNotFoundPage ignores normal documentation pages", () => {
	assert.equal(
		isDocusaurusNotFoundPage(
			"Kamiwaza Docs",
			"Installation Process\nFollow these steps to install the platform.",
		),
		false,
	);
});
