import test from "node:test";
import assert from "node:assert/strict";

import { buildTocHtml, inferTocSectionFromDocId } from "./pdf-layout-utils";

test("buildTocHtml renders branded cover, section labels, and linked TOC rows", () => {
	const html = buildTocHtml({
		title: "Kamiwaza AI Platform",
		subtitle: "Platform Documentation",
		versionLabel: "Version 0.12.0",
		logoBase64: "ZmFrZQ==",
		documents: [
			{
				id: "",
				title: "Introduction",
				url: "http://localhost:9003/0.12.0/",
			},
			{
				id: "sdk/services/activity/README",
				title: "SDK - Activity",
				url: "http://localhost:9003/sdk/0.12.0/current/services/activity",
				section: "Python SDK Services",
			},
		],
	});

	assert.match(html, /class="cover-page"/);
	assert.match(html, /class="cover-title">Kamiwaza AI Platform</);
	assert.match(html, /class="cover-subtitle">Platform Documentation</);
	assert.match(html, /class="cover-version">Version 0.12.0</);
	assert.match(html, /class="toc-heading">Table of Contents</);
	assert.match(html, /class="toc-text">Getting started</);
	assert.match(html, /class="toc-index">1\.1</);
	assert.match(html, /class="toc-text">Introduction</);
	assert.match(html, /class="toc-text">Python SDK Services</);
	assert.match(html, /class="toc-index">2\.1</);
	assert.match(html, /class="toc-text">SDK - Activity</);
	assert.match(html, /toc-item-sub/);
	assert.match(html, /class="toc-leader"/);
	assert.match(html, /href="http:\/\/localhost:9003\/0.12.0\/"/);
	assert.match(
		html,
		/href="http:\/\/localhost:9003\/sdk\/0.12.0\/current\/services\/activity"/,
	);
});

test("buildTocHtml renders entry page numbers after leaders", () => {
	const html = buildTocHtml({
		title: "Kamiwaza AI Platform",
		subtitle: "Platform Documentation",
		documents: [
			{ id: "intro", title: "Introduction", url: "http://localhost:9003/a" },
			{ id: "quickstart", title: "Guide", url: "http://localhost:9003/b" },
		],
		entryPageNumbers: [3, 12],
	});
	assert.match(html, /class="toc-page-num">3</);
	assert.match(html, /class="toc-page-num">12</);
});

test("inferTocSectionFromDocId maps route prefixes to nav groups", () => {
	assert.equal(inferTocSectionFromDocId(""), "Getting started");
	assert.equal(inferTocSectionFromDocId("installation/redhat_offline_install"), "Installation");
	assert.equal(inferTocSectionFromDocId("security/admin-guide"), "Security");
	assert.equal(inferTocSectionFromDocId("sdk/intro"), "SDK");
});

test("buildTocHtml uses decimal subsection numbers for multi-document sections", () => {
	const html = buildTocHtml({
		title: "T",
		subtitle: "S",
		documents: [
			{
				id: "installation/a",
				title: "Red Hat 9 Offline Installation",
				url: "http://localhost/u1",
				section: "Installation",
			},
			{
				id: "installation/b",
				title: "Other",
				url: "http://localhost/u2",
				section: "Installation",
			},
		],
		entryPageNumbers: [5, 6],
	});
	assert.match(html, /class="toc-text">Installation</);
	assert.match(html, /class="toc-index">1\.1</);
	assert.match(html, /class="toc-index">1\.2</);
	assert.match(html, /toc-item-sub/);
});

test("buildTocHtml nests a single installation doc under Installation", () => {
	const html = buildTocHtml({
		title: "T",
		subtitle: "S",
		documents: [
			{
				id: "installation/redhat_offline_install",
				title: "Red Hat 9 Offline Installation",
				url: "http://localhost/install",
			},
		],
		entryPageNumbers: [13],
	});
	assert.match(html, /class="toc-text">Installation</);
	assert.match(html, /class="toc-index">1\.1</);
	assert.match(html, /class="toc-text">Red Hat 9 Offline Installation</);
});
