# Privacy Policy

**App:** Sunrise Sunset Clock  
**Package:** `com.sunrisesunset.clock`  
**Last updated:** 22 November 2026

This policy explains what Sunrise Sunset Clock currently accesses, where information is kept, and how optional diagnostic reports are intended to work. It distinguishes current app behavior from safeguards required before any future bug-report submission feature is released.

## 1. Information the app uses

### Approximate location

When you choose **Use approximate location** and grant Android's approximate-location permission, the app asks Android's location services for an approximate location. It can use an available cached network/passive location or request a network location fix while setup is open.

The app uses the latitude and longitude to calculate sunrise and sunset locally. It saves those coordinates in the app's private preferences so the home-screen widget can update without asking for location on every refresh.

- The app declares `ACCESS_COARSE_LOCATION` only; it does not request precise (`ACCESS_FINE_LOCATION`) or background location.
- The app does not need internet access or a remote solar-time service for these calculations.
- Coordinates are not currently sent by this app to the developer or an app-operated server.
- Android and the device's configured location providers may process location information under their own system and provider privacy terms.

You can deny location permission or revoke it later in Android Settings. If you deny it, location-dependent sunrise/sunset values cannot be calculated for your area. The app's saved coordinates remain in app-private storage until app data is cleared or the app is uninstalled; clearing app data removes them.

### Basic device and app information

The current app does not operate an analytics or advertising SDK, create a user account, or send device identifiers, usage analytics, or telemetry to an app-operated service. Android itself and the app store may collect information under their own policies; that collection is outside this app's control.

## 2. Bug reports, crashes, and diagnostics

### Current behavior

**The currently implemented app does not silently capture or automatically upload bug reports, crash logs, screenshots, or device information from a user's phone.** There is no in-app automatic crash-reporting or telemetry upload service in the current implementation.

The development team does investigate bugs using reports and diagnostic evidence. At present, user-provided reports or files must be deliberately shared by the user through a channel made available by the project; installing or using the app does not itself authorize collection.

### Safeguards for any future in-app report feature

If an in-app bug-reporting feature is introduced, it must be designed to be voluntary and transparent:

1. **User initiated:** no covert, continuous, or background capture of bug reports. A report is prepared only after the user chooses to report a problem, unless a separately disclosed and explicitly enabled crash-reporting option is later provided.
2. **Explain before sharing:** show the report contents and explain the destination and purpose before submission.
3. **Review and control:** let the user inspect the report and cancel it. Provide a practical way to remove optional screenshots, logs, free-text notes, and other attachments before sharing.
4. **Data minimization:** include only information needed to reproduce and diagnose the reported issue, such as app version, Android version, device manufacturer/model, relevant error/stack trace, and narrowly scoped diagnostic logs. Do not include advertising IDs, contacts, microphone or camera recordings, or unrelated files.
5. **Location protection:** logs, screenshots, and user descriptions can accidentally reveal location, addresses, account names, notifications, or other personal information. Redact sensitive values where feasible, warn the user about remaining content, and do not attach precise coordinates by default. Ask separately and explain why if location detail is genuinely needed.
6. **Explicit submission:** transmit a report only after the user confirms submission. If no secure submission destination is available, offer a user-controlled share/export action instead; do not silently upload it.
7. **Purpose limitation:** use submitted reports only to investigate, reproduce, fix, verify, and prevent app defects, and to communicate with the reporter when they have supplied contact details for that purpose. Do not use reports for advertising or unrelated profiling.
8. **Access and retention:** restrict access to people working on the issue, protect reports against public exposure, and delete or de-identify them when no longer reasonably needed for debugging, security, or the associated support discussion. A future feature must publish a specific retention period and contact route before release.

These are release requirements for a future reporting feature, not a claim that the current app already performs those collection or upload steps.

## 3. How bug reports are used to fix the app

When a user voluntarily shares a report, the maintainers may review the supplied reproduction steps and diagnostics, reproduce the issue on a test device or emulator, make a code or configuration fix, and run relevant regression tests. A fix may be included in a later app update. Reports are not a guarantee of an individual response or a particular fix date.

Where possible, maintainers should use synthetic test data and disposable test devices. Real user reports, screenshots, and logs must not be committed to the public source repository. If a report is needed in an issue tracker, remove personal details and obtain the reporter's permission before publishing any identifying or sensitive content.

## 4. Automated testing and CI diagnostics

The project uses GitHub Actions and disposable Android emulators to build and test the app. CI may collect emulator screenshots, UI hierarchy, app-widget state, device/emulator properties, and system logs to diagnose test failures. Test coordinates are deterministic fixtures on the disposable emulator, not a user's live location.

These CI artifacts are generated by development infrastructure, not by the installed app on a user's personal device. They are subject to GitHub's access, security, and artifact-retention controls. The project should avoid placing personal-device data in CI artifacts.

## 5. Sharing and third parties

The current app does not sell personal information or share app-collected location with advertisers. It does not send location to a project-operated server. Android's operating system, location providers, app distribution platform, and any communication service a user chooses to share a report through operate under their own privacy policies.

If a future report-submission provider or other third-party service is added, this policy must be updated to identify the provider, data sent, purpose, and relevant retention/access practices before that integration is released.

## 6. Your choices

- You can refuse or revoke approximate-location permission in Android settings.
- You can clear the app's storage or uninstall the app to remove its locally stored preferences.
- You do not have to submit a bug report to use the app.
- For any future report feature, you must be able to review and cancel a report before it is sent.

## 7. Children's privacy

The app is not designed to collect personal information from children. It has no account registration, advertising profile, or current in-app report-upload mechanism. A future reporting feature must provide clear user-facing disclosure and consent safeguards appropriate to its audience.

## 8. Changes to this policy

This policy must be updated whenever the app's permissions, data handling, diagnostics, or third-party integrations materially change. The policy included with a release should describe the behavior of that release, not merely planned functionality.

## 9. Contact

For privacy questions or to report a concern, use the contact or issue-reporting route published on the project's GitHub repository. Do not post private logs, screenshots, precise location, or other sensitive information in a public issue.
