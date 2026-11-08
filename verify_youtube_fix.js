const fs = require('fs');
const path = require('path');

console.log('===============================================================');
console.log('🧪 VERIFICATION SUITE: YOUTUBE PLAYBACK 403 & ERROR 282054944 FIX');
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

// 1. Anti-Adblock Bait Check Verification (.ytp-ad-module & ytd-enforcement-message-view-model)
check(
  '1.1 .ytp-ad-module does NOT have display: none in content.js (prevents client getComputedStyle bait detection)',
  contentJs.includes('NEVER apply display:none to .ytp-ad-module')
);

check(
  '1.2 ytd-enforcement-message-view-model does NOT have display: none in content.js (passes Chs() "p.h_" check)',
  contentJs.includes('NEVER set display:none directly on ytd-enforcement-message-view-model')
);

// 2. Static DNR Rule 150 Initiator Allowances
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

// 3. Cross-Origin Frame Protection
check(
  '3.1 inject.js subframe check completely avoids cross-origin window.top property access',
  !injectJs.includes('window.top.document') &&
  !injectJs.includes('window.top.location') &&
  injectJs.includes('window.location.ancestorOrigins')
);

check(
  '3.2 content.js isYtSubFrame completely avoids cross-origin window.top property access',
  !contentJs.includes('window.top.document') &&
  !contentJs.includes('window.top.location') &&
  contentJs.includes('window.location.ancestorOrigins')
);

// 4. Invalidation Context Net Error Guard
check(
  '4.1 content.js ensureMainWorldLoaded validates scriptUrl against invalid context before DOM attachment',
  contentJs.includes("if (!scriptUrl || scriptUrl.includes('invalid')) return;")
);

// 5. Error 282054944 & Honeypot Protection
check(
  '5.1 inject.js guards playabilityStatus & videoDetails against CAv() Error 282054944 overwrite',
  injectJs.includes('function guardPlayerResponseAgainstCAv(val)') &&
  injectJs.includes('CLEAN_TRACKING_PARAM')
);

check(
  '5.2 handleFallbackAdState only inspects #movie_player to avoid triggering DuY() ("p.m_") honeypot',
  injectJs.includes("const ytPlayer = document.getElementById('movie_player');") &&
  !injectJs.includes("const ytPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');")
);

console.log('===============================================================');
console.log(`🎉 RESULT: ${pass} PASSED, ${fail} FAILED`);
console.log('===============================================================');

if (fail > 0) process.exit(1);
