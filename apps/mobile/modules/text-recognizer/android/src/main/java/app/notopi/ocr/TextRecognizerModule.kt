package app.notopi.ocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Reads the text in a screenshot with ML Kit, entirely on the phone. Nothing is uploaded. */
class TextRecognizerModule : Module() {

  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun definition() = ModuleDefinition {
    Name("TextRecognizer")

    AsyncFunction("recognize") { uri: String, promise: Promise ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()
      val image = try {
        InputImage.fromFilePath(context, Uri.parse(uri))
      } catch (e: Exception) {
        promise.reject(CodedException("ERR_IMAGE", "Couldn't open the image", e))
        return@AsyncFunction
      }
      recognizer.process(image)
        .addOnSuccessListener { result -> promise.resolve(result.text) }
        .addOnFailureListener { e -> promise.reject(CodedException("ERR_OCR", "Couldn't read text in the image", e)) }
    }

    OnDestroy {
      recognizer.close()
    }
  }
}
