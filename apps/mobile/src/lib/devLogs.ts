import { LogBox } from 'react-native';

// Development-only notices that aren't problems, hidden so the toast doesn't cover the
// action buttons. Imported first in the root layout so it runs before the warnings fire.
LogBox.ignoreLogs([
  // Shown when the phone has "reduce motion" on; animations already respect it.
  'Reduced motion setting is enabled',
]);
