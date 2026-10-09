// Release builds block plain http:// (debug builds allow it, which hid this). A NoTopi server on your
// own laptop, reached over USB with `adb reverse`, is http://localhost, so allow plain http to
// localhost only: that traffic never leaves the phone and laptop. Every other host stays https-only,
// as Google Play expects for personal data such as the numbers being checked. A server reached over
// the network must use https.
//
// Debug builds get their own copy of the config that allows plain http everywhere, so Metro keeps
// working over Wi-Fi during development.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const RELEASE = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="false" />
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">127.0.0.1</domain>
    </domain-config>
</network-security-config>
`;

const DEBUG = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

function write(root, variant, xml) {
  const dir = path.join(root, 'app', 'src', variant, 'res', 'xml');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'network_security_config.xml'), xml);
}

module.exports = function withLocalhostServer(config) {
  config = withDangerousMod(config, [
    'android',
    (cfg) => {
      write(cfg.modRequest.platformProjectRoot, 'main', RELEASE);
      write(cfg.modRequest.platformProjectRoot, 'debug', DEBUG);
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
};
