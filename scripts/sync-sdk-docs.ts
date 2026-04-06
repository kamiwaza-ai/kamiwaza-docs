import fs from 'fs-extra';
import path from 'path';

const GITHUB_SDK_BASE = 'https://github.com/kamiwaza-ai/kamiwaza-sdk/blob/main';

function resolveSdkRepoPath(): string | null {
    const override = process.env.KW_SDK_DOCS || process.env.KAMIWAZA_SDK_DOCS;
    // When an env var is set, treat it as the repo root (or docs/ subdir)
    // For sibling/monorepo candidates, point at the repo root
    const candidates = [
        override,
        path.resolve(__dirname, '../kamiwaza-sdk'),
        path.resolve(__dirname, '../../kamiwaza-sdk'),
        path.resolve(__dirname, '../../kamiwaza/kamiwaza-sdk'),
    ].filter(Boolean) as string[];

    for (const candidate of candidates) {
        // Accept either a repo root (has docs/services/) or a docs dir directly
        if (fs.existsSync(path.join(candidate, 'docs', 'services'))) {
            return candidate;
        }
        if (fs.existsSync(path.join(candidate, 'services'))) {
            // Env var pointed at the docs/ subdir
            return path.dirname(candidate);
        }
    }

    return null;
}

const TARGET_CURRENT = path.resolve(__dirname, '../docs/sdk/current');
const TARGET_SERVICES = path.join(TARGET_CURRENT, 'services');
const TARGET_API_REFERENCE = path.join(TARGET_CURRENT, 'api', 'reference.md');
const TARGET_SIDEBAR_JSON = path.resolve(__dirname, '../docs/sdk-services.generated.json');

function titleCase(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
}

function addFrontmatter(content: string, position: number, title: string): string {
    // If file already has frontmatter, replace sidebar_position
    if (content.startsWith('---')) {
        return content.replace(
            /sidebar_position:\s*\d+/,
            `sidebar_position: ${position}`
        );
    }
    const frontmatter = [
        '---',
        `sidebar_position: ${position}`,
        `title: "${title}"`,
        '---',
        '',
    ].join('\n');
    return frontmatter + content;
}

function rewriteServiceLinks(content: string): string {
    // Rewrite examples/ links (relative paths from service docs) → GitHub links
    // Match any number of ../ prefixes before examples/
    let result = content.replace(
        /\]\((?:\.\.\/)*examples\/([^)]+)\)/g,
        `](${GITHUB_SDK_BASE}/examples/$1)`
    );
    // Rewrite old README-style cross-service links to the generated flat docs layout.
    result = result.replace(
        /\]\(\.\.\/([a-z0-9-]+)\/README\.md\)/gi,
        '](./$1)'
    );
    return result;
}

async function generateApiReference(sdkRepoPath: string): Promise<void> {
    const todoPath = path.join(sdkRepoPath, 'docs', 'todo.txt');
    await fs.ensureDir(path.dirname(TARGET_API_REFERENCE));

    if (!await fs.pathExists(todoPath)) {
        await fs.writeFile(TARGET_API_REFERENCE, '# API Reference\n');
        return;
    }

    const todoContent = await fs.readFile(todoPath, 'utf8');
    const sections = todoContent.split('\n## ');
    let mdContent = '# API Reference\n\n';

    for (const section of sections) {
        if (!section.trim()) continue;

        const [title, ...items] = section.split('\n');
        mdContent += `## ${title.replace(/^#+\s*/, '')}\n\n`;

        for (const item of items) {
            const trimmed = item.trim();
            if (!trimmed.startsWith('- [x]')) continue;

            const [methodName, description] = trimmed.replace('- [x] ', '').split(' - ', 2);
            mdContent += `### \`${methodName}\`\n\n`;
            if (description) {
                mdContent += `${description}\n\n`;
            }
        }
    }

    await fs.writeFile(TARGET_API_REFERENCE, mdContent);
    console.log('  Synced: current/api/reference.md');
}

async function syncServiceDocs(sdkRepoPath: string): Promise<string[]> {
    const servicesRoot = path.join(sdkRepoPath, 'docs', 'services');
    if (!await fs.pathExists(servicesRoot)) {
        console.warn('  No services directory found at', servicesRoot);
        return [];
    }

    const services = (await fs.readdir(servicesRoot, { withFileTypes: true }))
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .sort();

    const sidebarItems: string[] = [];

    for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const srcFile = path.join(servicesRoot, service, 'README.md');
        if (!await fs.pathExists(srcFile)) {
            console.warn(`  Skipping ${service}: no README.md found`);
            continue;
        }

        let content = await fs.readFile(srcFile, 'utf8');
        content = rewriteServiceLinks(content);
        const title = `${titleCase(service)} Service`;
        const withFrontmatter = addFrontmatter(content, i + 1, title);

        await fs.ensureDir(TARGET_SERVICES);
        await fs.writeFile(path.join(TARGET_SERVICES, `${service}.md`), withFrontmatter);

        sidebarItems.push(`current/services/${service}`);
        console.log(`  Synced: ${service}`);
    }

    return sidebarItems;
}

async function writeSidebarJson(items: string[]): Promise<void> {
    await fs.writeFile(TARGET_SIDEBAR_JSON, JSON.stringify(items, null, 2) + '\n');
    console.log(`  Generated: sdk-services.generated.json (${items.length} services)`);
}

async function main() {
    console.log('Syncing SDK documentation...');

    const sdkRepoPath = resolveSdkRepoPath();
    if (!sdkRepoPath) {
        console.warn(
            'SDK repo not found. Set KW_SDK_DOCS or place kamiwaza-sdk as a sibling directory.\n' +
            'Skipping SDK docs sync (existing docs will be used as-is).'
        );
        process.exit(0);
    }

    console.log(`  SDK repo: ${sdkRepoPath}`);

    const sidebarItems = await syncServiceDocs(sdkRepoPath);
    await generateApiReference(sdkRepoPath);
    await writeSidebarJson(sidebarItems);

    console.log(`SDK docs sync complete: ${sidebarItems.length} services synced.`);
}

main().catch(error => {
    console.error('Error syncing SDK docs:', error);
    process.exit(1);
});
