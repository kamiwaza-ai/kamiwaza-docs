# Website

This website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator.

### Installation

```
$ yarn
```

### Local Development

```
$ yarn start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Preview the Documentation

To preview the documentation site:

1. **Navigate to the docs directory**:
   ```
   $ cd docs
   ```

2. **Install dependencies** (if not already done):
   ```
   $ yarn
   ```

3. **Start the development server**:
   ```
   $ yarn start
   ```

4. **Open your browser** to `http://localhost:3000`

The development server will automatically reload when you make changes to the documentation files.

**Note**: Make sure you're in the `docs` directory when running these commands, as that's where the `docusaurus.config.ts` file is located.

### Build

```
$ yarn build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Deployment

Using SSH:

```
$ USE_SSH=true yarn deploy
```

Not using SSH:

```
$ GIT_USER=<Your GitHub username> yarn deploy
```

If you are using GitHub pages for hosting, this command is a convenient way to build the website and push to the `gh-pages` branch.
