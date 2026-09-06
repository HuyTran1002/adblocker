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
  '.mgid-widget', '.taboola-ad', '.outbrain-ad', '.criteo-ad',

  // Adult ad network tags (ExoClick, Monetag, PropellerAds) & anti-adblock overlays
  'ins[data-zoneid]', 'ins[class*="eas"]', 'div[class*="video-slider"]', '[id*="video-slider"]',
  'iframe[src*="smartpop"]', 'iframe[src*="mnaspm"]', 'iframe[src*="mayzaent"]',
  'iframe[src*="magsrv"]', 'iframe[src*="prplad"]', '#adbd', '.overdiv',

  // VnSexTop1 & Adspro network banners
  '#popBannerAds', '#topBannerContainer', '#bottomBannerContainer', '#underPlayerAdsContainer',
  '.under-player-banner', '.top-banner-wrapper', '.bottom-banner-wrapper', '.top-banner-item',
  '.bottom-banner-item', '.pop-banner-close-btn', '.top-banner-close-btn', '.bottom-banner-close-btn',
  'img[src*="adspro.name"]'
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
  
  /* === PRE-BLOCK: Hide ad elements by domain BEFORE they render (zero flash) === */
  
  /* Ad network iframes - block at CSS level before JS can scan */
  iframe[src*="doubleclick"], iframe[src*="googlesyndication"], iframe[src*="googleadservices"],
  iframe[src*="adsterra"], iframe[src*="exoclick"], iframe[src*="popads"], iframe[src*="popcash"],
  iframe[src*="propellerads"], iframe[src*="juicyads"], iframe[src*="jads.co"],
  iframe[src*="9splt.com"], iframe[src*="playhubconnect"], iframe[src*="cm8806.com"],
  iframe[src*="monetag"], iframe[src*="hilltopads"], iframe[src*="galaksion"],
  iframe[src*="clickadu"], iframe[src*="admaven"], iframe[src*="richads"],
  iframe[src*="onclickads"], iframe[src*="clktag"], iframe[src*="adserver"],
  iframe[src*="popunder"], iframe[src*="adtrue"], iframe[src*="adflex"],
  iframe[src*="eclick.vn"], iframe[src*="novanet.vn"], iframe[src*="mgid"],
  iframe[src*="taboola"], iframe[src*="outbrain"], iframe[src*="yuelongyy"],
  iframe[src*="linkroyal"], iframe[src*="abroadad"],
  iframe[src*="getjuicy"], iframe[src*="magsrv"],
  iframe[src*="mnaspm"], iframe[src*="mayzaent"], iframe[src*="prplad"], iframe[src*="smartpop"],
  ins[data-zoneid], ins[class*="eas"], div[class*="video-slider"], #adbd, .overdiv,
  #popBannerAds, #topBannerContainer, #bottomBannerContainer, #underPlayerAdsContainer,
  .under-player-banner, .top-banner-wrapper, .bottom-banner-wrapper {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Ad network images - prevent flash */
  img[src*="playhubconnect"], img[src*="juicyads"], img[src*="jads.co"],
  img[src*="adsterra"], img[src*="exoclick"], img[src*="adserver"],
  img[src*="abroadad.cache.wpscdn"], img[src*="streamvl.top/file/"],
  img[src*="cm8806.com"], img[src*="9splt.com"], img[src*="yuelongyy"] {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Ad network video elements - prevent pre-roll/overlay flash */
  video[src*="playhubconnect"], video[src*="adserver"], video[src*="popunder"],
  video[src*="juicyads"], video[src*="9splt.com"], video[src*="cm8806.com"] {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Ad network anchor links - prevent clickable ad areas from showing */
  a[href*="juicyads"], a[href*="jads.co"], a[href*="getjuicy"],
  a[href*="exoclick"], a[href*="adsterra"], a[href*="popads"],
  a[href*="popcash"], a[href*="propellerads"], a[href*="onclickads"],
  a[href*="adserver"], a[href*="doubleclick"], a[href*="cpmgate"],
  a[href*="profitablecpm"], a[href*="clktag"] {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* === END PRE-BLOCK === */

  /* Chỉ ép pointer-events: auto lên thẻ video và iframe trực tiếp */
  video:not([src*="playhubconnect"]):not([src*="adserver"]):not([src*="9splt"]):not([src*="juicyads"]) {
    pointer-events: auto !important;
  }

  /* Bảo vệ tuyệt đối iframe trình phát phim */
  iframe[src*="player"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="embed"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="stream"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="video"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[class*="player"], iframe[id*="player"],
  #player-wrapper iframe, .player iframe, [class*="player"] iframe, [id*="player"] iframe {
    display: block !important;
    visibility: visible !important;
    pointer-events: auto !important;
    opacity: 1 !important;
    height: 100% !important;
    min-height: 200px !important;
    max-height: none !important;
    width: 100% !important;
  }`;
  (document.head || document.documentElement).appendChild(style);
}

function injectYouTubeAdBlockCSS() {
  if (document.getElementById('anti-popunder-youtube-css')) return;
  const style = document.createElement('style');
  style.id = 'anti-popunder-youtube-css';
  style.textContent = `
    /* 1. Hide anti-adblock enforcement dialogs & backdrops */
    ytd-enforcement-message-renderer,
    ytd-enforcement-message-view-model,
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
    tp-yt-paper-dialog:has(ytd-enforcement-message-renderer),
    tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model),
    #error-screen.ytd-watch-flexy {
      display: none !important;
    }

    /* 2. AdGuard-grade YouTube Banner, Masthead, In-feed, Grid, and Overlay Ad Hiding */
    #masthead-ad,
    ytd-ad-slot-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-banner-promo-renderer,
    .ytd-promoted-video-renderer,
    ytd-statement-banner-renderer,
    ytd-action-companion-ad-renderer,
    ytd-companion-ad-renderer,
    ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
    ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
    ytd-rich-item-renderer:has(ytd-in-feed-ad-layout-renderer),
    ytd-rich-section-renderer:has(ytd-statement-banner-renderer),
    ytd-rich-section-renderer:has(ytd-brand-video-singleton-renderer),
    ytd-reel-video-renderer:has(ytd-ad-slot-renderer),
    .ytp-ad-overlay-container,
    .ytp-ad-message-container,
    .ytp-ad-image-overlay,
    .ytp-ad-text-overlay,
    #player-ads,
    ytd-promoted-sparkles-web-renderer,
    ytd-display-ad-renderer,
    #items.ytd-ad-slot-renderer,
    ytd-brand-video-singleton-renderer,
    ytd-video-masthead-ad-v3-renderer {
      display: none !important;
      height: 0 !important;
      min-height: 0 !important;
      max-height: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
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
      refreshDynamicCosmetics();
    }
  } else {
    if (styleTag) styleTag.remove();
    if (ytStyleTag) ytStyleTag.remove();
    const dynTag = document.getElementById('adblock-max-dynamic-cosmetics');
    if (dynTag) dynTag.remove();
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
      'sv388', 'vz99', 'loto188', 'k9win', 'fabet', 'oxbet', 'debet', 'may88',
      'rr88', 'go88', 'sunwin', 'hitclub', 'rikvip', 'b52', '789club', 'kuwin', 
      'thabet', 'bk8', 'k8', 'j88', 'mb66', 'gk88', 'pg88', '88clb', 'cwin', 'win88', 'sc88'
    ];

    const adUrlKeywords = [
      'adserver', 'popunder', 'greatcpmgate', 'highcpmgate', 'onclickads', 
      'clktag', 'exoclick', 'eclick.vn', 'novanet.vn', 'adsterra', 'popads', 'popcash',
      'cpmrate', 'cpmnetwork', 'cpmgate', 'profitablecpm', 'profitablecpmratenetwork',
      'hilltopads', 'galaksion', 'monetag', 'admaven', 'clickadu', 'richads', 'propush',
      'popmyads', 'adtrue', 'adflex', 'syndication', 'doubleclick', 'googlesyndication',
      'googleadservices', 'ad-delivery', 'adservice', 'astrology', 'backlight', 'inless',
      '\\?ab=', '&ab=', '&rl=', '\\?rl=', 'zoneid=', 'pubid=', 'subid=', 'placement=', 'direct_link',
      'playhubconnect.com', 'cm8806.com', 'linkroyal.workers.dev',
      'abroadad.cache.wpscdn.com', 'propellerads',
      'jads.co', '9splt.com', 'yuelongyy.com', 'juicyads', 'getjuicy',
      'vast.xml', 'vpaid', '/vast/', 'vast_tag', 'vastxml', 'adxml',
      '/static/video/bn/'
    ];

    // Compile regexes once for high-performance scanning
    const gamblingRegex = new RegExp(gamblingKeywords.join('|'), 'i');
    const adUrlRegex = new RegExp(adUrlKeywords.join('|'), 'i');

    // Helper to check if a video is actually an ad
    function isAdVideo(video) {
      if (!video) return false;
      try {
        const src = (video.src || '').toLowerCase();
        const poster = (video.getAttribute('poster') || '').toLowerCase();
        return ['quangcao', 'adserver', 'popunder'].some(kw => src.includes(kw) || poster.includes(kw)) ||
               src.includes('/ads/') || src.includes('_ad_') || src.includes('-ad-') ||
               poster.includes('/ads/') || poster.includes('_ad_') || poster.includes('-ad-') ||
               gamblingRegex.test(src) || gamblingRegex.test(poster) ||
               adUrlRegex.test(src) || adUrlRegex.test(poster);
      } catch(e) {
        return false;
      }
    }

    // Helper to check if element is a video player, video control bar, or time/progress display
    function isVideoPlayerOrControls(el) {
      if (!el || el === document || el === document.body || el === document.documentElement) return false;
      try {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (['audio', 'canvas', 'source', 'track'].includes(tag)) return true;
        if (tag === 'video' && !isAdVideo(el)) return true;
        
        if (el.querySelector) {
          const videos = el.querySelectorAll('video');
          if (videos.length > 0) {
            for (let i = 0; i < videos.length; i++) {
              if (!isAdVideo(videos[i])) return true;
            }
          } else if (el.querySelector('audio, canvas')) {
            return true;
          }
        }

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
      if (tag === 'AUDIO' || tag === 'CANVAS' || tag === 'SOURCE' || tag === 'TRACK' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'SVG' || tag === 'PATH') return;
      if (tag === 'VIDEO' && !isAdVideo(el)) return;

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
          const rel = (anchor.getAttribute('rel') || '').toLowerCase();
          const hasAdAttributes = Array.from(anchor.attributes).some(attr => {
            const name = attr.name.toLowerCase();
            return name.includes('ad_id') || name.includes('ad-id') || 
                   name.includes('ad_slot') || name.includes('ad-slot');
          });

          if (matchesGambling || matchesAdServer || rel.includes('sponsored') || hasAdAttributes) {
            isAd = true;
          } else if (hasImage) {
            const imgSrc = (img.src || '').toLowerCase();
            const imgAlt = (img.getAttribute('alt') || '').toLowerCase();
            
            if (/\b(ads|ad)\b/i.test(imgAlt) || imgAlt.includes('quảng cáo') || imgAlt.includes('sponsor')) {
              isAd = true;
            } else if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('blob:')) {
              // Explicit ad image keywords only (never rely on width/height ratios)
              const imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => imgSrc.includes(kw)) ||
                                   imgSrc.includes('/ads/') || imgSrc.includes('_ad_') || imgSrc.includes('-ad-') ||
                                   gamblingRegex.test(imgSrc) || adUrlRegex.test(imgSrc);
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
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor || isFloating ||
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
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor || isFloating ||
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

      // Helper to verify and hide an ad video tag
      const checkVideo = (video) => {
        if (video.hasAttribute('data-ad-blocked')) return;
        try {
          if (isAdVideo(video)) {
            let elementToHide = video;
            let curr = video.parentElement;
            let depth = 0;
            
            while (curr && curr !== document.body && curr !== document.documentElement && depth < 6) {
              depth++;
              if (isVideoPlayerOrControls(curr)) break;

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor || isFloating ||
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
              console.log('[Anti Pop-Under] Hide Ad Video & Wrapper:', video.src, elementToHide);
              
              safeSendMessage({
                type: 'AD_BLOCKED',
                url: video.src || 'video-ad',
                reason: 'Ẩn video quảng cáo & lớp mờ'
              });
            }
          }
        } catch (e) {}
      };

      // Helper to verify and hide an img tag (safely ignores base64/blob)
      const checkImg = (img) => {
        if (img.hasAttribute('data-ad-blocked')) return;
        try {
          const src = (img.src || '').toLowerCase();
          const alt = (img.getAttribute('alt') || '').toLowerCase();
          
          let imgMatchesAd = false;
          if (/\b(ads|ad)\b/i.test(alt) || alt.includes('quảng cáo') || alt.includes('sponsor')) {
            imgMatchesAd = true;
          } else if (!src.startsWith('data:') && !src.startsWith('blob:')) {
            imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => src.includes(kw)) ||
                           src.includes('/ads/') || src.includes('_ad_') || src.includes('-ad-') ||
                           gamblingRegex.test(src) || adUrlRegex.test(src);
          }
                               
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
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor || isFloating ||
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
      } else if (tagName === 'video') {
        checkVideo(el);
      }
      hideExplicitAd(el);

      // Verify children only if element has child elements
      if (el.childElementCount > 0) {
        el.querySelectorAll('a').forEach(checkAnchor);
        el.querySelectorAll('iframe').forEach(checkIframe);
        el.querySelectorAll('img').forEach(checkImg);
        el.querySelectorAll('video').forEach(checkVideo);
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


    // --- GLOBAL CLICK INTERCEPTOR (ANTI-CLICKJACKING) ---
    document.addEventListener('click', function(e) {
      if (!currentEnabledState || isCurrentPageWhitelisted()) return;
      try {
        let target = e.target;
        if (!target || target.nodeType !== 1) return;

        // 1. Detect if click is inside an anchor (<a>)
        let anchor = null;
        let curr = target;
        while (curr && curr !== document.body && curr !== document.documentElement) {
          if (curr.tagName === 'A') {
            anchor = curr;
            break;
          }
          curr = curr.parentElement;
        }

        if (anchor) {
          const href = anchor.href || '';
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
          
          try {
            const targetUrl = new URL(href, window.location.href);
            const currentHost = window.location.hostname.replace(/^www\./i, '');
            const targetHost = targetUrl.hostname.replace(/^www\./i, '');
            
            const isExternal = targetHost !== currentHost && !currentHost.endsWith('.' + targetHost) && !targetHost.endsWith('.' + currentHost);
            
            if (isExternal) {
              const style = window.getComputedStyle(anchor);
              const rect = anchor.getBoundingClientRect();
              
              // Check if it's a huge overlay (covers > 40% of screen)
              const isHuge = rect.width > window.innerWidth * 0.4 || rect.height > window.innerHeight * 0.4;
              const opacity = parseFloat(style.opacity);
              const isTransparent = opacity < 0.1 || style.visibility === 'hidden' || style.display === 'none';
              
              // Block HUGE external links (rarely legitimate)
              if (isHuge || isTransparent) {
                e.preventDefault();
                e.stopPropagation();
                anchor.remove();
                console.log('[Anti Pop-Under] Intercepted and destroyed huge clickjacking anchor:', anchor);
                return;
              }
              
              // Block EMPTY external links (often used to clickjack small buttons)
              const text = (anchor.innerText || anchor.textContent || '').trim();
              const mediaCount = anchor.querySelectorAll('img, svg, canvas, video').length;
              if (text.length === 0 && mediaCount === 0) {
                e.preventDefault();
                e.stopPropagation();
                anchor.remove();
                console.log('[Anti Pop-Under] Intercepted and destroyed empty clickjacking anchor:', anchor);
                return;
              }
            }
          } catch (err) {}
        } else {
          // 2. Detect if click is on a huge invisible DIV/SECTION overlay
          const style = window.getComputedStyle(target);
          const isFloating = style.position === 'absolute' || style.position === 'fixed';
          
          if (isFloating) {
            const rect = target.getBoundingClientRect();
            const isHuge = rect.width > window.innerWidth * 0.4 || rect.height > window.innerHeight * 0.4;
            
            if (isHuge) {
              const opacity = parseFloat(style.opacity);
              const bgColor = style.backgroundColor;
              const isTransparent = opacity < 0.1 || bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent';
              
              const text = (target.innerText || target.textContent || '').trim();
              
              if (isTransparent && text.length < 50) {
                // Before destroying, ensure it's NOT a legitimate video player overlay (e.g. play/pause click zone)
                let c = target;
                let inPlayer = false;
                while (c && c !== document.body && c !== document.documentElement) {
                  if (isVideoPlayerOrControls(c)) {
                    inPlayer = true;
                    break;
                  }
                  c = c.parentElement;
                }
                
                if (!inPlayer) {
                  e.preventDefault();
                  e.stopPropagation();
                  target.remove();
                  console.log('[Anti Pop-Under] Intercepted and destroyed huge invisible clickjacking div:', target);
                }
              }
            }
          }
        }
      } catch (err) {}
    }, true); // Use capture phase to intercept before page scripts

    // --- MANUAL ELEMENT BLOCKER & TARGET MODE (Element Picker) ---
    let lastRightClickedElement = null;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isTargetPickerActive = false;
    let currentHoveredTarget = null;
    let pickerOverlay = null;
    let pickerBadge = null;
    let pickerCleanup = null;

    // Track mouse coordinates & right-click target aggressively before page scripts can intercept
    window.addEventListener('mousemove', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }, { capture: true, passive: true });

    window.addEventListener('mousedown', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      if (e.button === 2) {
        lastRightClickedElement = e.target;
      }
    }, { capture: true, passive: true });

    window.addEventListener('contextmenu', (e) => {
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      lastRightClickedElement = e.target;
    }, { capture: true });

    // Show floating toast notification on web page
    function showToast(message, isSuccess = true) {
      const mount = document.body || document.documentElement;
      if (!mount) return;
      let toast = document.getElementById('adblock-max-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adblock-max-toast';
        toast.style.cssText = `
          position: fixed !important;
          bottom: 30px !important;
          left: 50% !important;
          transform: translateX(-50%) translateY(20px) !important;
          background: rgba(15, 23, 42, 0.96) !important;
          color: #ffffff !important;
          border: 1px solid ${isSuccess ? 'rgba(16, 185, 129, 0.6)' : 'rgba(244, 63, 94, 0.6)'} !important;
          border-radius: 10px !important;
          padding: 10px 18px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7) !important;
          z-index: 2147483647 !important;
          opacity: 0 !important;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          display: flex !important;
          align-items: center !important;
          gap: 8px !important;
          pointer-events: none !important;
          visibility: visible !important;
        `;
        mount.appendChild(toast);
      }
      toast.innerHTML = `<span style="font-size: 16px;">${isSuccess ? '✅' : 'ℹ️'}</span> <span>${message}</span>`;
      requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
      });
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(20px)';
      }, 3500);
    }

    // Helper to get clean human-readable class name
    function getCleanClassName(el) {
      if (!el || !el.classList || el.classList.length === 0) return null;
      const cleanClasses = Array.from(el.classList).filter(c => {
        if (typeof c !== 'string') return false;
        if (c.length < 3 || c.length > 28) return false;
        if (/\d{4,}/.test(c)) return false; // long random digits
        if (/^[a-f0-9]{8,}$/i.test(c)) return false; // hex hash
        return true;
      });
      return cleanClasses.length > 0 ? cleanClasses[0] : null;
    }

    // Generate concise, clean, and robust CSS selector
    function getRobustSelector(el) {
      if (!el || el === document.body || el === document.documentElement) return null;
      
      const tag = el.tagName.toLowerCase();

      // 1. Clean readable ID
      if (el.id && !/^\d/.test(el.id) && el.id.length < 35 && !/[0-9a-f]{8,}/i.test(el.id)) {
        return '#' + CSS.escape(el.id);
      }

      // 2. Specific data attribute (short)
      const dataId = el.getAttribute('data-id') || el.getAttribute('data-ad-id') || el.getAttribute('data-slot');
      if (dataId && dataId.length < 28) {
        return `${tag}[data-id="${CSS.escape(dataId)}"]`;
      }

      // 3. Image or iframe with concise src filename (strip long query string)
      const srcAttr = el.getAttribute('src');
      if (srcAttr && !srcAttr.startsWith('data:') && !srcAttr.startsWith('blob:') && srcAttr.length > 5) {
        try {
          const cleanUrl = srcAttr.split('?')[0].split('#')[0];
          const filename = cleanUrl.split('/').filter(Boolean).pop();
          if (filename && filename.length > 4 && filename.length < 32 && !/^[0-9]+$/.test(filename)) {
            return `${tag}[src*="${CSS.escape(filename)}"]`;
          }
        } catch (e) {}
      }

      // 4. Anchor with concise href (strip long query parameters)
      if (tag === 'a') {
        const hrefAttr = el.getAttribute('href');
        if (hrefAttr && !hrefAttr.startsWith('javascript:') && !hrefAttr.startsWith('#') && hrefAttr.length > 4) {
          try {
            const cleanHref = hrefAttr.split('?')[0].split('#')[0];
            const part = cleanHref.split('/').filter(Boolean).pop();
            if (part && part.length > 3 && part.length < 28) {
              return `a[href*="${CSS.escape(part)}"]`;
            }
          } catch (e) {}
        }
      }

      // 5. Clean class if unique or specific on page
      const cleanCls = getCleanClassName(el);
      if (cleanCls) {
        const candidate = `${tag}.${CSS.escape(cleanCls)}`;
        try {
          if (document.querySelectorAll(candidate).length <= 3) {
            return candidate;
          }
        } catch (e) {}
      }

      // 6. Up to 2 levels hierarchy max (parent > child)
      if (el.parentElement && el.parentElement !== document.body && el.parentElement !== document.documentElement) {
        const parent = el.parentElement;
        let parentSel = '';
        if (parent.id && !/^\d/.test(parent.id) && parent.id.length < 28) {
          parentSel = '#' + CSS.escape(parent.id);
        } else {
          const parentCls = getCleanClassName(parent);
          if (parentCls) {
            parentSel = `${parent.tagName.toLowerCase()}.${CSS.escape(parentCls)}`;
          }
        }

        if (parentSel) {
          const selfSel = cleanCls ? `${tag}.${CSS.escape(cleanCls)}` : tag;
          const combined = `${parentSel} > ${selfSel}`;
          if (combined.length < 45) return combined;
        }
      }

      // 7. Compact nth-of-type
      let sibling = el.previousElementSibling;
      let nth = 1;
      while (sibling) {
        if (sibling.tagName === el.tagName) nth++;
        sibling = sibling.previousElementSibling;
      }
      return `${tag}:nth-of-type(${nth})`;
    }

    function blockElement(el) {
      if (!el) return;
      const selector = getRobustSelector(el);
      if (!selector) return;

      el.setAttribute('style', 'display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important;');
      
      // Save to storage
      const domain = window.location.hostname;
      if (!isContextValid()) return;
      chrome.storage.local.get(['manualFilters', 'customBlockedSelectors'], (res) => {
        let filters = (res && res.manualFilters) ? res.manualFilters : {};
        if (!filters[domain]) filters[domain] = [];
        if (!filters[domain].includes(selector)) {
          filters[domain].push(selector);
          chrome.storage.local.set({ manualFilters: filters }, () => {
            refreshManualFilters();
          });
          
          // Report
          safeSendMessage({
            type: 'AD_BLOCKED',
            url: 'Phần tử chặn thủ công',
            reason: 'Người dùng chặn qua Menu'
          });
        }
      });
    }

    function startTargetPicker(initialElement, info) {
      // Ensure Target Picker UI only executes in the top window
      if (window.self !== window.top) {
        return;
      }

      // If already active, clean up previous instances first
      if (isTargetPickerActive) {
        stopTargetPicker();
      }
      isTargetPickerActive = true;

      const mount = document.body || document.documentElement;
      if (!mount) return;

      // Selection locking & hierarchy history
      let isLocked = false;
      let targetHistory = [];
      let historyIndex = 0;

      // Create highlight overlay
      if (!pickerOverlay) {
        pickerOverlay = document.createElement('div');
        pickerOverlay.id = 'adblock-max-target-overlay';
        pickerOverlay.style.cssText = `
          box-sizing: border-box !important;
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483646 !important;
          border: 3px solid #f43f5e !important;
          background: rgba(244, 63, 94, 0.22) !important;
          box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.6), 0 0 22px rgba(244, 63, 94, 0.5) !important;
          border-radius: 4px !important;
          transition: all 0.05s ease-out !important;
          visibility: visible !important;
          opacity: 1 !important;
          display: none;
        `;
        mount.appendChild(pickerOverlay);
      }

      // Create control badge
      if (!pickerBadge) {
        pickerBadge = document.createElement('div');
        pickerBadge.id = 'adblock-max-target-badge';
        pickerBadge.style.cssText = `
          position: fixed !important;
          bottom: 24px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          background: rgba(15, 23, 42, 0.96) !important;
          backdrop-filter: blur(12px) !important;
          -webkit-backdrop-filter: blur(12px) !important;
          border: 1.5px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 12px !important;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.75), 0 0 24px rgba(99, 102, 241, 0.3) !important;
          padding: 8px 16px !important;
          display: flex !important;
          align-items: center !important;
          gap: 10px !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-size: 12px !important;
          color: #f3f4f6 !important;
          user-select: none !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          max-width: 92vw !important;
          white-space: nowrap !important;
        `;
        mount.appendChild(pickerBadge);
      }

      // Add target cursor style
      let cursorStyle = document.getElementById('adblock-max-cursor-override');
      if (!cursorStyle) {
        cursorStyle = document.createElement('style');
        cursorStyle.id = 'adblock-max-cursor-override';
        cursorStyle.textContent = `
          * { cursor: crosshair !important; }
          #adblock-max-target-badge, #adblock-max-target-badge * { cursor: pointer !important; }
        `;
        mount.appendChild(cursorStyle);
      }

      function renderInstructionBadge() {
        if (!pickerBadge) return;
        pickerBadge.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 15px;">🎯</span>
            <span style="font-weight: 700; color: #ffffff;">Chế độ Target</span>: <span style="color: #cbd5e1;">Click vào quảng cáo để chọn</span>
          </div>
          <button id="abm-cancel-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); color: #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">✕ Thoát (ESC)</button>
        `;
        const cncBtn = document.getElementById('abm-cancel-btn');
        if (cncBtn) cncBtn.onclick = () => stopTargetPicker();
      }

      function updateOverlay(el) {
        if (!el || el === document.body || el === document.documentElement || el === pickerOverlay || el === pickerBadge || (pickerBadge && pickerBadge.contains(el))) {
          if (pickerOverlay) pickerOverlay.style.display = 'none';
          if (!isLocked) renderInstructionBadge();
          return;
        }
        currentHoveredTarget = el;
        const rect = el.getBoundingClientRect();
        if (pickerOverlay) {
          pickerOverlay.style.top = Math.max(0, rect.top) + 'px';
          pickerOverlay.style.left = Math.max(0, rect.left) + 'px';
          pickerOverlay.style.width = Math.max(16, rect.width) + 'px';
          pickerOverlay.style.height = Math.max(16, rect.height) + 'px';
          pickerOverlay.style.display = 'block';
        }

        const selector = getRobustSelector(el);
        const selDisplay = selector ? (selector.length > 26 ? selector.substring(0, 26) + '...' : selector) : 'phần tử';

        if (!pickerBadge) return;

        // When NOT locked (just hovering over elements before clicking):
        if (!isLocked) {
          pickerBadge.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 14px;">🎯</span>
              <span style="font-weight: 700; color: #ffffff;">Rê chuột:</span>
              <code style="background: rgba(255,255,255,0.12); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px;">${selDisplay}</code>
              <span style="color: #cbd5e1; font-size: 11px;">(Click để chọn phần tử này)</span>
            </div>
            <button id="abm-cancel-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); color: #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;">✕ Thoát (ESC)</button>
          `;
          const cncBtn = document.getElementById('abm-cancel-btn');
          if (cncBtn) cncBtn.onclick = () => stopTargetPicker();
          return;
        }

        // When LOCKED (user has clicked to select):
        const canShrink = historyIndex > 0;
        pickerBadge.innerHTML = `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 14px;">🎯</span>
            <span style="font-weight: 700; color: #ffffff;">Target:</span>
            <code style="background: rgba(255,255,255,0.12); color: #a5b4fc; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 11px;" title="${(selector || '').replace(/"/g, '&quot;')}">${selDisplay}</code>
          </div>
          <button id="abm-expand-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); color: #e2e8f0; padding: 5px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;" title="Mở rộng vùng chọn ra khung bao quanh quảng cáo">Mở rộng 🔼</button>
          ${canShrink ? `<button id="abm-shrink-btn" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.25); color: #e2e8f0; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer;" title="Thu nhỏ vùng chọn lại 1 cấp">Thu nhỏ 🔽</button>` : ''}
          <button id="abm-reselect-btn" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); color: #cbd5e1; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; cursor: pointer;" title="Chọn lại phần tử khác trên trang">🎯 Đổi phần tử</button>
          <button id="abm-block-btn" style="background: linear-gradient(135deg, #f43f5e, #e11d48); border: none; color: #ffffff; padding: 5px 14px; border-radius: 6px; font-size: 11.5px; font-weight: 700; cursor: pointer; box-shadow: 0 2px 10px rgba(244,63,94,0.45);" title="Chặn và ẩn vĩnh viễn">🚫 Chặn ngay</button>
          <button id="abm-cancel-btn" style="background: none; border: none; color: #94a3b8; font-size: 11px; cursor: pointer; padding: 4px 6px;">✕ Hủy (ESC)</button>
        `;

        // Mở rộng vùng chọn 🔼
        const expBtn = document.getElementById('abm-expand-btn');
        if (expBtn) {
          expBtn.onclick = (e) => {
            e.stopPropagation();
            const current = targetHistory[historyIndex] || currentHoveredTarget;
            if (current && current.parentElement && current.parentElement !== document.body && current.parentElement !== document.documentElement) {
              const parent = current.parentElement;
              historyIndex++;
              targetHistory[historyIndex] = parent;
              targetHistory = targetHistory.slice(0, historyIndex + 1);
              isLocked = true;
              updateOverlay(parent);
            }
          };
        }

        // Thu nhỏ vùng chọn 🔽
        const shrinkBtn = document.getElementById('abm-shrink-btn');
        if (shrinkBtn) {
          shrinkBtn.onclick = (e) => {
            e.stopPropagation();
            if (historyIndex > 0) {
              historyIndex--;
              const prev = targetHistory[historyIndex];
              if (prev) {
                isLocked = true;
                updateOverlay(prev);
              }
            }
          };
        }

        // Chọn lại phần tử khác
        const reselBtn = document.getElementById('abm-reselect-btn');
        if (reselBtn) {
          reselBtn.onclick = (e) => {
            e.stopPropagation();
            isLocked = false;
            targetHistory = [];
            historyIndex = 0;
            if (pickerOverlay) pickerOverlay.style.display = 'none';
            renderInstructionBadge();
          };
        }

        // Chặn ngay
        const blkBtn = document.getElementById('abm-block-btn');
        if (blkBtn) {
          blkBtn.onclick = (e) => {
            e.stopPropagation();
            const toBlock = targetHistory[historyIndex] || currentHoveredTarget;
            if (toBlock) {
              confirmAndBlockElement(toBlock);
            }
          };
        }

        // Hủy
        const cncBtn = document.getElementById('abm-cancel-btn');
        if (cncBtn) {
          cncBtn.onclick = (e) => {
            e.stopPropagation();
            stopTargetPicker();
          };
        }
      }

      function onMouseMove(e) {
        if (!isTargetPickerActive || isLocked) return;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && pickerBadge && !pickerBadge.contains(target) && target !== pickerOverlay) {
          updateOverlay(target);
        }
      }

      function onClick(e) {
        if (!isTargetPickerActive) return;
        // If clicking inside badge, let badge buttons handle it
        if (pickerBadge && (pickerBadge.contains(e.target) || e.target === pickerBadge)) return;
        
        e.preventDefault();
        e.stopPropagation();

        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && target !== pickerOverlay && (!pickerBadge || !pickerBadge.contains(target))) {
          // Lock on clicked element so user can review & expand before blocking!
          targetHistory = [target];
          historyIndex = 0;
          isLocked = true;
          updateOverlay(target);
        }
      }

      function onKeyDown(e) {
        if (!isTargetPickerActive) return;
        if (e.key === 'Escape') {
          stopTargetPicker();
        } else if (e.key === 'Enter') {
          const toBlock = targetHistory[historyIndex] || currentHoveredTarget;
          if (toBlock) {
            confirmAndBlockElement(toBlock);
          }
        }
      }

      function confirmAndBlockElement(el) {
        const selector = getRobustSelector(el);
        if (!selector) {
          stopTargetPicker();
          return;
        }
        blockElement(el);
        stopTargetPicker();
        showToast(`Đã chặn thành công: ${selector.length > 25 ? selector.substring(0, 25) + '...' : selector}`, true);
      }

      window.addEventListener('mousemove', onMouseMove, true);
      window.addEventListener('click', onClick, true);
      window.addEventListener('keydown', onKeyDown, true);

      pickerCleanup = () => {
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('click', onClick, true);
        window.removeEventListener('keydown', onKeyDown, true);
        const cStyle = document.getElementById('adblock-max-cursor-override');
        if (cStyle && cStyle.parentNode) cStyle.remove();
        if (pickerOverlay && pickerOverlay.parentNode) pickerOverlay.remove();
        if (pickerBadge && pickerBadge.parentNode) pickerBadge.remove();
        pickerOverlay = null;
        pickerBadge = null;
        isTargetPickerActive = false;
        currentHoveredTarget = null;
        isLocked = false;
        targetHistory = [];
        historyIndex = 0;
      };

      // Do NOT automatically target or lock onto anything on entry!
      // Start in clean neutral mode so user can hover and click whatever they choose:
      isLocked = false;
      targetHistory = [];
      historyIndex = 0;
      currentHoveredTarget = null;
      if (pickerOverlay) pickerOverlay.style.display = 'none';
      renderInstructionBadge();
      showToast('🎯 Đã bật chế độ Target: Rê chuột & click vào quảng cáo để chọn!', true);
    }

    function stopTargetPicker() {
      if (pickerCleanup) {
        pickerCleanup();
        pickerCleanup = null;
      }
    }

    // Listen for background message (Right-Click Context Menu)
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'START_MANUAL_BLOCK' || msg.type === 'START_TARGET_PICKER') {
          startTargetPicker(lastRightClickedElement, msg.info);
          if (sendResponse) sendResponse({ success: true });
          return true;
        }
      });
    }

    // Custom event listener for testing / scripting
    window.addEventListener('adblock-max-test-picker', () => {
      startTargetPicker(lastRightClickedElement, null);
    });
  
    // Mobile Long Press Logic
    let touchStartTime = 0;
    let touchStartElement = null;
    let longPressTimer = null;
  
    document.addEventListener('touchstart', (e) => {
      if (!currentEnabledState) return;
      if (e.touches.length > 1) return;
      touchStartTime = Date.now();
      touchStartElement = e.target;
      longPressTimer = setTimeout(() => {
        // Show confirmation popup
        if (confirm('🚫 Adblock Max:\nBạn có muốn chặn và ẩn vĩnh viễn quảng cáo/phần tử này không?')) {
          let target = touchStartElement;
          let depth = 0;
          while (target && target !== document.body && depth < 3) {
            if (target.tagName === 'A' || target.tagName === 'IFRAME') break;
            const pos = window.getComputedStyle(target).position;
            if (pos === 'fixed' || pos === 'absolute') break;
            target = target.parentElement;
            depth++;
          }
          blockElement(target || touchStartElement);
        }
      }, 800);
    }, { passive: true });
  
    document.addEventListener('touchend', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });
    
    document.addEventListener('touchmove', () => {
      clearTimeout(longPressTimer);
    }, { passive: true });
  
    function applyManualFilters(domainSelectors, globalSelectors) {
      const selectors = (domainSelectors || []).concat(globalSelectors || []);
      let styleEl = document.getElementById('adblock-max-manual-filters');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'adblock-max-manual-filters';
        document.documentElement.appendChild(styleEl);
      }
      if (selectors.length === 0) {
        styleEl.textContent = '';
        return;
      }
      const css = selectors.map(s => s + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }').join('\n');
      styleEl.textContent = css;
    }
  
    function refreshManualFilters() {
      if (!isContextValid()) return;
      try {
        chrome.storage.local.get(['manualFilters', 'customBlockedSelectors'], (res) => {
          const domain = window.location.hostname;
          const domainRules = (res && res.manualFilters && res.manualFilters[domain]) ? res.manualFilters[domain] : [];
          const globalRules = (res && res.customBlockedSelectors) ? res.customBlockedSelectors : [];
          applyManualFilters(domainRules, globalRules);
        });
      } catch (e) {}
    }

    let dynamicCosmeticStyle = null;
    function applyDynamicCosmetics(selectors) {
      if (!selectors || selectors.length === 0) {
        if (dynamicCosmeticStyle) dynamicCosmeticStyle.textContent = '';
        return;
      }
      if (!dynamicCosmeticStyle) {
        dynamicCosmeticStyle = document.createElement('style');
        dynamicCosmeticStyle.id = 'adblock-max-dynamic-cosmetics';
        document.documentElement.appendChild(dynamicCosmeticStyle);
      }
      dynamicCosmeticStyle.textContent = selectors.join(',\n') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }';
    }

    function refreshDynamicCosmetics() {
      if (!isContextValid() || isCurrentPageWhitelisted()) return;
      try {
        chrome.storage.local.get(['dynamicCosmeticFilters', 'dynamicDomainCosmetics'], (res) => {
          if (!res) return;
          const globalSelectors = res.dynamicCosmeticFilters || [];
          const domainMap = res.dynamicDomainCosmetics || {};
          const host = window.location.hostname.toLowerCase();
          
          const combined = [...globalSelectors];
          // Match domain-specific rules (e.g. from ABPVN, uBlock, EasyList) for current site
          Object.keys(domainMap).forEach(dom => {
            if (host === dom || host.endsWith('.' + dom) || dom.endsWith('.' + host)) {
              const domRules = domainMap[dom] || [];
              combined.push(...domRules);
            }
          });

          if (combined.length > 0) {
            applyDynamicCosmetics(combined);
          }
        });
      } catch (e) {}
    }
  
    // Load filters on start
    refreshManualFilters();
    refreshDynamicCosmetics();
  
    // Watch storage changes for manual, custom, and dynamic online rules
    if (isContextValid()) {
      try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local') {
            if (changes.manualFilters || changes.customBlockedSelectors) {
              refreshManualFilters();
            }
            if (changes.dynamicCosmeticFilters || changes.dynamicDomainCosmetics) {
              refreshDynamicCosmetics();
            }
          }
        });
      } catch (e) {}
    }
    // --- END MANUAL ELEMENT BLOCKER ---

