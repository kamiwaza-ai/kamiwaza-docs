# Kamiwaza Documentation Development

This repository contains the Kamiwaza AI platform documentation built with [Docusaurus](https://docusaurus.io/). This README is for developers working on the documentation codebase.

## Development Setup

### Prerequisites
- Node.js 18.0 or higher
- npm or yarn

### Installation

Navigate to the docs directory and install dependencies:

```bash
cd docs
npm install
```

### Local Development

Start the development server:

```bash
npm run start
# or
npm run dev
```

This opens `http://localhost:3000` in your browser. Most changes are reflected live without restarting the server.

**Note**: Always run development commands from the `docs` directory where `docusaurus.config.ts` is located.

## Documentation Structure

- `docs/` - Main platform documentation
- `sdk/` - SDK documentation 
- `blog/` - Blog posts
- `static/` - Static assets (images, etc.)
- `src/` - Custom React components and CSS
- `versioned_docs/` - Version-specific documentation archives

## Build and Deployment

### Local Build

Generate static content for production:

```bash
npm run build
```

This creates a `build` directory with static files.

### Preview Production Build

Serve the production build locally:

```bash
npm run serve
```

### Deployment

Deploy to GitHub Pages:

```bash
# Using SSH
USE_SSH=true npm run deploy

# Using HTTPS
GIT_USER=<Your GitHub username> npm run deploy
```

## Version Management

The documentation uses Docusaurus versioning to maintain multiple versions of the docs.

**⚠️ Important**: Versioning commands are run from the root `kamiwaza-docs/` directory, while most other commands are run from the `docs/` subdirectory.

### Current Version

The current documentation version is **0.4.0**. This is defined in multiple places:
- `package.json` (`version` field) - both root and docs directories
- `docusaurus.config.ts` (plugin configurations and navbar)
- `versions.json` (versioned releases)

### Creating a New Version

#### Automated Version Update (Recommended)

The documentation version is automatically synced with the main Kamiwaza platform version:

1. **Navigate to the root `kamiwaza-docs` directory**:
   ```bash
   # If you're in the docs/ subdirectory:
   cd ..
   
   # Verify you're in the right place (should show kamiwaza-docs):
   pwd
   ls  # Should see: docs/ scripts/ package.json etc.
   ```

2. **Check the source version** in the main repository:
   ```bash
   cat ../kamiwaza/kamiwaza.version.json
   ```

3. **Update documentation versions**:
   ```bash
   npm run version-up
   ```

   This command:
   - Reads the version from `../kamiwaza/kamiwaza.version.json`
   - Creates a new versioned snapshot of the current docs
   - Updates `versions.json` automatically

4. **Update version references** in configuration files:
   After running `version-up`, manually update these files to reflect the new version:
   - `docs/docusaurus.config.ts`: Update version labels and navbar display
   - `package.json` files: Update version fields
   - Restart the development server to see changes

#### Manual Version Update

If you need to manually create a version:

1. **From the docs directory**, create a new version:
   ```bash
   npm run docusaurus-version 0.4.0
   ```

2. **Update the configuration** in `docusaurus.config.ts`:
   ```typescript
   versions: {
     current: {
       label: '0.4.0',  // Update this
     },
   },
   ```

3. **Update the navbar version** in `docusaurus.config.ts`:
   ```typescript
   {
     type: 'html',
     position: 'right',
     className: 'navbar__version',
     value: 'Version: 0.4.0',  // Update this
   }
   ```

4. **Update package.json**:
   ```json
   {
     "version": "0.4.0"
   }
   ```

### Version Behavior

- **Current version**: Always refers to the latest development docs in `docs/`
- **Versioned releases**: Archived in `versioned_docs/version-X.Y.Z/`
- **Default display**: Current version is shown by default
- **Version switching**: Users can switch between versions via the version dropdown

### Managing Versions

List all versions:
```bash
ls versioned_docs/
cat versions.json
```

Remove a version (if needed):
1. Delete the corresponding directory in `versioned_docs/`
2. Remove the version from `versions.json`

## Content Development

### Writing Documentation

- Use Markdown with MDX support for React components
- Place images in `static/img/`
- Update `sidebars.ts` when adding new pages
- Use relative links for internal navigation

### Code Examples

Use proper syntax highlighting:

```python
# Python example
import kamiwaza as kz
client = kz.Client()
```

### Diagrams

Mermaid diagrams are supported:

```mermaid
graph TD
    A[User] --> B[API Gateway]
    B --> C[Services]
```

## Quality Assurance

### Link Checking

Before publishing, verify all internal links work:

```bash
npm run build
```

Check the build output for broken link warnings.

### Type Checking

Run TypeScript checks:

```bash
npm run typecheck
```

## Troubleshooting

### Build Failures
- Ensure you're in the `docs` directory
- Clear the cache: `npm run clear`
- Delete `node_modules` and reinstall if needed

### Version Conflicts
- Ensure version numbers are consistent across all configuration files
- Check that version directories exist if referenced in configs

### Development Server Issues
- Check that port 3000 is available
- Try `npm run clear` to clear Docusaurus cache

### Versioning Issues
- **"Missing script: version-up"**: You're in the wrong directory. Run versioning commands from the root `kamiwaza-docs/` directory, not `docs/`
- **"No config file found"**: Docusaurus can't find its config. The `version-up` command automatically switches to the `docs/` directory where the config exists
- **"Version already exists"**: If you see errors about existing versions, check `versions.json` and remove conflicting entries, or delete the corresponding `versioned_docs/version-X.Y.Z/` folder
- **Version mismatch**: Ensure the `../kamiwaza/kamiwaza.version.json` file exists and is readable from the kamiwaza-docs directory
- **Version not showing in browser**: After running `version-up`, update version numbers in `docusaurus.config.ts` and restart the development server

## Contributing

1. Create a feature branch for documentation changes
2. Test locally with `npm run start`
3. Build successfully with `npm run build`
4. Submit a pull request with clear descriptions of changes

For questions or issues, refer to the [Docusaurus documentation](https://docusaurus.io/docs) or create an issue in this repository.
