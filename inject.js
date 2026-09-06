(function() {
  // Developed by HuyTran1002
  console.log('[Anti Pop-Under] Injected Script (Main World) loaded successfully! (Developed by HuyTran1002)');


  // Anti-Anti-Adblock bypass logic for movie sites (like animevietsub)
  (function() {
    if (window.location.hostname.includes('youtube.com') || 
        window.location.hostname.includes('google') || 
        window.location.hostname.includes('doubleclick')) return;

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
      _gaq: { push: function(arr) { if (arr && arr[0] === '_setCallback' && typeof arr[1] === 'function') { try { arr[1](); } catch(e){} } } },
      AdProvider: { push: function() {} },
      VideoSlider: { init: function() {} },
      univresalP: function() {},
      pickDirect: function() { console.log('[Anti Pop-Under] Blocked pickDirect ad overlay'); }
    };
    
    Object.keys(mockGlobals).forEach(key => {
      try {
        if (!(key in window)) {
          window[key] = mockGlobals[key];
        }
      } catch(e) {}
    });

    try {
      const dummyAdProvider = { push: function() {} };
      Object.defineProperty(window, 'AdProvider', {
        get() { return dummyAdProvider; },
        set(val) { /* ignore */ },
        configurable: true
      });
      const dummyVideoSlider = { init: function() {} };
      Object.defineProperty(window, 'VideoSlider', {
        get() { return dummyVideoSlider; },
        set(val) { /* ignore */ },
        configurable: true
      });
      Object.defineProperty(window, 'pickDirect', {
        get() { return function() { console.log('[Anti Pop-Under] Neutralized pickDirect ad'); }; },
        set(val) { /* ignore */ },
        configurable: true
      });

      // Safety patch for jQuery .position() on movie sites (e.g. animevietsub home-v1.js:373)
      // Prevents: "TypeError: Cannot read properties of undefined (reading 'top')" when active episode is not found
      function patchJQuery(jq) {
        if (jq && jq.fn && jq.fn.position && !jq.fn.position._safePatched) {
          const origPos = jq.fn.position;
          jq.fn.position = function() {
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
    } catch(e) {}

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
          'tx88.army', 'vu88.foo', '9bet.beer', 'du88.money', 'vua88.eco', '789club.zip'
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
        if (this.tagName) {
          const tag = this.tagName.toLowerCase();
          if (tag === 'script' && typeof name === 'string' && name.toLowerCase() === 'src') {
            if (typeof value === 'string' && isAdUrl(value)) {
              console.log('[Anti Pop-Under] Intercepted script setAttribute(src):', value);
              originalSetAttribute.call(this, name, 'data:text/javascript;base64,console.log("Mocked ad script");');
              return;
            }
          }
        }
        originalSetAttribute.call(this, name, value);
      };
    } catch(e) {}

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
        if (!id.includes('ad') && !id.includes('qc') && !id.includes('quang') &&
            !className.includes('ad') && !className.includes('qc') && !className.includes('quang')) {
          return false;
        }

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
    if (!el || el === document || el === document.body || el === document.documentElement) {
      return false;
    }
    
    try {
      const tagName = el.tagName ? el.tagName.toLowerCase() : '';
      if (['video', 'audio', 'canvas', 'iframe', 'embed', 'object', 'svg', 'path', 'i', 'img', 'button', 'input', 'select', 'textarea', 'form', 'label', 'summary', 'option'].includes(tagName)) {
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
      if (elId.includes('no-link') || elId.includes('episode') || elId.includes('server') || elId.includes('tap') || elId.includes('halim') || elId.includes('film') || elId.includes('movie') || elId.includes('control') ||
          elClass.includes('episode') || elClass.includes('server') || elClass.includes('halim') || elClass.includes('list-ep') || elClass.includes('tap') || elClass.includes('film') || elClass.includes('movie') || elClass.includes('control')) {
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

      // If it contains genuine form controls, video media, or text-bearing children, skip
      if (el.querySelector('video, audio, canvas, iframe, embed, object, button, input, select, textarea, a, span, p, h1, h2, h3, h4, h5, h6')) {
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
    'sv388', 'vz99', 'loto188', 'k9win', 'fabet', 'oxbet', 'debet', 'may88', 'sc88'
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
    '/static/video/bn/'
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
      } catch(e) {
        isBlank = true;
      }
    }

    // 1. If it explicitly matches ad/gambling keywords or popunder params, block it 100%
    if (url && (gamblingRegex.test(url) || adUrlRegex.test(url) || (url.includes('ab=') && url.includes('rl=')))) {
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
      } catch (e) {}
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
           } catch(e) {}
        }
        
        curr = curr.parentElement;
      }

      // If clicked on an overlay, block it
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
          } catch(e) {}
        };
        if (node.tagName === 'IFRAME') {
          clean(node);
        } else if (node.childElementCount > 0 && node.querySelectorAll) {
          node.querySelectorAll('iframe').forEach(clean);
        }
      } catch(e) {}
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
            sanitizeIframeNode(el);
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
          try { sanitizeIframeNode(arguments[0]); } catch(e) {}
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
          try { sanitizeIframeNode(arguments[0]); } catch(e) {}
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
    } catch (err) {}

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

  // --- ADGUARD / UBLOCK ORIGIN NATIVE YOUTUBE AD ENGINE ---
  function runYouTubeAdGuardEngine() {
    if (!window.location.hostname.includes('youtube.com')) return;

    console.log('[Anti Pop-Under] AdGuard-grade Native YouTube Ad Engine active!');

    // 1. Core payload cleaner: eliminates ad definitions before YouTube player initializes them
    function cleanPlayerPayload(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      try {
        // Handle nested player response if present
        if (obj.playerResponse && typeof obj.playerResponse === 'object') {
          cleanPlayerPayload(obj.playerResponse);
        } else if (typeof obj.playerResponse === 'string') {
          try {
            const parsed = JSON.parse(obj.playerResponse);
            cleanPlayerPayload(parsed);
            obj.playerResponse = JSON.stringify(parsed);
          } catch (e) {}
        }

        // Delete ad placements and slots so YouTube never schedules ads
        if (obj.adPlacements) delete obj.adPlacements;
        if (obj.adSlots) delete obj.adSlots;
        if (obj.playerAds) delete obj.playerAds;
        if (obj.adBreakHeartbeatParams) delete obj.adBreakHeartbeatParams;
        if (obj.masthead) delete obj.masthead;

        // Clean anti-adblock enforcement dialogs & prompts
        if (obj.auxiliaryUi && obj.auxiliaryUi.messageRenderers) {
          const mr = obj.auxiliaryUi.messageRenderers;
          if (mr.enforcementMessageViewModel) delete mr.enforcementMessageViewModel;
          if (mr.upsellDialogRenderer) delete mr.upsellDialogRenderer;
        }

        // Clean engagement panels containing ads
        if (Array.isArray(obj.engagementPanels)) {
          obj.engagementPanels = obj.engagementPanels.filter(panel => {
            const panelId = panel?.engagementPanelSectionListRenderer?.targetId || '';
            return !panelId.includes('ads') && !panelId.includes('engagement-panel-ads');
          });
        }
      } catch (e) {}
      return obj;
    }

    // 2. Intercept window.ytInitialPlayerResponse (initial video load)
    let _ytInitialPlayerResponse = window.ytInitialPlayerResponse;
    if (_ytInitialPlayerResponse) {
      cleanPlayerPayload(_ytInitialPlayerResponse);
    }
    try {
      Object.defineProperty(window, 'ytInitialPlayerResponse', {
        get() {
          return _ytInitialPlayerResponse;
        },
        set(val) {
          _ytInitialPlayerResponse = cleanPlayerPayload(val);
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {}

    // 3. Intercept window.ytInitialData (browse, home, search ads)
    function cleanInitialData(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      try {
        if (obj.overlay && obj.overlay.adSlotRenderer) delete obj.overlay.adSlotRenderer;
        if (obj.masthead) delete obj.masthead;
      } catch (e) {}
      return obj;
    }

    let _ytInitialData = window.ytInitialData;
    if (_ytInitialData) {
      cleanInitialData(_ytInitialData);
    }
    try {
      Object.defineProperty(window, 'ytInitialData', {
        get() {
          return _ytInitialData;
        },
        set(val) {
          _ytInitialData = cleanInitialData(val);
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {}

    // 4. Intercept window.fetch (SPA navigation: /youtubei/v1/player, /youtubei/v1/next, /reel_item_watch)
    try {
      const originalFetch = window.fetch;
      window.fetch = async function(...args) {
        const url = args[0] ? (typeof args[0] === 'string' ? args[0] : (args[0].url || '')) : '';
        if (typeof url === 'string') {
          const isPlayerApi = url.includes('/youtubei/v1/player') || 
                              url.includes('/youtubei/v1/next') || 
                              url.includes('/youtubei/v1/reel/reel_item_watch');

          if (isPlayerApi) {
            let response;
            try {
              response = await originalFetch.apply(this, args);
            } catch (fetchErr) {
              throw fetchErr;
            }

            try {
              const clone = response.clone();
              const data = await clone.json();
              cleanPlayerPayload(data);

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
              } catch (e) {}
              return modifiedResponse;
            } catch (parseErr) {
              return response;
            }
          }
        }
        return originalFetch.apply(this, args);
      };
    } catch (e) {}

    // 5. Intercept XMLHttpRequest
    try {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this._ytUrl = (typeof url === 'string') ? url : '';
        return originalOpen.apply(this, [method, url, ...rest]);
      };

      XMLHttpRequest.prototype.send = function(...args) {
        if (this._ytUrl && (this._ytUrl.includes('/youtubei/v1/player') || this._ytUrl.includes('/youtubei/v1/next') || this._ytUrl.includes('/youtubei/v1/reel/reel_item_watch'))) {
          this.addEventListener('readystatechange', function() {
            if (this.readyState === 4 && this.status === 200) {
              try {
                const data = JSON.parse(this.responseText);
                cleanPlayerPayload(data);
                const cleanJson = JSON.stringify(data);
                if (this.responseType === 'json') {
                  Object.defineProperty(this, 'response', { value: data, configurable: true });
                } else {
                  Object.defineProperty(this, 'responseText', { value: cleanJson, configurable: true });
                  Object.defineProperty(this, 'response', { value: cleanJson, configurable: true });
                }
              } catch (e) {}
            }
          });
        }
        return originalSend.apply(this, args);
      };
    } catch (e) {}

    // 6. Global JSON.parse hook: automatically sanitizes adPlacements from any internal parse
    try {
      const originalJSONParse = JSON.parse;
      JSON.parse = function(text, reviver) {
        const result = originalJSONParse.apply(this, arguments);
        if (result && typeof result === 'object') {
          if (result.adPlacements || result.adSlots || result.playerAds || result.playerResponse) {
            cleanPlayerPayload(result);
          }
        }
        return result;
      };
    } catch (e) {}

    // 7. Neutralize Anti-Adblock Warning Modals & Preserve Smooth Playback
    function clearYouTubeEnforcementDialogs() {
      if (!isEnabled()) return;
      try {
        const dialogSelectors = [
          'ytd-enforcement-message-view-model',
          'ytd-enforcement-message-renderer',
          'tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)',
          'tp-yt-paper-dialog:has(ytd-enforcement-message-renderer)',
          'tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model)'
        ];

        let removed = false;
        dialogSelectors.forEach(sel => {
          const els = document.querySelectorAll(sel);
          els.forEach(el => {
            el.remove();
            removed = true;
          });
        });

        if (removed) {
          const backdrops = document.querySelectorAll('tp-yt-iron-overlay-backdrop');
          backdrops.forEach(b => b.remove());

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
            video.play().catch(() => {});
          }
        }
      } catch (e) {}
    }

    try {
      const observer = new MutationObserver(() => {
        clearYouTubeEnforcementDialogs();
      });
      observer.observe(document.documentElement || document.body, {
        childList: true,
        subtree: true
      });
    } catch (e) {}

    setInterval(clearYouTubeEnforcementDialogs, 1000);
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
    } catch (e) {}
  }

  function runGenericAntiAdblockBypass() {
    if (window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;

    function cleanOverlays() {
      if (!isEnabled()) return;
      try {
        const dialogs = document.querySelectorAll('dialog, [class*="adblock"], [id*="adblock"], [class*="anti-ad"], [id*="anti-ad"], [class*="backdrop"]');
        dialogs.forEach(el => {
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
      }, 1500);
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

    // Fallback scan every 5 seconds for silent background changes
    setInterval(() => {
      if (isEnabled() && !window.location.hostname.includes('youtube.com') && !isCurrentPageWhitelisted()) {
        cleanOverlays();
      }
    }, 5000);

    // Initial scan
    scheduleBypassScan();
  }

  runYouTubeAdGuardEngine();
  runGenericAntiAdblockBypass();
})();
