#!/bin/bash
# Run SonarCloud analysis locally using Docker
# Usage: ./scripts/run-sonar-local.sh [--dry-run]
#
# Prerequisites:
#   1. Set SONAR_TOKEN environment variable with your SonarCloud token
#   2. Run tests with coverage first: CI=true npm test -- --coverage --watchAll=false
#
# For dry-run (analysis without upload):
#   ./scripts/run-sonar-local.sh --dry-run

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Check for coverage report
if [ ! -f "coverage/lcov.info" ]; then
  echo "Error: Coverage report not found at coverage/lcov.info"
  echo "Run tests with coverage first:"
  echo "  CI=true npm test -- --coverage --watchAll=false"
  exit 1
fi

# Parse arguments
DRY_RUN=false
for arg in "$@"; do
  case $arg in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
  esac
done

if [ "$DRY_RUN" = true ]; then
  echo "Running SonarCloud analysis in dry-run mode (local analysis only)..."
  docker run --rm \
    -v "${PROJECT_DIR}:/usr/src" \
    -w /usr/src \
    sonarsource/sonar-scanner-cli \
    -Dsonar.qualitygate.wait=false \
    -Dsonar.scanner.dumpToFile=/dev/stdout
else
  # Check for SONAR_TOKEN
  if [ -z "$SONAR_TOKEN" ]; then
    echo "Error: SONAR_TOKEN environment variable is not set"
    echo "Get your token from: https://sonarcloud.io/account/security"
    echo ""
    echo "For dry-run (local analysis only): ./scripts/run-sonar-local.sh --dry-run"
    exit 1
  fi

  echo "Running SonarCloud analysis and uploading results..."
  docker run --rm \
    -e SONAR_TOKEN="${SONAR_TOKEN}" \
    -v "${PROJECT_DIR}:/usr/src" \
    -w /usr/src \
    sonarsource/sonar-scanner-cli
fi

echo ""
echo "SonarCloud analysis complete!"
