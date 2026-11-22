"""Regression tests for the app's no-upload privacy boundary."""
import tempfile
import unittest
from pathlib import Path

from privacy_guard import validate


class PrivacyGuardTest(unittest.TestCase):
    def make_project(self, root: Path):
        (root / "app/src/main/res/xml").mkdir(parents=True)
        (root / "app/src/main/kotlin").mkdir(parents=True)
        (root / "app/src/main/AndroidManifest.xml").write_text(
            '<manifest xmlns:android="http://schemas.android.com/apk/res/android">'
            '<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>'
            '<application android:allowBackup="false" android:fullBackupContent="false" '
            'android:dataExtractionRules="@xml/data_extraction_rules" '
            'android:usesCleartextTraffic="false"/></manifest>', encoding="utf-8")
        (root / "app/src/main/res/xml/data_extraction_rules.xml").write_text(
            '<data-extraction-rules><cloud-backup><exclude domain="root" path="."/></cloud-backup>'
            '<device-transfer><exclude domain="root" path="."/></device-transfer></data-extraction-rules>',
            encoding="utf-8")
        (root / "app/build.gradle.kts").write_text(
            'dependencies { implementation("androidx.compose:ui:1.0") }', encoding="utf-8")

    def test_accepts_no_network_and_no_backup_configuration(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_project(root)
            self.assertEqual([], validate(root))

    def test_rejects_internet_permission(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_project(root)
            path = root / "app/src/main/AndroidManifest.xml"
            path.write_text(path.read_text(encoding="utf-8").replace(
                "<application", '<uses-permission android:name="android.permission.INTERNET"/>'
                "<application"), encoding="utf-8")
            self.assertTrue(any("network permission" in error for error in validate(root)))

    def test_rejects_cloud_backup_or_device_transfer(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_project(root)
            (root / "app/src/main/res/xml/data_extraction_rules.xml").write_text(
                '<data-extraction-rules><cloud-backup/><device-transfer/></data-extraction-rules>',
                encoding="utf-8")
            errors = validate(root)
            self.assertTrue(any("cloud backup" in error for error in errors))
            self.assertTrue(any("device transfer" in error for error in errors))

    def test_rejects_networking_or_crash_reporting_dependency(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_project(root)
            (root / "app/build.gradle.kts").write_text(
                'dependencies { implementation("com.squareup.okhttp3:okhttp:4.12.0") }',
                encoding="utf-8")
            self.assertTrue(any("dependency is forbidden" in error for error in validate(root)))

    def test_rejects_network_api_import(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_project(root)
            (root / "app/src/main/kotlin/Network.kt").write_text("import java.net.URL\n", encoding="utf-8")
            self.assertTrue(any("network API import" in error for error in validate(root)))


if __name__ == "__main__":
    unittest.main()
