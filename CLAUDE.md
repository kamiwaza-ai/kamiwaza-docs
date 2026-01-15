# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### PDF Generation

Generate professional PDF documentation packages with table of contents, page numbers, and enhanced headers/footers.

**Prerequisites**: Documentation must be built first
```bash
# Build documentation
npm run build
```

**Quick Commands**:
```bash
# Generate offline installation guide PDF
npm run pdf:offline

# Generate full documentation PDF
npm run pdf:full

# Generate federal documentation PDF (if INCLUDE_FEDERAL_DOCS is set)
npm run pdf:federal

# Generate with specific profile and version
npm run pdf -- --profile offline-install --version 0.9.2
```

**Features**:
- **Hierarchical Table of Contents**: Includes H1 and H2 sections with page numbers and dotted leaders
- **Two-Pass Generation**: Automatically extracts accurate page numbers when TOC is enabled
- **Markdown-Based Processing**: Reads markdown source files directly using markdown-it, converting to single HTML document
- **Enhanced Headers**: Logo and date on every page with branding
- **Enhanced Footers**: Page numbers with "kamiwaza.ai" branding
- **Auto-Numbered Sections**: CSS counters for automatic section numbering (1., 1.1, 1.1.1)
- **Docusaurus Syntax Handling**: Converts admonitions, removes frontmatter, replaces mermaid diagrams with placeholders
- **Print-Optimized CSS**: Tight spacing (1.15 line height), Arial font, 11pt body, 9pt code
- **Smart Page Number Extraction**: Uses pdfjs-dist to read PDF text, handles spaced text and HTML entities

**Configuration**:
Edit `pdf-config.yaml` to:
- Create custom document profiles
- Select specific documents to include
- Configure cover page and styling options
- Control TOC, headers, footers, and page numbers

**Output Location**: `dist/pdf/`

**Example PDF Profiles**:
- `offline-install`: Essential docs for air-gapped installations (Admin Guide, System Requirements, Installation, GPU Setup, Quickstart)
- `full-docs`: Complete platform documentation with auto-discovery of all documents

**Technical Implementation**:
The PDF generator (`scripts/generate-pdf.ts`) uses a markdown-first approach inspired by the github-docs-pdf-gen Python tool:
1. **Collect**: Reads markdown files directly from `docs/versioned_docs/version-X.Y.Z/`
2. **Process**: Converts markdown to HTML using markdown-it, handling Docusaurus syntax (frontmatter, admonitions, mermaid)
3. **Generate**: Creates single HTML document with structure: `.cover-page` → `.toc-page` → `.doc-content` with `.doc-section` divs
4. **Style**: Applies `templates/print-styles.css` with CSS counters for auto-numbering, tight spacing, and print-optimized typography
5. **First Pass**: Generates PDF without page numbers using Puppeteer
6. **Extract**: Uses pdfjs-dist to read PDF text from each page, searching for section titles with fuzzy matching (handles spaced text like "Con fi guration")
7. **Second Pass**: Regenerates PDF with accurate page numbers in TOC

**Dependencies**:
- `markdown-it`: Markdown to HTML conversion
- `gray-matter`: Frontmatter extraction
- `puppeteer`: HTML to PDF rendering
- `pdfjs-dist`: PDF text extraction for page numbers
- `pdf-lib`: PDF manipulation (unused after refactor, can be removed)

## Repository Architecture

### Directory Structure
- **Root level**: Contains main `package.json`, scripts, and configuration
- **`docs/`**: Contains the Docusaurus site with its own `package.json` and dependencies
- **`docs/docs/`**: Main platform documentation content (current version)
- **`docs/sdk/`**: SDK documentation (auto-generated from external kamiwaza-sdk repo, current version)
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
The `sync-sdk-docs` script automatically pulls documentation from the kamiwaza-sdk repository. It looks for the SDK in these locations:
1. Environment variable: `KW_SDK_DOCS` or `KAMIWAZA_SDK_DOCS`
2. Sibling directory: `../kamiwaza-sdk/docs`
3. Alternate sibling: `../../kamiwaza-sdk/docs`
4. Monorepo layout: `../../kamiwaza/kamiwaza-sdk/docs`

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