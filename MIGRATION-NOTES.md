# Node.js CommitGuard migration

## Uploaded migration files
- `scripts/commit-guard.sh`: local Node/Bash-only gate.
- `scripts/commit-intent-audit.js`: staged, HEAD, and commit-range intent audit with occurrence-level token checks.
- `scripts/privacy-guard.js`: privacy/network/no-backup checks plus XML validation.
- `scripts/commit-guard.test.js`: CommitGuard regression tests.
- `scripts/avd-profile-validation.js`: exact AVD profile availability preflight.
- `scripts/validate-release-screenshots.js`: screenshot validation and duplicate detection.
- `scripts/semver-release-validation.sh`: release tag/version check (not yet wired as a mandatory release step).
- `scripts/run-android-ui-tests.sh`: emulator UI runner copy (not yet wired into build CI).
- `scripts/android-ui-runner.test.js`: UI runner regression tests.
- `scripts/release-validation.test.js`: Node validation regressions.

## Local use
From the repository root, run:
```bash
bash scripts/commit-guard.sh
```
The local gate uses Git, Bash, and Node.js only. It runs whitespace checks, staged/unstaged overlap checks, the intention and occurrence audit, privacy guard, shell and JavaScript syntax checks, and Node regression tests. It does not run Python or Gradle.

## CI integration on this branch
- `.github/workflows/build-apk.yml` includes an independent Node-only regression job.
- `.github/workflows/release.yml` runs JavaScript/Bash syntax checks, Node tests, and the privacy guard.
- Release emulator profile is changed to **Nexus 5X**, with Node preflight before launch.
- Release screenshot files are validated with the Node screenshot validator after capture.
- Android JVM tests, Detekt, Android lint, APK build, and instrumented tests remain separate CI responsibilities.

## Still pending
- The Python helpers and their tests have not yet been removed from the repository.
- The Node AVD/screenshot helpers have been wired into the release workflow, but no CI run has been observed on this branch.
- The SemVer script is uploaded but not enforced in release workflow yet.
- The emulator UI runner script is uploaded but is not connected to build workflow.
- Uploaded files have not yet been executed as a complete set in a checkout of this branch. The earlier **55 passed** result refers to the isolated local package only, not this branch's uploaded source.

Do not merge this branch or call the migration verified until branch CI passes and the remaining items above are addressed or explicitly accepted.