import fs from 'fs';
import path from 'path';

// Read the Kamiwaza version file
const versionFile = path.join(__dirname, '../../kamiwaza.version.json');
const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));

const version = `${versionData.KAMIWAZA_VERSION_MAJOR}.${versionData.KAMIWAZA_VERSION_MINOR}.${versionData.KAMIWAZA_VERSION_PATCH}`;

// Update versions.json for each documentation section
const sections = ['', 'sdk', 'examples', 'app-garden'];

sections.forEach(section => {
  const versionsFile = path.join(
    __dirname,
    '../docs',
    section,
    'versions.json'
  );
  
  let versions = [];
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