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

const TARGET_SERVICES = path.resolve(__dirname, '../docs/sdk/services');
const TARGET_INDEX = path.resolve(__dirname, '../docs/sdk/index.md');
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

function rewriteIndexLinks(content: string): string {
    // Rewrite docs/services/{name}/README.md → ./services/{name}/README.md
    // Keep .md extension so Docusaurus resolves via file paths (not URL paths)
    let result = content.replace(
        /\]\(docs\/services\/([^)]+\/README\.md)\)/g,
        '](./services/$1)'
    );
    // Rewrite examples/*.ipynb → GitHub links
    result = result.replace(
        /\]\(examples\/([^)]+)\)/g,
        `](${GITHUB_SDK_BASE}/examples/$1)`
    );
    return result;
}

function rewriteServiceLinks(content: string): string {
    // Rewrite examples/ links (relative paths from service docs) → GitHub links
    // Match any number of ../ prefixes before examples/
    let result = content.replace(
        /\]\((?:\.\.\/)*examples\/([^)]+)\)/g,
        `](${GITHUB_SDK_BASE}/examples/$1)`
    );
    // Keep .md extension on cross-service links so Docusaurus resolves via file paths
    return result;
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

        const targetDir = path.join(TARGET_SERVICES, service);
        await fs.ensureDir(targetDir);
        await fs.writeFile(path.join(targetDir, 'README.md'), withFrontmatter);

        sidebarItems.push(`services/${service}/README`);
        console.log(`  Synced: ${service}`);
    }

    return sidebarItems;
}

async function syncIndex(sdkRepoPath: string): Promise<void> {
    const readmePath = path.join(sdkRepoPath, 'README.md');
    if (!await fs.pathExists(readmePath)) {
        console.warn('  SDK README.md not found, skipping index sync');
        return;
    }

    let content = await fs.readFile(readmePath, 'utf8');
    content = rewriteIndexLinks(content);
    content = addFrontmatter(content, 1, 'Kamiwaza SDK');
    await fs.writeFile(TARGET_INDEX, content);
    console.log('  Synced: index.md (from SDK README)');
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
    await syncIndex(sdkRepoPath);
    await writeSidebarJson(sidebarItems);

    console.log(`SDK docs sync complete: ${sidebarItems.length} services synced.`);
}

main().catch(error => {
    console.error('Error syncing SDK docs:', error);
    process.exit(1);
});
