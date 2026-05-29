"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
function resolveSdkDocsPath() {
    const override = process.env.KW_SDK_DOCS || process.env.KAMIWAZA_SDK_DOCS;
    const candidates = [
        override,
        // sibling repo (common setup): ../kamiwaza-sdk/docs
        path_1.default.resolve(__dirname, '../kamiwaza-sdk/docs'),
        // sibling repo (alternate): ../../kamiwaza-sdk/docs
        path_1.default.resolve(__dirname, '../../kamiwaza-sdk/docs'),
        // monorepo nested layout: ../../kamiwaza/kamiwaza-sdk/docs
        path_1.default.resolve(__dirname, '../../kamiwaza/kamiwaza-sdk/docs'),
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (fs_extra_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    const tried = candidates.map(c => `- ${c}`).join('\n');
    throw new Error(`Unable to locate SDK docs. Set KW_SDK_DOCS to the SDK docs path, or place the repo in one of the expected locations. Tried:\n${tried}`);
}
const SDK_DOCS_PATH = resolveSdkDocsPath();
const TARGET_SDK_DOCS = path_1.default.resolve(__dirname, '../docs/sdk/current');
async function generateServiceDoc(servicePath, serviceName) {
    const serviceDir = path_1.default.join(SDK_DOCS_PATH, 'services', servicePath);
    const files = await fs_extra_1.default.readdir(serviceDir);
    let content = `# ${serviceName} Service\n\n`;
    for (const file of files) {
        if (file.endsWith('.md')) {
            const fileContent = await fs_extra_1.default.readFile(path_1.default.join(serviceDir, file), 'utf8');
            content += `\n${fileContent}\n`;
        }
    }
    return content;
}
async function generateAPIReference() {
    const todoPath = path_1.default.join(SDK_DOCS_PATH, 'todo.txt');
    if (!(await fs_extra_1.default.pathExists(todoPath))) {
        return '# API Reference\n\n';
    }
    const todoContent = await fs_extra_1.default.readFile(todoPath, 'utf8');
    const sections = todoContent.split('\n## ');
    let mdContent = '# API Reference\n\n';
    for (const section of sections) {
        if (!section.trim())
            continue;
        const [title, ...items] = section.split('\n');
        mdContent += `## ${title}\n\n`;
        for (const item of items) {
            if (item.trim().startsWith('- [x]')) {
                const methodName = item.replace('- [x] ', '').split(' - ')[0];
                mdContent += `### \`${methodName}\`\n\n`;
                mdContent += `${item.split(' - ')[1]}\n\n`;
            }
        }
    }
    return mdContent;
}
async function copyServiceDocs() {
    // Create target directories
    await fs_extra_1.default.ensureDir(path_1.default.join(TARGET_SDK_DOCS, 'services'));
    await fs_extra_1.default.ensureDir(path_1.default.join(TARGET_SDK_DOCS, 'api'));
    // Copy and transform service docs
    const servicesRoot = path_1.default.join(SDK_DOCS_PATH, 'services');
    const services = (await fs_extra_1.default.pathExists(servicesRoot)) ? await fs_extra_1.default.readdir(servicesRoot) : [];
    for (const service of services) {
        const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
        const content = await generateServiceDoc(service, serviceName);
        await fs_extra_1.default.writeFile(path_1.default.join(TARGET_SDK_DOCS, 'services', `${service}.md`), content);
    }
    // Generate API reference from todo.txt
    const apiReference = await generateAPIReference();
    await fs_extra_1.default.writeFile(path_1.default.join(TARGET_SDK_DOCS, 'api', 'reference.md'), apiReference);
    // Create intro doc if it doesn't exist
    const introPath = path_1.default.join(TARGET_SDK_DOCS, 'intro.md');
    if (!await fs_extra_1.default.pathExists(introPath)) {
        await fs_extra_1.default.writeFile(introPath, `---
id: intro
title: Kamiwaza SDK Documentation
sidebar_position: 1
---

# Kamiwaza SDK

The Kamiwaza SDK provides a Python interface to interact with the Kamiwaza AI Platform. This documentation covers:

- [API Reference](api/reference.md) - Complete API documentation
- [Services](services) - Detailed documentation for each service
- Installation and usage guides
- Examples and tutorials
`);
    }
}
async function main() {
    try {
        console.log('Syncing SDK documentation...');
        await copyServiceDocs();
        console.log('SDK documentation sync complete!');
    }
    catch (error) {
        console.error('Error syncing SDK docs:', error);
        process.exit(1);
    }
}
main();
