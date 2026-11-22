# F-Droid release variant

This branch is the F-Droid distribution configuration.

- No `INTERNET` permission or networking libraries.
- Bug reporting/diagnostic upload is not present.
- Android app backup and device-transfer backup are disabled.
- Clock, location-based solar calculations, and widget updates remain on-device/offline.

The branch is checked against the repository's privacy guard before release. Do not cherry-pick Play Store network or reporting changes into this branch.
