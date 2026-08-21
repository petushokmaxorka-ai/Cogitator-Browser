#!/usr/bin/env bash
# COGITATOR BROWSER — repo-root launcher wrapper (path-independent)
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/resources/launch-cogitator.sh" "$@"
