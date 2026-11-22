package com.sunrisesunset.clock

import android.appwidget.AppWidgetManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Rect
import android.app.KeyguardManager
import android.content.ComponentName
import android.content.Context
import android.os.Build
import android.provider.Settings
import android.view.ViewConfiguration
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.uiautomator.By
import androidx.test.uiautomator.UiDevice
import androidx.test.uiautomator.UiObject2
import androidx.test.uiautomator.Until
import java.io.File
import java.util.concurrent.Callable
import java.util.concurrent.ExecutionException
import java.util.concurrent.FutureTask
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException
import java.time.ZoneId
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class StoreScreenshotTest {
    @Test(timeout = 90_000)
    fun captureRealAppSetupScreen() {
        assertCiTimezone()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        val output = screenshotDirectory(context)

        unlockDevice(device, context)
        val scenario = stage("launch setup activity", 10_000) { ActivityScenario.launch(LocationSetupActivity::class.java) }
        try {
            stage("settle screen", 2_000) { Thread.sleep(250) }
            assertTrue("Setup action did not become visible to UI Automator",
                stage("wait for setup screen", 10_500) {
                    device.wait(Until.hasObject(By.text("Use approximate location")), 10_000)
                })
            waitForUiIdle(device, "UI idle")
            captureCheckpoint(device, context, "04-app-setup-ready")

            val screenshot = File(output, "01-app-setup.png")
            assertTrue("Could not capture app setup screen", captureScreenshot(device, screenshot, "screen"))
            assertTrue("App screenshot is empty", screenshot.length() > 10_000)
            captureHierarchy(device, hierarchyFile(context, "01-app-setup"), "app setup")
            captureShellEvidence(device, context, "01-app-setup")
        } finally {
            stage("close setup activity", 5_000) { scenario.close() }
        }
    }

    @Test(timeout = 90_000)
    fun placeWidgetOnLauncherAndCaptureHomeScreen() {
        assertCiTimezone()
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val context = instrumentation.targetContext
        val device = UiDevice.getInstance(instrumentation)
        val output = screenshotDirectory(context)

        context.getSharedPreferences(LocationPreferences.PREFS, Context.MODE_PRIVATE).edit()
            .putString(LocationPreferences.LATITUDE, "37.4219983")
            .putString(LocationPreferences.LONGITUDE, "-122.084")
            .commit()

        val appWidgetManager = AppWidgetManager.getInstance(context)
        val expectedProvider = ComponentName(context, SunClockWidgetProvider::class.java)
        assertTrue(
            "Sunrise Sunset Clock is missing from Android's installed widget providers",
            appWidgetManager.installedProviders.any { it.provider == expectedProvider }
        )

        unlockDevice(device, context)
        val homeIntent = android.content.Intent(android.content.Intent.ACTION_MAIN)
            .addCategory(android.content.Intent.CATEGORY_HOME)
        val launcherPackage = requireNotNull(context.packageManager.resolveActivity(
            homeIntent, android.content.pm.PackageManager.MATCH_DEFAULT_ONLY
        )?.activityInfo?.packageName) { "Could not resolve default Android HOME launcher" }
        stage("return to launcher", 5_000) { device.pressHome() }
        assertTrue("Default Android launcher did not become visible: $launcherPackage",
            stage("wait for Android launcher", 10_500) {
                device.wait(Until.hasObject(By.pkg(launcherPackage)), 10_000)
            })
        waitForUiIdle(device, "UI idle")
        stage("settle screen", 2_000) { Thread.sleep(250) }
        captureScreenshot(device, File(output, "02-launcher-before.png"), "launcher-before")
        captureHierarchy(device, hierarchyFile(context, "02-launcher-before"), "launcher before")
        captureShellEvidence(device, context, "02-launcher-before")

        val workspace = stage("find launcher workspace", 10_500) {
            device.wait(Until.findObject(By.res(launcherPackage, "workspace")), 10_000)
        }
        assertNotNull("Launcher workspace was not exposed; inspect 02-launcher-before.xml", workspace)
        val workspaceBounds = workspace!!.visibleBounds
        assertTrue("Launcher workspace has invalid bounds: $workspaceBounds",
            workspaceBounds.width() > 0 && workspaceBounds.height() > 0)
        stage("open launcher edit menu", 5_000) { workspace.longClick() }
        waitForUiIdle(device, "UI idle")
        captureCheckpoint(device, context, "05-launcher-edit-menu")

        val widgetsButton: UiObject2? = stage("find Widgets control", 7_500) {
            device.wait(Until.findObject(By.text("Widgets")), 5_000)
                ?: device.wait(Until.findObject(By.descContains("Widgets")), 2_000)
        }
        assertNotNull("Launcher edit menu did not expose Widgets", widgetsButton)
        stage("open widget picker", 5_000) { widgetsButton!!.click() }
        waitForUiIdle(device, "UI idle")
        captureCheckpoint(device, context, "06-widget-picker-open")

        val widgetEntrySelector = By.textContains("Sunrise Sunset Clock")
        val pickerViewportTop = (device.displayHeight * 0.18).toInt()
        val pickerViewportBottom = (device.displayHeight * 0.88).toInt()

        // Launcher3 sorts provider rows alphabetically. On a fresh emulator the
        // app is below the initially visible Settings row, so blind swipes can
        // leave the selector searching the same visible page. Filter the picker
        // by the installed app label instead of relying on scroll gesture timing.
        val widgetSearch = stage("find widget picker search", 5_000) {
            device.wait(
                Until.findObject(By.res(launcherPackage, "widgets_search_bar_edit_text")),
                4_000
            )
        }
        assertNotNull("Launcher3 widget picker search field was not exposed", widgetSearch)
        stage("filter widget picker", 5_000) {
            widgetSearch!!.click()
            widgetSearch.setText("Sunrise Sunset Clock")
            device.pressEnter()
        }
        waitForUiIdle(device, "filtered widget picker idle")

        // Keep this as its own bounded stage. Do not wrap multiple independently
        // timed UI operations in a shorter parent timeout: that cancels the
        // search/scroll loop before its nested operation budgets can complete.
        val appEntry: UiObject2? = stage("find fully visible widget row", 10_000) {
            device.wait(Until.findObject(widgetEntrySelector), 8_000)
        }
        assertNotNull("Widget picker search returned no Sunrise Sunset Clock row", appEntry)
        val appEntryBounds = appEntry!!.visibleBounds
        assertTrue(
            "Widget picker row must be fully visible before selection: $appEntryBounds",
            appEntryBounds.height() > 0 && appEntryBounds.top >= pickerViewportTop &&
                appEntryBounds.bottom <= pickerViewportBottom
        )
        // Tap the center of the fully visible widget row, not an off-screen
        // accessibility node whose bounds may be clipped to a neighboring item.
        stage("select widget row", 5_000) { device.click(appEntryBounds.centerX(), appEntryBounds.centerY()) }
        waitForUiIdle(device, "UI idle")

        // Save evidence immediately after tapping the provider row. Launcher3's
        // widget_name accessibility ID is not stable across Android 13 builds.
        captureCheckpoint(device, context, "07-widget-row-selected")
        val widgetPreview = stage("detect widget preview", 8_500) {
            device.wait(Until.findObject(By.res(launcherPackage, "widget_preview")), 8_000)
        }
        captureHierarchy(device, hierarchyFile(context, "07-widget-row-selected"), "widget row selected")
        assertNotNull(
            "Could not locate the actual Launcher3 widget_preview view; " +
                "do not drag the app-name text",
            widgetPreview
        )
        // Derive the gesture from measured preview/workspace bounds. Touch slop is
        // a lower bound; the launcher’s private drag threshold is not public.
        val previewBounds = widgetPreview!!.visibleBounds
        assertTrue("Widget preview has invalid bounds: $previewBounds", previewBounds.width() > 0 && previewBounds.height() > 0)
        val touchSlop = ViewConfiguration.get(context).scaledTouchSlop
        val destinationY = (workspaceBounds.top + workspaceBounds.height() * 0.18f).toInt().coerceIn(0, device.displayHeight - 1)
        val destinationX = workspaceBounds.centerX().coerceIn(0, device.displayWidth - 1)
        val startX = previewBounds.centerX()
        val startY = previewBounds.centerY()
        val dragDistance = kotlin.math.hypot((destinationX - startX).toDouble(), (destinationY - startY).toDouble()).toInt()
        assertTrue("Calculated drag distance $dragDistance px does not exceed touch slop ${touchSlop}px; preview=$previewBounds workspace=$workspaceBounds", dragDistance > touchSlop * 2)
        writeDeviceDiagnostics(context, device, launcherPackage, workspaceBounds, previewBounds,
            "start=($startX,$startY), destination=($destinationX,$destinationY), distance_px=$dragDistance, touch_slop_px=$touchSlop, duration_ms=1000")
        stage("drag widget onto launcher", 8_000) { widgetPreview.drag(android.graphics.Point(destinationX, destinationY), 1_000) }
        waitForUiIdle(device, "UI idle")
        stage("settle screen", 2_000) { Thread.sleep(250) }
        captureCheckpoint(device, context, "08-widget-after-placement")

        // Android 13 keeps the widget selected after the drag, with resize handles
        // visible. Dismiss that mode before treating the home screen as final.
        stage("exit widget placement mode", 5_000) { device.pressBack() }
        waitForUiIdle(device, "UI idle")
        stage("settle screen", 2_000) { Thread.sleep(250) }

        val widgetIds = stage("verify registered widget", 5_000) { appWidgetManager.getAppWidgetIds(expectedProvider) }
        assertTrue(
            "Launcher drag did not register a Sunrise Sunset Clock widget instance; " +
                "inspect 08-widget-after-placement.xml",
            widgetIds.isNotEmpty()
        )
        widgetIds.forEach { widgetId ->
            val info = AppWidgetManager.getInstance(context).getAppWidgetInfo(widgetId)
            assertNotNull("Registered widget $widgetId has no provider metadata", info)
            assertTrue(
                "Registered widget $widgetId belongs to an unexpected provider",
                info!!.provider == ComponentName(context, SunClockWidgetProvider::class.java)
            )
        }

        // Android 13 Launcher3 accessibility represents RemoteViews children as one
        // AppWidgetHostView node; individual TextViews aren't queryable via UiAutomator.
        // The launcher host must exist after leaving resize mode: a preview tile or
        // placement outline is not an acceptable substitute for a bound host view.
        val widgetHost = stage("verify rendered widget host", 8_500) {
            device.wait(
                Until.findObject(By.clazz("com.android.launcher3.widget.LauncherAppWidgetHostView")),
                8_000
            )
        }
        assertNotNull(
            "Placed widget host is not present after dismissing placement mode; " +
                "inspect 08-widget-after-placement.xml",
            widgetHost
        )
        val widgetBounds = stage("read placed widget bounds", 3_000) { widgetHost!!.visibleBounds }
        assertTrue("Widget host is clipped or has zero size: $widgetBounds",
            widgetBounds.width() >= 250 && widgetBounds.height() >= 130)
        assertTrue("Widget host extends beyond the display: $widgetBounds",
            widgetBounds.left >= 0 && widgetBounds.top >= 0 &&
                widgetBounds.right <= device.displayWidth &&
                widgetBounds.bottom <= device.displayHeight)

        val screenshot = File(output, "02-home-screen-widget.png")
        assertTrue("Could not capture launcher widget screenshot", captureScreenshot(device, screenshot, "placed widget"))
        assertTrue("Widget screenshot is empty", screenshot.length() > 10_000)
        val before = BitmapFactory.decodeFile(File(output, "02-launcher-before.png").absolutePath)
        val after = BitmapFactory.decodeFile(screenshot.absolutePath)
        assertNotNull("Pre-placement launcher screenshot is not a valid PNG", before)
        assertNotNull("Widget screenshot is not a valid PNG", after)
        assertEquals("Launcher screenshot width changed unexpectedly", before!!.width, after!!.width)
        assertEquals("Launcher screenshot height changed unexpectedly", before.height, after.height)
        var changedPixels = 0
        for (y in 0 until after.height step 4) {
            for (x in 0 until after.width step 4) {
                if (before.getPixel(x, y) != after.getPixel(x, y)) changedPixels++
            }
        }
        assertTrue(
            "Home-screen screenshot is visually unchanged after widget placement",
            changedPixels > 500
        )
        val sunriseAccentPixels = countPixelsNear(
            after, widgetBounds, 0xFFFFD27A.toInt(), tolerance = 38
        )
        val sunsetAccentPixels = countPixelsNear(
            after, widgetBounds, 0xFFFFB28A.toInt(), tolerance = 38
        )
        assertTrue(
            "Screenshot does not visibly contain the widget's sunrise label accent",
            sunriseAccentPixels > 3
        )
        assertTrue(
            "Screenshot does not visibly contain the widget's sunset label accent",
            sunsetAccentPixels > 3
        )
        before.recycle()
        after.recycle()
        captureHierarchy(device, hierarchyFile(context, "02-home-screen-widget"), "home screen widget")
        captureShellEvidence(device, context, "02-home-screen-widget")
    }


    // Every potentially blocking platform operation has an independent deadline.
    private fun <T> stage(name: String, timeoutMs: Long, action: () -> T): T {
        val task = FutureTask(Callable<T> { action() })
        Thread(task, "instrumented-stage-$name").apply { isDaemon = true; start() }
        try { return task.get(timeoutMs, TimeUnit.MILLISECONDS) }
        catch (error: TimeoutException) { task.cancel(true); throw AssertionError("Stage '$name' exceeded ${timeoutMs}ms", error) }
        catch (error: ExecutionException) { throw (error.cause ?: error) }
    }

    private fun waitForUiIdle(device: UiDevice, name: String) {
        stage(name, 5_000) { device.waitForIdle(4_500) }
    }

    private fun shell(device: UiDevice, command: String, name: String, timeoutMs: Long): String =
        stage(name, timeoutMs) { device.executeShellCommand(command) }

    private fun captureScreenshot(device: UiDevice, file: File, name: String): Boolean =
        stage("$name screenshot", 5_000) { device.takeScreenshot(file) }

    private fun captureHierarchy(device: UiDevice, file: File, name: String) {
        stage("$name hierarchy dump", 10_000) { device.dumpWindowHierarchy(file) }
        assertTrue("Hierarchy dump is missing or empty for $name", file.isFile && file.length() > 0)
    }

    private fun countPixelsNear(
        bitmap: Bitmap,
        bounds: Rect,
        target: Int,
        tolerance: Int
    ): Int {
        val targetRed = (target shr 16) and 0xFF
        val targetGreen = (target shr 8) and 0xFF
        val targetBlue = target and 0xFF
        var matches = 0
        val left = bounds.left.coerceIn(0, bitmap.width)
        val top = bounds.top.coerceIn(0, bitmap.height)
        val right = bounds.right.coerceIn(0, bitmap.width)
        val bottom = bounds.bottom.coerceIn(0, bitmap.height)
        for (y in top until bottom) {
            for (x in left until right) {
                val pixel = bitmap.getPixel(x, y)
                val red = (pixel shr 16) and 0xFF
                val green = (pixel shr 8) and 0xFF
                val blue = pixel and 0xFF
                if (
                    kotlin.math.abs(red - targetRed) <= tolerance &&
                    kotlin.math.abs(green - targetGreen) <= tolerance &&
                    kotlin.math.abs(blue - targetBlue) <= tolerance
                ) matches++
            }
        }
        return matches
    }

    private fun captureCheckpoint(device: UiDevice, context: Context, name: String) {
        val output = screenshotDirectory(context)
        captureScreenshot(device, File(output, "$name.png"), "$name checkpoint")
        captureHierarchy(device, hierarchyFile(context, name), "$name checkpoint")
        captureShellEvidence(device, context, name)
    }

    // Gradle removes the target app after connectedDebugAndroidTest. Save
    // checkpoint evidence in shell-owned /data/local/tmp so the runner can pull
    // it after Gradle finishes, instead of losing the app's external files.
    private fun captureShellEvidence(device: UiDevice, context: Context, name: String) {
        val evidenceDirectory = "/data/local/tmp/sunrise-sunset-ci"
        val hierarchyPath = "$evidenceDirectory/$name.xml"
        shell(device, "mkdir -p $evidenceDirectory", "$name create evidence directory", 3_000)
        shell(device, "screencap -p $evidenceDirectory/$name.png", "$name shell screenshot", 5_000)
        // UiAutomator already owns the instrumentation UiAutomation service.
        // Launching a second "uiautomator dump" process crashes with
        // "UiAutomationService already registered". Reuse the hierarchy captured
        // by UiDevice above and copy it into shell-owned storage for post-test pull.
        val sourceHierarchy = hierarchyFile(context, name)
        shell(
            device,
            "cp ${sourceHierarchy.absolutePath} $hierarchyPath",
            "$name hierarchy export",
            10_000
        )
        val verification = shell(
            device,
            "wc -c $hierarchyPath",
            "$name hierarchy verification",
            10_000
        )
        assertTrue(
            "Could not export non-empty hierarchy for $name. Verification: $verification",
            Regex("""^\s*[1-9]\d*\s+""").containsMatchIn(verification) &&
                verification.contains("$name.xml")
        )
        shell(device, "dumpsys appwidget > $evidenceDirectory/$name-appwidget-dump.txt", "$name appwidget diagnostics", 10_000)
    }

    private fun writeDeviceDiagnostics(context: Context, device: UiDevice, launcherPackage: String, workspaceBounds: Rect, previewBounds: Rect?, gesture: String?) {
        val metrics = context.resources.displayMetrics
        val launcherInfo = context.packageManager.getPackageInfo(launcherPackage, 0)
        val serial = stage("read device serial", 3_000) { device.executeShellCommand("getprop ro.serialno").trim() }
        val lines = listOf(
            "DEVICE", "serial=$serial", "android_id=${Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)}",
            "manufacturer=${Build.MANUFACTURER}", "brand=${Build.BRAND}", "model=${Build.MODEL}", "device=${Build.DEVICE}",
            "product=${Build.PRODUCT}", "android_version=${Build.VERSION.RELEASE}", "api_level=${Build.VERSION.SDK_INT}",
            "build_fingerprint=${Build.FINGERPRINT}", "DISPLAY", "width_px=${device.displayWidth}", "height_px=${device.displayHeight}",
            "density=${metrics.density}", "density_dpi=${metrics.densityDpi}", "scaled_density=${metrics.scaledDensity}",
            "TOUCH", "scaled_touch_slop_px=${ViewConfiguration.get(context).scaledTouchSlop}",
            "long_press_timeout_ms=${ViewConfiguration.getLongPressTimeout()}", "LAUNCHER", "package=$launcherPackage",
            "version=${launcherInfo.versionName}", "version_code=${launcherInfo.longVersionCode}", "workspace_bounds=$workspaceBounds",
            "preview_bounds=${previewBounds ?: "not-yet-detected"}", "GESTURE", gesture ?: "not-yet-performed"
        )
        val file = File(screenshotDirectory(context), "03-device-launcher-diagnostics.txt")
        stage("write device diagnostics", 3_000) { file.writeText(lines.joinToString("\n") + "\n") }
        assertTrue("Device/launcher diagnostics file is empty", file.isFile && file.length() > 0)
    }
    private fun hierarchyFile(context: Context, name: String): File {
        val externalFilesDirectory = requireNotNull(context.getExternalFilesDir(null)) {
            "App external-files directory is unavailable; CI cannot collect hierarchy evidence"
        }
        val directory = File(externalFilesDirectory, "screenshots")
        assertTrue(
            "Could not create hierarchy directory at ${directory.absolutePath}",
            directory.mkdirs() || directory.isDirectory
        )
        return File(directory, "$name.xml")
    }

    private fun assertCiTimezone() {
        assertEquals(
            "Android 13 CI emulator must use California local time, not UTC",
            ZoneId.of("America/Los_Angeles"),
            ZoneId.systemDefault()
        )
    }

    private fun screenshotDirectory(context: Context): File {
        val externalFilesDirectory = requireNotNull(context.getExternalFilesDir(null)) {
            "App external-files directory is unavailable; CI cannot collect screenshots"
        }
        val directory = File(externalFilesDirectory, "screenshots")
        assertTrue(
            "Could not create app screenshot directory at ${directory.absolutePath}",
            directory.mkdirs() || directory.isDirectory
        )
        return directory
    }

    private fun unlockDevice(device: UiDevice, context: Context) {
        stage("wake emulator", 5_000) { device.wakeUp() }
        shell(device, "wm dismiss-keyguard", "dismiss keyguard", 5_000)
        waitForUiIdle(device, "UI idle")
        assertTrue("Emulator screen did not turn on", device.isScreenOn)
        val keyguardManager = context.getSystemService(KeyguardManager::class.java)
        assertTrue("Emulator keyguard is still locked", !keyguardManager.isKeyguardLocked)
    }
}
