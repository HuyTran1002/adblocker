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

      if (el.closest('a, button, input, textarea, select, label, summary, [role="button"], [role="link"], [tabindex], [onclick], [data-action], [contenteditable], #no-link, [id*="no-link"], [class*="episode"], [id*="episode"], [class*="server"], [id*="server"], [class*="halim-"]')) return true;
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
  
  function toggleVideoPlayPause(target) {
    if (!target) return;
    try {
      let video = null;
      const tag = target.tagName ? target.tagName.toLowerCase() : '';
      if (tag === 'video') {
        video = target;
      } else if (target.querySelector) {
        video = target.querySelector('video');
      }
      if (!video && target.closest) {
        const container = target.closest('.jwplayer, .plyr, .video-js, .artplayer, .dplayer, .vjs-, .flowplayer, [class*="player"], [id*="player"], [class*="video"], [id*="video"]');
        if (container) video = container.querySelector('video');
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

        // Automatically toggle play/pause when user clicks in the middle of video screen after clearing ad overlay
        if (e.type === 'click' && isPlayerOrPlayButton(target)) {
          toggleVideoPlayPause(target);
        }
        return;
      }

      // 3. ULTRA FAST-PATH FOR VIDEO CONTROLS, PLAY/PAUSE & SEEKBARS:
      // If user touches/clicks/drags on genuine video player, canvas, seekbar, slider, time display or controls:
      // Return instantly in 0.001ms so native player play/pause & seek actions execute smoothly!
      if (isPlayerOrPlayButton(target) || isInteractiveElement(target)) {
        return;
      }

      // 4. Check anchor link clicks pointing to popunder/ad URLs
      if (e.type === 'click' && anchor && anchor.href) {
        const isTargetBlank = (anchor.getAttribute('target') || '').toLowerCase() === '_blank';
        const contextName = isTargetBlank ? 'anchor.click._blank' : 'anchor.click';
        if (!checkNavigationOrPopup(anchor.href, contextName)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          reportBlocked(anchor.href, `Blocked popunder link click (${contextName})`);
          console.log('[Anti Pop-Under] Blocked click on popunder link:', anchor.href);
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

      // Protect video player controls
      if (el.closest('.jwplayer, .plyr, .video-js, .vjs-, .mejs-, .flowplayer, [class*="player-"], [id*="player-"], [class*="video-"], [id*="video-"]')) {
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
      const isTransparent = opacity < 0.35 || 
                            style.backgroundColor === 'transparent' || 
                            style.backgroundColor.includes('rgba(0, 0, 0, 0)') ||
                            style.backgroundColor.includes('rgba(255, 255, 255, 0)');
      if (!isTransparent) return false;

      // Real overlay area check: spans a significant part of the viewport (or > 200x200)
      const isLargeArea = (width >= 200 && height >= 200) || (width >= vw * 0.4 && height >= vh * 0.4);
      const zIndex = parseInt(style.zIndex, 10);
      const isHighZ = !isNaN(zIndex) && zIndex >= 10;

      return isLargeArea && isHighZ;
    } catch (e) {
      return false;
    }
  }

  const gamblingKeywords = [
    '\\bbet\\b', 'casino', 'gamebai', 'nhacai', 'w88', 'fun88', 'fb88', 'm88', 
    '188bet', 'kubet', 'shbet', '789bet', 'jun88', 'f8bet', 'new88', 'hi88', 
    'okvip', '1xbit', '1xbet', 'vi88', 'fi88', 'ee88', 'lixi88', 'mu88',
    'loto', 'quayhu', '\\bslot\\b', 'nha-cai', 'soicau', 'keonhacai', 'bong88',
    'sv388', 'vz99', 'loto188', 'k9win', 'fabet', 'oxbet', 'debet', 'may88'
  ];

  const adUrlKeywords = [
    'adserver', 'popunder', 'greatcpmgate', 'highcpmgate', 'onclickads', 
    'clktag', 'exoclick', 'eclick.vn', 'novanet.vn', 'adsterra', 'popads', 'popcash',
    'cpmrate', 'cpmnetwork', 'cpmgate', 'profitablecpm', 'profitablecpmratenetwork',
    'hilltopads', 'galaksion', 'monetag', 'admaven', 'clickadu', 'richads', 'propush',
    'popmyads', 'adtrue', 'adflex', 'syndication', 'doubleclick', 'googlesyndication',
    'googleadservices', 'ad-delivery', 'adservice', 'astrology', 'backlight', 'inless',
    '\\?ab=', '&ab=', '&rl=', '\\?rl=', 'zoneid=', 'pubid=', 'subid=', 'placement=', 'direct_link'
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

      const isPlayerClick = isPlayerOrPlayButton(clickedEl);
      
      // A play button/player click should NEVER open a new tab/window (window.open) or trigger _blank link redirects
      if (isPlayerClick && (isWindowOpen || context.includes('_blank'))) {
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
      if (!url || (!gamblingRegex.test(url) && !adUrlRegex.test(url))) {
        return originalOpen.apply(this, arguments);
      }
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
          const result = orig.apply(this, arguments);
          patchIframeNode(arguments[0]);
          return result;
        };
      } catch(e) {}
    });

    ['append', 'insertAdjacentElement'].forEach(method => {
      try {
        const orig = Element.prototype[method];
        Element.prototype[method] = function() {
          const result = orig.apply(this, arguments);
          patchIframeNode(arguments[0]);
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

    const adContainers = [
      '.ytp-ad-image-overlay',
      '.ytp-ad-text-overlay',
      '.ytp-ad-overlay-container',
      '.ytp-ad-message-container',
      '.ytd-companion-slot-renderer',
      '.ytd-action-companion-ad-renderer',
      '.ytp-ad-player-overlay' // The full player image ad overlay
    ];

    let userPlaybackRate = 1;
    let wasMutedByUs = false;
    let originalMutedState = false;
    let lastSkipActionTime = 0;
    let lastAdDuration = 0;
    let wasAdPlaying = false;

    let overlayElement = null;
    function toggleAntiAdOverlay(show) {
      if (show) {
        if (!overlayElement) {
          overlayElement = document.createElement('div');
          overlayElement.id = 'anti-ad-premium-overlay';
          const spinner = document.createElement('div');
          spinner.className = 'anti-ad-spinner';
          
          const textEl = document.createElement('div');
          textEl.className = 'anti-ad-text';
          textEl.textContent = 'Đang chặn quảng cáo...';
          
          const subTextEl = document.createElement('div');
          subTextEl.className = 'anti-ad-subtext';
          subTextEl.textContent = 'Hệ thống đang vô hiệu hóa luồng quảng cáo';
          
          overlayElement.appendChild(spinner);
          overlayElement.appendChild(textEl);
          overlayElement.appendChild(subTextEl);
          const style = document.createElement('style');
          style.textContent = `
            #anti-ad-premium-overlay {
              position: absolute;
              top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(10, 10, 10, 0.95);
              backdrop-filter: blur(15px);
              z-index: 999999;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              color: #fff;
              font-family: 'Inter', 'Roboto', 'Segoe UI', sans-serif;
              opacity: 0;
              transition: opacity 0.2s ease;
              pointer-events: none;
            }
            .anti-ad-spinner {
              width: 50px;
              height: 50px;
              border: 4px solid rgba(255,255,255,0.05);
              border-top: 4px solid #ff0033;
              border-radius: 50%;
              animation: anti-ad-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
              margin-bottom: 24px;
              box-shadow: 0 0 15px rgba(255,0,51,0.2);
            }
            .anti-ad-text {
              font-size: 22px;
              font-weight: 600;
              letter-spacing: 0.5px;
              text-shadow: 0 2px 10px rgba(255,0,51,0.4);
              margin-bottom: 8px;
            }
            .anti-ad-subtext {
              font-size: 14px;
              color: #888;
              font-weight: 400;
            }
            @keyframes anti-ad-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `;
          document.head.appendChild(style);
          const player = document.querySelector('#movie_player') || document.querySelector('ytd-player');
          if (player) {
            player.appendChild(overlayElement);
          } else {
            document.body.appendChild(overlayElement);
          }
        }
        if (overlayElement.style.opacity !== '1') {
          overlayElement.style.opacity = '1';
          overlayElement.style.pointerEvents = 'all';
        }
      } else {
        if (overlayElement && overlayElement.style.opacity !== '0') {
          overlayElement.style.opacity = '0';
          overlayElement.style.pointerEvents = 'none';
        }
      }
    }

    function isAdPlayingSafely() {
      const player = document.querySelector('#movie_player');
      if (player && player.classList.contains('ad-showing')) {
        return true;
      }
      const adModule = document.querySelector('.video-ads.ytp-ad-module');
      if (adModule && adModule.children.length > 0 && adModule.style.display !== 'none') {
        return true;
      }
      const skipBtn = document.querySelector('.ytp-ad-skip-button, .ytp-ad-skip-button-modern, .ytp-skip-ad-button');
      if (skipBtn && skipBtn.offsetParent !== null) {
        return true;
      }
      return false;
    }

    function skipAd() {
      if (!isEnabled()) return;
      try {
        const isAd = isAdPlayingSafely();
        const video = document.querySelector('.video-ads video') || document.querySelector('.html5-main-video') || document.querySelector('video');

        if (isAd && video) {
          wasAdPlaying = true;
          toggleAntiAdOverlay(true);

          // 1. Instantly skip the video using safe fast-forward
          if (!isNaN(video.duration) && video.duration > 0) {
            if (!video.muted) {
              originalMutedState = false;
              video.muted = true;
              wasMutedByUs = true;
            }
            
            // Detect if this is an SSAI ad on a livestream (duration is NaN, Infinity, or insanely large)
            const duration = video.duration;
            const isLivestream = isNaN(duration) || duration === Infinity || duration > 36000;
            
            if (!isLivestream && duration > 0) {
              // Ultra-fast skip: jump straight to the end for all normal video ads
              try { video.currentTime = Math.max(0, duration - 0.1); } catch (e) {}
              
              if (video.playbackRate !== 16.0) {
                userPlaybackRate = video.playbackRate || 1;
                video.playbackRate = 16.0;
              }
            } else {
              // SSAI livestream ads cannot jump time and cannot speed up without 403
              if (video.playbackRate !== 1.0 && video.playbackRate === 16.0) {
                video.playbackRate = 1.0;
              }
            }
          }

          // 2. Click skip buttons aggressively
          const skipButtons = [
            '.ytp-ad-skip-button',
            '.ytp-ad-skip-button-modern',
            '.ytp-skip-ad-button',
            '.ytp-ad-skip-button-slot',
            '.ytp-ad-skip-button-text'
          ];
          
          let clicked = false;
          skipButtons.forEach(selector => {
            if (clicked) return;
            const btns = document.querySelectorAll(selector);
            btns.forEach(btn => {
              if (clicked) return;
              if (btn && (btn.offsetWidth > 0 || btn.offsetHeight > 0 || btn.offsetParent !== null)) {
                const now = Date.now();
                if (now - lastSkipActionTime > 300) {
                  const player = document.querySelector('#movie_player');
                  if (player && typeof player.skipAd === 'function') {
                    try { player.skipAd(); } catch (e) {}
                  }
                  try { simulateNativeClick(btn); } catch (e) {}
                  try {
                    const nested = btn.querySelectorAll('button, [role="button"], span, div');
                    nested.forEach(n => simulateNativeClick(n));
                  } catch (e) {}
                  
                  lastSkipActionTime = now;
                  clicked = true;
                }
              }
            });
          });

          // 3. Report block event
          const duration = video ? video.duration : 0;
          if (!isNaN(duration) && duration > 0 && lastAdDuration !== duration) {
            lastAdDuration = duration;
            const reportKey = `${window.location.hostname}|skip|${video.src || duration}`;
            if (typeof shouldReportBlockedEvent === 'function' && typeof reportBlocked === 'function') {
              if (shouldReportBlockedEvent(reportKey)) {
                reportBlocked('YouTube Video Ad', 'Bỏ qua quảng cáo video YouTube');
              }
            }
          }
        } else {
          toggleAntiAdOverlay(false);
          if (wasAdPlaying) {
            wasAdPlaying = false;
            if (video) {
              if (wasMutedByUs) {
                try { video.muted = originalMutedState; } catch (e) {}
                wasMutedByUs = false;
              }
              if (video.playbackRate === 16.0) {
                try { video.playbackRate = userPlaybackRate || 1; } catch (e) {}
              }
            }

            // Sync livestreams to live edge if they got delayed by the ad
            // We use setTimeout because the player needs a moment to restore the main stream
            // before it can process live edge seeking.
            const trySyncLive = (retries) => {
              if (retries <= 0) return;
              const liveBadge = document.querySelector('.ytp-live-badge');
              // Only click if it's currently showing we are behind the live edge
              if (liveBadge && liveBadge.getAttribute('disabled') === null && !liveBadge.classList.contains('ytp-live-badge-disabled')) {
                try { simulateNativeClick(liveBadge); } catch (e) {}
                setTimeout(() => trySyncLive(retries - 1), 1000);
              }
            };
            setTimeout(() => trySyncLive(3), 500);
          }
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
          '.yt-playability-error-supported-renderers'
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
              el.innerText.includes('chặn quảng cáo')
            );

            if (isEnforcement || (isPlayabilityError && hasText) || hasText) {
              const closeBtn = el.querySelector('#dismiss-button');
              if (closeBtn) {
                simulateNativeClick(closeBtn);
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

          const video = document.querySelector('video');
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

    let adObserverAttached = false;

    // Run skip check and anti-adblock check dynamically
    function runYouTubeLoop() {
      if (!isEnabled() || !window.location.hostname.includes('youtube.com')) {
        setTimeout(runYouTubeLoop, 1000);
        return;
      }
      try {
        skipAd();
        watchAndBypassAntiAdblock();
        
        if (!adObserverAttached) {
          const player = document.querySelector('#movie_player');
          const video = document.querySelector('video');
          if (player && video) {
            adObserverAttached = true;
            new MutationObserver((mutations) => {
              for (const m of mutations) {
                if (m.attributeName === 'class' && player.classList.contains('ad-showing')) {
                  skipAd();
                  break;
                }
              }
            }).observe(player, { attributes: true, attributeFilter: ['class'] });

            video.addEventListener('timeupdate', () => {
              if (isAdPlayingSafely()) skipAd();
            });
            video.addEventListener('play', () => {
              if (isAdPlayingSafely()) skipAd();
            });
          }
        }

        const isAdPlaying = isAdPlayingSafely();
        const nextDelay = isAdPlaying ? 50 : 500;
        setTimeout(runYouTubeLoop, nextDelay);
      } catch (e) {
        console.warn('[Anti Pop-Under] Error in YouTube loop:', e);
        setTimeout(runYouTubeLoop, 1000);
      }
    }
    runYouTubeLoop();
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
    }, 3000);

    // Initial scan
    scheduleBypassScan();
  }

  runYouTubeAdSkipper();
  runGenericAntiAdblockBypass();
})();
