#!/usr/bin/env bash
# Nova model setup script - pulls and pins Ollama model digests
# Usage: ./setup.sh [--from-manifest MANIFEST_FILE] [--verify-only]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REGISTRY_FILE="${SCRIPT_DIR}/model-registry.yaml"
OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"

usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
  --from-manifest FILE   Read digest from a manifest JSON file instead of pulling
  --verify-only          Only verify existing digests, don't pull
  --help                 Show this help

Environment:
  OLLAMA_HOST            Ollama API endpoint (default: http://localhost:11434)
EOF
}

FROM_MANIFEST=""
VERIFY_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --from-manifest)
            FROM_MANIFEST="$2"
            shift 2
            ;;
        --verify-only)
            VERIFY_ONLY=true
            shift
            ;;
        --help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

# Check if yq is available for YAML parsing
if ! command -v yq >/dev/null 2>&1; then
    echo "Error: yq is required but not installed" >&2
    echo "Install with: pip install yq" >&2
    exit 1
fi

# Check if jq is available for JSON parsing
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required but not installed" >&2
    exit 1
fi

verify_digest() {
    local model_name="$1"
    local expected_digest="$2"
    
    if [[ "$expected_digest" == "pending_pin" ]]; then
        echo "SKIP: $model_name has pending_pin status"
        return 0
    fi
    
    echo "Verifying $model_name..."
    local actual_digest
    actual_digest=$(curl -fsS -H "Accept: application/vnd.docker.distribution.manifest.v2+json" \
        "${OLLAMA_HOST}/v2/library/${model_name}/manifests/latest" 2>/dev/null | \
        jq -r '.config.digest // empty' | sed 's/^sha256://')
    
    if [[ -z "$actual_digest" ]]; then
        echo "WARN: Could not fetch digest for $model_name from registry"
        return 1
    fi
    
    # Compare first 12 chars (prefix from ollama.com tag pages)
    local expected_prefix="${expected_digest:0:12}"
    local actual_prefix="${actual_digest:0:12}"
    
    if [[ "$expected_prefix" == "$actual_prefix" ]]; then
        echo "OK: $model_name digest matches (${actual_prefix}...)"
        return 0
    else
        echo "FAIL: $model_name digest mismatch"
        echo "  Expected prefix: $expected_prefix"
        echo "  Actual prefix:   $actual_prefix"
        return 1
    fi
}

pull_model() {
    local model_name="$1"
    
    echo "Pulling $model_name from Ollama..."
    if ollama pull "$model_name"; then
        echo "Pulled $model_name successfully"
        return 0
    else
        echo "Failed to pull $model_name" >&2
        return 1
    fi
}

main() {
    if [[ ! -f "$REGISTRY_FILE" ]]; then
        echo "Error: Registry file not found: $REGISTRY_FILE" >&2
        exit 1
    fi
    
    # Extract model names from registry
    local models
    models=$(yq eval '.models[].id' "$REGISTRY_FILE" 2>/dev/null || echo "")
    
    if [[ -z "$models" ]]; then
        echo "No models found in registry"
        exit 0
    fi
    
    local failed=0
    
    while IFS= read -r model; do
        if [[ -z "$model" ]]; then
            continue
        fi
        
        # Get digest from registry
        local digest
        digest=$(yq eval ".models[] | select(.id == \"$model\") | .digest" "$REGISTRY_FILE" 2>/dev/null || echo "")
        
        if [[ -n "$FROM_MANIFEST" ]]; then
            # Read digest from manifest file
            local manifest_digest
            manifest_digest=$(jq -r ".[] | select(.name == \"$model\") | .digest" "$FROM_MANIFEST" 2>/dev/null || echo "")
            if [[ -n "$manifest_digest" && "$manifest_digest" != "null" ]]; then
                digest="$manifest_digest"
            fi
        fi
        
        if [[ "$VERIFY_ONLY" == "true" ]]; then
            verify_digest "$model" "$digest" || failed=1
        else
            # Pull the model first
            pull_model "$model" || failed=1
            # Then verify
            verify_digest "$model" "$digest" || failed=1
        fi
    done <<< "$models"
    
    if [[ $failed -gt 0 ]]; then
        echo "Some verifications failed" >&2
        exit 1
    fi
    
    echo "All models verified successfully"
}

main "$@"