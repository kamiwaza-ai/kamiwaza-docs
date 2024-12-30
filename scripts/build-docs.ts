import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { version as pkgVersion } from '../package.json';

interface Version {
  tag: string;
  version: string;
  isRelease: boolean;
}

async function getCurrentGitTag(dir: string): Promise<string> {
  try {
    return execSync('git describe --exact-match --tags HEAD', {
      cwd: dir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8'
    }).trim();
  } catch (e) {
    return 'development';
  }
}

async function buildDocs() {
  const docsRoot = path.resolve(__dirname, '..');
  const sdkRoot = path.resolve(docsRoot, '..', 'kamiwaza-sdk');

  // Get current versions
  const currentTag = await getCurrentGitTag(docsRoot);
  const sdkTag = await getCurrentGitTag(sdkRoot);
  
  console.log(`Building documentation:`);
  console.log(`Docs version: ${currentTag}`);
  console.log(`SDK version: ${sdkTag}`);
  console.log('Package.json version:', pkgVersion);

  // Clean any previous builds
  await fs.remove(path.join(docsRoot, '.docusaurus'));
  await fs.remove(path.join(docsRoot, 'build'));
  
  // Sync SDK docs for current version
  console.log('\nSyncing SDK documentation...');
  await execSync('npm run sync-sdk', { stdio: 'inherit' });

  // Handle versioning
  if (currentTag.startsWith('v')) {
    console.log('\nBuilding release version:', currentTag);
    // This is a release build
    if (currentTag !== `v${pkgVersion}`) {
      console.warn(`Warning: Git tag ${currentTag} doesn't match package.json version ${pkgVersion}`);
    }
    
    // Build the release version
    await execSync('npm run build', { stdio: 'inherit' });
  } else {
    console.log('\nBuilding development version');
    // This is a development build
    // Update configs for dev/next version if needed
    await execSync('npm run build', { stdio: 'inherit' });
  }
}

async function main() {
  try {
    await buildDocs();
  } catch (error) {
    console.error('Error building documentation:', error);
    process.exit(1);
  }
}

main();