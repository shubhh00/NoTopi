package app.notopi.share

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.core.content.IntentCompat
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val SHARE_EVENT = "onShare"

/**
 * Hands content shared to NoTopi over to JavaScript. Three ways in:
 *  - Share menu with text (an SMS, a WhatsApp message, a link)
 *  - Share menu with an image (a screenshot of the message)
 *  - Text selection menu in any app ("NoTopi" next to Copy and Share)
 */
class ShareIntentModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ShareIntent")

    Events(SHARE_EVENT)

    // The share that launched the app, if any. Read once: it's cleared so a reload doesn't re-check it.
    Function("getInitialShare") {
      val intent = appContext.currentActivity?.intent ?: return@Function null
      val payload = parse(intent) ?: return@Function null
      consume(intent)
      payload
    }

    // A share that arrives while NoTopi is already open.
    OnNewIntent { intent ->
      val payload = parse(intent) ?: return@OnNewIntent
      consume(intent)
      sendEvent(SHARE_EVENT, payload)
    }
  }

  private fun parse(intent: Intent): Bundle? = when (intent.action) {
    Intent.ACTION_PROCESS_TEXT ->
      intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()?.takeIf { it.isNotBlank() }
        ?.let { bundleOf("type" to "text", "text" to it) }

    Intent.ACTION_SEND -> {
      val mime = intent.type.orEmpty()
      if (mime.startsWith("image/")) {
        IntentCompat.getParcelableExtra(intent, Intent.EXTRA_STREAM, Uri::class.java)
          ?.let { bundleOf("type" to "image", "uri" to it.toString()) }
      } else {
        // Some apps put a title in EXTRA_SUBJECT and the body in EXTRA_TEXT; keep both.
        listOfNotNull(
          intent.getStringExtra(Intent.EXTRA_SUBJECT),
          intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString(),
        ).joinToString("\n").takeIf { it.isNotBlank() }
          ?.let { bundleOf("type" to "text", "text" to it) }
      }
    }

    else -> null
  }

  /** Turns the intent into a plain launch so the same share isn't handled twice. */
  private fun consume(intent: Intent) {
    intent.action = Intent.ACTION_MAIN
    intent.removeExtra(Intent.EXTRA_TEXT)
    intent.removeExtra(Intent.EXTRA_SUBJECT)
    intent.removeExtra(Intent.EXTRA_STREAM)
    intent.removeExtra(Intent.EXTRA_PROCESS_TEXT)
  }
}
