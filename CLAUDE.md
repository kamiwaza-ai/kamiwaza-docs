# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus-based documentation site for the Kamiwaza AI platform. The repository contains both main platform documentation and SDK documentation, with versioning support and automated SDK documentation synchronization.

## Essential Commands

### Development
```bash
# Start development server (from repo root - recommended)
npm run start

# Start development server (from docs/ directory)
cd docs && npm run start
```

### Build and Type Checking
```bash
# Full build with SDK sync (from repo root - recommended)
npm run build

# Build only docs (from docs/ directory, skips SDK sync)
cd docs && npm run build

# Type checking
npm run typecheck

# Clear Docusaurus cache
cd docs && npm run clear
```

### Versioning (run from repo root only)
```bash
# Create new documentation version
npm run version-up -- <version-number>

# Example: npm run version-up -- 0.6.0
```

### Deployment
```bash
# Deploy to GitHub Pages
GIT_USER=<username> npm run deploy
# or with SSH: USE_SSH=true npm run deploy

# Preview production build locally
npm run serve
```

## Repository Architecture

### Directory Structure
- **Root level**: Contains main `package.json`, scripts, and configuration
- **`docs/`**: Contains the Docusaurus site with its own `package.json` and dependencies
- **`docs/docs/`**: Main platform documentation content
- **`docs/sdk/`**: SDK documentation (auto-generated from external kamiwaza-sdk repo)
- **`docs/versioned_docs/`**: Archived versions of documentation
- **`scripts/`**: TypeScript automation scripts for versioning and SDK sync

### Key Scripts and Their Purpose
1. **`sync-sdk-docs.ts`**: Syncs SDK documentation from external kamiwaza-sdk repository
2. **`version-up.ts`**: Automates the complete versioning process (creates snapshots, updates configs)
3. **`version.ts`**: Helper script for version management

### Documentation Organization
The site has multiple documentation sections configured as separate Docusaurus plugin instances:
- **Main docs** (`/`): Platform documentation with versioning
- **SDK docs** (`/sdk`): API reference and service documentation
- **Blog** (`/blog`): Blog posts and announcements

### SDK Documentation Sync
The `sync-sdk-docs` script automatically pulls documentation from the kamiwaza-sdk repository. It looks for the SDK in these locations:
1. Environment variable: `KW_SDK_DOCS` or `KAMIWAZA_SDK_DOCS`
2. Sibling directory: `../kamiwaza-sdk/docs`
3. Alternate sibling: `../../kamiwaza-sdk/docs`
4. Monorepo layout: `../../kamiwaza/kamiwaza-sdk/docs`

## Development Workflow

### Working with Documentation
- Run commands from repo root when possible (uses npm scripts that handle directory switching)
- For versioning operations, always use repo root - the scripts handle the directory context
- When adding new pages, update the appropriate sidebar file (`sidebars.ts`, `sidebars-sdk.ts`)
- Images go in `docs/static/img/`

### Version Management
- Current development docs live in `docs/docs/`
- Versioned docs are archived in `docs/versioned_docs/version-X.Y.Z/`
- The version dropdown shows all available versions
- Version labels are managed in `docusaurus.config.ts`

### Common Issues
- **"Missing script: version-up"**: Run versioning commands from repo root, not docs/
- **SDK sync failures**: Check that kamiwaza-sdk repository is available in expected location
- **Build failures**: Try `npm run clear` from docs/ directory to clear cache
- **Version conflicts**: Ensure version numbers are consistent across package.json files and docusaurus.config.ts