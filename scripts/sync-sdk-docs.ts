import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

const SDK_DOCS_PATH = path.resolve(__dirname, '../../kamiwaza-sdk/docs');
const TARGET_SDK_DOCS = path.resolve(__dirname, '../docs/sdk/current');

async function generateServiceDoc(servicePath: string, serviceName: string) {
    const serviceDir = path.join(SDK_DOCS_PATH, 'services', servicePath);
    const files = await fs.readdir(serviceDir);
    
    let content = `# ${serviceName} Service\n\n`;
    
    for (const file of files) {
        if (file.endsWith('.md')) {
            const fileContent = await fs.readFile(path.join(serviceDir, file), 'utf8');
            content += `\n${fileContent}\n`;
        }
    }
    
    return content;
}

async function generateAPIReference() {
    const todoContent = await fs.readFile(path.join(SDK_DOCS_PATH, 'todo.txt'), 'utf8');
    const sections = todoContent.split('\n## ');
    
    let mdContent = '# API Reference\n\n';
    
    for (const section of sections) {
        if (!section.trim()) continue;
        
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
    await fs.ensureDir(path.join(TARGET_SDK_DOCS, 'services'));
    await fs.ensureDir(path.join(TARGET_SDK_DOCS, 'api'));
    
    // Copy and transform service docs
    const services = await fs.readdir(path.join(SDK_DOCS_PATH, 'services'));
    
    for (const service of services) {
        const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
        const content = await generateServiceDoc(service, serviceName);
        await fs.writeFile(
            path.join(TARGET_SDK_DOCS, 'services', `${service}.md`),
            content
        );
    }
    
    // Generate API reference from todo.txt
    const apiReference = await generateAPIReference();
    await fs.writeFile(
        path.join(TARGET_SDK_DOCS, 'api', 'reference.md'),
        apiReference
    );
    
    // Create intro doc if it doesn't exist
    const introPath = path.join(TARGET_SDK_DOCS, 'intro.md');
    if (!await fs.pathExists(introPath)) {
        await fs.writeFile(introPath, `---
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
    } catch (error) {
        console.error('Error syncing SDK docs:', error);
        process.exit(1);
    }
}

main();