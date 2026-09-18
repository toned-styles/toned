package com.toned.acceptance

import android.widget.TextView
import android.text.Spanned
import android.text.TextPaint
import android.text.style.CharacterStyle
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.UIManagerHelper
import java.io.File

/** Read the mounted Android View, never Toned's requested JS patch. Results live
 * in this offline application's private directory and are read with adb run-as. */
class TonedAcceptanceModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
  override fun getName() = "TonedAcceptance"

  @ReactMethod
  fun report(json: String) {
    synchronized(this) { File(context.filesDir, "results.jsonl").appendText(json + "\n") }
  }

  @ReactMethod
  fun snapshot(tag: Double, promise: Promise) {
    UiThreadUtil.runOnUiThread {
      try {
        val view = UIManagerHelper.getUIManagerForReactTag(context, tag.toInt())?.resolveView(tag.toInt())
        if (view == null) {
          promise.reject("NOT_MOUNTED", "No mounted native View for tag $tag")
          return@runOnUiThread
        }
        val density = context.resources.displayMetrics.density.toDouble()
        val result = Arguments.createMap().apply {
          putDouble("width", view.width / density)
          putDouble("height", view.height / density)
          putDouble("alpha", view.alpha.toDouble())
          putBoolean("focused", view.isFocused)
          if (view is TextView) {
            // RN Text paints foreground colours through native spans. Reading
            // currentTextColor alone returns the TextView's unused default.
            // Resolve the first glyph's actual native drawing paint instead.
            val paint = TextPaint(view.paint)
            val text = view.text
            if (text is Spanned && text.isNotEmpty()) {
              for (span in text.getSpans(0, 1, CharacterStyle::class.java)) {
                span.updateDrawState(paint)
              }
            }
            putDouble("textColor", paint.color.toDouble())
            putDouble("hintTextColor", view.currentHintTextColor.toDouble())
          }
        }
        promise.resolve(result)
      } catch (error: Exception) { promise.reject("NATIVE_READBACK", error) }
    }
  }
}
