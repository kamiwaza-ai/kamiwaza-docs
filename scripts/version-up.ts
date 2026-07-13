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

function runSdkSync() {
  console.log('Syncing SDK docs before versioning...');
  try {
    execSync('npm run sync-sdk', {
      cwd: REPO_ROOT,
      env: getDocusaurusEnv(),
      stdio: 'inherit',
    });
    console.log('SDK docs sync complete.');
  } catch (error) {
    console.error('Failed to sync SDK docs. Sync output should be above.');
    process.exit(1);
  }

  // sync-sdk-docs.ts is intentionally non-fatal when no kamiwaza-sdk repo is
  // available — that lets `npm run build:offline` and the PDF auto-build run
  // on a clean checkout. The release path is the opposite: snapshotting an
  // SDK version that contains only the checked-in intro/api-reference
  // placeholder (because no service `.md`s exist) is a silent regression
  // for any consumer pinning that release tag. Hard-fail here when sync
  // produced no service docs, so the operator goes and sets KW_SDK_DOCS or
  // places a sibling kamiwaza-sdk before they cut a release.
  const servicesDir = path.join(DOCS_DIR, 'sdk', 'current', 'services');
  const generatedJson = path.join(DOCS_DIR, 'sdk-services.generated.json');
  let syncedServiceCount = 0;
  if (fs.existsSync(servicesDir)) {
    syncedServiceCount = fs
      .readdirSync(servicesDir)
      .filter((entry) => entry.endsWith('.md')).length;
  }
  let generatedSidebarCount = 0;
  if (fs.existsSync(generatedJson)) {
    try {
      const list = readJsonFile(generatedJson);
      generatedSidebarCount = Array.isArray(list) ? list.length : 0;
    } catch {
      generatedSidebarCount = 0;
    }
  }
  if (syncedServiceCount === 0 || generatedSidebarCount === 0) {
    console.error(
      '❌ Error: SDK sync produced no service documents (sdk/current/services/ is empty or sdk-services.generated.json is empty/missing).',
    );
    console.error(
      '   Versioning would snapshot an empty SDK release. Set KW_SDK_DOCS or place kamiwaza-sdk as a sibling directory and re-run.',
    );
    process.exit(1);
  }
  console.log(
    `Verified ${syncedServiceCount} synced SDK service doc(s) and ${generatedSidebarCount} generated sidebar entry(s) before snapshot.`,
  );
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

  // 2. Sync generated SDK docs before snapshotting either docs tree so the
  // current release snapshot always includes the service pages.
  runSdkSync();

  // 3. Run the Docusaurus versioning command FIRST.
  // This is important because it stages the new version directory. If other files
  // are changed first, they might get snapshotted into the *previous* version.
  runDocusaurusVersioning(newVersion);

  // 4. Run SDK Docusaurus versioning
  runSdkDocusaurusVersioning(newVersion);

  // 5. Update package.json files
  updatePackageJsonVersion(ROOT_PACKAGE_JSON_PATH, newVersion);
  updatePackageJsonVersion(DOCS_PACKAGE_JSON_PATH, newVersion);

  // 6. Refresh OpenAPI docs metadata after the package version bump so the
  // published REST API reference shows the new release version.
  runOpenApiSync();

  console.log(`\n✅ Successfully created version ${newVersion} for both main and SDK docs.`);
  console.log("Package versions updated. Don't forget to review and commit the changes!");
}

main(); 
