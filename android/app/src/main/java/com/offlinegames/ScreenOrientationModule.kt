package com.offlinegames

import android.content.pm.ActivityInfo
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class ScreenOrientationModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "ScreenOrientation"

  @ReactMethod
  fun lockLandscape() {
    val activity = reactApplicationContext.currentActivity ?: return

    activity.runOnUiThread {
      activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    }
  }

  @ReactMethod
  fun lockPortrait() {
    val activity = reactApplicationContext.currentActivity ?: return

    activity.runOnUiThread {
      activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
    }
  }
}
