#!/usr/bin/env bash
# Mandatory local validation gate; Node.js replaces Python and Gradle test dependencies.
set -Eeuo pipefail
IFS=$'\n\t'
ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
cd "$ROOT"
fail(){ printf '[CommitGuard] ERROR: %s\n' "$*" >&2; exit 1; }
command -v git >/dev/null 2>&1 || fail 'git is required'
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || fail 'run inside a Git work tree'
command -v node >/dev/null 2>&1 || fail 'Node.js is required (no Python or Gradle needed)'
node --version >/dev/null || fail 'Node.js runtime check failed'
command -v bash >/dev/null 2>&1 || fail 'bash is required'

echo '[CommitGuard] Git patch-integrity checks'
git diff --check || fail 'unstaged patch contains whitespace errors'
git diff --cached --check || fail 'staged patch contains whitespace errors'
git show --check --oneline HEAD >/dev/null || fail 'HEAD commit contains whitespace errors'
staged_paths="$(git diff --cached --name-only)"
unstaged_paths="$(git diff --name-only)"
while IFS= read -r staged_file; do
  [[ -n "$staged_file" ]] || continue
  if grep -Fxq -- "$staged_file" <<< "$unstaged_paths"; then
    fail "file has both staged and unstaged edits; resolve before committing: $staged_file"
  fi
done <<< "$staged_paths"

echo '[CommitGuard] Intention/necessity and word-occurrence audit'
if [[ -n "${COMMITGUARD_BASE_SHA:-}" && -n "${COMMITGUARD_HEAD_SHA:-}" ]]; then
  base="$COMMITGUARD_BASE_SHA" head="$COMMITGUARD_HEAD_SHA"
  if [[ "$base" =~ ^0+$ ]]; then
    default_branch="${COMMITGUARD_DEFAULT_BRANCH:-}"
    [[ -n "$default_branch" ]] || fail 'default branch required for new-branch audit'
    git show-ref --verify --quiet "refs/remotes/origin/$default_branch" || fail 'default branch history unavailable'
    base="$(git merge-base "$head" "origin/$default_branch")" || fail 'cannot determine merge-base'
  fi
  node scripts/commit-intent-audit.js --range "$base" "$head" || fail 'commit range intention audit failed'
elif git diff --cached --quiet; then
  fail 'no staged changes; local pre-commit guard refuses an empty commit'
else
  node scripts/commit-intent-audit.js --staged || fail 'staged intention audit failed'
fi

echo '[CommitGuard] Privacy boundary checks'
node scripts/privacy-guard.js || fail 'privacy boundary validation failed'

echo '[CommitGuard] Shell syntax checks'
shopt -s nullglob
shell_files=(scripts/*.sh)
(("${#shell_files[@]}" > 0)) || fail 'no shell scripts found under scripts/'
bash -n "${shell_files[@]}" || fail 'shell syntax validation failed'

echo '[CommitGuard] Node syntax checks'
js_files=(scripts/*.js)
(("${#js_files[@]}" > 0)) || fail 'no JavaScript scripts found under scripts/'
for file in "${js_files[@]}"; do node --check "$file" || fail "JavaScript syntax error: $file"; done

echo '[CommitGuard] Node.js regression tests (built-in node:test)'
node --test scripts/*.test.js || fail 'Node.js regression tests failed'

echo '[CommitGuard] PASS — local checks complete (Android build/tests remain CI checks)'
