"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pdf_layout_utils_1 = require("./pdf-layout-utils");
(0, node_test_1.default)("buildTocHtml renders branded cover and linked TOC rows", () => {
    const html = (0, pdf_layout_utils_1.buildTocHtml)({
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
    strict_1.default.match(html, /class="cover-page"/);
    strict_1.default.match(html, /class="cover-title">Kamiwaza AI Platform</);
    strict_1.default.match(html, /class="cover-subtitle">Platform Documentation</);
    strict_1.default.match(html, /class="cover-version">Version 0.12.0</);
    strict_1.default.match(html, /class="toc-heading">Table of Contents</);
    strict_1.default.match(html, /class="toc-item toc-item-h1"/);
    strict_1.default.match(html, /class="toc-item toc-item-h2"/);
    strict_1.default.match(html, /class="toc-leader"/);
    strict_1.default.match(html, /href="http:\/\/localhost:9003\/0.12.0\/"/);
    strict_1.default.match(html, /href="http:\/\/localhost:9003\/sdk\/0.12.0\/current\/services\/activity"/);
});
