# Sunrise Sunset Clock — Android home-screen widget

A native Android widget featuring:
- A live digital clock using the device's local time zone.
- Daily sunrise and sunset calculated for the device's approximate location.
- Approximate location permission only (`ACCESS_COARSE_LOCATION`).
- Offline solar-time calculation; no API key or external location service required by the app.

Built with ChatGPT, guided by the repository owner.

## Build with GitHub Actions
1. Open the repository's **Actions** tab.
2. Select **Build Android APK** and run the workflow.
3. Download the `Sunrise-Sunset-Clock-debug` artifact.
4. Extract and install `app-debug.apk`.

## Kotlin code-quality workflow

For every Kotlin code change, **fix Detekt before working on Android lint**:

1. Run `gradle :app:detekt`.
2. Resolve every Detekt finding in the source; do not hide findings by weakening rules, adding a baseline, or applying blanket suppressions.
3. Rerun Detekt and repeat until it passes.
4. Only then run `gradle :app:lintDebug` and resolve any lint findings.

This is the required order for fixing code-quality issues. Keep the Detekt and Android lint CI jobs independent so both checks still run and report their results even when one fails.

## Setup
1. Open Sunrise Sunset Clock.
2. Allow approximate location when Android asks.
3. Keep the app open briefly while it obtains a location fix.
4. Add the Sunrise Sunset Clock widget from your launcher's Widgets screen.

Tap the widget to reopen setup.

## First-run cartoon guide

Meet the mouse guide: its tail points out where to tap as it narrates the first-run experience and explains how to find, place, and use the home-screen widget.

![Mouse-guided Sunrise Sunset Clock onboarding storyboard](docs/images/onboarding-mouse.jpg)

**Design concept:** this storyboard is an onboarding UX proposal, not a screenshot of the current application. The final in-app narration, pointer/tail animation, highlighted touch targets, and illustrated screens must be aligned with the implemented UI before being presented as an interactive tutorial. The privacy explanation must remain prominent and accurate.

## Privacy
The app requests approximate location only. It does not declare or request precise location permission. Coordinates are stored locally on the device and used for the sunrise/sunset calculation.

## Notes
Sunrise and sunset use a NOAA-style approximation and may differ slightly from published almanacs. The clock follows the device's current time zone. The widget refreshes periodically and when Android reports date, time, or time-zone changes.

## Engineering effort and automation ROI

**Assessment snapshot: 16 November 2026.** The emulator screenshot automation and its diagnostics required a concentrated troubleshooting effort. The relevant work spanned approximately 3 hours 11 minutes of elapsed clock time (about 04:25–07:36 UTC). This is a wall-clock window across multiple work and CI events, **not a measured timesheet or 3 hours 11 minutes of continuous hands-on work**.

The troubleshooting included approximately 14 technical commits focused on emulator tests, launcher-widget screenshot capture, CI behaviour, and diagnostics. Several manual emulator workflow attempts failed or were cancelled while the tests were being developed. Ordinary push builds were configured to skip the emulator tests; emulator testing is reserved for pull requests and manual workflow runs.

### Cost assumptions

- No paid cloud VM or physical test device was used for the GitHub Actions emulator runs described in this assessment.
- GitHub Actions usage for this public repository was treated as **₹0 direct runner cost**, assuming standard public-repository hosted-runner eligibility and no separately billed services.
- Mobile data usage and any other indirect costs were not measured.
- Labour has no recorded cash payment. For opportunity-cost illustration only, valuing the 3.18-hour elapsed window at ₹300, ₹500, or ₹1,000 per hour gives approximately ₹955, ₹1,590, or ₹3,180 respectively. These are hypothetical valuations, not actual expenditure.

### Expected return

The intended return is repeatable, automated evidence that the app setup screen and the real home-screen widget render correctly, reducing manual release checks and helping catch regressions.

If the automation eventually saves 15–30 minutes per release, it would recover an estimated 3.18-hour effort after roughly 7–13 releases. This is a planning scenario, not a measured saving. The calculation excludes the additional value of catching defects before release.

**Acceptance status at this assessment:** the required genuine app-setup and launcher-widget screenshots had not yet both been successfully captured and visually verified. Therefore, the automation's delivery ROI was not yet demonstrated. Do not treat the estimated future savings as realised benefits. Update this section when the screenshot tests pass reliably and actual CI usage or time savings can be measured.

## License

This project is licensed under the MIT License.
See the [LICENSE](LICENSE) file for details.

## Releases

Tagged releases use the automated GitHub Actions pipeline. See [Release process](docs/RELEASE_PROCESS.md) for versioning, Gradle build instructions, dependency and permission audits, F-Droid metadata generation, source archives, and store screenshot requirements. See [Emulator UI test diagnostics](docs/EMULATOR_DIAGNOSTICS.md) for failure investigation, CI evidence, and the distinction between app permissions and test-only emulator access.

Push a tag matching the app's `versionName` (for example, `v2.1`) to start a release. The workflow publishes a GitHub Release with the APK, tagged source archive, and audit reports.

## Shared branch and release-branch policy

`main` and `develop` are both long-lived shared development branches and must contain the same shared commits. Shared application code, product requirements, and documentation are committed once and kept in the history of both branches through normal forward integration. Do not maintain separate copies of shared changes or let the two branches become independent development lines.

Use `main` as the stable integration baseline and keep `develop` synchronized with it; when shared work is accepted on either branch, integrate it so the corresponding shared commit is present in both histories. Synchronize by ordinary merge or fast-forward operations only. Never force-push, rewrite published history, or discard commits to make the branches appear aligned.

The distribution branches, `release/fdroid` and `release/playstore`, are for distribution-specific configuration and changes only. They must receive shared changes from the common development history, while retaining their respective F-Droid and Google Play differences. Do not independently reimplement shared requirements on the release branches.

## Branch synchronization and integration policy

**`main` and `develop` are a synchronized pair, not separate development lines.** They must contain the same shared commits and have identical tree contents after every integration. `main` is the stable integration baseline; `develop` is its synchronized counterpart. Do not merge unrelated work independently into only one of these branches.

### Required workflow for every feature branch

1. **Start from current `main`.** Feature branches are short-lived workspaces. Before substantial work or integration, bring the feature branch up to date with `main` using an ordinary merge.
2. **Preserve both sides.** Resolve conflicts by understanding the intent of each change. Never blindly choose one side or discard working behaviour merely to silence a conflict.
3. **Run independent CI checks.** Keep unit tests, Detekt, Android lint, APK build, and any applicable emulator tests as independent jobs so one failure does not hide unrelated results. Fix real failures; do not weaken assertions, disable checks, or add blanket suppressions.
4. **Verify before integration.** Review the complete diff, confirm intended behaviour and relevant tests, and require applicable CI checks to pass.
5. **Integrate with a merge commit.** Merge the verified feature branch into `main` using a normal merge commit so the original commit history remains visible. Do not squash a multi-commit feature merely for convenience. Squash only when the source branch genuinely contains disposable, redundant history and that choice is explicitly justified.
6. **Synchronize `develop`.** After `main` advances, fast-forward `develop` to the exact same commit. If `develop` ever contains a legitimate shared commit absent from `main`, integrate it into `main` with a normal merge first, then synchronize both refs.
7. **Verify both shared branches.** Confirm `main` and `develop` have identical commit heads and tree contents, and verify checks on the resulting commit.

Keep feature branches short-lived and synchronize them frequently. Reconcile branches touching the same files early. Distribution branches `release/fdroid` and `release/playstore` retain only their necessary distribution-specific differences while receiving shared changes through reviewed, history-preserving merges. Do not force-push, rewrite published history, delete branches containing unmerged work, or merge unverified changes.

### Integration queue snapshot — 17 November 2026

The counts below compare each named branch with `main` at the time this section was written. They are a snapshot, not a substitute for checking the live branch state before each merge.

| Branch / PR | Difference from `main` | Known work / action |
|---|---:|---|
| `feature/emulator-ci-isolation` (#8) | 54 ahead, 0 behind | Contains the MVVM/Compose location-setup refactor and emulator screenshot automation. Detekt had a maximum-line-length failure; emulator CI stopped because the emulator remained locked. Fix both and rerun the independent checks before integration. |
| `feature/unit-tests` (#10) | 55 ahead, 0 behind | Contains JVM solar-calculation tests and four independent CI jobs. It does not yet contain the MVVM location-setup refactor. Keep emulator UI testing out of this branch's CI. Reconcile the MVVM implementation with this branch before it is integrated so `main` does not regress. |
| `docs/solar-calculation-acceptance` (#9) | 2 ahead, 0 behind | Documentation-only changes. Review the documentation diff and resolve its reported CI failure before integration. |
| `feature/widget-runtime-fix` (#6) | 1 ahead, 44 behind | Diverged substantially. Do not merge as-is. First merge current `main` into this branch, resolve conflicts while preserving the widget-runtime fix, and run its relevant checks. |
| `feature/solar-ui-test-parity` (no open PR at snapshot) | 11 ahead, 0 behind | Review the branch's UI-test changes, bring it up to date with `main`, run the relevant checks, and open or update a PR before integration. |

**Important:** The queue is not a statement that any branch is already approved to merge. The current PR head, live comparison, conflict state, and latest CI results must be rechecked immediately before every integration. Merge one verified branch at a time, then use the resulting `main` as the base for the next branch.

## Review backlog

- [#2 — Debug build JVM target mismatch](https://github.com/PradeepSinghMakwana/sunrise-sunset-clock/issues/2)
- [#26 — Android 13 screenshot hierarchy timeout](https://github.com/PradeepSinghMakwana/sunrise-sunset-clock/issues/26)
- [#27 — Widget and solar-behavior regression coverage](https://github.com/PradeepSinghMakwana/sunrise-sunset-clock/issues/27)
- [#28 — Emulator CI reliability and diagnostics](https://github.com/PradeepSinghMakwana/sunrise-sunset-clock/issues/28)
- [#30 — Branch review and reconciliation](https://github.com/PradeepSinghMakwana/sunrise-sunset-clock/issues/30)
