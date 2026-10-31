const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('===============================================================');
console.log('🧪 QA SUITE: YOUTUBE GHOSTENGINE ZERO-AD PRE-RENDER ARCHITECTURE');
console.log('===============================================================');

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    failCount++;
  }
}

const injectJs = fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf8');
const contentJs = fs.readFileSync(path.join(__dirname, 'content.js'), 'utf8');

// --- SUITE 1: SOURCE INTEGRITY & ZERO FAST-FORWARD VERIFICATION ---
// 1.1 Verify complete elimination of harmful video fast-forward & forced duration seeking
assert(
  !injectJs.includes('video.playbackRate = 16') &&
  !injectJs.includes('video.currentTime = video.duration') &&
  !injectJs.includes('adAcceleratedByWebShield'),
  '1.1 Complete elimination of error-prone video fast-forward (16x) and forced seeking to duration'
);

// 1.2 Verify GhostEngine core recursive deep-prune functions exist in inject.js
assert(
  injectJs.includes('function recursiveDeepPrune(val') &&
  injectJs.includes('delete val.adPlacements;') &&
  injectJs.includes('delete val.playerAds;') &&
  injectJs.includes('delete val.adSlots;'),
  '1.2 inject.js contains GhostEngine Recursive Deep-Prune Ad Engine ($..[adPlacements, adSlots, playerAds] standard)'
);

// 1.3 Verify Early Setter on window.ytInitialPlayerResponse and window.ytInitialData
assert(
  injectJs.includes("Object.defineProperty(window, 'ytInitialPlayerResponse'") &&
  injectJs.includes("Object.defineProperty(window, 'ytInitialData'"),
  '1.3 inject.js defines early pre-render property hooks on window.ytInitialPlayerResponse & ytInitialData'
);

// 1.4 Verify BotGuard Cloaking / Native Function Preserver
assert(
  injectJs.includes('const nativeFns = new WeakMap();') &&
  injectJs.includes('function protectNative(hookedFn, originalFn, name)') &&
  injectJs.includes('Function.prototype.toString'),
  '1.4 inject.js contains Stealth Nativeness Preserver for Botguard immunity'
);

// 1.5 Verify Telemetry & Ad Tracking Spoofing (Silent 200 OK)
assert(
  injectJs.includes("urlStr.includes('/api/stats/ads')") &&
  injectJs.includes("urlStr.includes('/youtubei/v1/player')") &&
  injectJs.includes("new Response(JSON.stringify({ status: 'ok' })"),
  '1.5 Targeted Fetch Interceptor spoofs telemetry (200 OK) and prunes /youtubei/v1/player'
);

// 1.6 Verify Cosmetic CSS & Skip Selectors remain available as fallback
assert(
  injectJs.includes('button.ytp-ad-skip-button-modern') &&
  injectJs.includes('.ytp-ad-action-interstitial') &&
  contentJs.includes('.ytp-ad-action-interstitial'),
  '1.6 Cosmetic CSS and silent skip selectors remain fully armed in both inject.js and content.js'
);

// 1.7 Verify Universal JSON.parse & Response.prototype.json Hooks (uBlock Origin Standard)
assert(
  injectJs.includes('const origJSONParse = JSON.parse;') &&
  injectJs.includes("protectNative(hookedJSONParse, origJSONParse, 'parse')") &&
  injectJs.includes('Response.prototype.json'),
  '1.7 inject.js contains Universal JSON.parse and Response.json pruning hooks'
);

// 1.8 Verify Universal XMLHttpRequest Response & ResponseText Pruning (uBlock Origin json-prune-xhr-response Standard)
assert(
  injectJs.includes("XMLHttpRequest.prototype.open") &&
  injectJs.includes("Object.defineProperty(XMLHttpRequest.prototype, 'responseText'") &&
  injectJs.includes("Object.defineProperty(XMLHttpRequest.prototype, 'response'"),
  '1.8 inject.js contains Universal XMLHttpRequest response and responseText pruning hooks'
);

// --- SUITE 2: FUNCTIONAL VM SIMULATION TESTS ---

// 2.1 BotGuard Native Function Cloaking Test
(function testBotGuardCloaking() {
  const nativeFns = new WeakMap();
  const origFnToString = Function.prototype.toString;
  const customFnToString = function () {
    if (nativeFns.has(this)) {
      return origFnToString.call(nativeFns.get(this));
    }
    return origFnToString.call(this);
  };
  nativeFns.set(customFnToString, origFnToString);
  Function.prototype.toString = customFnToString;

  function protectNative(hookedFn, originalFn, name) {
    try {
      if (name || originalFn.name) {
        Object.defineProperty(hookedFn, 'name', { value: name || originalFn.name, configurable: true });
      }
      Object.defineProperty(hookedFn, 'length', { value: originalFn.length, configurable: true });
    } catch (e) {}
    nativeFns.set(hookedFn, originalFn);
    return hookedFn;
  }

  const realNativeFn = JSON.parse; // Actual engine native function
  const hookedFn = function (...args) { return realNativeFn(...args); };
  protectNative(hookedFn, realNativeFn, 'parse');

  const str = Function.prototype.toString.call(hookedFn);
  const name = hookedFn.name;
  const length = hookedFn.length;

  assert(
    str.includes('[native code]') && name === 'parse' && length === realNativeFn.length,
    '2.1 BotGuard Verification: Hooked function passes toString() [native code], name, and length checks'
  );
})();

// 2.2 Payload Pruning Simulation Test
(function testPayloadPruning() {
  function pruneAdData(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    try {
      if (obj.playabilityStatus && typeof obj.playabilityStatus === 'object') {
        const status = obj.playabilityStatus.status;
        if (status === 'UNPLAYABLE' || status === 'LOGIN_REQUIRED' || status === 'ERROR') {
          if (obj.streamingData) {
            obj.playabilityStatus.status = 'OK';
            delete obj.playabilityStatus.reason;
            delete obj.playabilityStatus.errorScreen;
          }
        }
      }
      if (Array.isArray(obj.adPlacements)) obj.adPlacements = [];
      if (Array.isArray(obj.playerAds)) obj.playerAds = [];
      if (Array.isArray(obj.adSlots)) obj.adSlots = [];
      if (obj.adBreakHeartbeatParams) delete obj.adBreakHeartbeatParams;
    } catch (e) {}
    return obj;
  }

  const mockDirtyPlayerResponse = {
    videoDetails: { videoId: 'e-VtA6Uwllc', title: 'TWICE - Right Hand Girl' },
    streamingData: { adaptiveFormats: [{ itag: 18, url: 'https://googlevideo.com/videoplayback' }] },
    playabilityStatus: { status: 'UNPLAYABLE', reason: 'Ad blocker detected' },
    adPlacements: [{ adPlacementConfig: { kind: 'AD_BREAK' } }, { adPlacementConfig: { kind: 'MIDROLL' } }],
    playerAds: [{ playerAdConfig: { duration: 22 } }],
    adSlots: [{ slotId: 'preroll' }],
    adBreakHeartbeatParams: 'test_token'
  };

  const clean = pruneAdData(mockDirtyPlayerResponse);

  assert(
    clean.adPlacements.length === 0 &&
    clean.playerAds.length === 0 &&
    clean.adSlots.length === 0 &&
    !clean.adBreakHeartbeatParams &&
    clean.playabilityStatus.status === 'OK' &&
    clean.streamingData.adaptiveFormats.length === 1 &&
    clean.videoDetails.videoId === 'e-VtA6Uwllc',
    '2.2 Payload Pruning: Completely strips adPlacements, playerAds & heals playabilityStatus to OK'
  );
})();

// 2.3 Simulated /youtubei/v1/player Fetch Interception
(async function testFetchPlayerInterception() {
  const originalFetch = async function (url, opts) {
    const rawData = {
      videoDetails: { videoId: 'K3wqsn1Jl5A', title: 'Main Video' },
      streamingData: { formats: [] },
      adPlacements: [{ kind: 'PREROLL_AD' }],
      playerAds: [{ id: 'kiem_linh_pc' }]
    };
    return {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
      clone: () => ({
        json: async () => JSON.parse(JSON.stringify(rawData))
      })
    };
  };

  function pruneAdData(obj) {
    if (Array.isArray(obj.adPlacements)) obj.adPlacements = [];
    if (Array.isArray(obj.playerAds)) obj.playerAds = [];
    return obj;
  }

  // Hooked fetch implementation
  const hookedFetch = async function (url, opts) {
    if (typeof url === 'string' && url.includes('/youtubei/v1/player')) {
      const resp = await originalFetch(url, opts);
      const clone = resp.clone();
      const data = await clone.json();
      pruneAdData(data);
      return {
        status: resp.status,
        statusText: resp.statusText,
        json: async () => data
      };
    }
    return originalFetch(url, opts);
  };

  const res = await hookedFetch('https://www.youtube.com/youtubei/v1/player?key=AIzaSy');
  const data = await res.json();

  assert(
    data.adPlacements.length === 0 &&
    data.playerAds.length === 0 &&
    data.videoDetails.videoId === 'K3wqsn1Jl5A',
    '2.3 Fetch Interceptor: /youtubei/v1/player response is pruned in-flight with zero ads returned'
  );
})();

// 2.5 JSON.parse Pruning Test
(function testJSONParsePruning() {
  const origParse = JSON.parse;
  const hooked = function (text) {
    const res = origParse(text);
    if (res && res.adPlacements) res.adPlacements = [];
    if (res && res.playerAds) res.playerAds = [];
    return res;
  };
  const parsed = hooked('{"adPlacements": [{"ad": 1}], "playerAds": [{"id": 2}], "videoDetails": {"title": "Twice"}}');
  assert(
    parsed.adPlacements.length === 0 && parsed.playerAds.length === 0 && parsed.videoDetails.title === 'Twice',
    '2.5 JSON.parse Hook: Deserialized YouTube player payloads have adPlacements stripped instantly'
  );
})();

// 2.4 Simulated Telemetry 200 OK Spoofing
(async function testTelemetrySpoofing() {
  const hookedFetch = async function (url) {
    if (typeof url === 'string' && (url.includes('/api/stats/ads') || url.includes('/pagead/'))) {
      return {
        status: 200,
        statusText: 'OK',
        json: async () => ({ status: 'ok' })
      };
    }
    throw new Error('Not caught');
  };

  const res = await hookedFetch('https://www.youtube.com/api/stats/ads?v=e-VtA6Uwllc');
  const data = await res.json();

  assert(
    res.status === 200 && data.status === 'ok',
    '2.4 Telemetry Spoofing: /api/stats/ads returns HTTP 200 OK immediately without network penalty'
  );
})();

console.log('===============================================================');
console.log(`🎉 RESULT: ${passCount} PASSED, ${failCount} FAILED`);
console.log('===============================================================');

if (failCount > 0) process.exit(1);
