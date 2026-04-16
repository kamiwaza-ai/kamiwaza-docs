"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const pdf_page_utils_1 = require("./pdf-page-utils");
(0, node_test_1.default)("isDocusaurusNotFoundPage detects the Docusaurus 404 content", () => {
    strict_1.default.equal((0, pdf_page_utils_1.isDocusaurusNotFoundPage)("Kamiwaza Docs", "Page Not Found\nWe could not find what you were looking for.\nPlease contact the owner of the site that linked you to the original URL and let them know their link is broken."), true);
});
(0, node_test_1.default)("isDocusaurusNotFoundPage ignores normal documentation pages", () => {
    strict_1.default.equal((0, pdf_page_utils_1.isDocusaurusNotFoundPage)("Kamiwaza Docs", "Installation Process\nFollow these steps to install the platform."), false);
});
