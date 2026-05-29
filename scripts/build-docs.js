"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const package_json_1 = require("../package.json");
async function getCurrentGitTag(dir) {
    try {
        return (0, child_process_1.execSync)('git describe --exact-match --tags HEAD', {
            cwd: dir,
            stdio: ['pipe', 'pipe', 'pipe'],
            encoding: 'utf-8'
        }).trim();
    }
    catch (e) {
        return 'development';
    }
}
async function buildDocs() {
    const docsRoot = path_1.default.resolve(__dirname, '..');
    const sdkRoot = path_1.default.resolve(docsRoot, '..', 'kamiwaza-sdk');
    // Get current versions
    const currentTag = await getCurrentGitTag(docsRoot);
    const sdkTag = await getCurrentGitTag(sdkRoot);
    console.log(`Building documentation:`);
    console.log(`Docs version: ${currentTag}`);
    console.log(`SDK version: ${sdkTag}`);
    console.log('Package.json version:', package_json_1.version);
    // Clean any previous builds
    await fs_extra_1.default.remove(path_1.default.join(docsRoot, '.docusaurus'));
    await fs_extra_1.default.remove(path_1.default.join(docsRoot, 'build'));
    // Sync SDK docs for current version
    console.log('\nSyncing SDK documentation...');
    await (0, child_process_1.execSync)('npm run sync-sdk', { stdio: 'inherit' });
    // Handle versioning
    if (currentTag.startsWith('v')) {
        console.log('\nBuilding release version:', currentTag);
        // This is a release build
        if (currentTag !== `v${package_json_1.version}`) {
            console.warn(`Warning: Git tag ${currentTag} doesn't match package.json version ${package_json_1.version}`);
        }
        // Build the release version
        await (0, child_process_1.execSync)('npm run build', { stdio: 'inherit' });
    }
    else {
        console.log('\nBuilding development version');
        // This is a development build
        // Update configs for dev/next version if needed
        await (0, child_process_1.execSync)('npm run build', { stdio: 'inherit' });
    }
}
async function main() {
    try {
        await buildDocs();
    }
    catch (error) {
        console.error('Error building documentation:', error);
        process.exit(1);
    }
}
main();
