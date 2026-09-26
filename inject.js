(function () {
  // Developed by HuyTran1002
  console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');

  // Skip sensitive authentication, identity provider, developer portal, and extension store domains
  const SENSITIVE_DOMAINS = [
    'accounts.firefox.com', 'addons.mozilla.org', 'mozilla.org',
    'accounts.google.com', 'myaccount.google.com', 'chromewebstore.google.com', 'chrome.google.com',
    'login.microsoftonline.com', 'login.live.com', 'appleid.apple.com',
    'github.com', 'gitlab.com', 'id.atlassian.com', 'auth0.com',
    'paypal.com', 'stripe.com'
  ];
  const currentHost = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
  if (SENSITIVE_DOMAINS.some(d => currentHost === d || currentHost.endsWith('.' + d))) {
    return; // Completely inactive on sensitive/auth domains
  }

  const isYouTube = currentHost.includes('youtube.com') ||
    currentHost.includes('youtu.be') ||
    currentHost.includes('google') ||
    currentHost.includes('doubleclick');

  // Synchronous check: if WebShield is disabled globally or for this domain, exit immediately!
  try {
    if (typeof sessionStorage !== 'undefined') {
      if (sessionStorage.getItem('__webshield_enabled__') === 'false') {
        return; // Disabled globally or for this tab
      }
      const rawDisabled = sessionStorage.getItem('__webshield_disabled_domains__');
      if (rawDisabled) {
        const disabledList = JSON.parse(rawDisabled);
        if (Array.isArray(disabledList) && disabledList.some(d => currentHost === d || currentHost.endsWith('.' + d) || d.endsWith('.' + currentHost))) {
          return; // Whitelisted domain
        }
      }
    }
    if (document.documentElement && document.documentElement.getAttribute('data-anti-popunder-enabled') === 'false') {
      return;
    }
  } catch (e) {}

  // 91porn / 91porna Landing Modal Suppressor
  // Pre-seed localStorage key '__landing_modal_at__' with today's date (YYYY-MM-DD)
  // so the website's own common.js script skips showing #tip_modal and .modal-backdrop
  try {
    if (currentHost.includes('91porn')) {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('__landing_modal_at__', todayStr);
    }
  } catch (e) {}

  // Universal Popunder Config Neutralizer (pu.js / POPUP_CONFIG)
  // Ubiquitous pop-under library on streaming sites creates an invisible full-screen z-index 99999999
  // clickjack overlay. Pre-defining POPUP_CONFIG with isVip: true causes pu.js to abort immediately!
  try {
    const safeVipConfig = Object.freeze({
      cooldown: 99999999,
      ads: [],
      isVip: true
    });
    Object.defineProperty(window, 'POPUP_CONFIG', {
      get() { return safeVipConfig; },
      set(val) {
        // Silently discard attempts by page scripts to configure popup ads
      },
      configurable: false
    });
    // Neutralize initPopup function if declared globally
    Object.defineProperty(window, 'initPopup', {
      get() { return function() {}; },
      set(val) {},
      configurable: false
    });
  } catch (e) {}

  // Universal Adsterra & Social Bar Engine Neutralizer
  // Preemptively neutralizes Adsterra Social Bar / In-Page Push / Interstitial scripts that create [id^="atContainer-"]
  try {
    let _atAsyncContainers = {};
    Object.defineProperty(window, 'atAsyncContainers', {
      get() { return _atAsyncContainers; },
      set(val) { _atAsyncContainers = {}; },
      configurable: true
    });
    let _atOptions = {};
    Object.defineProperty(window, 'atOptions', {
      get() { return _atOptions; },
      set(val) {},
      configurable: true
    });
    let _atAsyncOptions = [];
    Object.defineProperty(window, 'atAsyncOptions', {
      get() { return _atAsyncOptions; },
      set(val) {},
      configurable: true
    });
  } catch (e) {}

  // Universal Transparent Clickjack & Floating Ad Overlay Interceptor (Pre-DOM Drop Hook)
  // Preemptively catches and drops invisible overlays and self-healing ad containers (pu.js / atContainer / ExoClick)
  // Prevents overlays from ever entering the DOM so they cannot block clicks or show persistent popups
  try {
    function isSuspectOverlayNode(node) {
      if (!node || node.nodeType !== 1) return false;
      if (isYouTube) return false;
      const tag = (node.tagName || '').toLowerCase();
      const id = (node.id || '').toLowerCase();
      const className = (typeof node.className === 'string') ? node.className.toLowerCase() : '';

      // 1. Intercept Adsterra Social Bar containers, ExoClick splash ads & floating ad boxes immediately
      if (id.startsWith('atcontainer') || id.includes('atcontainer') || className.includes('atcontainer') ||
          className.includes('adsbyexoclick') || id.includes('exoclick') || id.includes('splash') ||
          (node.getAttribute && (node.getAttribute('data-zoneid') || node.getAttribute('data-ad-id')))) {
        return true;
      }

      // 2. Intercept ad iframes from known splash/ad networks
      if (tag === 'iframe') {
        const src = (node.src || node.getAttribute('data-src') || '').toLowerCase();
        if (/splash\.php|syndication\.|exosrv|realsrv|adxadserv|onclickmax|eyebrowscrambledlater|visariomedia|zlinkm/.test(src)) {
          return true;
        }
      }

      if (tag !== 'div' && tag !== 'span' && tag !== 'a') return false;
      if (node.childElementCount > 0 || (node.textContent && node.textContent.trim().length > 30)) return false;

      const css = (node.style && node.style.cssText) ? node.style.cssText.toLowerCase() : '';
      const hasHighZ = css.includes('99999999') || css.includes('2147483647') || (node.style && node.style.zIndex && parseInt(node.style.zIndex, 10) >= 9999);
      const isFixed = css.includes('fixed') || css.includes('absolute');
      const isFullScreen = (css.includes('width:100%') || css.includes('width: 100%') || css.includes('width:100vw')) &&
                           (css.includes('height:100%') || css.includes('height: 100%') || css.includes('height:100vh'));
      const isTransparent = css.includes('transparent') || css.includes('opacity:0') || css.includes('opacity: 0');

      if (isFixed && (hasHighZ || (isFullScreen && (isTransparent || css.includes('cursor'))))) {
        return true;
      }
      return false;
    }

    const origAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function(child) {
      if (child && isSuspectOverlayNode(child)) {
        console.log('[Anti Pop-Under] Preemptively blocked appending clickjack/ad overlay to DOM:', child);
        try {
          child.style.display = 'none';
          child.style.pointerEvents = 'none';
        } catch(e) {}
        return child; // Silently drop: never attach to DOM
      }
      return origAppendChild.apply(this, arguments);
    };

    const origInsertBefore = Node.prototype.insertBefore;
    Node.prototype.insertBefore = function(newNode, referenceNode) {
      if (newNode && isSuspectOverlayNode(newNode)) {
        console.log('[Anti Pop-Under] Preemptively blocked inserting clickjack/ad overlay to DOM:', newNode);
        try {
          newNode.style.display = 'none';
          newNode.style.pointerEvents = 'none';
        } catch(e) {}
        return newNode; // Silently drop: never attach to DOM
      }
      return origInsertBefore.apply(this, arguments);
    };

    const origAppend = Element.prototype.append;
    if (origAppend) {
      Element.prototype.append = function(...nodes) {
        const safeNodes = nodes.filter(n => {
          if (n && n.nodeType === 1 && isSuspectOverlayNode(n)) {
            console.log('[Anti Pop-Under] Preemptively blocked appending clickjack/ad overlay via Element.append:', n);
            try {
              n.style.display = 'none';
              n.style.pointerEvents = 'none';
            } catch(e) {}
            return false;
          }
          return true;
        });
        return origAppend.apply(this, safeNodes);
      };
    }
  } catch (e) {}

  // Zero-Latency CSS Overlay Killer
  if (!isYouTube) {
    try {
      const overlayKillerStyle = document.createElement('style');
      overlayKillerStyle.id = 'webshield-overlay-killer';
      overlayKillerStyle.textContent = `
      div[style*="99999999"],
      div[style*="2147483647"],
      div[style*="width: 100%"][style*="height: 100%"][style*="fixed"],
      div[style*="width:100%"][style*="height:100%"][style*="fixed"],
      div[style*="width: 100vw"][style*="height: 100vh"][style*="fixed"],
      div[style*="width:100vw"][style*="height:100vh"][style*="fixed"],
      div[style*="position: fixed"][style*="top: 0"][style*="left: 0"][style*="width: 100%"][style*="height: 100%"],
      div[style*="position:fixed"][style*="top:0"][style*="left:0"][style*="width:100%"][style*="height:100%"],
      div[style*="position: fixed"][style*="top: 0px"][style*="left: 0px"][style*="width: 100%"][style*="height: 100%"],
      div[style*="position:fixed"][style*="top:0px"][style*="left:0px"][style*="width:100%"][style*="height:100%"],
      div[style*="cursor: pointer"][style*="fixed"][style*="transparent"],
      div[style*="cursor:pointer"][style*="fixed"][style*="transparent"],
      [id^="atContainer-"], [id*="atContainer-"], [class*="atContainer-"],
      [id*="at-container"], [class*="at-container"],
      .adsbyexoclick, ins.adsbyexoclick, [data-zoneid],
      iframe[src*="splash.php"], iframe[src*="syndication."],
      iframe[src*="exosrv."], iframe[src*="realsrv."],
      iframe[src*="adxadserv."], iframe[src*="onclickmax."],
      iframe[src*="eyebrowscrambledlater."],
      div[id*="cboxOverlay"], div[id*="colorbox"]:has(iframe) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        opacity: 0 !important;
        z-index: -999999 !important;
      }
      .jw-controls-backdrop, [class*="controls-backdrop"], [class*="player-backdrop"] {
        pointer-events: none !important;
      }
    `;
    const targetMount = document.head || document.documentElement;
    if (targetMount) {
      targetMount.appendChild(overlayKillerStyle);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        (document.head || document.documentElement).appendChild(overlayKillerStyle);
      }, { once: true });
    }
  } catch(e) {}
  }

  // --- LAZY-LOAD RECOVERY FOR MISSAV ONLY ---
  // Only target missav where broken Alpine/lozad instances need hydration.
  // Never run globally to avoid breaking native lazy-loaders or responsive thumbnail layouts on other movie sites.
  function ensureLozadObserver() {
    if (!window.location.hostname.includes('missav')) return;
    try {
      if (typeof window.lozad === 'function') {
        const observer = window.lozad('.lozad', {
          loaded: function (el) {
            el.classList.remove('lozad');
            el.setAttribute('data-loaded', 'true');
          }
        });
        observer.observe();
      }
    } catch (e) {}

    try {
      const imgs = document.querySelectorAll('img[data-src], img.lozad');
      for (let i = 0; i < imgs.length; i++) {
        const el = imgs[i];
        const dataSrc = el.getAttribute('data-src') || el.getAttribute('data-original');
        if (dataSrc && (!el.src || el.src.startsWith('data:image/') || el.src === 'about:blank' || el.src.length < 20)) {
          el.src = dataSrc;
          el.loading = 'lazy';
        }
        if (el.hasAttribute('x-cloak')) el.removeAttribute('x-cloak');
      }
    } catch (e) {}
  }

  if (window.location.hostname.includes('missav')) {
    let lozadPollCount = 0;
    const lozadInterval = setInterval(() => {
      ensureLozadObserver();
      if (++lozadPollCount > 15) clearInterval(lozadInterval);
    }, 300);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        ensureLozadObserver();
        setTimeout(ensureLozadObserver, 500);
        setTimeout(ensureLozadObserver, 1500);
      }, { once: true });
    } else {
      ensureLozadObserver();
    }
  }


  // --- EMBEDDED PLAYER IFRAME DETECTION ---
  // When inject.js runs inside a cross-origin player iframe (e.g. streamvl.top, vlstream.net),
  // API overrides (getComputedStyle, offsetHeight, getBoundingClientRect, bait stubs, CSS injection)
  // can break the player's internal click-to-pause and timeline controls.
  // Detect and flag these frames so dangerous overrides are skipped.
  const isEmbeddedPlayerFrame = (function () {
    if (window.self === window.top) return false; // Top-level page, not an iframe
    try {
      const host = window.location.hostname.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      // Known embedded player domains
      if (/streamvl|vlstream|play\.|embed\.|player\.|hls\.|stream\.|media\.|cdn\.|video\./.test(host)) return true;
      // Common player URL patterns
      if (/\/watch|\/embed\/|\/player\/|\/play\/|\/stream\/|\/hls\/|\/video\/|\/v\//.test(path)) return true;
      // Has a video element already (very likely a player frame)
      if (document.querySelector('video, #video_player, .jwplayer, .video-js, .artplayer, .dplayer, .plyr')) return true;
    } catch (e) {}
    return false;
  })();

  if (isEmbeddedPlayerFrame) {
    console.log('[Anti Pop-Under] Detected embedded player iframe, skipping anti-adblock overrides to protect player:', window.location.hostname);
  }

  // Anti-Anti-Adblock bypass logic for movie sites (like animevietsub)
  (function () {
    if (window.location.hostname.includes('youtube.com') ||
      window.location.hostname.includes('google') ||
      window.location.hostname.includes('doubleclick')) return;

    // Skip ALL anti-adblock overrides in embedded player iframes or whitelisted pages to prevent breaking player controls
    if (isEmbeddedPlayerFrame) return;

    // 1. Truthy & Falsy Anti-Adblock flags (Scriptlet set-constant emulation)
    const falsyProps = [
      'adblock', 'adBlock', 'hasAdblock', 'hasAdBlock', 'hasAdBlocker', 'hasAdblocker',
      'adblocker', 'adBlocker', 'isAdblock', 'isAdBlock', 'isAdblocker', 'isAdBlocker',
      'adBlockDetected', 'adblockDetected', 'adBlockEnabled', 'adblockEnabled',
      'adsBlocked', 'isAdBlockActive', 'abp', '_adblocker', '_adblock', 'blockedAds'
    ];
    falsyProps.forEach(prop => {
      try {
        let currentVal = false;
        Object.defineProperty(window, prop, {
          get() { return currentVal; },
          set(val) {
            // Allow legitimate frameworks setting complex objects or functions
            if (val && (typeof val === 'object' || typeof val === 'function')) {
              currentVal = val;
            } else if (typeof val === 'boolean') {
              currentVal = false;
            }
          },
          configurable: true
        });
      } catch (e) { }
    });

    const truthyProps = [
      'canRunAds', 'canRunAdsFast', 'adsAllowed', 'adAllowed', 'google_ad_status'
    ];
    truthyProps.forEach(prop => {
      try {
        let currentVal = prop === 'google_ad_status' ? 1 : true;
        Object.defineProperty(window, prop, {
          get() { return currentVal; },
          set(val) {
            // Allow legitimate frameworks setting complex objects or functions
            if (val && (typeof val === 'object' || typeof val === 'function')) {
              currentVal = val;
            } else if (typeof val === 'boolean') {
              currentVal = true;
            }
          },
          configurable: true
        });
      } catch (e) { }
    });

    // Neutralize mflix.store popup config safely (sets isVip = true and empty ads array so pu.js exits on line 1 without creating any overlay)
    try {
      let _popupConfig = { cooldown: 999999, ads: [], isVip: true };
      Object.defineProperty(window, 'POPUP_CONFIG', {
        get() { return _popupConfig; },
        set(val) {
          if (val && typeof val === 'object') {
            val.isVip = true;
            val.ads = [];
          }
          _popupConfig = val;
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) { }

    // 2. Mock Classes for Anti-AdBlock libraries (FuckAdBlock, BlockAdBlock, Sniffer)
    const createAntiAdBlockInstance = () => {
      const inst = {
        check: function () { return true; },
        clearEvent: function () { return inst; },
        on: function (detected, fn) {
          if (!detected && typeof fn === 'function') {
            try { fn(); } catch (e) { }
          }
          return inst;
        },
        onDetected: function () { return inst; },
        onNotDetected: function (fn) {
          if (typeof fn === 'function') {
            try { fn(); } catch (e) { }
          }
          return inst;
        },
        setOption: function () { return inst; }
      };
      return inst;
    };

    const mockFabConstructor = function () { return createAntiAdBlockInstance(); };
    mockFabConstructor.prototype = createAntiAdBlockInstance();

    const mockGlobals = {
      fuckAdBlock: createAntiAdBlockInstance(),
      FuckAdBlock: mockFabConstructor,
      blockAdBlock: createAntiAdBlockInstance(),
      BlockAdBlock: mockFabConstructor,
      sniffAdBlock: createAntiAdBlockInstance(),
      SniffAdBlock: mockFabConstructor,
      adsbygoogle: [],
      google_ad_client: 'ca-pub-mock',
      google_ad_slot: '1234567890',
      google_ad_width: 728,
      google_ad_height: 90,
      google_analytics: { getTracker: () => ({ _trackPageview: () => { } }) },
      ga: function () { if (arguments[0] && typeof arguments[arguments.length - 1] === 'function') { try { arguments[arguments.length - 1](); } catch (e) { } } },
      gaClassic: {},
      _gaq: { push: function (arr) { if (arr && arr[0] === '_setCallback' && typeof arr[1] === 'function') { try { arr[1](); } catch (e) { } } } },
      AdProvider: { push: function () { } },
      pickDirect: function () { console.log('[Anti Pop-Under] Blocked pickDirect ad overlay'); },
      google: {
        ima: {
          AdDisplayContainer: function () { return { initialize: function () { }, destroy: function () { } }; },
          AdsLoader: function () {
            return {
              requestAds: function () { },
              contentComplete: function () { },
              addEventListener: function () { },
              destroy: function () { }
            };
          },
          AdsRequest: function () { return {}; },
          AdsRenderingSettings: function () { return {}; },
          ViewMode: { NORMAL: 'normal', FULLSCREEN: 'fullscreen' }
        }
      }
    };

    Object.keys(mockGlobals).forEach(key => {
      try {
        if (!(key in window)) {
          window[key] = mockGlobals[key];
        }
      } catch (e) { }
    });

    try {
      const dummyAdProvider = { push: function () { } };
      Object.defineProperty(window, 'AdProvider', {
        get() { return dummyAdProvider; },
        set(val) { /* ignore */ },
        configurable: true
      });
      Object.defineProperty(window, 'pickDirect', {
        get() { return function () { console.log('[Anti Pop-Under] Neutralized pickDirect ad'); }; },
        set(val) { /* ignore */ },
        configurable: true
      });

      // Defuse WPAdMngr, WPShSdk, and push notification hijackers
      const dummyAdManager = {
        init: function () { },
        push: function () { },
        show: function () { },
        run: function () { },
        register: function () { },
        on: function () { }
      };
      ['wpadmngr', 'wpshsdk', '_wpsh', 'admpid', '_adp'].forEach(key => {
        try {
          Object.defineProperty(window, key, {
            get() { return dummyAdManager; },
            set(val) { /* ignore */ },
            configurable: true
          });
        } catch (e) { }
      });

      // Defuse ExoVideoSlider constructor (prevents javmost.ws line 1066 ReferenceError crash)
      function DummyExoVideoSlider() {
        return {
          init: function () { },
          show: function () { },
          hide: function () { },
          destroy: function () { },
          on: function () { },
          addEventListener: function () { }
        };
      }
      DummyExoVideoSlider.prototype.init = function () { };
      DummyExoVideoSlider.prototype.show = function () { };
      DummyExoVideoSlider.prototype.hide = function () { };
      DummyExoVideoSlider.prototype.destroy = function () { };
      try {
        Object.defineProperty(window, 'ExoVideoSlider', {
          get() { return DummyExoVideoSlider; },
          set(val) { /* ignore */ },
          configurable: true
        });
      } catch (e) { }

      // Passive safety patch for jQuery .position() on animevietsub home-v1.js:373 without defining properties on window
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.position && !window.jQuery.fn.position._safePatched) {
        const origPos = window.jQuery.fn.position;
        window.jQuery.fn.position = function () {
          if (!this[0]) return { top: 0, left: 0 };
          return origPos.apply(this, arguments) || { top: 0, left: 0 };
        };
        window.jQuery.fn.position._safePatched = true;
      }
    } catch (e) { }

    function isAdUrl(urlStr) {
      if (!urlStr) return false;
      try {
        const lower = String(urlStr).toLowerCase();
        const keywords = [
          'doubleclick', 'googlesyndication', 'googleadservices', 'adsterra', 'popads',
          'popcash', 'propellerads', 'exoclick', 'exosrv', 'clktag', 'onclickads', 'exdynsrv',
          'juicyads', 'mgid.com', 'taboola', 'outbrain', 'adnxs', 'onclickalgo',
          'highperformancegate', 'highcpmgate', 'greatcpmgate', 'eclick.vn', 'novanet.vn',
          'magsrv.com', 'mnaspm.com', 'mayzaent.com', 'prplad.com', 'monetag.com', 'smartpop',
          '/ad?type=', 'adspro.name', 'streamux.top', 'hbet.loan', 'lu88.ist',
          'tx88.army', 'vu88.foo', '9bet.beer', 'du88.money', 'vua88.eco', '789club.zip',
          'ima3.js', 'trafficjunky', 'tsyndicate', 'a-ads.com',
          'wpadmngr', 'wpshsdk', 'detectivefrozepriceless', 'hilltopads', 'clickadu', 'adxad', 'adtng', 'etahub',
          'ethnicexpressions', 'deloplen', 'adtrue'
        ];
        return keywords.some(kw => lower.includes(kw));
      } catch (e) {
        return false;
      }
    }

    try {
      const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (srcDescriptor && srcDescriptor.set) {
        Object.defineProperty(HTMLScriptElement.prototype, 'src', {
          get: srcDescriptor.get,
          set: function (val) {
            if (typeof val === 'string' && isAdUrl(val)) {
              srcDescriptor.set.call(this, 'data:text/javascript;charset=utf-8;base64,;');
              return;
            }
            srcDescriptor.set.call(this, val);
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch (e) { }

    try {
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function (name, value) {
        if (this.tagName) {
          const tag = this.tagName.toLowerCase();
          if (tag === 'script' && typeof name === 'string' && name.toLowerCase() === 'src') {
            if (typeof value === 'string' && isAdUrl(value)) {
              originalSetAttribute.call(this, name, 'data:text/javascript;charset=utf-8;base64,;');
              return;
            }
          }

          // Gracefully resolve Chromium warning: "Allow attribute will take precedence over 'allowfullscreen'."
          if (tag === 'iframe' && typeof name === 'string') {
            const attrName = name.toLowerCase();
            if (attrName === 'allowfullscreen') {
              if (this.hasAttribute('allow')) {
                const curAllow = this.getAttribute('allow') || '';
                if (!curAllow.includes('fullscreen')) {
                  originalSetAttribute.call(this, 'allow', curAllow ? `${curAllow}; fullscreen` : 'fullscreen');
                }
                return; // Suppress duplicate allowfullscreen to prevent Chromium console warning
              }
            } else if (attrName === 'allow') {
              if (this.hasAttribute('allowfullscreen')) {
                if (typeof value === 'string' && !value.includes('fullscreen')) {
                  value = value ? `${value}; fullscreen` : 'fullscreen';
                }
                this.removeAttribute('allowfullscreen');
              }
            }
          }
        }
        originalSetAttribute.call(this, name, value);
      };

      if (typeof HTMLIFrameElement !== 'undefined' && HTMLIFrameElement.prototype) {
        const iframeProto = HTMLIFrameElement.prototype;
        const origAllowFullscreenDesc = Object.getOwnPropertyDescriptor(iframeProto, 'allowFullscreen');
        if (origAllowFullscreenDesc && origAllowFullscreenDesc.set) {
          Object.defineProperty(iframeProto, 'allowFullscreen', {
            configurable: true,
            enumerable: true,
            get: origAllowFullscreenDesc.get,
            set(val) {
              if (val && this.hasAttribute('allow')) {
                const curAllow = this.getAttribute('allow') || '';
                if (!curAllow.includes('fullscreen')) {
                  this.setAttribute('allow', curAllow ? `${curAllow}; fullscreen` : 'fullscreen');
                }
                return;
              }
              origAllowFullscreenDesc.set.call(this, val);
            }
          });
        }
      }
    } catch (e) { }

    // Auto-inject stub bait elements that anti-adblock scripts expect to find in DOM
    // Uses natural layout dimensions (300x250) positioned off-screen, eliminating the need to monkey-patch
    // offsetHeight/offsetWidth/getBoundingClientRect/getComputedStyle prototypes.
    try {
      const baitElementSpecs = [
        { id: '_preload-ads-1' },
        { id: '_preload-ads-2' },
        { id: 'ads-banner' },
        { id: 'google-ads' },
        { id: 'adsbox' },
        { id: 'ad-banner' }
      ];

      const injectBaitStubs = () => {
        const mount = document.body || document.documentElement || document.head;
        if (!mount) return;
        baitElementSpecs.forEach(spec => {
          if (!document.getElementById(spec.id)) {
            const stub = document.createElement('div');
            stub.id = spec.id;
            stub.className = 'Adv ad-center-header adsbox';
            stub.setAttribute('aria-hidden', 'true');
            try { mount.insertBefore(stub, mount.firstChild); } catch (e) { }
          }
        });
      };

      injectBaitStubs();

      if (!document.body) {
        const bodyObserver = new MutationObserver((mutations, obs) => {
          if (document.body) {
            obs.disconnect();
            baitElementSpecs.forEach(spec => {
              const el = document.getElementById(spec.id);
              if (el && el.parentElement !== document.body) {
                try { document.body.insertBefore(el, document.body.firstChild); } catch (e) { }
              }
            });
            startBaitGuardian();
          }
        });
        try {
          bodyObserver.observe(document.documentElement || document, { childList: true, subtree: true });
        } catch (e) { }
        document.addEventListener('DOMContentLoaded', () => {
          injectBaitStubs();
          startBaitGuardian();
          try { bodyObserver.disconnect(); } catch (e) { }
        }, { once: true });
      } else {
        startBaitGuardian();
      }

      // Guardian: re-inject if any bait element gets removed
      function startBaitGuardian() {
        try {
          const guardObserver = new MutationObserver(() => {
            if (!document.body) return;
            baitElementSpecs.forEach(spec => {
              if (!document.getElementById(spec.id)) {
                const stub = document.createElement('div');
                stub.id = spec.id;
                stub.className = 'Adv ad-center-header adsbox';
                stub.setAttribute('aria-hidden', 'true');
                try { document.body.insertBefore(stub, document.body.firstChild); } catch (e) { }
              }
            });
          });
          if (document.body) {
            guardObserver.observe(document.body, { childList: true, subtree: false });
          }
        } catch (e) { }
      }
    } catch (e) { }
  })();

  // Declare all shared state variables at the top to prevent TDZ (Temporal Dead Zone) ReferenceErrors
  let initialPlayerResponse = undefined;
  let initialData = undefined;
  let ytplayer = undefined;
  let extensionEnabled = true;
  try {
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('__webshield_enabled__') === 'false') {
      extensionEnabled = false;
    }
  } catch (e) {}
  try {
    if (document.documentElement && document.documentElement.getAttribute('data-anti-popunder-enabled') === 'false') {
      extensionEnabled = false;
    }
  } catch (e) {}
  let contentScriptReady = false;
  const pendingReports = [];
  let lastInteractionTime = 0;
  let lastInteractionEvent = null;

  const whitelistedDomains = [
    'google.com', 'google.com.vn', 'accounts.google.com',
    'facebook.com', 'fb.com', 'm.facebook.com',
    'twitter.com', 'x.com',
    'github.com', 'apple.com', 'microsoft.com', 'microsoftonline.com',
    'paypal.com', 'stripe.com', 'momo.vn', 'vnpay.vn', 'onepay.vn', 'payoo.vn', 'shopeepay.vn', 'zalopay.vn',
    'youtube.com', 'youtu.be', 'zalo.me', 't.me', 'telegram.org',
    'linkedin.com', 'instagram.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv',
    'auth0.com', 'firebaseapp.com', 'okta.com'
  ];

  function isCurrentPageWhitelisted() {
    try {
      const host = window.location.hostname.toLowerCase();
      if (whitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain))) {
        return true;
      }
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem('__webshield_enabled__') === 'false') return true;
        const rawDisabled = sessionStorage.getItem('__webshield_disabled_domains__');
        if (rawDisabled) {
          const disabledList = JSON.parse(rawDisabled);
          if (Array.isArray(disabledList) && disabledList.some(d => host === d || host.endsWith('.' + d) || d.endsWith('.' + host))) {
            return true;
          }
        }
      }
      if (document.documentElement && document.documentElement.getAttribute('data-anti-popunder-enabled') === 'false') {
        return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  const blockedReportTimes = new Map();
  const BLOCKED_REPORT_COOLDOWN = 15000;

  function shouldReportBlockedEvent(key) {
    const now = Date.now();
    const last = blockedReportTimes.get(key);
    if (last && now - last < BLOCKED_REPORT_COOLDOWN) {
      return false;
    }
    blockedReportTimes.set(key, now);
    for (const [storedKey, time] of blockedReportTimes.entries()) {
      if (now - time > BLOCKED_REPORT_COOLDOWN * 4) {
        blockedReportTimes.delete(storedKey);
      }
    }
    return true;
  }


  // Store original methods
  const originalOpen = window.open;
  const originalClick = HTMLAnchorElement.prototype.click;

  // Helper nhận diện ranh giới tuyệt đối của video player DOM
  // Standard 1: Strict Boundary Check
  function isInsideVideoPlayer(el) {
    if (!el || el === document || el === document.body || el === document.documentElement) return false;
    try {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      // 1. Bản thân là thẻ <video>, <audio>, <source>, <track>
      if (tag === 'video' || tag === 'audio' || tag === 'source' || tag === 'track') return true;

      // 2. Bản thân là <iframe> chứa player (youtube, drive, stream, embed, v.v.)
      if (tag === 'iframe') {
        const src = (el.src || el.getAttribute('data-src') || '').toLowerCase();
        if (/youtube|youtu\.be|youtube-nocookie|drive\.google|player|embed|stream|video|watch|film|movie|vids|hls|m3u8|mp4|halim|hotp|2embed|vidsrc|superembed|play|media/i.test(src)) {
          return true;
        }
      }

      // 3. Nằm bên trong bất kỳ container nào có class/id/thuộc tính chứa:
      // "player", "video", "jwplayer", "vjs", "plyr", "artplayer", "dplayer", "xgplayer", "fluid_player", "media"
      if (el.closest) {
        const inPlayerContainer = el.closest(
          'video, audio, ' +
          '[class*="player" i], [id*="player" i], [data-player], ' +
          '[class*="video" i], [id*="video" i], ' +
          '[class*="jwplayer" i], [id*="jwplayer" i], [class*="jw-" i], ' +
          '[class*="vjs" i], [id*="vjs" i], [data-vjs-player], ' +
          '[class*="plyr" i], [id*="plyr" i], ' +
          '[class*="artplayer" i], [id*="artplayer" i], [class*="art-" i], ' +
          '[class*="dplayer" i], [id*="dplayer" i], ' +
          '[class*="xgplayer" i], [id*="xgplayer" i], [class*="xg-" i], ' +
          '[class*="fluid_player" i], [id*="fluid_player" i], ' +
          '[class*="media" i], [id*="media" i], ' +
          '.html5-video-player, [class*="ytp-" i], #movie_player, #edgeplayer-root, ' +
          '[class*="screen-box" i], [id*="playBox" i], [class*="aspect-video" i], ' +
          '#playleft, [id*="playleft" i], .MacPlayer, [class*="MacPlayer" i]'
        );
        if (inPlayerContainer) return true;
      }

      // 4. Hoặc là sibling trực tiếp nằm chung container cha với thẻ <video>
      // hoặc bất kỳ cha nào (depth < 10) có chứa thẻ <video> hoặc có class/id liên quan player
      let p = el.parentElement;
      let depth = 0;
      while (p && p !== document.body && p !== document.documentElement && depth < 10) {
        if (p.querySelector && p.querySelector('video, audio')) {
          return true;
        }
        const pClass = (typeof p.className === 'string') ? p.className.toLowerCase() : '';
        const pId = (p.id || '').toLowerCase();
        if (/player|video|jwplayer|vjs|plyr|artplayer|dplayer|xgplayer|fluid_player|media|playleft|macplayer/i.test(pClass) ||
            /player|video|jwplayer|vjs|plyr|artplayer|dplayer|xgplayer|fluid_player|media|playleft|macplayer/i.test(pId)) {
          return true;
        }
        p = p.parentElement;
        depth++;
      }
    } catch (e) {}
    return false;
  }

  // Helper nhận diện và bảo vệ tuyệt đối poster, thumbnail, banner phim, nút tập/server
  function isMovieBannerOrPoster(el) {
    if (!el || el === document || el === document.body || el === document.documentElement) return false;
    try {
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      const elId = (el.id || '').toLowerCase();
      // NEVER treat elements with explicit ad markers as movie banners!
      if (/(?:^|[\s_-])(?:ad|ads|qc|popup|catfish|banner-ad|ad-banner|floater)(?:[\s_-]|$)/i.test(elClass) ||
          /(?:^|[\s_-])(?:ad|ads|qc|popup|catfish|banner-ad|ad-banner)(?:[\s_-]|$)/i.test(elId)) {
        return false;
      }

      if (el.closest && el.closest(
        '.movie-banner, .film-banner, .hero-banner, .banner-film, .film-poster, .movie-poster, ' +
        '.poster-film, .film-item, .movie-item, .tray-item, .carousel-item, .swiper-slide, ' +
        '.halim-item, .flw-item, .film_info, [class*="banner-slider"], [class*="hero-banner"], ' +
        '[class*="film-banner"], [class*="movie-banner"], [class*="video-slider"], [id*="video-slider"], ' +
        '[class*="film-item"], [class*="movie-item"], [class*="film-poster"], [class*="movie-poster"], ' +
        '.watch-now-btn, .main-btn, .btn-episode, .module-play-list-link, .btn-play, .play-btn, ' +
        '[class*="episode"], [class*="server"], [class*="play-list"], [class*="list-ep"], [class*="tap-"], ' +
        '[id*="episode"], [id*="server"], .module-info-play, .module-mobile-play, .module-play-list, ' +
        '.thumb-overlay, [class*="thumb"], [id*="thumb"], .video-js, [class*="video-js"], ' +
        '.img-responsive, [class*="video-elem"], [class*="video-box"], [class*="video-item"], [class*="well-sm"], ' +
        '.carousel, .slider, .swiper, .slick-slider, .owl-carousel, [class*="poster"], ' +
        '[class*="detail"], [class*="trailer"], .thumbnail, .preview, .lozad, [class*="thumbnail"], [class*="preview"], [class*="lozad"]'
      )) {
        return true;
      }
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (tag === 'img') {
        const src = (el.currentSrc || el.src || el.getAttribute('data-src') || el.getAttribute('data-original') || '').toLowerCase();
        if (src) {
          const isKnownMovieCDN = /tmdb\.org|wsrv\.nl|phimimg\.com|ophim|nguonc\.com|animevietsub|cdn77|themoviedb|vsmov|fourhoi|surrit|missav/i.test(src);
          if (isKnownMovieCDN) return true;
          try {
            const imgHost = new URL(src, window.location.href).hostname.toLowerCase();
            const curHost = window.location.hostname.toLowerCase();
            if (imgHost === curHost || imgHost.endsWith('.' + curHost) || curHost.endsWith('.' + imgHost)) {
              return true;
            }
          } catch(e) {}
        }
        const alt = (el.alt || el.title || '').toLowerCase();
        if (alt && (/phim|tập|season|episode|trailer|movie|film/i.test(alt))) return true;
      }
      if (tag === 'a') {
        const href = (el.getAttribute('href') || '').toLowerCase();
        if (href && (/^\/(phim|tap-|movie|film|watch|xem-phim)/i.test(href) || /[\/\?](tap-|episode|phim-)/i.test(href))) {
          return true;
        }
      }
    } catch(e) {}
    return false;
  }

  // Record user interaction timestamps passively without ever interfering with event flow
  ['pointerdown', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;
    }, { passive: true, capture: false });
  });

  // --- VIDEO PLAYER NATIVE PASS-THROUGH (ZERO INTERFERENCE) ---
  // WebShield respects the website's native video player (JWPlayer, Video.js, Plyr, YouTube, etc.).
  // All clicks, touches, timeline scrubbing, auto-hide, and play/pause logic flow 100% naturally
  // to the player without any artificial DOM manipulation, forced timers, or event hijacking.

  // --- BODY POINTER-EVENTS & SCROLL GUARDIAN (MAIN WORLD) ---
  function ensureBodyPointerEvents() {
    if (isEmbeddedPlayerFrame || !isEnabled() || isCurrentPageWhitelisted()) return;
    try {
      if (document.body) {
        if (document.body.style.pointerEvents === 'none') {
          document.body.style.setProperty('pointer-events', 'auto', 'important');
        }
        if (document.body.style.overflow === 'hidden') {
          if (!document.querySelector('dialog[open], [role="dialog"]:not([style*="display: none"]), [aria-modal="true"]:not([style*="display: none"])')) {
            document.body.style.overflow = '';
            document.body.classList.remove('modal-open', 'no-scroll', 'overflow-hidden');
          }
        }
      }
      if (document.documentElement) {
        if (document.documentElement.style.pointerEvents === 'none') {
          document.documentElement.style.setProperty('pointer-events', 'auto', 'important');
        }
      }
    } catch (e) {}
  }

    // Handle user clicks in bubbling phase (capture: false)
    window.addEventListener('click', (e) => {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;

      if (!e.isTrusted) return; // Standard 2: Validate isTrusted
      if (!isEnabled() || isCurrentPageWhitelisted()) return;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      // Never block interactions when Target Picker mode is active on page
      if (document.getElementById('adblock-max-target-badge') || document.getElementById('adblock-max-target-overlay')) return;
      // In embedded player iframes, allow 100% native player controls & progress bar clicks
      if (window.self !== window.top) return;
      const target = e.target;
      if (!target) return;

      // 1. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM: NÉ TRÌNH PHÁT VIDEO RA 100%
      // Mọi thao tác click, tua, dừng, điều khiển âm lượng phát sinh từ bên trong Video Player:
      // RETURN NGAY LẬP TỨC để trình phát nhận 100% tương tác tự nhiên, tuyệt đối không can thiệp!
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'video' || tag === 'audio') return;

      if (isInsideVideoPlayer(target) || isMovieBannerOrPoster(target)) return;

      let checkPlayer = target;
      while (checkPlayer && checkPlayer !== document.body && checkPlayer !== document.documentElement) {
        if (isInsideVideoPlayer(checkPlayer) || isMovieBannerOrPoster(checkPlayer)) {
          return;
        }
        checkPlayer = checkPlayer.parentElement;
      }

      if (target.querySelector && target.querySelector('video, audio')) return;

      if (target.closest && target.closest(
        '.fluid_controls_container, .vjs-control-bar, .jw-controls, [class*="control-bar"], ' +
        '[class*="controls"], [class*="controller"], .ytp-chrome-bottom, .art-controls, ' +
        '.dplayer-controller, [class*="play-btn"], [class*="btn-play"], [class*="play_btn"], ' +
        '[class*="vjs-play-control"], [class*="jw-icon-playback"], #playleft, [id*="playleft" i], .MacPlayer'
      )) {
        return;
      }

      // 2. Chặn lớp phủ tàng hình clickjacking ngoài player (nếu có)
      if (isClickjackOverlay(target)) {
        e.preventDefault();
        e.stopPropagation();
        try { 
          target.style.pointerEvents = 'none';
          target.remove(); 
        } catch (err) {}
        console.log('[Anti Pop-Under] Intercepted click on full-screen clickjack overlay outside player, removed:', target);
        // CRITICAL FIX: Forward click to the real element underneath so the user's action is never lost!
        try {
          const underlying = document.elementFromPoint(e.clientX, e.clientY);
          if (underlying && underlying !== target && !isClickjackOverlay(underlying)) {
            underlying.click();
          }
        } catch (err) {}
        return;
      }

      // Xử lý nếu click trúng lớp phủ quảng cáo trong player (VAST clickthrough layer, ad banners, v.v.):
      const adOverlay = target.closest && target.closest('#nuevoa, #anuevo, #aclose, .vast_clickthrough_layer, .nva-center, .nva-midroll, .fluid_vpaid_slot, #catfish-banner, .popup-banner');
      if (adOverlay) {
        e.preventDefault();
        e.stopPropagation();
        try { adOverlay.remove(); } catch (err) {}
        console.log('[Anti Pop-Under] Intercepted and removed ad overlay:', adOverlay);
        return;
      }

      // 2. Nhận diện nếu click phát sinh từ bên trong video player hoặc poster/nội dung phim
      let inPlayer = isInsideVideoPlayer(target) || isMovieBannerOrPoster(target);
      if (!inPlayer) {
        let check = target;
        while (check && check !== document && check !== document.body && check !== document.documentElement) {
          if (isInsideVideoPlayer(check) || isMovieBannerOrPoster(check)) {
            inPlayer = true;
            break;
          }
          check = check.parentElement;
        }
      }

      // 3. Kiểm tra xem click có nằm trong thẻ liên kết <a> hay không
      let curr = target;
      let anchor = null;
      while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
        if (curr.tagName && curr.tagName.toLowerCase() === 'a') {
          anchor = curr;
          break;
        }
        curr = curr.parentElement;
      }

      // Nếu click thuộc video player hoặc poster phim và KHÔNG PHẢI là thẻ <a>:
      // Cho qua 100% để người dùng thoải mái click play/pause, tua hay tương tác bình thường!
      if (inPlayer && !anchor) return;

      // 4. Nếu có thẻ <a>, kiểm tra hành vi nhảy trang popunder
      if (anchor && anchor.href) {
        let isExternal = false;
        try {
          const targetHost = new URL(anchor.href, window.location.href).hostname.toLowerCase();
          const curHost = window.location.hostname.toLowerCase();
          isExternal = targetHost && targetHost !== curHost && !targetHost.endsWith('.' + curHost);
        } catch (err) {
          isExternal = false;
        }

        // Nếu anchor trỏ ra ngoài và không thuộc whitelist:
        if (isExternal && !isWhitelisted(anchor.href)) {
          const isTargetBlank = (anchor.getAttribute('target') || '').toLowerCase() === '_blank';
          const contextName = isTargetBlank ? 'anchor.click._blank' : 'anchor.click';
          if (!checkNavigationOrPopup(anchor.href, contextName)) {
            e.preventDefault();
            // Nếu click nằm bên trong player (ví dụ click vào khung video bị bọc anchor ngoài):
            // Chỉ gọi preventDefault() để chặn nhảy trang, KHÔNG gọi stopPropagation()
            // để sự kiện click vẫn truyền tới player thực hiện play/pause tự nhiên!
            if (inPlayer) {
              console.log('[Anti Pop-Under] Prevented ad jump inside player, passing click to player:', anchor.href);
            } else {
              e.stopPropagation();
            }
            reportBlocked(anchor.href, `Blocked popunder link click (${contextName})`);
            console.log('[Anti Pop-Under] Blocked click on ad anchor link:', anchor.href);
            return;
          }
        }

        // Nếu anchor nằm trong player nhưng là link nội bộ (như đổi tập phim, chọn server): cho qua tự nhiên!
        if (inPlayer) return;
      }
    }, false); // ALWAYS use bubbling phase (capture: false) so player receives events natively first

  // Intercept natural form submissions (often used by popunder scripts on player clicks)
  if (!isYouTube) {
    window.addEventListener('submit', (e) => {
      if (!isEnabled() || isCurrentPageWhitelisted()) return;

      const form = e.target;
      if (form && form.tagName && form.tagName.toLowerCase() === 'form') {
        const action = form.getAttribute('action') || '';
        const isTargetBlank = (form.getAttribute('target') || '').toLowerCase() === '_blank';

        if (!checkNavigationOrPopup(action, isTargetBlank ? 'form.submit._blank' : 'form.submit')) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          console.log('[Anti Pop-Under] Prevented ad form submission to:', action);
        }
      }
    }, true);
  }

  // Communication Handshake with content.js (Isolated World)
  window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'ANTI_POPUP_STATE_CHANGE') {
      extensionEnabled = event.data.enabled !== false;
      contentScriptReady = true;
      if (extensionEnabled) {
        flushPendingReports();
      }
    }
  });

  try {
    document.addEventListener('anti-popup-state-change', (e) => {
      if (e.detail && typeof e.detail.enabled !== 'undefined') {
        extensionEnabled = e.detail.enabled !== false;
        contentScriptReady = true;
        if (extensionEnabled) {
          flushPendingReports();
        }
      }
    });
  } catch (e) {}

  // Request current state from content.js with retry
  window.postMessage({ type: 'ANTI_POPUP_REQUEST_STATE' }, '*');
  let handshakeAttempts = 0;
  const handshakeInterval = setInterval(() => {
    if (contentScriptReady || ++handshakeAttempts > 10) {
      clearInterval(handshakeInterval);
      return;
    }
    window.postMessage({ type: 'ANTI_POPUP_REQUEST_STATE' }, '*');
  }, 200);

  function isEnabled() {
    if (!extensionEnabled) return false;
    try {
      if (document.documentElement && document.documentElement.getAttribute('data-anti-popunder-enabled') === 'false') {
        extensionEnabled = false;
        return false;
      }
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem('__webshield_enabled__') === 'false') {
          extensionEnabled = false;
          return false;
        }
        const rawDisabled = sessionStorage.getItem('__webshield_disabled_domains__');
        if (rawDisabled) {
          const host = window.location.hostname.toLowerCase();
          const disabledList = JSON.parse(rawDisabled);
          if (Array.isArray(disabledList) && disabledList.some(d => host === d || host.endsWith('.' + d) || d.endsWith('.' + host))) {
            extensionEnabled = false;
            return false;
          }
        }
      }
    } catch (e) {}
    return extensionEnabled;
  }

  // Helper to simulate native clicks to bypass YouTube's isTrusted checks
  function simulateNativeClick(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // Do not click if strictly invisible
    const x = rect.left + (rect.width / 2);
    const y = rect.top + (rect.height / 2);
    const clickEvents = [
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
      new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
      new PointerEvent('pointerup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
      new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y }),
      new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y })
    ];
    clickEvents.forEach(e => el.dispatchEvent(e));
    el.click(); // Fallback
  }

  // Send message to content script (which forwards to background)
  function reportBlocked(url, reason, count) {
    if (!isEnabled()) return;

    // Always immediately post event to window so content.js can receive it in real-time
    try {
      window.postMessage({
        type: 'ANTI_POPUP_BLOCKED_EVENT',
        url: url,
        reason: reason,
        count: count
      }, '*');
    } catch (e) {}

    if (!contentScriptReady) {
      if (pendingReports.length < 50) {
        pendingReports.push({ url: url, reason: reason, count: count });
      }
      console.log(`[Anti Pop-Under] Blocked & queued report to "${url}". Reason: ${reason}`);
      return;
    }

    console.log(`[Anti Pop-Under] Blocked popup to "${url}". Reason: ${reason}`);
  }

  function flushPendingReports() {
    while (pendingReports.length > 0) {
      const report = pendingReports.shift();
      window.postMessage({
        type: 'ANTI_POPUP_BLOCKED_EVENT',
        url: report.url,
        reason: report.reason,
        count: report.count
      }, '*');
      console.log(`[Anti Pop-Under] Flushed queued block report to "${report.url}". Reason: ${report.reason}`);
    }
  }

  // Helper to check if element is a clickjack overlay
  function isClickjackOverlay(el) {
    if (!el || el === document || el === document.body || el === document.documentElement) {
      return false;
    }
    // Inside embedded player iframes, never flag player masks as clickjack overlays
    if (window.self !== window.top) return false;

    // Standard 1: Protect video player DOM and film content
    if (typeof isInsideVideoPlayer === 'function' && isInsideVideoPlayer(el)) return false;
    if (typeof isMovieBannerOrPoster === 'function' && isMovieBannerOrPoster(el)) return false;

    // Standard 3: Overlay chỉ nằm trực tiếp ở tầng nông dưới body (depth <= 3)
    let depth = 0;
    let pCheck = el;
    while (pCheck && pCheck !== document.body && pCheck !== document.documentElement) {
      depth++;
      pCheck = pCheck.parentElement;
    }
    if (depth > 3) return false;

    try {
      const tagName = el.tagName ? el.tagName.toLowerCase() : '';
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object', 'svg', 'path', 'i', 'img', 'picture', 'button', 'input', 'select', 'textarea', 'form', 'label', 'summary', 'option'].includes(tagName)) {
        return false;
      }

      // Visible elements with text content are genuine UI elements (e.g. episode buttons "Tập 1", "Tập 2"), NOT clickjack overlays!
      const text = (el.innerText || '').trim();
      if (text.length > 0) {
        return false;
      }

      // Protect video players, canvases, and player control bars from clickjack overlay detection
      if (typeof isPlayerOrPlayButton === 'function' && isPlayerOrPlayButton(el)) {
        return false;
      }

      // Protect movie site episode buttons, server buttons, and elements with episode/server keywords in class/id
      const elId = (el.id || '').toLowerCase();
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (elId.includes('no-link') || elId.includes('episode') || elId.includes('server') || elId.includes('tap') || elId.includes('halim') || elId.includes('film') || elId.includes('movie') || elId.includes('control') || elId.includes('thumb') ||
        elClass.includes('episode') || elClass.includes('server') || elClass.includes('halim') || elClass.includes('list-ep') || elClass.includes('tap') || elClass.includes('film') || elClass.includes('movie') || elClass.includes('control') || elClass.includes('thumb')) {
        return false;
      }

      // Never consider elements with interactive roles, submit/reset buttons, or form controls as overlays
      if (el.getAttribute) {
        const role = (el.getAttribute('role') || '').toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (['button', 'link', 'tab', 'menuitem', 'option', 'checkbox', 'radio', 'searchbox', 'textbox', 'combobox'].includes(role) ||
          ['submit', 'reset', 'button'].includes(type)) {
          return false;
        }
      }

      // Never consider elements inside forms, navbars, headers, dialogs, modals, episode containers, or user containers as clickjack overlays
      if (el.closest('form, nav, header, footer, dialog, [class*="login"], [class*="auth"], [class*="user"], [class*="account"], [class*="modal"], [class*="popup"], [class*="btn"], [class*="button"], [id*="login"], [id*="auth"], [id*="no-link"], [class*="no-link"], [class*="episode"], [id*="episode"], [class*="server"], [id*="server"], [class*="halim"], [class*="list-ep"], [class*="tap"], [id*="tap"]')) {
        return false;
      }

      // Protect video player controls, seekbars, progress bars, timelines, fullscreen buttons, volume sliders
      if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, .artplayer, .dplayer, [class*="player"], [id*="player"], [class*="video"], [id*="video"], [class*="embed"], [id*="embed"], [class*="stream"], [id*="stream"], [class*="halim"], [id*="halim"], [class*="control"], [id*="control"], [class*="seekbar"], [id*="seekbar"], [class*="progress"], [id*="progress"], [class*="slider"], [id*="slider"], [class*="timeline"], [id*="timeline"], [class*="fullscreen"], [id*="fullscreen"]')) {
        if (tagName !== 'a') {
          return false;
        }
      }

      // If anchor tag has same-origin href or no external ad href, it is NEVER a clickjack overlay
      if (tagName === 'a') {
        const href = el.getAttribute('href') || '';
        if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.trim() === '') {
          return false; // Episode link with id="no-link" or JS trigger
        }
        try {
          const targetHost = new URL(href, window.location.href).hostname.toLowerCase();
          const currentHost = window.location.hostname.toLowerCase();
          const isExternal = targetHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost);
          if (!isExternal) {
            return false; // Same-domain links are never clickjack overlays
          }
        } catch (e) {
          return false;
        }
      }

      // If it contains genuine form controls, video media, images, or text-bearing children, skip
      if (el.querySelector('img, picture, video, audio, canvas, iframe, embed, object, button, input, select, textarea, a, span, p, h1, h2, h3, h4, h5, h6')) {
        return false;
      }

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);

      const width = rect.width;
      const height = rect.height;
      const vw = window.innerWidth || document.documentElement.clientWidth || 800;
      const vh = window.innerHeight || document.documentElement.clientHeight || 600;

      const isPositioned = (style.position === 'absolute' || style.position === 'fixed');
      if (!isPositioned) return false;

      const opacity = parseFloat(style.opacity);
      let bgAlpha = 1;
      const bgMatch = style.backgroundColor.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
      if (bgMatch && bgMatch[1]) {
        bgAlpha = parseFloat(bgMatch[1]);
      } else if (!style.backgroundColor || style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)' || (style.backgroundColor.startsWith('rgba(') && style.backgroundColor.endsWith(', 0)'))) {
        bgAlpha = 0;
      }

      const isTransparent = opacity < 0.35 || bgAlpha < 0.35;
      if (!isTransparent) return false;

      // Real overlay area check: spans a significant part of the viewport (or > 200x200)
      const isLargeArea = (width >= 200 && height >= 200) || (width >= vw * 0.4 && height >= vh * 0.4);
      const zIndex = parseInt(style.zIndex, 10);
      const isHighZ = !isNaN(zIndex) && zIndex >= 10;

      // Transparent absolute/fixed elements that are large and empty are ALWAYS clickjack overlays.
      // Ad networks deliberately omit z-index to bypass adblockers, so we no longer require high z-index.
      return isLargeArea;
    } catch (e) {
      return false;
    }
  }

  const gamblingKeywords = [
    '\\bbet\\b', 'casino', 'gamebai', 'nhacai', 'w88', 'fun88', 'fb88', 'm88',
    '188bet', 'kubet', 'shbet', '789bet', 'jun88', 'f8bet', 'new88', 'hi88',
    'okvip', '1xbit', '1xbet', 'vi88', 'fi88', 'ee88', 'lixi88', 'mu88',
    'loto', 'quayhu', '\\bslot\\b', 'nha-cai', 'soicau', 'keonhacai', 'bong88',
    'sv388', 'vz99', 'loto188', 'k9win', 'fabet', 'oxbet', 'debet', 'may88', '\\bsc88\\b',
    'rr88', 'go88', 'sunwin', 'hitclub', 'rikvip', '\\bb52\\b', '789club', 'kuwin',
    'thabet', 'bk8', '\\bk8\\b', 'j88', 'mb66', 'gk88', 'pg88', '88clb', '\\bcwin\\b', 'win88',
    'lu88', 'vu88', 'man88', 'hbet', '\\bk88\\b', 'tx88', 'taixiu', 'banca', 'game-bai',
    'qq88', 'xx88', 'bet789',
    'bom88', 'gem88', 'uk88', 'net88', 'vsbet', '6789x', 'adqc', 'musicskins', 'rikvipchinhhang', 'uk88chinhhang'
  ];

  const adUrlKeywords = [
    '(?:\\b|//)adserver(?:\\b|\\.)', 'popunder', 'greatcpmgate', 'highcpmgate', 'onclickads',
    'clktag', 'exoclick', 'eclick.vn', 'novanet.vn', 'adsterra', 'popads', 'popcash',
    'cpmrate', 'cpmnetwork', 'cpmgate', 'profitablecpm', 'profitablecpmratenetwork',
    'hilltopads', 'galaksion', 'monetag', 'admaven', 'clickadu', 'richads', 'propush',
    'popmyads', 'adtrue', 'adflex', 'syndication', 'doubleclick', 'googlesyndication',
    'googleadservices', 'ad-delivery', 'adservice', 'astrology', 'backlight', 'inless',
    '\\\\?ab=', '&ab=', '&rl=', '\\\\?rl=', 'zoneid=', 'pubid=', 'subid=', 'placement=', 'direct_link',
    'playhubconnect.com', 'cm8806.com', 'linkroyal.workers.dev',
    'abroadad.cache.wpscdn.com', 'propellerads',
    'jads.co', '9splt.com', 'yuelongyy.com', 'juicyads', 'getjuicy',
    'vast.xml', 'vpaid', '/vast/', 'vast_tag', 'vastxml', 'adxml',
    '/static/video/bn/', 'trafficjunky', 'tsyndicate', 'a-ads.com',
    '/preroll', '/midroll', '/postroll', 'streamux.top',
    'adxcontent.com', 'adxcontent', 'vl-top-adx', 'vl-main-adx', 'vl-native-adx',
    'acquirecardedsullen.com', 'acquirecarded', 'xx4999.com',
    'agileskincareunrented.com', 'agileskincareunrented', 'marvelous-respond.com', 'marvelous-respond',
    'yqxtm.com', 'kwai.net/bs2/ad-',
    'adqc.net', '6789x.site', 'musicskinsheader', 'musicskinscom', 'cm8806.com/motphim', 'no-ads-under'
  ];

  const gamblingRegex = new RegExp(gamblingKeywords.join('|'), 'i');
  const adUrlRegex = new RegExp(adUrlKeywords.join('|'), 'i');

  function isWhitelisted(urlStr) {
    if (!urlStr) return false;
    try {
      const hostname = new URL(urlStr, window.location.href).hostname.toLowerCase();
      return whitelistedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch (e) {
      return false;
    }
  }

  function isPlayerOrPlayButton(el) {
    if (!el) return false;
    // Everything inside a player iframe is part of the player!
    if (window.self !== window.top) return true;
    try {
      const tagName = el.tagName.toLowerCase();
      // Direct media / embed elements
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object'].includes(tagName)) return true;

      // Named player container classes (all major players)
      if (el.closest(
        '.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, .artplayer, .dplayer,' +
        '.art-mask, .art-layers, .art-controls, .art-control-progress, .jw-controls, .jw-overlays, .jw-preview,' +
        '#playleft, [id*="playleft" i], .MacPlayer, [class*="MacPlayer" i],' +
        '[class*="player"], [id*="player"],' +
        '[class*="video"], [id*="video"],' +
        '[class*="aspect-video"], [class*="screen"], [id*="screen"],' +
        '[class*="media"], [id*="media"], [id*="playBox"], [class*="playBox"],' +
        '[class*="embed"], [id*="embed"],' +
        '[class*="stream"], [id*="stream"],' +
        '[class*="halim"], [id*="halim"],' +
        '[class*="film"], [id*="film"],' +
        '[class*="xem"], [id*="xem"]'
      )) return true;

      // Inside any container that holds a <video> element (max 10 levels up)
      let p = el.parentElement;
      let depth = 0;
      while (p && p !== document.body && depth < 10) {
        if (p.querySelector && p.querySelector('video')) return true;
        p = p.parentElement;
        depth++;
      }
    } catch (e) { }
    return false;
  }

  function checkNavigationOrPopup(url, context) {
    if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return true;

    const isFormSubmit = context === 'form.submit';
    const isAnchorClick = context === 'anchor.click' || context === 'anchor.click._blank';
    const isLocationChange = context === 'location change';
    const isWindowOpen = context === 'window.open';

    let isBlank = !url || url.startsWith('javascript:') || url.trim() === '' || url === 'about:blank' || url.startsWith('#');
    let isExternal = false;
    let targetHost = '';

    if (!isBlank) {
      try {
        targetHost = new URL(url, window.location.href).hostname.toLowerCase();
        const currentHost = window.location.hostname.toLowerCase();
        isExternal = targetHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost);
      } catch (e) {
        isBlank = true;
      }
    }

    // 1. If it explicitly matches ad/gambling keywords or popunder params, block it 100%
    const matchesGamblingHost = targetHost && /\d{2,}/.test(targetHost) && (targetHost.includes('88') || targetHost.includes('99') || targetHost.includes('789') || /club|bet/i.test(targetHost));
    if (url && (gamblingRegex.test(url) || adUrlRegex.test(url) || matchesGamblingHost || (url.includes('ab=') && url.includes('rl=')))) {
      reportBlocked(url, `Blocked ad/popunder URL in ${context}`);
      return false;
    }

    // 2. Location changes (window.location / replace / assign)
    if (isLocationChange) {
      if (isExternal && !isWhitelisted(url)) {
        reportBlocked(url, `Blocked unrequested external location redirect (${context})`);
        return false;
      }
      return true;
    }

    // 3. Same-page form submissions and relative/whitelisted internal links
    if (isFormSubmit && (!isExternal || isWhitelisted(url))) {
      return true;
    }

    if (isAnchorClick && !context.includes('_blank') && (!isExternal || isWhitelisted(url))) {
      return true;
    }

    // 4. Block external non-whitelisted popups or blank popup windows
    if ((isWindowOpen || context.includes('_blank')) && (isBlank || (isExternal && !isWhitelisted(url)))) {
      reportBlocked(url || 'blank', `Blocked non-whitelisted external/blank popup in ${context}`);
      return false;
    }

    // 5. If window.open is opening duplicate current page or relative ad redirect
    if (isWindowOpen && !isBlank && !isExternal) {
      try {
        const path = new URL(url, window.location.href).pathname.toLowerCase();
        const curPath = window.location.pathname.toLowerCase();
        const isDuplicatePage = (url === window.location.href || path === curPath) && context === 'window.open';
        const isAdPath = adUrlRegex.test(url) || ['/click', '/out', '/go', '/redirect', '/pop', '/cpm'].some(kw => path.includes(kw));

        if (isDuplicatePage || isAdPath) {
          reportBlocked(url, `Blocked same-domain ad/duplicate window.open in ${context}`);
          return false;
        }
      } catch (e) { }
    }

    const timeSinceLastInteraction = Date.now() - lastInteractionTime;
    const isRecentInteraction = timeSinceLastInteraction < 1000;

    // 6. If no recent user interaction, block all programmatic window.open or external popup actions
    if (!isRecentInteraction && isWindowOpen) {
      reportBlocked(url || 'blank', `Blocked programmatic ${context} with no user interaction`);
      return false;
    }

    // 7. Detailed checks for overlays or player clicks
    if (lastInteractionEvent && lastInteractionEvent.target) {
      const clickedEl = lastInteractionEvent.target;

      let curr = clickedEl;
      let overlay = null;
      let isHiddenExternalLink = false;

      while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
        if (isClickjackOverlay(curr)) {
          overlay = curr;
          break;
        }

        if (curr.tagName && curr.tagName.toLowerCase() === 'a') {
          const href = curr.getAttribute('href') || '';
          try {
            const targetHost = new URL(href, window.location.href).hostname.toLowerCase();
            const currentHost = window.location.hostname.toLowerCase();
            const isExt = targetHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost);
            if (isExt) {
              const text = curr.innerText || '';
              if (text.trim().length === 0) {
                let hasVisibleMedia = false;
                const media = curr.querySelectorAll('img, svg, canvas, video, iframe, i, span[class*="icon"], div[class*="icon"]');
                for (let i = 0; i < media.length; i++) {
                  const style = window.getComputedStyle(media[i]);
                  if (style.display !== 'none' && style.opacity !== '0' && style.visibility !== 'hidden' && style.width !== '0px') {
                    hasVisibleMedia = true;
                    break;
                  }
                }
                // If there's no visible content inside this external anchor, it's a click trap!
                if (!hasVisibleMedia) {
                  isHiddenExternalLink = true;
                  break;
                }
              }
            }
          } catch (e) { }
        }

        curr = curr.parentElement;
      }

      // If clicked on an overlay, block it
      if (overlay) {
        reportBlocked(url || 'blank', `Blocked ${context} via clickjack overlay`);
        try { overlay.remove(); } catch (e) { }
        return false;
      }
      if (isHiddenExternalLink) {
        reportBlocked(url || 'blank', `Blocked ${context} via invisible external link wrapper`);
        return false;
      }


      const isPlayerClick = isPlayerOrPlayButton(clickedEl);

      // A play button/player click should NEVER open a new tab/window OR navigate to an external domain
      if (isPlayerClick && (isWindowOpen || context.includes('_blank') || isExternal) && !isWhitelisted(url)) {
        reportBlocked(url || 'blank', `Blocked new tab/window popup from player click (${context})`);
        return false;
      }
    }

    return true; // Allow
  }

  function isClickedLink(urlStr) {
    if (!lastInteractionEvent || !lastInteractionEvent.target) return false;
    try {
      const targetUrl = new URL(urlStr, window.location.href);
      let curr = lastInteractionEvent.target;
      while (curr && curr !== document && curr !== document.body) {
        if (curr.tagName && curr.tagName.toLowerCase() === 'a') {
          const anchorUrl = new URL(curr.href, window.location.href);
          if (anchorUrl.hostname === targetUrl.hostname && anchorUrl.pathname === targetUrl.pathname) {
            return true;
          }
        }
        curr = curr.parentElement;
      }
    } catch (e) { }
    return false;
  }

  function createDummyWindow() {
    let _closed = false;
    const dummyWindow = new Proxy({}, {
      get(targetProp, prop) {
        if (prop === 'closed') return _closed;
        if (prop === 'focus' || prop === 'blur' || prop === 'postMessage') return () => { };
        if (prop === 'close') return () => { _closed = true; };
        if (prop === 'location') return new Proxy({ href: '' }, { get(t, p) { return t[p] || ''; }, set() { return true; } });
        if (prop === 'document') return new Proxy({ readyState: 'complete' }, { get(t, p) { if (p === 'readyState') return t[p]; return () => { }; } });
        if (prop === 'window' || prop === 'top' || prop === 'self' || prop === 'parent') return dummyWindow;
        return undefined;
      },
      set() { return true; }
    });
    return dummyWindow;
  }

  // The custom window.open logic
  function customOpen(url, target, features) {
    if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) {
      return originalOpen.apply(this, arguments);
    }

    // Nếu thao tác phát sinh từ bên trong video player nội bộ:
    // Video player chân chính KHÔNG BAO GIỜ cần gọi window.open() mở domain bên ngoài!
    if (lastInteractionEvent && lastInteractionEvent.target && isInsideVideoPlayer(lastInteractionEvent.target)) {
      let isExternal = false;
      try {
        const targetHost = new URL(url, window.location.href).hostname.toLowerCase();
        const curHost = window.location.hostname.toLowerCase();
        isExternal = targetHost && targetHost !== curHost && !targetHost.endsWith('.' + curHost);
      } catch (e) {
        isExternal = true;
      }
      if (isExternal && !isWhitelisted(url)) {
        reportBlocked(url || 'blank', 'Blocked external popup/jump from video player click');
        return createDummyWindow();
      }
    }

    const targetLower = String(target || '').toLowerCase();
    if (['_self', '_top', '_parent'].includes(targetLower)) {
      if (gamblingRegex.test(url) || adUrlRegex.test(url)) {
        return createDummyWindow();
      }
      try {
        const targetHost = new URL(url, window.location.href).hostname.toLowerCase();
        const currentHost = window.location.hostname.toLowerCase();
        const isExt = targetHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost) && !currentHost.endsWith('.' + targetHost);
        if (isExt && !isWhitelisted(url)) {
          // Pass it to checkNavigationOrPopup to block external _self redirects
        } else {
          // Allow same-domain or whitelisted _self redirects immediately to not break site features
          return originalOpen.apply(this, arguments);
        }
      } catch (e) {
        return originalOpen.apply(this, arguments);

      }
    }

    if (!checkNavigationOrPopup(url, 'window.open')) {
      return createDummyWindow();
    }

    return originalOpen.apply(this, arguments);
  }

  // Helper to override open on any window object (e.g. top-level or iframe window)
  function overrideWindowOpen(win) {
    if (!win) return;
    try {
      if (win.open !== customOpen) {
        Object.defineProperty(win, 'open', {
          value: customOpen,
          writable: true,
          configurable: true
        });
      }
    } catch (e) {
      try {
        win.open = customOpen;
      } catch (err) { }
    }

    try {
      if (win.Window && win.Window.prototype && win.Window.prototype.open !== customOpen) {
        Object.defineProperty(win.Window.prototype, 'open', {
          value: customOpen,
          writable: true,
          configurable: true
        });
      }
    } catch (e) { }
  }

  if (!isYouTube) {
    // Override top-level window, self, top, parent, globalThis, and Window.prototype
    overrideWindowOpen(window);
    overrideWindowOpen(window.self);
    overrideWindowOpen(window.top);
    overrideWindowOpen(window.parent);
    if (typeof globalThis !== 'undefined') overrideWindowOpen(globalThis);
    if (typeof Window !== 'undefined' && Window.prototype) overrideWindowOpen(Window.prototype);

    // Sanitize iframe attributes before DOM insertion to eliminate browser warnings
    function sanitizeIframeNode(node) {
      if (!node || node.nodeType !== 1) return;
      try {
        const clean = (ifr) => {
          try {
            // Fix: "An iframe which has both allow-scripts and allow-same-origin for its sandbox attribute can escape its sandboxing"
            if (ifr.hasAttribute && ifr.hasAttribute('sandbox')) {
              const sb = ifr.getAttribute('sandbox') || '';
              if (sb.includes('allow-scripts') && sb.includes('allow-same-origin')) {
                ifr.removeAttribute('sandbox');
              }
            }
            // Fix: "Allow attribute will take precedence over 'allowfullscreen'"
            if (ifr.hasAttribute && ifr.hasAttribute('allowfullscreen') && ifr.hasAttribute('allow')) {
              const curAllow = ifr.getAttribute('allow') || '';
              if (!curAllow.includes('fullscreen')) {
                ifr.setAttribute('allow', curAllow ? (curAllow.trim().endsWith(';') ? curAllow + ' fullscreen' : curAllow + '; fullscreen') : 'fullscreen');
              }
              ifr.removeAttribute('allowfullscreen');
            }
          } catch (e) { }
        };
        if (node.tagName === 'IFRAME') {
          clean(node);
        } else if (node.childElementCount > 0 && node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(clean);
        }
      } catch (e) { }
    }

    // Synchronously patch iframe window when created or appended to DOM
    function patchIframeNode(node) {
      if (!node || node.nodeType !== 1) return;
      try {
        const tag = node.tagName;
        if (tag === 'IFRAME') {
          if (node.contentWindow) overrideWindowOpen(node.contentWindow);
          if (node.contentDocument && node.contentDocument.defaultView) overrideWindowOpen(node.contentDocument.defaultView);
          return;
        }
        if (node.childElementCount > 0 && node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(ifr => {
            try {
              if (ifr.contentWindow) overrideWindowOpen(ifr.contentWindow);
              if (ifr.contentDocument && ifr.contentDocument.defaultView) overrideWindowOpen(ifr.contentDocument.defaultView);
            } catch (e) { }
          });
        }
      } catch (e) { }
    }

    // Hook Document.prototype.createElement to catch newly created iframes immediately
    try {
      const origCreateElement = Document.prototype.createElement;
      Document.prototype.createElement = function (tagName, options) {
        const el = origCreateElement.call(this, tagName, options);
        if (el && typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
          try {
            sanitizeIframeNode(el);
            const hookIframe = () => {
              patchIframeNode(el);
            };
            el.addEventListener('load', hookIframe);
            setTimeout(hookIframe, 0);
          } catch (e) { }
        }
        return el;
      };
    } catch (e) { }

    // Hook HTMLIFrameElement prototype to intercept and override window.open inside dynamically created iframes
    try {
      const cwDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (cwDescriptor && cwDescriptor.get) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function () {
            const win = cwDescriptor.get.apply(this);
            if (win) {
              overrideWindowOpen(win);
            }
            return win;
          },
          configurable: true
        });
      }

      const cdDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentDocument');
      if (cdDescriptor && cdDescriptor.get) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentDocument', {
          get: function () {
            const doc = cdDescriptor.get.apply(this);
            if (doc && doc.defaultView) {
              overrideWindowOpen(doc.defaultView);
            }
            return doc;
          },
          configurable: true
        });
      }
    } catch (err) { }
  }

  // Bulletproof override of HTMLAnchorElement.prototype.click
  if (!isYouTube) {
    try {
      Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
        value: function () {
          if (!isEnabled() || isCurrentPageWhitelisted()) {
            return originalClick.apply(this, arguments);
          }

          const isTargetBlank = (this.getAttribute('target') || '').toLowerCase() === '_blank';
          if (!checkNavigationOrPopup(this.href, isTargetBlank ? 'anchor.click._blank' : 'anchor.click')) {
            return; // block
          }

          return originalClick.apply(this, arguments);
        },
        writable: true,
        configurable: true
      });
    } catch (err) {
      HTMLAnchorElement.prototype.click = function () {
        if (!isEnabled() || isCurrentPageWhitelisted()) {
          return originalClick.apply(this, arguments);
        }

        const isTargetBlank = (this.getAttribute('target') || '').toLowerCase() === '_blank';
        if (!checkNavigationOrPopup(this.href, isTargetBlank ? 'anchor.click._blank' : 'anchor.click')) {
          return; // block
        }

        return originalClick.apply(this, arguments);
      };
    }
  }

  // Bulletproof override of EventTarget.prototype.dispatchEvent to block synthetic ad click dispatches
  const originalDispatchEvent = EventTarget.prototype.dispatchEvent;
  if (!isYouTube) {
    try {
      EventTarget.prototype.dispatchEvent = function (event) {
        if (isEmbeddedPlayerFrame || !isEnabled() || isCurrentPageWhitelisted()) {
          return originalDispatchEvent.apply(this, arguments);
        }

        try {
          if (event && (event.type === 'click' || event.type === 'mousedown' || event.type === 'mouseup')) {
            let anchor = null;
            let curr = this;
            while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
              if (curr.tagName && curr.tagName.toLowerCase() === 'a') {
                anchor = curr;
                break;
              }
              curr = curr.parentElement;
            }

            if (anchor && anchor.href) {
              const isTargetBlank = (anchor.getAttribute('target') || '').toLowerCase() === '_blank';
              const anchorId = (anchor.id || '').toLowerCase();
              const style = anchor.getAttribute('style') || '';
              const isDummyTrap = anchorId.startsWith('bb') ||
                                  style.includes('opacity:0') || style.includes('opacity: 0') ||
                                  (style.includes('1px') && style.includes('height'));

              if (isDummyTrap || !checkNavigationOrPopup(anchor.href, isTargetBlank ? 'dispatchEvent.anchor._blank' : 'dispatchEvent.anchor')) {
                console.log('[Anti Pop-Under] Blocked synthetic click dispatch on ad anchor:', anchor.href);
                try { anchor.remove(); } catch (e) { }
                if (event.preventDefault) event.preventDefault();
                if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                return false;
              }
            }
          }
        } catch (err) { }

        return originalDispatchEvent.apply(this, arguments);
      };
    } catch (e) { }
  }

  // Bulletproof override of HTMLFormElement.prototype.submit
  const originalSubmit = HTMLFormElement.prototype.submit;
  if (!isYouTube) {
    try {
      Object.defineProperty(HTMLFormElement.prototype, 'submit', {
        value: function () {
          if (!isEnabled() || isCurrentPageWhitelisted()) {
            return originalSubmit.apply(this, arguments);
          }

          const action = this.getAttribute('action') || '';
          if (!checkNavigationOrPopup(action, 'form.submit')) {
            return; // block
          }
          return originalSubmit.apply(this, arguments);
        },
        writable: true,
        configurable: true
      });
    } catch (err) {
      HTMLFormElement.prototype.submit = function () {
        if (!isEnabled() || isCurrentPageWhitelisted()) {
          return originalSubmit.apply(this, arguments);
        }
        const action = this.getAttribute('action') || '';
        if (!checkNavigationOrPopup(action, 'form.submit')) {
          return; // block
        }
        return originalSubmit.apply(this, arguments);
      };
    }
  }

  // --- ADGUARD / UBLOCK ORIGIN NATIVE YOUTUBE AD ENGINE & DETECTION IMMUNITY ---
  function runYouTubeAdGuardEngine() {
    if (!window.location.hostname.includes('youtube.com')) return;
    if (!isEnabled()) return;

    // NEVER run video ad purge engine inside the YouTube Live Chat iframe!
    // Live chat frames contain NO video ads and modifying ytInitialData or ytcfg breaks real-time chat!
    if (window.location.pathname.startsWith('/live_chat')) {
      console.log('[WebShield] Inside YouTube Live Chat iframe - preserving native real-time chat pipeline.');
      return;
    }

    console.log('[WebShield] AdGuard Native YouTube Engine Active (Zero-Ad Architecture & Anti-Detection)');

    // 1. Recursive ad properties purger (AdGuard / uBlock Origin Standard)
    const AD_KEYS = new Set([
      'adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'masthead',
      'adPlacementRenderer', 'adBreakService', 'adBreakServiceRenderer', 'playbackTracking',
      'adTagParameters', 'adLayoutLoggingData', 'invideoAdOptions', 'adModule'
    ]);

    // Accurate 1-to-1 YouTube Video Ad Reporter (Per Video ID, Never Spams)
    const reportedVideoAds = new Set();

    function getCurrentVideoId() {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const v = urlParams.get('v');
        if (v) return v;
        const match = window.location.pathname.match(/\/(shorts|watch|live)\/([a-zA-Z0-9_-]+)/);
        if (match) return match[2];
      } catch (e) { }
      return '';
    }

    function checkAndReportVideoAds(obj) {
      if (!obj || typeof obj !== 'object') return;
      try {
        const videoId = obj?.videoDetails?.videoId ||
                        obj?.playerResponse?.videoDetails?.videoId ||
                        getCurrentVideoId();
        if (!videoId || reportedVideoAds.has(videoId)) return;

        const hasVideoAds = (Array.isArray(obj.adPlacements) && obj.adPlacements.length > 0) ||
                            (Array.isArray(obj.playerAds) && obj.playerAds.length > 0) ||
                            (Array.isArray(obj.adSlots) && obj.adSlots.length > 0) ||
                            (obj.playerResponse && typeof obj.playerResponse === 'object' &&
                              ((Array.isArray(obj.playerResponse.adPlacements) && obj.playerResponse.adPlacements.length > 0) ||
                               (Array.isArray(obj.playerResponse.playerAds) && obj.playerResponse.playerAds.length > 0)));

        if (hasVideoAds) {
          reportedVideoAds.add(videoId);
          if (reportedVideoAds.size > 50) {
            const firstKey = reportedVideoAds.values().next().value;
            reportedVideoAds.delete(firstKey);
          }
          const adCount = Math.min(2, (obj.adPlacements?.length || obj.playerAds?.length || 1));
          reportBlocked(`https://www.youtube.com/watch?v=${videoId} (Quảng cáo Video)`, `Đã chặn ${adCount} quảng cáo video`, adCount);
        }
      } catch (e) { }
    }

    function deepPurgeAdProperties(obj, depth = 0) {
      if (!obj || typeof obj !== 'object' || depth > 10) return obj;
      try {
        // Auto-heal player error / detection warning in playerResponse
        if (obj.playabilityStatus && typeof obj.playabilityStatus === 'object') {
          const status = obj.playabilityStatus.status;
          // If YouTube flagged user as UNPLAYABLE or LOGIN_REQUIRED due to adblock detection,
          // but streamingData exists, restore playability to OK!
          if (status === 'UNPLAYABLE' || status === 'LOGIN_REQUIRED' || status === 'ERROR') {
            if (obj.streamingData) {
              obj.playabilityStatus.status = 'OK';
              delete obj.playabilityStatus.reason;
              delete obj.playabilityStatus.errorScreen;
              delete obj.playabilityStatus.messages;
            }
          }
        }

        if (Array.isArray(obj)) {
          for (let i = obj.length - 1; i >= 0; i--) {
            const item = obj[i];
            if (item && typeof item === 'object') {
              const renderer = item.adSlotRenderer ||
                item.adPlacementRenderer ||
                item.inFeedAdLayoutRenderer ||
                item.adBreakServiceRenderer;
              const targetId = item?.engagementPanelSectionListRenderer?.targetId || '';
              // Strictly protect live chat engagement panel from being removed or corrupted
              if (targetId.includes('live-chat') || targetId.includes('chat')) {
                continue;
              }
              if (renderer || targetId === 'engagement-panel-ads' || targetId.startsWith('engagement-panel-ads')) {
                obj.splice(i, 1);
              } else {
                deepPurgeAdProperties(item, depth + 1);
              }
            }
          }
          return obj;
        }

        // Handle stringified JSON responses (YouTube often nests playerResponse as string)
        if (typeof obj.playerResponse === 'string') {
          try {
            const parsed = JSON.parse(obj.playerResponse);
            deepPurgeAdProperties(parsed, depth + 1);
            obj.playerResponse = JSON.stringify(parsed);
          } catch (e) { }
        }

        for (const key of Object.keys(obj)) {
          if (AD_KEYS.has(key)) {
            if (key === 'adPlacements' || key === 'playerAds' || key === 'adSlots') {
              obj[key] = [];
            } else {
              delete obj[key];
            }
          } else if (obj[key] && typeof obj[key] === 'object') {
            deepPurgeAdProperties(obj[key], depth + 1);
          }
        }

        // Clean anti-adblock enforcement dialogs & interruption prompts from payload
        if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers) {
          const mr = obj.auxiliaryUi.messageRenderers;
          if (mr.enforcementMessageViewModel) delete mr.enforcementMessageViewModel;
          if (mr.upsellDialogRenderer) delete mr.upsellDialogRenderer;
          if (mr.mealbarPromoRenderer) delete mr.mealbarPromoRenderer;
          if (mr.notificationActionRenderer) delete mr.notificationActionRenderer;
        }
        // NOTE: Never delete obj.messages unconditionally as it destroys YouTube Live Chat data structures
      } catch (e) { }
      return obj;
    }

    // 2. Intercept window.ytInitialPlayerResponse
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    if (_ytInitialPlayerResponse) {
      checkAndReportVideoAds(_ytInitialPlayerResponse);
      deepPurgeAdProperties(_ytInitialPlayerResponse);
    }
    try {
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
          return _ytInitialPlayerResponse;
        },
        set(val) {
          checkAndReportVideoAds(val);
          _ytInitialPlayerResponse = deepPurgeAdProperties(val);
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) { }

    // 3. Intercept window.ytInitialData
    let _ytInitialData = window.ytInitialData;
    if (_ytInitialData) {
      deepPurgeAdProperties(_ytInitialData);
    }
    try {
      Object.defineProperty(window, 'ytInitialData', {
        get() {
          return _ytInitialData;
        },
        set(val) {
          _ytInitialData = deepPurgeAdProperties(val);
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) { }

    // 4. Intercept ytcfg (YouTube Configuration Object - disable ads experiment flags)
    function sanitizeYtcfg(cfg) {
      if (!cfg || typeof cfg !== 'object') return;
      try {
        if (cfg.EXPERIMENT_FLAGS && typeof cfg.EXPERIMENT_FLAGS === 'object') {
          cfg.EXPERIMENT_FLAGS.web_enable_ab_enforcement = false;
          cfg.EXPERIMENT_FLAGS.web_enable_ab_enforcement_v2 = false;
          cfg.EXPERIMENT_FLAGS.enable_ad_placement_service = false;
          cfg.EXPERIMENT_FLAGS.enable_server_stitched_dai = false;
          cfg.EXPERIMENT_FLAGS.html5_ad_timeout_ms = 1;
          cfg.EXPERIMENT_FLAGS.html5_ad_preroll_timeout_ms = 1;
          cfg.EXPERIMENT_FLAGS.html5_ad_midroll_timeout_ms = 1;
          cfg.EXPERIMENT_FLAGS.html5_ad_postroll_timeout_ms = 1;
          cfg.EXPERIMENT_FLAGS.web_disable_defer_ad = true;
          cfg.EXPERIMENT_FLAGS.disable_child_node_auto_log = true;
        }
      } catch (e) { }
    }

    function hookYtcfg(ytcfgObj) {
      if (!ytcfgObj || ytcfgObj._webshield_hooked) return;
      try {
        ytcfgObj._webshield_hooked = true;
        const origSet = ytcfgObj.set;
        if (typeof origSet === 'function') {
          ytcfgObj.set = function (arg) {
            sanitizeYtcfg(arg);
            return origSet.apply(this, arguments);
          };
        }
        if (typeof ytcfgObj.get === 'function') {
          const currentExp = ytcfgObj.get('EXPERIMENT_FLAGS');
          if (currentExp) sanitizeYtcfg({ EXPERIMENT_FLAGS: currentExp });
        }
      } catch (e) { }
    }

    if (window.ytcfg) {
      hookYtcfg(window.ytcfg);
    }
    let _ytcfg = window.ytcfg;
    try {
      Object.defineProperty(window, 'ytcfg', {
        get() {
          return _ytcfg;
        },
        set(val) {
          _ytcfg = val;
          hookYtcfg(_ytcfg);
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) { }

    // 5. Intercept window.fetch for YouTube API endpoints
    try {
      const originalFetch = window.fetch;
      window.fetch = async function (...args) {
        const url = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';
        if (typeof url === 'string') {
          // Block tracking pings to YouTube Ad servers directly with 200 OK so player does not error
          if (url.includes('/api/stats/ads') ||
              url.includes('/api/stats/atr') ||
              url.includes('/pagead/') ||
              url.includes('doubleclick.net') ||
              url.includes('/ptracking') ||
              url.includes('/api/stats/qoe') && url.includes('adformat')) {
            return new Response('', { status: 200, statusText: 'OK' });
          }

          const isPlayerApi = url.includes('/youtubei/v1/player') ||
            url.includes('/youtubei/v1/next') ||
            url.includes('/youtubei/v1/reel/reel_item_watch') ||
            url.includes('/youtubei/v1/browse');

          if (isPlayerApi) {
            const response = await originalFetch.apply(this, args);
            try {
              const clone = response.clone();
              const data = await clone.json();
              checkAndReportVideoAds(data);
              deepPurgeAdProperties(data);

              const modifiedBody = JSON.stringify(data);
              const newHeaders = new Headers(response.headers);
              newHeaders.set('Content-Type', 'application/json; charset=utf-8');

              const modifiedResponse = new Response(modifiedBody, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders
              });
              try {
                Object.defineProperty(modifiedResponse, 'url', { value: response.url });
              } catch (e) { }
              return modifiedResponse;
            } catch (parseErr) {
              return response;
            }
          }
        }
        return originalFetch.apply(this, args);
      };
    } catch (e) { }

    // 6. Intercept XMLHttpRequest
    try {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this._ytUrl = (typeof url === 'string') ? url : '';
        return originalOpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        if (this._ytUrl && (
          this._ytUrl.includes('/youtubei/v1/player') ||
          this._ytUrl.includes('/youtubei/v1/next') ||
          this._ytUrl.includes('/youtubei/v1/reel/reel_item_watch') ||
          this._ytUrl.includes('/youtubei/v1/browse')
        )) {
          this.addEventListener('readystatechange', function () {
            if (this.readyState === 4 && this.status === 200) {
              try {
                const data = JSON.parse(this.responseText);
                checkAndReportVideoAds(data);
                deepPurgeAdProperties(data);
                const cleanJson = JSON.stringify(data);
                if (this.responseType === 'json') {
                  Object.defineProperty(this, 'response', { value: data, configurable: true });
                } else {
                  Object.defineProperty(this, 'responseText', { value: cleanJson, configurable: true });
                  Object.defineProperty(this, 'response', { value: cleanJson, configurable: true });
                }
              } catch (e) { }
            }
          });
        }
        return originalSend.apply(this, args);
      };
    } catch (e) { }

    // 7. Global JSON.parse hook: automatically sanitizes adPlacements from any internal parse
    try {
      const originalJSONParse = JSON.parse;
      JSON.parse = function (text, reviver) {
        const result = originalJSONParse.apply(this, arguments);
        if (result && typeof result === 'object') {
          if (result.adPlacements || result.adSlots || result.playerAds || result.playerResponse || result.playabilityStatus) {
            checkAndReportVideoAds(result);
            deepPurgeAdProperties(result);
          }
        }
        return result;
      };
    } catch (e) { }

    // 8. Inject YouTube Zero-Ad Shield CSS (Hide enforcement modals, banners, and interruption toasts)
    try {
      if (!document.getElementById('webshield-yt-engine-css')) {
        const style = document.createElement('style');
        style.id = 'webshield-yt-engine-css';
        style.textContent = `
          ytd-enforcement-message-view-model,
          ytd-enforcement-message-renderer,
          #error-screen.ytd-watch-flexy,
          ytd-mealbar-promo-renderer,
          tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
          tp-yt-paper-dialog:has(ytd-enforcement-message-renderer),
          tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model),
          tp-yt-paper-toast:has(a[href*="answer"]),
          tp-yt-paper-toast:has(a[href*="support.google.com"]),
          ytd-notification-action-renderer:has(a[href*="answer"]),
          ytd-notification-action-renderer:has(a[href*="support.google.com"]),
          .ytp-error-content {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
            height: 0 !important;
          }
        `;
        (document.head || document.documentElement).appendChild(style);
      }
    } catch (e) { }

    // 9. Neutralize Anti-Adblock Warning Modals, Interruption Toasts & Auto-Unpause Video (Ultra-Smooth Debounced)
    let clearScheduled = false;
    function scheduleClear() {
      if (clearScheduled) return;
      clearScheduled = true;
      requestAnimationFrame(() => {
        clearScheduled = false;
        clearYouTubeEnforcementDialogs();
      });
    }

    function clearYouTubeEnforcementDialogs() {
      if (!isEnabled()) return;
      try {
        const targetSelectors = 'ytd-enforcement-message-view-model, ytd-enforcement-message-renderer, #feedback.ytd-enforcement-message-view-model';
        const targets = document.querySelectorAll(targetSelectors);
        let removedEnforcement = false;

        targets.forEach(el => {
          const dialog = el.closest('tp-yt-paper-dialog') || el;
          try {
            dialog.style.setProperty('display', 'none', 'important');
            dialog.style.setProperty('visibility', 'hidden', 'important');
            dialog.style.setProperty('pointer-events', 'none', 'important');
          } catch (e) {}
          removedEnforcement = true;
        });

        // Active Video Ad Skipping (Instant Skip & Neutralize Fallback)
        // Note: counting is handled by checkAndReportVideoAds (once per video), not here
        const ytPlayer = document.querySelector('.html5-video-player');
        if (ytPlayer && (ytPlayer.classList.contains('ad-showing') || ytPlayer.classList.contains('ad-interrupting'))) {
          const video = ytPlayer.querySelector('video');
          if (video) {
            video.muted = true;
            if (isFinite(video.duration) && video.duration > 0) {
              video.currentTime = video.duration;
            }
          }
          const skipBtn = ytPlayer.querySelector('.ytp-skip-ad-button, .ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-ad-skip-button-container');
          if (skipBtn) {
            simulateNativeClick(skipBtn);
          }
        }

        // Suppress "Experiencing interruptions?" toasts
        const toasts = document.querySelectorAll('tp-yt-paper-toast, ytd-notification-action-renderer, yt-notification-action-renderer');
        toasts.forEach(toast => {
          if (toast.closest('ytd-live-chat-frame, #chat, #chatframe, yt-live-chat-renderer')) return;
          const text = (toast.textContent || '').toLowerCase();
          if (
            text.includes('sự cố') ||
            text.includes('interruption') ||
            text.includes('tìm hiểu lý do') ||
            text.includes('find out why') ||
            text.includes('chặn quảng cáo') ||
            text.includes('ad blocker') ||
            toast.querySelector('a[href*="answer"]') ||
            toast.querySelector('a[href*="support.google.com"]')
          ) {
            try {
              toast.style.setProperty('display', 'none', 'important');
              toast.style.setProperty('visibility', 'hidden', 'important');
              toast.style.setProperty('pointer-events', 'none', 'important');
            } catch (e) {}
          }
        });

        // Also check if YouTube disabled the player or added error screen
        const errorScreen = document.querySelector('#error-screen.ytd-watch-flexy');
        if (errorScreen && errorScreen.style.display !== 'none') {
          errorScreen.style.setProperty('display', 'none', 'important');
          removedEnforcement = true;
        }

        // Only restore body pointer-events/overflow if an enforcement dialog was actually hidden
        // NEVER call video.play() here — it breaks user's ability to pause & seek!
        if (removedEnforcement) {
          const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
          backdrops.forEach(b => {
            try {
              b.style.setProperty('display', 'none', 'important');
              b.style.setProperty('visibility', 'hidden', 'important');
              b.style.setProperty('pointer-events', 'none', 'important');
            } catch (e) {}
          });

          if (document.body) {
            document.body.style.setProperty('overflow', 'auto', 'important');
            document.body.style.setProperty('pointer-events', 'auto', 'important');
          }
          if (document.documentElement) {
            document.documentElement.style.setProperty('overflow', 'auto', 'important');
            document.documentElement.style.setProperty('pointer-events', 'auto', 'important');
          }
        }
      } catch (e) { }
    }

    try {
      const observer = new MutationObserver(scheduleClear);
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) { }
  }

  // Bulletproof override of Location.prototype navigation to prevent scripted location changes & forced reloads
  if (!isYouTube) {
    try {
      const locationProto = Location.prototype;
      const originalAssign = locationProto.assign;
      const originalReplace = locationProto.replace;
      const originalReload = locationProto.reload;
      const hrefDescriptor = Object.getOwnPropertyDescriptor(locationProto, 'href');

      function checkLocationRedirect(url) {
        return checkNavigationOrPopup(url, 'location change');
      }

      if (hrefDescriptor && hrefDescriptor.set) {
        Object.defineProperty(locationProto, 'href', {
          get: hrefDescriptor.get,
          set: function (val) {
            if (checkLocationRedirect(val)) {
              hrefDescriptor.set.call(this, val);
            }
          },
          configurable: true
        });
      }

      locationProto.assign = function (val) {
        if (checkLocationRedirect(val)) {
          originalAssign.call(this, val);
        }
      };

      locationProto.replace = function (val) {
        if (checkLocationRedirect(val)) {
          originalReplace.call(this, val);
        }
      };

      // Anti-Reload Abuse: Prevent malicious ad scripts or adblock-detection scripts from reload loops
      let lastReloadTime = 0;
      locationProto.reload = function (forcedReload) {
        const now = Date.now();
        const timeSinceLastInteraction = now - lastInteractionTime;
        // If reload called within 4 seconds of previous reload or without real user interaction, block it!
        if (now - lastReloadTime < 4000 || timeSinceLastInteraction > 1500) {
          console.log('[WebShield] Blocked scripted page reload attempt (ad/anti-adblock bypass)');
          reportBlocked(window.location.href, 'Blocked scripted location.reload() loop');
          return;
        }
        lastReloadTime = now;
        if (typeof originalReload === 'function') {
          return originalReload.call(this, forcedReload);
        }
      };

      // Also protect history.go(0) or history.replaceState abuse
      const originalHistoryGo = History.prototype.go;
      History.prototype.go = function (delta) {
        if (delta === 0) {
          const now = Date.now();
          const timeSinceLastInteraction = now - lastInteractionTime;
          if (timeSinceLastInteraction > 1500) {
            console.log('[WebShield] Blocked scripted history.go(0) reload attempt');
            return;
          }
        }
        return originalHistoryGo.apply(this, arguments);
      };
    } catch (e) { }
  }

  function runGenericAntiAdblockBypass() {
    if (isEmbeddedPlayerFrame || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;

    function cleanOverlays() {
      if (!isEnabled()) return;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      try {
        const dialogs = document.querySelectorAll('dialog, [class*="adblock"], [id*="adblock"], [class*="anti-ad"], [id*="anti-ad"], [class*="backdrop"]');
        dialogs.forEach(el => {
          if (isInsideVideoPlayer(el)) return;
          const text = (el.textContent || '').toLowerCase();
          const matchesAdblockText = (
            text.includes('phát hiện trình chặn quảng cáo') ||
            text.includes('vui lòng tắt trình chặn quảng cáo') ||
            text.includes('vui lòng tắt adblock') ||
            text.includes('adblock detected') ||
            text.includes('chặn quảng cáo') ||
            text.includes('turn off adblock') ||
            text.includes('disable adblock')
          );

          if (matchesAdblockText) {
            el.remove();
            console.log('[Anti Pop-Under] Removed anti-adblock overlay element:', el);

            const html = document.documentElement;
            const body = document.body;

            if (html) {
              if (html.style.overflow === 'hidden') html.style.overflow = '';
              if (html.style.pointerEvents === 'none') html.style.pointerEvents = '';
            }
            if (body) {
              if (body.style.overflow === 'hidden') body.style.overflow = '';
              if (body.style.pointerEvents === 'none') body.style.pointerEvents = '';
            }
          }
        });
      } catch (e) { }
    }

    let throttleTimer = null;
    function scheduleBypassScan() {
      if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (!isEnabled()) return;
        cleanOverlays();
      }, 1500);
    }

    try {
      const observer = new MutationObserver((mutations) => {
        for (let i = 0; i < mutations.length; i++) {
          if (isInsideVideoPlayer(mutations[i].target)) continue;
          scheduleBypassScan();
          break;
        }
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) { }

    // Initial scan
    scheduleBypassScan();
  }

  runYouTubeAdGuardEngine();
  runGenericAntiAdblockBypass();
})();
