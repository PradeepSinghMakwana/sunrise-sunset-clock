# Privacy Policy

**App:** Sunrise Sunset Clock  
**Package:** `com.sunrisesunset.clock`  
**Last updated:** 22 November 2026

## 1. Our no-upload commitment

**Sunrise Sunset Clock does not upload anything.** The installed app has no Android `INTERNET` permission, contains no network client or reporting SDK, and has no server-submission endpoint. It cannot send app data to the developer, an analytics provider, an advertising network, or another remote service.

This prohibition includes bug reports, crash reports, stack traces, error diagnostics, screenshots, screen recordings, UI hierarchies, attachments, application logs, usage events, analytics, telemetry, approximate or precise location, saved coordinates, location history, device identifiers, device model, Android version, app usage details, and any other app-generated or app-stored information.

There is no automatic, background, or user-triggered upload. There is no in-app bug-report submission feature. The project will not add an upload/reporting feature to this app.

## 2. Information used locally

### Approximate location

If you grant Android's approximate-location permission, the app can read an available approximate location. It uses latitude and longitude to calculate sunrise and sunset on the device. Coordinates are saved in app-private preferences so the widget can refresh locally.

- The app requests `ACCESS_COARSE_LOCATION` only; it does not request precise or background location.
- The app has no `INTERNET` permission and does not transmit coordinates.
- The app does not submit location to an app-operated service or remote solar-time API.
- Android and the device's configured location providers are separate system components. They may process location under their own system/provider privacy terms; this app cannot make promises about network activity performed independently by Android or a location provider.

You can deny or revoke location permission in Android Settings. If permission is denied or no usable location is available, location-dependent values cannot be calculated. Clearing app storage or uninstalling the app removes its locally stored preferences.

### Device and app information

The app does not collect or transmit device identifiers, usage analytics, advertising identifiers, crash telemetry, or device diagnostics. It has no account registration, analytics SDK, advertising SDK, crash-reporting SDK, or network library.

## 3. Local storage and backup

The app stores selected approximate coordinates in its private application preferences. It does not send those preferences elsewhere.

Android application backup is disabled. Both cloud-backup and device-transfer rules exclude all app data. The app also declares `allowBackup=false`. This is intended to keep private location preferences out of Android app backup and device-transfer flows. Device manufacturers may implement system-level migration behavior outside the app's control.

## 4. Bug reports, crashes, and diagnostics

The app does not create or transmit bug reports. It does not automatically capture screenshots, logs, crash traces, device information, or other diagnostics. It does not upload such material if a crash or error occurs. No in-app mechanism exists to submit a report, and the project will not add one.

If you independently choose to contact maintainers outside the app, you control what information you share and which external service you use. Do not include private screenshots, logs, precise location, notifications, account details, or other sensitive information unless you have considered the disclosure. Any external communication service has its own privacy policy; it is not an app upload.

## 5. Development and CI infrastructure

The project uses GitHub and disposable Android emulators to develop and test the app. Development workflows may upload build outputs, automated test screenshots, test logs, or static-analysis results to GitHub Actions. These are developer/CI operations on source code and disposable test environments; they are not uploads from the installed app or from a user's personal device. CI test coordinates are synthetic fixtures.

GitHub processes repository source, CI artifacts, and workflow information under its own terms and retention controls. This CI activity does not give the installed app network access and does not collect user-device reports.

## 6. Third parties and system services

The app itself does not transmit data to third parties. Android, device location providers, the app distribution platform, and any external service you independently choose to use operate under their own terms. The operating system's location provider may perform its own network operations independently of this app.

## 7. Your choices

- You can deny or revoke approximate-location permission.
- You can clear app storage or uninstall the app to remove locally stored preferences.
- The app never asks you to submit a bug report or diagnostics.
- You can choose not to share information with maintainers through external communication channels.

## 8. Children's privacy

The app has no account, advertising profile, analytics, or in-app reporting mechanism. It does not upload information about children or other users.

## 9. Policy changes

Any change that would allow the app to transmit information, add network permission, enable app-data backup, or introduce analytics/reporting would contradict this policy and must not be made as part of this project. Automated privacy checks are intended to prevent such changes from being introduced unnoticed.

## 10. Contact

For privacy questions, use the contact route published on the project's GitHub repository. Avoid posting personal information or sensitive diagnostics in public issues.
