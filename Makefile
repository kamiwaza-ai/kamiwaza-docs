# Makefile — Kamiwaza Docs container build
#
# Build and push the Docusaurus static site container to the local Kind
# registry for development, or to GHCR for CI/release.
#
# Quick Reference:
#   make container-build         # Build + push to local Kind registry (bake)
#   make container-build-local   # Alias for container-build
#   make container-validate      # Lint Dockerfile (bake --call check)
#   make container-clean         # Remove local images

# ==============================================================================
# Configuration
# ==============================================================================

CONTAINER_REGISTRY ?= host.docker.internal:5001
IMAGE_NAME ?= kamiwaza-docs

# Read version from package.json for image tagging
DOCS_VERSION := $(shell node -p "require('./package.json').version" 2>/dev/null)

# Colors
YELLOW := \033[1;33m
GREEN := \033[1;32m
CYAN := \033[1;36m
RED := \033[1;31m
NC := \033[0m

# ==============================================================================
# Container Build Targets
# ==============================================================================

.PHONY: container-build
container-build: ## Build docs container and push to local Kind registry
	@echo "$(YELLOW)Building docs container via docker bake...$(NC)"
	@echo "$(CYAN)Registry: $(CONTAINER_REGISTRY) | Version: $(DOCS_VERSION)$(NC)"
	CONTAINER_REGISTRY=$(CONTAINER_REGISTRY) IMAGE_NAME=$(IMAGE_NAME) DOCS_VERSION=$(DOCS_VERSION) \
		docker buildx bake -f docker-bake.hcl local-docs
	@echo "$(GREEN)Docs container built and pushed to $(CONTAINER_REGISTRY)/$(IMAGE_NAME):local-dev$(NC)"

.PHONY: container-build-local
container-build-local: container-build ## Alias for container-build

.PHONY: container-validate
container-validate: ## Lint Dockerfile via bake check
	docker buildx bake -f docker-bake.hcl validate-docs

# ==============================================================================
# Cleanup
# ==============================================================================

.PHONY: container-clean
container-clean: ## Remove local docs container images
	@echo "$(YELLOW)Removing docs container images...$(NC)"
	@docker images --format "{{.Repository}}:{{.Tag}}" | \
		grep "$(IMAGE_NAME)" | \
		xargs -r docker rmi -f 2>/dev/null || true
	@echo "$(GREEN)Docs images removed$(NC)"

# ==============================================================================
# Help
# ==============================================================================

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-25s$(NC) %s\n", $$1, $$2}'
