# Play Store release variant

This branch is intended for Google Play distribution.

- `INTERNET` permission is present for the planned opt-in bug-reporting feature.
- Android cloud backup and device-transfer backup are enabled for shared preferences.
- Reporting must be user initiated, disabled unless the user explicitly opts in, previewed before send, and never run in the background.
- Do not include report drafts, encryption keys, auth/session tokens, or diagnostics in Android backup.
- Clock and solar calculations must continue to work offline.

**Important implementation status:** this branch currently changes manifest/backup configuration only. The bug-report UI, transport, server integration, encryption, and consent flow are not implemented by this commit. Internet permission alone does not implement reporting.
