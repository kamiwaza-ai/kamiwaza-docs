import test from "node:test";
import assert from "node:assert/strict";

import { buildTocHtml } from "./pdf-layout-utils";

test("buildTocHtml renders branded cover and linked TOC rows", () => {
	const html = buildTocHtml({
		title: "Kamiwaza AI Platform",
		subtitle: "Platform Documentation",
		versionLabel: "Version 0.12.0",
		logoBase64: "ZmFrZQ==",
		documents: [
			{
				title: "Introduction",
				url: "http://localhost:9003/0.12.0/",
				level: 1,
			},
			{
				title: "SDK - Activity",
				url: "http://localhost:9003/sdk/0.12.0/current/services/activity",
				level: 2,
			},
		],
	});

	assert.match(html, /class="cover-page"/);
	assert.match(html, /class="cover-title">Kamiwaza AI Platform</);
	assert.match(html, /class="cover-subtitle">Platform Documentation</);
	assert.match(html, /class="cover-version">Version 0.12.0</);
	assert.match(html, /class="toc-heading">Table of Contents</);
	assert.match(html, /class="toc-item toc-item-h1"/);
	assert.match(html, /class="toc-item toc-item-h2"/);
	assert.match(html, /class="toc-leader"/);
	assert.match(html, /href="http:\/\/localhost:9003\/0.12.0\/"/);
	assert.match(
		html,
		/href="http:\/\/localhost:9003\/sdk\/0.12.0\/current\/services\/activity"/,
	);
});
