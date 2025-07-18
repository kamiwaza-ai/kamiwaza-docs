# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is the official documentation repository for the Kamiwaza AI Platform, built with Docusaurus v3. The docs cover the platform architecture, SDK reference, installation guides, and use cases for this enterprise AI orchestration platform.

## Common Commands

### Development (run from `docs/` directory)
```bash
cd docs
npm run start       # Start dev server on http://localhost:3000
npm run build       # Build production site with search index
npm run serve       # Preview production build
npm run typecheck   # Run TypeScript type checking
npm run clear       # Clear Docusaurus cache
```

### Versioning (run from root directory)
```bash
npm run version-up -- <version>  # Create new documentation version
npm run sync-sdk                 # Sync SDK documentation
npm run version-docs             # Version documentation
```

### Deployment
```bash
cd docs
USE_SSH=true npm run deploy      # Deploy to GitHub Pages
```

## High-Level Architecture

### Repository Structure
- **Root directory**: Contains versioning scripts and npm workspaces configuration
- **`docs/` directory**: Main Docusaurus project where all development happens
  - `docs/`: Platform documentation organized by topic (architecture, installation, use-cases)
  - `sdk/`: SDK reference documentation with service-specific pages
  - `blog/`: Technical articles about AI concepts and platform features
  - `src/`: Custom React components and CSS modules
  - `static/`: Images and other static assets
  - `versioned_docs/`: Snapshots of documentation for previous versions

### Key Technical Details
- **Multi-doc setup**: Three separate documentation sections (main docs, SDK, blog) with independent sidebars
- **Search**: Local search using @easyops-cn/docusaurus-search-local that indexes all content types
- **Versioning**: Custom versioning system that creates snapshots in `versioned_docs/`
- **Styling**: Combination of Tailwind CSS and CSS modules
- **MDX Support**: Enhanced Markdown with React components and Mermaid diagrams

### Development Workflow Patterns
1. **Adding new documentation pages**: Create `.md` or `.mdx` files in appropriate directory and update corresponding `sidebars.ts`
2. **Working with images**: Place in `static/img/` and reference with `/img/filename`
3. **Testing search**: Search only works in production builds (`npm run build` then `npm run serve`)
4. **Version management**: Always create versions from root directory using the version-up script

### Platform Context
The Kamiwaza platform this documentation describes is a layered AI system with:
- Application Layer (UI, SDK, App Garden)
- Services Layer (FastAPI gateway, microservices)
- Infrastructure Layer (Traefik, CockroachDB, etcd)
- Foundation Layer (Ray Serve, Docker Swarm)

Understanding this architecture helps when updating technical documentation or examples.