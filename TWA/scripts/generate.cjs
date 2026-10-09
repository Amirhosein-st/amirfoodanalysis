const fs = require('node:fs/promises');
const path = require('node:path');
const { TwaGenerator, TwaManifest, ConsoleLog } = require('@bubblewrap/core');

const root = path.resolve(__dirname, '..');

async function replace(relativePath, transform) {
  const file = path.join(root, relativePath);
  await fs.writeFile(file, transform(await fs.readFile(file, 'utf8')));
}

async function main() {
  const manifest = await TwaManifest.fromFile(path.join(root, 'twa-manifest.json'));
  await new TwaGenerator().createTwaProject(root, manifest, new ConsoleLog('Rima'));

  // Keep generated projects on maintained repositories and the installed Android 15 SDK.
  const googleRepository = `google {
            url = rootProject.findProperty('rimaGoogleMavenRepository') ?: 'https://dl.google.com/dl/android/maven2/'
            content {
                includeGroupByRegex 'androidx[.].*'
                includeGroup 'com.android'
                includeGroupByRegex 'com[.]android[.].*'
                includeGroupByRegex 'com[.]google[.]android.*'
                includeGroup 'com.google.testing.platform'
            }
        }`;
  await replace('build.gradle', (text) => text
    .replaceAll('google()', googleRepository)
    .replaceAll('jcenter()', 'mavenCentral()')
    .replace('com.android.tools.build:gradle:8.9.1', 'com.android.tools.build:gradle:8.13.0'));
  await replace('gradle/wrapper/gradle-wrapper.properties', (text) => text
    .replace('gradle-8.11.1-bin.zip', 'gradle-8.14.3-all.zip')
    + '\ndistributionSha256Sum=ed1a8d686605fd7c23bdf62c7fc7add1c5b23b2bbc3721e661934ef4a4911d7c\n');

  const signing = `
// Signing credentials are local and excluded from Git.
def keystorePropertiesFile = rootProject.file('keystore.properties')
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.withInputStream { keystoreProperties.load(it) }
}
`;
  const signingConfig = `
    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            release {
                storeFile rootProject.file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
`;
  await replace('app/build.gradle', (text) => text
    .replace('compileSdkVersion 36', 'compileSdkVersion 35')
    .replace('targetSdkVersion 36', 'targetSdkVersion 35')
    .replace('androidbrowserhelper:2.6.2', 'androidbrowserhelper:2.5.0')
    .replace('android {', `${signing}\nandroid {${signingConfig}`)
    .replace('release {\n            minifyEnabled true', `release {
            if (keystorePropertiesFile.exists()) {
                signingConfig signingConfigs.release
            }
            minifyEnabled true`)
    .replace(`    lintOptions {\n        checkReleaseBuilds false\n    }\n`, ''));
  await replace('app/src/main/AndroidManifest.xml', (text) => text
    .replace(/\s+package="[^"]+"/, '')
    .replace('android:allowBackup="true"', 'android:allowBackup="true"\n        android:usesCleartextTraffic="false"'));
  console.log('Generated Android project for https://' + manifest.host + manifest.startUrl);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
