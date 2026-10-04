import { requireOptionalNativeModule } from 'expo';
import type { EventSubscription } from 'expo-modules-core';

export type SharePayload = { type: 'text'; text: string } | { type: 'image'; uri: string };

interface ShareIntentNative {
  getInitialShare(): SharePayload | null;
  addListener(event: 'onShare', listener: (payload: SharePayload) => void): EventSubscription;
}

// Optional so the app still runs in Expo Go, which doesn't include our Kotlin code.
const native = requireOptionalNativeModule<ShareIntentNative>('ShareIntent');

/** True in a development or release build of NoTopi; false in Expo Go. */
export const isShareAvailable = native != null;

/** What was shared to NoTopi when it was opened from the Share menu, if anything. */
export function getInitialShare(): SharePayload | null {
  return native?.getInitialShare() ?? null;
}

/** Called when something is shared while NoTopi is already open. */
export function addShareListener(listener: (payload: SharePayload) => void): EventSubscription | null {
  return native?.addListener('onShare', listener) ?? null;
}
