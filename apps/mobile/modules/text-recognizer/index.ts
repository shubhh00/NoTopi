import { requireOptionalNativeModule } from 'expo';

interface TextRecognizerNative {
  recognize(uri: string): Promise<string>;
}

// Optional so the app still runs in Expo Go, which doesn't include our Kotlin code.
const native = requireOptionalNativeModule<TextRecognizerNative>('TextRecognizer');

export const isTextRecognitionAvailable = native != null;

/** The text in an image (a content:// or file:// URI), read on the device with ML Kit. */
export async function recognizeText(uri: string): Promise<string> {
  if (!native) throw new Error('Reading screenshots needs the NoTopi app build, not Expo Go.');
  return native.recognize(uri);
}
