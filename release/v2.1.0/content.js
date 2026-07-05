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
    return whitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain));
  } catch (e) {
    return false;
  }
}

const adSelectors = [
  // General ad classes and IDs
  '.ad', '.ads', '.adsbox', '.ad-container', '.ad-banner', '.ad-wrapper',
  '.ads-wrapper', '.ad_box', '.ad_container', '.sponsored-post',
  '.ad-slot', '.ads-slot', '.ad-holder', '.ads-holder', '.adBox', '.ad-box',
  
  // Specific iframe ad networks
  'iframe[src*="ads"]', 'iframe[src*="doubleclick"]', 'iframe[src*="adsterra"]',
  'iframe[src*="exoclick"]', 'iframe[src*="popads"]', 'iframe[src*="popcash"]',
  'iframe[src*="onclick"]', 'iframe[src*="greatcpmgate"]', 'iframe[src*="highcpmgate"]',
  
  // Attribute matchers for ads & banners
  'div[class*="ad-container"]', 'div[class*="ad_box"]', 'div[class*="banner-ad"]',
  'div[id*="ad-"]', 'div[class*="ads-"]', 'div[class*="sponsored"]',
  'div[id*="ad_"]', 'div[id*="ads_"]', 'div[class*="ad_"]', 'div[class*="ads_"]',
  'div[class*="ad-box"]', 'div[class*="ads-box"]', 'div[class*="ad-placement"]',
  'div[class*="ad-wrapper"]', 'div[class*="ads-wrapper"]',
  
  // Vietnamese specific ad classes (qc, quangcao)
  '.qc', '.quangcao', '.quang-cao',
  'div[class*="qc-"]', 'div[id*="qc-"]', 'div[class*="qc_"]', 'div[id*="qc_"]',
  'div[class*="quangcao"]', 'div[class*="quang-cao"]', 'div[id*="quangcao"]',
  'div[id*="quang-cao"]',
  
  // Floating, catfish, and sticky ads
  '.catfish', '[class*="catfish"]', '[id*="catfish"]',
  '.floating-ad', '[class*="floating-ad"]', '[id*="floating-ad"]',
  '.float-banner', '[class*="float-banner"]', '[id*="float-banner"]',
  '.sticky-ad', '[class*="sticky-ad"]', '[id*="sticky-ad"]',
  '#floating_left', '#floating_right', '.floating-left', '.floating-right',
  '#floating-left', '#floating-right', '#box-ad', '#ad_center',
  
  // Betting and gambling ads (extremely common on Vietnamese movie sites!)
  'a[href*="bet"]', 'a[href*="casino"]', 'a[href*="gamebai"]', 'a[href*="nhacai"]',
  'a[href*="w88"]', 'a[href*="fun88"]', 'a[href*="fb88"]', 'a[href*="m88"]',
  'a[href*="188bet"]', 'a[href*="kubet"]', 'a[href*="shbet"]', 'a[href*="789bet"]',
  'a[href*="jun88"]', 'a[href*="f8bet"]', 'a[href*="new88"]', 'a[href*="hi88"]',
  'a[href*="okvip"]', 'a[href*="1xbit"]', 'a[href*="1xbet"]', 'a[href*="vi88"]',
  'a[href*="fi88"]', 'a[href*="ee88"]', 'a[href*="lixi88"]', 'a[href*="mu88"]',
  
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
    /* Hide anti-adblock enforcement popups */
    ytd-enforcement-message-renderer,
    ytd-enforcement-message-view-model,
    tp-yt-paper-dialog.style-scope.ytd-popup-container {
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      opacity: 0 !important;
      z-index: -9999 !important;
    }
    tp-yt-iron-overlay-backdrop {
      opacity: 0 !important;
      z-index: -9999 !important;
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

    // Compile regexes once for high-performance scanning
    const gamblingRegex = new RegExp(gamblingKeywords.join('|'), 'i');
    const adUrlRegex = new RegExp(adUrlKeywords.join('|'), 'i');

    // Checks a single element and its inner children to hide it if it's an ad
    function checkAndHideElement(el) {
      if (!el || el.nodeType !== 1) return;

      const isEnabled = currentEnabledState;
      if (!isEnabled) return;

      if (isCurrentPageWhitelisted()) return;

      const currentDomain = window.location.hostname;
      const tagName = el.tagName.toLowerCase();

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
            const imgMatchesAd = ['banner', 'quangcao', 'qc', 'adserver', 'gif'].some(kw => imgSrc.includes(kw)) ||
                                 imgSrc.includes('/ads/') || imgSrc.includes('/ad/') ||
                                 imgSrc.includes('_ad_') || imgSrc.includes('-ad-');
        
            // 2. Layout heuristics:
            // - Floating banner ads (fixed or absolute position)
            // - Horizontal/Square banner ads (width >= height) that are larger than standard size
            let isAdPattern = false;
            if (imgWidth > 120 || imgHeight > 50) {
              let isFloating = false;
              if (anchor.parentElement) {
                const parentStyle = window.getComputedStyle(anchor.parentElement);
                isFloating = parentStyle.position === 'fixed' || parentStyle.position === 'absolute';
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
            const parent = anchor.parentElement;
            if (parent && parent.tagName.toLowerCase() === 'div') {
              const parentStyle = window.getComputedStyle(parent);
              const isFloating = parentStyle.position === 'fixed' || parentStyle.position === 'absolute';
              if (isFloating && parent.innerText.trim().length < 50) {
                elementToHide = parent;
              }
            }

            if (!elementToHide.hasAttribute('data-ad-blocked')) {
              elementToHide.setAttribute('data-ad-blocked', 'true');
              elementToHide.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
              console.log('[Anti Pop-Under] Hide Ad:', href);
          
              safeSendMessage({
                type: 'AD_BLOCKED',
                url: href,
                reason: 'Ẩn banner quảng cáo'
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
            if (!iframe.hasAttribute('data-ad-blocked')) {
              iframe.setAttribute('data-ad-blocked', 'true');
              iframe.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
              console.log('[Anti Pop-Under] Hide Iframe:', src);
          
              safeSendMessage({
                type: 'AD_BLOCKED',
                url: src,
                reason: 'Ẩn khung quảng cáo'
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

      // Verify children
      el.querySelectorAll('a').forEach(checkAnchor);
      el.querySelectorAll('iframe').forEach(checkIframe);
    }

    // Scans and removes all ads currently in the document
    function scanAndRemoveAds() {
      checkAndHideElement(document.body || document.documentElement);
    }

    // Set up MutationObserver to intercept elements as they are created and inserted into the DOM
    try {
      const observer = new MutationObserver((mutations) => {
        const isEnabled = currentEnabledState;
        if (!isEnabled) return;

        // Skip dynamic ad checks on YouTube to prevent hiding core UI elements
        if (window.location.hostname.includes('youtube.com')) return;

        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Only element nodes
              checkAndHideElement(node);
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

    // YouTube Ad Skipper logic has been moved to inject.js (Main World) to allow direct access to the YouTube player.skipAd() API.

    // Fallbacks and periodic sweep to catch missed ads on normal pages
    window.addEventListener('DOMContentLoaded', () => {
      if (window.location.hostname.includes('youtube.com')) return;
      scanAndRemoveAds();
      setInterval(scanAndRemoveAds, 1500);
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
