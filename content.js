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

let customWhitelistedDomains = [];

function isCurrentPageWhitelisted() {
  try {
    const host = window.location.hostname.toLowerCase();
    const isHardcoded = whitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain));
    const isCustom = (customWhitelistedDomains || []).some(domain => host === domain || host.endsWith('.' + domain) || domain.endsWith('.' + host));
    return isHardcoded || isCustom || !currentEnabledState;
  } catch (e) {
    return false;
  }
}

const adSelectors = [
  // General explicit ad classes and IDs
  '.adsbox', '.ad-banner', '.sponsored-post', '.sponsored-ad',
  '.ad-slot', '.ads-slot', '.ad-holder', '.ads-holder',
  
  // Specific iframe ad networks
  'iframe[src*="adserver"]', 'iframe[src*="doubleclick"]', 'iframe[src*="adsterra"]',
  'iframe[src*="exoclick"]', 'iframe[src*="popads"]', 'iframe[src*="popcash"]',
  'iframe[src*="onclick"]', 'iframe[src*="greatcpmgate"]', 'iframe[src*="highcpmgate"]',
  
  // Specific ad container matchers
  'div[class*="banner-ad"]', 'div[class*="sponsored-post"]', 'div[class*="sponsored-ad"]',
  'div[class*="ad-placement"]', 'div[class*="ad-slot"]', 'div[class*="ads-slot"]',
  
  // Vietnamese specific ad classes (quangcao)
  '.quangcao', '.quang-cao',
  'div[class*="quangcao"]', 'div[class*="quang-cao"]', 'div[id*="quangcao"]',
  'div[id*="quang-cao"]',
  
  // Floating, catfish, and sticky ads
  '.catfish-ad', '[class*="catfish-ad"]', '[id*="catfish-ad"]',
  '.floating-ad', '[class*="floating-ad"]', '[id*="floating-ad"]',
  '.float-banner', '[class*="float-banner"]', '[id*="float-banner"]',
  '.sticky-ad', '[class*="sticky-ad"]', '[id*="sticky-ad"]',
  '#floating_left', '#floating_right', '.floating-left-ad', '.floating-right-ad',
  '#floating-left-ad', '#floating-right-ad', '#box-ad-banner', '#ad_center_banner',
  
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
  }
  
  /* Bảo vệ hiển thị (visibility/opacity) trình phát phim — KHÔNG ép pointer-events
     vì nhiều player dùng pointer-events: none trên overlay nội bộ để click xuyên qua video */
  video, canvas,
  .jwplayer, .plyr, .video-js, .vjs-controls, .vjs-control-bar, .flowplayer, .artplayer, .dplayer,
  .vjs-time-control, .vjs-current-time, .vjs-duration, .vjs-time-divider, .vjs-remaining-time,
  .jw-controlbar, .jw-text-elapsed, .jw-text-duration, .jw-slider-time, .jw-progress, .jw-time-tip,
  .plyr__time, .plyr__progress, .plyr__controls,
  .art-time, .art-control-time, .art-controls,
  .dplayer-time, .dplayer-controller,
  [class*="player"], [id*="player"],
  [class*="video"], [id*="video"],
  [class*="control"], [id*="control"],
  [class*="seekbar"], [id*="seekbar"],
  [class*="time"], [id*="time"],
  [class*="duration"], [id*="duration"],
  [class*="progress"], [id*="progress"],
  [class*="slider"], [id*="slider"],
  [class*="timeline"], [id*="timeline"] {
    visibility: visible !important;
    opacity: 1 !important;
  }

  /* Chỉ ép pointer-events: auto lên thẻ video và iframe trực tiếp */
  video {
    pointer-events: auto !important;
  }

  /* Bảo vệ tuyệt đối iframe trình phát phim */
  iframe[src*="player"], iframe[src*="embed"], iframe[src*="stream"], iframe[src*="video"],
  iframe[class*="player"], iframe[id*="player"] {
    display: block !important;
    visibility: visible !important;
    pointer-events: auto !important;
    opacity: 1 !important;
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

function restoreBlockedElements() {
  try {
    const blockedElements = document.querySelectorAll('[data-ad-blocked="true"]');
    blockedElements.forEach(el => {
      el.removeAttribute('data-ad-blocked');
      el.style.display = '';
      el.style.visibility = '';
      el.style.pointerEvents = '';
      el.style.opacity = '';
    });
  } catch(e) {}
}

// Set attribute on <html> element so inject.js can read it and handle CSS injection
function updateEnabledState(enabled, disabledDomains) {
  const host = window.location.hostname.toLowerCase();
  customWhitelistedDomains = disabledDomains || [];
  const isWhitelisted = customWhitelistedDomains.some(domain => host === domain || host.endsWith('.' + domain) || domain.endsWith('.' + host));
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
    restoreBlockedElements();
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
      'googleadservices', 'ad-delivery', 'adservice', 'astrology', 'backlight', 'inless',
      '\\?ab=', '&ab=', '&rl=', '\\?rl=', 'zoneid=', 'pubid=', 'subid=', 'placement=', 'direct_link'
    ];

    // Compile regexes once for high-performance scanning
    const gamblingRegex = new RegExp(gamblingKeywords.join('|'), 'i');
    const adUrlRegex = new RegExp(adUrlKeywords.join('|'), 'i');

    // Helper to check if element is a video player, video control bar, or time/progress display
    function isVideoPlayerOrControls(el) {
      if (!el || el === document || el === document.body || el === document.documentElement) return false;
      try {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (['video', 'audio', 'canvas', 'source', 'track'].includes(tag)) return true;
        if (el.querySelector && el.querySelector('video, audio, canvas')) return true;

        const elId = (el.id || '').toLowerCase();
        const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
        
        const keywords = [
          'player', 'video', 'control', 'jwplayer', 'plyr', 'artplayer', 'dplayer', 'vjs', 'media', 'vp-', 'ytp-',
          'time', 'progress', 'duration', 'seekbar', 'slider', 'timeline', 'halim', 'elapsed', 'scrubber', 'seek', 'track', 'thumb', 'volume', 'buffer', 'play', 'pause', 'fullscreen'
        ];

        if (keywords.some(kw => elId.includes(kw) || elClass.includes(kw))) {
          // If it is inside or near a player container
          if (el.closest && el.closest('.jwplayer, .plyr, .video-js, .vjs-, .flowplayer, .artplayer, .dplayer, [class*="player"], [id*="player"], [class*="video"], [id*="video"]')) {
            return true;
          }
          if (elId.includes('player') || elId.includes('video') || elId.includes('control') || elClass.includes('player') || elClass.includes('video') || elClass.includes('control') || elClass.includes('time') || elClass.includes('progress') || elClass.includes('duration')) {
            return true;
          }
        }
      } catch(e) {}
      return false;
    }

    // Checks a single element and its inner children to hide it if it's an ad
    function checkAndHideElement(el) {
      if (!el || el.nodeType !== 1) return;

      const tag = el.tagName;
      if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'CANVAS' || tag === 'SOURCE' || tag === 'TRACK' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG' || tag === 'PATH') return;

      const isEnabled = currentEnabledState;
      if (!isEnabled) return;

      if (isCurrentPageWhitelisted()) return;

      // NEVER hide video players or player control bars
      if (isVideoPlayerOrControls(el)) return;

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
            const imgSrc = (img.src || '').toLowerCase();
            if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('blob:')) {
              // Explicit ad image keywords only (never rely on width/height ratios)
              const imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => imgSrc.includes(kw)) ||
                                   imgSrc.includes('/ads/') || imgSrc.includes('_ad_') || imgSrc.includes('-ad-');
              if (imgMatchesAd) {
                isAd = true;
              }
            }
          }

          if (isAd) {
            let elementToHide = anchor;
            let curr = anchor.parentElement;
            let depth = 0;

            // Traverse up up to 6 parent levels to find the outermost floating backdrop / overlay container
            while (curr && curr !== document.body && curr !== document.documentElement && depth < 6) {
              depth++;
              // STOP parent traversal immediately if we reach a video player or control bar!
              if (isVideoPlayerOrControls(curr)) {
                break;
              }

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAdWrapper = isFloating ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || currClass.includes('overlay') || currClass.includes('banner') || currClass.includes('float') || currClass.includes('catfish') || currClass.includes('modal') || currClass.includes('fixed') || currClass.includes('inset-0') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || currId.includes('overlay') || currId.includes('banner') || currId.includes('float') || currId.includes('catfish') || currId.includes('modal');

              if (isAdWrapper && (curr.innerText || '').trim().length < 150) {
                elementToHide = curr;
              }
              curr = curr.parentElement;
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
          // Never hide movie player iframes
          if (srcLower.includes('player') || srcLower.includes('embed') || srcLower.includes('stream') || srcLower.includes('video') || srcLower.includes('watch') || srcLower.includes('film') || srcLower.includes('movie') || srcLower.includes('vids') || srcLower.includes('hls') || srcLower.includes('m3u8') || srcLower.includes('mp4') || srcLower.includes('halim') || srcLower.includes('play')) {
            return;
          }

          const isAdIframe = adUrlRegex.test(srcLower) ||
                             gamblingRegex.test(srcLower);

          if (isAdIframe) {
            let elementToHide = iframe;
            let curr = iframe.parentElement;
            let depth = 0;

            // Traverse up up to 6 parent levels to find outer floating overlay/backdrop wrapper
            while (curr && curr !== document.body && curr !== document.documentElement && depth < 6) {
              depth++;
              // STOP parent traversal immediately if we reach a video player or control bar!
              if (isVideoPlayerOrControls(curr)) {
                break;
              }

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAdWrapper = isFloating ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || currClass.includes('overlay') || currClass.includes('banner') || currClass.includes('float') || currClass.includes('catfish') || currClass.includes('modal') || currClass.includes('fixed') || currClass.includes('inset-0') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || currId.includes('overlay') || currId.includes('banner') || currId.includes('float') || currId.includes('catfish') || currId.includes('modal');

              if (isAdWrapper && (curr.innerText || '').trim().length < 150) {
                elementToHide = curr;
              }
              curr = curr.parentElement;
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

      // Helper to verify and hide an img tag (safely ignores base64/blob)
      const checkImg = (img) => {
        if (img.hasAttribute('data-ad-blocked')) return;
        try {
          const src = (img.src || '').toLowerCase();
          if (src.startsWith('data:') || src.startsWith('blob:')) return; // CRITICAL: Protect UI icons
          
          const alt = (img.getAttribute('alt') || '').toLowerCase();
          
          const imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => src.includes(kw)) ||
                               src.includes('/ads/') || src.includes('_ad_') || src.includes('-ad-') ||
                               alt.includes('quảng cáo') || alt.includes('sponsor');
                               
          if (imgMatchesAd) {
            let elementToHide = img;
            let curr = img.parentElement;
            let depth = 0;
            
            while (curr && curr !== document.body && curr !== document.documentElement && depth < 6) {
              depth++;
              if (isVideoPlayerOrControls(curr)) break;

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              
              const isAdWrapper = isFloating ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || currClass.includes('overlay') || currClass.includes('banner') || currClass.includes('float') || currClass.includes('catfish') || currClass.includes('modal') || currClass.includes('fixed') || currClass.includes('inset-0') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || currId.includes('overlay') || currId.includes('banner') || currId.includes('float') || currId.includes('catfish') || currId.includes('modal');

              if (isAdWrapper && (curr.innerText || '').trim().length < 150) {
                elementToHide = curr;
              }
              curr = curr.parentElement;
            }

            if (!elementToHide.hasAttribute('data-ad-blocked')) {
              elementToHide.setAttribute('data-ad-blocked', 'true');
              elementToHide.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
              console.log('[Anti Pop-Under] Hide Ad Image & Wrapper:', src, elementToHide);
            }
          }
        } catch (e) {}
      };

      // Helper to hide explicit ad elements by aria-label
      const hideExplicitAd = (el) => {
        if (!el || el.hasAttribute('data-ad-blocked')) return;
        try {
          if (isVideoPlayerOrControls(el)) return;
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
          const title = (el.getAttribute('title') || '').toLowerCase();
          if (ariaLabel === 'quảng cáo' || ariaLabel.includes('quảng cáo ') || ariaLabel.includes('sponsor') || title === 'quảng cáo' || title.includes('quảng cáo ') || title.includes('sponsor')) {
            el.setAttribute('data-ad-blocked', 'true');
            el.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
          }
        } catch(e) {}
      };

      // Verify element itself
      if (tagName === 'a') {
        checkAnchor(el);
      } else if (tagName === 'iframe') {
        checkIframe(el);
      } else if (tagName === 'img') {
        checkImg(el);
      }
      hideExplicitAd(el);

      // Verify children only if element has child elements
      if (el.childElementCount > 0) {
        el.querySelectorAll('a').forEach(checkAnchor);
        el.querySelectorAll('iframe').forEach(checkIframe);
        el.querySelectorAll('img').forEach(checkImg);
        el.querySelectorAll('[aria-label*="uảng cáo" i], [aria-label*="ponsor" i], [title*="uảng cáo" i], [title*="ponsor" i]').forEach(hideExplicitAd);
      }
    }

    // Helper to detect ad close buttons (e.g. <button aria-label="Đóng">✕</button>)
    function isAdCloseButton(el) {
      if (!el) return false;
      try {
        const aria = (el.getAttribute('aria-label') || '').toLowerCase();
        if (aria === 'đóng' || aria === 'close' || aria === 'tắt' || aria.includes('đóng quảng cáo') || aria.includes('close ad')) return true;
        const text = (el.innerText || el.textContent || '').trim();
        if (text === '✕' || text === '×' || text === 'X' || text.toLowerCase() === 'close' || text.toLowerCase() === 'đóng') {
          return true;
        }
      } catch(e) {}
      return false;
    }

    // Cleans up orphaned backdrop overlays (darkened backgrounds left behind by blocked ads and floating close buttons)
    function cleanOrphanedBackdrops() {
      if (!currentEnabledState || isCurrentPageWhitelisted()) return;
      try {
        const overlays = document.querySelectorAll('div, section, dialog');
        overlays.forEach(el => {
          if (el.hasAttribute('data-ad-blocked')) return;

          // NEVER touch video players or control bars
          if (isVideoPlayerOrControls(el)) return;

          const style = window.getComputedStyle(el);
          const isFloating = style.position === 'fixed' || style.position === 'absolute';
          if (!isFloating) return;

          const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
          const elId = (el.id || '').toLowerCase();

          const isOverlayClass = elClass.includes('ad-overlay') || elClass.includes('overlay-ad') || elClass.includes('ad-backdrop') || elClass.includes('popup-backdrop') || elClass.includes('modal-backdrop') ||
                                 elId.includes('ad-overlay') || elId.includes('overlay-ad') || elId.includes('ad-backdrop') || elClass.includes('catfish');

          if (!isOverlayClass) return;

          // Never touch genuine site popups (like login, auth, video player, search dialogs)
          if (el.closest('form, nav, header, [class*="login"], [class*="auth"], [class*="user"], [class*="account"], [id*="login"], [id*="auth"]')) return;

          const allChildren = el.querySelectorAll('*');
          let hasGenuineContent = false;

          for (let i = 0; i < allChildren.length; i++) {
            const child = allChildren[i];
            if (child.hasAttribute('data-ad-blocked')) continue;

            if (isAdCloseButton(child)) continue;

            const childTag = child.tagName.toLowerCase();
            if (['input', 'select', 'textarea', 'form'].includes(childTag)) {
              hasGenuineContent = true;
              break;
            }

            const text = (child.innerText || child.textContent || '').trim();
            if (text.length > 40) {
              hasGenuineContent = true;
              break;
            }

            if (childTag === 'img' || childTag === 'iframe' || childTag === 'video') {
              if (!child.hasAttribute('data-ad-blocked')) {
                hasGenuineContent = true;
                break;
              }
            }

            if (childTag === 'a') {
              if (!child.hasAttribute('data-ad-blocked')) {
                const href = child.href || '';
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                  try {
                    const host = new URL(href, window.location.href).hostname;
                    if (host === window.location.hostname && text.length > 0) {
                      hasGenuineContent = true;
                      break;
                    }
                  } catch(e) {}
                }
              }
            }
          }

          if (!hasGenuineContent) {
            el.setAttribute('data-ad-blocked', 'true');
            el.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
            console.log('[Anti Pop-Under] Hide orphaned overlay backdrop & close button:', el);

            // Restore scroll locks if body/html was locked
            if (document.body && document.body.style.overflow === 'hidden') document.body.style.overflow = '';
            if (document.documentElement && document.documentElement.style.overflow === 'hidden') document.documentElement.style.overflow = '';
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
      if (!node || node.nodeType !== 1) return;

      // INSTANT SHORT-CIRCUIT: Skip player controls, seekbars, time text, and video elements completely!
      if (isVideoPlayerOrControls(node)) return;

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
        let isPlaying = false;
        const video = document.querySelector('video');
        if (video && !video.paused) isPlaying = true;
        
        const iframes = document.querySelectorAll('iframe');
        for (let i = 0; i < iframes.length; i++) {
          const src = (iframes[i].src || '').toLowerCase();
          if (src.includes('player') || src.includes('video') || src.includes('embed') || src.includes('watch') || src.includes('play') || src.includes('stream') || src.includes('hls') || src.includes('m3u8') || src.includes('movie') || src.includes('film') || src.includes('vids')) {
            isPlaying = true;
            break;
          }
        }
        
        if (isPlaying) return; // Pause background scan during active movie playback
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
