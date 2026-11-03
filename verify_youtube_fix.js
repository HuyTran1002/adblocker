const fs = require('fs');
const path = require('path');

console.log('===============================================================');
console.log('🧪 VERIFICATION SUITE: YOUTUBE PLAYBACK 403 & AUTO-PAUSE RESOLUTION');
console.log('===============================================================');

let pass = 0;
let fail = 0;

function check(name, condition) {
  if (condition) {
    console.log(`✅ [PASS] ${name}`);
    pass++;
  } else {
    console.error(`❌ [FAIL] ${name}`);
    fail++;
  }
}

const injectJs = fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf8');
const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');
const rulesJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'rules.json'), 'utf8'));

// 1. Anti-Adblock Bait Check Verification
// Ensure .ytp-ad-module is NEVER styled with display: none or visibility: hidden
const injectCssMatch = injectJs.match(/style\.textContent = `([\s\S]*?)`;/);
const injectCss = injectCssMatch ? injectCssMatch[1] : '';

check(
  '1.1 .ytp-ad-module does NOT have display: none in inject.js (prevents client getComputedStyle bait detection)',
  !injectCss.includes('.ytp-ad-module,\n') && !injectCss.includes('.ytp-ad-module,') && !injectCss.includes('.ytp-ad-module { display: none')
);

check(
  '1.2 .ytp-ad-module has pointer-events: none in inject.js without hiding the element',
  injectCss.includes('.ytp-ad-module {\n            pointer-events: none !important;\n          }')
);

// 2. Static DNR Rule 150 Initiator Allowances (Eliminates 13 Fetch failed loading: POST)
const rule150 = rulesJson.find(r => r.id === 150);
check(
  '2.1 DNR Rule 150 exists in rules.json with allow action and priority 999900',
  rule150 && rule150.action && rule150.action.type === 'allow' && rule150.priority === 999900
);

check(
  '2.2 Rule 150 allows YouTube-initiated requests to doubleclick.net and googlesyndication.com',
  rule150 &&
  rule150.condition &&
  rule150.condition.requestDomains.includes('doubleclick.net') &&
  rule150.condition.requestDomains.includes('googleads.g.doubleclick.net') &&
  rule150.condition.requestDomains.includes('googlesyndication.com') &&
  rule150.condition.requestDomains.includes('googleadservices.com')
);

// 3. Cross-Origin Frame Protection (Eliminates 43 Unsafe attempt to load URL console errors)
check(
  '3.1 inject.js subframe check completely avoids cross-origin window.top property access',
  !injectJs.includes('window.top.document') &&
  !injectJs.includes('window.top.location') &&
  injectJs.includes('window.location.ancestorOrigins')
);

check(
  '3.2 overrideWindowOpen in inject.js avoids win.location.origin cross-origin security violations',
  !injectJs.includes('win.location.origin !== window.location.origin') &&
  injectJs.includes('if (!win.document) return;')
);

check(
  '3.3 content.js isYtSubFrame completely avoids cross-origin window.top property access',
  !contentJs.includes('window.top.document') &&
  !contentJs.includes('window.top.location') &&
  contentJs.includes('window.location.ancestorOrigins')
);

// 4. Invalidation Context Net Error Guard (Eliminates net::ERR_FAILED on chrome-extension://invalid)
check(
  '4.1 content.js ensureMainWorldLoaded validates scriptUrl against invalid context before DOM attachment',
  contentJs.includes("if (!scriptUrl || scriptUrl.includes('invalid')) return;")
);

// 5. Video Playback Pause Recovery & Enforcement Dismissal Auto-Resume
check(
  '5.1 inject.js resumes video playback when dismissing enforcement modal',
  injectJs.includes('if (video && video.paused && !video.ended && !userManuallyPaused)') &&
  injectJs.includes('if (ytPlayer && typeof ytPlayer.playVideo === \'function\')')
);

check(
  '5.2 resumeIfAutoPaused recovers playback during ad interruptions even if currentTime >= 0.5s',
  injectJs.includes("document.querySelector('.ad-showing, .ad-interrupting, [class*=\"ad-showing\"]') !== null")
);

console.log('===============================================================');
console.log(`🎉 RESULT: ${pass} PASSED, ${fail} FAILED`);
console.log('===============================================================');

if (fail > 0) process.exit(1);

