(function () {
  const currentHost = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
  const isYouTubeHost = currentHost.includes('youtube.com') || currentHost.includes('youtu.be');
  if (isYouTubeHost && window.location && window.location.pathname && window.location.pathname.startsWith('/live_chat')) return;

  // Never run in any sub-frame hosted on or embedded inside YouTube (e.g., 5k7CCto5.html, doubleclick, about:blank)
  try {
    if (window.self !== window.top) {
      if (isYouTubeHost) return;
      const ref = (document.referrer || '').toLowerCase();
      if (ref.includes('youtube.com') || ref.includes('youtu.be') || ref.includes('googlevideo.com')) return;
      if (window.location && window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0) {
        for (let i = 0; i < window.location.ancestorOrigins.length; i++) {
          const orig = String(window.location.ancestorOrigins[i] || '').toLowerCase();
          if (orig.includes('youtube.com') || orig.includes('youtu.be') || orig.includes('googlevideo.com')) return;
        }
      }
    }
  } catch (e) {}

  // Prevent duplicate execution if injected via multiple paths (world: "MAIN" or fallback script tag)
  // On YouTube, never attach any custom property to `window` so Object.keys(window) / getOwnPropertyNames(window) stays 100% clean.
  if (!isYouTubeHost) {
    if (window.__WEBSHIELD_MAIN_INJECTED__) return;
    window.__WEBSHIELD_MAIN_INJECTED__ = true;
    try {
      if (document.documentElement) {
        document.documentElement.setAttribute('data-webshield-main', '1');
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          try { if (document.documentElement) document.documentElement.setAttribute('data-webshield-main', '1'); } catch (e) {}
        }, { once: true });
      }
    } catch (e) {}

    // Developed by HuyTran1002
    console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');
  }

  // Skip sensitive authentication, identity provider, developer portal, and extension store domains
  const SENSITIVE_DOMAINS = [
    'accounts.firefox.com', 'addons.mozilla.org', 'mozilla.org',
    'accounts.google.com', 'myaccount.google.com', 'chromewebstore.google.com', 'chrome.google.com',
    'mail.google.com', 'drive.google.com', 'docs.google.com', 'calendar.google.com', 'meet.google.com', 'chat.google.com',
    'blogger.com', 'www.blogger.com', 'blogspot.com',
    'login.microsoftonline.com', 'login.live.com', 'appleid.apple.com',
    'microsoft.com', 'microsoftonline.com', 'cloud.microsoft', 'live.com', 'office.com', 'outlook.com', 'office365.com',
    'msftauth.net', 'msauth.net',
    'github.com', 'gitlab.com', 'id.atlassian.com', 'auth0.com',
    'paypal.com', 'stripe.com',
    'canva.com', 'figma.com', 'notion.so', 'trello.com'
  ];
  if (SENSITIVE_DOMAINS.some(d => currentHost === d || currentHost.endsWith('.' + d))) {
    return; // Completely inactive on sensitive/auth/productivity domains
  }

  const isYouTube = currentHost.includes('youtube.com') ||
    currentHost.includes('youtu.be') ||
    currentHost.includes('google') ||
    currentHost.includes('blogger') ||
    currentHost.includes('blogspot') ||
    currentHost.includes('doubleclick');

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
    'blogger.com', 'blogspot.com',
    'facebook.com', 'fb.com', 'm.facebook.com',
    'twitter.com', 'x.com',
    'github.com', 'apple.com', 'microsoft.com', 'microsoftonline.com', 'cloud.microsoft',
    'office.com', 'outlook.com', 'office365.com', 'live.com', 'msftauth.net', 'msauth.net',
    'paypal.com', 'stripe.com', 'momo.vn', 'vnpay.vn', 'onepay.vn', 'payoo.vn', 'shopeepay.vn', 'zalopay.vn',
    'youtube.com', 'youtu.be', 'zalo.me', 't.me', 'telegram.org',
    'linkedin.com', 'instagram.com', 'vimeo.com', 'dailymotion.com', 'twitch.tv',
    'auth0.com', 'firebaseapp.com', 'okta.com',
    'canva.com', 'figma.com', 'notion.so'
  ];

  function isCurrentPageWhitelisted() {
    try {
      const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
      let refHost = '';
      try {
        if (window.self !== window.top && document.referrer) {
          refHost = new URL(document.referrer).hostname.toLowerCase();
        }
      } catch (e) {}

      if (whitelistedDomains.some(domain => typeof domain === 'string' && (
        host === domain || host.endsWith('.' + domain) ||
        (refHost && (refHost === domain || refHost.endsWith('.' + domain)))
      ))) {
        return true;
      }
      if (typeof sessionStorage !== 'undefined') {
        if (sessionStorage.getItem('__webshield_enabled__') === 'false') return true;
        const rawDisabled = sessionStorage.getItem('__webshield_disabled_domains__');
        if (rawDisabled) {
          const disabledList = JSON.parse(rawDisabled);
          if (Array.isArray(disabledList) && disabledList.some(d => typeof d === 'string' && (
            host === d || host.endsWith('.' + d) || d.endsWith('.' + host) ||
            (refHost && (refHost === d || refHost.endsWith('.' + d) || d.endsWith('.' + refHost)))
          ))) {
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
          const host = (window.location && window.location.hostname) ? window.location.hostname.toLowerCase() : '';
          let refHost = '';
          try {
            if (window.self !== window.top && document.referrer) {
              refHost = new URL(document.referrer).hostname.toLowerCase();
            }
          } catch (e) {}

          const disabledList = JSON.parse(rawDisabled);
          if (Array.isArray(disabledList) && disabledList.some(d => typeof d === 'string' && (
            host === d || host.endsWith('.' + d) || d.endsWith('.' + host) ||
            (refHost && (refHost === d || refHost.endsWith('.' + d) || d.endsWith('.' + refHost)))
          ))) {
            extensionEnabled = false;
            return false;
          }
        }
      }
    } catch (e) {}
    return extensionEnabled;
  }

  // Synchronous check: if WebShield is disabled globally or for this domain by user, exit immediately!
  if (!isEnabled()) {
    return;
  }

  // Strict YouTube Isolation: On YouTube, ONLY run the communication handshake and native AdGuard YouTube Engine.
  // Never execute generic popunder/movie-site prototype overrides (insertBefore, appendChild, addEventListener, etc.).
  if (isYouTubeHost) {
    setupYouTubeHandshakeAndHelpers();
    runYouTubeAdGuardEngine();
    return;
  }

  // Safe ID accessor that avoids DOM clobbering (e.g. form elements with <input name="id">) & SVGAnimatedString
  function getSafeId(el) {
    if (!el || el.nodeType !== 1) return '';
    if (typeof el.id === 'string') return el.id;
    try {
      if (typeof el.getAttribute === 'function') {
        const attr = el.getAttribute('id');
        if (typeof attr === 'string') return attr;
      }
    } catch (e) {}
    return '';
  }

  // 91porn / 91porna Landing Modal Suppressor
  // Pre-seed localStorage key '__landing_modal_at__' with today's date (YYYY-MM-DD)
  // so the website's own common.js script skips showing #tip_modal and .modal-backdrop
  try {
    if (currentHost.includes('91porn')) {
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      localStorage.setItem('__landing_modal_at__', todayStr);
    }
    if (currentHost.includes('xnhau')) {
      // Disarm webGate popunder timers
      localStorage.setItem('lastPopunderTime', String(Date.now() + 365 * 86400000));
      localStorage.setItem('xnPopSeen', '9999');
    }
  } catch (e) {}

  // Universal KVS / Flowplayer / xnPlayer Ad & Popunder Sanitizer
  // Kernel Video Sharing (KVS) is the core engine behind thousands of adult & streaming tube sites.
  // Sites configure player ads via xnConf, kt_player, xnPlayer, flowplayer with parameters like:
  // adv_start_html, adv_pause_html, popunder_url, vast_url.
  // Preemptively sanitizing these configs guarantees no ad iframe or is-ad-visible state is ever spawned!
  try {
    function sanitizeKvsConfig(conf) {
      if (!conf || typeof conf !== 'object') return conf;
      try {
        conf.adv_start_html = '';
        conf.adv_start_html_adaptive = '';
        conf.adv_pause_html = '';
        conf.adv_pause_html_adaptive = '';
        conf.adv_pre = '';
        conf.adv_post = '';
        conf.adv_midroll = '';
        conf.popunder_url = '';
        conf.popunder_times = '0';
        conf.popunder_duration = '0';
        conf.popunder_start_after = '999999';
        conf.vast_url = '';
        conf.vast_preroll = '';
        conf.vast_midroll = '';
      } catch (e) {}
      return conf;
    }

    function wrapGlobalConfigObject(objName) {
      let _val = undefined;
      try {
        Object.defineProperty(window, objName, {
          get() { return _val; },
          set(val) {
            _val = sanitizeKvsConfig(val);
          },
          configurable: true
        });
      } catch (e) {}
    }
    wrapGlobalConfigObject('xnConf');
    wrapGlobalConfigObject('flashvars');
    wrapGlobalConfigObject('player_conf');
    wrapGlobalConfigObject('video_player_config');

    function wrapKvsPlayerInit(fnName) {
      let _orig = window[fnName];
      Object.defineProperty(window, fnName, {
        get() { return _orig; },
        set(fn) {
          if (typeof fn === 'function') {
            _orig = function (id, swf, w, h, conf, ...args) {
              if (conf) sanitizeKvsConfig(conf);
              return fn.call(this, id, swf, w, h, conf, ...args);
            };
            try { Object.assign(_orig, fn); } catch (e) {}
          } else {
            _orig = fn;
          }
        },
        configurable: true
      });
    }
    wrapKvsPlayerInit('xnPlayer');
    wrapKvsPlayerInit('kt_player');
    wrapKvsPlayerInit('kvsPlayer');

    let _origFlowplayer = window.flowplayer;
    Object.defineProperty(window, 'flowplayer', {
      get() { return _origFlowplayer; },
      set(fn) {
        if (typeof fn === 'function') {
          _origFlowplayer = function (...args) {
            args.forEach(arg => {
              if (arg && typeof arg === 'object') sanitizeKvsConfig(arg);
            });
            return fn.apply(this, args);
          };
          try { Object.assign(_origFlowplayer, fn); } catch (e) {}
        } else {
          _origFlowplayer = fn;
        }
      },
      configurable: true
    });
  } catch (e) {}

  // Universal Clickjacking & Malicious Window-Capture Interceptor
  // Sites like xnhau.pub register window.addEventListener('click'/'mousedown', webGate, true)
  // which hijacks trusted user clicks on the play button, invokes stopImmediatePropagation(),
  // triggers window.open(), and dispatches an untrusted synthetic MouseEvent cancelled with preventDefault().
  // We inspect capture listeners attached to window/document for known ad-hijacking patterns and neutralize them.
  try {
    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if ((type === 'click' || type === 'mousedown' || type === 'pointerdown' || type === 'pointerup' || type === 'touchstart' || type === 'touchend') && listener && typeof listener === 'function') {
        const isCapture = options === true || (typeof options === 'object' && options !== null && !!options.capture);
        if (isCapture && (this === window || this === document || this === document.documentElement || this === document.body)) {
          let fnStr = '';
          try { fnStr = Function.prototype.toString.call(listener); } catch(e) {}
          if (fnStr && (
            /lastPopunder|openUntil|playTap|adLink|__PPU_|TAG_ZONE|TAG_SRC|snvbchm|acquirecarded|badlandlisp/i.test(fnStr) ||
            /skipPopOnRightButtonClick|clicksSinceSessionStart|clicksSinceLastPpu|iOSChromeSwapPopunder|desktopPopunderEverywhere/i.test(fnStr) ||
            /\.gn\.forEach\s*\(\s*function/i.test(fnStr) ||
            (/stopAll\.call|stopImmediatePropagation/i.test(fnStr) && /MouseEvent/i.test(fnStr) && /is-ad-visible/i.test(fnStr))
          )) {
            console.log('[Anti Pop-Under] Blocked malicious capture click-hijacker listener:', type, listener.name || 'anonymous');
            return; // Drop the malicious listener completely!
          }
        }
      }
      return origAddEventListener.apply(this, arguments);
    };
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
        try {
          reportBlocked('popup-config', 'Vô hiệu hóa cấu hình cửa sổ bật lên (POPUP_CONFIG)', 1);
        } catch (e) {}
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

  // Universal VAST & In-Player Video Ad Neutralizer (vlstream, streamvl, adxcontent, embed-vast)
  // When ad networks (like adxcontent.com) are blocked by DNR, streaming player scripts like
  // embed-vast.js enter an infinite loop waiting for window.funcGetvastAdx to return ads before
  // calling jwplayer().setup(). This causes the video player to spin forever with a loading spinner.
  // Pre-defining funcGetvastAdx to return an empty array and funcJWonReadyVAST to a no-op allows
  // JWPlayer / HLS to initialize immediately with ZERO ads and ZERO waiting!
  try {
    const emptyVastSchedule = Object.freeze([]);
    let reportedVast = false;
    Object.defineProperty(window, 'funcGetvastAdx', {
      get() {
        return function () {
          if (!reportedVast) {
            reportedVast = true;
            try {
              reportBlocked('inplayer-vast-ad', 'Chặn quảng cáo video đầu phát (VAST Ads)', 2);
            } catch (e) {}
          }
          return emptyVastSchedule;
        };
      },
      set(val) {},
      configurable: true
    });
    let reportedBanner = false;
    Object.defineProperty(window, 'funcJWonReadyVAST', {
      get() {
        return function () {
          if (!reportedBanner) {
            reportedBanner = true;
            try {
              reportBlocked('inplayer-banner-ad', 'Chặn banner quảng cáo đè trên trình phát', 1);
            } catch (e) {}
          }
        };
      },
      set(val) {},
      configurable: true
    });
    let _internalSchedule = emptyVastSchedule;
    Object.defineProperty(window, '_schedule', {
      get() { return _internalSchedule; },
      set(val) {
        if (val !== null && val !== undefined) {
          _internalSchedule = val;
        } else {
          _internalSchedule = emptyVastSchedule;
        }
      },
      configurable: true
    });
    Object.defineProperty(window, 'show_adx', {
      get() { return 0; },
      set(val) {},
      configurable: true
    });
    Object.defineProperty(window, 'COUNT_VAST', {
      get() { return 0; },
      set(val) {},
      configurable: true
    });
    Object.defineProperty(window, 'tvcBannerClosed', {
      get() { return true; },
      set(val) {},
      configurable: true
    });
    Object.defineProperty(window, 'bannerAdxAllowed', {
      get() { return function () { return false; }; },
      set(val) {},
      configurable: true
    });
    // Neutralize TVC pre-roll preroll ad flag on movie sites (hotphimvn.store, mflix.store, etc.)
    // Forces build_jwplayer to immediately call build_player_after_ads() and bypass #tvc-iframe
    Object.defineProperty(window, 'on_tvc', {
      get() { return 0; },
      set(val) {},
      configurable: true
    });
    if (window.location && typeof window.location.pathname === 'string' && window.location.pathname.includes('/ajax/tvc')) {
      try {
        window.parent.postMessage('tvc:done', '*');
      } catch (e) {}
    }
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
  // Preemptively catches and drops ad containers from known malicious ad networks
  try {
    function isSuspectOverlayNode(node) {
      if (!node || node.nodeType !== 1) return false;
      if (isYouTube || !isEnabled() || isCurrentPageWhitelisted()) return false;
      const tag = (node.tagName || '').toLowerCase();
      const id = getSafeId(node).toLowerCase();
      const className = (typeof node.className === 'string') ? node.className.toLowerCase() : '';

      // 1. Intercept Adsterra Social Bar containers, ExoClick splash ads, Clickadu OnClick/Mobile Spot & floating ad boxes immediately
      if (id.startsWith('atcontainer') || id.includes('atcontainer') || className.includes('atcontainer') ||
          className.includes('adsbyexoclick') || id.includes('exoclick') || id.includes('splash') ||
          id.includes('clb-spot') || id.startsWith('__clb') || className.includes('clb-spot') || className.startsWith('__cld-') ||
          className.includes('fxpane') || id.includes('fxstartpane') || className.includes('fxfallback') ||
          (node.hasAttribute && (node.hasAttribute('data-cl-overlay') || node.hasAttribute('data-cl-spot') || node.hasAttribute('data-clocid') || node.hasAttribute('data-admpid'))) ||
          (node.getAttribute && (node.getAttribute('data-zoneid') || node.getAttribute('data-ad-id') || node.getAttribute('data-cl-spot') || node.getAttribute('data-clocid')))) {
        return true;
      }

      // 1b. Intercept dynamically appended ad <script> tags (Clickadu JSONP /get/{zoneId}?id={zoneId}, WPAdMngr, PopAds, etc.)
      if (tag === 'script') {
        const sSrc = (node.src || (node.getAttribute && node.getAttribute('src')) || '').toLowerCase();
        if (sSrc && (/\/get\/\d+\?id=\d+/i.test(sSrc) || /\/on\.js(?:\?|$)/i.test(sSrc) || /wpadmngr|wpshsdk|wpushsdk|nawpush|ntvpwpush|tubecup|metricswpsh|capndr|korlumo|zog\.link|realsrv|exosrv|magsrv|popads|popcash|astronautlividlyreformer|src\/jpm\.js|src\/jph\.js/i.test(sSrc))) {
          return true;
        }
      }

      // 2. Intercept ad iframes from known splash/ad networks and KVS in-player ad iframes
      if (tag === 'iframe') {
        const src = (node.src || node.getAttribute('data-src') || '').toLowerCase();
        if (/splash\.php|syndication\.|exosrv|realsrv|adxadserv|onclickmax|eyebrowscrambledlater|visariomedia|zlinkm|html\.php\?aid=|start_html|pause_html/.test(src)) {
          return true;
        }
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
      try {
        if (referenceNode && referenceNode.parentNode !== this) {
          // If referenceNode was removed or is not a child of this node (e.g. ad cleanup or hydration mismatch),
          // fallback to appendChild to prevent fatal DOMException crashes
          return origAppendChild.call(this, newNode);
        }
        return origInsertBefore.apply(this, arguments);
      } catch (err) {
        if (err && (err.name === 'NotFoundError' || err.code === 8)) {
          try {
            return origAppendChild.call(this, newNode);
          } catch(e) {}
        }
        throw err;
      }
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
  if (!isYouTube && isEnabled() && !isCurrentPageWhitelisted()) {
    try {
      const overlayKillerStyle = document.createElement('style');
      overlayKillerStyle.id = 'webshield-overlay-killer';
      overlayKillerStyle.textContent = `
      [id^="atContainer-"], [id*="atContainer-"], [class*="atContainer-"],
      [id*="at-container"], [class*="at-container"],
      .adsbyexoclick, ins.adsbyexoclick, [data-zoneid],
      iframe[src*="splash.php"], iframe[src*="syndication."],
      iframe[src*="exosrv."], iframe[src*="realsrv."],
      iframe[src*="adxadserv."], iframe[src*="onclickmax."],
      iframe[src*="eyebrowscrambledlater."],
      div[id*="cboxOverlay"], div[id*="colorbox"]:has(iframe),
      [id*="clb-spot"], [id^="__clb"], [class*="clb-spot"], [id*="-spot_"][id*="clb"],
      #nuevoa, #anuevo, #aclose, .nva-center, .nva-midroll, .nva-preroll, .nva-banner,
      .vast_clickthrough_layer, .midroll_back, .fluid_vpaid_slot,
      .vjs-preroll, .vjs-ad-container, .vjs-ad-overlay,
      div[id*="player_one_ad"], div[id*="player_one"][class*="ad"],
      ins.adsbygoogle[data-anchor-status],
      ins.adsbygoogle[data-ad-status="filled"][data-anchor-shown="true"],
      .google-anno-fold,
      div[id^="google_ads_iframe"][id*="anchor"],
      div[id^="aswift_"][style*="position: fixed"],
      div[id*="ad-bottom-bar"]:not([class*="player"]):not([class*="thumb"]):not([class*="movie"]),
      div[id*="sticky-banner"]:not([class*="player"]):not([class*="thumb"]):not([class*="movie"]),
      div[class*="floating-ad"]:not([class*="player"]):not([class*="thumb"]):not([class*="movie"]),
      #catfishPcGuest, .fxMidGrid, .fxMidWrap, [id*="catfishPcGuest"], [class*="fxMidGrid"], [class*="fxMidWrap"],
      #adFloat, #ad_float, #ad-float, .adFloat, .ad-float,
      #floatAd, #float_ad, #float-ad, .floatAd, .float-ad,
      [id*="adFloat" i], [class*="adFloat" i], [id*="floatAd" i], [class*="floatAd" i],
      [id*="float_ad" i], [class*="float_ad" i], [id*="ad_float" i], [class*="ad_float" i],
      .spot, div.spot, [data-clocid], div[data-cl-overlay], [data-cl-spot],
      .kt-player .fxPane, #fxStartPane, .fxPane, .fxPaneBody, .fxPaneClose, .fxFallback,
      .kt-player iframe[src*="html.php"], .player-holder iframe[src*="html.php"],
      iframe[src*="html.php"], iframe[src*="start_html"], iframe[src*="pause_html"],
      div:has(> iframe[src*="html.php"]), div:has(> .fxPane),
      .video-ad-overlay, .jw-ad-ui, .vjs-ad-loading, .art-ad-container, .ads-overlay-wrapper,
      div[style*="position: fixed"][style*="bottom: 0"]:not([class*="player"]):not([class*="header"]):not([class*="nav"]):not(.top-links),
      div[style*="position: fixed"][style*="bottom:0"]:not([class*="player"]):not([class*="header"]):not([class*="nav"]):not(.top-links),
      div[style*="position:fixed"][style*="bottom:0"]:not([class*="player"]):not([class*="header"]):not([class*="nav"]):not(.top-links),
      div[style*="bottom: 0px"][style*="position: fixed"]:not([class*="player"]):not([class*="header"]):not([class*="nav"]):not(.top-links),
      div[style*="bottom: 0"][style*="position: fixed"]:not([class*="player"]):not([class*="header"]):not([class*="nav"]):not(.top-links),
      div:has(> a[href*="acquirecarded"]), div:has(> a[href*="badlandlisp"]), div:has(> a[href*="sc88"]),
      a[href*="acquirecardedsullen.com"], a[href*="badlandlispyippee.com"] {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
        width: 0 !important;
        height: 0 !important;
        opacity: 0 !important;
        z-index: -999999 !important;
      }

      .kt-player.is-ad-visible .fp-ui,
      .kt-player .fp-ui,
      .kt-player .fp-play,
      .kt-player video {
        display: block !important;
        pointer-events: auto !important;
        visibility: visible !important;
        opacity: 1 !important;
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

    // Vô hiệu hóa hàm tạo banner/popunder WebAssembly trên xnhau (snvbchm)
    try {
      let _snvbchm = function() {};
      Object.defineProperty(window, 'snvbchm', {
        get() { return _snvbchm; },
        set(val) { /* no-op */ },
        configurable: true
      });
    } catch(e) {}
  }


  // --- EMBEDDED PLAYER IFRAME DETECTION ---
  // When inject.js runs inside a cross-origin player iframe (e.g. streamvl.top, streamc.xyz, embed15.streamc.xyz),
  // API overrides (getComputedStyle, offsetHeight, getBoundingClientRect, bait stubs, CSS injection)
  // can break the player's internal click-to-pause and timeline controls.
  // Detect and flag these frames so dangerous overrides are skipped.
  const isEmbeddedPlayerFrame = (function () {
    if (window.self === window.top) return false; // Top-level page, not an iframe
    try {
      const host = window.location.hostname.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      // Known embedded player domains
      if (/streamvl|vlstream|streamc|embed\d*\.|play\d*\.|player|hls|stream|media|cdn|video|vidsrc|2embed|superembed/.test(host)) return true;
      // Common player URL patterns
      if (/\/watch|\/embed|\/player|\/play|\/stream|\/hls|\/video|\/v\//.test(path)) return true;
      // Has a video element already (very likely a player frame)
      if (document.querySelector('video, #video_player, .jwplayer, .video-js, .artplayer, .dplayer, .plyr')) return true;
    } catch (e) {}
    return false;
  })();

  if (isEmbeddedPlayerFrame) {
    console.log('[Anti Pop-Under] Detected embedded player iframe, skipping anti-adblock overrides to protect player:', window.location.hostname);
  }

  // --- STREAM GUARD & BOOTSTRAP AD / TVC INTERCEPTOR ---
  // Neutralizes anti-adblock probe locking, DevTools detection, and TVC/VAST pre-roll ads on embedded streaming players (e.g. Streamc / Guard-7 / JWPlayer).
  // Prevents sites from blocking dev mode, locking sessions, pausing video, or displaying anti-adblock modals.
  function sanitizeBootstrapPayload(res) {
    if (!res || typeof res !== 'object') return res;
    try {
      if (res.browserGuard && typeof res.browserGuard === 'object') {
        res.browserGuard.block_shortcuts = false;
        res.browserGuard.block_context_menu = false;
        res.browserGuard.detect_devtools = false;
        res.browserGuard.anti_adblock = false;
      }
      if (res.ads && typeof res.ads === 'object') {
        res.ads.enabled = false;
      }
      // Neutralize TVC / VAST pre-roll ads from Streamc bootstrap
      if (res.tvc && typeof res.tvc === 'object') {
        res.tvc.enabled = false;
        res.tvc.mode = 'none';
        res.tvc.tags = [];
      }
      if (res.advertising && typeof res.advertising === 'object') {
        delete res.advertising;
      }
      if (typeof res.on_tvc !== 'undefined') {
        res.on_tvc = 0;
      }
    } catch (e) {}
    return res;
  }

  try {
    const origJsonParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      const res = origJsonParse.apply(this, arguments);
      return sanitizeBootstrapPayload(res);
    };
  } catch (e) {}

  try {
    const origResponseJson = Response.prototype.json;
    Response.prototype.json = async function () {
      const res = await origResponseJson.apply(this, arguments);
      return sanitizeBootstrapPayload(res);
    };
  } catch (e) {}

  try {
    sessionStorage.removeItem('stream-guard:devtools-session-lock:v1');
    const origSessionSetItem = sessionStorage.setItem;
    sessionStorage.setItem = function (key, value) {
      if (typeof key === 'string' && key.startsWith('stream-guard:devtools-session-lock')) {
        return;
      }
      return origSessionSetItem.apply(this, arguments);
    };
  } catch (e) {}

  // --- UNIVERSAL JWPLAYER PRE-ROLL / VAST AD ELIMINATOR ---
  (function hookJwPlayer() {
    function sanitizeJwOptions(opts) {
      if (!opts || typeof opts !== 'object') return opts;
      try {
        if (opts.advertising) delete opts.advertising;
        if (opts.adschedule) delete opts.adschedule;
        if (opts.arrPreroll) opts.arrPreroll = '';
        if (opts.preroll) delete opts.preroll;
        if (typeof opts.skip_ads !== 'undefined') opts.skip_ads = 1;
      } catch (e) {}
      return opts;
    }

    function wrapJwInstance(inst) {
      if (!inst || inst.__ws_wrapped) return inst;
      try {
        inst.__ws_wrapped = true;
        const origSetup = inst.setup;
        if (typeof origSetup === 'function') {
          inst.setup = function (options) {
            return origSetup.call(this, sanitizeJwOptions(options));
          };
        }
        if (typeof inst.on === 'function') {
          const autoSkip = function () {
            try {
              if (typeof inst.skipAd === 'function') inst.skipAd();
            } catch (e) {}
          };
          inst.on('adPlay', autoSkip);
          inst.on('adStarted', autoSkip);
          inst.on('adTime', autoSkip);
          inst.on('adSchedule', autoSkip);
          inst.on('adError', function () {
            try {
              if (typeof inst.play === 'function') inst.play();
            } catch (e) {}
          });
          inst.on('adBlock', function () {
            try {
              if (typeof inst.play === 'function') inst.play();
            } catch (e) {}
          });
        }
      } catch (e) {}
      return inst;
    }

    function createJwProxy(realJw) {
      if (typeof realJw !== 'function') return realJw;
      return new Proxy(realJw, {
        apply(target, thisArg, args) {
          const inst = Reflect.apply(target, thisArg, args);
          return wrapJwInstance(inst);
        },
        construct(target, args, newTarget) {
          const inst = Reflect.construct(target, args, newTarget);
          return wrapJwInstance(inst);
        }
      });
    }

    let currentJw = window.jwplayer;
    if (typeof currentJw === 'function') {
      window.jwplayer = createJwProxy(currentJw);
    }

    try {
      Object.defineProperty(window, 'jwplayer', {
        configurable: true,
        enumerable: true,
        get() { return currentJw; },
        set(val) {
          currentJw = typeof val === 'function' ? createJwProxy(val) : val;
        }
      });
    } catch (e) {}
  })();

  // --- UNIVERSAL VIDEO AD AUTO-SKIPPER & FAST-FORWARD ---
  (function initUniversalVideoAdSkipper() {
    if (isYouTube) return; // YouTube has its own dedicated native engine below
    const SKIP_SELECTORS = [
      '.jw-skip', '.jw-skip-button', '.jw-ad-skip-button', '.jw-skip-icon', '.jw-skippable',
      '.video-ads .ad-skip-button', '.video-ad-skip', '.skip-ad', '.ad-skip',
      '.vjs-skip-ad-button', '.fluid_ad_skip_button', '.art-ad-skip', '.dplayer-ad-skip',
      '[class*="skip-ad" i]', '[class*="ad-skip" i]', '[id*="skip-ad" i]', '[id*="ad-skip" i]'
    ];

    function trySkip() {
      // 1. Instantly click native skip buttons in DOM
      for (const sel of SKIP_SELECTORS) {
        const btns = document.querySelectorAll(sel);
        for (const btn of btns) {
          try {
            if (btn.__ws_clicked) continue;
            const style = window.getComputedStyle ? window.getComputedStyle(btn) : null;
            if (style && (style.display === 'none' || style.visibility === 'hidden') && !btn.classList.contains('jw-skip')) {
              continue;
            }
            btn.__ws_clicked = true;
            btn.click();
          } catch (e) {}
        }
      }

      // 2. Fast-forward video ad elements if JWPlayer is in ad state
      try {
        const adPlayer = document.querySelector('.jwplayer.jw-flag-ads, .jw-media-ad');
        if (adPlayer) {
          const adVideo = adPlayer.querySelector('video');
          if (adVideo && !adVideo.__ws_ff) {
            adVideo.__ws_ff = true;
            adVideo.muted = true;
            if (Number.isFinite(adVideo.duration) && adVideo.duration > 0) {
              adVideo.currentTime = adVideo.duration;
            } else {
              adVideo.playbackRate = 16;
            }
          }
        }
      } catch (e) {}
    }

    if (typeof MutationObserver !== 'undefined') {
      const obs = new MutationObserver(() => trySkip());
      obs.observe(document.documentElement || document, { childList: true, subtree: true });
    }
    const interval = setInterval(trySkip, 200);
    setTimeout(() => {
      clearInterval(interval);
      setInterval(trySkip, 1000);
    }, 15000);
  })();

  // Anti-Anti-Adblock & Ad SDK Disarm logic for movie & tube sites (runs in both main frame and embedded player frames!)
  (function () {
    if (window.location.hostname.includes('youtube.com') ||
      window.location.hostname.includes('google') ||
      window.location.hostname.includes('doubleclick')) return;

    // Universal Ad Script & Clickadu/WPAdMngr/PopAds Disarm (MUST run in embedded player iframes like dooplayer.com too!)
    try {
      // 0a. Disarm Clickadu OnClick (on.js) ProxyListener, PrefetchService, onclopen, and loaded flags
      const noopProxyListener = Object.freeze({
        init: function () {},
        addRealHandler: function () {},
        gn: new Set(),
        mn: true,
        proxy: function () {}
      });
      const noopPrefetchService = Object.freeze({
        addUrls: function () {}
      });
      try {
        Object.defineProperty(window, 'UHJveHlMaXN0ZW5lcg==', {
          get() { return noopProxyListener; },
          set() {},
          configurable: false
        });
      } catch (e) {}
      try {
        Object.defineProperty(window, 'UHJlZmV0Y2hTZXJ2aWNl', {
          get() { return noopPrefetchService; },
          set() {},
          configurable: false
        });
      } catch (e) {}
      try {
        Object.defineProperty(window, 'onclopen', {
          get() { return function () { return null; }; },
          set() {},
          configurable: false
        });
      } catch (e) {}
      ['zfgloadedpopup', 'zfgloadedonclick', 'zfgcodeloadedonclick', 'zfgloadedpushup', 'zfgloadedinpage', 'zfgloadedbanner', 'zfgloadedtag'].forEach(flag => {
        try {
          Object.defineProperty(window, flag, {
            get() { return true; },
            set() {},
            configurable: false
          });
        } catch (e) {}
      });

      // 0b. Disarm WPAdMngr / Clickaine (adManager.js), PopAds (jpm.js), HilltopAds, and ExoClick VideoSlider globals
      const dummyAdManager = {
        init: function () {},
        push: function () {},
        show: function () {},
        run: function () {},
        register: function () {},
        on: function () {},
        runFormatSpot: function () {},
        enableMagmaClickResolver: function () {},
        addReconsileParams: function () {}
      };
      ['AdManager', 'a3klsam', '_CAdM', '__adm_override', 'wpadmngr', 'wpshsdk', '_wpsh', 'admpid', '_adp'].forEach(key => {
        try {
          Object.defineProperty(window, key, {
            get() { return dummyAdManager; },
            set() {},
            configurable: true
          });
        } catch (e) {}
      });
      const dummyPopArray = Object.freeze({
        push: function () { return 0; },
        length: 0,
        forEach: function () {},
        map: function () { return []; },
        slice: function () { return []; }
      });
      ['_pop', '__htapop', 'exoOpts'].forEach(key => {
        try {
          Object.defineProperty(window, key, {
            get() { return dummyPopArray; },
            set() {},
            configurable: true
          });
        } catch (e) {}
      });

      // 0b1. Disarm PopAds (jpm.js / jph.js / visariomedia / xbetween) tokens and ExoClick
      ['fcc61ea9f74fd6326508704617f53191', 'fcc61ea9f74fd632fcc61ea9f74fd632'].forEach(key => {
        try {
          Object.defineProperty(window, key, {
            get() {
              
                            return true;
            },
            set() {},
            configurable: false
          });
        } catch (e) {}
      });

      // 0c. Hide ad script self-discovery attributes (script[data-clocid], script[data-admpid], etc.) from querySelector
      // Both Clickadu on.js and WPAdMngr adManager.js locate their own <script> tag via document.querySelector('script[data-clocid]')
      // or document.querySelector('script[data-admpid]') and abort immediately if it returns null!
      const adScriptSelectorRegex = /script\s*\[\s*data-(?:clocid|clbaid|clipid|clpuid|cltgid|admpid|admman|zoneid)/i;
      const origDocQS = Document.prototype.querySelector;
      if (origDocQS) {
        Document.prototype.querySelector = function (selector) {
          if (typeof selector === 'string' && adScriptSelectorRegex.test(selector) && isEnabled() && !isCurrentPageWhitelisted()) {
            return null;
          }
          return origDocQS.apply(this, arguments);
        };
      }
      const origElQS = Element.prototype.querySelector;
      if (origElQS) {
        Element.prototype.querySelector = function (selector) {
          if (typeof selector === 'string' && adScriptSelectorRegex.test(selector) && isEnabled() && !isCurrentPageWhitelisted()) {
            return null;
          }
          return origElQS.apply(this, arguments);
        };
      }
    } catch (e) {}

    function isAdUrl(urlStr) {
      if (!urlStr) return false;
      try {
        const lower = String(urlStr).toLowerCase();
        if (/\/get\/\d+\?id=\d+/i.test(lower) || /\/solid\.gif\?z=/i.test(lower)) return true;
        const keywords = [
          'doubleclick', 'googlesyndication', 'googleadservices', 'adsterra', 'popads',
          'popcash', 'propellerads', 'exoclick', 'exosrv', 'realsrv', 'clktag', 'onclickads', 'exdynsrv',
          'juicyads', 'mgid.com', 'taboola', 'outbrain', 'adnxs', 'onclickalgo',
          'highperformancegate', 'highcpmgate', 'greatcpmgate', 'eclick.vn', 'novanet.vn',
          'magsrv.com', 'mnaspm.com', 'mayzaent.com', 'prplad.com', 'monetag.com', 'smartpop',
          '/ad?type=', 'adspro.name', 'streamux.top', 'hbet.loan', 'lu88.ist',
          'tx88.army', 'vu88.foo', '9bet.beer', 'du88.money', 'vua88.eco', '789club.zip',
          'ima3.js', 'trafficjunky', 'tsyndicate', 'a-ads.com',
          'wpadmngr', 'wpshsdk', 'wpushsdk', 'nawpush', 'ntvpwpush', 'ntvpforever', 'tubecup.net',
          'metricswpsh', 'capndr.com', 'korlumo.com', 'zog.link', 'nereserv.com', 'vidvas3.com',
          'amazingcontent.site', 'multstorage.com', 'gstcpx.site', 'uuidksinc.net', 'infrapu.sh',
          'astronautlividlyreformer', 'src/jpm.js', 'src/jph.js',
          'visariomedia', 'xbetween', 'd13k7prax1yi04', 'magnific-popup', 'video-slider', 'ad-provider',
          'detectivefrozepriceless', 'hilltopads', 'clickadu', 'adxad', 'adtng', 'etahub',
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
            if (typeof val === 'string' && isAdUrl(val) && isEnabled() && !isCurrentPageWhitelisted()) {
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
          if (tag === 'script' && typeof name === 'string') {
            const attrLower = name.toLowerCase();
            if (attrLower === 'src' && typeof value === 'string' && isAdUrl(value) && isEnabled() && !isCurrentPageWhitelisted()) {
              originalSetAttribute.call(this, name, 'data:text/javascript;charset=utf-8;base64,;');
              return;
            }
            if (/^data-(?:clocid|clbaid|clipid|clpuid|cltgid|admpid)$/i.test(attrLower) && isEnabled() && !isCurrentPageWhitelisted()) {
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

    // Skip heavy bait stub DOM injection in embedded player iframes to keep player DOM clean
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

    // Neutralize TVC pre-roll preroll ad flag on movie sites (hotphimvn.store, mflix.store, etc.)
    // Setting on_tvc = 0 forces build_jwplayer to immediately call build_player_after_ads(), bypassing #tvc-iframe
    try {
      Object.defineProperty(window, 'on_tvc', {
        get() { return 0; },
        set(val) {},
        configurable: true
      });
      const autoResolveTvc = () => {
        try {
          const tvc = document.getElementById('tvc-iframe') || document.querySelector('iframe[src*="/ajax/tvc"]');
          if (tvc) {
            window.postMessage('tvc:done', '*');
          }
        } catch (e) {}
      };
      if (typeof window.addEventListener === 'function') {
        window.addEventListener('DOMContentLoaded', autoResolveTvc, { once: true });
        window.addEventListener('load', autoResolveTvc, { once: true });
      }
      if (typeof MutationObserver !== 'undefined') {
        const tvcObserver = new MutationObserver(autoResolveTvc);
        tvcObserver.observe(document.documentElement || document, { childList: true, subtree: true });
      }
    } catch (e) {}

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
      DummyExoVideoSlider.init = function () { };
      DummyExoVideoSlider.repeat = function () { };
      DummyExoVideoSlider.prototype.init = function () { };
      DummyExoVideoSlider.prototype.repeat = function () { };
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
      // Known ad overlays that inject inside player containers must NOT be protected
      if (el.closest && el.closest(
        '#nuevoa, #anuevo, #aclose, .nva-center, .nva-midroll, .nva-preroll, .nva-banner, ' +
        '.vast_clickthrough_layer, .midroll_back, .fluid_vpaid_slot, ' +
        '.vjs-preroll, .vjs-ad-container, .vjs-ad-overlay, ' +
        '.fxPane, #fxStartPane, .fxPaneBody, .fxPaneClose, .fxFallback, ' +
        'iframe[src*="html.php"], iframe[src*="start_html"], iframe[src*="pause_html"], ' +
        'div:has(> iframe[src*="html.php"]), div:has(> .fxPane), ' +
        '[data-cl-spot], [data-cl-overlay], [data-clocid], .video-ad-overlay, ' +
        'div[id*="player_one_ad"], div[id*="player_one"][class*="ad"]'
      )) {
        return false;
      }

      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      // 1. Bản thân là thẻ <video>, <audio>, <source>, <track>
      if (tag === 'video' || tag === 'audio' || tag === 'source' || tag === 'track') return true;

      // 2. Bản thân là <iframe> chứa player (youtube, drive, stream, embed, v.v.)
      if (tag === 'iframe') {
        const src = (el.src || el.getAttribute('data-src') || '').toLowerCase();
        if (/html\.php|start_html|pause_html|aid=|adv_/.test(src)) return false;
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
        const pId = getSafeId(p).toLowerCase();
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
      // Known ad overlays that inject inside player containers must NEVER be treated as posters/banners!
      if (el.closest && el.closest(
        '#nuevoa, #anuevo, #aclose, .nva-center, .nva-midroll, .nva-preroll, .nva-banner, ' +
        '.vast_clickthrough_layer, .midroll_back, .fluid_vpaid_slot, ' +
        '.vjs-preroll, .vjs-ad-container, .vjs-ad-overlay, ' +
        '.fxPane, #fxStartPane, .fxPaneBody, .fxPaneClose, .fxFallback, ' +
        'iframe[src*="html.php"], iframe[src*="start_html"], iframe[src*="pause_html"], ' +
        'div:has(> iframe[src*="html.php"]), div:has(> .fxPane), ' +
        '[data-cl-spot], [data-cl-overlay], [data-clocid], .video-ad-overlay, ' +
        'div[id*="player_one_ad"], div[id*="player_one"][class*="ad"]'
      )) {
        return false;
      }

      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      const elId = getSafeId(el).toLowerCase();
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
        '.thumb-overlay, [class*="thumb"], [id*="thumb"], ' +
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

  // Smart Mobile & Desktop User Interaction Tracker
  // Differentiates intentional taps from scroll swipes so scrolling on mobile never authorizes ad popups!
  let touchStartX = 0;
  let touchStartY = 0;
  let isScrollingTouch = false;

  window.addEventListener('touchstart', (e) => {
    if (e.target) {
      const a = e.target.closest ? e.target.closest('a[href]') : null;
      if (a) {
        const h = a.getAttribute('href');
        if (h && !h.startsWith('javascript:') && !h.startsWith('#')) {
          a.dataset.wsOrigHref = h;
        }
      }
    }
    if (e.touches && e.touches[0]) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isScrollingTouch = false;
    }
  }, { passive: true, capture: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (dx > 12 || dy > 12) {
        isScrollingTouch = true;
      }
    }
  }, { passive: true, capture: false });

  window.addEventListener('touchend', (e) => {
    if (!isScrollingTouch) {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;
    }
  }, { passive: true, capture: false });

  ['pointerdown', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      if (e.pointerType === 'touch') return; // Handled accurately by touchend
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;
    }, { passive: true, capture: false });
  });

  // --- CAPTURE-PHASE USER INTERACTION TRACKER ---
  // Must run in CAPTURE phase so lastInteractionTime and lastInteractionEvent are updated
  // BEFORE any third-party or ad-script capture listener fires!
  ['click', 'pointerdown', 'touchend', 'keydown'].forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;
    }, { passive: true, capture: true });
  });

  // --- NATIVE VIDEO PLAYER & PLAY BUTTON SHIELD ---
  // Ad networks (Clickadu on.js qi(), PopAds, WPAdMngr) attach capture-phase click handlers
  // and deliberately call e.preventDefault() to cancel the native play button's action while opening ad popups/redirects.
  // We hook Event.prototype.preventDefault to ensure user clicks on play buttons NEVER get canceled!
  if (!isYouTube) {
    try {
      const origPreventDefault = Event.prototype.preventDefault;
      Event.prototype.preventDefault = function () {
        if (this && (this.type === 'click' || this.type === 'pointerdown' || this.type === 'touchend')) {
          const t = this.target;
          if (t && typeof t.closest === 'function') {
            const playTarget = t.closest('#show_player, .play-btn, button[onclick*="init_start_select"], .plyr, .plyr__control, [data-plyr="play"], video, .video_thumbnail');
            if (playTarget) {
              // Video Play / Native Player Action: NEVER allow ad scripts to cancel the user's click!
              return;
            }
          }
        }
        return origPreventDefault.apply(this, arguments);
      };
    } catch (e) {}
  }

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
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        // In fullscreen: allow all player controls and play/pause immediately,
        // but STILL intercept external ad links and clickjack overlays!
        let hasAdAnchor = false;
        let c = e.target;
        while (c && c !== document.body && c !== document.documentElement) {
          if (c.tagName === 'A' && c.href && !c.href.startsWith('#') && !c.href.startsWith('javascript:')) {
            hasAdAnchor = true;
            break;
          }
          c = c.parentElement;
        }
        if (!hasAdAnchor && !isClickjackOverlay(e.target)) return;
      }
      // Never block interactions when Target Picker mode is active on page
      if (document.getElementById('adblock-max-target-badge') || document.getElementById('adblock-max-target-overlay')) return;
      const target = e.target;
      if (!target) return;

      // 0. XỬ LÝ ĐẦU TIÊN: TIÊU DIỆT LỚP PHỦ QUẢNG CÁO NẰM ĐÈ TRÊN HOẶC TRONG PLAYER (KỂ CẢ TRONG EMBEDDED IFRAME)
      // (KVS fxPane, html.php iframes, VAST clickthrough, ad overlays, [data-cl-spot], [data-cl-overlay], v.v.)
      const inPlayerAdOverlay = target.closest && target.closest(
        '#nuevoa, #anuevo, #aclose, .vast_clickthrough_layer, .nva-center, .nva-midroll, .fluid_vpaid_slot, ' +
        '#catfish-banner, .popup-banner, .fxPane, #fxStartPane, .fxPaneBody, .fxPaneClose, .fxFallback, ' +
        'iframe[src*="html.php"], iframe[src*="start_html"], iframe[src*="pause_html"], ' +
        'div:has(> iframe[src*="html.php"]), div:has(> .fxPane), ' +
        '[data-cl-spot], [data-cl-overlay], [data-clocid], .video-ad-overlay'
      );
      if (inPlayerAdOverlay) {
        e.preventDefault();
        e.stopPropagation();
        try {
          inPlayerAdOverlay.style.pointerEvents = 'none';
          inPlayerAdOverlay.style.display = 'none';
          inPlayerAdOverlay.remove();
        } catch (err) {}
        console.log('[Anti Pop-Under] Intercepted and removed in-player ad overlay on click:', inPlayerAdOverlay);
        // Self-Healing Recovery: Phục hồi điều khiển và tự động chạy video nếu đang pause
        try {
          const playerCont = target.closest('.kt-player, [class*="player" i], .video-holder, .player-holder') || document;
          if (playerCont) {
            if (playerCont.classList) playerCont.classList.remove('is-ad-visible');
            const vid = playerCont.querySelector('video');
            if (vid && vid.paused) {
              const p = vid.play();
              if (p && p.catch) p.catch(() => {});
            }
          }
        } catch (err) {}
        return;
      }

      // In embedded player iframes, allow 100% native player controls & progress bar clicks
      if (window.self !== window.top) return;

      // 1. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM: NÉ TRÌNH PHÁT VIDEO RA 100%
      // Mọi thao tác click, tua, dừng, điều khiển âm lượng phát sinh từ bên trong Video Player:
      // RETURN NGAY LẬP TỨC để trình phát nhận 100% tương tác tự nhiên, tuyệt đối không can thiệp!
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'video' || tag === 'audio') return;

      const hasAnchor = target.tagName === 'A' || (target.closest && target.closest('a'));
      if (!hasAnchor) {
        if (isInsideVideoPlayer(target) || isMovieBannerOrPoster(target)) return;
        let checkPlayer = target;
        while (checkPlayer && checkPlayer !== document.body && checkPlayer !== document.documentElement) {
          if (isInsideVideoPlayer(checkPlayer) || isMovieBannerOrPoster(checkPlayer)) {
            return;
          }
          checkPlayer = checkPlayer.parentElement;
        }
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
        // Phục hồi link nếu bị script quảng cáo tráo đổi lúc touchstart
        if (anchor.dataset && anchor.dataset.wsOrigHref && anchor.dataset.wsOrigHref !== anchor.getAttribute('href')) {
          e.preventDefault();
          e.stopPropagation();
          const safeHref = anchor.dataset.wsOrigHref;
          anchor.setAttribute('href', safeHref);
          anchor.href = safeHref;
          console.log('[Anti Pop-Under] Reverted hijacked link in Main World, navigating to:', safeHref);
          window.location.href = safeHref;
          return;
        }

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

    // --- MOBILE TOUCH OVERLAY & POPUNDER INTERCEPTOR (BUBBLING PHASE, ZERO VIDEO/THUMBNAIL INTERFERENCE) ---
    window.addEventListener('touchend', (e) => {
      if (isScrollingTouch) return;
      if (!e.isTrusted) return;
      if (!isEnabled() || isCurrentPageWhitelisted()) return;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      if (document.getElementById('adblock-max-target-badge') || document.getElementById('adblock-max-target-overlay')) return;

      const target = e.target;
      if (!target) return;

      // 0. XỬ LÝ ĐẦU TIÊN: TIÊU DIỆT LỚP PHỦ QUẢNG CÁO NẰM ĐÈ TRÊN HOẶC TRONG PLAYER (KỂ CẢ TRONG EMBEDDED IFRAME)
      const inPlayerAdOverlay = target.closest && target.closest(
        '#nuevoa, #anuevo, #aclose, .vast_clickthrough_layer, .nva-center, .nva-midroll, .fluid_vpaid_slot, ' +
        '#catfish-banner, .popup-banner, .fxPane, #fxStartPane, .fxPaneBody, .fxPaneClose, .fxFallback, ' +
        'iframe[src*="html.php"], iframe[src*="start_html"], iframe[src*="pause_html"], ' +
        'div:has(> iframe[src*="html.php"]), div:has(> .fxPane), ' +
        '[data-cl-spot], [data-cl-overlay], [data-clocid], .video-ad-overlay'
      );
      if (inPlayerAdOverlay) {
        e.preventDefault();
        e.stopPropagation();
        try {
          inPlayerAdOverlay.style.pointerEvents = 'none';
          inPlayerAdOverlay.style.display = 'none';
          inPlayerAdOverlay.remove();
        } catch (err) {}
        console.log('[Anti Pop-Under] Intercepted and removed in-player ad overlay on touch:', inPlayerAdOverlay);
        try {
          const playerCont = target.closest('.kt-player, [class*="player" i], .video-holder, .player-holder') || document;
          if (playerCont) {
            if (playerCont.classList) playerCont.classList.remove('is-ad-visible');
            const vid = playerCont.querySelector('video');
            if (vid && vid.paused) {
              const p = vid.play();
              if (p && p.catch) p.catch(() => {});
            }
          }
        } catch (err) {}
        return;
      }

      if (window.self !== window.top) return;

      // 1. NGUYÊN TẮC BẤT KHẢ XÂM PHẠM: NÉ TRÌNH PHÁT VIDEO VÀ THUMBNAIL/POSTER RA 100%
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

      // 2. Chặn và loại bỏ lớp phủ tàng hình clickjack trên màn hình cảm ứng di động
      if (isClickjackOverlay(target)) {
        e.preventDefault();
        e.stopPropagation();
        try {
          target.style.pointerEvents = 'none';
          target.remove();
        } catch (err) {}
        console.log('[Anti Pop-Under] Intercepted touchend on clickjack overlay, removed:', target);
        try {
          const touch = e.changedTouches && e.changedTouches[0];
          if (touch) {
            const underlying = document.elementFromPoint(touch.clientX, touch.clientY);
            if (underlying && underlying !== target && !isClickjackOverlay(underlying)) {
              underlying.click();
            }
          }
        } catch (err) {}
        return;
      }
    }, false);

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
      } else {
        const killer = document.getElementById('webshield-overlay-killer');
        if (killer) killer.remove();
        ensureBodyPointerEvents();
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
        } else {
          const killer = document.getElementById('webshield-overlay-killer');
          if (killer) killer.remove();
          ensureBodyPointerEvents();
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
    try { el.click(); } catch (e) {}
  }

  // Send message to content script (which forwards to background)
  function reportBlocked(url, reason, count) {
    if (!isEnabled()) return;

    // On YouTube, NEVER broadcast window.postMessage (which YouTube's telemetry listeners can intercept).
    // Instead, dispatch a captured CustomEvent on document that content.js intercepts and stops immediately.
    if (isYouTubeHost) {
      try {
        document.dispatchEvent(new CustomEvent('__ws_internal_sync__', {
          detail: { type: 'BLOCKED', url: url, reason: reason, count: count }
        }));
      } catch (e) {}
      return;
    }

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
      if (!isYouTubeHost) {
        console.log(`[Anti Pop-Under] Blocked & queued report to "${url}". Reason: ${reason}`);
      }
      return;
    }

    if (!isYouTubeHost) {
      console.log(`[Anti Pop-Under] Blocked popup to "${url}". Reason: ${reason}`);
    }
  }

  function flushPendingReports() {
    while (pendingReports.length > 0) {
      const report = pendingReports.shift();
      if (isYouTubeHost) {
        try {
          document.dispatchEvent(new CustomEvent('__ws_internal_sync__', {
            detail: { type: 'BLOCKED', url: report.url, reason: report.reason, count: report.count }
          }));
        } catch (e) {}
      } else {
        window.postMessage({
          type: 'ANTI_POPUP_BLOCKED_EVENT',
          url: report.url,
          reason: report.reason,
          count: report.count
        }, '*');
        console.log(`[Anti Pop-Under] Flushed queued block report to "${report.url}". Reason: ${report.reason}`);
      }
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
      const elId = getSafeId(el).toLowerCase();
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
    'badlandlispyippee.com', 'badlandlispyippee',
    'yqxtm.com', 'kwai.net/bs2/ad-',
    'adqc.net', '6789x.site', 'musicskinsheader', 'musicskinscom', 'cm8806.com/motphim', 'no-ads-under',
    'wpadmngr', 'wpshsdk', 'wpushsdk', 'nawpush', 'ntvpwpush', 'ntvpforever', 'tubecup\.net', 'metricswpsh',
    'capndr\.com', 'korlumo\.com', 'zog\.link', 'nereserv\.com', 'vidvas3\.com', 'amazingcontent\.site',
    'multstorage\.com', 'gstcpx\.site', 'uuidksinc\.net', 'infrapu\.sh', 'realsrv\.com', 'exosrv\.com',
    'astronautlividlyreformer', 'detectivefrozepriceless', '/get/\d+\?id=\d+'
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

    // Chặn các scheme chuyển hướng ứng dụng di động/app stores tự động (intent://, market://,...)
    const isMobileDeepLink = typeof url === 'string' && /^(?:intent|market|itms-apps?|snssdk\d*|tiktok|lazada|shopee|vnd\.youtube|alipay|weixin):\/\//i.test(url.trim());
    if (isMobileDeepLink) {
      if (isLocationChange || isWindowOpen || context.includes('_blank')) {
        reportBlocked(url, `Blocked mobile app intent/deep-link redirect (${context})`);
        return false;
      }
      if (isAnchorClick) {
        if (!isRecentInteraction) {
          reportBlocked(url, `Blocked unrequested mobile app intent (${context})`);
          return false;
        }
        if (lastInteractionEvent && lastInteractionEvent.target) {
          const t = lastInteractionEvent.target;
          if (isInsideVideoPlayer(t) || isMovieBannerOrPoster(t)) {
            reportBlocked(url, `Blocked mobile app intent from video player/thumbnail click (${context})`);
            return false;
          }
        }
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

    const urlStr = url === undefined || url === null ? '' : String(url).trim();
    const isBlankOrSelfTabunder = !urlStr || urlStr.toLowerCase() === 'about:blank' || urlStr === window.location.href;

    // A1. Embedded player iframes (window.self !== window.top) NEVER need to open external popups/windows!
    if (window.self !== window.top) {
      reportBlocked(url || 'blank', 'Blocked window.open inside embedded player iframe');
      return isBlankOrSelfTabunder ? null : createDummyWindow();
    }

    // A2. Top-level player/thumbnail/play-button click guard
    if (lastInteractionEvent && lastInteractionEvent.target && (isInsideVideoPlayer(lastInteractionEvent.target) || isMovieBannerOrPoster(lastInteractionEvent.target) || isPlayerOrPlayButton(lastInteractionEvent.target))) {
      let isExternal = false;
      try {
        const targetHost = new URL(url, window.location.href).hostname.toLowerCase();
        const curHost = window.location.hostname.toLowerCase();
        isExternal = targetHost && targetHost !== curHost && !targetHost.endsWith('.' + curHost);
      } catch (e) {
        isExternal = true;
      }
      if (isExternal && !isWhitelisted(url)) {
        reportBlocked(url || 'blank', 'Blocked external popup/jump from video player or thumbnail touch');
        return createDummyWindow();
      }
    }

    const targetLower = String(target || '').toLowerCase();
    if (['_self', '_top', '_parent'].includes(targetLower)) {
      if (gamblingRegex.test(url) || adUrlRegex.test(url)) {
        return isBlankOrSelfTabunder ? null : createDummyWindow();
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
      return isBlankOrSelfTabunder ? null : createDummyWindow();
    }

    return originalOpen.apply(this, arguments);
  }

  // Helper to override open on any window object (e.g. top-level or iframe window)
  function overrideWindowOpen(win) {
    if (!win) return;
    try {
      // Cross-origin check: never access Location properties of cross-origin windows to prevent
      // "Unsafe attempt to load URL ... Domains, protocols and ports must match"
      try {
        if (!win.document) return;
      } catch (crossErr) {
        return; // Cross-origin access threw SecurityError
      }

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
    // Override current window, self, globalThis, and Window.prototype
    overrideWindowOpen(window);
    overrideWindowOpen(window.self);
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
              try {
                if (win.document) {
                  overrideWindowOpen(win);
                }
              } catch (e) {}
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
              try {
                if (doc.defaultView.document) {
                  overrideWindowOpen(doc.defaultView);
                }
              } catch (e) {}
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

          // Embedded player iframes NEVER have legitimate external/blank anchor clicks!
          if (window.self !== window.top) {
            reportBlocked(this.href || 'blank', 'Blocked programmatic anchor click inside embedded player iframe');
            return;
          }

          // Guard against simulated ad clicks triggered when user touches player/play button/thumbnail
          if (lastInteractionEvent && lastInteractionEvent.target) {
            const t = lastInteractionEvent.target;
            if (isInsideVideoPlayer(t) || isMovieBannerOrPoster(t) || isPlayerOrPlayButton(t)) {
              const isTargetBlank = (this.getAttribute('target') || '').toLowerCase() === '_blank';
              let isExt = false;
              try {
                const targetHost = new URL(this.href, window.location.href).hostname.toLowerCase();
                const curHost = window.location.hostname.toLowerCase();
                isExt = targetHost && targetHost !== curHost && !targetHost.endsWith('.' + curHost);
              } catch (e) { isExt = true; }
              if (isTargetBlank || isExt) {
                reportBlocked(this.href || 'blank', 'Blocked programmatic anchor popup from player interaction');
                return;
              }
            }
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
              const anchorId = getSafeId(anchor).toLowerCase();
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

  function setupYouTubeHandshakeAndHelpers() {
    try {
      document.addEventListener('anti-popup-state-change', (e) => {
        if (e.detail && typeof e.detail.enabled !== 'undefined') {
          extensionEnabled = e.detail.enabled !== false;
          contentScriptReady = true;
          if (extensionEnabled) {
            flushPendingReports();
          }
        }
      }, true);
      document.dispatchEvent(new CustomEvent('__ws_internal_sync__', {
        detail: { type: 'REQUEST_STATE' }
      }));
    } catch (e) {}
  }

  // --- ADGUARD-GRADE STEALTH YOUTUBE AD ENGINE (ZERO BOTGUARD FOOTPRINT, ZERO BLACK SCREEN) ---
  // Uses true ES6 Proxy wrapping (preserving native .name, .length, and undefined .prototype),
  // auto-restoring Data Property traps on initial globals, and non-destructive JSON pruning
  // so ads are stripped before player initialization without ever triggering BotGuard or SSAP desync.
  function runYouTubeAdGuardEngine() {
    if (!window.location.hostname.includes('youtube.com')) return;
    if (!isEnabled()) return;

    // NEVER run inside the YouTube Live Chat iframe!
    if (window.location.pathname.startsWith('/live_chat')) return;

    // 1. True ES6 Proxy Stealth Wrapper (Zero prototype/name/toString leakage against BotGuard / GenerateIT)
    const proxyToTarget = new WeakMap();
    const origFnToString = Function.prototype.toString;

    function createStealthProxy(targetFn, applyHandler) {
      if (typeof targetFn !== 'function') return targetFn;
      const proxied = new Proxy(targetFn, {
        apply(target, thisArg, argArray) {
          return applyHandler(target, thisArg, argArray);
        }
      });
      proxyToTarget.set(proxied, targetFn);
      return proxied;
    }

    try {
      Function.prototype.toString = createStealthProxy(origFnToString, (target, thisArg, argArray) => {
        const realTarget = proxyToTarget.has(thisArg) ? proxyToTarget.get(thisArg) : thisArg;
        return Reflect.apply(target, realTarget, argArray);
      });
    } catch (e) {}

    // 2. Accurate 1-to-1 YouTube Video Ad Reporter (Per Video ID, Never Spams)
    const reportedVideoAds = new Set();

    function getCurrentVideoId() {
      try {
        if (typeof URLSearchParams !== 'undefined' && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          const v = urlParams.get('v');
          if (v && v.length >= 3) return v;
        }
        const hrefMatch = String(window.location.href || '').match(/[?&]v=([a-zA-Z0-9_-]{3,})/);
        if (hrefMatch) return hrefMatch[1];
        const match = String(window.location.pathname || '').match(/\/(shorts|watch|live)\/([a-zA-Z0-9_-]{3,})/);
        if (match) return match[2];
      } catch (e) {}
      return '';
    }

    function reportAdDetected(count = 1) {
      try {
        const videoId = getCurrentVideoId() || 'video';
        const reportKey = `${videoId}_${count}`;
        if (!reportedVideoAds.has(reportKey)) {
          reportedVideoAds.add(reportKey);
          if (reportedVideoAds.size > 100) {
            const firstKey = reportedVideoAds.values().next().value;
            reportedVideoAds.delete(firstKey);
          }
          const adCount = Math.max(1, Math.min(3, count));
          reportBlocked(`https://www.youtube.com/watch?v=${videoId} (Quảng cáo Video)`, `Đã chặn ${adCount} quảng cáo video YouTube`, adCount);
        }
      } catch (e) {}
    }

    // 3. AdGuard Core JSON Pruner: Prunes ad definitions & enforcement mutations BEFORE player/Polymer reads them
    let currentIsLiveStream = false;

    function isLivePayload(val) {
      if (!val || typeof val !== 'object') return false;
      if (val.videoDetails && (val.videoDetails.isLive || val.videoDetails.isLiveContent || val.videoDetails.isPostLiveDvr)) return true;
      if (val.liveStreamability) return true;
      if (val.microformat && val.microformat.playerMicroformatRenderer && val.microformat.playerMicroformatRenderer.liveBroadcastDetails) return true;
      return false;
    }

    function isYouTubeLiveStream() {
      if (currentIsLiveStream) return true;
      try {
        if (window.location && window.location.pathname && (window.location.pathname.startsWith('/live/') || window.location.pathname.startsWith('/live'))) return true;
        const ytPlayer = document.getElementById('movie_player');
        if (ytPlayer) {
          if (ytPlayer.classList.contains('ytp-live') || ytPlayer.classList.contains('ytp-live-mode')) return true;
          if (typeof ytPlayer.getVideoData === 'function') {
            const vd = ytPlayer.getVideoData();
            if (vd && (vd.isLive || vd.isLiveContent || vd.isPostLiveDvr)) return true;
          }
        }
        if (document.querySelector('.ytp-live, .ytp-live-badge, .ytp-live-mode, ytd-watch-flexy[is-live-stream]')) return true;
      } catch (e) {}
      return false;
    }

    const AD_KEYS_TO_DELETE = [
      'adPlacements',
      'playerAds',
      'adSlots',
      'adBreakParams',
      'adBreakHeartbeatParams',
      'adSlotsPreroll',
      'no_ads'
    ];

    // Valid BY_-encoded Protobuf `u5o` (`Ch4KGHBsYXlhYmlsaXR5U3RhdHVzLnN0YXR1cxICT0s`) containing:
    //   aqM { path: "playabilityStatus.status", expectedValue: "OK" }
    // When `R97(E)` in `m=kevlar_base_module` decodes `responseContext.mainAppWebResponseContext.trackingParam`,
    // it checks `E.playabilityStatus.status === "OK"`, gets a 100% match, increments "SUCCESS", returns `1`,
    // and NEVER triggers Error `282054944` or sends `282054944_p` mismatch telemetry to YouTube's server!
    const CLEAN_TRACKING_PARAM = 'pJmLIBxBLzYRP2nkqBABWmAMFPcG71qBxGv7eK2u3Rm';

    // Detect YouTube's client-side anti-adblock honeypot payloads (`dus()`, `A1s()`, `ZvY` in `m=kevlar_base_module`)
    // NEVER modify or prune honeypot objects so `_.a6H()` (JSON.parse), `ujs()` (fetch data: URI),
    // `_.y1Y()` (new Response().json()), and `_.WUu()` always compare `w5(parsed, expected) === true`!
    // IMPORTANT: Do NOT check `contextParams === 'Q0FFU0FnZ0M='` or `adBreakHeartbeatParams === 'Q0FBJTNE'` alone
    // because those base64 constants (`CAESAggC` and `CAA=`) are present on real YouTube videos!
    function isHoneypotPayload(val) {
      if (!val || typeof val !== 'object') return false;
      try {
        // 1. `dus()` fake playerResponse (`Or` at byte 519742 of `m=kevlar_base_module`):
        // Always has videoDetails.title === "Exploring the Outdoors", author === "AdventureLogs", and trackingParam starting with "kx_fmPxh"
        if (val.videoDetails && typeof val.videoDetails === 'object') {
          if (val.videoDetails.title === 'Exploring the Outdoors' && val.videoDetails.author === 'AdventureLogs') {
            return true;
          }
        }
        // 2. `ZvY` fake playerResponse (at byte 3187305 of `m=kevlar_base_module`):
        // Always has playabilityStatus.status === "by", trackingParam === "dd", datasyncId === "xp"
        if (val.playabilityStatus && typeof val.playabilityStatus === 'object') {
          if (val.playabilityStatus.status === 'by') {
            return true;
          }
        }
        const mwrc = val.responseContext && val.responseContext.mainAppWebResponseContext;
        if (mwrc && typeof mwrc === 'object') {
          const tp = mwrc.trackingParam;
          if (tp === 'dd' || mwrc.datasyncId === 'xp') return true;
          if (typeof tp === 'string' && tp.startsWith('kx_fmPxh')) return true;
        }
        if (val.playerResponse && typeof val.playerResponse === 'object' && isHoneypotPayload(val.playerResponse)) {
          return true;
        }
      } catch (e) {}
      return false;
    }

    // Neutralize `CAv(E, k)` in `m=kevlar_base_module` (`y57` / `Bd7` Error 282054944 & enforcement injector).
    // When `y57` or `Bd7` triggers, `CAv(E, k)` executes:
    //   E.playabilityStatus = Object.assign({}, E.playabilityStatus, { status: "ERROR", errorScreen: k });
    //   E.videoDetails = void 0;
    // By locking `playabilityStatus` and `videoDetails` on real playerResponse objects, `CAv` is completely disarmed!
    const guardedPlayerResponses = new WeakSet();
    function guardPlayerResponseAgainstCAv(val) {
      if (!val || typeof val !== 'object' || guardedPlayerResponses.has(val)) return;
      if (!val.playabilityStatus || typeof val.playabilityStatus !== 'object') return;
      if (!val.streamingData && !val.videoDetails) return;
      try {
        guardedPlayerResponses.add(val);
        let _ps = val.playabilityStatus;
        let _vd = val.videoDetails;

        Object.defineProperty(val, 'playabilityStatus', {
          configurable: true,
          enumerable: true,
          get: createStealthProxy(function () { return _ps; }, () => _ps),
          set: createStealthProxy(function (newVal) { _ps = newVal; }, (target, thisArg, argArray) => {
            const nextPs = argArray[0];
            if (nextPs && typeof nextPs === 'object') {
              // Ignore `CAv(E, k)` attempting to overwrite an OK stream with status: "ERROR" (282054944) or enforcementMessageViewModel
              if ((nextPs.status === 'ERROR' || nextPs.status === 'UNPLAYABLE' || nextPs.errorScreen) &&
                  _ps && _ps.status === 'OK' && (val.streamingData || _vd)) {
                return true;
              }
            }
            _ps = nextPs;
            return true;
          })
        });

        if (_vd && typeof _vd === 'object') {
          Object.defineProperty(val, 'videoDetails', {
            configurable: true,
            enumerable: true,
            get: createStealthProxy(function () { return _vd; }, () => _vd),
            set: createStealthProxy(function (newVal) { _vd = newVal; }, (target, thisArg, argArray) => {
              const nextVd = argArray[0];
              // Ignore `CAv(E, k)` attempting to wipe `E.videoDetails = void 0`
              if ((nextVd === undefined || nextVd === null) && _vd && typeof _vd === 'object') {
                return true;
              }
              _vd = nextVd;
              return true;
            })
          });
        }
      } catch (e) {}
    }

    function pruneYouTubePayload(val, depth = 0, isLiveContext = false) {
      if (!val || typeof val !== 'object' || depth > 16) return val;
      if (depth <= 2 && isHoneypotPayload(val)) return val;

      let isLive = isLiveContext;
      if (!isLive) {
        if (val.videoDetails && typeof val.videoDetails === 'object') {
          isLive = Boolean(val.videoDetails.isLive || val.videoDetails.isLiveContent || val.videoDetails.isPostLiveDvr);
          currentIsLiveStream = isLive;
        } else if (isLivePayload(val)) {
          isLive = true;
          currentIsLiveStream = true;
        }
      }

      if (Array.isArray(val)) {
        for (let i = 0; i < val.length; i++) {
          const item = val[i];
          if (item && typeof item === 'object') {
            if (isHoneypotPayload(item)) continue;
            // Delete inner ad keys in-place without splicing array indices (which would desync Polymer's stampDomArray_)
            if (item.adSlotRenderer) delete item.adSlotRenderer;
            if (item.inFeedAdLayoutRenderer) delete item.inFeedAdLayoutRenderer;
            if (item.promotedSparklesWebRenderer) delete item.promotedSparklesWebRenderer;
            if (item.richItemRenderer && item.richItemRenderer.content) {
              delete item.richItemRenderer.content.adSlotRenderer;
              delete item.richItemRenderer.content.inFeedAdLayoutRenderer;
            }
            pruneYouTubePayload(item, depth + 1, isLive);
          }
        }
        return val;
      }

      let adsRemoved = 0;

      // Auto-heal fake anti-adblock error screen (e.g. error 282054944 "Đã xảy ra lỗi. Vui lòng thử lại sau")
      // when valid video streams (streamingData) or enforcement errors are present in the payload,
      // and lock `playabilityStatus` + `videoDetails` so `CAv(E, k)` in `m=kevlar_base_module` cannot overwrite them!
      if (val.playabilityStatus && typeof val.playabilityStatus === 'object') {
        const status = val.playabilityStatus.status;
        const errScreen = val.playabilityStatus.errorScreen;
        const hasEnforcementError = Boolean(
          (errScreen && (errScreen.bkaEnforcementMessageViewModel || errScreen.enforcementMessageViewModel || errScreen.playerErrorMessageRenderer)) ||
          (val.auxiliaryUi && val.auxiliaryUi.messageRenderers && val.auxiliaryUi.messageRenderers.bkaEnforcementMessageViewModel)
        );
        if (val.streamingData || hasEnforcementError) {
          if (status === 'UNPLAYABLE' || status === 'LOGIN_REQUIRED' || status === 'ERROR') {
            val.playabilityStatus.status = 'OK';
          }
          delete val.playabilityStatus.reason;
          delete val.playabilityStatus.errorScreen;
          delete val.playabilityStatus.messages;
        }
        if (val.playabilityStatus.status === 'OK' &&
            val.responseContext &&
            val.responseContext.mainAppWebResponseContext &&
            typeof val.responseContext.mainAppWebResponseContext.trackingParam === 'string') {
          val.responseContext.mainAppWebResponseContext.trackingParam = CLEAN_TRACKING_PARAM;
        }
        guardPlayerResponseAgainstCAv(val);
      }

      for (let i = 0; i < AD_KEYS_TO_DELETE.length; i++) {
        const key = AD_KEYS_TO_DELETE[i];
        if (key in val) {
          if (isLive && key === 'adBreakHeartbeatParams') continue;
          if (Array.isArray(val[key]) && val[key].length > 0) {
            adsRemoved += val[key].length;
          } else {
            adsRemoved += 1;
          }
          delete val[key];
        }
      }

      // Remove remarketing / conversion ad-tracking URLs from playbackTracking so base.js
      // never calls fetch() on `/pagead/viewthroughconversion/` or `/pagead/lvz` (which redirect to doubleclick.net and fail CORS)
      if (val.playbackTracking && typeof val.playbackTracking === 'object') {
        delete val.playbackTracking.youtubeRemarketingUrl;
        delete val.playbackTracking.googleRemarketingUrl;
      }

      // Remove masthead ad from top of home page JSON
      if (val.mastheadAdRenderer || (val.contents && val.contents.mastheadAdRenderer)) {
        delete val.mastheadAdRenderer;
        if (val.contents) delete val.contents.mastheadAdRenderer;
        adsRemoved++;
      }

      // Clean adSlotLoggingData inside frameworkUpdates.entityBatchUpdate.mutations
      if (val.frameworkUpdates && val.frameworkUpdates.entityBatchUpdate && Array.isArray(val.frameworkUpdates.entityBatchUpdate.mutations)) {
        const mutations = val.frameworkUpdates.entityBatchUpdate.mutations;
        for (let i = 0; i < mutations.length; i++) {
          const m = mutations[i];
          if (m && m.payload && typeof m.payload === 'object') {
            if (m.payload.adSlotLoggingData) {
              delete m.payload.adSlotLoggingData;
              adsRemoved++;
            }
          }
        }
      }

      // Handle stringified player_response inside ytplayer.config.args
      if (typeof val.player_response === 'string' && (val.player_response.includes('ad') || val.player_response.includes('errorScreen') || val.player_response.includes('Enforcement'))) {
        try {
          const parsedPR = origJSONParse(val.player_response);
          if (!isHoneypotPayload(parsedPR)) {
            pruneYouTubePayload(parsedPR, 0, isLive);
            val.player_response = JSON.stringify(parsedPR);
          }
        } catch (e) {}
      }
      if (val.raw_player_response && typeof val.raw_player_response === 'object') {
        pruneYouTubePayload(val.raw_player_response, depth + 1, isLive);
      }

      // Since `trackingParam` is now re-signed with `CLEAN_TRACKING_PARAM` (`playabilityStatus.status === "OK"`),
      // `R97(k)` always returns `1` ("SUCCESS"), so we can safely remove `bkaEnforcementMessageViewModel`
      // so `Bd7(E, k)` (`J1u(k)`) never sees an enforcement model!
      if (val.auxiliaryUi && val.auxiliaryUi.messageRenderers && val.auxiliaryUi.messageRenderers.bkaEnforcementMessageViewModel) {
        delete val.auxiliaryUi.messageRenderers.bkaEnforcementMessageViewModel;
        adsRemoved++;
      }
      if (val.bkaEnforcementMessageViewModel) {
        delete val.bkaEnforcementMessageViewModel;
      }
      if (val.enforcementMessageViewModel) {
        delete val.enforcementMessageViewModel;
      }

      if (adsRemoved > 0) {
        reportAdDetected(adsRemoved);
      }

      for (const k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k)) {
          // Never traverse into heavy media stream URLs, storyboards, or captions
          if (k === 'streamingData' || k === 'storyboards' || k === 'captions') continue;
          const child = val[k];
          if (child && typeof child === 'object') {
            pruneYouTubePayload(child, depth + 1, isLive);
          }
        }
      }
      return val;
    }

    const origJSONParse = JSON.parse;
    const AD_JSON_REGEX = /"adPlacements"|"playerAds"|"adSlots"|"adBreakParams"|"adBreakHeartbeatParams"|"bkaEnforcementMessageViewModel"|"enforcementMessageViewModel"|"errorScreen"|"playerErrorMessageRenderer"|"mastheadAdRenderer"/;
    const AD_BAIT_URL_REGEX = /doubleclick\.net|googlesyndication\.com|googleadservices\.com|adservice\.google|\/pagead\/|\/ptracking|\/api\/stats\/ads/i;
    const TRANSPARENT_PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

    // 4A. Persistent Traps on Initial Globals (ytInitialPlayerResponse, ytInitialData, ytplayer)
    // Must stay persistent across multiple assignments because serviceworker-kevlar-appshell.js and
    // `var ytplayer = ytplayer || {};` assign empty shell objects first before assigning the real payload!
    const hookedYtplayerObjects = new WeakSet();
    function hookYtplayerSubProperties(ytpObj) {
      if (!ytpObj || typeof ytpObj !== 'object' || hookedYtplayerObjects.has(ytpObj)) return;
      try {
        hookedYtplayerObjects.add(ytpObj);
        let _config = ytpObj.config;
        if (_config && typeof _config === 'object') {
          if (_config.args) pruneYouTubePayload(_config.args);
        }
        Object.defineProperty(ytpObj, 'config', {
          configurable: true,
          enumerable: true,
          get: createStealthProxy(function () { return _config; }, () => _config),
          set: createStealthProxy(function (v) { _config = v; }, (target, thisArg, argArray) => {
            const v = argArray[0];
            if (v && typeof v === 'object' && isEnabled()) {
              if (v.args) pruneYouTubePayload(v.args);
              pruneYouTubePayload(v);
            }
            _config = v;
            return true;
          })
        });

        let _bootstrapPR = ytpObj.bootstrapPlayerResponse;
        if (_bootstrapPR && typeof _bootstrapPR === 'object') {
          pruneYouTubePayload(_bootstrapPR);
        }
        Object.defineProperty(ytpObj, 'bootstrapPlayerResponse', {
          configurable: true,
          enumerable: true,
          get: createStealthProxy(function () { return _bootstrapPR; }, () => _bootstrapPR),
          set: createStealthProxy(function (v) { _bootstrapPR = v; }, (target, thisArg, argArray) => {
            const v = argArray[0];
            if (v && typeof v === 'object' && isEnabled()) {
              pruneYouTubePayload(v);
            }
            _bootstrapPR = v;
            return true;
          })
        });
      } catch (e) {}
    }

    function installPersistentGlobalTrap(propName, customProcessor) {
      try {
        let currentValue = window[propName];
        if (currentValue && typeof currentValue === 'object') {
          customProcessor(currentValue);
        }
        Object.defineProperty(window, propName, {
          configurable: true,
          enumerable: true,
          get: createStealthProxy(function () {
            return currentValue;
          }, () => currentValue),
          set: createStealthProxy(function (val) {
            currentValue = val;
          }, (target, thisArg, argArray) => {
            const val = argArray[0];
            try {
              if (val && typeof val === 'object' && isEnabled()) {
                customProcessor(val);
              }
            } catch (e) {}
            currentValue = val;
            return true;
          })
        });
      } catch (e) {}
    }

    installPersistentGlobalTrap('ytInitialPlayerResponse', (val) => pruneYouTubePayload(val));
    installPersistentGlobalTrap('ytInitialData', (val) => pruneYouTubePayload(val));
    installPersistentGlobalTrap('ytplayer', (val) => {
      if (val && typeof val === 'object') {
        hookYtplayerSubProperties(val);
        if (val.config && val.config.args) pruneYouTubePayload(val.config.args);
        if (val.bootstrapPlayerResponse) pruneYouTubePayload(val.bootstrapPlayerResponse);
      }
    });

    // 4B. Stealth Proxy on JSON.parse (Catches XHR, Polymer, and embedded JSON strings)
    try {
      JSON.parse = createStealthProxy(origJSONParse, (target, thisArg, argArray) => {
        const result = Reflect.apply(target, thisArg, argArray);
        if (result && typeof result === 'object' && isEnabled()) {
          const text = argArray[0];
          if (typeof text !== 'string' || AD_JSON_REGEX.test(text)) {
            pruneYouTubePayload(result);
          }
        }
        return result;
      });
    } catch (e) {}

    // 4C. Stealth Proxy on Response.prototype.json & Response.prototype.text
    // Crucial: Catches /youtubei/v1/get_watch, /youtubei/v1/player, /youtubei/v1/next, etc.
    // without ever wrapping window.fetch!
    // Skips empty `thisArg.url` (`new Response(v).json()` in `_.y1Y()`) and `data:` URIs (`ujs()` in `m=kevlar_base_module`).
    try {
      if (typeof Response !== 'undefined' && Response.prototype) {
        if (typeof Response.prototype.json === 'function') {
          Response.prototype.json = createStealthProxy(Response.prototype.json, (target, thisArg, argArray) => {
            const promise = Reflect.apply(target, thisArg, argArray);
            if (!isEnabled()) return promise;
            const url = (thisArg && typeof thisArg.url === 'string') ? thisArg.url : '';
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) return promise;
            return promise.then((data) => {
              if (data && typeof data === 'object' && !isHoneypotPayload(data)) {
                pruneYouTubePayload(data);
              }
              return data;
            });
          });
        }

        if (typeof Response.prototype.text === 'function') {
          Response.prototype.text = createStealthProxy(Response.prototype.text, (target, thisArg, argArray) => {
            const promise = Reflect.apply(target, thisArg, argArray);
            if (!isEnabled()) return promise;
            const url = (thisArg && typeof thisArg.url === 'string') ? thisArg.url : '';
            if (!url || url.startsWith('data:') || url.startsWith('blob:')) return promise;
            if (url.includes('/youtubei/v1/') || url.includes('watch')) {
              return promise.then((text) => {
                if (typeof text === 'string' && AD_JSON_REGEX.test(text)) {
                  try {
                    const data = origJSONParse(text);
                    if (!isHoneypotPayload(data)) {
                      pruneYouTubePayload(data);
                      return JSON.stringify(data);
                    }
                  } catch (e) {
                    return text;
                  }
                }
                return text;
              });
            }
            return promise;
          });
        }
      }
    } catch (e) {}

    // 4D. Stealth Proxy on XMLHttpRequest & Image Bait Pings
    // Redirects doubleclick.net/pagead/id bait XHR to '/robots.txt' (which returns 200 OK on www.youtube.com,
    // whereas '/error_204' returns 404 Not Found and triggers Uhz @ m=late,app adblock detection!).
    try {
      if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
        const xhrUrls = new WeakMap();
        if (typeof XMLHttpRequest.prototype.open === 'function') {
          XMLHttpRequest.prototype.open = createStealthProxy(XMLHttpRequest.prototype.open, (target, thisArg, argArray) => {
            if (isEnabled() && argArray.length >= 2) {
              const rawUrl = argArray[1];
              const urlStr = typeof rawUrl === 'string' ? rawUrl : ((rawUrl && (rawUrl.href || rawUrl.url)) || '');
              xhrUrls.set(thisArg, urlStr);
              if (urlStr && AD_BAIT_URL_REGEX.test(urlStr)) {
                argArray[1] = '/robots.txt';
              }
            }
            return Reflect.apply(target, thisArg, argArray);
          });
        }

        const isYouTubeInnerTubeXhr = (xhr) => {
          const u = xhrUrls.get(xhr) || '';
          return !u || u.includes('/youtubei/v1/') || u.includes('watch');
        };

        const respDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'response');
        if (respDesc && typeof respDesc.get === 'function') {
          Object.defineProperty(XMLHttpRequest.prototype, 'response', {
            configurable: true,
            enumerable: respDesc.enumerable,
            get: createStealthProxy(respDesc.get, (target, thisArg, argArray) => {
              const res = Reflect.apply(target, thisArg, argArray);
              if (isEnabled() && isYouTubeInnerTubeXhr(thisArg)) {
                if (res && typeof res === 'object') {
                  pruneYouTubePayload(res);
                } else if (typeof res === 'string' && AD_JSON_REGEX.test(res)) {
                  try {
                    const parsed = origJSONParse(res);
                    pruneYouTubePayload(parsed);
                    return JSON.stringify(parsed);
                  } catch (e) {}
                }
              }
              return res;
            })
          });
        }

        const respTextDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseText');
        if (respTextDesc && typeof respTextDesc.get === 'function') {
          Object.defineProperty(XMLHttpRequest.prototype, 'responseText', {
            configurable: true,
            enumerable: respTextDesc.enumerable,
            get: createStealthProxy(respTextDesc.get, (target, thisArg, argArray) => {
              const text = Reflect.apply(target, thisArg, argArray);
              if (isEnabled() && typeof text === 'string' && isYouTubeInnerTubeXhr(thisArg) && AD_JSON_REGEX.test(text)) {
                try {
                  const parsed = origJSONParse(text);
                  pruneYouTubePayload(parsed);
                  return JSON.stringify(parsed);
                } catch (e) {}
              }
              return text;
            })
          });
        }
      }
    } catch (e) {}

    // Neutralize Image bait pings (www.google.com/pagead/lvz, doubleclick.net/pagead/id)
    try {
      if (typeof HTMLImageElement !== 'undefined' && HTMLImageElement.prototype) {
        const imgSrcDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
        if (imgSrcDesc && typeof imgSrcDesc.set === 'function') {
          Object.defineProperty(HTMLImageElement.prototype, 'src', {
            configurable: true,
            enumerable: imgSrcDesc.enumerable,
            get: imgSrcDesc.get,
            set: createStealthProxy(imgSrcDesc.set, (target, thisArg, argArray) => {
              if (isEnabled() && argArray.length > 0 && typeof argArray[0] === 'string' && AD_BAIT_URL_REGEX.test(argArray[0])) {
                argArray[0] = TRANSPARENT_PIXEL;
              }
              return Reflect.apply(target, thisArg, argArray);
            })
          });
        }
      }
    } catch (e) {}

    // 5. Player Method Guardian & Anti-Error-282054944 Kill-Switch Blocker
    // In YouTube's m=late,app:12029, `watchNextDataChanged_` calls `#movie_player.updateVideoData(...)`
    // 1-2 seconds after playback starts to inject Error 282054944 ("Đã xảy ra lỗi. Vui lòng thử lại sau.")
    // and kill the active video/audio stream. We hook `updateVideoData`, `loadVideoByPlayerVars`,
    // `cueVideoByPlayerVars`, and `getPlayerResponse` on `#movie_player` to block this kill switch!
    let wasAdShowing = false;
    const hookedPlayers = new WeakSet();
    const recoveredVideoIds = new Set();

    function isFakeErrorPayload(data) {
      if (!data || typeof data !== 'object') return false;
      if (data.playabilityStatus && typeof data.playabilityStatus === 'object') {
        const st = data.playabilityStatus.status;
        if ((st === 'ERROR' || st === 'UNPLAYABLE' || st === 'LOGIN_REQUIRED') && !data.streamingData) {
          return true;
        }
      }
      if (data.bkaEnforcementMessageViewModel || data.enforcementMessageViewModel) return true;
      return false;
    }

    function ensurePlayerHooked(ytPlayer) {
      if (!ytPlayer || hookedPlayers.has(ytPlayer)) return;
      try {
        if (typeof ytPlayer.getPlayerResponse === 'function') {
          hookedPlayers.add(ytPlayer);

          ytPlayer.getPlayerResponse = createStealthProxy(ytPlayer.getPlayerResponse, (target, thisArg, argArray) => {
            const res = Reflect.apply(target, thisArg, argArray);
            if (res && typeof res === 'object' && isEnabled()) {
              pruneYouTubePayload(res);
            }
            return res;
          });

          if (typeof ytPlayer.updateVideoData === 'function') {
            ytPlayer.updateVideoData = createStealthProxy(ytPlayer.updateVideoData, (target, thisArg, argArray) => {
              if (isEnabled() && argArray.length > 0 && argArray[0] && typeof argArray[0] === 'object') {
                const payload = argArray[0];
                // Block `watchNextDataChanged_` from injecting an error-only payload (Error 282054944)
                // when the player already has an active stream or valid video!
                const video = thisArg && typeof thisArg.querySelector === 'function' ? thisArg.querySelector('video') : null;
                if (isFakeErrorPayload(payload) && video && (video.getAttribute('src') || video.currentTime > 0)) {
                  return undefined;
                }
                pruneYouTubePayload(payload);
              }
              return Reflect.apply(target, thisArg, argArray);
            });
          }

          if (typeof ytPlayer.loadVideoByPlayerVars === 'function') {
            ytPlayer.loadVideoByPlayerVars = createStealthProxy(ytPlayer.loadVideoByPlayerVars, (target, thisArg, argArray) => {
              if (isEnabled() && argArray.length > 0 && argArray[0] && typeof argArray[0] === 'object') {
                pruneYouTubePayload(argArray[0]);
              }
              return Reflect.apply(target, thisArg, argArray);
            });
          }

          if (typeof ytPlayer.cueVideoByPlayerVars === 'function') {
            ytPlayer.cueVideoByPlayerVars = createStealthProxy(ytPlayer.cueVideoByPlayerVars, (target, thisArg, argArray) => {
              if (isEnabled() && argArray.length > 0 && argArray[0] && typeof argArray[0] === 'object') {
                pruneYouTubePayload(argArray[0]);
              }
              return Reflect.apply(target, thisArg, argArray);
            });
          }
        }
      } catch (e) {}
    }

    function handleFallbackAdState() {
      if (!isEnabled()) return;
      try {
        // ONLY inspect #movie_player — NEVER fallback to `.html5-video-player` because `DuY()` ("p.m_" in m=kevlar_base_module)
        // prepends a fake `<ytd-player>` with `.ad-interrupting` and `<video class="html5-main-video">` to `document.body` as a honeypot!
        const ytPlayer = document.getElementById('movie_player');
        if (!ytPlayer) return;

        ensurePlayerHooked(ytPlayer);

        const isAdShowing = ytPlayer.classList.contains('ad-showing') || ytPlayer.classList.contains('ad-interrupting');
        const video = ytPlayer.querySelector('video.html5-main-video') || ytPlayer.querySelector('video');

        // Detect and auto-recover from Error 282054944 ("Đã xảy ra lỗi. Vui lòng thử lại sau.")
        const hasErrorClass = ytPlayer.classList.contains('ytp-error');
        const errorScreenEl = document.querySelector('#error-screen yt-playability-error-supported-renderers:not([hidden])');
        if (hasErrorClass || errorScreenEl) {
          const currentVid = getCurrentVideoId();
          if (currentVid) {
            if (ytPlayer.classList.contains('ytp-error')) {
              ytPlayer.classList.remove('ytp-error');
            }
            const watchFlexy = document.querySelector('ytd-watch-flexy');
            if (watchFlexy && watchFlexy.hasAttribute('player-unavailable')) {
              watchFlexy.removeAttribute('player-unavailable');
            }
            // If YouTube killed the <video src> stream via updateVideoData before our hook caught it,
            // reload the video cleanly once via YouTube Player API (`loadVideoById`).
            if ((!video || !video.getAttribute('src')) && !recoveredVideoIds.has(currentVid)) {
              recoveredVideoIds.add(currentVid);
              if (typeof ytPlayer.loadVideoById === 'function') {
                try {
                  ytPlayer.loadVideoById(currentVid);
                  if (typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
                } catch (e) {}
              }
            }
          }
        }

        if (video && video.getAttribute('src')) {
          if (ytPlayer.classList.contains('ytp-error')) {
            ytPlayer.classList.remove('ytp-error');
          }
          const watchFlexy = document.querySelector('ytd-watch-flexy');
          if (watchFlexy && watchFlexy.hasAttribute('player-unavailable')) {
            watchFlexy.removeAttribute('player-unavailable');
          }
          if (video.style.display === 'none') {
            video.style.display = 'block';
          }
        }

        if (isAdShowing) {
          wasAdShowing = true;
          reportAdDetected(1);

          if (video) {
            if (!video.muted) {
              try { video.muted = true; } catch (e) {}
            }
            // Instantly jump ad video to its end if duration is valid (VOD only)
            if (!isYouTubeLiveStream() && Number.isFinite(video.duration) && video.duration > 0.5 && video.duration < 300) {
              try {
                video.currentTime = video.duration;
              } catch (e) {}
            }
          }

          // Use YouTube player's internal API method if available (no untrusted DOM click events)
          if (!isYouTubeLiveStream()) {
            if (typeof ytPlayer.skipAd === 'function') {
              try { ytPlayer.skipAd(); } catch (e) {}
            }
            if (typeof ytPlayer.finishAd === 'function') {
              try { ytPlayer.finishAd(); } catch (e) {}
            }
          }
        } else if (wasAdShowing) {
          wasAdShowing = false;
          if (video && video.muted) {
            try { video.muted = false; } catch (e) {}
          }
        }

        // Dismiss anti-adblock enforcement popup if ever rendered
        const enforcementModal = document.querySelector(
          'ytd-enforcement-message-view-model, ytd-enforcement-message-renderer'
        );
        if (enforcementModal) {
          const dialog = enforcementModal.closest('tp-yt-paper-dialog');
          if (dialog && dialog.style.display !== 'none') {
            try {
              if (typeof dialog.close === 'function') dialog.close();
              if (typeof dialog.cancel === 'function') dialog.cancel();
              dialog.opened = false;
              dialog.style.setProperty('display', 'none', 'important');
              if (dialog.backdropElement) {
                dialog.backdropElement.opened = false;
                dialog.backdropElement.style.setProperty('display', 'none', 'important');
              }
              if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
                ytPlayer.playVideo();
              }
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    // Auto-resume if YouTube's player pauses the main video at t < 1.0s after preroll ad stripping
    let userPausedManually = false;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.key === 'k' || e.key === 'K') userPausedManually = true;
    }, true);
    window.addEventListener('pointerdown', (e) => {
      if (e.target && e.target.closest && e.target.closest('#movie_player')) userPausedManually = true;
    }, true);

    function resumeIfAutoPaused(e) {
      if (!isEnabled()) return;
      try {
        const video = e && e.target;
        if (!video || video.tagName !== 'VIDEO') return;
        const ytPlayer = document.getElementById('movie_player');
        if (!ytPlayer || !ytPlayer.contains(video)) return;
        if (ytPlayer.classList.contains('ad-showing') || ytPlayer.classList.contains('ad-interrupting')) {
          handleFallbackAdState();
          return;
        }
        if (!userPausedManually && video.paused && video.currentTime < 1.0 && video.readyState >= 2) {
          video.play().catch(() => {});
        }
      } catch (err) {}
    }
    document.addEventListener('loadedmetadata', resumeIfAutoPaused, true);
    document.addEventListener('durationchange', resumeIfAutoPaused, true);
    document.addEventListener('canplay', resumeIfAutoPaused, true);
    document.addEventListener('pause', resumeIfAutoPaused, true);

    // Observe only class changes on #movie_player or lightweight DOM mutations
    try {
      const obs = new MutationObserver(handleFallbackAdState);
      obs.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'src', 'hidden']
      });
    } catch (e) {}

    window.addEventListener('yt-navigate-start', () => {
      userPausedManually = false;
    });

    window.addEventListener('yt-navigate-finish', () => {
      currentIsLiveStream = false;
      userPausedManually = false;
      handleFallbackAdState();
    });
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

      try {
        if (hrefDescriptor && hrefDescriptor.set) {
          Object.defineProperty(locationProto, 'href', {
            get: hrefDescriptor.get,
            set: function (val) {
              if (checkLocationRedirect(val)) {
                hrefDescriptor.set.call(this, val);
              }
            }
          });
        }
      } catch (e) {}

      try {
        locationProto.assign = function (val) {
          if (checkLocationRedirect(val)) {
            originalAssign.call(this, val);
          }
        };
      } catch (e) {}

      try {
        locationProto.replace = function (val) {
          if (checkLocationRedirect(val)) {
            originalReplace.call(this, val);
          }
        };
      } catch (e) {}

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

  // Universal Video Player Protection, Clickadu Disarm & Play Enforcer (Runs on both main sites and embedded iframes)
  (function () {
    if (window.location.hostname.includes('youtube.com') || window.location.hostname.includes('google')) return;

    // 1. Strip known malicious ad scripts immediately from DOM
    function purgeAdScripts() {
      const adScripts = document.querySelectorAll(
        'script[data-clocid], script[src*="on.js"], script[src*="astronautlividlyreformer"], script[src*="jpm.js"], script[src*="video-slider"], script[src*="adManager"], script[src*="ad-provider"]'
      );
      adScripts.forEach(s => {
        try {
          s.removeAttribute('data-clocid');
          s.remove();
        } catch (e) {}
      });
    }
    purgeAdScripts();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', purgeAdScripts);
    }

    // 2. Javmost Specific Player Handler
    function triggerJavmostPlayer() {
      const sp = document.getElementById('show_player');
      if (!sp || sp.querySelector('iframe')) return;

      // Priority A: Call native window.init_start_select()
      if (typeof window.init_start_select === 'function') {
        try {
          window.init_start_select();
          console.log('[WebShield] Triggered javmost init_start_select');
          return;
        } catch (e) {}
      }

      // Priority B: Trigger button.onclick handler or click
      const btn = sp.querySelector('button[onclick*="init_start_select"]');
      if (btn) {
        if (typeof btn.onclick === 'function') {
          try {
            btn.onclick();
            return;
          } catch (e) {}
        }
        try { btn.click(); return; } catch (e) {}
      }

      // Priority C: Direct fallback to window.select_part()
      if (typeof window.select_part === 'function') {
        try {
          const g = window.YWRzMg || '62';
          const c1 = window.YWRzNA || '';
          const c2 = window.YWRzNQ || '';
          const c3 = window.YWRzNg || '';
          window.select_part('1', g, '', 'no', c1, c2, c3);
        } catch (e) {}
      }
    }

    // Auto-load retry for javmost: Wait until page functions are initialized
    if (window.location.hostname.includes('javmost')) {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        const sp = document.getElementById('show_player');
        if (sp && sp.querySelector('iframe')) {
          clearInterval(interval);
          return;
        }
        if (typeof window.init_start_select === 'function' || typeof window.select_part === 'function') {
          triggerJavmostPlayer();
          clearInterval(interval);
        } else if (attempts > 30) {
          clearInterval(interval);
        }
      }, 200);
    }

    // 3. Javmost Thumbnail Click Handler (Only runs on javmost before player iframe is loaded)
    // NOTE: Runs in BUBBLING phase (capture: false) and NEVER calls e.stopPropagation(),
    // ensuring native button onclick fires cleanly and unimpeded!
    if (window.location.hostname.includes('javmost')) {
      document.addEventListener('click', function (e) {
        const sp = e.target && e.target.closest ? e.target.closest('#show_player') : null;
        if (sp && !sp.querySelector('iframe')) {
          triggerJavmostPlayer();
        }
      }, false);
    }

    // 4. In embedded player iframes (e.g. dooplayer.com): Neutralize ad capture-phase click hijackers
    if (window.self !== window.top) {
      try {
        const origWinAEL = window.addEventListener;
        const origDocAEL = document.addEventListener;

        function isAdClickCapture(type, useCapture) {
          if (type !== 'click' && type !== 'mousedown' && type !== 'pointerdown') return false;
          return (typeof useCapture === 'boolean' && useCapture) ||
                 (useCapture && typeof useCapture === 'object' && useCapture.capture);
        }

        function isAdScriptFunction(fn) {
          try {
            if (typeof fn !== 'function') return false;
            const str = Function.prototype.toString.call(fn);
            return str.includes('open') || str.includes('location') || str.includes('proxy') || str.includes('cl_') || str.includes('onclopen');
          } catch (e) {
            return false;
          }
        }

        window.addEventListener = function (type, listener, options) {
          if (isAdClickCapture(type, options) && typeof listener === 'function') {
            const wrapped = function (e) {
              if (e && e.target && e.target.closest && e.target.closest('.plyr, video, .player-wrapper, #player, .plyr__controls, .plyr__control, .plyr__control--overlaid')) {
                if (isAdScriptFunction(listener)) {
                  return; // Disarm ad listener!
                }
              }
              return listener.apply(this, arguments);
            };
            return origWinAEL.call(this, type, wrapped, options);
          }
          return origWinAEL.apply(this, arguments);
        };

        document.addEventListener = function (type, listener, options) {
          if (isAdClickCapture(type, options) && typeof listener === 'function') {
            const wrapped = function (e) {
              if (e && e.target && e.target.closest && e.target.closest('.plyr, video, .player-wrapper, #player, .plyr__controls, .plyr__control, .plyr__control--overlaid')) {
                if (isAdScriptFunction(listener)) {
                  return; // Disarm ad listener!
                }
              }
              return listener.apply(this, arguments);
            };
            return origDocAEL.call(this, type, wrapped, options);
          }
          return origDocAEL.apply(this, arguments);
        };
      } catch (e) {}
    }

    // 5. Overlaid Initial Play Button Kick-starter (Zero interference with controls!)
    // When the user clicks the big overlaid play button before playback starts, ensure video starts playing.
    document.addEventListener('click', function (e) {
      const overlaidPlay = e.target && e.target.closest && e.target.closest('.plyr__control--overlaid, .play-btn, button[data-plyr="play"]');
      if (overlaidPlay) {
        if (window.plyr && typeof window.plyr.play === 'function') {
          try { window.plyr.play(); } catch (err) {}
        }
        const vid = document.querySelector('video');
        if (vid && vid.paused) {
          setTimeout(() => {
            if (vid.paused) {
              const p = vid.play();
              if (p && p.catch) p.catch(() => {});
            }
          }, 80);
        }
      }
    }, false);
  })();

  runGenericAntiAdblockBypass();
})();
