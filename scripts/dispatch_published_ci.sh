#!/usr/bin/env bash
# GITHUB_TOKEN pushes do not emit another push workflow; dispatch CI explicitly.
set -euo pipefail
if [[ "${QUEUE_DRY_RUN:-false}" == true ]]; then
    echo 'Dry run; CI dispatch skipped.'
    exit 0
fi
: "${GITHUB_REPOSITORY:?}" "${GITHUB_SHA:?}"
main_sha=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')
[[ "$main_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid main SHA.' >&2; exit 1; }
if [[ "$main_sha" == "$GITHUB_SHA" ]]; then
    echo 'Main did not advance; CI dispatch skipped.'
    exit 0
fi
gh workflow run ci.yml --repo "$GITHUB_REPOSITORY" --ref main
echo "CI requested for main at $main_sha."
