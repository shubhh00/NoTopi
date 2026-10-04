import { router } from 'expo-router';
import { useEffect } from 'react';
import { addShareListener, getInitialShare, type SharePayload } from '../../modules/share-intent';

function open(payload: SharePayload) {
  if (payload.type === 'text') router.push({ pathname: '/check', params: { q: payload.text } });
  else router.push({ pathname: '/check', params: { image: payload.uri } });
}

/**
 * Opens a check for whatever was shared to NoTopi: on launch from the Share menu, and
 * whenever something is shared while the app is open. Mounted on Home, which is always
 * at the bottom of the stack.
 */
export function useIncomingShare() {
  useEffect(() => {
    const initial = getInitialShare();
    if (initial) open(initial);
    const sub = addShareListener(open);
    return () => sub?.remove();
  }, []);
}
