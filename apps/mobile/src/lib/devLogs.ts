import { LogBox } from 'react-native';

// Development builds show library warnings as toasts that cover the action buttons and end up
// in screen recordings. Hide them all; they still print in the Metro terminal, and release
// builds never show them. Imported first in the root layout so it runs before any warning fires.
LogBox.ignoreAllLogs();
