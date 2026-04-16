"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pdf_layout_utils_1 = require("./pdf-layout-utils");
(0, node_test_1.default)("buildTocHtml renders branded cover, section labels, and linked TOC rows", () => {
    const html = (0, pdf_layout_utils_1.buildTocHtml)({
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
    strict_1.default.match(html, /class="cover-page"/);
    strict_1.default.match(html, /class="cover-title">Kamiwaza AI Platform</);
    strict_1.default.match(html, /class="cover-subtitle">Platform Documentation</);
    strict_1.default.match(html, /class="cover-version">Version 0.12.0</);
    strict_1.default.match(html, /class="toc-heading">Table of Contents</);
    strict_1.default.match(html, /class="toc-text">Getting started</);
    strict_1.default.match(html, /class="toc-index">1\.1</);
    strict_1.default.match(html, /class="toc-text">Introduction</);
    strict_1.default.match(html, /class="toc-text">Python SDK Services</);
    strict_1.default.match(html, /class="toc-index">2\.1</);
    strict_1.default.match(html, /class="toc-text">SDK - Activity</);
    strict_1.default.match(html, /toc-item-sub/);
    strict_1.default.match(html, /class="toc-leader"/);
    strict_1.default.match(html, /href="http:\/\/localhost:9003\/0.12.0\/"/);
    strict_1.default.match(html, /href="http:\/\/localhost:9003\/sdk\/0.12.0\/current\/services\/activity"/);
});
(0, node_test_1.default)("buildTocHtml renders entry page numbers after leaders", () => {
    const html = (0, pdf_layout_utils_1.buildTocHtml)({
        title: "Kamiwaza AI Platform",
        subtitle: "Platform Documentation",
        documents: [
            { id: "intro", title: "Introduction", url: "http://localhost:9003/a" },
            { id: "quickstart", title: "Guide", url: "http://localhost:9003/b" },
        ],
        entryPageNumbers: [3, 12],
    });
    strict_1.default.match(html, /class="toc-page-num">3</);
    strict_1.default.match(html, /class="toc-page-num">12</);
});
(0, node_test_1.default)("inferTocSectionFromDocId maps route prefixes to nav groups", () => {
    strict_1.default.equal((0, pdf_layout_utils_1.inferTocSectionFromDocId)(""), "Getting started");
    strict_1.default.equal((0, pdf_layout_utils_1.inferTocSectionFromDocId)("installation/redhat_offline_install"), "Installation");
    strict_1.default.equal((0, pdf_layout_utils_1.inferTocSectionFromDocId)("security/admin-guide"), "Security");
    strict_1.default.equal((0, pdf_layout_utils_1.inferTocSectionFromDocId)("sdk/intro"), "SDK");
});
(0, node_test_1.default)("buildTocHtml uses decimal subsection numbers for multi-document sections", () => {
    const html = (0, pdf_layout_utils_1.buildTocHtml)({
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
    strict_1.default.match(html, /class="toc-text">Installation</);
    strict_1.default.match(html, /class="toc-index">1\.1</);
    strict_1.default.match(html, /class="toc-index">1\.2</);
    strict_1.default.match(html, /toc-item-sub/);
});
(0, node_test_1.default)("buildTocHtml nests a single installation doc under Installation", () => {
    const html = (0, pdf_layout_utils_1.buildTocHtml)({
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
    strict_1.default.match(html, /class="toc-text">Installation</);
    strict_1.default.match(html, /class="toc-index">1\.1</);
    strict_1.default.match(html, /class="toc-text">Red Hat 9 Offline Installation</);
});
