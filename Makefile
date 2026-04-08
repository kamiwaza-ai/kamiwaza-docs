# Makefile — Kamiwaza Docs container build
#
# Build and push the Docusaurus static site container to the local Kind
# registry for development, or to GHCR for CI/release.
#
# Quick Reference:
#   make container-build         # Build + push to local Kind registry
#   make container-build-local   # Alias for container-build
#   make container-run           # Run locally on port 3000 (no K8s)
#   make container-clean         # Remove local images

# ==============================================================================
# Configuration
# ==============================================================================

CONTAINER_REGISTRY ?= host.docker.internal:5001
IMAGE_NAME ?= kamiwaza-docs
CONTAINER_TAG ?= local-dev

# Full image reference
IMAGE_REF := $(CONTAINER_REGISTRY)/$(IMAGE_NAME):$(CONTAINER_TAG)

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
	@echo "$(YELLOW)Building docs container...$(NC)"
	@echo "$(CYAN)Registry: $(CONTAINER_REGISTRY) | Tag: $(CONTAINER_TAG)$(NC)"
	docker build -t $(IMAGE_REF) .
	docker push $(IMAGE_REF)
	@echo "$(GREEN)Docs container built and pushed: $(IMAGE_REF)$(NC)"

.PHONY: container-build-local
container-build-local: container-build ## Alias for container-build

.PHONY: container-run
container-run: ## Build and run locally on port 3000 (no K8s needed)
	@echo "$(YELLOW)Building docs container for local run...$(NC)"
	docker build -t $(IMAGE_NAME):local .
	@echo "$(GREEN)Starting docs on http://localhost:3000$(NC)"
	docker run --rm -p 3000:3000 $(IMAGE_NAME):local

# ==============================================================================
# Docusaurus Development
# ==============================================================================

.PHONY: dev
dev: ## Start Docusaurus dev server (requires npm install first)
	npm run start

.PHONY: build
build: ## Build Docusaurus static site locally
	npm run build

.PHONY: install
install: ## Install dependencies
	npm ci
	cd docs && npm ci

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
