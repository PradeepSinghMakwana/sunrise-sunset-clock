# Node.js local CommitGuard migration package

This package contains tested local replacements. It is dependency-free and uses built-in Node.js modules only.

## Package files
- scripts/commit-guard.sh — fail-closed local gate; requires Git, Bash, Node.js only.
- scripts/commit-intent-audit.js — staged/head/range intent audit and occurrence checks.
- scripts/privacy-guard.js — privacy/network/no-backup checks with dependency-free XML validation.
- scripts/commit-guard.test.js — CommitGuard regression tests.
- scripts/avd-profile-validation.js — AVD profile preflight.
- scripts/validate-release-screenshots.js — PNG validation and distinct screenshot hashes.
- scripts/release-validation.test.js — AVD, screenshots, and SemVer regression tests.
- scripts/android-ui-runner.test.js — emulator runner regression tests with stubbed adb/Gradle.

## Local usage
Run from repository root:
```sh
bash scripts/commit-guard.sh
```

The guard checks whitespace, staged/unstaged overlap, intent and word occurrence audit, privacy checks, shell/JS syntax, and Node tests.

## CI migration notes
1. Replace Python AVD validation with `node scripts/avd-profile-validation.js 'Nexus 5X'` in build and release workflows.
2. Replace Python validation with:
```yaml
- name: Validate JavaScript syntax
  run: for file in scripts/*.js; do node --check "$file"; done
- name: Run Node regression tests
  run: node --test scripts/*.test.js
- name: Verify app privacy boundary
  run: node scripts/privacy-guard.js
```
3. Replace inline Python screenshot validation with `node scripts/validate-release-screenshots.js`.
4. Keep JVM unit tests explicitly in CI (not local guard):
```yaml
- name: Run JVM unit tests (CI-only)
  run: gradle :app:testDebugUnitTest
```
5. Remove old Python helpers/tests only after all workflow references are migrated.
6. Update README to distinguish Node/Bash local checks from Kotlin/Android build, lint, JVM, and emulator checks.

## Verification status
The package's tests passed in an isolated workspace: 55 passed, 0 failed; Bash syntax and Node syntax checks passed. This is not an actual repository checkout; repository workflow/README integration, full guard execution on the repo, and CI verification remain pending.