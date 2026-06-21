(function() {
  // Developed by HuyTran1002
  console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');

  // Anti-Anti-Adblock bypass logic for movie sites (like animevietsub)
  (function() {
    if (window.location.hostname.includes('youtube.com')) return;

    const falsyProps = [
      'adblock', 'adBlock', 'hasAdblock', 'hasAdBlock', 'adblocker', 'adBlocker', 
      'isAdblock', 'isAdBlock', 'adBlockDetected', 'adblockDetected', 'adBlockEnabled', 'adblockEnabled'
    ];
    falsyProps.forEach(prop => {
      try {
        Object.defineProperty(window, prop, {
          get() { return false; },
          set(val) { /* ignore */ },
          configurable: true
        });
      } catch(e) {}
    });

    const mockGlobals = {
      adsbygoogle: [],
      google_ad_client: 'ca-pub-mock',
      google_ad_slot: '1234567890',
      google_ad_width: 728,
      google_ad_height: 90,
      google_analytics: { getTracker: () => ({ _trackPageview: () => {} }) },
      ga: function() { if (arguments[0] && typeof arguments[arguments.length - 1] === 'function') { try { arguments[arguments.length - 1](); } catch(e){} } },
      gaClassic: {},
      _gaq: { push: function(arr) { if (arr && arr[0] === '_setCallback' && typeof arr[1] === 'function') { try { arr[1](); } catch(e){} } } }
    };
    
    Object.keys(mockGlobals).forEach(key => {
      try {
        if (!(key in window)) {
          window[key] = mockGlobals[key];
        }
      } catch(e) {}
    });

    function isAdUrl(urlStr) {
      if (!urlStr) return false;
      try {
        const lower = String(urlStr).toLowerCase();
        const keywords = [
          'doubleclick', 'googlesyndication', 'googleadservices', 'adsterra', 'popads', 
          'popcash', 'propellerads', 'exoclick', 'clktag', 'onclickads', 'exdynsrv', 
          'juicyads', 'mgid.com', 'taboola', 'outbrain', 'adnxs', 'onclickalgo', 
          'highperformancegate', 'highcpmgate', 'greatcpmgate', 'eclick.vn', 'novanet.vn'
        ];
        return keywords.some(kw => lower.includes(kw));
      } catch(e) {
        return false;
      }
    }

    try {
      const srcDescriptor = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, 'src');
      if (srcDescriptor && srcDescriptor.set) {
        Object.defineProperty(HTMLScriptElement.prototype, 'src', {
          get: srcDescriptor.get,
          set: function(val) {
            if (typeof val === 'string' && isAdUrl(val)) {
              console.log('[Anti Pop-Under] Intercepted and mocked script src:', val);
              srcDescriptor.set.call(this, 'data:text/javascript;base64,console.log("Mocked ad script");');
              return;
            }
            srcDescriptor.set.call(this, val);
          },
          configurable: true,
          enumerable: true
        });
      }
    } catch(e) {}

    try {
      const originalSetAttribute = Element.prototype.setAttribute;
      Element.prototype.setAttribute = function(name, value) {
        if (this.tagName && this.tagName.toLowerCase() === 'script' && name.toLowerCase() === 'src') {
          if (typeof value === 'string' && isAdUrl(value)) {
            console.log('[Anti Pop-Under] Intercepted script setAttribute(src):', value);
            originalSetAttribute.call(this, name, 'data:text/javascript;base64,console.log("Mocked ad script");');
            return;
          }
        }
        originalSetAttribute.call(this, name, value);
      };
    } catch(e) {}

    function isAdBait(el) {
      if (!el || !el.tagName) return false;
      try {
        const id = (el.id || '').toLowerCase();
        const className = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
        const name = (el.getAttribute && el.getAttribute('name') || '').toLowerCase();
        
        const keywords = ['adsbox', 'ad-placement', 'quangcao', 'quang-cao', 'ad-box', 'ad_box', 'ads-box', 'sponsored', 'ad-holder', 'qc-holder', 'ad-container'];
        if (keywords.some(kw => id.includes(kw) || className.includes(kw) || name.includes(kw))) {
          return true;
        }
        if (id === 'ad' || id === 'ads' || className === 'ad' || className === 'ads') {
          return true;
        }
      } catch(e) {}
      return false;
    }

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
    } catch(e) {}

    try {
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
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
            toJSON: () => {}
          };
        }
        return rect;
      };
    } catch(e) {}

    try {
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function(el, pseudoElt) {
        const style = originalGetComputedStyle.call(this, el, pseudoElt);
        if (el && isAdBait(el)) {
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
                return function(propertyName) {
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
        return style;
      };
    } catch(e) {}
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
  const isYouTube = window.location.hostname.includes('youtube.com');
  
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
  
  if (!isYouTube) {
    interactionEvents.forEach(eventName => {
      window.addEventListener(eventName, (e) => {
        lastInteractionTime = Date.now();
        lastInteractionEvent = e;
        
        if (eventName === 'click') {
          if (!isEnabled()) return;
          const target = e.target;
          if (!target || isCurrentPageWhitelisted()) return;

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

    // 2. Block all blank popups or non-whitelisted external redirects immediately
    if (isBlank || (isExternal && !isWhitelisted(url))) {
      reportBlocked(url || 'blank', `Blocked non-whitelisted external/blank redirect in ${context}`);
      return false;
    }

    const timeSinceLastInteraction = Date.now() - lastInteractionTime;
    const isRecentInteraction = timeSinceLastInteraction < 1000;

    // 3. If no recent user interaction, block all programmatic actions
    if (!isRecentInteraction) {
      reportBlocked(url || 'blank', `Blocked programmatic ${context} with no user interaction`);
      return false;
    }

    // 4. Detailed checks for overlays or player clicks
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

      // If clicked on an overlay, block it
      if (overlay) {
        reportBlocked(url || 'blank', `Blocked ${context} via clickjack overlay`);
        try { overlay.remove(); } catch(e) {}
        return false;
      }

      const isBackgroundClick = (clickedEl === document.body || clickedEl === document.documentElement || clickedEl === document);
      const isPlayerClick = isPlayerOrPlayButton(clickedEl);
      
      // A play button/player click should NEVER open a new tab/window (window.open) or trigger _blank link redirects
      if (isPlayerClick && (context === 'window.open' || context.includes('_blank'))) {
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

    if (!checkNavigationOrPopup(url, 'window.open')) {
      // Return a dummy window proxy to prevent script crashes on calling methods/properties
      const dummyWindow = new Proxy({}, {
        get(targetProp, prop) {
          if (prop === 'focus') return () => {};
          if (prop === 'blur') return () => {};
          if (prop === 'close') return () => {};
          return dummyWindow;
        }
      });
      return dummyWindow;
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

  if (!isYouTube) {
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
  }

  // Bulletproof override of HTMLAnchorElement.prototype.click
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

  // YouTube Ad Skipper (Main World) - Advanced Network Interceptor and Backup Skipper
  function runYouTubeAdSkipper() {
    if (!window.location.hostname.includes('youtube.com')) return;

    console.log('[Anti Pop-Under] Advanced YouTube Ad Skipper (Main World) initialized!');

    // ytInitialPlayerResponse, JSON, fetch, and XHR interceptors have been completely removed.
    // Modifying YouTube API payloads corrupts the internal state machine, causing permanent black screens.
    // Instead, we rely purely on the stealth 16x video fast-forward skipper, which cannot cause black screens.

    // sendBeacon interceptor removed to prevent anti-tamper detection.



    // --- Mute and fast-forward fallback logic ---
    const skipButtons = [
      '.ytp-ad-skip-button',
      '.ytp-ad-skip-button-modern',
      '.ytp-skip-ad-button',
      '.ytp-ad-skip-button-slot',
      '.ytp-ad-skip-button-text',
      '.ytp-ad-skip-button-container'
    ];

    let userPlaybackRate = 1;
    let wasMutedByUs = false;
    let originalMutedState = false;
    let lastAdDuration = 0;

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
          const duration = video.duration;

          // 1. Mute ad immediately
          if (!video.muted) {
            originalMutedState = false;
            video.muted = true;
            wasMutedByUs = true;
          }

          // 2. Accelerate playback speed to 16x (max speed allowed by HTML5 Video)
          if (video.playbackRate !== 16) {
            userPlaybackRate = video.playbackRate || 1;
            video.playbackRate = 16;
          }

          // 3. Try to skip via player API immediately
          if (player && typeof player.skipAd === 'function') {
            try {
              player.skipAd();
            } catch (e) {
              console.warn('[Anti Pop-Under] player.skipAd() failed:', e);
            }
          }

          // 4. Click any visible skip buttons using native clicks
          skipButtons.forEach(selector => {
            const btn = document.querySelector(selector);
            if (btn) {
              try {
                btn.click();
              } catch (e) {}
            }
          });

          // 5. Play video if paused
          if (video.paused) {
            video.play().catch(e => {});
          }

          // 6. Force seek the ad to the end (if it gets reset or falls behind)
          if (video.duration && isFinite(video.duration) && video.duration > 0) {
            const targetTime = video.duration - 0.1;
            if (video.currentTime < targetTime - 0.2) {
              // ALWAYS mutate the HTML5 video element directly to bypass YouTube's JS restrictions!
              // Do NOT use player.seekTo() during ads because YouTube explicitly blocks it.
              video.currentTime = targetTime;
            }
          }

          // Report block event
          if (!isNaN(duration) && duration > 0 && lastAdDuration !== duration) {
            lastAdDuration = duration;
            const reportKey = `${window.location.hostname}|skip|${video.src || duration}`;
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
          // Restore user's original playback speed
          if (video.playbackRate === 16) {
            try { video.playbackRate = userPlaybackRate || 1; } catch (e) {}
          }
          lastAdDuration = 0;
        }
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in skipAd:', e);
      }
    }

    let antiAdblockRemovedTime = 0;

    function watchAndBypassAntiAdblock() {
      if (!isEnabled()) return;
      try {
        const selectors = [
          'ytd-enforcement-message-renderer',
          'ytd-enforcement-message-view-model',
          'yt-playability-error-supported-renderers',
          '.yt-playability-error-supported-renderers',
          'tp-yt-paper-dialog'
        ];

        let foundAndRemoved = false;

        selectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const isEnforcement = selector.includes('enforcement');
            const isPlayabilityError = selector.includes('playability-error');
            const hasText = el.innerText && (
              el.innerText.includes('Ad blockers violate') || 
              el.innerText.includes('Trình chặn quảng cáo') ||
              el.innerText.includes('chặn quảng cáo') ||
              el.innerText.includes('Terms of Service')
            );

            if (isEnforcement || (isPlayabilityError && hasText) || hasText) {
              const closeBtn = el.querySelector('#dismiss-button');
              if (closeBtn) {
                simulateClick(closeBtn);
                foundAndRemoved = true;
                console.log('[Anti Pop-Under] Auto-dismissed YouTube warning popup.');
              }
              // If there is no dismiss button, it means the user is fatally blocked by YouTube backend.
              // We MUST NOT manually delete the popup or hide the error screen, otherwise the user 
              // will just get a broken black screen and cannot click the "Allow ads" button.
            }
          });
        });

        if (foundAndRemoved) {
          antiAdblockRemovedTime = Date.now();
        }

        // Keep enforcing scrolling and unblocking for 3 seconds after removing a popup
        // because YouTube's scripts might apply locks asynchronously
        if (foundAndRemoved || (Date.now() - antiAdblockRemovedTime < 3000)) {
          const html = document.documentElement;
          const body = document.body;
          
          if (html && html.style.overflow === 'hidden') html.style.setProperty('overflow', 'auto', 'important');
          if (body && body.style.overflow === 'hidden') body.style.setProperty('overflow', 'auto', 'important');

          // Remove any backdrops
          document.querySelectorAll('tp-yt-iron-overlay-backdrop').forEach(el => el.remove());

          // Fix pointer events on body and html if disabled
          if (body && window.getComputedStyle(body).pointerEvents === 'none') {
            body.style.setProperty('pointer-events', 'auto', 'important');
          }
          if (html && window.getComputedStyle(html).pointerEvents === 'none') {
            html.style.setProperty('pointer-events', 'auto', 'important');
          }
          const ytdApp = document.querySelector('ytd-app');
          if (ytdApp && window.getComputedStyle(ytdApp).pointerEvents === 'none') {
            ytdApp.style.setProperty('pointer-events', 'auto', 'important');
          }

          // We no longer manually hide #error-screen because if the backend blocked the video,
          // hiding the error screen just results in a permanent black screen.

          const { video } = getPlayerAndVideo();
          if (video) {
            // If the video is paused because of the popup we just dismissed, try to play it.
            if (video.paused && foundAndRemoved) {
              video.play().catch(e => {});
              console.log('[Anti Pop-Under] Resumed video playback (enforcing playback after popup removal)');
            }
          }
        }
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in anti-adblock watchdog:', e);
      }
    }

    // Run skip check and anti-adblock check every 150ms as a fallback
    setInterval(() => {
      skipAd();
      watchAndBypassAntiAdblock();
    }, 150);
  }

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

    setInterval(cleanOverlays, 200);
    setInterval(scanAndRemoveClickjacks, 300);
  }

  runYouTubeAdSkipper();
  runGenericAntiAdblockBypass();
})();
