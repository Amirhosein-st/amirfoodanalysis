const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'twa-manifest.json'), 'utf8'));

async function main() {
  const launchUrl = 'https://' + manifest.host + manifest.startUrl;
  assert.equal(launchUrl, 'https://amirhosein-st.github.io/amirfoodanalysis/');
  assert.match(manifest.packageId, /^[a-z][\w]*(\.[a-z][\w]*)+$/);
  const androidManifest = fs.readFileSync(path.join(root, 'app/src/main/AndroidManifest.xml'), 'utf8');
  assert.ok(androidManifest.includes('android:pathPrefix="/amirfoodanalysis/"'), 'App links must be scoped to this project.');
  assert.ok(androidManifest.includes('android.support.customtabs.trusted.DEFAULT_URL'));

  const links = JSON.parse(fs.readFileSync(path.join(root, 'website/.well-known/assetlinks.json'), 'utf8'));
  const statement = links.find((item) => item.target.package_name === manifest.packageId);
  assert.ok(statement, 'Local asset links must contain this Android package.');
  for (const { value } of manifest.fingerprints) {
    assert.match(value, /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/);
    assert.ok(statement.target.sha256_cert_fingerprints.includes(value));
  }
  assert.ok(manifest.fingerprints.length > 0, 'Run npm run setup-signing first.');

  for (const url of [launchUrl, manifest.iconUrl, manifest.webManifestUrl]) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `${url} must return HTTP 200.`);
    if (url === manifest.webManifestUrl) {
      const webManifest = await response.json();
      assert.equal(new URL(webManifest.start_url, url).href, launchUrl);
      assert.equal(new URL(webManifest.scope, url).pathname, '/amirfoodanalysis/');
    }
    console.log('OK ' + url);
  }

  const verificationUrl = 'https://' + manifest.host + '/.well-known/assetlinks.json';
  const response = await fetch(verificationUrl, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  if (response.status !== 200) {
    console.log(`PENDING domain verification (HTTP ${response.status}): publish website/.well-known/assetlinks.json at ${verificationUrl}`);
    return;
  }
  const remoteLinks = await response.json();
  const remoteStatement = remoteLinks.find((item) =>
    item.target?.package_name === manifest.packageId &&
    item.relation?.includes('delegate_permission/common.handle_all_urls'));
  assert.ok(remoteStatement, 'Hosted asset links do not authorize this package.');
  assert.ok(/application\/json/i.test(response.headers.get('content-type') || ''), 'Asset links must be served as application/json.');
  for (const { value } of manifest.fingerprints) {
    assert.ok(remoteStatement.target.sha256_cert_fingerprints.includes(value), 'Hosted asset links do not authorize this signing certificate.');
  }
  console.log('OK domain verification');
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
