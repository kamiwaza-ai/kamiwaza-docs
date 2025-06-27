#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Config
const SDK_DOCS_PATH = path.resolve(__dirname, '../../kamiwaza/kamiwaza-sdk/docs');
const DOCS_ROOT = path.resolve(__dirname, '../kamiwaza/docs');
const VERSION = '0.3.2';

function execCommand(command, options = {}) {
    try {
        execSync(command, { stdio: 'inherit', ...options });
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        throw error;
    }
}

function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function syncSDKDocs() {
    console.log('\n📚 Syncing SDK documentation...');
    
    // Create SDK docs directory
    const sdkDocsDir = path.join(DOCS_ROOT, 'sdk');
    ensureDirectoryExists(sdkDocsDir);
    ensureDirectoryExists(path.join(sdkDocsDir, 'services'));

    // Create a basic intro file
    fs.writeFileSync(path.join(sdkDocsDir, 'intro.md'), `---
sidebar_position: 1
---

# Kamiwaza SDK

The Kamiwaza SDK provides a Python interface to interact with the Kamiwaza AI Platform.

## Installation

\`\`\`bash
pip install kamiwaza-client
\`\`\`

## Quick Start

\`\`\`python
from kamiwaza_client import KamiwazaClient

# Initialize the client for local development
client = KamiwazaClient("http://localhost:7777/api/")

# List deployments
deployments = client.serving.list_deployments()
for deployment in deployments:
    print(f"Deployment: {deployment}")
\`\`\`
`);

    // Copy service docs as-is, just adding frontmatter
    const servicesDir = path.join(SDK_DOCS_PATH, 'services');
    if (fs.existsSync(servicesDir)) {
        const services = fs.readdirSync(servicesDir);
        services.forEach(service => {
            if (fs.statSync(path.join(servicesDir, service)).isDirectory()) {
                const targetDir = path.join(sdkDocsDir, 'services', service);
                ensureDirectoryExists(targetDir);

                // Copy README with frontmatter
                const readmeContent = fs.readFileSync(path.join(servicesDir, service, 'README.md'), 'utf8');
                fs.writeFileSync(path.join(targetDir, 'README.md'), 
                    `---\nsidebar_position: 1\n---\n\n${readmeContent}`);
            }
        });
    }

    // Generate simple API reference from todo.txt
    const todoPath = path.join(SDK_DOCS_PATH, 'todo.txt');
    if (fs.existsSync(todoPath)) {
        const todoContent = fs.readFileSync(todoPath, 'utf8');
        let apiRef = `---\nsidebar_position: 2\n---\n\n# API Reference\n\n`;
        
        const sections = todoContent.split('\n## ');
        for (const section of sections) {
            if (!section.trim()) continue;
            const [title, ...items] = section.split('\n');
            apiRef += `## ${title}\n\n`;
            items.forEach(item => {
                if (item.trim().startsWith('- [x]')) {
                    const [method, desc] = item.replace('- [x] ', '').split(' - ');
                    apiRef += `### ${method}\n${desc || ''}\n\n`;
                }
            });
        }
        fs.writeFileSync(path.join(sdkDocsDir, 'api-reference.md'), apiRef);
    }
}

function createVersion() {
    console.log(`\n📌 Creating version ${VERSION}...`);
    
    const versionedDir = path.join(DOCS_ROOT, 'versioned_docs', 'version-' + VERSION);
    const docsSrcDir = path.join(DOCS_ROOT, 'docs');
    
    ensureDirectoryExists(versionedDir);
    
    // Copy docs to versioned directory
    fs.cpSync(docsSrcDir, versionedDir, { recursive: true });
    
    // Update versions.json
    const versionsPath = path.join(DOCS_ROOT, 'versions.json');
    let versions = [];
    if (fs.existsSync(versionsPath)) {
        versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
    }
    if (!versions.includes(VERSION)) {
        versions.unshift(VERSION);
        fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2));
    }
}

function buildDocs() {
    console.log('\n🏗️  Building documentation...');
    execCommand('docusaurus build');
}

// Main build process
console.log('🚀 Starting documentation build process...');

try {
    syncSDKDocs();
    createVersion();
    buildDocs();
    console.log('\n✅ Documentation build complete!');
} catch (error) {
    console.error('\n❌ Build failed:', error);
    process.exit(1);
}