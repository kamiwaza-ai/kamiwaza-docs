"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
// --- Configuration ---
const DOCS_DIR = path_1.default.join(__dirname, '../docs');
const ROOT_PACKAGE_JSON_PATH = path_1.default.join(__dirname, '../package.json');
const DOCS_PACKAGE_JSON_PATH = path_1.default.join(DOCS_DIR, 'package.json');
const DOCUSAURUS_CONFIG_PATH = path_1.default.join(DOCS_DIR, 'docusaurus.config.ts');
// --- Helper Functions ---
function readJsonFile(filePath) {
    const fileContent = fs_1.default.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContent);
}
function writeJsonFile(filePath, data) {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}
function updateDocusaurusConfig(newVersion) {
    console.log(`Updating ${DOCUSAURUS_CONFIG_PATH}...`);
    let configContent = fs_1.default.readFileSync(DOCUSAURUS_CONFIG_PATH, 'utf8');
    // Update the `label` for the `current` version to the new version with a "(Latest)" suffix
    configContent = configContent.replace(/(versions:\s*{\s*current:\s*{\s*label: ')([^']+)(')/g, `$1${newVersion} (Latest)$3`);
    fs_1.default.writeFileSync(DOCUSAURUS_CONFIG_PATH, configContent);
    console.log('Docusaurus config updated.');
}
function updatePackageJsonVersion(filePath, newVersion) {
    console.log(`Updating ${filePath}...`);
    const packageJson = readJsonFile(filePath);
    packageJson.version = newVersion;
    writeJsonFile(filePath, packageJson);
    console.log(`${filePath} updated.`);
}
function runDocusaurusVersioning(newVersion) {
    console.log(`Running Docusaurus versioning for main docs (${newVersion})...`);
    try {
        // We run `npm install` in docs first to ensure docusaurus is installed,
        // then run the versioning command.
        (0, child_process_1.execSync)(`npm run clear && npm install && npm run docusaurus -- docs:version ${newVersion}`, {
            cwd: DOCS_DIR,
            stdio: 'inherit',
        });
        console.log('Docusaurus main docs versioning complete.');
    }
    catch (error) {
        console.error('Failed to run docusaurus versioning command. Docusaurus output should be above.');
        process.exit(1);
    }
}
function runSdkDocusaurusVersioning(newVersion) {
    console.log(`Running Docusaurus versioning for SDK docs (${newVersion})...`);
    try {
        (0, child_process_1.execSync)(`npm run docusaurus -- docs:version:sdk ${newVersion}`, {
            cwd: DOCS_DIR,
            stdio: 'inherit',
        });
        console.log('Docusaurus SDK docs versioning complete.');
    }
    catch (error) {
        console.error('Failed to run SDK docusaurus versioning command. Docusaurus output should be above.');
        process.exit(1);
    }
}
// --- Main Execution ---
function main() {
    console.log('🚀 Starting documentation version update...');
    // 1. Get the new version from command-line arguments
    const newVersion = process.argv[2];
    if (!newVersion) {
        console.error('❌ Error: No version specified.');
        console.error('Usage: npm run version-up -- <new-version>');
        console.error('Example: npm run version-up -- 0.4.0');
        process.exit(1);
    }
    // Basic validation for version format (e.g., x.y.z)
    if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
        console.error(`❌ Error: Invalid version format "${newVersion}". Please use a format like "1.2.3".`);
        process.exit(1);
    }
    console.log(`ℹ️ Preparing to version docs as: ${newVersion}`);
    // 2. Run the Docusaurus versioning command FIRST.
    // This is important because it stages the new version directory. If other files
    // are changed first, they might get snapshotted into the *previous* version.
    runDocusaurusVersioning(newVersion);
    // 3. Run SDK Docusaurus versioning
    runSdkDocusaurusVersioning(newVersion);
    // 4. Update package.json files
    updatePackageJsonVersion(ROOT_PACKAGE_JSON_PATH, newVersion);
    updatePackageJsonVersion(DOCS_PACKAGE_JSON_PATH, newVersion);
    // 5. Update docusaurus.config.ts (updates both main and SDK version labels)
    updateDocusaurusConfig(newVersion);
    console.log(`\n✅ Successfully created version ${newVersion} for both main and SDK docs.`);
    console.log("Configuration files updated. Don't forget to review and commit the changes!");
}
main();
