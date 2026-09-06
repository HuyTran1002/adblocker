(function() {
  // Developed by HuyTran1002
  console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');


  // ================================================================
  // YOUTUBE AD ELIMINATOR v3.4.1 (AdGuard / uBlock Core Protocol)
  // Strategy: Intercept player configuration at API layer
  // (Response.prototype.json, targeted JSON.parse & Global window properties)
  // to prune ad metadata before player initialization.
  // Video player starts directly with main video without loading ad videos.
  // ================================================================
  (function() {
    if (!window.location.hostname.includes('youtube.com')) return;
    console.log('[Adblock Max] YouTube Deep Engine v3.4.1 (AdGuard Protocol) initialized.');

    // ===== LAYER 1: CSS - Instant Cosmetic Ad Elimination =====
    const adCSS = document.createElement('style');
    adCSS.textContent = `
      .ad-showing .video-ads,
      .ad-showing .ytp-ad-module,
      .ytp-ad-overlay-container,
      .ytp-ad-text-overlay,
      .ytp-ad-skip-button-container,
      .ytp-ad-player-overlay,
      .ytp-ad-action-interstitial,
      .ytp-ad-message-container,
      .ytp-ad-persistent-progress-bar-container,
      .ytp-ad-overlay-image,
      ytd-display-ad-renderer,
      ytd-promoted-sparkles-web-renderer,
      ytd-promoted-video-renderer,
      ytd-compact-promoted-video-renderer,
      ytd-banner-promo-renderer,
      ytd-statement-banner-renderer,
      ytd-in-feed-ad-layout-renderer,
      ytd-ad-slot-renderer,
      #player-ads,
      #masthead-ad,
      ytd-enforcement-message-view-model,
      tp-yt-iron-overlay-backdrop,
      tp-yt-paper-dialog:has(#dismiss-button) {
        display: none !important;
      }
      .ad-showing .ytp-ad-player-overlay-instream-info,
      .ad-showing .ytp-ad-simple-ad-badge,
      .ad-showing .ytp-ad-visit-advertiser-button {
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `;
    (document.head || document.documentElement).appendChild(adCSS);

    var lastYtReport = 0;
    function reportYtBlocked(reason) {
      if (window.top !== window.self) return;
      if (!window.location.href.includes('watch?v=') && !window.location.href.includes('shorts/')) return;
      var now = Date.now();
      if (now - lastYtReport > 10000) {
        lastYtReport = now;
        try {
          window.postMessage({
            type: 'ANTI_POPUP_BLOCKED_EVENT',
            url: 'YouTube Video Ad',
            reason: reason || 'Quảng cáo Video YouTube bị triệt tiêu từ gốc (AdGuard Core)'
          }, '*');
        } catch(e) {}
      }
    }

    // ===== LAYER 2: Targeted JSON Pruner (uBlock & AdGuard standard) =====
    const AD_KEYS = [
      'adPlacements', 'playerAds', 'adSlots',
      'adBreakHeartbeatParams', 'adSlotLoggingData',
      'instreamAdBreak', 'adBreakParams', 'adPlacementRenderer',
      'playerAdParams', 'adTagUrl', 'vmap'
    ];

    function pruneObject(obj, depth) {
      if (!obj || typeof obj !== 'object') return;
      if (!depth) depth = 0;
      if (depth > 8) return;

      for (var i = 0; i < AD_KEYS.length; i++) {
        var k = AD_KEYS[i];
        if (k in obj) {
          delete obj[k];
          reportYtBlocked('Quảng cáo Video YouTube (Metadata Pruned)');
        }
      }

      var keys = Object.keys(obj);
      for (var j = 0; j < keys.length; j++) {
        var val = obj[keys[j]];
        if (val && typeof val === 'object') {
          pruneObject(val, depth + 1);
        }
      }
    }

    function prunePlayerResponse(resp) {
      if (!resp) return resp;
      if (typeof resp === 'object') {
        pruneObject(resp, 0);
        return resp;
      }
      if (typeof resp === 'string') {
        try {
          var parsed = JSON.parse(resp);
          if (parsed && typeof parsed === 'object') {
            pruneObject(parsed, 0);
            return JSON.stringify(parsed);
          }
        } catch(e) {}
      }
      return resp;
    }

    // 1. Exact AdGuard / uBlock Proxy for window.fetch
    try {
      if (typeof window.fetch === 'function' && typeof Proxy !== 'undefined' && typeof Response !== 'undefined') {
        var isYtPlayerUrl = function(url) {
          if (typeof url !== 'string') return false;
          return url.includes('/youtubei/v1/player') || 
                 url.includes('/youtubei/v1/next') || 
                 url.includes('/playlist?list=') || 
                 url.includes('player?') || 
                 url.includes('watch?v=');
        };

        var forgeResponse = function(original, text) {
          var v = new Response(text, {
            status: original.status,
            statusText: original.statusText,
            headers: original.headers
          });
          return Object.defineProperties(v, {
            url: { value: original.url },
            type: { value: original.type },
            ok: { value: original.ok },
            bodyUsed: { value: original.bodyUsed },
            redirected: { value: original.redirected }
          }), v;
        };

        window.fetch = new Proxy(window.fetch, {
          apply: async function(target, thisArg, args) {
            var req = args[0];
            var url = typeof req === 'string' ? req : (req && req.url ? req.url : '');
            
            if (!isYtPlayerUrl(url)) {
              return Reflect.apply(target, thisArg, args);
            }

            var originalResponse;
            var clonedResponse;
            try {
              originalResponse = await Reflect.apply(target, thisArg, args);
              clonedResponse = originalResponse.clone();
            } catch(e) {
              return Reflect.apply(target, thisArg, args);
            }

            var json;
            try {
              json = await originalResponse.json();
            } catch(e) {
              return clonedResponse;
            }

            if (json && typeof json === 'object') {
              pruneObject(json, 0);
              try {
                var modifiedText = JSON.stringify(json);
                return forgeResponse(originalResponse, modifiedText);
              } catch(e) {
                return clonedResponse;
              }
            }

            return clonedResponse;
          }
        });
      }
    } catch(e) {}

    // 2. XMLHttpRequest Hook (for legacy or embedded YouTube player calls)
    try {
      if (typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest.prototype) {
        var _origXhrOpen = XMLHttpRequest.prototype.open;
        var _origXhrSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.open = function(method, url) {
          this._adblockUrl = typeof url === 'string' ? url : '';
          return _origXhrOpen.apply(this, arguments);
        };
        XMLHttpRequest.prototype.send = function() {
          if (this._adblockUrl && (this._adblockUrl.includes('/player') || this._adblockUrl.includes('/next'))) {
            this.addEventListener('readystatechange', function() {
              if (this.readyState === 4 && this.responseText) {
                try {
                  var data = JSON.parse(this.responseText);
                  if (data && typeof data === 'object') {
                    pruneObject(data, 0);
                    var modified = JSON.stringify(data);
                    Object.defineProperty(this, 'responseText', { value: modified, configurable: true });
                    Object.defineProperty(this, 'response', { value: modified, configurable: true });
                  }
                } catch(e) {}
              }
            }, true);
          }
          return _origXhrSend.apply(this, arguments);
        };
      }
    } catch(e) {}

    // 3. Hook Response.prototype.json (Fetch API intercept without replacing Response object)
    try {
      if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
        var _origResponseJson = Response.prototype.json;
        Response.prototype.json = function() {
          return _origResponseJson.apply(this, arguments).then(function(data) {
            if (data && typeof data === 'object') {
              if (data.adPlacements || data.playerAds || data.adSlots || (data.playerResponse && (data.playerResponse.adPlacements || data.playerResponse.playerAds))) {
                pruneObject(data, 0);
              }
            }
            return data;
          });
        };
      }
    } catch(e) {}

    // 4. Safe targeted JSON.parse hook (only prunes objects containing ad structures)
    try {
      var _origJsonParse = JSON.parse;
      JSON.parse = function(text, reviver) {
        var data = _origJsonParse.apply(this, arguments);
        if (data && typeof data === 'object') {
          if (data.adPlacements || data.playerAds || data.adSlots || (data.playerResponse && (data.playerResponse.adPlacements || data.playerResponse.playerAds))) {
            pruneObject(data, 0);
          }
        }
        return data;
      };
    } catch(e) {}

    // 5. Hook Global window player objects (Full page loads)
    function hookGlobal(prop) {
      var val = window[prop];
      if (val && typeof val === 'object') {
        pruneObject(val, 0);
      }
      try {
        Object.defineProperty(window, prop, {
          get: function() {
            if (val && typeof val === 'object') {
              pruneObject(val, 0);
            }
            return val;
          },
          set: function(newVal) {
            if (newVal && typeof newVal === 'object') {
              pruneObject(newVal, 0);
              if (newVal.config && newVal.config.args) {
                if (newVal.config.args.raw_player_response) {
                  newVal.config.args.raw_player_response = prunePlayerResponse(newVal.config.args.raw_player_response);
                }
                if (newVal.config.args.player_response) {
                  newVal.config.args.player_response = prunePlayerResponse(newVal.config.args.player_response);
                }
              }
            }
            val = newVal;
          },
          configurable: true,
          enumerable: true
        });
      } catch(e) {}
    }
    hookGlobal('ytInitialPlayerResponse');
    hookGlobal('ytInitialData');
    hookGlobal('ytplayer');

    // ===== LAYER 3: DOM Safety Net & Anti-Adblock Auto-Bypass =====
    var wasAdShowing = false;
    var userPlaybackRate = 1;
    var userMuted = false;

    function processYouTubeAd() {
      var player = document.querySelector('#movie_player');
      if (!player) return;

      var video = player.querySelector('video');
      var isAdShowing = player.classList.contains('ad-showing') || 
                        !!player.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, .ytp-ad-player-overlay, .ytp-ad-text');

      if (isAdShowing) {
        if (!wasAdShowing) {
          wasAdShowing = true;
          if (video) {
            if (video.playbackRate !== 16) {
              userPlaybackRate = video.playbackRate || 1;
            }
            userMuted = video.muted;
          }
        }
        
        // Instant speedup and skip fallback if ad is encountered
        if (video) {
          try {
            video.muted = true;
            if (isFinite(video.duration) && video.duration > 0) {
              video.currentTime = video.duration;
            } else {
              video.currentTime = 9999;
            }
            video.playbackRate = 16;
          } catch(e) {}
        }

        try {
          if (typeof player.skipAd === 'function') player.skipAd();
        } catch(e) {}

        var skipBtns = document.querySelectorAll(
          '.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button, ' +
          '.ytp-ad-skip-button-slot button, .ytp-ad-overlay-close-button, button.ytp-ad-skip-button-modern'
        );
        for (var i = 0; i < skipBtns.length; i++) {
          try {
            skipBtns[i].click();
            if (typeof simulateNativeClick === 'function') simulateNativeClick(skipBtns[i]);
          } catch(e) {}
        }

        reportYtBlocked('Quảng cáo Video YouTube');
      } else if (wasAdShowing) {
        wasAdShowing = false;
        if (video) {
          try {
            video.muted = userMuted;
            video.playbackRate = userPlaybackRate || 1;
            if (video.paused) video.play();
          } catch(e) {}
        }
      }

      // Auto-dismiss anti-adblock dialogs
      try {
        var dismissBtn = document.querySelector('tp-yt-paper-dialog #dismiss-button, ytd-popup-container #dismiss-button, ytd-enforcement-message-view-model button');
        if (dismissBtn) {
          dismissBtn.click();
          if (typeof simulateNativeClick === 'function') simulateNativeClick(dismissBtn);
          if (video && video.paused) video.play();
        }
        var backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop, ytd-enforcement-message-view-model');
        for (var b = 0; b < backdrops.length; b++) {
          backdrops[b].remove();
        }
      } catch(e) {}
    }

    setInterval(processYouTubeAd, 50);

    try {
      var obs = new MutationObserver(function() { processYouTubeAd(); });
      function startObserving() {
        var target = document.getElementById('movie_player') || document.body || document.documentElement;
        if (target) {
          obs.observe(target, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        }
      }
      if (document.body) startObserving();
      else document.addEventListener('DOMContentLoaded', startObserving);
    } catch(e) {}

    // Patch MediaSession to avoid NaN duration exceptions
    try {
      if (navigator && navigator.mediaSession && typeof navigator.mediaSession.setPositionState === 'function') {
        var _origSetPos = navigator.mediaSession.setPositionState;
        navigator.mediaSession.setPositionState = function(state) {
          try {
            if (state && typeof state.position === 'number' && typeof state.duration === 'number') {
              if (state.position > state.duration) state.position = state.duration;
              if (state.duration <= 0) return;
            }
            _origSetPos.call(this, state);
          } catch(e) {}
        };
      }
    } catch(e) {}

  })();

  // ================================================================
  // UNIVERSAL IN-VIDEO AD AUTO-SKIPPER & FLOATING "X" CLOSE BUTTON CLICKER
  // (uBlock & AdGuard Enhanced Strategy)
  // Auto-detects and auto-clicks "Skip Ad" / "Bỏ qua" / "X" close buttons
  // on all web video players and floating ad popups.
  // ================================================================
  (function() {
    function autoSkipAndCloseAds() {
      if (document.documentElement.getAttribute('data-anti-popunder-enabled') === 'false') return;
      // Do not run generic skip selectors on YouTube (YouTube has its own dedicated Zero-Wait module above)
      if (window.location.hostname.includes('youtube.com')) return;

      // 1. Click all "Skip Ad" / "Bỏ qua quảng cáo" buttons across web video players (JWPlayer, Video.js, Plyr, etc.)
      const skipSelectors = [
        '.vjs-skip', '.vjs-ad-skip', '.vjs-skip-button',
        '.jw-skip', '.jw-ad-skip', '.jw-skip-button',
        '[class*="skip-ad"]', '[class*="skip_ad"]', '[class*="ad-skip"]', '[id*="skip-ad"]', '[id*="skip_ad"]',
        'button[aria-label*="skip ad" i]', 'button[aria-label*="bỏ qua quảng cáo" i]',
        'div[aria-label*="skip ad" i]', 'div[aria-label*="bỏ qua quảng cáo" i]'
      ];

      for (var i = 0; i < skipSelectors.length; i++) {
        try {
          var btns = document.querySelectorAll(skipSelectors[i]);
          for (var j = 0; j < btns.length; j++) {
            var btn = btns[j];
            if (btn && !btn.disabled && !btn.hasAttribute('disabled') && btn.offsetParent !== null && !btn.hasAttribute('data-auto-clicked')) {
              btn.setAttribute('data-auto-clicked', 'true');
              try { btn.click(); } catch(e) {}
              if (typeof simulateNativeClick === 'function') simulateNativeClick(btn);
              console.log('[Anti Pop-Under] Auto-clicked video ad skip button:', btn);
            }
          }
        } catch(e) {}
      }

      // 2. Eradicate floating "X" / "Close" buttons & full-screen darkened backdrops without triggering fake click traps
      const closeSelectors = [
        '.vjs-ad-overlay .close', '.jw-ad-overlay .close', '.ad-overlay-close',
        '.btn-close-ad', '.close-ad', '#close-ad', '.ad_close_btn', '.ad-close-btn',
        '[class*="close-ad"]', '[class*="ad-close"]', '[id*="close-ad"]', '[id*="ad-close"]',
        'button[class*="bg-[#e50914]"]',
        'div[class*="fixed"][class*="inset-0"] button[aria-label="Đóng"]',
        'div[class*="fixed"][class*="inset-0"] button[aria-label*="đóng" i]',
        'div[class*="fixed"][class*="inset-0"] button[aria-label*="close" i]',
        '[class*="layoutWrapper"]', '[class*="root--wuzSh"]', '[qa-element="live-badge-plain-upper"]',
        '.sc-widget-icon', '[class*="model-name--"]'
      ];

      for (var k = 0; k < closeSelectors.length; k++) {
        try {
          var closeNodes = document.querySelectorAll(closeSelectors[k]);
          for (var m = 0; m < closeNodes.length; m++) {
            var node = closeNodes[m];
            if (node) {
              var btnText = (node.innerText || node.textContent || '').trim();
              var aria = (node.getAttribute('aria-label') || '').toLowerCase();
              var isAdBtn = (btnText === '✕' || btnText === '×' || btnText === 'X' || aria.includes('đóng') || aria.includes('close') || aria.includes('tắt') || node.classList.contains('close') || (typeof node.className === 'string' && node.className.includes('close')));
              
              var parentAd = node.closest('[class*="fixed"][class*="inset-0"], [class*="modal-backdrop"], [class*="ad-overlay"], [class*="layoutWrapper"], [class*="widget"]') || node;
              
              // NEVER touch elements containing movie posters or legitimate non-ad images
              var nonAdImg = parentAd.querySelector('img:not([src*="ad"]):not([src*="popunder"]):not([src*="quangcao"])');
              if (nonAdImg) continue;

              // Protect legitimate video players from being hidden
              if (parentAd && !parentAd.closest('.jwplayer, .plyr, .video-js, #movie_player, .artplayer, .dplayer') && !parentAd.querySelector('video:not([src*="ad"]), form, input, textarea, select')) {
                parentAd.style.setProperty('display', 'none', 'important');
                parentAd.style.setProperty('visibility', 'hidden', 'important');
                parentAd.style.setProperty('pointer-events', 'none', 'important');
                parentAd.style.setProperty('opacity', '0', 'important');
                parentAd.setAttribute('data-ad-blocked', 'true');
                try { parentAd.remove(); } catch(e) {}
                if (document.body) {
                  document.body.style.overflow = '';
                  document.body.style.position = '';
                }
                if (document.documentElement) {
                  document.documentElement.style.overflow = '';
                  document.documentElement.style.position = '';
                }
              }
            }
          }
        } catch(e) {}
      }

      // 3. Fast-forward pre-roll video ads on HTML5 players (non-YouTube)
      try {
        var videos = document.querySelectorAll('video');
        for (var vIdx = 0; vIdx < videos.length; vIdx++) {
          var v = videos[vIdx];
          if (!v) continue;
          var src = (v.src || '').toLowerCase();
          var parentClass = (v.parentElement ? v.parentElement.className : '').toLowerCase();
          
          var isAdVideo = ['adserver', 'popunder', 'vast', 'vpaid', 'preroll', 'midroll'].some(function(kw) { return src.indexOf(kw) !== -1; }) ||
                          parentClass.indexOf('vjs-ad-playing') !== -1 || parentClass.indexOf('jw-flag-ads') !== -1;
                       
          if (isAdVideo && v.duration && !isNaN(v.duration) && v.duration > 0 && v.currentTime < v.duration) {
            v.muted = true;
            v.playbackRate = 16;
            v.currentTime = Math.max(0, v.duration - 0.1);
            console.log('[Anti Pop-Under] Fast-forwarded pre-roll video ad:', v);
          }
        }
      } catch(e) {}
    }

    // Run auto-skipper periodically
    setInterval(autoSkipAndCloseAds, 250);
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
      const tagName = el.tagName.toLowerCase();
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object'].includes(tagName)) return true;
      if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, .artplayer, .dplayer, [class*="player"], [id*="player"], [class*="video"], [id*="video"], [class*="control"], [id*="control"], [class*="time"], [id*="time"], [class*="progress"], [id*="progress"], [class*="slider"], [id*="slider"]')) return true;
      if (el.closest('div, section') && el.closest('div, section').querySelector('video')) return true;

      if (el.closest('a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [tabindex], [onclick], [data-action], [contenteditable], #no-link, [id*="no-link"], [class*="episode"], [id*="episode"], [class*="server"], [id*="server"], [class*="halim-"], [class*="halim_"]')) return true;
      const style = window.getComputedStyle(el);
      if (style && style.cursor && style.cursor.toLowerCase().includes('pointer')) return true;
      const ariaAttrs = ['aria-haspopup','aria-pressed','aria-expanded','aria-label','aria-controls'];
      for (let a of ariaAttrs) { if (el.hasAttribute && el.hasAttribute(a)) return true; }
      if (el.getAttribute && el.getAttribute('role')) {
        const r = (el.getAttribute('role') || '').toLowerCase();
        if (r === 'button' || r === 'link' || r === 'tab' || r === 'option') return true;
      }
    } catch (err) {}
    return false;
  }

  function blockScriptedRedirects(e) {
    if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;

    const target = e.target;
    if (!target) return;

    // Allow clicks on interactive elements
    if (isInteractiveElement(target)) return;

    // Respect modifier keys
    if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;

    // Heuristic: allow clicks on elements with substantial text
    try {
      const textLen = (target.innerText || '').trim().length;
      if (textLen > 30) return;
    } catch (err) {}

    // If the user clicked the actual page background (body/html), block navigations
    const isBodyClick = (target === document.body || target === document.documentElement || target === document);
    if (isBodyClick) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      reportBlocked(window.location.href, 'Blocked scripted redirect on page background click');
      console.log('[Anti Pop-Under] Blocked scripted redirect from background click', target);
    }
  }
  
  function isSeekBarOrControlButton(el) {
    if (!el) return false;
    try {
      const tag = el.tagName ? el.tagName.toLowerCase() : '';
      if (['button', 'input', 'select', 'a'].includes(tag)) return true;
      if (el.getAttribute && (el.getAttribute('role') === 'button' || el.getAttribute('role') === 'slider')) return true;

      const elId = (el.id || '').toLowerCase();
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      // Explicit seekbar, progress bar, volume, fullscreen, setting buttons only (do not include generic 'control')
      const keywords = ['seekbar', 'slider', 'progress', 'timeline', 'volume', 'fullscreen', 'setting', 'vjs-control-bar', 'jw-controlbar', 'plyr__controls', 'vjs-play-control', 'jw-icon-play'];
      if (keywords.some(kw => elId.includes(kw) || elClass.includes(kw))) return true;
    } catch(e) {}
    return false;
  }

  function toggleVideoPlayPause(target) {
    if (!target) return;
    try {
      let video = null;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'video') {
        video = target;
      } else {
        // Search within clicked element
        if (target.querySelector) video = target.querySelector('video');
        // Search in nearest player container ancestor
        if (!video && target.closest) {
          const container = target.closest(
            '.jwplayer, .plyr, .video-js, .artplayer, .dplayer, .vjs-, .flowplayer,' +
            '[class*="player"], [id*="player"], [class*="video"], [id*="video"],' +
            '[class*="embed"], [id*="embed"], [class*="halim"], [id*="halim"]'
          );
          if (container) video = container.querySelector('video');
        }
        // Walk up max 3 levels to find a sibling or nearby video
        if (!video && target.parentElement) {
          let p = target.parentElement;
          let depth = 0;
          while (p && p !== document.body && depth < 3) {
            const found = p.querySelector('video');
            if (found) { video = found; break; }
            p = p.parentElement;
            depth++;
          }
        }
        // Safe fallback: if there is only exactly ONE video on the page, play it!
        if (!video) {
          const allVideos = document.querySelectorAll('video');
          if (allVideos.length === 1) {
            video = allVideos[0];
          }
        }
      }

      if (video) {
        if (video.paused) {
          const p = video.play();
          if (p && p.catch) p.catch(() => {});
        } else {
          video.pause();
        }
      }
    } catch(e) {}
  }

  if (!isYouTube) {
    const handleUserInteraction = (e) => {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;
      
      if (!isEnabled() || isCurrentPageWhitelisted()) return;
      const target = e.target;
      if (!target) return;

      // 1. Find if the clicked element or any of its ancestors is an anchor tag or a clickjack overlay
      let curr = target;
      let anchor = null;
      let overlay = null;

      while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
        if (curr.tagName && curr.tagName.toLowerCase() === 'a') {
          anchor = curr;
        }
        if (isClickjackOverlay(curr)) {
          overlay = curr;
        }
        curr = curr.parentElement;
      }

      // 2. If interaction is on a clickjack overlay -> block popunder immediately & remove overlay
      if (overlay) {
        if (anchor) {
          try {
            const href = anchor.getAttribute('href') || '';
            if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.trim() === '') {
              return; // Allow clicks on episode/no-link anchors without external href
            }
            const targetHost = new URL(href, window.location.href).hostname.toLowerCase();
            const isExternal = targetHost && targetHost !== window.location.hostname.toLowerCase();
            if (!isExternal || isWhitelisted(href)) {
              return;
            }
          } catch (err) {
            return;
          }
        }

        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const adUrl = (anchor && anchor.href) || 'overlay';
        reportBlocked(adUrl, `Blocked ${e.type} on clickjack overlay`);
        console.log(`[Anti Pop-Under] Blocked ${e.type} on clickjack overlay & removed overlay:`, overlay);
        
        try {
          overlay.remove();
        } catch (err) {}

        // After clearing the ad overlay, try to resume play/pause naturally
        if (e.type === 'click') {
          toggleVideoPlayPause(target);
        }
        return;
      }

      // 3. Check anchor link clicks pointing to popunder/ad URLs
      if (e.type === 'click' && anchor && anchor.href) {
        const isTargetBlank = (anchor.getAttribute('target') || '').toLowerCase() === '_blank';
        const contextName = isTargetBlank ? 'anchor.click._blank' : 'anchor.click';
        if (!checkNavigationOrPopup(anchor.href, contextName)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          reportBlocked(anchor.href, `Blocked popunder link click (${contextName})`);
          console.log('[Anti Pop-Under] Blocked click on popunder link:', anchor.href);
          
          if (isPlayerOrPlayButton(anchor)) {
             console.log('[Anti Pop-Under] Anchor was on video player. Removing anchor and resuming video...');
             try { anchor.remove(); } catch(e) {}
             
             let isInternal = false;
             try {
                const targetHost = new URL(anchor.href, window.location.href).hostname.toLowerCase();
                isInternal = targetHost === window.location.hostname.toLowerCase();
             } catch(e) {}
             
             if (isInternal && !gamblingRegex.test(anchor.href) && !adUrlRegex.test(anchor.href)) {
                 console.log('[Anti Pop-Under] Redirecting current tab to internal player link:', anchor.href);
                 window.location.assign(anchor.href);
                 return;
             }
             
             toggleVideoPlayPause(target);
          }
          return;
        }
      }

      // 3. Fallback check for background click or non-interactive redirect
      if (e.type === 'click') {
        blockScriptedRedirects(e);
      }
    };

    interactionEvents.forEach(eventName => {
      window.addEventListener(eventName, handleUserInteraction, true);
    });
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
    if (!el || el === document || el === document.body || el === document.documentElement) return false;
    try {
      if (isPlayerOrPlayButton(el)) return false;

      const tagName = el.tagName ? el.tagName.toLowerCase() : '';
      if (['button', 'input', 'select', 'textarea', 'form'].includes(tagName)) return false;
      if (el.getAttribute && el.getAttribute('role') === 'button') return false;

      const elId = (el.id || '').toLowerCase();
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (elId.includes('no-link') || elId.includes('episode') || elId.includes('server') || elId.includes('tap') || elId.includes('film') || elId.includes('movie') ||
          elClass.includes('episode') || elClass.includes('server') || elClass.includes('halim') || elClass.includes('list-ep') || elClass.includes('tap') || elClass.includes('film') || elClass.includes('movie')) {
        return false;
      }

      // If it contains legitimate input controls, forms, or non-ad movie images, skip
      if (el.querySelector('video, audio, embed, object, input, select, textarea, form')) {
        return false;
      }

      // Protect all elements containing legitimate movie images
      const img = el.querySelector ? el.querySelector('img') : null;
      if (img) {
        const src = (img.src || '').toLowerCase();
        if (!src.includes('ad') && !src.includes('popunder') && !src.includes('quangcao') && !src.includes('banner')) {
          return false;
        }
      }

      // Check text length: clickjack overlays never have substantial readable content
      const text = (el.innerText || el.textContent || '').trim();
      if (text.length > 50) return false;

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
      
      const hasBackdropFilter = style.backdropFilter && style.backdropFilter !== 'none';
      const isTransparent = opacity < 0.95 || bgAlpha < 0.95 || hasBackdropFilter;
      const zIndex = parseInt(style.zIndex, 10);
      const isHighZ = !isNaN(zIndex) && zIndex >= 10;
      const isFullScreen = (width >= vw * 0.7 && height >= vh * 0.7) || (style.top === '0px' && style.left === '0px' && (style.width === '100%' || style.width === '100vw')) || elClass.includes('inset-0');
      const isLargeArea = (width >= 200 && height >= 200) || isFullScreen;

      // Check if it's an anchor tag: ONLY external links or ad redirect links can be clickjack overlays!
      if (tagName === 'a') {
        const href = el.getAttribute('href') || '';
        if (!href || href.startsWith('javascript:') || href.startsWith('#') || href.trim() === '') {
          return false;
        }
        try {
          const targetHost = new URL(href, window.location.href).hostname.toLowerCase();
          const currentHost = window.location.hostname.toLowerCase();
          const isExternal = targetHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost);
          if (!isExternal) {
            return false; // Same-domain movie links are NEVER clickjack overlays
          }
          if (isPositioned && (isHighZ || isFullScreen) && isTransparent) {
            return true;
          }
        } catch(e) {
          return false;
        }
      }

      // Check if it contains an explicit ad close button
      if (isPositioned && (isHighZ || isFullScreen) && el.querySelector('button[class*="bg-[#e50914]"]')) {
        return true;
      }

      if (isPositioned && (isHighZ || isFullScreen) && isTransparent && isLargeArea) {
        return true;
      }

      return false;
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
    'macau', 'lasvegas', 'bbin', '\\bag\\b', '\\bmg\\b', '\\bpt\\b', '\\bpg\\b', 'cq9', 'jdb', 'vr',
    '\\bbg\\b', '\\bky\\b', 'lebo', '\\bog\\b', 'ebet', 'allbet', 'kaiyuan', 'sbobet', '\\bsbo\\b',
    'cmd368', '\\bim\\b', '\\btf\\b', 'crown', 'shengli', 'bet365', 'vwin', 'dafabet', '12bet',
    'wbet', 'bty', 'bovada', 'roulette', 'baccarat', 'poker', 'blackjack', 'jackpot'
  ];

  const adUrlKeywords = [
    'adserver', 'popunder', 'greatcpmgate', 'highcpmgate', 'onclickads', 
    'clktag', 'exoclick', 'eclick', 'novanet', 'adsterra', 'popads', 'popcash',
    'cpmrate', 'cpmnetwork', 'cpmgate', 'profitablecpm', 'profitablecpmratenetwork',
    'hilltopads', 'galaksion', 'monetag', 'admaven', 'clickadu', 'richads', 'propush',
    'popmyads', 'adtrue', 'adflex', 'syndication', 'doubleclick', 'googlesyndication',
    'googleadservices', 'ad-delivery', 'adservice', 'astrology', 'backlight', 'inless',
    'zoneid=', 'pubid=', 'subid=', 'placement=', 'direct_link',
    'playhubconnect', 'cm8806', 'linkroyal', 'abroadad', 'streamvl', 'xiazai', 'pan666',
    'jads.co', '9splt', 'yuelongyy', 'juicyads', 'getjuicy', 'vast.xml', 'vpaid', '/vast/', 'vast_tag', 'vastxml', 'adxml',
    '/static/video/bn/', 'bdstatic', 'cpro', '51.la', 'cnzz', 'umeng', 'pstatp', 'tanx', 'alimama',
    'openinstall', 'appinstall', '/apk/', 'download.html', 'from=ad', 'spm=', '/ad/', '/ads/',
    '/cpm/', '/cpv/', '/cps/', '/pop/', '/aff/', '/track/', 'click.php', 'go.php', 'out.php', 'jump.php', 'redirect.php',
    'stripchat', 'stripchats', 'chaturbate', 'livejasmin', 'bongacams', 'cam4', 'camsoda',
    'smartpop', 'smartpopbucketid', 'modelid=', 'modelname=', 'magsrv', 'tsyndicate', 'etahub',
    'trafficjunky', 'trafficstars', 'ero-advertising', 'plugrush', 'twinred', 'adxad', 'clickaine', 'adxporn', 'mayzaent', 'doppiocdn', 'videoslider', 'smartpopbucketid', 'mastersmartpopid', 'stripcash'
  ];

  function safeEscapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const gamblingRegex = new RegExp(gamblingKeywords.map(k => k.startsWith('\\b') ? k : safeEscapeRegex(k)).join('|'), 'i');
  const adUrlRegex = new RegExp(adUrlKeywords.map(safeEscapeRegex).join('|'), 'i');

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
    try {
      const tagName = el.tagName.toLowerCase();
      // Direct media / embed elements
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object'].includes(tagName)) return true;

      // Named player container classes (all major players)
      if (el.closest(
        '.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, .artplayer, .dplayer,' +
        '[class*="player"], [id*="player"],' +
        '[class*="video"], [id*="video"],' +
        '[class*="embed"], [id*="embed"],' +
        '[class*="stream"], [id*="stream"],' +
        '[class*="halim"], [id*="halim"],' +
        '[class*="film"], [id*="film"],' +
        '[class*="xem"], [id*="xem"]'
      )) return true;

      // Inside any container that holds a <video> element (max 3 levels up)
      let p = el.parentElement;
      let depth = 0;
      while (p && p !== document.body && depth < 3) {
        if (p.querySelector && p.querySelector('video')) return true;
        p = p.parentElement;
        depth++;
      }
    } catch (e) {}
    return false;
  }

  function checkNavigationOrPopup(url, context) {
    if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return true;

    const isFormSubmit = context === 'form.submit';
    const isAnchorClick = context.startsWith('anchor.');
    const isLocationChange = context === 'location change';
    const isWindowOpen = context === 'window.open';

    let isBlank = !url || url.startsWith('javascript:') || url.trim() === '' || url === 'about:blank' || url.startsWith('#');
    let isExternal = false;
    let targetHost = '';
    
    if (!isBlank) {
      try {
        targetHost = new URL(url, window.location.href).hostname.toLowerCase();
        const currentHost = window.location.hostname.toLowerCase();
        isExternal = targetHost && targetHost !== currentHost && !targetHost.endsWith('.' + currentHost) && !currentHost.endsWith('.' + targetHost);
      } catch(e) {
        isBlank = true;
      }
    }

    // 1. If it explicitly matches ad/gambling/adult/smartpop keywords, block it 100%
    if (url && (gamblingRegex.test(url) || adUrlRegex.test(url) || url.includes('smartpop') || (url.includes('ab=') && url.includes('rl=')))) {
      reportBlocked(url, `Blocked ad/popunder URL in ${context}`);
      return false;
    }

    // 2. Block external form submissions unless whitelisted
    if (isFormSubmit && isExternal && !isWhitelisted(url)) {
      reportBlocked(url || 'external_form', `Blocked external form submit popup in ${context}`);
      return false;
    }

    // 3. Block external location redirects (window.location / replace / assign)
    if (isLocationChange && isExternal && !isWhitelisted(url)) {
      reportBlocked(url || 'external_redirect', `Blocked unrequested external location redirect (${context})`);
      return false;
    }

    // 4. Block external window.open or target="_blank" popups
    if ((isWindowOpen || context.includes('_blank')) && (isBlank || (isExternal && !isWhitelisted(url)))) {
      reportBlocked(url || 'blank', `Blocked non-whitelisted external/blank popup in ${context}`);
      return false;
    }

    // 5. Block programmatic external anchor clicks or dispatches
    if (isAnchorClick && isExternal && !isWhitelisted(url)) {
      reportBlocked(url || 'external_anchor', `Blocked programmatic external anchor popup in ${context}`);
      return false;
    }

    // 6. If window.open is opening duplicate current page or relative ad redirect
    if (isWindowOpen && !isBlank && !isExternal) {
      try {
        const path = new URL(url, window.location.href).pathname.toLowerCase();
        const curPath = window.location.pathname.toLowerCase();
        const isDuplicatePage = (url === window.location.href || path === curPath) && context === 'window.open';
        const isAdPath = adUrlRegex.test(url) || ['/click', '/out', '/go', '/redirect', '/pop', '/cpm', '/jump'].some(kw => path.includes(kw));

        if (isDuplicatePage || isAdPath) {
          reportBlocked(url, `Blocked same-domain ad/duplicate window.open in ${context}`);
          return false;
        }
      } catch (e) {}
    }

    // 7. If no recent user interaction, block all programmatic window.open or external popup actions
    const timeSinceLastInteraction = Date.now() - lastInteractionTime;
    const isRecentInteraction = timeSinceLastInteraction < 1000;
    if (!isRecentInteraction && (isWindowOpen || isExternal)) {
      reportBlocked(url || 'blank', `Blocked programmatic ${context} without user interaction`);
      return false;
    }

    // 8. Detailed checks for overlays or player clicks
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
             const tHost = new URL(href, window.location.href).hostname.toLowerCase();
             const cHost = window.location.hostname.toLowerCase();
             const isExt = tHost && tHost !== cHost && !tHost.endsWith('.' + cHost);
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
                 if (!hasVisibleMedia) {
                   isHiddenExternalLink = true;
                   break;
                 }
               }
             }
           } catch(e) {}
        }
        
        curr = curr.parentElement;
      }

      if (overlay) {
        reportBlocked(url || 'blank', `Blocked ${context} via clickjack overlay`);
        try { overlay.remove(); } catch(e) {}
        return false;
      }
      if (isHiddenExternalLink) {
        reportBlocked(url || 'blank', `Blocked ${context} via invisible external link wrapper`);
        return false;
      }

      const isPlayerClick = isPlayerOrPlayButton(clickedEl);
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
    } catch (e) {}
    return false;
  }

  // The custom window.open logic
  function customOpen(url, target, features) {
    if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) {
      return originalOpen.apply(this, arguments);
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
      let _closed = false;
      const dummyWindow = new Proxy({}, {
        get(targetProp, prop) {
          if (prop === 'closed') return _closed;
          if (prop === 'focus' || prop === 'blur' || prop === 'postMessage') return () => {};
          if (prop === 'close') return () => { _closed = true; };
          if (prop === 'location') return new Proxy({ href: '' }, { get(t, p) { return t[p] || ''; }, set() { return true; } });
          if (prop === 'document') return new Proxy({ readyState: 'complete' }, { get(t, p) { if (p === 'readyState') return t[p]; return () => {}; } });
          if (prop === 'window' || prop === 'top' || prop === 'self' || prop === 'parent') return dummyWindow;
          return undefined;
        },
        set() { return true; }
      });
      return dummyWindow;
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
      } catch (err) {}
    }

    try {
      if (win.Window && win.Window.prototype && win.Window.prototype.open !== customOpen) {
        Object.defineProperty(win.Window.prototype, 'open', {
          value: customOpen,
          writable: false,
          configurable: false
        });
      }
    } catch (e) {}
  }

  if (!isYouTube) {
    // Override top-level window, self, top, parent, globalThis, and Window.prototype
    overrideWindowOpen(window);
    overrideWindowOpen(window.self);
    overrideWindowOpen(window.top);
    overrideWindowOpen(window.parent);
    if (typeof globalThis !== 'undefined') overrideWindowOpen(globalThis);
    if (typeof Window !== 'undefined' && Window.prototype) overrideWindowOpen(Window.prototype);

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
            } catch(e) {}
          });
        }
      } catch(e) {}
    }

    // Hook Document.prototype.createElement to catch newly created iframes immediately
    try {
      const origCreateElement = Document.prototype.createElement;
      Document.prototype.createElement = function(tagName, options) {
        const el = origCreateElement.call(this, tagName, options);
        if (el && typeof tagName === 'string' && tagName.toLowerCase() === 'iframe') {
          try {
            const hookIframe = () => {
              patchIframeNode(el);
            };
            el.addEventListener('load', hookIframe);
            setTimeout(hookIframe, 0);
          } catch(e) {}
        }
        return el;
      };
    } catch(e) {}

    // Hook Node DOM insertion methods to patch iframe contentWindow immediately upon append
    ['appendChild', 'insertBefore'].forEach(method => {
      try {
        const orig = Node.prototype[method];
        Node.prototype[method] = function() {
          let result;
          try {
            result = orig.apply(this, arguments);
          } catch(domErr) {
            // Page script called insertBefore/appendChild with an invalid reference node.
            // The page already didn't catch this — swallow silently so the stack trace
            // doesn't falsely point to inject.js. Behavior is identical (undefined return).
            return undefined;
          }
          try { patchIframeNode(arguments[0]); } catch(e) {}
          return result;
        };
      } catch(e) {}
    });

    ['append', 'insertAdjacentElement'].forEach(method => {
      try {
        const orig = Element.prototype[method];
        Element.prototype[method] = function() {
          let result;
          try { result = orig.apply(this, arguments); } catch(e) { return undefined; }
          try { patchIframeNode(arguments[0]); } catch(e) {}
          return result;
        };
      } catch(e) {}
    });

    // Hook HTMLIFrameElement prototype to intercept and override window.open inside dynamically created iframes
    try {
      const cwDescriptor = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
      if (cwDescriptor && cwDescriptor.get) {
        Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
          get: function() {
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
          get: function() {
            const doc = cdDescriptor.get.apply(this);
            if (doc && doc.defaultView) {
              overrideWindowOpen(doc.defaultView);
            }
            return doc;
          },
          configurable: true
        });
      }
    } catch (err) {
      console.warn('[Anti Pop-Under] Iframe prototyping hooks failed:', err);
    }

    // Fast interval check for iframe windows
    setInterval(() => {
      if (!isEnabled() || isYouTube || isCurrentPageWhitelisted()) return;
      try {
        for (let i = 0; i < window.frames.length; i++) {
          try {
            if (window.frames[i]) overrideWindowOpen(window.frames[i]);
          } catch(e) {}
        }
      } catch(e) {}
    }, 1000);
  }

  // Bulletproof override of HTMLAnchorElement.prototype.click & EventTarget.prototype.dispatchEvent
  if (!isYouTube) {
    try {
      Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
        value: function() {
          if (!isEnabled() || isCurrentPageWhitelisted()) {
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
      console.warn('[Anti Pop-Under] Non-writable anchor click failed:', err);
      HTMLAnchorElement.prototype.click = function() {
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

    // Intercept synthetic/programmatic event dispatches on <a> links to prevent ad redirects
    try {
      const origDispatch = EventTarget.prototype.dispatchEvent;
      EventTarget.prototype.dispatchEvent = function(event) {
        if (event && (event.type === 'click' || event.type === 'mouseup' || event.type === 'pointerup')) {
          if (this instanceof HTMLAnchorElement || (this.tagName && this.tagName.toLowerCase() === 'a')) {
            const href = this.href || this.getAttribute('href') || '';
            const isBlank = (this.getAttribute('target') || '').toLowerCase() === '_blank';
            if (!checkNavigationOrPopup(href, isBlank ? 'anchor.dispatchEvent._blank' : 'anchor.dispatchEvent')) {
              if (event.preventDefault) event.preventDefault();
              if (event.stopPropagation) event.stopPropagation();
              if (event.stopImmediatePropagation) event.stopImmediatePropagation();
              return false;
            }
          }
        }
        return origDispatch.apply(this, arguments);
      };
    } catch(e) {}

    // Global Main World capture-phase click interceptor
    window.addEventListener('click', function(e) {
      if (!isEnabled() || isYouTube || isCurrentPageWhitelisted()) return;
      try {
        const target = e.target;
        if (!target) return;

        // Block clicks on any ad widgets, blocked containers, or fake close buttons
        const blockedContainer = target.closest && target.closest('[data-ad-blocked="true"], [class*="layoutWrapper"], [class*="sc-widget"], [class*="root--wuzSh"], [qa-element="live-badge-plain-upper"]');
        if (blockedContainer) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          try { blockedContainer.remove(); } catch(err) {}
          reportBlocked('ad_widget', 'Blocked click on ad widget container');
          return;
        }

        let anchor = null;
        let curr = target;
        while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
          if (curr.hasAttribute && (curr.hasAttribute('data-ad-blocked') || curr.getAttribute('data-ad-blocked') === 'true')) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try { curr.remove(); } catch(err) {}
            reportBlocked('ad_container', 'Blocked click on blocked ad container');
            return;
          }
          if (isClickjackOverlay(curr)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            try { curr.remove(); } catch(err) {}
            reportBlocked('overlay', 'Blocked clickjack overlay in capture phase');
            return;
          }
          if (curr.tagName === 'A' || curr instanceof HTMLAnchorElement) {
            anchor = curr;
            break;
          }
          curr = curr.parentElement;
        }

        if (anchor) {
          const href = anchor.href || anchor.getAttribute('href') || '';
          if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
            const isBlank = (anchor.getAttribute('target') || '').toLowerCase() === '_blank';
            if (!checkNavigationOrPopup(href, isBlank ? 'anchor.click._blank' : 'anchor.click')) {
              e.preventDefault();
              e.stopPropagation();
              e.stopImmediatePropagation();
              try { anchor.closest('[class*="layoutWrapper"], [class*="widget"], [class*="ad"]')?.remove(); } catch(err) {}
              reportBlocked(href, 'Blocked external popunder/ad anchor click');
              return;
            }
          }
        }
      } catch(err) {}
    }, true);
  }

  // Bulletproof override of HTMLFormElement.prototype.submit
  const originalSubmit = HTMLFormElement.prototype.submit;
  if (!isYouTube) {
    try {
      Object.defineProperty(HTMLFormElement.prototype, 'submit', {
        value: function() {
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
      HTMLFormElement.prototype.submit = function() {
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

  // YouTube Ad Skipper handled by v2.8.0
  function runYouTubeAdSkipper() {}

  // Bulletproof override of Location.prototype navigation to prevent scripted location changes
  if (!isYouTube) {
    try {
      const locationProto = Location.prototype;
      const originalAssign = locationProto.assign;
      const originalReplace = locationProto.replace;
      const hrefDescriptor = Object.getOwnPropertyDescriptor(locationProto, 'href');
      
      function checkLocationRedirect(url) {
        return checkNavigationOrPopup(url, 'location change');
      }
      
      if (hrefDescriptor && hrefDescriptor.set) {
        Object.defineProperty(locationProto, 'href', {
          get: hrefDescriptor.get,
          set: function(val) {
            if (checkLocationRedirect(val)) {
              hrefDescriptor.set.call(this, val);
            }
          },
          configurable: true
        });
      }
      
      locationProto.assign = function(val) {
        if (checkLocationRedirect(val)) {
          originalAssign.call(this, val);
        }
      };
      
      locationProto.replace = function(val) {
        if (checkLocationRedirect(val)) {
          originalReplace.call(this, val);
        }
      };
    } catch (e) {
      console.warn('[Anti Pop-Under] Location overrides failed:', e);
    }
  }

  function runGenericAntiAdblockBypass() {
    if (window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;

    function cleanOverlays() {
      if (!isEnabled()) return;
      try {
        const divs = document.querySelectorAll('div, section, dialog');
        divs.forEach(el => {
          if (el.offsetWidth === 0 && el.offsetHeight === 0) return;
          
          const text = (el.innerText || '').toLowerCase();
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
            const style = window.getComputedStyle(el);
            const isOverlay = style.position === 'fixed' || style.position === 'absolute' || el.tagName.toLowerCase() === 'dialog';
            
            if (isOverlay) {
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
          }
        });
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in generic anti-adblock watchdog:', e);
      }
    }

    function scanAndRemoveClickjacks() {
      if (!isEnabled()) return;
      try {
        const anchors = document.querySelectorAll('a');
        anchors.forEach(el => {
          if (isClickjackOverlay(el)) {
            console.log('[Anti Pop-Under] Auto-removed clickjack overlay before click:', el);
            el.remove();
          }
        });
      } catch (e) {}
    }

    let throttleTimer = null;
    function scheduleBypassScan() {
      if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;
      if (throttleTimer) return;
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (!isEnabled()) return;
        cleanOverlays();
        scanAndRemoveClickjacks();
      }, 150);
    }

    try {
      const observer = new MutationObserver(() => {
        scheduleBypassScan();
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {}

    // Fallback scan every 3 seconds for silent background changes
    setInterval(() => {
      if (isEnabled() && !window.location.hostname.includes('youtube.com') && !isCurrentPageWhitelisted()) {
        cleanOverlays();
        scanAndRemoveClickjacks();
      }
    }, 50);

    // Initial scan
    scheduleBypassScan();
  }

  runGenericAntiAdblockBypass();
})();
