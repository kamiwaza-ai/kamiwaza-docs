"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// Read the Kamiwaza version file
const versionFile = path_1.default.join(__dirname, '../../kamiwaza/kamiwaza.version.json');
const versionData = JSON.parse(fs_1.default.readFileSync(versionFile, 'utf8'));
const version = `${versionData.KAMIWAZA_VERSION_MAJOR}.${versionData.KAMIWAZA_VERSION_MINOR}.${versionData.KAMIWAZA_VERSION_PATCH}`;
// Documentation subsections that may have independent versioning
// Only include sections that actually exist to avoid ENOENT errors
const allSections = ['', 'sdk', 'examples', 'app-garden'];
// Filter to sections whose target directory exists
const sections = allSections.filter(section => {
    const dir = path_1.default.join(__dirname, '../docs', section);
    return fs_1.default.existsSync(dir);
});
sections.forEach(section => {
    const versionsFile = path_1.default.join(__dirname, '../docs', section, 'versions.json');
    // Ensure the parent directory exists before attempting to read/write
    if (!fs_1.default.existsSync(path_1.default.dirname(versionsFile))) {
        // Skip this section – directory no longer present
        return;
    }
    let versions = [];
    if (fs_1.default.existsSync(versionsFile)) {
        versions = JSON.parse(fs_1.default.readFileSync(versionsFile, 'utf8'));
    }
    // Add new version if it doesn't exist
    if (!versions.includes(version)) {
        versions.unshift(version);
        fs_1.default.writeFileSync(versionsFile, JSON.stringify(versions, null, 2));
    }
});
console.log(`Updated version files to include version ${version}`);
