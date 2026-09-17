(function () {
  // Developed by HuyTran1002
  console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');


  // Anti-Anti-Adblock bypass logic for movie sites (like animevietsub)
  (function () {
    if (window.location.hostname.includes('youtube.com') ||
      window.location.hostname.includes('google') ||
      window.location.hostname.includes('doubleclick')) return;

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
      VideoSlider: { init: function () { } },
      univresalP: function () { },
      pickDirect: function () { console.log('[Anti Pop-Under] Blocked pickDirect ad overlay'); },
      funcGetvastAdx: function () { return []; },
      funcJWonReadyVAST: function () { },
      COUNT_VAST: 0,
      show_adx: 0,
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
      window.funcGetvastAdx = function () { return []; };
      window.funcJWonReadyVAST = function () { };
      window.COUNT_VAST = 0;
      window.show_adx = 0;

      // Safety stub for JWPlayer telemetry (jwpsrv)
      if (!window.jwpsrv) {
        const dummyJwpsrv = function () {
          return {
            track: function () { },
            event: function () { },
            send: function () { }
          };
        };
        dummyJwpsrv.track = function () { };
        dummyJwpsrv.event = function () { };
        dummyJwpsrv.send = function () { };
        dummyJwpsrv.setTracker = function () { };
        window.jwpsrv = dummyJwpsrv;
      }
    } catch (e) { }

    // Neutralize VideoJS preroll ad hijackings on video tube sites (e.g. 91porn, adult tube sites)
    try {
      const overrideVideoJsPreroll = (vjs) => {
        if (!vjs || vjs._prerollNeutralized) return;
        vjs._prerollNeutralized = true;
        try {
          if (vjs.Player && vjs.Player.prototype) {
            vjs.Player.prototype.preroll = function () {
              console.log('[Anti Pop-Under] Neutralized videojs preroll ad injection');
              return this;
            };
          }
          if (vjs.prototype) {
            vjs.prototype.preroll = function () {
              return this;
            };
          }
        } catch (err) { }
      };

      if (window.videojs) {
        overrideVideoJsPreroll(window.videojs);
      } else {
        let realVideoJs = window.videojs;
        Object.defineProperty(window, 'videojs', {
          configurable: true,
          enumerable: true,
          get() { return realVideoJs; },
          set(val) {
            realVideoJs = val;
            overrideVideoJsPreroll(val);
          }
        });
      }
    } catch (e) { }

    try {
      const dummyAdProvider = { push: function () { } };
      Object.defineProperty(window, 'AdProvider', {
        get() { return dummyAdProvider; },
        set(val) { /* ignore */ },
        configurable: true
      });
      const dummyVideoSlider = { init: function () { } };
      Object.defineProperty(window, 'VideoSlider', {
        get() { return dummyVideoSlider; },
        set(val) { /* ignore */ },
        configurable: true
      });
      Object.defineProperty(window, 'pickDirect', {
        get() { return function () { console.log('[Anti Pop-Under] Neutralized pickDirect ad'); }; },
        set(val) { /* ignore */ },
        configurable: true
      });

      // Safety patch for jQuery .position() on movie sites (e.g. animevietsub home-v1.js:373)
      // Prevents: "TypeError: Cannot read properties of undefined (reading 'top')" when active episode is not found
      function patchJQuery(jq) {
        if (jq && jq.fn && jq.fn.position && !jq.fn.position._safePatched) {
          const origPos = jq.fn.position;
          jq.fn.position = function () {
            if (!this[0]) {
              return { top: 0, left: 0 };
            }
            return origPos.apply(this, arguments) || { top: 0, left: 0 };
          };
          jq.fn.position._safePatched = true;
        }
      }

      let _jq = window.jQuery;
      if (_jq) patchJQuery(_jq);
      Object.defineProperty(window, 'jQuery', {
        get() { return _jq; },
        set(val) {
          _jq = val;
          patchJQuery(val);
        },
        configurable: true,
        enumerable: true
      });

      let _dollar = window.$;
      if (_dollar) patchJQuery(_dollar);
      Object.defineProperty(window, '$', {
        get() { return _dollar; },
        set(val) {
          _dollar = val;
          patchJQuery(val);
        },
        configurable: true,
        enumerable: true
      });
      // End mock globals
    } catch (e) { }

    function isAdUrl(urlStr) {
      if (!urlStr) return false;
      try {
        const lower = String(urlStr).toLowerCase();
        const keywords = [
          'doubleclick', 'googlesyndication', 'googleadservices', 'adsterra', 'popads',
          'popcash', 'propellerads', 'exoclick', 'clktag', 'onclickads', 'exdynsrv',
          'juicyads', 'mgid.com', 'taboola', 'outbrain', 'adnxs', 'onclickalgo',
          'highperformancegate', 'highcpmgate', 'greatcpmgate', 'eclick.vn', 'novanet.vn',
          'magsrv.com', 'mnaspm.com', 'mayzaent.com', 'prplad.com', 'monetag.com', 'smartpop',
          'ev-player.js', '/ad?type=', 'adspro.name', 'streamux.top', 'hbet.loan', 'lu88.ist',
          'tx88.army', 'vu88.foo', '9bet.beer', 'du88.money', 'vua88.eco', '789club.zip',
          'ima3.js', 'vast.js', 'vpaid.js', 'trafficjunky', 'tsyndicate', 'a-ads.com'
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

    function isAdBait(el) {
      if (!el || !el.tagName) return false;
      const tag = el.tagName;
      if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'CANVAS' || tag === 'SOURCE' || tag === 'TRACK' || tag === 'IFRAME') return false;
      const rawId = el.id;
      const rawClass = el.className;
      if (!rawId && (!rawClass || typeof rawClass !== 'string' || rawClass === '')) return false;

      try {
        const id = rawId ? rawId.toLowerCase() : '';
        const className = (typeof rawClass === 'string') ? rawClass.toLowerCase() : '';

        // Fast guard: skip elements that do not contain ad-related keyword substrings
        if (!id.includes('ad') && !id.includes('qc') && !id.includes('quang') && !id.includes('preload') &&
          !className.includes('ad') && !className.includes('qc') && !className.includes('quang') && !className.includes('adv')) {
          return false;
        }

        const name = (el.getAttribute && el.getAttribute('name') || '').toLowerCase();

        // Exact ID matches for bait patterns used by anti-adblock detectors
        const exactBaitIds = [
          'ad', 'ads', 'ad1', 'ad2', 'ad_box', 'ad-box', 'ads-box', 'adsbox',
          '_preload-ads-1', '_preload-ads-2', 'preload-ads', 'ads-preload',
          'googlead', 'google-ads', 'google_ads', 'google-ad-banner'
        ];
        if (exactBaitIds.includes(id)) return true;

        const keywords = [
          'adsbox', 'ad-placement', 'quangcao', 'quang-cao', 'ad-box', 'ad_box', 'ads-box',
          'sponsored', 'ad-holder', 'qc-holder', 'ad-container', 'preload-ads', '_preload-ads',
          'ad-center', 'ad-detect', 'adblock-detect', 'ads-detect'
        ];
        if (keywords.some(kw => id.includes(kw) || className.includes(kw) || name.includes(kw))) {
          return true;
        }

        // Class-specific bait patterns (Adv, adv, ad-center-header)
        const classTokens = className.split(/\s+/);
        const baitClasses = ['adv', 'ad-center-header', 'ads-banner', 'ad-banner', 'adbanner', 'adsense'];
        if (baitClasses.some(bc => classTokens.includes(bc))) return true;

        if (id === 'ad' || id === 'ads' || className === 'ad' || className === 'ads') {
          return true;
        }
      } catch (e) { }
      return false;
    }

    // === document.getElementById / querySelector OVERRIDE ===
    // Intercept early bait-element lookups that happen before body exists.
    // Anti-adblock scripts in <head> do: getElementById('_preload-ads-1') and
    // check offsetHeight/style. Return a real (but off-screen) fake element.
    try {
      const BAIT_IDS = new Set([
        '_preload-ads-1', '_preload-ads-2', 'preload-ads', 'ads-preload',
        'adsbox', 'ads-banner', 'ad-banner', 'google-ads', 'google_ads',
        'googlead', 'ad-box', 'ad_box', 'ads-box'
      ]);
      const BAIT_CLASS_SELECTORS = [
        '.Adv', '.adv', '.ad-center-header', '.adsbox', '.ads-banner', '.ad-banner',
        '[id="_preload-ads-1"]', '[id="_preload-ads-2"]'
      ];

      // Cache of fake elements keyed by id
      const _fakeElCache = new Map();

      function createFakeBaitElement(id) {
        if (_fakeElCache.has(id)) return _fakeElCache.get(id);
        try {
          const el = document.createElement('div');
          el.id = id || '';
          el.className = 'Adv ad-center-header adsbox';
          el.setAttribute('style', 'position:fixed;top:-9999px;left:-9999px;width:300px;height:250px;opacity:0.01;pointer-events:none;');
          el.setAttribute('aria-hidden', 'true');
          _fakeElCache.set(id, el);
          // Attach to DOM immediately so parentElement / closest / querySelector all work natively
          const attachTarget = document.body || document.documentElement || document.head;
          if (attachTarget) {
            try { attachTarget.appendChild(el); } catch (e) { }
          }
          if (!document.body) {
            const moveObserver = new MutationObserver(() => {
              if (document.body && el.parentElement !== document.body) {
                try { document.body.insertBefore(el, document.body.firstChild); } catch (e) { }
                moveObserver.disconnect();
              }
            });
            try {
              moveObserver.observe(document.documentElement || document, { childList: true, subtree: true });
            } catch (e) { }
          }
          return el;
        } catch (e) { return null; }
      }

      const _origGetElementById = document.getElementById.bind(document);
      document.getElementById = function (id) {
        try {
          const real = _origGetElementById(id);
          if (real) return real;
          if (typeof id === 'string' && BAIT_IDS.has(id)) {
            return createFakeBaitElement(id);
          }
          return null;
        } catch (e) {
          return _origGetElementById(id);
        }
      };

      const _origQuerySelector = document.querySelector.bind(document);
      document.querySelector = function (sel) {
        try {
          const real = _origQuerySelector(sel);
          if (real) return real;
          // Return fake for known bait selectors
          if (typeof sel === 'string') {
            const selLow = sel.toLowerCase();
            if (BAIT_CLASS_SELECTORS.some(bc => selLow === bc.toLowerCase() || selLow.startsWith(bc.toLowerCase() + ' ') || selLow.startsWith(bc.toLowerCase() + '.'))) {
              return createFakeBaitElement('adsbox');
            }
            // Also handle ID selectors like #_preload-ads-1
            const idMatch = sel.match(/^#([\w-]+)$/);
            if (idMatch && BAIT_IDS.has(idMatch[1])) {
              return createFakeBaitElement(idMatch[1]);
            }
          }
          return null;
        } catch (e) {
          return _origQuerySelector(sel);
        }
      };

      const _origQuerySelectorAll = document.querySelectorAll.bind(document);
      document.querySelectorAll = function (sel) {
        try {
          const real = _origQuerySelectorAll(sel);
          if (real && real.length > 0) return real;
          if (typeof sel === 'string') {
            const selLow = sel.toLowerCase();
            if (BAIT_CLASS_SELECTORS.some(bc => selLow === bc.toLowerCase())) {
              const fakeEl = createFakeBaitElement('adsbox');
              try {
                const refreshed = _origQuerySelectorAll(sel);
                if (refreshed && refreshed.length > 0) return refreshed;
              } catch (err) { }
              return fakeEl ? [fakeEl] : (real || []);
            }
          }
          return real;
        } catch (e) {
          return _origQuerySelectorAll(sel);
        }
      };
    } catch (e) { }
    // === END document override ===

    // Intercept fetch() to fake successful responses for ad network check URLs
    // (Defeats network-based adblock detection used by sites like animevietsub.li)
    try {
      const _origFetch = window.fetch;
      window.fetch = function (resource, init) {
        let urlStr = '';
        try {
          urlStr = (typeof resource === 'string') ? resource : (resource && resource.url) || '';
        } catch (e) { }
        if (urlStr && isAdUrl(urlStr)) {
          console.log('[Anti Pop-Under] Faking fetch success for ad URL:', urlStr);
          return Promise.resolve(new Response('', { status: 200, statusText: 'OK' }));
        }
        return _origFetch.apply(this, arguments);
      };
    } catch (e) { }

    // Intercept XMLHttpRequest to fake successful responses for ad network check URLs
    try {
      const _origXhrOpen = XMLHttpRequest.prototype.open;
      const _origXhrSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url) {
        this._interceptedAdUrl = (typeof url === 'string' && isAdUrl(url)) ? url : null;
        return _origXhrOpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function () {
        if (this._interceptedAdUrl) {
          console.log('[Anti Pop-Under] Faking XHR success for ad URL:', this._interceptedAdUrl);
          Object.defineProperty(this, 'status', { get() { return 200; }, configurable: true });
          Object.defineProperty(this, 'readyState', { get() { return 4; }, configurable: true });
          Object.defineProperty(this, 'responseText', { get() { return ''; }, configurable: true });
          Object.defineProperty(this, 'response', { get() { return ''; }, configurable: true });
          setTimeout(() => {
            try {
              if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
              if (typeof this.onload === 'function') this.onload();
            } catch (e) { }
          }, 0);
          return;
        }
        return _origXhrSend.apply(this, arguments);
      };
    } catch (e) { }

    // Intercept Image() to fake onload for ad beacon/pixel checks
    // Many sites do: var img = new Image(); img.onload = successFn; img.onerror = detectFn; img.src = adUrl;
    try {
      const OrigImage = window.Image;
      const imgSrcDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (imgSrcDescriptor && imgSrcDescriptor.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          get: imgSrcDescriptor.get,
          set(val) {
            if (typeof val === 'string' && isAdUrl(val)) {
              console.log('[Anti Pop-Under] Faking Image onload for ad beacon:', val);
              // Set a 1x1 transparent gif data URI instead to trigger onload
              imgSrcDescriptor.set.call(this, 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
              return;
            }
            imgSrcDescriptor.set.call(this, val);
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch (e) { }

    // Auto-inject stub bait elements that anti-adblock scripts expect to find in DOM
    // Uses MutationObserver so stubs appear as soon as <body> is created (document_start)
    try {
      const baitElementSpecs = [
        { id: '_preload-ads-1' },
        { id: '_preload-ads-2' },
        { id: 'ads-banner' },
        { id: 'google-ads' },
        { id: 'adsbox' },
        { id: 'ad-banner' }
      ];
      const STUB_STYLE = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:-1;';

      const injectBaitStubs = () => {
        if (!document.body) return;
        baitElementSpecs.forEach(spec => {
          if (!document.getElementById(spec.id)) {
            const stub = document.createElement('div');
            stub.id = spec.id;
            stub.setAttribute('style', STUB_STYLE);
            stub.className = 'Adv ad-center-header adsbox';
            stub.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(stub, document.body.firstChild);
          }
        });
      };

      if (document.body) {
        injectBaitStubs();
      } else {
        // MutationObserver watching documentElement for body insertion
        const bodyObserver = new MutationObserver((mutations, obs) => {
          if (document.body) {
            obs.disconnect();
            injectBaitStubs();
            startBaitGuardian();
          }
        });
        bodyObserver.observe(document.documentElement || document, {
          childList: true,
          subtree: false
        });
        // Fallback
        document.addEventListener('DOMContentLoaded', () => {
          injectBaitStubs();
          startBaitGuardian();
          try { bodyObserver.disconnect(); } catch (e) { }
        }, { once: true });
      }

      // Guardian: re-inject if any bait element gets removed
      function startBaitGuardian() {
        try {
          const baitIds = new Set(baitElementSpecs.map(s => s.id));
          const guardObserver = new MutationObserver(() => {
            baitElementSpecs.forEach(spec => {
              if (!document.getElementById(spec.id) && document.body) {
                const stub = document.createElement('div');
                stub.id = spec.id;
                stub.setAttribute('style', STUB_STYLE);
                stub.className = 'Adv ad-center-header adsbox';
                stub.setAttribute('aria-hidden', 'true');
                document.body.insertBefore(stub, document.body.firstChild);
              }
            });
          });
          if (document.body) {
            guardObserver.observe(document.body, { childList: true, subtree: false });
          }
        } catch (e) { }
      }
    } catch (e) { }

    try {
      const originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight').get;
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
        get() {
          const h = originalOffsetHeight.call(this);
          if (h === 0 && isAdBait(this)) {
            return 250;
          }
          return h;
        },
        configurable: true
      });

      const originalOffsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth').get;
      Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
        get() {
          const w = originalOffsetWidth.call(this);
          if (w === 0 && isAdBait(this)) {
            return 300;
          }
          return w;
        },
        configurable: true
      });

      const originalClientHeight = Object.getOwnPropertyDescriptor(Element.prototype, 'clientHeight').get;
      Object.defineProperty(Element.prototype, 'clientHeight', {
        get() {
          const h = originalClientHeight.call(this);
          if (h === 0 && isAdBait(this)) {
            return 250;
          }
          return h;
        },
        configurable: true
      });

      const originalClientWidth = Object.getOwnPropertyDescriptor(Element.prototype, 'clientWidth').get;
      Object.defineProperty(Element.prototype, 'clientWidth', {
        get() {
          const w = originalClientWidth.call(this);
          if (w === 0 && isAdBait(this)) {
            return 300;
          }
          return w;
        },
        configurable: true
      });
    } catch (e) { }

    try {
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        const rect = originalGetBoundingClientRect.call(this);
        if (rect.height === 0 && isAdBait(this)) {
          return {
            top: rect.top,
            left: rect.left,
            right: rect.left + 300,
            bottom: rect.top + 250,
            width: 300,
            height: 250,
            x: rect.left,
            y: rect.top,
            toJSON: () => { }
          };
        }
        return rect;
      };
    } catch (e) { }

    try {
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (el, pseudoElt) {
        const style = originalGetComputedStyle.call(this, el, pseudoElt);
        if (el && (el.id || (el.className && typeof el.className === 'string' && el.className !== ''))) {
          if (isAdBait(el)) {
            return new Proxy(style, {
              get(target, prop) {
                if (prop === 'display') {
                  const val = target.display;
                  return val === 'none' ? 'block' : val;
                }
                if (prop === 'visibility') {
                  const val = target.visibility;
                  return val === 'hidden' ? 'visible' : val;
                }
                if (prop === 'opacity') {
                  const val = target.opacity;
                  return val === '0' ? '1' : val;
                }
                if (prop === 'getPropertyValue') {
                  return function (propertyName) {
                    if (propertyName === 'display') {
                      const val = target.getPropertyValue('display');
                      return val === 'none' ? 'block' : val;
                    }
                    if (propertyName === 'visibility') {
                      const val = target.getPropertyValue('visibility');
                      return val === 'hidden' ? 'visible' : val;
                    }
                    if (propertyName === 'opacity') {
                      const val = target.getPropertyValue('opacity');
                      return val === '0' ? '1' : val;
                    }
                    return target.getPropertyValue(propertyName);
                  };
                }
                const val = Reflect.get(target, prop);
                if (typeof val === 'function') {
                  return val.bind(target);
                }
                return val;
              }
            });
          }
        }
        return style;
      };
    } catch (e) { }
  })();

  // Declare all shared state variables at the top to prevent TDZ (Temporal Dead Zone) ReferenceErrors
  let initialPlayerResponse = undefined;
  let initialData = undefined;
  let ytplayer = undefined;
  let extensionEnabled = true;
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
      return whitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain));
    } catch (e) {
      return false;
    }
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

  // Track last interaction and intercept background clicks
  const interactionEvents = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchend'];
  const isYouTube = window.location.hostname.includes('youtube.com') ||
    window.location.hostname.includes('google') ||
    window.location.hostname.includes('doubleclick');

  function isInteractiveElement(el) {
    if (!el) return false;
    try {
      // In embedded iframes (e.g. video players like play.vlstream.net), clicks are always legitimate user gestures
      if (window.self !== window.top) return true;

      const tagName = el.tagName.toLowerCase();
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object'].includes(tagName)) return true;
      if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, .artplayer, .dplayer, #box, .loader, [class*="player"], [id*="player"], [class*="video"], [id*="video"], [class*="control"], [id*="control"], [class*="time"], [id*="time"], [class*="progress"], [id*="progress"], [class*="slider"], [id*="slider"]')) return true;
      if (el.closest('div, section') && el.closest('div, section').querySelector('video, #box, .jwplayer')) return true;

      if (el.closest('a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [tabindex], [onclick], [data-action], [contenteditable], #no-link, [id*="no-link"], [class*="episode"], [id*="episode"], [class*="server"], [id*="server"], [class*="halim-"], [class*="halim_"], [class*="thumb"], [id*="thumb"], .thumb-overlay, .img-responsive')) return true;
      const style = window.getComputedStyle(el);
      if (style && style.cursor && style.cursor.toLowerCase().includes('pointer')) return true;
      const ariaAttrs = ['aria-haspopup', 'aria-pressed', 'aria-expanded', 'aria-label', 'aria-controls'];
      for (let a of ariaAttrs) { if (el.hasAttribute && el.hasAttribute(a)) return true; }
      if (el.getAttribute && el.getAttribute('role')) {
        const r = (el.getAttribute('role') || '').toLowerCase();
        if (r === 'button' || r === 'link' || r === 'tab' || r === 'option') return true;
      }
    } catch (err) { }
    return false;
  }

  function blockScriptedRedirects(e) {
    // Background clicks should never cancel event propagation or preventDefault.
    // Clicks on body/html in embed iframes (like play.vlstream.net) or player wrappers are legitimate user gestures.
    // Actual malicious redirects (window.open, location changes, synthetic event dispatch) are already strictly intercepted by WebShield.
    return;
  }

  // Helper to determine if an element is or is inside an internal client-side navigation link (Next.js / React Router)
  function isInternalNavigationLink(node) {
    if (!node || node === document || node === document.body || node === document.documentElement) return false;
    try {
      const anchor = node.tagName && node.tagName.toLowerCase() === 'a' ? node : (node.closest ? node.closest('a') : null);
      if (!anchor) return false;
      const rawHref = anchor.getAttribute('href');
      if (!rawHref) return false;
      const href = rawHref.trim();
      if (!href || href === '#' || href.startsWith('javascript:')) return false;
      // Bắt đầu bằng "/", "./", "../", "?" hoặc "#" -> 100% Client-side route trong Next.js / React Router
      if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../') || href.startsWith('?') || href.startsWith('#')) {
        return true;
      }
      const curHost = window.location.hostname.toLowerCase().replace(/^www\./i, '');
      const aHost = new URL(anchor.href, window.location.href).hostname.toLowerCase().replace(/^www\./i, '');
      if (aHost === curHost || aHost.endsWith('.' + curHost) || curHost.endsWith('.' + aHost)) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  // Helper to identify resume/continue watching prompts or player playback confirmation dialogs
  function isResumeOrPlaybackDialog(node) {
    if (!node || node === document || node === document.body || node === document.documentElement) return false;
    try {
      const el = (node.nodeType === 1) ? node : node.parentElement;
      if (!el) return false;

      const resumeKeywordsRegex = /(?:xem\s*tiếp|tiếp\s*tục\s*(?:xem|phát)?|phát\s*tiếp|xem\s*lại|bắt\s*đầu\s*lại|vị\s*trí\s*(?:cũ|trước|đã\s*xem)|thời\s*gian\s*đã\s*xem|lần\s*trước|đoạn\s*trước|tập\s*trước|resume|continue\s*(?:watching|playback)?|start\s*over|replay|keep\s*watching|play\s*from)/i;

      const text = (el.innerText || el.textContent || '').trim();
      if (text.length > 0 && text.length < 600 && resumeKeywordsRegex.test(text)) {
        if (!gamblingRegex.test(text) && !adUrlRegex.test(text)) {
          return true;
        }
      }

      const buttons = el.querySelectorAll ? el.querySelectorAll('button, a, [role="button"], .btn, input[type="button"]') : [];
      for (let i = 0; i < buttons.length; i++) {
        const btnText = (buttons[i].innerText || buttons[i].textContent || buttons[i].value || '').trim();
        if (resumeKeywordsRegex.test(btnText) || /^(?:xem\s*tiếp|tiếp\s*tục|xem\s*lại|resume|continue|ok|đồng\s*ý)$/i.test(btnText)) {
          return true;
        }
      }

      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      const elId = (el.id || '').toLowerCase();
      if (
        elClass.includes('resume') || elId.includes('resume') ||
        elClass.includes('continue-watching') || elId.includes('continue-watching') ||
        elClass.includes('playback-confirm') || elId.includes('playback-confirm') ||
        elClass.includes('player-prompt') || elId.includes('player-prompt') ||
        elClass.includes('player-dialog') || elId.includes('player-dialog')
      ) {
        return true;
      }

      if (el.closest) {
        const dialog = el.closest('dialog, [role="dialog"], [aria-modal="true"], [class*="modal"], [class*="popup"], [class*="prompt"], [class*="alert"]');
        if (dialog && dialog !== el) {
          const dText = (dialog.innerText || dialog.textContent || '').trim();
          if (dText.length > 0 && dText.length < 600 && resumeKeywordsRegex.test(dText)) {
            return true;
          }
        }
      }
    } catch (e) {}
    return false;
  }

  /**
   * ============================================================================
   * MODULE 1: ĐỊNH NGHĨA RANH GIỚI BẢO VỆ TUYỆT ĐỐI (CORE MEDIA WHITELIST)
   * Thẩm định ranh giới bất khả xâm phạm của Video Player & Nội dung phim.
   * ============================================================================
   */
  function isSafeCoreZone(el) {
    if (!el || el === document || el === document.body || el === document.documentElement) return false;
    try {
      // BẢO VỆ TUYỆT ĐỐI NEXT.JS ROOT CONTAINER & CẤU TRÚC LAYOUT
      if (el.id === '__next' || (el.getAttribute && el.getAttribute('id') === '__next')) return true;
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (['main', 'header', 'footer', 'nav'].includes(tag)) return true;
      if (isInternalNavigationLink(el)) return true;
      if (isResumeOrPlaybackDialog(el)) return true;

      // 1. Thẻ Media HTML5 & Canvas
      if (['video', 'audio', 'source', 'track', 'canvas'].includes(tag)) {
        return true;
      }

      // 2. <iframe> chứa player (YouTube, Google Drive, stream servers, embed players)
      if (tag === 'iframe') {
        const src = (el.src || el.getAttribute('data-src') || '').toLowerCase();
        if (/youtube|youtu\.be|youtube-nocookie|drive\.google|player|embed|stream|video|watch|film|movie|vids|hls|m3u8|mp4|halim|hotp|2embed|vidsrc|superembed|play|media/i.test(src)) {
          return true;
        }
      }

      // 3. Container Player UI (.ytp-*, [class*="player"], [id*="player"], video-js, jwplayer, plyr, artplayer, dplayer, xgplayer, halim-movie)
      if (el.closest) {
        const inPlayer = el.closest(
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
          '[class*="screen-box" i], [id*="playBox" i], [class*="aspect-video" i], [class*="halim-movie" i]'
        );
        if (inPlayer) return true;
      }

      // 4. Sibling trực tiếp hoặc nằm chung container cha (depth < 5) với thẻ <video>
      let p = el.parentElement;
      let depth = 0;
      while (p && p !== document.body && p !== document.documentElement && depth < 5) {
        if (p.querySelector && p.querySelector('video, audio')) {
          return true;
        }
        const pClass = (typeof p.className === 'string') ? p.className.toLowerCase() : '';
        const pId = (p.id || '').toLowerCase();
        if (/player|video|jwplayer|vjs|plyr|artplayer|dplayer|xgplayer|fluid_player|media|halim/i.test(pClass) ||
            /player|video|jwplayer|vjs|plyr|artplayer|dplayer|xgplayer|fluid_player|media|halim/i.test(pId)) {
          return true;
        }
        p = p.parentElement;
        depth++;
      }

      // 5. Poster, Thumbnail, Banner phim, Danh sách tập & Server
      const elId = (el.id || '').toLowerCase();
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      const contentKeywords = ['poster', 'thumb', 'cover', 'movie', 'film', 'episode', 'server', 'play-list', 'list-ep', 'tap', 'halim', 'tray', 'swiper', 'carousel', 'slider', 'trailer', 'detail'];
      if (contentKeywords.some(kw => elId.includes(kw) || elClass.includes(kw))) {
        return true;
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
        '.thumb-overlay, [class*="thumb"], [id*="thumb"], .video-js, [class*="video-js"], [class*="vjs-"], ' +
        '.img-responsive, [class*="video-elem"], [class*="video-box"], [class*="video-item"], [class*="well-sm"], ' +
        '.carousel, .slider, .swiper, .slick-slider, .owl-carousel, [class*="banner"], [class*="poster"], ' +
        '[class*="detail"], [class*="trailer"]'
      )) {
        return true;
      }

      // 6. Thẻ <img> chứa poster/ảnh phim hoặc link nội bộ
      if (tag === 'img') {
        const src = (el.currentSrc || el.src || el.getAttribute('data-src') || el.getAttribute('data-original') || '').toLowerCase();
        if (src.startsWith('data:') || src.startsWith('blob:')) return true;
        if (/tmdb\.org|wsrv\.nl|phimimg\.com|ophim|nguonc\.com|animevietsub|cdn77|themoviedb|vsmov/i.test(src)) return true;
        try {
          const imgHost = new URL(src, window.location.href).hostname.toLowerCase();
          const curHost = window.location.hostname.toLowerCase();
          if (imgHost === curHost || imgHost.endsWith('.' + curHost) || curHost.endsWith('.' + imgHost)) {
            return true;
          }
        } catch(e) {}
        const alt = (el.alt || el.title || '').toLowerCase();
        if (alt && (/phim|tập|season|episode|trailer|movie|film/i.test(alt))) return true;
      }

      // 7. Thẻ <a> điều hướng nội bộ hoặc xem phim
      if (tag === 'a') {
        const href = (el.getAttribute('href') || '').toLowerCase();
        if (!href || href.startsWith('javascript:') || href.startsWith('#')) return true;
        if (/^\/(phim|tap-|movie|film|watch|xem-phim)/i.test(href) || /[\/\?](tap-|episode|phim-)/i.test(href)) {
          return true;
        }
        try {
          const urlObj = new URL(href, window.location.href);
          const aHost = urlObj.hostname.toLowerCase();
          const curHost = window.location.hostname.toLowerCase();
          if (aHost === curHost || aHost.endsWith('.' + curHost) || curHost.endsWith('.' + aHost)) {
            return true;
          }
        } catch(e) {}
      }

      // 8. Chứa media con hợp lệ
      if (el.querySelector && el.querySelector(
        'video, audio, ' +
        'img[src*="animevietsub"], img[src*="phim"], img[src*="film"], img[src*="movie"], img[src*="poster"], img[src*="thumb"], img[src*="cover"], img[src*="cdn77"], ' +
        'img[src*="tmdb.org"], img[src*="wsrv.nl"], img[src*="nguonc.com"], img[src*="phimimg.com"], img[src*="ophim"], img[src*="vsmov"], img[src*="themoviedb"], ' +
        '[class*="poster"], [class*="thumb"], [class*="cover"], [class*="episode"], [class*="server"]'
      )) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  const isInsideVideoPlayer = isSafeCoreZone;
  const isVideoPlayerOrControls = isSafeCoreZone;
  const isMovieBannerOrPoster = isSafeCoreZone;

  function injectPlayerStyles() {
    try {
      if (document.getElementById('webshield-player-styles')) return;
      const style = document.createElement('style');
      style.id = 'webshield-player-styles';
      style.textContent = `
        /* Chặn triệt để banner quảng cáo popup và catfish ngoài player */
        #popup-overlay:not([class*="player"] *):not(video), .popup-grid, .popup-banner, #catfish-banner {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
        }
      `;
      (document.head || document.documentElement).appendChild(style);
    } catch (e) { }
  }
  injectPlayerStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectPlayerStyles);
  }

  if (!isYouTube) {
    // Record user interaction timestamps passively without ever interfering with event flow
    ['pointerdown', 'keydown'].forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        lastInteractionTime = Date.now();
        lastInteractionEvent = e;
      }, { passive: true, capture: false });
    });

    // Handle user clicks in bubbling phase (capture: false)
    window.addEventListener('click', (e) => {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;

      if (!e.isTrusted) return; // Standard 2: Validate isTrusted
      if (!isEnabled() || isCurrentPageWhitelisted()) return;
      // Never block interactions when Target Picker mode is active on page
      if (document.getElementById('adblock-max-target-badge') || document.getElementById('adblock-max-target-overlay')) return;
      // In embedded player iframes, allow 100% native player controls & progress bar clicks
      if (window.self !== window.top) return;
      const target = e.target;
      if (!target) return;

      // BẢO VỆ TUYỆT ĐỐI NEXT.JS / REACT ROUTER CLIENT-SIDE NAVIGATION & POPUP XEM TIẾP
      if (target.id === '__next' || isInternalNavigationLink(target) || isResumeOrPlaybackDialog(target)) return;

      // NGUYÊN TẮC BẤT KHẢ XÂM PHẠM: Video player click pass-through
      // BẮT BUỘC: Nếu click phát sinh từ bên trong video player: RETURN NGAY LẬP TỨC!
      // TUYỆT ĐỐI KHÔNG gọi preventDefault(), stopPropagation() hay can thiệp DOM!
      if (isInsideVideoPlayer(target) || isMovieBannerOrPoster(target) || isResumeOrPlaybackDialog(target)) return;

      let check = target;
      while (check && check !== document && check !== document.body && check !== document.documentElement) {
        if (isInsideVideoPlayer(check) || isMovieBannerOrPoster(check) || isResumeOrPlaybackDialog(check)) return;
        check = check.parentElement;
      }

      // Check if click is on an anchor tag outside player
      let curr = target;
      let anchor = null;
      while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
        if (curr.tagName && curr.tagName.toLowerCase() === 'a') {
          anchor = curr;
          break;
        }
        curr = curr.parentElement;
      }

      if (anchor && anchor.href) {
        if (isInsideVideoPlayer(anchor) || isMovieBannerOrPoster(anchor) || isInternalNavigationLink(anchor) || isResumeOrPlaybackDialog(anchor)) return;

        const isTargetBlank = (anchor.getAttribute('target') || '').toLowerCase() === '_blank';
        const contextName = isTargetBlank ? 'anchor.click._blank' : 'anchor.click';
        if (!checkNavigationOrPopup(anchor.href, contextName)) {
          e.preventDefault();
          e.stopPropagation();
          reportBlocked(anchor.href, `Blocked popunder link click (${contextName})`);
          console.log('[Anti Pop-Under] Blocked click on popunder link:', anchor.href);
          return;
        }
      }
    }, false); // ALWAYS use bubbling phase (capture: false) so player receives events natively first
  }

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
      extensionEnabled = event.data.enabled;
      contentScriptReady = true;
      flushPendingReports();
    }
  });

  // Request current state from content.js
  window.postMessage({ type: 'ANTI_POPUP_REQUEST_STATE' }, '*');

  function isEnabled() {
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
  function reportBlocked(url, reason) {
    if (!isEnabled()) return;
    if (!contentScriptReady) {
      pendingReports.push({ url: url, reason: reason });
      console.log(`[Anti Pop-Under] Queued block report to "${url}". Reason: ${reason}`);
      return;
    }

    window.postMessage({
      type: 'ANTI_POPUP_BLOCKED_EVENT',
      url: url,
      reason: reason
    }, '*');
    console.log(`[Anti Pop-Under] Blocked popup to "${url}". Reason: ${reason}`);
  }

  function flushPendingReports() {
    while (pendingReports.length > 0) {
      const report = pendingReports.shift();
      window.postMessage({
        type: 'ANTI_POPUP_BLOCKED_EVENT',
        url: report.url,
        reason: report.reason
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
      if (isResumeOrPlaybackDialog(el)) return false;
      if (el.closest('form, nav, header, footer, dialog, [role="dialog"], [aria-modal="true"], [class*="login"], [class*="auth"], [class*="user"], [class*="account"], [class*="modal"], [class*="popup"], [class*="btn"], [class*="button"], [id*="login"], [id*="auth"], [id*="no-link"], [class*="no-link"], [class*="episode"], [id*="episode"], [class*="server"], [id*="server"], [class*="halim"], [class*="list-ep"], [class*="tap"], [id*="tap"], [class*="resume"], [class*="prompt"]')) {
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
      } else if (style.backgroundColor === 'transparent' || style.backgroundColor === 'rgba(0, 0, 0, 0)') {
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
    'sv388', 'vz99', 'loto188', 'k9win', 'fabet', 'oxbet', 'debet', 'may88', 'sc88',
    'rr88', 'go88', 'sunwin', 'hitclub', 'rikvip', 'b52', '789club', 'kuwin',
    'thabet', 'bk8', 'k8', 'j88', 'mb66', 'gk88', 'pg88', '88clb', 'cwin', 'win88',
    'lu88', 'vu88', 'man88', 'hbet', 'k88', 'tx88', 'taixiu', 'banca', 'game-bai',
    'qq88', 'xx88', 'bet789',
    'bom88', 'gem88', 'uk88', 'net88', 'vsbet', '6789x', 'adqc', 'musicskins', 'rikvipchinhhang', 'uk88chinhhang'
  ];

  const adUrlKeywords = [
    'adserver', 'popunder', 'greatcpmgate', 'highcpmgate', 'onclickads',
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

      // Inside any container that holds a <video> element (max 5 levels up)
      let p = el.parentElement;
      let depth = 0;
      while (p && p !== document.body && depth < 5) {
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
        if (curr.id === '__next' || isInternalNavigationLink(curr) || isResumeOrPlaybackDialog(curr)) {
          break; // Stop overlay check at Next.js root, internal link or resume dialog!
        }
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

      // If clicked on an overlay, safely hide it with CSS without breaking React / Next.js Virtual DOM
      if (overlay) {
        reportBlocked(url || 'blank', `Blocked ${context} via clickjack overlay`);
        try {
          overlay.style.setProperty('display', 'none', 'important');
          overlay.style.setProperty('visibility', 'hidden', 'important');
          overlay.style.setProperty('pointer-events', 'none', 'important');
        } catch (e) { }
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

    // Spec compliance: Nếu không có URL hoặc là about:blank, gọi originalOpen đúng spec
    if (!url || url === 'about:blank' || url === '') {
      return originalOpen.apply(this, arguments);
    }

    // Nếu thao tác phát sinh từ click link nội bộ Next.js hoặc vùng an toàn
    if (lastInteractionEvent && lastInteractionEvent.target) {
      if (isInternalNavigationLink(lastInteractionEvent.target) || isSafeCoreZone(lastInteractionEvent.target)) {
        if (!gamblingRegex.test(url) && !adUrlRegex.test(url)) {
          return originalOpen.apply(this, arguments);
        }
      }
    }

    // Cho phép same-origin window.open hợp lệ
    try {
      const targetUrl = new URL(url, window.location.href);
      const curHost = window.location.hostname.toLowerCase().replace(/^www\./i, '');
      const targetHost = targetUrl.hostname.toLowerCase().replace(/^www\./i, '');
      const isSameOrigin = targetHost === curHost || targetHost.endsWith('.' + curHost) || curHost.endsWith('.' + targetHost);
      if (isSameOrigin && !gamblingRegex.test(url) && !adUrlRegex.test(url)) {
        return originalOpen.apply(this, arguments);
      }
    } catch (e) {}

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
          writable: false,
          configurable: false
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
          writable: false,
          configurable: false
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

    // Hook Node DOM insertion methods to patch iframe contentWindow immediately upon append
    ['appendChild', 'insertBefore'].forEach(method => {
      try {
        const orig = Node.prototype[method];
        Node.prototype[method] = function () {
          try { sanitizeIframeNode(arguments[0]); } catch (e) { }
          let result;
          try {
            result = orig.apply(this, arguments);
          } catch (domErr) {
            // Page script called insertBefore/appendChild with an invalid reference node.
            // The page already didn't catch this — swallow silently so the stack trace
            // doesn't falsely point to inject.js. Behavior is identical (undefined return).
            return undefined;
          }
          try { patchIframeNode(arguments[0]); } catch (e) { }
          return result;
        };
      } catch (e) { }
    });

    ['append', 'insertAdjacentElement'].forEach(method => {
      try {
        const orig = Element.prototype[method];
        Element.prototype[method] = function () {
          try { sanitizeIframeNode(arguments[0]); } catch (e) { }
          let result;
          try { result = orig.apply(this, arguments); } catch (e) { return undefined; }
          try { patchIframeNode(arguments[0]); } catch (e) { }
          return result;
        };
      } catch (e) { }
    });

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

    // Fast interval check for iframe windows
    setInterval(() => {
      if (!isEnabled() || isYouTube || isCurrentPageWhitelisted()) return;
      try {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            if (window.frames[i]) overrideWindowOpen(window.frames[i]);
          } catch (e) { }
        }
      } catch (e) { }
    }, 1000);
  }

  // Bulletproof override of HTMLAnchorElement.prototype.click
  if (!isYouTube) {
    try {
      Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
        value: function () {
          if (!isEnabled() || isCurrentPageWhitelisted() || isInternalNavigationLink(this)) {
            return originalClick.apply(this, arguments);
          }

          const isTargetBlank = (this.getAttribute('target') || '').toLowerCase() === '_blank';
          if (!checkNavigationOrPopup(this.href, isTargetBlank ? 'anchor.click._blank' : 'anchor.click')) {
            return; // block
          }

          return originalClick.apply(this, arguments);
        },
        writable: false,
        configurable: false
      });
    } catch (err) {
      HTMLAnchorElement.prototype.click = function () {
        if (!isEnabled() || isCurrentPageWhitelisted() || isInternalNavigationLink(this)) {
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
        if (!isEnabled() || isCurrentPageWhitelisted()) {
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

            if (anchor && isInternalNavigationLink(anchor)) {
              return originalDispatchEvent.apply(this, arguments);
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
                try {
                  anchor.style.setProperty('display', 'none', 'important');
                  anchor.style.setProperty('pointer-events', 'none', 'important');
                } catch (e) { }
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
        writable: false,
        configurable: false
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
          reportBlocked(`https://www.youtube.com/watch?v=${videoId} (Quảng cáo Video)`, `Đã chặn ${adCount} quảng cáo video`);
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
              if (renderer || targetId.includes('ads') || targetId.includes('engagement-panel-ads')) {
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
        if (obj.messages) {
          delete obj.messages;
        }
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
        const targetSelectors = 'ytd-enforcement-message-view-model, ytd-enforcement-message-renderer, ytd-mealbar-promo-renderer, #feedback.ytd-enforcement-message-view-model';
        const targets = document.querySelectorAll(targetSelectors);
        let removed = false;

        targets.forEach(el => {
          const dialog = el.closest('tp-yt-paper-dialog, ytd-popup-container') || el;
          try {
            dialog.style.setProperty('display', 'none', 'important');
            dialog.style.setProperty('visibility', 'hidden', 'important');
            dialog.style.setProperty('pointer-events', 'none', 'important');
          } catch (e) {}
          removed = true;
        });

        // Suppress "Experiencing interruptions?" / "Bạn đang gặp sự cố khi phát video?" toasts
        const toasts = document.querySelectorAll('tp-yt-paper-toast, ytd-notification-action-renderer, yt-notification-action-renderer');
        toasts.forEach(toast => {
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
            removed = true;
          }
        });

        // Also check if YouTube disabled the player or added error screen
        const errorScreen = document.querySelector('#error-screen.ytd-watch-flexy');
        if (errorScreen && errorScreen.style.display !== 'none') {
          errorScreen.style.setProperty('display', 'none', 'important');
          removed = true;
        }

        if (removed) {
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

          const video = document.querySelector('video');
          if (video && video.paused) {
            video.play().catch(() => { });
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

    setInterval(scheduleClear, 2000);
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
    if (window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;

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
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            console.log('[Anti Pop-Under] Safely hidden anti-adblock overlay element:', el);

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
