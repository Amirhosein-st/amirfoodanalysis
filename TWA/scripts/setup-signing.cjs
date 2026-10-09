const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(root, 'twa-manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const propertiesPath = path.join(root, 'keystore.properties');
const keyPath = path.resolve(root, manifest.signingKey.path);
const keytool = process.env.JAVA_HOME
  ? path.join(process.env.JAVA_HOME, 'bin', process.platform === 'win32' ? 'keytool.exe' : 'keytool')
  : 'keytool';

function runKeytool(args, storePassword, keyPassword) {
  const result = spawnSync(keytool, args, {
    env: { ...process.env, RIMA_STORE_PASSWORD: storePassword, RIMA_KEY_PASSWORD: keyPassword },
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString().trim());
  return result.stdout;
}

function main() {
  if (fs.existsSync(keyPath) !== fs.existsSync(propertiesPath)) {
    throw new Error('Signing files are incomplete. Restore the matching keystore and keystore.properties from your backup.');
  }

  if (!fs.existsSync(keyPath)) {
    const storePassword = crypto.randomBytes(32).toString('hex');
    const keyPassword = storePassword; // PKCS12 requires matching store and key passwords.
    runKeytool([
      '-genkeypair', '-keystore', keyPath, '-storetype', 'PKCS12',
      '-alias', manifest.signingKey.alias, '-keyalg', 'RSA', '-keysize', '3072',
      '-sigalg', 'SHA256withRSA', '-validity', '10000',
      '-dname', 'CN=Rima Food Tracker, OU=Android, O=Rima',
      '-storepass:env', 'RIMA_STORE_PASSWORD', '-keypass:env', 'RIMA_KEY_PASSWORD',
    ], storePassword, keyPassword);
    fs.writeFileSync(propertiesPath, [
      '# Keep this file and the keystore private. Back up both files together.',
      'storeFile=' + manifest.signingKey.path.replaceAll('\\', '/'),
      'storePassword=' + storePassword,
      'keyAlias=' + manifest.signingKey.alias,
      'keyPassword=' + keyPassword,
      '',
    ].join('\n'), { mode: 0o600 });
    console.log('Created local release signing key. Back up rima-release.jks and keystore.properties together.');
  }

  const properties = Object.fromEntries(fs.readFileSync(propertiesPath, 'utf8')
    .split(/\r?\n/).filter((line) => line && !line.startsWith('#'))
    .map((line) => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
  if (properties.keyAlias !== manifest.signingKey.alias ||
      path.resolve(root, properties.storeFile) !== keyPath) {
    throw new Error('The signing configuration does not match twa-manifest.json.');
  }

  const certificate = runKeytool([
    '-exportcert', '-keystore', keyPath, '-alias', properties.keyAlias,
    '-storepass:env', 'RIMA_STORE_PASSWORD',
  ], properties.storePassword, properties.keyPassword);
  const fingerprint = crypto.createHash('sha256').update(certificate).digest('hex')
    .toUpperCase().match(/.{2}/g).join(':');
  const fingerprintName = 'Local release signing key';
  manifest.fingerprints = (manifest.fingerprints || []).filter((item) => item.name !== fingerprintName);
  manifest.fingerprints.push({ name: fingerprintName, value: fingerprint });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const directory = path.join(root, 'website', '.well-known');
  fs.mkdirSync(directory, { recursive: true });
  const assetLinks = [{
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: manifest.packageId,
      sha256_cert_fingerprints: [...new Set(manifest.fingerprints.map((item) => item.value))],
    },
  }];
  fs.writeFileSync(path.join(directory, 'assetlinks.json'), JSON.stringify(assetLinks, null, 2) + '\n');
  fs.writeFileSync(path.join(root, 'website', '.nojekyll'), '');
  console.log('Release certificate SHA-256: ' + fingerprint);
  console.log('Publish website/.well-known/assetlinks.json at https://' + manifest.host + '/.well-known/assetlinks.json');
}

try { main(); } catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
