"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const path_1 = __importDefault(require("path"));
// Prefer the TypeScript source over the stale compiled JS in this folder.
const { PDFGenerator } = require("./generate-pdf");
const configPath = path_1.default.join(__dirname, "..", "pdf-config.yaml");
(0, node_test_1.default)("buildDocumentUrl normalizes folder index docs for offline versioned routes", () => {
    const generator = new PDFGenerator(configPath);
    const url = generator.buildDocumentUrl({ id: "use-cases/index", title: "Use Cases" }, "0.12.0");
    strict_1.default.equal(url, "file:///home/shkevin/code/compliance/kamiwaza-docs/docs/build-offline/index.html#/0.12.0/use-cases");
});
(0, node_test_1.default)("generateTitleFromId uses parent folder name for index docs", () => {
    const generator = new PDFGenerator(configPath);
    strict_1.default.equal(generator.generateTitleFromId("use-cases/index"), "Use Cases");
});
(0, node_test_1.default)("buildDocumentUrl maps sdk intro to the version root route", () => {
    const generator = new PDFGenerator(configPath);
    const url = generator.buildDocumentUrl({ id: "sdk/intro", title: "SDK - Introduction" }, "0.12.0");
    strict_1.default.equal(url, "file:///home/shkevin/code/compliance/kamiwaza-docs/docs/build-offline/index.html#/sdk/0.12.0");
});
