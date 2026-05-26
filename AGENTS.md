# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

This is a Docusaurus-based documentation site for the Kamiwaza AI platform. The repository contains both main platform documentation and SDK documentation, with versioning support and automated SDK documentation synchronization.

**Production URL**: https://docs.kamiwaza.ai

## Prerequisites

- Node.js 18.0 or higher
- npm

## Essential Commands

### Development
```bash
# Start development server (from repo root - recommended)
npm run start
# Opens http://localhost:3000 with live reload

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

# Clear Docusaurus cache (from docs/ directory)
cd docs && npm run clear

# Preview production build locally
npm run serve
```

### Versioning

**Option A - Create new version (for releases)**
```bash
# From repo root only - versions BOTH main docs AND SDK docs
npm run version-up -- <version-number>
# Example: npm run version-up -- 0.6.0
```

This script will:
1. Create versioned snapshot of main platform docs
2. Create versioned snapshot of SDK docs
3. Update package.json files with new version
4. Update docusaurus.config.ts version labels

**Option B - Update existing version (for fixes)**
```bash
# From docs/ directory
export DOCS_VERSION=0.5.1

# Remove main docs version
rm -rf versioned_docs/version-$DOCS_VERSION versioned_sidebars/version-$DOCS_VERSION-sidebars.json
node -e "const fs=require('fs');const p='versions.json';const v=JSON.parse(fs.readFileSync(p));fs.writeFileSync(p, JSON.stringify(v.filter(x=>x!=='$DOCS_VERSION'), null, 2)+'\n');"

# Remove SDK docs version
rm -rf sdk_versioned_docs/version-$DOCS_VERSION sdk_versioned_sidebars/version-$DOCS_VERSION-sidebars.json
node -e "const fs=require('fs');const p='sdk_versions.json';const v=JSON.parse(fs.readFileSync(p));fs.writeFileSync(p, JSON.stringify(v.filter(x=>x!=='$DOCS_VERSION'), null, 2)+'\n');"

# Clear cache and recreate versions
npm run clear
npm run docusaurus -- docs:version $DOCS_VERSION
npm run docusaurus -- docs:version:sdk $DOCS_VERSION
npm run build
```

### Deployment
**Deployment is automatic** via GitHub Actions when merging to `main`. No manual deployment needed.

Manual deployment (only for special circumstances):
```bash
# Linux/macOS
GIT_USER=<username> npm run deploy

# Windows
set GIT_USER=<username> && npm run deploy
```

### Container Builds (External)

Container images for this site are built and published from a separate private build repo, not in-tree. Do not add a `Dockerfile`, `docker-bake.hcl`, or container-build workflow to this repo. `.github/workflows/lockfile-check.yml` validates the lockfile contract the external builder consumes — that's the only build-side coupling that lives here. See ENG-4594 for context.

## Repository Architecture

### Directory Structure
- **Root level**: Contains main `package.json`, scripts, and configuration
- **`docs/`**: Contains the Docusaurus site with its own `package.json` and dependencies
- **`docs/docs/`**: Main platform documentation content (current version)
- **`docs/sdk/`**: SDK documentation (synced from external kamiwaza-sdk repo at build time; `services/` and `index.md` are gitignored)
- **`docs/versioned_docs/`**: Archived versions of main platform documentation
- **`docs/sdk_versioned_docs/`**: Archived versions of SDK documentation
- **`docs/versions.json`**: List of main docs versions
- **`docs/sdk_versions.json`**: List of SDK docs versions
- **`scripts/`**: TypeScript automation scripts for versioning and SDK sync

### Key Scripts and Their Purpose
1. **`sync-sdk-docs.ts`**: Syncs SDK documentation from external kamiwaza-sdk repository
2. **`version-up.ts`**: Automates the complete versioning process for BOTH main docs AND SDK docs (creates snapshots, updates configs)
3. **`version.ts`**: Helper script for version management
4. **`generate-pdf.ts`**: Generates PDF documentation with configurable document selection

### Documentation Organization
The site has multiple documentation sections configured as separate Docusaurus plugin instances:
- **Main docs** (`/`): Platform documentation with full versioning support
- **SDK docs** (`/sdk`): API reference and service documentation with full versioning support
- **Blog** (`/blog`): Blog posts and announcements

Both main docs and SDK docs are fully versioned and synchronized via the `version-up` script.

### SDK Documentation Sync
The kamiwaza-sdk repo is the **source of truth** for SDK docs. The `sync-sdk-docs` script copies service docs and the SDK README into the docs site at build time. Synced files (`docs/sdk/services/`, `docs/sdk/index.md`, `docs/sdk-services.generated.json`) are gitignored — do not edit them directly.

**Running the sync:**
```bash
# If kamiwaza-sdk is a sibling directory, it's auto-detected:
npm run sync-sdk

# Or specify the path explicitly:
KW_SDK_DOCS=/path/to/kamiwaza-sdk npm run sync-sdk
```

The script looks for the SDK repo in these locations:
1. Environment variable: `KW_SDK_DOCS` or `KAMIWAZA_SDK_DOCS`
2. Sibling directory: `../kamiwaza-sdk`
3. Alternate sibling: `../../kamiwaza-sdk`
4. Monorepo layout: `../../kamiwaza/kamiwaza-sdk`

The sync copies each `{SDK}/docs/services/{name}/README.md` into `docs/sdk/services/{name}/README.md` (adding Docusaurus frontmatter), syncs `{SDK}/README.md` as `docs/sdk/index.md` (rewriting links), and generates `docs/sdk-services.generated.json` for the sidebar. If the SDK repo is not found, the sync exits cleanly and existing docs are used as-is.

## Development Workflow

### Standard Process

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-changes
   ```

2. **Edit documentation**
   - Edit files in `docs/docs/` (platform docs) or `docs/sdk/` (SDK docs)
   - **Do not edit `versioned_docs/` directly** - always edit current docs
   - Test locally: `npm run start` (from repo root)

3. **Version the documentation** (choose one):
   - **Option A**: Create new version for releases (see Versioning section)
   - **Option B**: Update existing version for fixes (see Versioning section)

4. **Verify build after versioning**
   ```bash
   # From repo root
   npm run build

   # Check for broken links or build errors
   # Optional: Preview locally
   npm run serve
   ```

5. **Submit pull request to `main`**
   - Ensure build passes
   - Include description of changes

6. **After merge → automatic deployment**
   - GitHub Actions automatically deploys to https://docs.kamiwaza.ai
   - No manual deployment needed

### Working with Documentation

#### Adding New Pages
1. Create `.md` or `.mdx` file in `docs/docs/`
2. Add to `docs/sidebars.ts` (or `sidebars-sdk.ts` for SDK docs)
3. Test locally, then version

#### Images
- Place images in `docs/static/img/`
- Reference: `![alt text](/img/filename.png)`

#### Code Examples
```python
import kamiwaza as kz
client = kz.Client()
```

#### Diagrams (Mermaid)
```mermaid
graph TD
    A[User] --> B[API]
    B --> C[Service]
```

### Version Management
- **Current development docs**: `docs/docs/` (edit here)
- **Versioned docs**: `docs/versioned_docs/version-X.Y.Z/` (auto-generated, don't edit)
- **Versioned sidebars**: `docs/versioned_sidebars/` (auto-generated)
- **Version list**: `docs/versions.json`
- **Version labels**: Managed in `docusaurus.config.ts`

### Important Guidelines
- **Run from repo root**: Most commands should run from `kamiwaza-docs/` not `docs/`
- **Only edit current docs**: Don't edit `versioned_docs/` directly
- **Version before PR**: Create or update version snapshots before submitting
- **Search works in production only**: Use `npm run build && npm run serve` to test locally

### Common Issues
- **"Missing script: version-up"**: Run versioning commands from repo root, not docs/
- **SDK sync failures**: Check that kamiwaza-sdk repository is available in expected location
- **Build failures**: Try `npm run clear` from docs/ directory to clear cache
- **Version conflicts**: Ensure version numbers are consistent across package.json files and docusaurus.config.ts