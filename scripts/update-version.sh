#!/bin/bash
set -euo pipefail

# Update existing documentation version
# Usage: ./scripts/update-version.sh [version]
# If no version specified, updates the most recent version from versions.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DOCS_DIR="$REPO_ROOT/docs"

# Change to docs directory
cd "$DOCS_DIR"

# Get version to update
if [[ $# -ge 1 ]]; then
    DOCS_VERSION="$1"
else
    # Default to most recent version (first entry in versions.json)
    if [[ ! -f "versions.json" ]]; then
        echo "Error: versions.json not found in $DOCS_DIR"
        exit 1
    fi
    DOCS_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('versions.json'))[0])")
    echo "No version specified, using most recent: $DOCS_VERSION"
fi

echo "Updating version: $DOCS_VERSION"

# Verify version exists in versions.json
VERSION_EXISTS=$(node -e "const v=JSON.parse(require('fs').readFileSync('versions.json'));console.log(v.includes('$DOCS_VERSION'))")
if [[ "$VERSION_EXISTS" != "true" ]]; then
    echo "Error: Version $DOCS_VERSION not found in versions.json"
    echo "Available versions:"
    cat versions.json
    exit 1
fi

# Remove existing version snapshot
echo "Removing existing version snapshot..."
rm -rf "versioned_docs/version-$DOCS_VERSION"
rm -f "versioned_sidebars/version-$DOCS_VERSION-sidebars.json"

# Remove version from versions.json
echo "Updating versions.json..."
node -e "
const fs = require('fs');
const versions = JSON.parse(fs.readFileSync('versions.json'));
const filtered = versions.filter(v => v !== '$DOCS_VERSION');
fs.writeFileSync('versions.json', JSON.stringify(filtered, null, 2) + '\n');
"

# Clear Docusaurus cache
echo "Clearing Docusaurus cache..."
npm run clear

# Create new version snapshot
echo "Creating new version snapshot..."
npm run docusaurus -- docs:version "$DOCS_VERSION"

# Build to verify
echo "Building to verify..."
npm run build

echo ""
echo "Successfully updated version $DOCS_VERSION"
echo "Don't forget to commit the changes!"
