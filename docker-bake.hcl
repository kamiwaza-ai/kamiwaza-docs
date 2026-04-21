// ============================================================================
// Kamiwaza Docs — Container Build System (HCL)
//
// Single-image build for the Docusaurus static site container.
// Follows the three-target pattern from the kamiwaza repo:
//   docs target    → CI builds (multi-arch, metadata-action overlay)
//   local-docs     → local dev builds (push to Kind registry + load to Docker)
//   validate-docs  → Dockerfile lint (docker buildx bake --call check)
//
// Local builds:  docker buildx bake -f docker-bake.hcl local-docs
//   → host.docker.internal:5001/kamiwaza-docs:local-dev
// Inspect:       docker buildx bake -f docker-bake.hcl --print
// Validate:      docker buildx bake -f docker-bake.hcl validate-docs
// ============================================================================


// ── Variables ───────────────────────────────────────────────────────────────

variable "CONTAINER_REGISTRY" {
  default = "host.docker.internal:5001"
}

// CI sets this to "kamiwaza-ai" so images land at ghcr.io/kamiwaza-ai/kamiwaza-docs.
// Local builds don't use a prefix — the image name is the full repository path.
variable "IMAGE_NAME" {
  default = "kamiwaza-docs"
}

// Docs version. Populated automatically:
//   - Local builds: Makefile reads package.json and exports it
//   - CI builds:    the container-build action can set it
variable "DOCS_VERSION" {
  default = ""
}

// CI sets ATTEST=1 to enable provenance and SBOM attestations.
variable "ATTEST" {
  default = ""
}


// ============================================================================
// Manifest Annotations Helper
// ============================================================================

function "manifest_annotations" {
  params = [title, description, version]
  result = [
    "manifest:org.opencontainers.image.title=${title}",
    "manifest:org.opencontainers.image.description=${description}",
    "manifest:org.opencontainers.image.version=${version}",
    "manifest:org.opencontainers.image.authors=Kamiwaza AI <support@kamiwaza.ai>",
    "manifest:org.opencontainers.image.vendor=Kamiwaza AI",
    "manifest:org.opencontainers.image.licenses=Kamiwaza EULA <https://www.kamiwaza.ai/eula-license>",
    "manifest:org.opencontainers.image.url=https://www.kamiwaza.ai/",
    "manifest:org.opencontainers.image.documentation=https://docs.kamiwaza.ai/",
  ]
}


// ============================================================================
// Base Targets
// ============================================================================

// Empty target for GitHub metadata-action inheritance
target "docker-metadata-action" {}

target "_common" {
  inherits = ["docker-metadata-action"]
  platforms = [
    "linux/amd64",
    "linux/arm64",
  ]
  labels = {
    "org.opencontainers.image.version"       = DOCS_VERSION
    "org.opencontainers.image.authors"       = "Kamiwaza AI <support@kamiwaza.ai>"
    "org.opencontainers.image.vendor"        = "Kamiwaza AI"
    "org.opencontainers.image.licenses"      = "Kamiwaza EULA <https://www.kamiwaza.ai/eula-license>"
    "org.opencontainers.image.url"           = "https://www.kamiwaza.ai/"
    "org.opencontainers.image.documentation" = "https://docs.kamiwaza.ai/"
  }
  attest = equal("1", ATTEST) ? [
    "type=provenance,mode=max",
    "type=sbom"
  ] : []
}


// ============================================================================
// Docs Target
// ============================================================================

target "docs" {
  inherits   = ["_common"]
  context    = "."
  dockerfile = "Dockerfile"
  labels = {
    "org.opencontainers.image.title"       = "Kamiwaza Docs"
    "org.opencontainers.image.description" = "Kamiwaza Docusaurus documentation site for air-gapped deployments."
  }
  annotations = manifest_annotations("Kamiwaza Docs", "Kamiwaza Docusaurus documentation site for air-gapped deployments.", DOCS_VERSION)
  cache-from  = ["type=registry,ref=${CONTAINER_REGISTRY}/${IMAGE_NAME}:buildcache"]
  cache-to    = ["type=registry,ref=${CONTAINER_REGISTRY}/${IMAGE_NAME}:buildcache,mode=max"]
}

target "local-docs" {
  inherits  = ["docs"]
  tags      = notequal("", DOCS_VERSION) ? [
    "${CONTAINER_REGISTRY}/${IMAGE_NAME}:local-dev",
    "${CONTAINER_REGISTRY}/${IMAGE_NAME}:${DOCS_VERSION}",
  ] : ["${CONTAINER_REGISTRY}/${IMAGE_NAME}:local-dev"]
  output    = ["type=image,push=true"]
  platforms = []
}

target "validate-docs" {
  inherits = ["docs"]
  call     = "check"
}


// ============================================================================
// Groups
// ============================================================================

group "all" {
  targets = ["docs"]
}

group "default" {
  targets = ["local-docs"]
}
