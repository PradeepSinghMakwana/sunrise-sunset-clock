# Sunrise Sunset Clock — Android home-screen widget

A native Android home-screen widget featuring:

- A live digital clock that follows the device's local time zone.
- Daily sunrise and sunset calculated from the device's approximate location.
- Approximate location permission only (`ACCESS_COARSE_LOCATION`).
- Offline solar-time calculation; no API key or external location service is required.

Built with ChatGPT, guided by the repository owner.

## Build a debug APK

1. Open the repository's **Actions** tab.
2. Select **Build Android APK** and run the workflow (or download the artifact from a completed run).
3. Download the `Sunrise-Sunset-Clock-debug` artifact.
4. Extract and install `app-debug.apk`.

You can also build locally with Java 17 and Gradle 8.9:

```bash
gradle :app:assembleDebug
```

## Setup

1. Open Sunrise Sunset Clock.
2. Allow approximate location when Android asks.
3. Keep the app open briefly while it obtains a location fix.
4. Add the Sunrise Sunset Clock widget from your launcher's Widgets screen.

Tap the widget to reopen setup.

## Privacy

The app requests approximate location only. It does not declare or request precise location permission. Coordinates are stored locally on the device and used for sunrise/sunset calculations.

## Solar times and time zones

Sunrise and sunset are calculated offline using a NOAA-style approximation. Results can differ slightly from published almanacs.

The widget displays solar times in the device's current time zone. The location coordinates determine the solar events; the device time zone determines how those events are displayed as local clock times. The Android 13 CI UI-test emulator uses the `America/Los_Angeles` time zone for its California test coordinates, configured before tests run. **Those CI test coordinates and times are test fixtures, not the user's live location or a guarantee of local accuracy.**

The widget refreshes periodically and when Android reports date, time, or time-zone changes.

## CommitGuard: repository-wide commit verification

CommitGuard is a repository-wide requirement for **all changes and commits**, not a release-only check. It applies to ordinary feature work, bug fixes, maintenance, pull requests, branch pushes, and releases. Before committing changes, run the repository guard from the project root:

```bash
bash scripts/commit-guard.sh
```

CommitGuard is intended to fail closed and checks:
- Shell scripts for syntax errors.
- Python scripts for parse errors and suspicious imported-module attribute references (including typo suggestions).
- The Python regression test suite, including CommitGuard's own tests.
- Gradle JVM unit tests (and fails if the Gradle command is unavailable).

The reference checker accepts valid Python submodule imports (for example, `from unittest import mock`) and tests a known typo case (`re.MULTIL`, suggesting `re.MULTILINE`). The general Android CI workflow runs for pushes to every branch and pull requests, and invokes CommitGuard as a required validation job. The release workflow also invokes the same guard; release validation is an additional use, not the scope of the policy.

### Mandatory intention and commit audit

Passing syntax checks and tests is not, by itself, permission to commit. **Every proposed commit must be checked against the user's stated task and acceptance criteria.** CommitGuard is required to perform (and fail closed on) all of the following before a commit is approved:

1. **Intention traceability:** Review every changed line and meaningful word, identifier, setting, resource name, test, workflow entry, and commit-message claim. Map each change to an explicit user requirement or a clearly explained necessary supporting fix. Flag unexplained or ambiguous changes; do not silently infer approval.
2. **Necessity and scope:** Establish why each change is required. Detect and block unrelated edits, scope creep, unnecessary refactoring, duplicate or dead code, and changes that do not contribute to an accepted requirement. If a change is optional, do not include it without approval.
3. **Reference correctness:** Verify that changed references resolve and are used in the right context. This includes imports and symbols, identifiers, resource IDs, filenames and paths, configuration keys, Gradle tasks, workflow/job/step references, test names, and links or other cross-file references. A reference merely existing is not enough; check that its target and usage match the intended meaning.
4. **Behavior and regression evidence:** Run the applicable regression, boundary, negative, static-analysis, build, and UI checks. Inspect failures and relevant generated screenshots/diagnostics. Never weaken or remove a test merely to obtain a passing result.
5. **Commit decision gate:** Produce an auditable report of requirement-to-change mapping, necessity, reference validation, tests, failures, and unresolved concerns. Automatically allow the commit when every required check passes and the complete diff is justified and auditable. Automatically block it when a mandatory check fails, a change is unjustified, or a material uncertainty remains.
6. **Post-commit verification:** Inspect the actual committed diff and commit message against the audit record, and verify that the committed content is the content that was checked. A changed or expanded diff requires a new audit.

**Current implementation:** the intention audit is implemented as a fail-closed, manifest-backed check. For each audited commit, it verifies the exact added and removed word-token occurrence counts (using Git's word-diff output), checks that every changed file has a necessity rationale and valid requirement references, checks that every reviewed word has a rationale and valid requirement reference, and verifies that the recorded commit subject matches the actual commit. The range mode validates commits individually, so later changes cannot hide earlier unaudited changes through a net-zero diff. Manifest-only follow-up commits are handled separately from the code commit they document.

These checks validate the completeness and internal consistency of the audit record; they do not independently establish the truth of a stated rationale or infer unstated requirements. The audit therefore requires explicit, task-grounded requirement and rationale entries. It must fail closed for missing, stale, mismatched, or unresolved records.

### Autonomous approval and exceptional human escalation

Human approval is **not a routine prerequisite** for every commit. CommitGuard's default operating model is autonomous:

- **Proceed automatically** when all required deterministic checks pass, every changed file and word occurrence is accounted for, necessity and requirement references are documented, applicable regression evidence is satisfactory, and no material uncertainty remains.
- **Block automatically** when a required check fails, evidence is missing, a reference cannot be verified, a change is unjustified or outside scope, or the audit is incomplete. A blocked commit is not approved merely because a person is unavailable.
- **Escalate to a human only when genuinely necessary**, such as when resolving ambiguous user intent, making a subjective product or safety decision, accepting exceptional risk, or obtaining authorization that automation cannot provide. Ask only for the specific decision that cannot be made safely or legitimately by automation.
- **Never fabricate or imply human approval.** Automated analysis, a generated manifest, a non-empty `reviewed_by` field, or a green CI result is not itself evidence that a human reviewed or approved the change. Record the actual reviewer accurately; identify automated checks as automated. Do not label an automated review as a human attestation.
- **Fail safely when escalation is indispensable.** If the required human decision or authorization cannot be obtained, stop that change and report what decision is needed. Do not silently bypass the gate.

The policy is to minimize human intervention, not to eliminate necessary oversight. Human review is reserved for decisions that cannot be resolved by the documented requirements and reliable automated checks. The current manifest-backed checker verifies audit-record completeness and consistency; it does not itself determine whether a rationale is truthful, decide subjective questions, or implement a general human-approval workflow. Its status messages and manifest fields must not be treated as proof of human approval.

The remaining validation boundaries must be stated precisely: the Python reference checker statically checks Python syntax and selected standard-library imports/attributes; it is not a comprehensive validator for Kotlin symbols, Android resources, Gradle configuration, workflow references, or every cross-file relationship. The shell guard also runs shell syntax checks, the Python regression suite, and JVM unit tests, failing if Gradle is unavailable. Do not describe these narrower checks as universal reference validation.

CommitGuard is also invoked in the Android CI and release workflows. GitHub API commits do not execute local Git hooks, so the per-commit CI range audit is essential. After a commit, the actual commit and its manifest record must be checked together; any changed content requires a fresh audit.

Direct commits made through GitHub's API do not execute a local pre-commit hook. Therefore, do not treat a local hook as the only enforcement: CI and repository branch-protection/required-check settings must enforce CommitGuard for ordinary development branches and pull requests as well as releases. API-based commits must also be audited before they are made.

## CI checks

Pull requests and pushes to `main` run independent checks:

- **Shell validation:** release-script syntax and script regression tests.
- **JVM unit tests:** solar calculations, location validation, and other app logic.
- **Detekt:** Kotlin static analysis.
- **Android lint:** Android-specific static checks.
- **Debug APK build:** assembles and uploads the `app-debug.apk` artifact.
- **Android 13 (API 33) UI tests:** runs instrumented tests on an emulator after JVM unit tests pass. The runner sets the test time zone to `America/Los_Angeles` and collects screenshots, UI hierarchy XML, app-widget dumps, and logcat diagnostics as artifacts.

The same Android 13 emulator UI test runs during release creation. The two published app screenshots are genuine captures of the running emulator UI, explicitly identified as emulator screenshots. They are not physical-device captures and do not prove behavior on every OEM launcher or physical device.

## Kotlin code-quality workflow

For Kotlin code changes, run Detekt before Android lint:

1. Run `gradle :app:detekt`.
2. Fix every finding without weakening rules, adding a baseline, or applying blanket suppressions.
3. Rerun Detekt until it passes.
4. Then run `gradle :app:lintDebug` and fix lint findings.

Keep Detekt and Android lint CI jobs independent so both report results even when one fails.

## Releases and screenshots

Tagged releases use the automated GitHub Actions pipeline. See [Release process](docs/RELEASE_PROCESS.md) for versioning, Gradle build instructions, dependency and permission audits, F-Droid metadata generation, source archives, and screenshot requirements. See [Emulator UI test diagnostics](docs/EMULATOR_DIAGNOSTICS.md) for investigation steps and the distinction between app permissions and test-only emulator access.

Every release requires two genuine Android 13 emulator UI screenshots:

- `01-app-setup.png` — the actual app setup screen.
- `02-home-screen-widget.png` — the actual launcher home screen with the widget and sunrise/sunset values visible.

The release workflow captures these from the emulator during the tagged run, checks their basic PNG structure, and publishes each PNG as a separate release asset. Their origin is documented as emulator captures, never as physical-device screenshots. Do not push a release tag until the Android 13 UI test and screenshot validation pass.

Push a tag matching the app's `versionName` (for example, `v2.0`) to start a release. The workflow publishes a GitHub Release with the APK, tagged source archive, screenshots, and audit reports. F-Droid publication still requires its official submission and maintainer review; generated metadata alone does not mean the app is published.

## Branch integration policy

`main` is the source of truth. Before integrating a feature branch, bring it up to date with `main`, resolve conflicts while preserving the intent of both changes, run applicable CI checks, review the diff, and merge only after verification. After each merge, use the updated `main` as the base for the next branch. Check live branch/PR status rather than relying on a dated queue snapshot.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
