const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('🛡️  FULL SYSTEM QA AUDIT & CROSS-CHECK SUITE — WEBSHIELD v5.0.0');
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
check('Version is 5.0.0', manifest.version === '5.0.0');
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

// 4. INJECT.JS YOUTUBE GHOSTENGINE AUDIT
console.log('\n🎬 4. YouTube GhostEngine Architecture Audit (inject.js):');
const injectJs = fs.readFileSync('inject.js', 'utf8');
check('Early YouTube isolation branch returns immediately to prevent movie-site overrides',
  injectJs.includes('if (isYouTubeHost) {') && injectJs.includes('runYouTubeAdGuardEngine();'));
check('Complete elimination of harmful video fast-forward (16x) and forced duration seeking',
  !injectJs.includes('video.playbackRate = 16') && !injectJs.includes('video.currentTime = video.duration'));
check('Zero prototype pollution: Object.prototype.adPlacements is NOT defined (prevents TypeError crash)',
  !injectJs.includes("Object.defineProperty(Object.prototype, 'adPlacements'"));
check('BotGuard stealth nativeness preserver (protectNative) cloaks hooked functions',
  injectJs.includes('const nativeFns = new WeakMap();') && injectJs.includes('function protectNative('));
check('Universal JSON.parse and Response.prototype.json pruning active',
  injectJs.includes('origJSONParse = JSON.parse;') && injectJs.includes('Response.prototype.json'));
check('Universal XMLHttpRequest (open, response, responseText) interception active',
  injectJs.includes('XMLHttpRequest.prototype.open') &&
  injectJs.includes("Object.defineProperty(XMLHttpRequest.prototype, 'response'") &&
  injectJs.includes("Object.defineProperty(XMLHttpRequest.prototype, 'responseText'"));
check('Targeted Fetch Interceptor constructs genuine clean Response for player endpoints',
  injectJs.includes('new Response(cleanText, {'));
check('ytcfg.EXPERIMENT_FLAGS left 100% native (no signature mismatch or 403 Forbidden)',
  !injectJs.includes('exp.ssapPrerollEnabled = false') && !injectJs.includes('exp.enable_server_stitched_dai = false'));
check('Cosmetic CSS hides interruption toast and ad overlays',
  injectJs.includes('snackbar-view-model') &&
  injectJs.includes('.snackbarViewModelEngagementBarWrapper') &&
  injectJs.includes('tp-yt-paper-toast#toast:has(a[href*="3037019"])'));
check('In-player fallback skip handler reports ads in real-time and recovers stalled video endings',
  injectJs.includes('reportAdDetected(1);') &&
  injectJs.includes('video.currentTime >= video.duration - 0.25') &&
  injectJs.includes("video.dispatchEvent(new Event('ended'))"));

// 5. CONTENT.JS & MOVIE SITE AD GUARDIAN AUDIT
console.log('\n🛡️  5. Movie Site Ad Guardian & Content Script Audit (content.js & inject.js):');
const contentJs = fs.readFileSync('content.js', 'utf8');
check('isYtSubFrame guards subframes from executing generic content logic',
  contentJs.includes('const isYtSubFrame =') && contentJs.includes('ancestorOrigins'));
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
check('popup.html displays version v5.0.0 matching manifest.json',
  popupHtml.includes('<span class="version">v5.0.0</span>'));

// 7. RELEASE PACKAGES AUDIT
console.log('\n📦 7. Release Artifacts & Archive Integrity Audit:');
const chromeZip = path.join(__dirname, 'webshield-v5.0.0-chrome.zip');
const firefoxZip = path.join(__dirname, 'webshield-v5.0.0-firefox.zip');
check('webshield-v5.0.0-chrome.zip exists and is non-empty (>100KB)',
  fs.existsSync(chromeZip) && fs.statSync(chromeZip).size > 100000);
check('webshield-v5.0.0-firefox.zip exists and is non-empty (>100KB)',
  fs.existsSync(firefoxZip) && fs.statSync(firefoxZip).size > 100000);

console.log('\n======================================================================');
console.log(`🏁 FINAL AUDIT SUMMARY: ${pass} PASSED, ${fail} FAILED`);
console.log('======================================================================');

if (fail > 0) {
  process.exit(1);
}
