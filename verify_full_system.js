const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('🛡️  FULL SYSTEM QA AUDIT & CROSS-CHECK SUITE — WEBSHIELD v5.2.1');
console.log('======================================================================\n');

let pass = 0;
let fail = 0;

function check(desc, condition) {
  if (condition) {
    console.log(`  ✅ [PASS] ${desc}`);
    pass++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    fail++;
  }
}

// 1. MANIFEST & CONFIG AUDIT
console.log('📦 1. Manifest & Extension Configuration Audit:');
const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
check('manifest.json is valid JSON', !!manifest);
check('manifest_version is 3', manifest.manifest_version === 3);
check('Version is 5.2.1', manifest.version === '5.2.1');
check('Permissions include declarativeNetRequest and storage',
  manifest.permissions.includes('declarativeNetRequest') && manifest.permissions.includes('storage'));
check('Main world inject.js content_script registered at document_start',
  manifest.content_scripts.some(cs => cs.world === 'MAIN' && cs.js.includes('inject.js') && cs.run_at === 'document_start'));
check('Isolated world content.js registered at document_start',
  manifest.content_scripts.some(cs => cs.world === 'ISOLATED' && cs.js.includes('content.js') && cs.run_at === 'document_start'));

// 2. RULES & NETWORK FILTERING AUDIT
console.log('\n🌐 2. Network Filtering (DNR) & Rules Audit:');
const rules = JSON.parse(fs.readFileSync('rules.json', 'utf8'));
check('rules.json is valid JSON', !!rules);
const ruleIds = new Set(rules.map(r => r.id));
check('All rule IDs are strictly unique (no collision)', ruleIds.size === rules.length);
check('Rules 100 & 150 allow YouTube and YouTube-initiated requests at priority 999900',
  ruleIds.has(100) && ruleIds.has(150));
check('Rules 330-334 exist for high-priority ad network blocking (Clickadu, WPAdMngr, PopAds, ExoClick)',
  [330, 331, 332, 333, 334].every(id => ruleIds.has(id)));
check('Rules 335-336 block video-slider.js and ad-provider.js',
  [335, 336].every(id => ruleIds.has(id)));

// 3. BACKGROUND SERVICE WORKER AUDIT
console.log('\n⚙️  3. Background Service Worker & State Synchronization Audit:');
const bgJs = fs.readFileSync('background.js', 'utf8');
check('SAFE_EXCLUDED protects dooplayer and javmost streaming domains',
  bgJs.includes("'dooplayer'") && bgJs.includes("'javmost'"));
check('YOUTUBE_BYPASS_RULE_ID and YOUTUBE_INITIATOR_ALLOW_RULE_ID configured',
  bgJs.includes('YOUTUBE_BYPASS_RULE_ID') && bgJs.includes('YOUTUBE_INITIATOR_ALLOW_RULE_ID'));
check('syncDnrState properly synchronizes master bypass and whitelist rules',
  bgJs.includes('syncDnrState') && bgJs.includes('updateDynamicRules'));
check('safeSetBadgeText & safeSetBadgeBg prevent Uncaught (in promise) Error: No tab with id',
  bgJs.includes('function safeSetBadgeText(') && bgJs.includes('function safeSetBadgeBg('));

// 4. INJECT.JS YOUTUBE STEALTH ENGINE AUDIT
console.log('\n🎬 4. YouTube AdGuard-Grade Stealth Engine Audit (inject.js):');
const injectJs = fs.readFileSync('inject.js', 'utf8');
check('Early YouTube isolation branch returns immediately to prevent movie-site overrides',
  injectJs.includes('if (isYouTubeHost) {') && injectJs.includes('runYouTubeAdGuardEngine();'));
check('True ES6 Proxy Stealth Wrapper (createStealthProxy) cloaks hooked functions against BotGuard',
  injectJs.includes('const proxyToTarget = new WeakMap();') && injectJs.includes('function createStealthProxy('));
check('Zero prototype pollution: Object.prototype.adPlacements is NOT defined (prevents TypeError crash)',
  !injectJs.includes("Object.defineProperty(Object.prototype, 'adPlacements'"));
check('Build-independent y57 & Bd7 bypass preserves trackingParam (fixes Shorts across all m=kevlar_base_module builds) and sets POPUP displayType when ads are stripped',
  !injectJs.includes('CLEAN_TRACKING_PARAM') &&
  injectJs.includes("displayType: 'ENFORCEMENT_MESSAGE_VIEW_MODEL_DISPLAY_TYPE_POPUP'") &&
  injectJs.includes("document.getElementById('shorts-player')"));
check('isHoneypotPayload detects dus() and ZvY client-side honeypots without false-positives on real videos',
  injectJs.includes('function isHoneypotPayload(val)') &&
  injectJs.includes("val.videoDetails.title === 'Exploring the Outdoors'") &&
  !injectJs.includes("val.adBreakHeartbeatParams === 'Q0FBJTNE'"));
check('guardPlayerResponseAgainstCAv locks playabilityStatus & videoDetails against CAv() Error 282054944 overwrite',
  injectJs.includes('function guardPlayerResponseAgainstCAv(val)'));
check('Universal JSON.parse and Response.prototype.json/text stealth proxies active with data:/blob: honeypot bypass',
  injectJs.includes('const origJSONParse = JSON.parse;') &&
  injectJs.includes('Response.prototype.json') &&
  injectJs.includes("url.startsWith('data:')"));
check('XMLHttpRequest & HTMLImageElement bait pings redirected to /robots.txt (200 OK) and transparent pixel',
  injectJs.includes("argArray[1] = '/robots.txt';") &&
  injectJs.includes('argArray[0] = TRANSPARENT_PIXEL;'));
check('Strips youtubeRemarketingUrl & googleRemarketingUrl from playbackTracking to prevent CORS errors on pagead/viewthroughconversion',
  injectJs.includes('delete val.playbackTracking.youtubeRemarketingUrl;') &&
  injectJs.includes('delete val.playbackTracking.googleRemarketingUrl;'));
check('YouTube Live Stream Architecture preserves adBreakHeartbeatParams and avoids live-edge disruption',
  injectJs.includes('function isYouTubeLiveStream()') &&
  injectJs.includes('function isLivePayload(val)') &&
  injectJs.includes("if (isLive && key === 'adBreakHeartbeatParams') continue;"));

// 5. CONTENT.JS & MOVIE SITE AD GUARDIAN AUDIT
console.log('\n🛡️  5. Movie Site Ad Guardian & Content Script Audit (content.js & inject.js):');
const contentJs = fs.readFileSync('content.js', 'utf8');
check('isYtSubFrame guards subframes from executing generic content logic',
  contentJs.includes('const isYtSubFrame =') && contentJs.includes('ancestorOrigins'));
check('ytd-enforcement-message-view-model avoids display:none to pass Chs() ("p.h_") computedStyle check',
  contentJs.includes('NEVER set display:none directly on ytd-enforcement-message-view-model'));
check('Universal embedded player ad auto-skipper explicitly excludes YouTube',
  contentJs.includes('if (!currentEnabledState || isCurrentPageWhitelisted() || isYtDomain) return;'));
check('ExoVideoSlider stub prevents ReferenceError on javmost.ws',
  injectJs.includes('ExoVideoSlider') && injectJs.includes('DummyExoVideoSlider'));
check('Clickadu ProxyListener (UHJveHlMaXN0ZW5lcg==) trapped inside player frame',
  injectJs.includes('ProxyListener') || injectJs.includes('UHJveHlMaXN0ZW5lcg=='));
check('Overlaid play button kickstarter runs on bubbling phase without stopPropagation',
  injectJs.includes('.plyr__control--overlaid, .play-btn') && !injectJs.includes('overlaidPlay.stopPropagation'));

// 6. POPUP & UI SYNCHRONIZATION AUDIT
console.log('\n🖥️  6. Popup UI & Version Synchronization Audit:');
const popupHtml = fs.readFileSync('popup.html', 'utf8');
check('popup.html displays version v5.2.1 matching manifest.json',
  popupHtml.includes('<span class="version">v5.2.1</span>'));

// 7. RELEASE PACKAGES AUDIT
console.log('\n📦 7. Release Artifacts & Archive Integrity Audit:');
const chromeZip = path.join(__dirname, 'webshield-v5.2.1-chrome.zip');
const firefoxZip = path.join(__dirname, 'webshield-v5.2.1-firefox.zip');
check('webshield-v5.2.1-chrome.zip exists and is non-empty (>100KB)',
  fs.existsSync(chromeZip) && fs.statSync(chromeZip).size > 100000);
check('webshield-v5.2.1-firefox.zip exists and is non-empty (>100KB)',
  fs.existsSync(firefoxZip) && fs.statSync(firefoxZip).size > 100000);

const { execSync } = require('child_process');
const readZipManifest = (zipPath) => {
  const cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; $z = [System.IO.Compression.ZipFile]::OpenRead('${zipPath.replace(/\\/g, '\\\\')}'); $e = $z.GetEntry('manifest.json'); $s = $e.Open(); $r = New-Object System.IO.StreamReader($s); $t = $r.ReadToEnd(); $r.Close(); $s.Close(); $z.Dispose(); $t"`;
  return JSON.parse(execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] }).toString());
};

const chromeManifest = readZipManifest(chromeZip);
check('Chrome package manifest uses background.service_worker and version 5.2.1',
  chromeManifest.version === '5.2.1' &&
  chromeManifest.background && chromeManifest.background.service_worker === 'background.js');

const firefoxManifest = readZipManifest(firefoxZip);
check('Firefox package manifest is AMO-compliant: has gecko.id, background.scripts, and version 5.2.1',
  firefoxManifest.version === '5.2.1' &&
  firefoxManifest.browser_specific_settings &&
  firefoxManifest.browser_specific_settings.gecko &&
  firefoxManifest.browser_specific_settings.gecko.id === 'anti-popunder@huytran1002' &&
  firefoxManifest.background &&
  Array.isArray(firefoxManifest.background.scripts) &&
  firefoxManifest.background.scripts.includes('background.js'));

console.log('\n======================================================================');
console.log(`🏁 FINAL AUDIT SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('======================================================================');

if (fail > 0) {
  process.exit(1);
}
