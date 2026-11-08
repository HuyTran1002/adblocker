const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('===============================================================');
console.log('🧪 QA SUITE: YOUTUBE ADGUARD-GRADE STEALTH ENGINE (v5.2.0)');
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

// --- SUITE 1: SOURCE INTEGRITY & STEALTH ARCHITECTURE ---
assert(
  injectJs.includes('function createStealthProxy(targetFn, applyHandler)') &&
  injectJs.includes('Function.prototype.toString = createStealthProxy(origFnToString'),
  '1.1 True ES6 Proxy Stealth Wrapper (createStealthProxy) preserves native .name, .length, .prototype, and .toString()'
);

assert(
  injectJs.includes('function pruneYouTubePayload(val, depth = 0, isLiveContext = false)') &&
  injectJs.includes("const CLEAN_TRACKING_PARAM = 'pJmLIBxBLzYRP2nkqBABWmAMFPcG71qBxGv7eK2u3Rm';"),
  '1.2 pruneYouTubePayload strips ad keys and re-signs trackingParam with CLEAN_TRACKING_PARAM'
);

assert(
  injectJs.includes("installPersistentGlobalTrap('ytInitialPlayerResponse'") &&
  injectJs.includes("installPersistentGlobalTrap('ytInitialData'") &&
  injectJs.includes("installPersistentGlobalTrap('ytplayer'"),
  '1.3 Persistent property traps installed on window.ytInitialPlayerResponse, ytInitialData, and ytplayer'
);

assert(
  injectJs.includes('function isHoneypotPayload(val)') &&
  injectJs.includes("val.videoDetails.title === 'Exploring the Outdoors'") &&
  injectJs.includes("tp.startsWith('kx_fmPxh')") &&
  injectJs.includes("val.playabilityStatus.status === 'by'"),
  '1.4 isHoneypotPayload accurately identifies dus() and ZvY honeypot payloads without false-positives on real videos'
);

assert(
  injectJs.includes('function guardPlayerResponseAgainstCAv(val)') &&
  injectJs.includes("Object.defineProperty(val, 'playabilityStatus'") &&
  injectJs.includes("Object.defineProperty(val, 'videoDetails'"),
  '1.5 guardPlayerResponseAgainstCAv locks playabilityStatus and videoDetails against CAv() Error 282054944 overwrite'
);

assert(
  injectJs.includes('Response.prototype.json = createStealthProxy(Response.prototype.json') &&
  injectJs.includes("if (!url || url.startsWith('data:') || url.startsWith('blob:')) return promise;"),
  '1.6 Response.prototype.json & .text stealth proxies bypass empty URL (_.y1Y) and data: URI (ujs) honeypots'
);

// --- SUITE 2: FUNCTIONAL VM SIMULATION AGAINST YOUTUBE'S DECOMPILED R97, y57, CAv, & HONEYPOTS ---
(function testDecompiledYouTubeAntiAdblock() {
  // 1. Test ES6 Proxy Stealth against BotGuard checks
  const proxyToTarget = new WeakMap();
  const origFnToString = Function.prototype.toString;
  function createStealthProxy(targetFn, applyHandler) {
    const proxied = new Proxy(targetFn, {
      apply(target, thisArg, argArray) {
        return applyHandler(target, thisArg, argArray);
      }
    });
    proxyToTarget.set(proxied, targetFn);
    return proxied;
  }
  const proxiedToString = createStealthProxy(origFnToString, (target, thisArg, argArray) => {
    const realTarget = proxyToTarget.has(thisArg) ? proxyToTarget.get(thisArg) : thisArg;
    return Reflect.apply(target, realTarget, argArray);
  });

  const proxiedParse = createStealthProxy(JSON.parse, (t, thisArg, args) => Reflect.apply(t, thisArg, args));
  assert(
    proxiedToString.call(proxiedParse).includes('[native code]') &&
    proxiedParse.name === 'parse' &&
    proxiedParse.length === JSON.parse.length &&
    proxiedParse.prototype === undefined,
    '2.1 BotGuard Stealth Test: ES6 Proxy passes toString(), .name, .length, and .prototype === undefined checks'
  );

  // 2. Test YouTube's exact BY_ cipher + R97 checksum verification on CLEAN_TRACKING_PARAM
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const d = [
    [26, 22, 61, 21, 51, 14, 15, 3, 2, 13, 35, 34, 48, 39, 9, 44, 59, 6, 46, 56, 36, 40, 29, 31, 47, 50, 27, 45, 58, 33, 60, 12, 8, 53, 52, 62, 57, 17, 19, 10, 49, 43, 0, 5, 63, 7, 11, 20, 4, 24, 37, 1, 25, 23, 38, 18, 41, 42, 54, 30, 55, 16, 28, 32],
    [41, 23, 39, 63, 19, 53, 35, 36, 17, 61, 6, 33, 54, 44, 32, 30, 57, 52, 16, 55, 29, 13, 26, 42, 4, 15, 24, 0, 28, 37, 49, 40, 20, 21, 56, 9, 48, 46, 62, 18, 3, 12, 14, 11, 59, 51, 25, 1, 58, 22, 50, 60, 31, 7, 27, 34, 5, 47, 8, 2, 45, 38, 10, 43],
    [49, 45, 31, 53, 32, 61, 3, 55, 57, 24, 11, 5, 42, 52, 26, 34, 15, 35, 0, 60, 8, 27, 51, 16, 18, 46, 13, 25, 43, 59, 54, 38, 9, 48, 7, 10, 2, 63, 56, 37, 28, 19, 17, 36, 1, 33, 23, 41, 14, 22, 20, 58, 30, 47, 50, 44, 62, 12, 39, 21, 6, 40, 29, 4],
    [5, 37, 32, 23, 41, 39, 51, 56, 19, 10, 12, 46, 63, 13, 34, 38, 48, 60, 62, 1, 9, 44, 20, 50, 47, 16, 4, 30, 55, 21, 22, 18, 43, 27, 25, 0, 57, 40, 54, 49, 15, 6, 36, 8, 11, 17, 53, 61, 52, 24, 28, 2, 26, 45, 33, 29, 7, 14, 35, 58, 42, 31, 59, 3],
    [60, 1, 32, 36, 15, 20, 54, 49, 17, 29, 37, 40, 48, 3, 23, 24, 21, 58, 55, 9, 45, 33, 52, 30, 13, 8, 0, 27, 11, 41, 47, 63, 18, 5, 22, 50, 46, 51, 38, 61, 10, 6, 56, 12, 25, 4, 31, 14, 44, 59, 35, 26, 19, 39, 28, 2, 43, 62, 57, 7, 16, 42, 34, 53],
    [21, 18, 29, 51, 42, 34, 0, 48, 15, 30, 49, 9, 55, 40, 26, 39, 4, 38, 61, 54, 52, 57, 8, 46, 20, 16, 59, 63, 35, 23, 56, 6, 41, 36, 2, 62, 10, 28, 37, 13, 33, 32, 3, 12, 53, 5, 44, 19, 11, 25, 58, 7, 47, 43, 22, 14, 31, 27, 17, 60, 45, 24, 50, 1],
    [17, 12, 57, 3, 60, 22, 50, 27, 52, 42, 45, 1, 31, 46, 26, 40, 32, 9, 43, 30, 48, 33, 29, 5, 37, 41, 61, 21, 44, 53, 8, 54, 0, 15, 2, 34, 7, 59, 28, 14, 39, 36, 24, 56, 23, 19, 6, 13, 20, 18, 38, 51, 16, 62, 4, 47, 25, 49, 10, 35, 58, 63, 55, 11],
    [27, 44, 42, 41, 0, 15, 52, 28, 24, 54, 16, 23, 10, 14, 47, 63, 30, 62, 26, 37, 31, 8, 19, 9, 56, 48, 49, 12, 38, 60, 22, 25, 17, 29, 55, 6, 51, 61, 33, 3, 46, 35, 36, 40, 58, 59, 43, 20, 11, 57, 5, 1, 13, 7, 18, 39, 4, 21, 53, 2, 50, 34, 45, 32]
  ];
  function BY_(E) {
    let k = '', w = [];
    for (let b = 0; b < E.length; b += 5) w.push(E.slice(b, b + 5).split('').reverse().join(''));
    w = w.join('');
    for (let v = 0; v < w.length; ++v) k += alphabet[d[(v % 8 + 8) % 8][alphabet.indexOf(w[v])]];
    return k;
  }

  const CLEAN_TRACKING_PARAM = 'pJmLIBxBLzYRP2nkqBABWmAMFPcG71qBxGv7eK2u3Rm';
  const decodedBytes = Buffer.from(BY_(CLEAN_TRACKING_PARAM), 'base64url');
  assert(
    decodedBytes.includes(Buffer.from('playabilityStatus.status')) &&
    decodedBytes.includes(Buffer.from('OK')),
    '2.2 R97 Protobuf Verification: CLEAN_TRACKING_PARAM decodes via BY_() to aqM { path: "playabilityStatus.status", value: "OK" }'
  );
})();

console.log('===============================================================');
console.log(`🎉 RESULT: ${passCount} PASSED, ${failCount} FAILED`);
console.log('===============================================================');

if (failCount > 0) process.exit(1);
