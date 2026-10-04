// Adds NoTopi to Android's Share menu (text and images) and to the text-selection menu
// that appears in every app. Expo generates the android/ folder, so manifest changes are
// made here at build time instead of by hand.
const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

const filter = (action, mimeType) => ({
  action: [{ $: { 'android:name': action } }],
  category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
  data: [{ $: { 'android:mimeType': mimeType } }],
});

const SHARE_FILTERS = [
  filter('android.intent.action.SEND', 'text/plain'),
  filter('android.intent.action.SEND', 'image/*'),
  filter('android.intent.action.PROCESS_TEXT', 'text/plain'),
];

module.exports = function withShareIntent(config) {
  return withAndroidManifest(config, (cfg) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(cfg.modResults);
    // One instance: a share while NoTopi is open goes to the running app (onNewIntent).
    activity.$['android:launchMode'] = 'singleTask';

    const existing = activity['intent-filter'] ?? [];
    const isOurs = (f) =>
      f.action?.some((a) => ['android.intent.action.SEND', 'android.intent.action.PROCESS_TEXT'].includes(a.$['android:name']));
    activity['intent-filter'] = [...existing.filter((f) => !isOurs(f)), ...SHARE_FILTERS];
    return cfg;
  });
};
