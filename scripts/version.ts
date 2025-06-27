import fs from 'fs';
import path from 'path';

// Read the Kamiwaza version file
const versionFile = path.join(__dirname, '../../kamiwaza/kamiwaza.version.json');
const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

const version = `${versionData.KAMIWAZA_VERSION_MAJOR}.${versionData.KAMIWAZA_VERSION_MINOR}.${versionData.KAMIWAZA_VERSION_PATCH}`;

// Documentation subsections that may have independent versioning
// Only include sections that actually exist to avoid ENOENT errors
const allSections = ['', 'sdk', 'examples', 'app-garden'];

// Filter to sections whose target directory exists
const sections = allSections.filter(section => {
  const dir = path.join(__dirname, '../docs', section);
  return fs.existsSync(dir);
});

sections.forEach(section => {
  const versionsFile = path.join(
    __dirname,
    '../docs',
    section,
    'versions.json'
  );
  
  // Ensure the parent directory exists before attempting to read/write
  if (!fs.existsSync(path.dirname(versionsFile))) {
    // Skip this section – directory no longer present
    return;
  }

  let versions: string[] = [];
  if (fs.existsSync(versionsFile)) {
    versions = JSON.parse(fs.readFileSync(versionsFile, 'utf8'));
  }

  // Add new version if it doesn't exist
  if (!versions.includes(version)) {
    versions.unshift(version);
    fs.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));
  }
});

console.log(`Updated version files to include version ${version}`);