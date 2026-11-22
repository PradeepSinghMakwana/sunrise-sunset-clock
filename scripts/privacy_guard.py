#!/usr/bin/env python3
"""Fail-closed checks for the app's no-network/no-upload privacy boundary."""
from __future__ import annotations

import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ANDROID = "{http://schemas.android.com/apk/res/android}"
NETWORK_PERMISSIONS = {
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.CHANGE_NETWORK_STATE",
}
NETWORK_MARKERS = re.compile(
    r"okhttp|retrofit|ktor-client|firebase-(analytics|crashlytics)|"
    r"sentry|bugsnag|amplitude|mixpanel|volley",
    re.IGNORECASE,
)
NETWORK_IMPORTS = re.compile(
    r"import\s+(?:java\.net|javax\.net|okhttp3|retrofit2|io\.ktor\.client|"
    r"com\.android\.volley|com\.google\.firebase\.crashlytics)",
    re.IGNORECASE,
)


def validate(root: Path) -> list[str]:
    errors: list[str] = []
    manifest_path = root / "app/src/main/AndroidManifest.xml"
    gradle_path = root / "app/build.gradle.kts"
    rules_path = root / "app/src/main/res/xml/data_extraction_rules.xml"
    try:
        manifest = ET.parse(manifest_path).getroot()
    except (OSError, ET.ParseError) as exc:
        return [f"cannot parse Android manifest: {exc}"]

    for element in manifest.findall("uses-permission"):
        permission = element.get(ANDROID + "name", "")
        if permission in NETWORK_PERMISSIONS or permission.endswith(".INTERNET"):
            errors.append(f"network permission is forbidden: {permission}")

    app = manifest.find("application")
    if app is None:
        errors.append("application element is missing")
    else:
        if app.get(ANDROID + "allowBackup") != "false":
            errors.append("Android app backup must be disabled")
        if app.get(ANDROID + "fullBackupContent") != "false":
            errors.append("legacy full backup must be explicitly disabled")
        if app.get(ANDROID + "dataExtractionRules") != "@xml/data_extraction_rules":
            errors.append("Android 12+ data extraction rules must be configured")
        if app.get(ANDROID + "usesCleartextTraffic") != "false":
            errors.append("cleartext traffic must be explicitly disabled")

    try:
        rules = ET.parse(rules_path).getroot()
        for label, section in (("cloud backup", rules.find("cloud-backup")),
                               ("device transfer", rules.find("device-transfer"))):
            if section is None or not any(
                item.get("domain") == "root" and item.get("path") == "."
                for item in section.findall("exclude")
            ):
                errors.append(f"{label} must exclude the entire app data root")
    except (OSError, ET.ParseError) as exc:
        errors.append(f"cannot validate Android data extraction rules: {exc}")

    try:
        gradle = gradle_path.read_text(encoding="utf-8")
    except OSError as exc:
        return errors + [f"cannot read app dependencies: {exc}"]
    if NETWORK_MARKERS.search(gradle):
        errors.append("networking, analytics, or crash-reporting dependency is forbidden")

    source_root = root / "app/src/main"
    for path in source_root.rglob("*.kt"):
        try:
            source = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as exc:
            errors.append(f"cannot read {path.relative_to(root)}: {exc}")
            continue
        if NETWORK_IMPORTS.search(source):
            errors.append(f"network API import is forbidden: {path.relative_to(root)}")
    return errors


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    errors = validate(root)
    if errors:
        for error in errors:
            print(f"[PrivacyGuard] ERROR: {error}", file=sys.stderr)
        return 1
    print("[PrivacyGuard] PASS — no app network capability, upload SDK, or app-data backup.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
