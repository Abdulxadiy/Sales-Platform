#!/usr/bin/env bash
# A late older CI run must never replace a newer main deployment.
set -euo pipefail
: "${GITHUB_REPOSITORY:?}" "${GITHUB_OUTPUT:?}" "${RELEASE_SHA:?}"
[[ "$RELEASE_SHA" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid release SHA.' >&2; exit 1; }
main_sha=$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')
[[ "$main_sha" =~ ^[a-f0-9]{40}$ ]] || { echo 'Invalid main SHA.' >&2; exit 1; }
if [[ "$main_sha" == "$RELEASE_SHA" ]]; then
    echo 'current=true' >> "$GITHUB_OUTPUT"
else
    echo 'current=false' >> "$GITHUB_OUTPUT"
    echo '::notice::Main advanced after this CI run; skipping the superseded deployment.'
fi
