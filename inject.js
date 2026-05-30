(function() {
  // Developed by HuyTran1002
  console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');

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

  function getYouTubeBlockedEventKey(obj) {
    const host = window.location.hostname;
    let id = 'unknown';
    try {
      if (obj && typeof obj === 'object') {
        if (obj.playerResponse && obj.playerResponse.videoDetails && obj.playerResponse.videoDetails.videoId) {
          id = obj.playerResponse.videoDetails.videoId;
        } else if (obj.videoDetails && obj.videoDetails.videoId) {
          id = obj.videoDetails.videoId;
        } else if (obj.videoId) {
          id = obj.videoId;
        }
      }
    } catch (e) {}
    return `${host}|payload|${id}`;
  }

  // YouTube Player Response Interceptor to completely prevent ads from existing
  function cleanPlayerResponse(obj) {
    if (!isEnabled()) return obj;
    if (!obj || typeof obj !== 'object') return obj;
    let stripped = false;
    try {
      if (obj.adPlacements && obj.adPlacements.length > 0) {
        obj.adPlacements = [];
        stripped = true;
      }
      if (obj.playerAds && obj.playerAds.length > 0) {
        obj.playerAds = [];
        stripped = true;
      }
      if (obj.adSlots && obj.adSlots.length > 0) {
        obj.adSlots = [];
        stripped = true;
      }
      if (obj.adSignals && Object.keys(obj.adSignals).length > 0) {
        obj.adSignals = {};
        stripped = true;
      }

      // Check and clean nested playerResponse
      if (obj.playerResponse && typeof obj.playerResponse === 'object') {
        const pr = obj.playerResponse;
        if (pr.adPlacements && pr.adPlacements.length > 0) { pr.adPlacements = []; stripped = true; }
        if (pr.playerAds && pr.playerAds.length > 0) { pr.playerAds = []; stripped = true; }
        if (pr.adSlots && pr.adSlots.length > 0) { pr.adSlots = []; stripped = true; }
        if (pr.adSignals && Object.keys(pr.adSignals).length > 0) { pr.adSignals = {}; stripped = true; }
      }

      if (stripped) {
        console.log('[Anti Pop-Under] Cleaned ads from player response data.');
        try {
          const eventKey = getYouTubeBlockedEventKey(obj);
          if (shouldReportBlockedEvent(eventKey)) {
            reportBlocked('YouTube Video Ad', 'Ngăn chặn quảng cáo YouTube xuất hiện');
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('[Anti Pop-Under] Error cleaning player response:', e);
    }
    return obj;
  }

  function cleanInitialData(obj) {
    if (!isEnabled()) return obj;
    if (!obj || typeof obj !== 'object') return obj;
    try {
      if (obj.adPlacements) obj.adPlacements = [];
      if (obj.playerAds) obj.playerAds = [];
      if (obj.playerResponse && typeof obj.playerResponse === 'object') {
        const pr = obj.playerResponse;
        if (pr.adPlacements) pr.adPlacements = [];
        if (pr.playerAds) pr.playerAds = [];
      }
    } catch(e) {}
    return obj;
  }

  // 1. Hook JSON.parse to catch all parsed config strings and fetch payloads dynamically
  const originalParse = JSON.parse;
  JSON.parse = function(text, reviver) {
    const obj = originalParse(text, reviver);
    if (!isEnabled()) return obj;
    try {
      if (obj && typeof obj === 'object') {
        let stripped = false;
        
        // Clean player response
        if (obj.adPlacements && obj.adPlacements.length > 0) { obj.adPlacements = []; stripped = true; }
        if (obj.playerAds && obj.playerAds.length > 0) { obj.playerAds = []; stripped = true; }
        if (obj.adSlots && obj.adSlots.length > 0) { obj.adSlots = []; stripped = true; }
        if (obj.adSignals && Object.keys(obj.adSignals).length > 0) { obj.adSignals = {}; stripped = true; }

        // Clean playerResponse wrapper
        if (obj.playerResponse && typeof obj.playerResponse === 'object') {
          const pr = obj.playerResponse;
          if (pr.adPlacements && pr.adPlacements.length > 0) { pr.adPlacements = []; stripped = true; }
          if (pr.playerAds && pr.playerAds.length > 0) { pr.playerAds = []; stripped = true; }
          if (pr.adSlots && pr.adSlots.length > 0) { pr.adSlots = []; stripped = true; }
          if (pr.adSignals && Object.keys(pr.adSignals).length > 0) { pr.adSignals = {}; stripped = true; }
        }

        // Clean inner player response strings in ytplayer configs
        if (obj.config && obj.config.args && typeof obj.config.args === 'object') {
          const args = obj.config.args;
          if (args.player_response && typeof args.player_response === 'string') {
            try {
              let pr = originalParse(args.player_response);
              if (pr && typeof pr === 'object') {
                if (pr.adPlacements && pr.adPlacements.length > 0) pr.adPlacements = [];
                if (pr.playerAds && pr.playerAds.length > 0) pr.playerAds = [];
                if (pr.adSlots && pr.adSlots.length > 0) pr.adSlots = [];
                if (pr.adSignals && Object.keys(pr.adSignals).length > 0) pr.adSignals = {};
                args.player_response = JSON.stringify(pr);
                stripped = true;
              }
            } catch(e) {}
          }
        }

        if (stripped) {
          console.log('[Anti Pop-Under] Stripped ads via JSON.parse hook');
          try {
            const eventKey = getYouTubeBlockedEventKey(obj);
            if (shouldReportBlockedEvent(eventKey)) {
              reportBlocked('YouTube Video Ad', 'Ngăn chặn quảng cáo YouTube xuất hiện');
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('[Anti Pop-Under] Error in JSON.parse hook:', e);
    }
    return obj;
  };

  // Hook Object.defineProperty to intercept ytInitialPlayerResponse, ytInitialData, and ytplayer
  const originalDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    if (obj === window && (prop === 'ytInitialPlayerResponse' || prop === 'ytInitialData' || prop === 'ytplayer')) {
      try {
        if (descriptor) {
          if ('value' in descriptor) {
            if (prop === 'ytInitialPlayerResponse') {
              initialPlayerResponse = cleanPlayerResponse(descriptor.value);
            } else if (prop === 'ytInitialData') {
              initialData = cleanInitialData(descriptor.value);
            } else if (prop === 'ytplayer') {
              ytplayer = descriptor.value;
              if (ytplayer) interceptYtplayerConfig(ytplayer);
            }
            return obj; // Return window to mimic success and keep our getter/setter intact
          }
        }
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in Object.defineProperty hook:', e);
      }
    }
    return originalDefineProperty.apply(this, arguments);
  };

  const originalDefineProperties = Object.defineProperties;
  Object.defineProperties = function(obj, props) {
    if (obj === window && props) {
      try {
        let intercepted = false;
        if (props.ytInitialPlayerResponse && 'value' in props.ytInitialPlayerResponse) {
          initialPlayerResponse = cleanPlayerResponse(props.ytInitialPlayerResponse.value);
          intercepted = true;
        }
        if (props.ytInitialData && 'value' in props.ytInitialData) {
          initialData = cleanInitialData(props.ytInitialData.value);
          intercepted = true;
        }
        if (props.ytplayer && 'value' in props.ytplayer) {
          ytplayer = props.ytplayer.value;
          if (ytplayer) interceptYtplayerConfig(ytplayer);
          intercepted = true;
        }
        if (intercepted) {
          const remainingProps = {};
          for (const key in props) {
            if (key !== 'ytInitialPlayerResponse' && key !== 'ytInitialData' && key !== 'ytplayer') {
              remainingProps[key] = props[key];
            }
          }
          if (Object.keys(remainingProps).length > 0) {
            originalDefineProperties.call(this, obj, remainingProps);
          }
          return obj;
        }
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in Object.defineProperties hook:', e);
      }
    }
    return originalDefineProperties.apply(this, arguments);
  };

  // 2. Intercept ytInitialPlayerResponse variable defined in page HTML script tags
  try {
    if (window.ytInitialPlayerResponse) {
      initialPlayerResponse = cleanPlayerResponse(window.ytInitialPlayerResponse);
    }
    Object.defineProperty(window, 'ytInitialPlayerResponse', {
      get: function() { return initialPlayerResponse; },
      set: function(val) { initialPlayerResponse = cleanPlayerResponse(val); },
      configurable: true
    });
  } catch (err) {
    console.warn('[Anti Pop-Under] Failed to define window.ytInitialPlayerResponse:', err);
  }

  // 3. Intercept window.ytInitialData (home/search layout ads)
  try {
    if (window.ytInitialData) {
      initialData = cleanInitialData(window.ytInitialData);
    }
    Object.defineProperty(window, 'ytInitialData', {
      get: function() { return initialData; },
      set: function(val) { initialData = cleanInitialData(val); },
      configurable: true
    });
  } catch (e) {}

  // 4. Intercept window.ytplayer config structures (used in initial page loads)
  try {
    if (window.ytplayer) {
      ytplayer = window.ytplayer;
      interceptYtplayerConfig(ytplayer);
    }
    Object.defineProperty(window, 'ytplayer', {
      get: function() { return ytplayer; },
      set: function(val) {
        ytplayer = val;
        if (ytplayer) {
          interceptYtplayerConfig(ytplayer);
        }
      },
      configurable: true
    });
  } catch (err) {
    console.warn('[Anti Pop-Under] Failed to define window.ytplayer:', err);
  }

  function interceptYtplayerConfig(ytplayerObj) {
    if (!ytplayerObj || typeof ytplayerObj !== 'object') return;
    
    let config = ytplayerObj.config;
    let bootstrapPlayerResponse = ytplayerObj.bootstrapPlayerResponse;
    
    if (config) cleanConfig(config);
    if (bootstrapPlayerResponse) {
      bootstrapPlayerResponse = cleanPlayerResponse(bootstrapPlayerResponse);
    }
    
    try {
      Object.defineProperty(ytplayerObj, 'config', {
        get: function() { return config; },
        set: function(val) {
          config = val;
          if (config) cleanConfig(config);
        },
        configurable: true
      });
    } catch (e) {}

    try {
      Object.defineProperty(ytplayerObj, 'bootstrapPlayerResponse', {
        get: function() { return bootstrapPlayerResponse; },
        set: function(val) {
          bootstrapPlayerResponse = cleanPlayerResponse(val);
        },
        configurable: true
      });
    } catch (e) {}
  }

  function cleanConfig(config) {
    if (!config || typeof config !== 'object') return;
    try {
      if (config.args && config.args.player_response) {
        let resp = config.args.player_response;
        if (typeof resp === 'string') {
          let data = JSON.parse(resp);
          data = cleanPlayerResponse(data);
          config.args.player_response = JSON.stringify(data);
        } else if (typeof resp === 'object') {
          config.args.player_response = cleanPlayerResponse(resp);
        }
      }
      if (config.playerResponse) {
        config.playerResponse = cleanPlayerResponse(config.playerResponse);
      }
    } catch (e) {
      console.warn('[Anti Pop-Under] Error cleaning playerResponse in config:', e);
    }
  }

  // 3. Intercept fetch calls for SPA page transitions (/youtubei/v1/player)
  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let url = args[0];
    if (typeof Request !== 'undefined' && url instanceof Request) {
      url = url.url;
    } else if (typeof URL !== 'undefined' && url instanceof URL) {
      url = url.href;
    }
    
    const isPlayerRequest = typeof url === 'string' && url.includes('/youtubei/v1/player');
    
    if (isPlayerRequest && isEnabled()) {
      let originalResponse = null;
      try {
        originalResponse = await originalFetch.apply(this, args);
        let data = await originalResponse.json();
        data = cleanPlayerResponse(data);
        
        return new Response(JSON.stringify(data), {
          status: originalResponse.status,
          statusText: originalResponse.statusText,
          headers: originalResponse.headers
        });
      } catch (err) {
        console.warn('[Anti Pop-Under] Fetch intercept error:', err);
        if (originalResponse) {
          return originalResponse;
        }
        throw err;
      }
    }
    return originalFetch.apply(this, args);
  };

  // 4. Intercept XMLHttpRequest for fallback SPA page transitions
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._url = typeof url === 'string' ? url : (typeof URL !== 'undefined' && url instanceof URL ? url.href : '');
    return originalXHROpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function(...args) {
    if (this._url && this._url.includes('/youtubei/v1/player') && isEnabled()) {
      const xhr = this;
      const originalCallback = xhr.onreadystatechange;
      xhr.onreadystatechange = function(...stateArgs) {
        if (xhr.readyState === 4 && xhr.status === 200) {
          try {
            let data = null;
            if (xhr.responseType === 'json') {
              data = xhr.response;
            } else if (!xhr.responseType || xhr.responseType === 'text') {
              data = JSON.parse(xhr.responseText);
            }
            
            if (data) {
              data = cleanPlayerResponse(data);
              
              try {
                Object.defineProperty(xhr, 'response', { value: data, writable: true, configurable: true });
              } catch (e) {
                try { xhr.response = data; } catch (err) {}
              }
              
              if (!xhr.responseType || xhr.responseType === 'text') {
                const responseString = JSON.stringify(data);
                try {
                  Object.defineProperty(xhr, 'responseText', { value: responseString, writable: true, configurable: true });
                } catch (e) {
                  try { xhr.responseText = responseString; } catch (err) {}
                }
              }
            }
          } catch (e) {
            console.warn('[Anti Pop-Under] XHR intercept error:', e);
          }
        }
        if (originalCallback) {
          return originalCallback.apply(this, stateArgs);
        }
      };
    }
    return originalXHRSend.apply(this, args);
  };

  // Store original methods
  const originalOpen = window.open;
  const originalClick = HTMLAnchorElement.prototype.click;
  
  // Track last interaction and intercept background clicks
  const interactionEvents = ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchend'];
  
  function isInteractiveElement(el) {
    if (!el) return false;
    try {
      const tagName = el.tagName.toLowerCase();
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object'].includes(tagName)) return true;
      if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, [class*="player-"], [id*="player-"], [class*="video-"], [id*="video-"]')) return true;
      if (el.closest('div, section') && el.closest('div, section').querySelector('video')) return true;

      if (el.closest('a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [tabindex], [onclick], [data-action], [contenteditable]')) return true;
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
  
  interactionEvents.forEach(eventName => {
    window.addEventListener(eventName, (e) => {
      lastInteractionTime = Date.now();
      lastInteractionEvent = e;
      
      if (eventName === 'click') {
        if (!isEnabled()) return;
        const target = e.target;
        if (!target || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;

        // Find if the clicked element or any of its ancestors is an anchor tag or a clickjack overlay
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

        // 1. If click is on a clickjack overlay
        if (overlay) {
          // If the overlay has a link, only block if it's external and not whitelisted
          if (anchor) {
            try {
              const targetHost = new URL(anchor.href, window.location.href).hostname.toLowerCase();
              const isExternal = targetHost && targetHost !== window.location.hostname.toLowerCase();
              if (isExternal && !isWhitelisted(anchor.href)) {
                // External redirect, block it!
              } else {
                // Internal or whitelisted link, allow it to pass normally!
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
          reportBlocked(adUrl, 'Blocked click on clickjack overlay');
          console.log('[Anti Pop-Under] Blocked click on clickjack overlay:', overlay);
          
          try {
            overlay.remove();
          } catch (err) {}
          return;
        }

        // 2. Fallback check for background click or non-interactive redirect
        blockScriptedRedirects(e);
      }
    }, true); // Use capturing phase to get it before other scripts
  });

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
    
    const tagName = el.tagName.toLowerCase();
    if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object', 'svg', 'path', 'i', 'img'].includes(tagName)) {
      return false;
    }

    if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, [class*="player-"], [id*="player-"], [class*="video-"], [id*="video-"]')) {
      if (tagName !== 'a') {
        return false;
      }
    }

    // Check if the element is inside a player structure or near a video/iframe element
    try {
      const playerContainer = el.closest('div, section');
      if (playerContainer && (playerContainer.querySelector('video') || playerContainer.querySelector('iframe'))) {
        if (tagName !== 'a' || el.querySelector('svg, img, i') || el.closest('[class*="icon"], [class*="btn"], [class*="control"], [class*="play"], [class*="player"]')) {
          return false;
        }
      }
    } catch(e) {}

    // Check if the element itself contains graphic icons or has control class names
    try {
      if (el.querySelector('svg, img, i, canvas') || 
          el.closest('[class*="icon"], [class*="btn"], [class*="control"], [class*="play"], [class*="player"], [class*="fullscreen"]') ||
          (el.className && typeof el.className === 'string' && (el.className.includes('btn') || el.className.includes('control') || el.className.includes('play')))) {
        return false;
      }
    } catch (e) {}

    try {
      if (el.querySelector('video, audio, canvas, iframe, embed, object')) {
        return false;
      }

      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      
      const width = rect.width;
      const height = rect.height;
      
      const isPositioned = (style.position === 'absolute' || style.position === 'fixed');
      if (!isPositioned) return false;
      
      const opacity = parseFloat(style.opacity);
      const isTransparent = opacity < 0.25 || 
                          style.backgroundColor === 'transparent' || 
                          style.backgroundColor.includes('rgba(0, 0, 0, 0)') ||
                          style.backgroundColor.includes('rgba(255, 255, 255, 0)');
      if (!isTransparent) return false;
      
      const textLen = (el.innerText || '').trim().length;
      const isNoText = textLen < 50;
      if (!isNoText) return false;

      // Relax size requirement to detect small/medium overlays placed on play buttons
      const isOverlaySize = (width > 80 && height > 30);
      return isOverlaySize;
    } catch (e) {
      return false;
    }
  }

  const gamblingKeywords = [
    'bet', 'casino', 'gamebai', 'nhacai', 'w88', 'fun88', 'fb88', 'm88', 
    '188bet', 'kubet', 'shbet', '789bet', 'jun88', 'f8bet', 'new88', 'hi88', 
    'okvip', '1xbit', '1xbet', 'vi88', 'fi88', 'ee88', 'lixi88', 'mu88',
    'loto', 'quayhu', 'slot', 'nha-cai', 'soicau', 'keonhacai', 'bong88',
    'sv388', 'vz99', 'loto188', 'k9win', 'fabet', 'oxbet', 'debet', 'may88'
  ];

  const adUrlKeywords = [
    'adserver', 'click', 'zone', 'banner', 'popup', 'popunder', 'redirect',
    'greatcpmgate', 'highcpmgate', 'onclick', 'clktag', 'exoclick', 'eclick', 'novanet'
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
    try {
      const tagName = el.tagName.toLowerCase();
      // Check direct player elements
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object'].includes(tagName)) return true;
      // Check common player container classes
      if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, [class*="player-"], [id*="player-"], [class*="video-"], [id*="video-"]')) return true;
      // Check if it is inside a video container or near a video element
      if (el.closest('div, section') && el.closest('div, section').querySelector('video')) return true;
      
      // Traverse up to find any element matching play button keywords
      let curr = el;
      while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
        const id = (curr.id || '').toLowerCase();
        const className = (curr.className || '').toLowerCase();
        const text = (curr.innerText || '').toLowerCase();
        
        // Match id/class/text names containing play/player/video/film/xem
        if (id.includes('play') || className.includes('play') || text.includes('play') ||
            id.includes('player') || className.includes('player') ||
            id.includes('video') || className.includes('video') ||
            id.includes('film') || className.includes('film') ||
            id.includes('xem') || className.includes('xem')) {
          return true;
        }
        curr = curr.parentElement;
      }
    } catch (e) {}
    return false;
  }

  function checkNavigationOrPopup(url, context) {
    if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return true;

    // Check if the URL is external and not whitelisted
    let isExternal = false;
    let isBlank = !url || url.startsWith('javascript:') || url.trim() === '' || url === 'about:blank';
    let targetHost = '';
    
    if (!isBlank) {
      try {
        targetHost = new URL(url, window.location.href).hostname.toLowerCase();
        isExternal = targetHost && targetHost !== window.location.hostname.toLowerCase();
      } catch(e) {
        isBlank = true;
      }
    }

    // 1. If it matches ad or gambling keywords, block it 100%
    if (url && (gamblingRegex.test(url) || adUrlRegex.test(url))) {
      reportBlocked(url, `Blocked ad/gambling URL in ${context}`);
      return false;
    }

    const timeSinceLastInteraction = Date.now() - lastInteractionTime;
    const isRecentInteraction = timeSinceLastInteraction < 1000;

    // 2. If no recent user interaction, block all external/blank navigations/popups
    if (!isRecentInteraction) {
      if (isExternal || isBlank) {
        reportBlocked(url || 'blank', `Blocked programmatic ${context} with no user interaction`);
        return false;
      }
    }

    // 3. If there is a recent user interaction, check the clicked element
    if (lastInteractionEvent && lastInteractionEvent.target) {
      const clickedEl = lastInteractionEvent.target;
      
      // Traverse up to find if there's an overlay
      let curr = clickedEl;
      let overlay = null;
      while (curr && curr !== document && curr !== document.body && curr !== document.documentElement) {
        if (isClickjackOverlay(curr)) {
          overlay = curr;
          break;
        }
        curr = curr.parentElement;
      }

      // If clicked on an overlay, block all external/blank popups/redirects
      if (overlay) {
        reportBlocked(url || 'blank', `Blocked ${context} via clickjack overlay`);
        try { overlay.remove(); } catch(e) {}
        return false;
      }

      // Check if clicked element is background, non-interactive, or a player/play button
      const isBackgroundClick = (clickedEl === document.body || clickedEl === document.documentElement || clickedEl === document);
      const isPlayerClick = isPlayerOrPlayButton(clickedEl);
      
      if (isBackgroundClick || !isInteractiveElement(clickedEl) || isPlayerClick) {
        if (isExternal || isBlank) {
          if (!isWhitelisted(url)) {
            reportBlocked(url || 'blank', `Blocked ${context} on background/player/non-interactive click`);
            return false;
          }
        }
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

    if (!checkNavigationOrPopup(url, 'window.open')) {
      return null;
    }

    return originalOpen.apply(this, arguments);
  }

  // Helper to override open on any window object (e.g. top-level or iframe window)
  function overrideWindowOpen(win) {
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
  }

  // Override top-level window.open
  overrideWindowOpen(window);

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

  // Bulletproof override of HTMLAnchorElement.prototype.click
  try {
    Object.defineProperty(HTMLAnchorElement.prototype, 'click', {
      value: function() {
        if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) {
          return originalClick.apply(this, arguments);
        }
        
        if (!checkNavigationOrPopup(this.href, 'anchor.click')) {
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
      if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) {
        return originalClick.apply(this, arguments);
      }
      
      if (!checkNavigationOrPopup(this.href, 'anchor.click')) {
        return; // block
      }
      
      return originalClick.apply(this, arguments);
    };
  }

  // Bulletproof override of HTMLFormElement.prototype.submit
  const originalSubmit = HTMLFormElement.prototype.submit;
  try {
    Object.defineProperty(HTMLFormElement.prototype, 'submit', {
      value: function() {
        if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) {
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
      if (!isEnabled() || window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) {
        return originalSubmit.apply(this, arguments);
      }
      const action = this.getAttribute('action') || '';
      if (!checkNavigationOrPopup(action, 'form.submit')) {
        return; // block
      }
      return originalSubmit.apply(this, arguments);
    };
  }

  // YouTube Ad Skipper (Main World) - Optimized Lightweight Fallback
  function runYouTubeAdSkipper() {
    if (!window.location.hostname.includes('youtube.com')) return;

    console.log('[Anti Pop-Under] Optimized YouTube Ad Skipper (Main World) initialized!');

    const skipButtons = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot',
      '.ytp-ad-skip-button-text',
      '.ytp-ad-skip-button-container'
    ];

    let lastSeekedSrc = '';
    let lastAdDuration = 0;
    let wasMutedByUs = false;
    let originalMutedState = false;
    let wasPlaybackRateChangedByUs = false;
    let originalPlaybackRate = 1;

    let cachedPlayer = null;
    let cachedVideo = null;

    function getPlayerAndVideo() {
      if (!cachedPlayer || !cachedPlayer.isConnected) {
        cachedPlayer = document.getElementById('movie_player') || document.querySelector('.html5-video-player');
      }
      if (!cachedVideo || !cachedVideo.isConnected) {
        cachedVideo = document.querySelector('.html5-main-video') || document.querySelector('video');
      }
      return { player: cachedPlayer, video: cachedVideo };
    }

    function simulateClick(el) {
      if (!el) return;
      try {
        el.click();
      } catch (e) {}
      try {
        const events = ['mousedown', 'mouseup', 'click'];
        events.forEach(eventName => {
          const ev = new MouseEvent(eventName, {
            bubbles: true,
            cancelable: true,
            view: window
          });
          el.dispatchEvent(ev);
        });
      } catch (e) {}
    }

    function skipAd() {
      if (!isEnabled()) return;
      try {
        const { player, video } = getPlayerAndVideo();
        const adShowing = player && (player.classList.contains('ad-showing') || player.classList.contains('ad-interrupting'));

        if (adShowing && video) {
          const currentTime = video.currentTime;
          const duration = video.duration;

          // 1. Mute ad immediately
          if (!video.muted) {
            originalMutedState = false;
            video.muted = true;
            wasMutedByUs = true;
          }

          // 2. Try to skip via player API immediately
          if (player && typeof player.skipAd === 'function') {
            try {
              player.skipAd();
            } catch (e) {
              console.warn('[Anti Pop-Under] player.skipAd() failed:', e);
            }
          }

          // 3. Click any visible skip buttons (best-effort)
          skipButtons.forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) {
              simulateClick(btn);
            }
          });

          // 4. If ad is paused, try to play it so the player proceeds (best-effort)
          if (video.paused) {
            video.play().catch(e => {});
          }

          // 5. Force seek the ad to the end when possible to prevent long unskippable ads (only once per ad source URL)
          if (video.duration && isFinite(video.duration) && lastSeekedSrc !== video.src) {
            try {
              lastSeekedSrc = video.src || 'ad-src';
              const targetTime = Math.max(0, video.duration - 0.1);
              if (player && typeof player.seekTo === 'function') {
                player.seekTo(targetTime, true);
              } else {
                video.currentTime = targetTime;
              }
            } catch (e) {
              console.warn('[Anti Pop-Under] Forced ad skip failed:', e);
            }
          }

          // Report block count for YouTube ad (only once per ad video source change)
          if (!isNaN(duration) && duration > 0 && lastAdDuration !== duration) {
            lastAdDuration = duration;
            const reportKey = `${window.location.hostname}|skip|${video.src || lastSeekedSrc || duration}`;
            if (shouldReportBlockedEvent(reportKey)) {
              reportBlocked('YouTube Video Ad', 'Bỏ qua quảng cáo video YouTube');
            }
          }
        } else if (video && !adShowing) {
          // Restore volume if we muted it
          if (wasMutedByUs) {
            try { video.muted = originalMutedState; } catch (e) {}
            wasMutedByUs = false;
          }
          // Playback rate restoration not needed (we avoid changing it now)
          // Reset the seek tracker when ads are not showing anymore
          lastSeekedSrc = '';
          lastAdDuration = 0;
        }
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in skipAd:', e);
      }
    }

    // Run skip check every 150ms - extremely fast and light (using isConnected to avoid DOM queries)
    setInterval(skipAd, 150);
  }

  // Bulletproof override of Location.prototype navigation to prevent scripted location changes
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

  runYouTubeAdSkipper();
})();
