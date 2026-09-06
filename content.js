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

  // uBlock & AdGuard standard cosmetic filter selectors
  '[class*="popup-ad"]', '[id*="popup-ad"]', '[class*="modal-ad"]', '[id*="modal-ad"]',
  '[class*="ad-overlay"]', '[id*="ad-overlay"]', '[class*="overlay-ad"]', '[id*="overlay-ad"]',
  '[class*="ad_box"]', '[class*="ads_box"]', '[id*="ad_box"]', '[id*="ads_box"]',
  '[class*="banner_ad"]', '[id*="banner_ad"]', '[class*="ads-banner"]', '[id*="ads-banner"]',
  'div[id^="google_ads_"]', 'div[id^="div-gpt-ad-"]', 'ins.adsbygoogle'
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
  iframe[src*="linkroyal"], iframe[src*="abroadad"], iframe[src*="vast.xml"],
  iframe[src*="vpaid"], iframe[src*="getjuicy"] {
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
  a[href*="popcash"], a[href*="propellerads"], a[href*="9splt.com"],
  a[href*="playhubconnect"], a[href*="cm8806.com"], a[href*="yuelongyy"],
  a[href*="linkroyal"], a[href*="onclickads"], a[href*="clktag"],
  a[href*="monetag"], a[href*="hilltopads"], a[href*="clickadu"],
  a[href*="streamvl.top"], a[href*="adserver"], a[href*="popunder"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Ad containers with explicit aria-labels */
  [aria-label*="quảng cáo" i], [aria-label*="Quảng cáo" i],
  [aria-label*="quang cao" i], [aria-label*="Quang cao" i] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
    opacity: 0 !important;
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
    /* Hide anti-adblock enforcement popups & playability error screens */
    ytd-enforcement-message-renderer,
    ytd-enforcement-message-view-model,
    yt-playability-error-supported-renderers,
    .ytp-error {
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      opacity: 0 !important;
      z-index: -9999 !important;
    }
    
    /* Ẩn các banner quảng cáo tĩnh, cột phải, và quảng cáo tài trợ (Sponsorships) */
    #masthead-ad,
    ytd-rich-item-renderer.style-scope.ytd-rich-grid-row #content:has(ytd-ad-slot-renderer),
    .ytd-display-ad-renderer,
    ytd-action-companion-ad-renderer,
    ytd-promoted-sparkles-web-renderer,
    ytd-compact-promoted-video-renderer,
    .ytd-video-masthead-ad-v3-renderer,
    .ytd-promoted-video-renderer,
    ytd-in-feed-ad-layout-renderer,
    ytd-banner-promoted-video-renderer,
    #player-ads,
    #panels:has(ytd-ads-engagement-panel-content-renderer) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      width: 0 !important;
      height: 0 !important;
      pointer-events: none !important;
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function injectCustomRulesCSS(customRules) {
  let customStyle = document.getElementById('anti-popunder-custom-css');
  if (!customRules || customRules.length === 0) {
    if (customStyle) customStyle.remove();
    return;
  }
  if (!customStyle) {
    customStyle = document.createElement('style');
    customStyle.id = 'anti-popunder-custom-css';
    (document.head || document.documentElement).appendChild(customStyle);
  }
  try {
    customStyle.textContent = `${customRules.join(',\n')} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`;
  } catch(e) {}
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
function updateEnabledState(enabled, disabledDomains, customRules) {
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
    injectCustomRulesCSS(customRules);
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
    const customStyle = document.getElementById('anti-popunder-custom-css');
    if (customStyle) customStyle.remove();
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
        chrome.storage.local.get(['enabled', 'disabledDomains', 'customBlockedSelectors'], (result) => {
          const isEnabled = result.enabled !== false;
          const disabledDomains = result.disabledDomains || [];
          const customRules = result.customBlockedSelectors || [];
          updateEnabledState(isEnabled, disabledDomains, customRules);
        });
      } catch (e) {}

      try {
        chrome.storage.onChanged.addListener((changes, areaName) => {
          if (areaName === 'local') {
            chrome.storage.local.get(['enabled', 'disabledDomains', 'customBlockedSelectors'], (result) => {
              const isEnabled = result.enabled !== false;
              const disabledDomains = result.disabledDomains || [];
              const customRules = result.customBlockedSelectors || [];
              updateEnabledState(isEnabled, disabledDomains, customRules);
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
      'trafficjunky', 'trafficstars', 'ero-advertising', 'plugrush', 'twinred', 'adxad', 'clickaine', 'adxporn'
    ];

    function safeEscapeRegex(str) {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    const gamblingRegex = new RegExp(gamblingKeywords.map(k => k.startsWith('\\b') ? k : safeEscapeRegex(k)).join('|'), 'i');
    const adUrlRegex = new RegExp(adUrlKeywords.map(safeEscapeRegex).join('|'), 'i');

    function isAdVideo(videoEl) {
      if (!videoEl) return false;
      try {
        const src = (videoEl.src || videoEl.currentSrc || '').toLowerCase();
        if (!src) return false;
        return adUrlRegex.test(src) || gamblingRegex.test(src);
      } catch (e) {
        return false;
      }
    }

    function isVideoPlayerOrControls(el) {
      if (!el || el.nodeType !== 1) return false;
      try {
        const tag = el.tagName.toLowerCase();
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

    // Protect movie posters and genuine content from being hidden
    function isMoviePosterOrContent(el) {
      if (!el || el.nodeType !== 1) return false;
      try {
        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        const elId = (el.id || '').toLowerCase();
        const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';

        // Movie poster keywords
        const movieKeywords = [
          'movie', 'film', 'phim', 'poster', 'thumb', 'halim', 'item', 'card', 
          'tray', 'grid', 'episode', 'tap', 'season', 'detail', 'info', 'media-body',
          'entry-thumb', 'post-thumb', 'post-thumbnail', 'wp-post-image', 'avatar'
        ];

        if (movieKeywords.some(kw => elClass.includes(kw) || elId.includes(kw))) {
          if (tag === 'img') {
            const src = (el.src || '').toLowerCase();
            const alt = (el.getAttribute('alt') || '').toLowerCase();
            const isExplicitBetting = gamblingRegex.test(src) || gamblingRegex.test(alt) ||
              ['nhacai', 'bet88', 'w88', 'fun88', 'fb88', 'kubet', 'shbet', '789bet', 'jun88', 'gamebai', 'casino', 'nohu'].some(kw => src.includes(kw) || alt.includes(kw));
            if (!isExplicitBetting) return true;
          } else {
            return true;
          }
        }

        // Check if inside any movie card / list / grid container
        if (el.closest && el.closest('.movie-item, .film-item, .halim-item, .film_item, .item-movie, .item-film, .tray-item, .film-poster, .poster, .thumb, .entry-thumb, [class*="movie-item"], [class*="film-item"], [class*="halim-item"], [class*="item-film"], [class*="list-film"], [class*="list-movie"], [class*="movie-poster"], [class*="film-poster"], [class*="poster-film"]')) {
          const img = tag === 'img' ? el : (el.querySelector && el.querySelector('img'));
          if (img) {
            const src = (img.src || '').toLowerCase();
            const alt = (img.getAttribute('alt') || '').toLowerCase();
            const isExplicitBetting = gamblingRegex.test(src) || gamblingRegex.test(alt) ||
              ['nhacai', 'bet88', 'w88', 'fun88', 'fb88', 'kubet', 'shbet', '789bet', 'jun88', 'gamebai', 'casino', 'nohu'].some(kw => src.includes(kw) || alt.includes(kw));
            if (!isExplicitBetting) return true;
          } else {
            return true;
          }
        }
      } catch(e) {}
      return false;
    }

    // Shared helper to climb up and find the outermost widget/floating container
    function findOuterAdContainer(startEl) {
      let elementToHide = startEl;
      let curr = startEl.parentElement;
      let depth = 0;

      while (curr && curr !== document.body && curr !== document.documentElement && depth < 8) {
        depth++;
        // STOP parent traversal immediately if we reach a video player or movie poster card!
        if (isVideoPlayerOrControls(curr) || isMoviePosterOrContent(curr)) break;

        const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
        const currId = (curr.id || '').toLowerCase();
        const style = window.getComputedStyle(curr);
        const isFloating = style.position === 'fixed' || style.position === 'absolute' || style.position === 'sticky';
        const isAnchor = curr.tagName.toLowerCase() === 'a';
        const isWidgetOrAdClass = isAnchor || isFloating ||
          currClass.includes('layoutwrapper') || currClass.includes('wrapper') || currClass.includes('widget') || currClass.includes('slider') ||
          currClass.includes('container') || currClass.includes('box') || currClass.includes('root') || currClass.includes('spot') ||
          currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') ||
          currClass.includes('overlay') || currClass.includes('banner') || currClass.includes('float') || currClass.includes('catfish') ||
          currClass.includes('modal') || currClass.includes('fixed') || currClass.includes('inset-0') ||
          currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || currId.includes('overlay') ||
          currId.includes('banner') || currId.includes('float') || currId.includes('catfish') || currId.includes('modal') || currId.includes('widget');

        if (isWidgetOrAdClass && (curr.innerText || '').trim().length < 300) {
          elementToHide = curr;
        }
        curr = curr.parentElement;
      }
      return elementToHide;
    }

    // Completely remove and hide ad container
    function removeAndHideAdElement(el, url, reason) {
      if (!el || el.nodeType !== 1) return;
      if (isMoviePosterOrContent(el)) return;

      el.setAttribute('data-ad-blocked', 'true');
      el.style.setProperty('display', 'none', 'important');
      el.style.setProperty('visibility', 'hidden', 'important');
      el.style.setProperty('pointer-events', 'none', 'important');
      el.style.setProperty('opacity', '0', 'important');
      el.style.setProperty('width', '0', 'important');
      el.style.setProperty('height', '0', 'important');
      try {
        el.remove();
      } catch(e) {}
      
      safeSendMessage({
        type: 'AD_BLOCKED',
        url: url || 'ad_container',
        reason: reason || 'Ẩn banner & khung quảng cáo'
      });
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
      if (isMoviePosterOrContent(el)) return;

      const currentDomain = window.location.hostname;
      const tagName = tag.toLowerCase();

      // Protect interactive functional elements and episode/server buttons from being hidden
      if (['button', 'input', 'select', 'textarea', 'form'].includes(tagName)) return;
      if (el.getAttribute && el.getAttribute('role') === 'button') return;

      const elId = (el.id || '').toLowerCase();
      const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
      if (elId.includes('no-link') || elId.includes('episode') || elId.includes('server') || elId.includes('tap') || elId.includes('film') || elId.includes('movie') ||
          elClass.includes('episode') || elClass.includes('server') || elClass.includes('halim') || elClass.includes('list-ep') || elClass.includes('tap') || elClass.includes('film') || elClass.includes('movie')) return;

      // Direct detection of video slider ad widgets (Stripchat / Mayzaent / SmartPop widgets)
      if (el.matches && (el.matches('[class*="layoutWrapper"], [class*="root--wuzSh"], [qa-element="live-badge-plain-upper"], .sc-widget-icon, [class*="model-name--"]') ||
                         el.matches('a[href*="smartpop"], a[href*="mayzaent"], a[href*="stripchat"], a[href*="stripchats"], a[href*="doppiocdn"]'))) {
        const outer = findOuterAdContainer(el);
        removeAndHideAdElement(outer, 'smartpop_widget', 'Ẩn widget video slider quảng cáo');
        return;
      }

      // Helper to verify and hide an anchor tag
      const checkAnchor = (anchor) => {
        try {
          if (isMoviePosterOrContent(anchor)) return;

          const href = anchor.href || anchor.getAttribute('href') || '';
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;

          let targetDomain = '';
          try {
            targetDomain = new URL(href, window.location.href).hostname;
          } catch (err) {
            targetDomain = '';
          }

          const cleanDom = (d) => d.replace(/^www\./i, '');
          const isExternal = targetDomain && cleanDom(targetDomain) !== cleanDom(currentDomain);
          const hrefLower = href.toLowerCase();

          // Check if link is an internal or external ad redirect script
          const isAdRedirect = hrefLower.includes('/go.php') || hrefLower.includes('/out.php') ||
                               hrefLower.includes('/redirect.php') || hrefLower.includes('/jump.php') ||
                               hrefLower.includes('/click.php') || hrefLower.includes('/pop.php') ||
                               hrefLower.includes('/cpm.php') || hrefLower.includes('?url=http') ||
                               hrefLower.includes('&url=http');

          const matchesGambling = gamblingRegex.test(hrefLower) ||
                                  (isExternal && /\d{2,}/.test(targetDomain) && (targetDomain.includes('88') || targetDomain.includes('99')));

          const matchesAdServer = adUrlRegex.test(hrefLower);
          const img = anchor.querySelector('img');
          const hasImage = !!img;

          let isAd = false;
          const rel = (anchor.getAttribute('rel') || '').toLowerCase();
          const target = (anchor.getAttribute('target') || '').toLowerCase();
          const hasAdAttributes = Array.from(anchor.attributes).some(attr => {
            const name = attr.name.toLowerCase();
            return name.includes('ad_id') || name.includes('ad-id') || 
                   name.includes('ad_slot') || name.includes('ad-slot');
          });

          if (matchesGambling || matchesAdServer || (isExternal && isAdRedirect) || rel.includes('sponsored') || hasAdAttributes) {
            isAd = true;
          } else if (hasImage) {
            if (isMoviePosterOrContent(img)) return;

            const imgSrc = (img.src || '').toLowerCase();
            const imgAlt = (img.getAttribute('alt') || '').toLowerCase();
            
            if (/\b(ads|ad)\b/i.test(imgAlt) || imgAlt.includes('quảng cáo') || imgAlt.includes('sponsor')) {
              isAd = true;
            } else if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('blob:')) {
              const imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => imgSrc.includes(kw)) ||
                                   imgSrc.includes('/ads/') || imgSrc.includes('_ad_') || imgSrc.includes('-ad-') ||
                                   gamblingRegex.test(imgSrc) || adUrlRegex.test(imgSrc) ||
                                   ((isExternal || isAdRedirect || target === '_blank') && imgSrc.includes('.gif') && (gamblingRegex.test(imgSrc) || matchesGambling));
              if (imgMatchesAd) {
                isAd = true;
              }
            }
          } else if (isExternal && target === '_blank' && (matchesGambling || matchesAdServer || isAdRedirect)) {
            isAd = true;
          }

          if (isAd) {
            const outer = findOuterAdContainer(anchor);
            removeAndHideAdElement(outer, href, 'Ẩn banner & khung mờ quảng cáo');
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
            const outer = findOuterAdContainer(iframe);
            removeAndHideAdElement(outer, src, 'Ẩn khung quảng cáo & lớp mờ');
          }
        } catch(e) {}
      };

      // Helper to verify and hide an ad video tag
      const checkVideo = (video) => {
        if (video.hasAttribute('data-ad-blocked')) return;
        try {
          if (isAdVideo(video)) {
            const outer = findOuterAdContainer(video);
            removeAndHideAdElement(outer, video.src || 'video-ad', 'Ẩn video quảng cáo & lớp mờ');
          }
        } catch (e) {}
      };

      // Helper to verify and hide an img tag (safely ignores base64/blob)
      const checkImg = (img) => {
        if (img.hasAttribute('data-ad-blocked')) return;
        if (isMoviePosterOrContent(img)) return;

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
            const outer = findOuterAdContainer(img);
            removeAndHideAdElement(outer, src, 'Ẩn hình ảnh quảng cáo & lớp mờ');
          }
        } catch (e) {}
      };

      // Helper to hide explicit ad elements by aria-label
      const hideExplicitAd = (el) => {
        if (!el || el.hasAttribute('data-ad-blocked')) return;
        if (isMoviePosterOrContent(el)) return;

        try {
          if (isVideoPlayerOrControls(el)) return;
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
          const title = (el.getAttribute('title') || '').toLowerCase();
          if (ariaLabel === 'quảng cáo' || ariaLabel.includes('quảng cáo ') || ariaLabel.includes('sponsor') || title === 'quảng cáo' || title.includes('quảng cáo ') || title.includes('sponsor')) {
            const outer = findOuterAdContainer(el);
            removeAndHideAdElement(outer, 'explicit_ad', 'Ẩn phần tử quảng cáo theo nhãn');
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

    // --- ADVANCED F12-STYLE TARGET INSPECTOR & CONFIRMATION SYSTEM ---
    let lastRightClickedElement = null;
    let isPickerActive = false;
    let pickerOverlay = null;
    let pickerBadge = null;
    let pickerTopBar = null;
    let currentHoveredElement = null;
    let confirmationBackdrop = null;

    document.addEventListener('contextmenu', (e) => {
      lastRightClickedElement = e.target;
    }, true);

    // Build specific, resilient, safe CSS selector
    function getSafeRobustSelector(el) {
      if (!el || el === document.body || el === document.documentElement) return null;
      
      // 1. Explicit clean ID
      if (el.id && typeof el.id === 'string' && el.id.trim().length > 0 && !/^\d|[^\w-]/.test(el.id)) {
        return '#' + CSS.escape(el.id);
      }

      // 2. Data attributes commonly used for ad units
      const dataAttrs = ['data-id', 'data-ad-id', 'data-slot', 'data-unit', 'data-name', 'data-widget-id'];
      for (const attr of dataAttrs) {
        const val = el.getAttribute(attr);
        if (val && val.length < 100) {
          return `${el.tagName.toLowerCase()}[${attr}="${CSS.escape(val)}"]`;
        }
      }

      // 3. Meaningful stable class name
      if (el.classList && el.classList.length > 0) {
        const stableClasses = Array.from(el.classList).filter(c => 
          c.length > 2 && !/\b[a-f0-9]{8,}\b/i.test(c) && !/^\d/.test(c) && !c.includes('adblock-max')
        );
        if (stableClasses.length > 0) {
          const classSelector = '.' + stableClasses.map(c => CSS.escape(c)).join('.');
          try {
            if (document.querySelectorAll(classSelector).length <= 5) {
              return `${el.tagName.toLowerCase()}${classSelector}`;
            }
          } catch(e) {}
        }
      }

      // 4. Source attribute for img/iframe/script/video
      const src = el.getAttribute('src');
      if (src && src.length < 200 && !src.startsWith('data:') && !src.startsWith('blob:')) {
        return `${el.tagName.toLowerCase()}[src="${CSS.escape(src)}"]`;
      }

      // 5. Hierarchical path builder
      let path = [];
      let current = el;
      let depth = 0;

      while (current && current !== document.body && current !== document.documentElement && depth < 4) {
        let tag = current.tagName.toLowerCase();
        let step = tag;

        if (current.id && !/^\d|[^\w-]/.test(current.id)) {
          path.unshift('#' + CSS.escape(current.id));
          break; // Found unique ID ancestor
        }

        const stableClasses = Array.from(current.classList || []).filter(c => 
          c.length > 2 && !/\b[a-f0-9]{8,}\b/i.test(c) && !/^\d/.test(c) && !c.includes('adblock-max')
        );
        if (stableClasses.length > 0) {
          step += '.' + CSS.escape(stableClasses[0]);
        } else {
          let sibling = current.previousElementSibling;
          let nth = 1;
          while (sibling) {
            if (sibling.tagName === current.tagName) nth++;
            sibling = sibling.previousElementSibling;
          }
          step += `:nth-of-type(${nth})`;
        }

        path.unshift(step);
        current = current.parentElement;
        depth++;
      }

      const generated = path.join(' > ');
      
      // CRITICAL SAFETY CHECK: Never allow single generic tags
      const dangerousTags = ['object', 'div', 'p', 'span', 'img', 'a', 'iframe', 'video', 'button', 'input', 'body', 'html', 'table', 'tr', 'td', 'ul', 'li', 'header', 'footer', 'section', 'article', 'main', 'aside'];
      if (dangerousTags.includes(generated.trim().toLowerCase())) {
        let nth = 1;
        let s = el.previousElementSibling;
        while (s) {
          if (s.tagName === el.tagName) nth++;
          s = s.previousElementSibling;
        }
        return `${el.tagName.toLowerCase()}:nth-of-type(${nth})`;
      }

      return generated || `${el.tagName.toLowerCase()}`;
    }

    // Initialize F12-style Target Inspector Overlays
    function createPickerOverlays() {
      if (!pickerOverlay) {
        pickerOverlay = document.createElement('div');
        pickerOverlay.id = 'adblock-max-picker-highlight';
        pickerOverlay.setAttribute('style', `
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483645 !important;
          border: 2px dashed #ff4757 !important;
          background: rgba(255, 71, 87, 0.22) !important;
          box-shadow: 0 0 16px rgba(255, 71, 87, 0.5) !important;
          display: none !important;
          border-radius: 4px !important;
          transition: top 0.05s ease, left 0.05s ease, width 0.05s ease, height 0.05s ease !important;
        `);
        (document.body || document.documentElement).appendChild(pickerOverlay);
      }

      if (!pickerBadge) {
        pickerBadge = document.createElement('div');
        pickerBadge.id = 'adblock-max-picker-badge';
        pickerBadge.setAttribute('style', `
          position: fixed !important;
          pointer-events: none !important;
          z-index: 2147483646 !important;
          background: #181825 !important;
          color: #ffffff !important;
          border: 1px solid #ff4757 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          font-size: 11px !important;
          font-weight: 600 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
          display: none !important;
        `);
        (document.body || document.documentElement).appendChild(pickerBadge);
      }

      if (!pickerTopBar) {
        pickerTopBar = document.createElement('div');
        pickerTopBar.id = 'adblock-max-picker-topbar';
        pickerTopBar.setAttribute('style', `
          position: fixed !important;
          top: 14px !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          z-index: 2147483647 !important;
          background: #11111b !important;
          color: #cdd6f4 !important;
          border: 1.5px solid #ff4757 !important;
          border-radius: 30px !important;
          padding: 8px 18px !important;
          font-size: 13px !important;
          font-weight: 600 !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          box-shadow: 0 10px 32px rgba(0,0,0,0.65) !important;
          display: flex !important;
          align-items: center !important;
          gap: 12px !important;
          pointer-events: auto !important;
          user-select: none !important;
        `);
        pickerTopBar.innerHTML = `
          <span style="font-size: 17px;">🎯</span>
          <span><b>Chế độ Target phần tử (F12)</b>: Rê chuột vào object & click để chặn</span>
          <button id="adblock-picker-topbar-exit" style="
            background: rgba(255, 71, 87, 0.18) !important;
            color: #ff6b81 !important;
            border: 1px solid rgba(255, 71, 87, 0.4) !important;
            border-radius: 14px !important;
            padding: 4px 12px !important;
            font-size: 11px !important;
            font-weight: 700 !important;
            cursor: pointer !important;
            transition: all 0.2s !important;
          ">Thoát (ESC)</button>
        `;
        (document.body || document.documentElement).appendChild(pickerTopBar);
        document.getElementById('adblock-picker-topbar-exit').addEventListener('click', stopElementPicker);
      }
    }

    function startElementPicker(initialTarget) {
      if (isPickerActive) return;
      isPickerActive = true;
      createPickerOverlays();
      if (pickerTopBar) pickerTopBar.style.display = 'flex';

      document.addEventListener('mousemove', onPickerMouseMove, true);
      document.addEventListener('click', onPickerClick, true);
      document.addEventListener('keydown', onPickerKeyDown, true);
      document.documentElement.style.cursor = 'crosshair';

      if (initialTarget && initialTarget !== document.body && initialTarget !== document.documentElement) {
        highlightTargetElement(initialTarget);
      }
    }

    function stopElementPicker() {
      isPickerActive = false;
      if (pickerOverlay) pickerOverlay.style.display = 'none';
      if (pickerBadge) pickerBadge.style.display = 'none';
      if (pickerTopBar) pickerTopBar.style.display = 'none';
      document.removeEventListener('mousemove', onPickerMouseMove, true);
      document.removeEventListener('click', onPickerClick, true);
      document.removeEventListener('keydown', onPickerKeyDown, true);
      document.documentElement.style.cursor = '';
    }

    function highlightTargetElement(target) {
      if (!target || target === pickerOverlay || target === pickerBadge || target === pickerTopBar || target.id?.startsWith('adblock-max-picker')) return;
      currentHoveredElement = target;
      const rect = target.getBoundingClientRect();
      
      pickerOverlay.style.top = rect.top + 'px';
      pickerOverlay.style.left = rect.left + 'px';
      pickerOverlay.style.width = rect.width + 'px';
      pickerOverlay.style.height = rect.height + 'px';
      pickerOverlay.style.display = 'block';

      const tag = target.tagName.toLowerCase();
      const cls = target.className && typeof target.className === 'string' ? '.' + target.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      pickerBadge.textContent = `<${tag}${cls}> (${Math.round(rect.width)} × ${Math.round(rect.height)} px)`;
      
      let badgeTop = rect.top - 28;
      if (badgeTop < 60) badgeTop = rect.bottom + 8;
      pickerBadge.style.top = Math.max(10, badgeTop) + 'px';
      pickerBadge.style.left = Math.max(10, rect.left) + 'px';
      pickerBadge.style.display = 'block';
    }

    function onPickerMouseMove(e) {
      if (!isPickerActive || confirmationBackdrop) return;
      const target = e.target;
      highlightTargetElement(target);
    }

    function onPickerClick(e) {
      if (!isPickerActive) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const target = currentHoveredElement || e.target;
      if (!target || target === pickerTopBar || target.id?.startsWith('adblock-max-picker')) return;

      stopElementPicker();
      showConfirmationDialog(target);
    }

    function onPickerKeyDown(e) {
      if (e.key === 'Escape') {
        stopElementPicker();
        removeConfirmationDialog();
        return;
      }
      // F12-style Arrow key navigation (Up = Parent container, Down = First child)
      if (isPickerActive && currentHoveredElement) {
        if (e.key === 'ArrowUp' && currentHoveredElement.parentElement && currentHoveredElement.parentElement !== document.body) {
          e.preventDefault();
          highlightTargetElement(currentHoveredElement.parentElement);
        } else if (e.key === 'ArrowDown' && currentHoveredElement.firstElementChild) {
          e.preventDefault();
          highlightTargetElement(currentHoveredElement.firstElementChild);
        }
      }
    }

    // Confirmation Preview Modal
    function showConfirmationDialog(targetEl) {
      removeConfirmationDialog();
      if (!targetEl) return;

      const selector = getSafeRobustSelector(targetEl);
      if (!selector) return;

      confirmationBackdrop = document.createElement('div');
      confirmationBackdrop.id = 'adblock-max-picker-backdrop';
      confirmationBackdrop.setAttribute('style', `
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        background: rgba(0, 0, 0, 0.65) !important;
        z-index: 2147483646 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        backdrop-filter: blur(4px) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
      `);

      const rect = targetEl.getBoundingClientRect();
      const tag = targetEl.tagName.toLowerCase();
      const textPreview = (targetEl.innerText || targetEl.getAttribute('alt') || targetEl.getAttribute('title') || '').trim().slice(0, 60);

      confirmationBackdrop.innerHTML = `
        <div id="adblock-max-picker-dialog" style="
          background: #181825 !important;
          color: #cdd6f4 !important;
          border: 1px solid #ff4757 !important;
          border-radius: 14px !important;
          padding: 22px !important;
          width: 420px !important;
          max-width: 90vw !important;
          box-shadow: 0 16px 40px rgba(0,0,0,0.6) !important;
        ">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
            <div style="width: 34px; height: 34px; border-radius: 8px; background: rgba(255,71,87,0.15); display: flex; align-items: center; justify-content: center; font-size: 18px;">🚫</div>
            <div>
              <h3 style="margin: 0; font-size: 16px; color: #ffffff; font-weight: 700;">Xác nhận chặn phần tử</h3>
              <span style="font-size: 12px; color: #a6adc8;">Trang: <b>${window.location.hostname}</b></span>
            </div>
          </div>
          
          <p style="margin: 0 0 14px 0; font-size: 13px; color: #bac2de; line-height: 1.5;">
            Bạn có chắc chắn muốn chặn vĩnh viễn phần tử này? Bạn có thể mở lại menu Adblock Max bất kỳ lúc nào để khôi phục.
          </p>

          <div style="background: #11111b; border: 1px solid #313244; border-radius: 8px; padding: 12px; margin-bottom: 18px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; color: #89b4fa;">
              <span><strong>Thẻ HTML:</strong> &lt;${tag}&gt;</span>
              <span><strong>Kích thước:</strong> ${Math.round(rect.width)} × ${Math.round(rect.height)} px</span>
            </div>
            <div style="color: #a6e3a1; font-family: monospace; word-break: break-all; background: rgba(0,0,0,0.3); padding: 6px 8px; border-radius: 4px; border: 1px solid #45475a;">
              ${selector}
            </div>
            ${textPreview ? `<div style="margin-top: 6px; color: #6c7086; font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">"${textPreview}"</div>` : ''}
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button id="adblock-btn-cancel" style="
              background: #313244 !important;
              color: #cdd6f4 !important;
              border: none !important;
              border-radius: 8px !important;
              padding: 9px 16px !important;
              font-size: 13px !important;
              font-weight: 600 !important;
              cursor: pointer !important;
              transition: all 0.2s !important;
            ">Hủy / Chọn lại (ESC)</button>
            <button id="adblock-btn-confirm" style="
              background: #ff4757 !important;
              color: #ffffff !important;
              border: none !important;
              border-radius: 8px !important;
              padding: 9px 20px !important;
              font-size: 13px !important;
              font-weight: 700 !important;
              cursor: pointer !important;
              box-shadow: 0 4px 14px rgba(255,71,87,0.4) !important;
              transition: all 0.2s !important;
            ">✅ Xác nhận Chặn</button>
          </div>
        </div>
      `;

      (document.body || document.documentElement).appendChild(confirmationBackdrop);

      // Bind events
      document.getElementById('adblock-btn-cancel').addEventListener('click', () => {
        removeConfirmationDialog();
        startElementPicker(); // Allow repicking
      });
      document.getElementById('adblock-btn-confirm').addEventListener('click', () => {
        saveAndApplyCustomRule(selector, targetEl);
        removeConfirmationDialog();
      });
      confirmationBackdrop.addEventListener('click', (e) => {
        if (e.target === confirmationBackdrop) {
          removeConfirmationDialog();
          startElementPicker();
        }
      });
    }

    function removeConfirmationDialog() {
      if (confirmationBackdrop) {
        confirmationBackdrop.remove();
        confirmationBackdrop = null;
      }
    }

    function saveAndApplyCustomRule(selector, targetEl) {
      if (!selector) return;
      if (targetEl) {
        targetEl.style.setProperty('display', 'none', 'important');
        targetEl.style.setProperty('visibility', 'hidden', 'important');
      }

      const domain = window.location.hostname;
      chrome.storage.local.get(['manualFilters'], (res) => {
        let filters = res.manualFilters || {};
        if (!filters[domain]) filters[domain] = [];
        if (!filters[domain].includes(selector)) {
          filters[domain].push(selector);
          chrome.storage.local.set({ manualFilters: filters }, () => {
            applyManualFilters(filters[domain]);
            safeSendMessage({
              type: 'AD_BLOCKED',
              url: selector,
              reason: 'Người dùng chặn thủ công'
            });
          });
        }
      });
    }

    function applyManualFilters(selectors) {
      let styleEl = document.getElementById('adblock-max-manual-filters');
      if (!selectors || selectors.length === 0) {
        if (styleEl) styleEl.remove();
        return;
      }
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'adblock-max-manual-filters';
        (document.head || document.documentElement).appendChild(styleEl);
      }
      const css = selectors.map(s => `${s} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`).join('\n');
      styleEl.textContent = css;
    }

    // Storage change listener to update rules live across tabs
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes.manualFilters) {
        const domain = window.location.hostname;
        const newFilters = changes.manualFilters.newValue || {};
        applyManualFilters(newFilters[domain] || []);
      }
    });

    // Listen for background / popup messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'START_ELEMENT_PICKER' || msg.type === 'START_MANUAL_BLOCK') {
        startElementPicker(lastRightClickedElement);
        sendResponse({ success: true });
        return true;
      }
    });

    // Initial load
    chrome.storage.local.get(['manualFilters'], (res) => {
      const domain = window.location.hostname;
      if (res.manualFilters && res.manualFilters[domain]) {
        applyManualFilters(res.manualFilters[domain]);
      }
    });
    // --- END MANUAL ELEMENT BLOCKER ---

