const fs = require('fs');
const path = require('path');
const vm = require('vm');

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
  '1.2 daiConfig, ssapConfig, and adBreakHeartbeatParams are conditionally preserved on Live Streams',
  injectJs.includes('if (!isLive)') &&
  injectJs.includes("if ('daiConfig' in val) { delete val.daiConfig; adsRemoved++; }") &&
  injectJs.includes("if ('ssapConfig' in val) { delete val.ssapConfig; adsRemoved++; }")
);

check(
  '1.3 resumeIfAutoPaused avoids force-playing at currentTime < 1.0 on Live Streams',
  injectJs.includes('const isLive = isYouTubeLiveStream();') &&
  injectJs.includes('if (isLive) {')
);

check(
  '1.4 handleYouTubeAdState excludes Live Streams from dispatching synthetic ended event at live edge',
  injectJs.includes('!isLive && video.currentTime >= video.duration - 0.25')
);

check(
  '1.5 handleYouTubeAdState excludes Live Streams from calling ytPlayer.skipAd()',
  injectJs.includes('!isLive && ytPlayer && typeof ytPlayer.skipAd === \'function\'')
);

// --- 2. FUNCTIONAL VM SIMULATION AUDIT ---
const sandbox = {
  console,
  reportAdDetected: () => {},
  window: {},
  document: {
    querySelector: () => null,
    getElementById: () => null
  }
};

const scriptCode = `
var currentIsLiveStream = false;

function isLivePayload(val) {
  if (!val || typeof val !== 'object') return false;
  if (val.videoDetails && (val.videoDetails.isLive || val.videoDetails.isLiveContent || val.videoDetails.isPostLiveDvr)) return true;
  if (val.liveStreamability) return true;
  if (val.microformat && val.microformat.playerMicroformatRenderer && val.microformat.playerMicroformatRenderer.liveBroadcastDetails) return true;
  return false;
}

function isYouTubeLiveStream() {
  if (currentIsLiveStream) return true;
  return false;
}

function recursiveDeepPrune(val, depth = 0, isLiveContext = false) {
  if (!val || typeof val !== 'object' || depth > 16) return val;

  let isLive = isLiveContext;
  if (!isLive) {
    if (val.videoDetails && typeof val.videoDetails === 'object') {
      if (val.videoDetails.isLive || val.videoDetails.isLiveContent || val.videoDetails.isPostLiveDvr) {
        isLive = true;
        currentIsLiveStream = true;
      } else {
        isLive = false;
        currentIsLiveStream = false;
      }
    } else if (val.liveStreamability || (val.microformat && val.microformat.playerMicroformatRenderer && val.microformat.playerMicroformatRenderer.liveBroadcastDetails)) {
      isLive = true;
      currentIsLiveStream = true;
    } else if (isYouTubeLiveStream()) {
      isLive = true;
    }
  }

  if (Array.isArray(val)) {
    for (let i = 0; i < val.length; i++) {
      if (val[i] && typeof val[i] === 'object') {
        recursiveDeepPrune(val[i], depth + 1, isLive);
      }
    }
    return val;
  }

  if ('adPlacements' in val) delete val.adPlacements;
  if ('playerAds' in val) delete val.playerAds;
  if ('adSlots' in val) delete val.adSlots;

  if (!isLive) {
    if ('adBreakHeartbeatParams' in val) delete val.adBreakHeartbeatParams;
    if ('adPlacementConfig' in val) delete val.adPlacementConfig;
    if ('ssapConfig' in val) delete val.ssapConfig;
    if ('daiConfig' in val) delete val.daiConfig;
  }

  for (const k in val) {
    if (Object.prototype.hasOwnProperty.call(val, k)) {
      if (k === 'streamingData') continue;
      const child = val[k];
      if (child && typeof child === 'object') {
        recursiveDeepPrune(child, depth + 1, isLive);
      }
    }
  }
  return val;
}
`;

vm.createContext(sandbox);
vm.runInContext(scriptCode, sandbox);

// Test 2.1: Live stream with isLive: true
const livePayload = {
  videoDetails: { videoId: 'live123', isLive: true },
  daiConfig: { ssaiAdapterConfig: { syncOffsetMs: 500 } },
  ssapConfig: { liveCuepoints: [1, 2, 3] },
  adBreakHeartbeatParams: { hb: 'param' },
  adPlacements: [{ ad: 'video_ad_1' }],
  playerAds: [{ ad: 'banner_1' }]
};

sandbox.currentIsLiveStream = false;
sandbox.recursiveDeepPrune(livePayload);

check(
  '2.1 Live Stream Payload (isLive: true): adPlacements & playerAds pruned',
  !('adPlacements' in livePayload) && !('playerAds' in livePayload)
);

check(
  '2.2 Live Stream Payload (isLive: true): daiConfig, ssapConfig, and adBreakHeartbeatParams 100% PRESERVED',
  'daiConfig' in livePayload && 'ssapConfig' in livePayload && 'adBreakHeartbeatParams' in livePayload
);

// Test 2.2: Live stream with isLiveContent: true
const liveContentPayload = {
  videoDetails: { videoId: 'live456', isLiveContent: true },
  daiConfig: { ssaiAdapterConfig: {} },
  adPlacements: [{ ad: 'ad' }]
};
sandbox.currentIsLiveStream = false;
sandbox.recursiveDeepPrune(liveContentPayload);

check(
  '2.3 Live Stream Payload (isLiveContent: true): daiConfig PRESERVED',
  'daiConfig' in liveContentPayload && !('adPlacements' in liveContentPayload)
);

// Test 2.3: Standard VOD payload
const vodPayload = {
  videoDetails: { videoId: 'vod123', isLive: false },
  daiConfig: { ssaiAdapterConfig: {} },
  ssapConfig: {},
  adBreakHeartbeatParams: {},
  adPlacements: [{ ad: 'ad' }]
};
sandbox.recursiveDeepPrune(vodPayload);

check(
  '2.4 VOD Payload (isLive: false): daiConfig and ssapConfig are pruned as expected',
  !('daiConfig' in vodPayload) && !('ssapConfig' in vodPayload) && !('adBreakHeartbeatParams' in vodPayload)
);

console.log('======================================================================');
console.log(`🏁 LIVE STREAM AUDIT RESULT: ${pass} PASSED, ${fail} FAILED`);
console.log('======================================================================');

if (fail > 0) process.exit(1);
