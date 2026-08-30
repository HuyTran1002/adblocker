// Developed by HuyTran1002
// @ts-nocheck
console.log('[Anti Pop-Under] Content Script (Isolated World) loaded successfully! (Developed by HuyTran1002)');

// Check whether this extension context is still alive
function isContextValid() {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (e) {
    return false;
  }
}

// Safe wrapper to prevent 'Extension context invalidated' errors
function safeSendMessage(msg) {
  if (!isContextValid()) return;
  try {
    chrome.runtime.sendMessage(msg, () => {
      // Check and clear lastError to prevent 'Unchecked runtime.lastError' warnings
      const err = chrome.runtime.lastError;
    });
  } catch (e) {
    // Silently ignore invalidated context errors
  }
}

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
    const isHardcoded = whitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain));
    return isHardcoded || !currentEnabledState;
  } catch (e) {
    return false;
  }
}

const adSelectors = [
  // General ad classes and IDs
  '.adsbox', '.ad-container', '.ad-banner', '.ad-wrapper',
  '.ads-wrapper', '.ad_box', '.ad_container', '.sponsored-post',
  '.ad-slot', '.ads-slot', '.ad-holder', '.ads-holder', '.adBox', '.ad-box',
  
  // Specific iframe ad networks
  'iframe[src*="ads"]', 'iframe[src*="doubleclick"]', 'iframe[src*="adsterra"]',
  'iframe[src*="exoclick"]', 'iframe[src*="popads"]', 'iframe[src*="popcash"]',
  'iframe[src*="onclick"]', 'iframe[src*="greatcpmgate"]', 'iframe[src*="highcpmgate"]',
  
  // Specific ad container matchers
  'div[class*="ad-container"]', 'div[class*="ad_box"]', 'div[class*="banner-ad"]',
  'div[class*="sponsored-post"]', 'div[class*="sponsored-ad"]',
  'div[class*="ad-box"]', 'div[class*="ads-box"]', 'div[class*="ad-placement"]',
  'div[class*="ad-wrapper"]', 'div[class*="ads-wrapper"]',
  
  // Vietnamese specific ad classes (quangcao)
  '.quangcao', '.quang-cao',
  'div[class*="quangcao"]', 'div[class*="quang-cao"]', 'div[id*="quangcao"]',
  'div[id*="quang-cao"]',
  
  // Floating, catfish, and sticky ads
  '.catfish', '[class*="catfish"]', '[id*="catfish"]',
  '.floating-ad', '[class*="floating-ad"]', '[id*="floating-ad"]',
  '.float-banner', '[class*="float-banner"]', '[id*="float-banner"]',
  '.sticky-ad', '[class*="sticky-ad"]', '[id*="sticky-ad"]',
  '#floating_left', '#floating_right', '.floating-left', '.floating-right',
  '#floating-left', '#floating-right', '#box-ad', '#ad_center',
  
  // Specific betting and gambling ad classes/IDs
  '[class*="w88"]', '[class*="fun88"]', '[class*="fb88"]', '[class*="m88"]',
  '[class*="kubet"]', '[class*="shbet"]', '[class*="789bet"]', '[class*="jun88"]',
  
  // Widgets
  '.mgid-widget', '.taboola-ad', '.outbrain-ad', '.criteo-ad'
];

function injectAdBlockCSS() {
  // Prevent duplicate insertion
  if (document.getElementById('anti-popunder-adblock-css')) return;
  
  // Do not inject generic ad blocking CSS on YouTube or whitelisted pages to avoid hiding critical UI elements
  if (window.location.hostname.includes('youtube.com') || isCurrentPageWhitelisted()) return;
  
  const style = document.createElement('style');
  style.id = 'anti-popunder-adblock-css';
  style.textContent = `${adSelectors.join(',\n')} {
    display: none !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
  }`;
  (document.head || document.documentElement).appendChild(style);
}

function injectYouTubeAdBlockCSS() {
  // Inject CSS to visually hide anti-adblock popups AND ad overlays instantly
  if (document.getElementById('anti-popunder-youtube-css')) return;
  const style = document.createElement('style');
  style.id = 'anti-popunder-youtube-css';
  style.textContent = `
    /* Hide anti-adblock enforcement popups ONLY (preserve YouTube Subscribe/Share dialogs) */
    ytd-enforcement-message-renderer,
    ytd-enforcement-message-view-model {
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      opacity: 0 !important;
      z-index: -9999 !important;
    }

    /* Tắt hình ảnh quảng cáo ngay lập tức bằng CSS */
    #movie_player.ad-showing .html5-video-container {
      opacity: 0 !important;
    }
    #movie_player.ad-showing::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: #000 !important;
      z-index: 3 !important;
      pointer-events: none !important;
    }

    /* The black premium overlay covers the player visually, so we keep the native ad elements opaque
       and clickable beneath it to prevent YouTube's bot detection from rejecting our clicks. */
  `;
  (document.head || document.documentElement).appendChild(style);
}

let currentEnabledState = true;

// Set attribute on <html> element so inject.js can read it and handle CSS injection
function updateEnabledState(enabled, disabledDomains) {
  const host = window.location.hostname.toLowerCase();
  const isWhitelisted = (disabledDomains || []).some(domain => host === domain || host.endsWith('.' + domain) || domain.endsWith('.' + host));
  const newState = (enabled !== false) && !isWhitelisted;
  
  currentEnabledState = newState;
  document.documentElement.setAttribute('data-anti-popunder-enabled', newState ? 'true' : 'false');
  
  // Broadcast state to main world (inject.js)
  window.postMessage({ type: 'ANTI_POPUP_STATE_CHANGE', enabled: newState }, '*');
  
  const styleTag = document.getElementById('anti-popunder-adblock-css');
  const ytStyleTag = document.getElementById('anti-popunder-youtube-css');
  
  if (newState) {
    if (window.location.hostname.includes('youtube.com')) {
      if (!ytStyleTag) {
        injectYouTubeAdBlockCSS();
      }
    } else if (!isCurrentPageWhitelisted()) {
      if (!styleTag) {
        injectAdBlockCSS();
      }
    }
  } else {
    if (styleTag) styleTag.remove();
    if (ytStyleTag) ytStyleTag.remove();
  }
}

// Synchronously inject CSS immediately at document_start to avoid any flashes
if (window.location.hostname.includes('youtube.com')) {
  injectYouTubeAdBlockCSS();
} else if (!isCurrentPageWhitelisted()) {
  injectAdBlockCSS();
}

    // Get initial state and watch for updates
    if (isContextValid()) {
      try {
        chrome.storage.local.get(['enabled', 'disabledDomains'], (result) => {
          const isEnabled = result.enabled !== false; // true by default
          const disabledDomains = result.disabledDomains || [];
          updateEnabledState(isEnabled, disabledDomains);
        });
      } catch (e) {}

      try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local') {
            chrome.storage.local.get(['enabled', 'disabledDomains'], (result) => {
              const isEnabled = result.enabled !== false;
              const disabledDomains = result.disabledDomains || [];
              updateEnabledState(isEnabled, disabledDomains);
            });
          }
        });
      } catch (e) {}
    }

    // Listen for blocking events from inject.js (via window.postMessage)
    // Self-removing listener: stops working silently if extension context dies
    function onInjectMessage(event) {
      // If extension context has died, remove this listener and stop
      if (!isContextValid()) {
        window.removeEventListener('message', onInjectMessage);
        return;
      }

      if (!event.data) return;

      // Handle handshake request
      if (event.data.type === 'ANTI_POPUP_REQUEST_STATE') {
        window.postMessage({ type: 'ANTI_POPUP_STATE_CHANGE', enabled: currentEnabledState }, '*');
        return;
      }

      // Handle ad block report
      if (event.data.type === 'ANTI_POPUP_BLOCKED_EVENT') {
        if (!currentEnabledState) return;
        safeSendMessage({
          type: 'AD_BLOCKED',
          url: event.data.url,
          reason: event.data.reason
        });
      }
    }
    window.addEventListener('message', onInjectMessage);

    // Clickjacking protection disabled in content.js to avoid false positives
    // inject.js now handles popup/redirect blocking with window.open override
    // and HTMLAnchorElement.prototype.click override, which is more reliable
    // and prevents legitimate movie site clicks from being blocked.

    // Dynamic ad scanner logic (to handle banners, catfish and betting ads)
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
      'googleadservices', 'ad-delivery', 'adservice'
    ];

    // Compile regexes once for high-performance scanning
    const gamblingRegex = new RegExp(gamblingKeywords.join('|'), 'i');
    const adUrlRegex = new RegExp(adUrlKeywords.join('|'), 'i');

    // Checks a single element and its inner children to hide it if it's an ad
    function checkAndHideElement(el) {
      if (!el || el.nodeType !== 1) return;

      const tag = el.tagName;
      if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'CANVAS' || tag === 'SOURCE' || tag === 'TRACK' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG' || tag === 'PATH') return;

      const isEnabled = currentEnabledState;
      if (!isEnabled) return;

      if (isCurrentPageWhitelisted()) return;

      const currentDomain = window.location.hostname;
      const tagName = tag.toLowerCase();

      // Protect interactive functional elements and episode/server buttons from being hidden
      if (['button', 'input', 'select', 'textarea', 'form'].includes(tagName)) return;
      if (el.getAttribute && el.getAttribute('role') === 'button') return;

      const elId = (el.id || '').toLowerCase();
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (elId.includes('no-link') || elId.includes('episode') || elId.includes('server') || elId.includes('tap') || elId.includes('film') || elId.includes('movie') ||
          elClass.includes('episode') || elClass.includes('server') || elClass.includes('halim') || elClass.includes('list-ep') || elClass.includes('tap') || elClass.includes('film') || elClass.includes('movie')) return;

      // Helper to verify and hide an anchor tag
      const checkAnchor = (anchor) => {
        try {
          const href = anchor.href;
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

          let targetDomain = '';
          try {
            targetDomain = new URL(href, window.location.href).hostname;
          } catch (err) {
            return;
          }

          const cleanDom = (d) => d.replace(/^www\./i, '');
          const isExternal = targetDomain && cleanDom(targetDomain) !== cleanDom(currentDomain);
          if (!isExternal) return;

          const hrefLower = href.toLowerCase();
          const matchesGambling = gamblingRegex.test(hrefLower) ||
                                  (/\d{2,}/.test(targetDomain) && (targetDomain.includes('88') || targetDomain.includes('99')));

          const matchesAdServer = adUrlRegex.test(hrefLower);
          const img = anchor.querySelector('img');
          const hasImage = !!img;

          let isAd = false;
          if (matchesGambling || matchesAdServer) {
            isAd = true;
          } else if (hasImage) {
            const imgWidth = img.naturalWidth || img.width || 0;
            const imgHeight = img.naturalHeight || img.height || 0;
            const imgSrc = (img.src || '').toLowerCase();

            // 1. Explicit ad keywords/types
            const imgMatchesAd = ['quangcao', 'adserver'].some(kw => imgSrc.includes(kw)) ||
                                 imgSrc.includes('/ads/') || imgSrc.includes('_ad_') || imgSrc.includes('-ad-');

            // 2. Layout heuristics
            let isAdPattern = false;
            if (imgWidth > 120 || imgHeight > 50) {
              let isFloating = false;
              if (anchor.parentElement) {
                const p = anchor.parentElement;
                const pClass = (typeof p.className === 'string') ? p.className.toLowerCase() : '';
                const pId = (p.id || '').toLowerCase();
                const pPos = p.style ? p.style.position : '';
                if (pPos === 'fixed' || pPos === 'absolute' ||
                    pClass.includes('float') || pClass.includes('catfish') || pClass.includes('ad') || pClass.includes('popup') || pClass.includes('overlay') ||
                    pId.includes('float') || pId.includes('catfish') || pId.includes('ad') || pId.includes('popup') || pId.includes('overlay')) {
                  isFloating = true;
                } else {
                  const style = window.getComputedStyle(p);
                  isFloating = style.position === 'fixed' || style.position === 'absolute';
                }
              }
              const isHorizontalOrSquare = imgWidth >= imgHeight;
              if (isFloating || isHorizontalOrSquare) {
                isAdPattern = true;
              }
            }

            if (imgMatchesAd || isAdPattern) {
              isAd = true;
            }
          }

          if (isAd) {
            let elementToHide = anchor;
            let curr = anchor.parentElement;

            // Traverse up to find the outermost floating overlay / backdrop container
            while (curr && curr !== document.body && curr !== document.documentElement) {
              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAdWrapper = currClass.includes('ad') || currClass.includes('qc') || currClass.includes('popup') || currClass.includes('overlay') || currClass.includes('banner') || currClass.includes('float') || currClass.includes('catfish') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || currId.includes('overlay') || currId.includes('banner') || currId.includes('float') || currId.includes('catfish');

              if ((isFloating || isAdWrapper) && (curr.innerText || '').trim().length < 150) {
                elementToHide = curr;
                curr = curr.parentElement;
              } else {
                break;
              }
            }

            if (!elementToHide.hasAttribute('data-ad-blocked')) {
              elementToHide.setAttribute('data-ad-blocked', 'true');
              elementToHide.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
              console.log('[Anti Pop-Under] Hide Ad & Outer Overlay Container:', href, elementToHide);

              safeSendMessage({
                type: 'AD_BLOCKED',
                url: href,
                reason: 'Ẩn banner & khung mờ quảng cáo'
              });
            }
          }
        } catch (e) {}
      };

      // Helper to verify and hide an iframe tag
      const checkIframe = (iframe) => {
        try {
          const src = iframe.src;
          if (!src) return;

          let targetDomain = '';
          try {
            targetDomain = new URL(src, window.location.href).hostname;
          } catch (e) {
            return;
          }

          const cleanDom = (d) => d.replace(/^www\./i, '');
          const isExternal = targetDomain && cleanDom(targetDomain) !== cleanDom(currentDomain);
          if (!isExternal) return;

          const srcLower = src.toLowerCase();
          const isAdIframe = adUrlRegex.test(srcLower) ||
                             gamblingRegex.test(srcLower);

          if (isAdIframe) {
            let elementToHide = iframe;
            let curr = iframe.parentElement;

            // Traverse up to find outer floating overlay/backdrop wrapper
            while (curr && curr !== document.body && curr !== document.documentElement) {
              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAdWrapper = currClass.includes('ad') || currClass.includes('qc') || currClass.includes('popup') || currClass.includes('overlay') || currClass.includes('banner') || currClass.includes('float') || currClass.includes('catfish') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || currId.includes('overlay') || currId.includes('banner') || currId.includes('float') || currId.includes('catfish');

              if ((isFloating || isAdWrapper) && (curr.innerText || '').trim().length < 150) {
                elementToHide = curr;
                curr = curr.parentElement;
              } else {
                break;
              }
            }

            if (!elementToHide.hasAttribute('data-ad-blocked')) {
              elementToHide.setAttribute('data-ad-blocked', 'true');
              elementToHide.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
              console.log('[Anti Pop-Under] Hide Iframe & Outer Overlay Container:', src, elementToHide);

              safeSendMessage({
                type: 'AD_BLOCKED',
                url: src,
                reason: 'Ẩn khung quảng cáo & lớp mờ'
              });
            }
          }
        } catch(e) {}
      };

      // Verify element itself
      if (tagName === 'a') {
        checkAnchor(el);
      } else if (tagName === 'iframe') {
        checkIframe(el);
      }

      // Verify children only if element has child elements
      if (el.childElementCount > 0) {
        el.querySelectorAll('a').forEach(checkAnchor);
        el.querySelectorAll('iframe').forEach(checkIframe);
      }
    }

    // Cleans up orphaned backdrop overlays (darkened backgrounds left behind by blocked ads)
    function cleanOrphanedBackdrops() {
      if (!currentEnabledState || isCurrentPageWhitelisted()) return;
      try {
        const overlays = document.querySelectorAll('div, section, dialog');
        overlays.forEach(el => {
          if (el.hasAttribute('data-ad-blocked')) return;
          const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
          const elId = (el.id || '').toLowerCase();

          const isOverlayClass = elClass.includes('ad-overlay') || elClass.includes('overlay-ad') || elClass.includes('ad-backdrop') || elClass.includes('popup-backdrop') || elClass.includes('modal-backdrop') ||
                                 elId.includes('ad-overlay') || elId.includes('overlay-ad') || elId.includes('ad-backdrop');

          if (isOverlayClass || ((elClass.includes('catfish') || elClass.includes('floating')) && (elClass.includes('ad') || elClass.includes('banner')))) {
            // Check if all child images, links, or iframes inside it are already blocked or empty
            const visibleImages = el.querySelectorAll('img:not([data-ad-blocked])');
            const visibleIframes = el.querySelectorAll('iframe:not([data-ad-blocked])');
            const visibleAnchors = el.querySelectorAll('a:not([data-ad-blocked])');

            if (visibleImages.length === 0 && visibleIframes.length === 0 && visibleAnchors.length === 0) {
              el.setAttribute('data-ad-blocked', 'true');
              el.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
              console.log('[Anti Pop-Under] Hide orphaned backdrop overlay:', el);

              // Restore scroll locks if body/html was locked
              if (document.body && document.body.style.overflow === 'hidden') document.body.style.overflow = '';
              if (document.documentElement && document.documentElement.style.overflow === 'hidden') document.documentElement.style.overflow = '';
            }
          }
        });
      } catch(e) {}
    }

    // Scans and removes all ads currently in the document
    function scanAndRemoveAds() {
      checkAndHideElement(document.body || document.documentElement);
      cleanOrphanedBackdrops();
    }

    // Set up batched MutationObserver using requestIdleCallback to keep video playback smooth (no frame drops)
    const pendingNodes = new Set();
    let batchScheduled = false;

    function processPendingNodes() {
      batchScheduled = false;
      if (pendingNodes.size === 0) return;
      const nodes = Array.from(pendingNodes);
      pendingNodes.clear();
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].isConnected) {
          checkAndHideElement(nodes[i]);
        }
      }
    }

    function queueNodeCheck(node) {
      pendingNodes.add(node);
      if (!batchScheduled) {
        batchScheduled = true;
        if (typeof requestIdleCallback === 'function') {
          requestIdleCallback(processPendingNodes, { timeout: 150 });
        } else {
          setTimeout(processPendingNodes, 80);
        }
      }
    }

    try {
      const observer = new MutationObserver((mutations) => {
        const isEnabled = currentEnabledState;
        if (!isEnabled) return;

        // Skip dynamic ad checks on YouTube to prevent hiding core UI elements
        if (window.location.hostname.includes('youtube.com')) return;

        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Only element nodes
              queueNodeCheck(node);
            }
          });
        });
      });

      // Observe early document parsing
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    } catch (e) {
      console.error('[Anti Pop-Under] MutationObserver setup failed:', e);
    }

    // Fallbacks and periodic sweep (paused when video is playing to avoid frame stutters on mobile)
    window.addEventListener('DOMContentLoaded', () => {
      if (window.location.hostname.includes('youtube.com')) return;
      scanAndRemoveAds();
      setInterval(() => {
        if (window.location.hostname.includes('youtube.com')) return;
        const video = document.querySelector('video');
        if (video && !video.paused) return; // Pause background scan during active movie playback
        scanAndRemoveAds();
      }, 5000);
    });

    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      if (!window.location.hostname.includes('youtube.com')) {
        scanAndRemoveAds();
      }
    }
    window.addEventListener('load', () => {
      if (window.location.hostname.includes('youtube.com')) return;
      scanAndRemoveAds();
    });
