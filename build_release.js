const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SRC = path.resolve(__dirname);
const OUT = path.dirname(SRC);

const REQUIRED_FILES = [
  'manifest.json', 'background.js', 'inject.js', 'content.js',
  'popup.html', 'popup.css', 'popup.js', 'rules.json', 'icon128.png'
];

function buildPackage(platform) {
  const tmpDir = path.join(OUT, `adblock_max_${platform}_tmp`);

  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  for (const f of REQUIRED_FILES) {
    fs.copyFileSync(path.join(SRC, f), path.join(tmpDir, f));
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(tmpDir, 'manifest.json'), 'utf8'));

  if (platform === 'chrome') {
    delete manifest.browser_specific_settings;
    manifest.background = { service_worker: 'background.js' };
  } else if (platform === 'firefox') {
    manifest.background = { scripts: ['background.js'] };
    manifest.browser_specific_settings = {
      gecko: {
        id: 'anti-popunder@huytran1002',
        strict_min_version: '113.0',
        data_collection_permissions: {
          required: ['none']
        }
      }
    };
  }

  fs.writeFileSync(path.join(tmpDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const zipName = `adblock-max-v${manifest.version}-${platform}.zip`;
  const zipPath = path.join(OUT, zipName);
  const zipPathInRoot = path.join(SRC, zipName);

  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  if (fs.existsSync(zipPathInRoot)) fs.unlinkSync(zipPathInRoot);

  const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${tmpDir}\\*' -DestinationPath '${zipPath}' -Force"`;
  execSync(psCmd, { stdio: 'pipe' });

  fs.copyFileSync(zipPath, zipPathInRoot);
  fs.rmSync(tmpDir, { recursive: true, force: true });

  const zipStat = fs.statSync(zipPath);
  console.log(`[${platform.toUpperCase()}] Created: ${zipName} (${(zipStat.size / 1024).toFixed(0)} KB)`);
  return zipPath;
}

console.log('Building Adblock Max v3.5.0 packages for Chrome and Firefox...\n');
buildPackage('chrome');
buildPackage('firefox');
console.log('\nPackaging complete!');
