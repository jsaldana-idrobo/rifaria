#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --show-toplevel >/dev/null 2>&1; then
  echo "Skipping git hooks setup: current directory is not inside a git repository."
  exit 0
fi

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push scripts/git-pre-commit.sh scripts/git-pre-push.sh

echo "Git hooks configured with core.hooksPath=.githooks"
