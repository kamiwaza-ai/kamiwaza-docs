import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// --- Configuration ---
const DOCS_DIR = path.join(__dirname, '../docs');
const REPO_ROOT = path.join(__dirname, '..');
const ROOT_PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const DOCS_PACKAGE_JSON_PATH = path.join(DOCS_DIR, 'package.json');
const MAIN_VERSIONS_PATH = path.join(DOCS_DIR, 'versions.json');
const SDK_VERSIONS_PATH = path.join(DOCS_DIR, 'sdk_versions.json');

// --- Helper Functions ---

function readJsonFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

function writeJsonFile(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function getDocusaurusEnv() {
  const env = { ...process.env };
  delete env.DEBUG;
  return env;
}

function versionExists(filePath: string, version: string) {
  if (!fs.existsSync(filePath)) {
    return false;
  }

  const versions = readJsonFile(filePath);
  return Array.isArray(versions) && versions.includes(version);
}

function updatePackageJsonVersion(filePath: string, newVersion: string) {
  console.log(`Updating ${filePath}...`);
  const packageJson = readJsonFile(filePath);
  packageJson.version = newVersion;
  writeJsonFile(filePath, packageJson);
  console.log(`${filePath} updated.`);
}

function runDocusaurusVersioning(newVersion: string) {
  console.log(`Running Docusaurus versioning for main docs (${newVersion})...`);
  try {
    execSync(`npm run clear && npm run docusaurus -- docs:version ${newVersion}`, {
      cwd: DOCS_DIR,
      env: getDocusaurusEnv(),
      stdio: 'inherit',
    });
    console.log('Docusaurus main docs versioning complete.');
  } catch (error) {
    console.error('Failed to run docusaurus versioning command. Docusaurus output should be above.');
    process.exit(1);
  }
}

function runSdkDocusaurusVersioning(newVersion: string) {
  console.log(`Running Docusaurus versioning for SDK docs (${newVersion})...`);
  try {
    execSync(`npm run docusaurus -- docs:version:sdk ${newVersion}`, {
      cwd: DOCS_DIR,
      env: getDocusaurusEnv(),
      stdio: 'inherit',
    });
    console.log('Docusaurus SDK docs versioning complete.');
  } catch (error) {
    console.error('Failed to run SDK docusaurus versioning command. Docusaurus output should be above.');
    process.exit(1);
  }
}

function runOpenApiSync() {
  console.log('Syncing OpenAPI spec for docs...');
  try {
    execSync('npm run sync-openapi', {
      cwd: REPO_ROOT,
      env: getDocusaurusEnv(),
      stdio: 'inherit',
    });
    console.log('OpenAPI sync complete.');
  } catch (error) {
    console.error('Failed to sync OpenAPI spec. Sync output should be above.');
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

  if (versionExists(MAIN_VERSIONS_PATH, newVersion)) {
    console.error(`❌ Error: Main docs version "${newVersion}" already exists.`);
    console.error(`Use "npm run version-update -- ${newVersion}" to refresh an existing docs snapshot.`);
    process.exit(1);
  }

  if (versionExists(SDK_VERSIONS_PATH, newVersion)) {
    console.error(`❌ Error: SDK docs version "${newVersion}" already exists.`);
    console.error('Remove the existing SDK snapshot first or use a new version tag.');
    process.exit(1);
  }

  // 2. Run the Docusaurus versioning command FIRST.
  // This is important because it stages the new version directory. If other files
  // are changed first, they might get snapshotted into the *previous* version.
  runDocusaurusVersioning(newVersion);

  // 3. Run SDK Docusaurus versioning
  runSdkDocusaurusVersioning(newVersion);

  // 4. Update package.json files
  updatePackageJsonVersion(ROOT_PACKAGE_JSON_PATH, newVersion);
  updatePackageJsonVersion(DOCS_PACKAGE_JSON_PATH, newVersion);

  // 5. Refresh OpenAPI docs metadata after the package version bump so the
  // published REST API reference shows the new release version.
  runOpenApiSync();

  console.log(`\n✅ Successfully created version ${newVersion} for both main and SDK docs.`);
  console.log("Package versions updated. Don't forget to review and commit the changes!");
}

main(); 
