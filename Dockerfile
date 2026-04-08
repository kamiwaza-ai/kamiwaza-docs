# syntax=docker/dockerfile:1
# =============================================================================
# Kamiwaza Docs — Docusaurus static site container
# =============================================================================
# Multi-stage build: npm build → serve static output.
# Follows the same pattern as the kamiwaza frontend container.
#
# Stages:
#   builder  — install deps + build Docusaurus static site
#   runtime  — minimal Node image serving the built site
#
# Usage:
#   docker build -t kamiwaza-docs .
#   docker run -p 3000:3000 kamiwaza-docs
#
# The reverse proxy strips the /docs prefix before forwarding, so the
# container sees requests at /.  Docusaurus is built with baseUrl="/docs/"
# so all internal links include the prefix.

# =============================================================================

# ---------------------------------------------------------------------------
# Builder stage — npm install + docusaurus build
# ---------------------------------------------------------------------------
FROM node:22-slim AS builder

WORKDIR /build

# Copy root package.json and lockfile first for cache efficiency
COPY package.json package-lock.json ./

# Install root dependencies (includes sync scripts)
RUN npm ci --ignore-scripts

# Copy docs package files first for cache efficiency
COPY docs/package.json docs/package-lock.json docs/

# Install docs-level dependencies
WORKDIR /build/docs
RUN npm ci --ignore-scripts

# Copy the rest of the docs/ directory (Docusaurus site content)
WORKDIR /build
COPY docs/ docs/

# Build the Docusaurus site with baseUrl="/docs/" so internal links
# include the /docs prefix expected by the reverse proxy.
ARG DOCS_BASE_URL="/docs/"
ENV DOCS_BASE_URL=${DOCS_BASE_URL}

WORKDIR /build
RUN npm run build:docs

# ---------------------------------------------------------------------------
# Serve stage — install serve in isolation for a clean copy
# ---------------------------------------------------------------------------
FROM node:22-slim AS serve-install

WORKDIR /srv
RUN npm init -y && npm install --omit=dev serve@14.2.4

# ---------------------------------------------------------------------------
# Runtime stage — serve the static build
# ---------------------------------------------------------------------------
FROM node:22-slim AS runtime

# Create non-root user matching the Kamiwaza convention (UID 65532)
RUN groupadd -g 65532 nonroot && \
    useradd -u 65532 -g 65532 -m -s /bin/false nonroot

WORKDIR /app

# Copy the built static site
COPY --from=builder --chown=65532:65532 /build/docs/build/ /app/build/

# Copy serve and its dependencies (clean install, no Docusaurus deps)
COPY --from=serve-install --chown=65532:65532 /srv/node_modules/ /app/node_modules/

USER nonroot

EXPOSE 3000

# Serve the static site in SPA mode on port 3000
# --no-clipboard prevents clipboard access errors in containers
CMD ["node", "node_modules/serve/build/main.js", "-s", "build", "-l", "3000", "--no-clipboard"]
