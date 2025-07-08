import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// --- Configuration ---
const DOCS_DIR = path.join(__dirname, '../docs');
const ROOT_PACKAGE_JSON_PATH = path.join(__dirname, '../package.json');
const DOCS_PACKAGE_JSON_PATH = path.join(DOCS_DIR, 'package.json');
const DOCUSAURUS_CONFIG_PATH = path.join(DOCS_DIR, 'docusaurus.config.ts');

// --- Helper Functions ---

function readJsonFile(filePath: string) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(fileContent);
}

function writeJsonFile(filePath: string, data: any) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function updateDocusaurusConfig(newVersion: string) {
  console.log(`Updating ${DOCUSAURUS_CONFIG_PATH}...`);
  let configContent = fs.readFileSync(DOCUSAURUS_CONFIG_PATH, 'utf8');

  // Update the `label` for the `current` version in both doc plugins
  configContent = configContent.replace(
    /(versions:\s*{\s*current:\s*{\s*label: ')([^']+)(')/g,
    `$1${newVersion}$3`
  );

  // This regex updates the hardcoded version in the navbar
  configContent = configContent.replace(
    /(value: 'Version: )([^']+)(')/g,
    `$1${newVersion}$3`
  );

  fs.writeFileSync(DOCUSAURUS_CONFIG_PATH, configContent);
  console.log('Docusaurus config updated.');
}

function updatePackageJsonVersion(filePath: string, newVersion: string) {
  console.log(`Updating ${filePath}...`);
  const packageJson = readJsonFile(filePath);
  packageJson.version = newVersion;
  writeJsonFile(filePath, packageJson);
  console.log(`${filePath} updated.`);
}

function runDocusaurusVersioning(newVersion: string) {
  console.log(`Running Docusaurus versioning for ${newVersion}...`);
  try {
    // We run `npm install` in docs first to ensure docusaurus is installed,
    // then run the versioning command.
    execSync(`npm run clear && npm install && npm run docusaurus -- docs:version ${newVersion}`, {
      cwd: DOCS_DIR,
      stdio: 'inherit',
    });
    console.log('Docusaurus versioning complete.');
  } catch (error) {
    console.error('Failed to run docusaurus versioning command. Docusaurus output should be above.');
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

  // 3. Update package.json files
  updatePackageJsonVersion(ROOT_PACKAGE_JSON_PATH, newVersion);
  updatePackageJsonVersion(DOCS_PACKAGE_JSON_PATH, newVersion);

  // 4. Update docusaurus.config.ts
  updateDocusaurusConfig(newVersion);

  console.log(`\n✅ Successfully created version ${newVersion} and updated configuration files.`);
  console.log("Don't forget to review and commit the changes!");
}

main(); 