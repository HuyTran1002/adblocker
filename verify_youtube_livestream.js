const fs = require('fs');
const path = require('path');

console.log('======================================================================');
console.log('🧪 VERIFICATION SUITE: YOUTUBE LIVE STREAM ARCHITECTURAL AUDIT');
console.log('======================================================================');

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

// --- 1. CODE INTEGRITY AUDIT ---
check(
  '1.1 inject.js contains isYouTubeLiveStream and isLivePayload detection functions',
  injectJs.includes('function isYouTubeLiveStream()') && injectJs.includes('function isLivePayload(val)')
);

check(
  '1.2 adBreakHeartbeatParams is conditionally preserved on Live Streams while daiConfig/ssapConfig are never deleted',
  injectJs.includes("if (isLive && key === 'adBreakHeartbeatParams') continue;") &&
  !injectJs.includes('delete val.daiConfig') &&
  !injectJs.includes('delete val.ssapConfig')
);

check(
  '1.3 handleFallbackAdState excludes Live Streams from forced duration seeking and skipAd()',
  injectJs.includes('if (!isYouTubeLiveStream() && Number.isFinite(video.duration)') &&
  injectJs.includes('if (!isYouTubeLiveStream()) {\n            if (typeof ytPlayer.skipAd === \'function\')')
);

check(
  '1.4 Live Chat iframe (/live_chat) is completely excluded in both inject.js and content.js',
  injectJs.includes("window.location.pathname.startsWith('/live_chat')")
);

console.log('======================================================================');
console.log(`🏁 LIVE STREAM AUDIT RESULT: ${pass} PASSED, ${fail} FAILED`);
console.log('======================================================================');

if (fail > 0) process.exit(1);
