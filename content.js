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
  'ins[data-zoneid]', 'ins[class*="eas"]',
  'iframe[src*="smartpop"]', 'iframe[src*="mnaspm"]', 'iframe[src*="mayzaent"]',
  'iframe[src*="magsrv"]', 'iframe[src*="prplad"]', '#adbd', '.overdiv',

  // VnSexTop1 & Adspro network banners
  '#popBannerAds', '#topBannerContainer', '#bottomBannerContainer', '#underPlayerAdsContainer',
  '.under-player-banner', '.top-banner-wrapper', '.bottom-banner-wrapper', '.top-banner-item',
  '.bottom-banner-item', '.pop-banner-close-btn', '.top-banner-close-btn', '.bottom-banner-close-btn',
  'img[src*="adspro.name"]',

  // VLXX & Adxcontent network banners, catfishes and hidden clickjack links
  '#vl-top-adx', '#vl-native-adx', '[id*="vl-"][id*="-adx"]',
  '.banner-preload-container', '[class*="banner-preload"]',
  '.catfish-top-container', '.catfish-bottom-container', '[class*="catfish-top"]', '[class*="catfish-bottom"]',
  'a[id^="bb"][style*="opacity:0"]', 'a[id^="bb"][style*="1px"]', 'a[id^="bb"][target="_blank"]',

  // XNhau and video banner networks
  '#catfishPcGuest', '.fxMidGrid', '.fxMidWrap', 'video.fxMid',
  '.video-ad-wrap', '.sponsor .video-ad-wrap', '.ad-container .video-ad-wrap',
  'video[src*="/static/media/pc-"]', 'source[src*="/static/media/pc-"]',

  // Xemcliphot & Cliphotnew floating gambling banners
  '.telegram2', '.telegram2-close', '#telegram2', 'div.telegram2',
  'a[href*="bboocclink015"]', 'a[href*="linkroyal.workers.dev"]', 'a[href*="shortlink.linkroyal"]',

  // Motphim & MusicSkins network ads, catfishes, popups and topfish banners
  '.no-ads-under', '[class*="no-ads-under"]', '.ads-banner', '[class*="ads-banner"]',
  'button[aria-label*="hide ads" i]', 'button[aria-label*="hide all ads" i]',
  'button[aria-label*="topfish" i]', 'button[aria-label*="catfish" i]',
  'a[href*="adqc.net"]', 'a[href*="6789x"]', 'a[href*="cm8806"]',
  'a[href*="gem88"]', 'a[href*="rikvip"]', 'a[href*="net88"]', 'a[href*="uk88"]',
  'a[href*="musicskins"]', 'a[href*="bom88"]', 'a[href*="vsbet"]',

  // Fullscreen transparent popunder and clickjack overlays (e.g. pu.js, popunder scripts)
  'div[style*="z-index:99999999"]', 'div[style*="z-index: 99999999"]',
  'div[style*="z-index:2147483647"]', 'div[style*="z-index: 2147483647"]',
  'div[style*="cursor:pointer"][style*="z-index:999"]', 'div[style*="cursor: pointer"][style*="z-index: 999"]',
  '#profile-modal', '.preload_popup'
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
  iframe[src*="vast"], iframe[src*="vpaid"], iframe[src*="adformat"], iframe[src*="trafficjunky"],
  iframe[src*="tsyndicate"], iframe[src*="adxadserv"], iframe[src*="a-ads.com"],
  iframe[src*="adxcontent"],
  ins[data-zoneid], ins[class*="eas"], #adbd, .overdiv,
  #vl-top-adx, #vl-native-adx, .banner-preload-container,
  .catfish-top-container, .catfish-bottom-container,
  a[id^="bb"][style*="opacity:0"], a[id^="bb"][style*="1px"],
  #catfishPcGuest, .fxMidGrid, .fxMidWrap, video.fxMid,
  .video-ad-wrap, .sponsor .video-ad-wrap, .ad-container .video-ad-wrap,
  #popBannerAds, #topBannerContainer, #bottomBannerContainer, #underPlayerAdsContainer,
  .under-player-banner, .top-banner-wrapper, .bottom-banner-wrapper,
  .video-ad-overlay, .jw-ad-ui, .vjs-ad-loading, .art-ad-container, .ads-overlay-wrapper {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Ad network images - only target explicit ad networks, NEVER generic banner/ad strings */
  img[src*="playhubconnect"], img[src*="juicyads"], img[src*="jads.co"],
  img[src*="adsterra"], img[src*="exoclick"], img[src*="adserver"],
  img[src*="abroadad.cache.wpscdn"], img[src*="streamvl.top/file/"],
  img[src*="cm8806.com"], img[src*="9splt.com"], img[src*="yuelongyy"],
  img[src*="adspro.name"], img[src*="cpmgate"], img[src*="monetag"],
  img[src*="propellerads"], img[src*="adtrue"] {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* Ad network video elements - prevent pre-roll/overlay flash */
  video[src*="playhubconnect"], video[src*="adserver"], video[src*="popunder"],
  video[src*="juicyads"], video[src*="9splt.com"], video[src*="cm8806.com"],
  video[src*="vast"], video[src*="vpaid"], video[src*="/ads/"], video[src*="preroll"],
  video[src*="midroll"], video[src*="postroll"], video[src*="streamux.top"],
  video[src*="/static/media/pc-"], video[src*="/static/media/"] {
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
  a[href*="profitablecpm"], a[href*="clktag"], a[href*="monetag"] {
    display: none !important;
    visibility: hidden !important;
    width: 0 !important;
    height: 0 !important;
  }

  /* === SEMANTIC PROCEDURAL FILTERS (:has) FOR SPONSORED FEEDS & NATIVE ADS === */
  article:has(span[aria-label*="Được tài trợ" i]),
  article:has(span[aria-label*="Sponsored" i]),
  article:has(span[aria-label*="Promoted" i]),
  div[data-pagelet*="FeedUnit"]:has(span[aria-label*="Được tài trợ" i]),
  div[data-pagelet*="FeedUnit"]:has(span[aria-label*="Sponsored" i]),
  div[data-testid="cellInnerDiv"]:has(svg + span:is([aria-label*="Sponsored" i], [aria-label*="Ad" i])),
  shreddit-post:has(shreddit-comment-badge[badge-type="sponsored"]),
  div:has(> a[href*="/quang-cao/"]),
  div:has(> a[href*="/ad-click/"]),
  section:has(> [class*="sponsor-label"]),
  div:has(> a[href*="bit.ly/"][rel*="sponsored"]),
  div:has(> a[href*="shbet"]),
  div:has(> a[href*="f8bet"]),
  div:has(> a[href*="789bet"]),
  div:has(> a.no-ads-under),
  div:has(> button[aria-label*="hide ads" i]),
  div:has(> button[aria-label*="hide all ads" i]),
  div:has(> button[aria-label*="topfish" i]),
  div:has(> button[aria-label*="catfish" i]),
  div:has(> a[href*="adqc"]),
  div:has(> a[href*="6789x"]),
  div:has(> a[href*="gem88"]),
  div:has(> a[href*="net88"]),
  div:has(> a[href*="uk88"]),
  div:has(> a[href*="rikvip"]),
  div:has(> a[href*="rikvipchinhhang"]),
  div:has(> a[href*="bom88"]),
  div:has(> a[href*="cm88"]),
  div:has(> a[href*="vsbet"]),
  div:has(> a[href*="musicskins"]),
  /* motphimc.app PopupAd - Radix UI Dialog overlay (z-[9998]) and modal (z-[9999]) */
  [data-state="open"][class*="z-[9998]"],
  [data-state="open"][class*="z-[9999]"],
  [data-radix-popper-content-wrapper],
  /* Popup dialog containing gambling/ad links */
  [role="dialog"]:has(a[href*="rikvip"]),
  [role="dialog"]:has(a[href*="rikvipchinhhang"]),
  [role="dialog"]:has(a[href*="adcenter"]),
  [role="dialog"]:has(a[href*="78win"]),
  [role="dialog"]:has(img[src*="adcenter"]),
  [aria-modal="true"]:has(a[href*="rikvip"]),
  [aria-modal="true"]:has(a[href*="rikvipchinhhang"]),
  /* Block adcenter.cx iframes */
  iframe[src*="adcenter.cx"],
  img[src*="adcenter.cx"],
  a[href*="adcenter.cx"] {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    pointer-events: none !important;
  }

  /* === END PRE-BLOCK === */

  /* Chỉ ép pointer-events: auto lên thẻ video, iframe trực tiếp và control player */
  video:not([src*="playhubconnect"]):not([src*="adserver"]):not([src*="9splt"]):not([src*="juicyads"]),
  video, iframe, canvas,
  #playleft, #playleft *,
  #player, #player *,
  #jwplayer-video, #jwplayer-video *,
  .jwplayer, .jwplayer *,
  .video-js, .video-js *,
  .dplayer, .dplayer *,
  .artplayer, .artplayer *,
  .plyr, .plyr *,
  [class*="player"], [class*="player"] *,
  [id*="player"], [id*="player"] *,
  [class*="video-wrap"], [class*="video-wrap"] *,
  [class*="danmaku"], [class*="danmaku"] *,
  [class*="danmu"], [class*="danmu"] *,
  .art-mask, .art-controls, .art-control-progress, .art-control-playAndPause, .art-bottom, .art-layers,
  .jw-controls, .jw-controlbar, .jw-slider-horizontal, .jw-overlays, .jw-media, .jw-preview, .jw-knob, .jw-display-icon-container,
  .vjs-control-bar, .vjs-progress-control, .vjs-play-control, .vjs-slider,
  .dplayer-controller, .dplayer-bar-wrap, .dplayer-bar, .dplayer-mask {
    pointer-events: auto !important;
  }

  /* Bảo vệ tuyệt đối iframe trình phát phim */
  iframe[src*="player"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="embed"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="stream"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="video"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="hotp"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
  iframe[src*="hotphim"]:not([src*="adserver"]):not([src*="doubleclick"]):not([src*="exoclick"]),
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
  }

  /* === BẢO VỆ TUYỆT ĐỐI BANNER PHIM, POSTER, SLIDER & CAROUSEL (TRÁNH BỊ ẨN ĐEN / MẤT HÌNH) === */
  :is(
    .movie-banner, .film-banner, .hero-banner, .banner-film, .film-poster, .movie-poster,
    .poster-film, .film-item, .movie-item, .tray-item,
    .halim-item, .flw-item, .film_info, [class*="banner-slider"], [class*="hero-banner"],
    [class*="film-banner"], [class*="movie-banner"], [class*="video-slider"], [id*="video-slider"],
    [class*="film-item"], [class*="movie-item"], [class*="film-poster"], [class*="movie-poster"],
    [class*="hero-anim"], [class*="backdrop"],
    .thumb-overlay, [class*="thumb"], [id*="thumb"], .video-js, .vjs-sublime-skin, [class*="vjs-"],
    .img-responsive, [class*="video-elem"], [class*="video-box"], [class*="video-item"], [class*="well-sm"]
  ) {
    visibility: visible !important;
    pointer-events: auto !important;
  }

  .swiper, .swiper-wrapper {
    visibility: visible !important;
  }

  img:is(
    [src*="animevietsub"], [src*="phim"], [src*="film"], [src*="movie"],
    [src*="poster"], [src*="thumb"], [src*="cover"], [src*="cdn77"],
    [src*="tmdb.org"], [src*="wsrv.nl"], [src*="nguonc.com"], [src*="phimimg.com"],
    [src*="ophim"], [src*="vsmov"], [src*="themoviedb"],
    [alt*="phim" i], [alt*="Phim" i], [alt*="tập" i], [alt*="Tập" i]
  ) {
    visibility: visible !important;
    pointer-events: auto !important;
    min-width: 1px !important;
    min-height: 1px !important;
  }`;
  (document.head || document.documentElement).appendChild(style);
}

function injectYouTubeAdBlockCSS() {
  if (document.getElementById('anti-popunder-youtube-css')) return;
  const style = document.createElement('style');
  style.id = 'anti-popunder-youtube-css';
  style.textContent = `
    /* 1. Hide anti-adblock enforcement dialogs, backdrops & interruption toasts */
    ytd-enforcement-message-renderer,
    ytd-enforcement-message-view-model,
    tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
    tp-yt-paper-dialog:has(ytd-enforcement-message-renderer),
    tp-yt-paper-dialog:has(#feedback.ytd-enforcement-message-view-model),
    #error-screen.ytd-watch-flexy,
    ytd-mealbar-promo-renderer,
    tp-yt-paper-toast:has(a[href*="answer"]),
    tp-yt-paper-toast:has(a[href*="support.google.com"]),
    ytd-notification-action-renderer:has(a[href*="answer"]),
    ytd-notification-action-renderer:has(a[href*="support.google.com"]) {
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
      'thabet', 'bk8', 'k8', 'j88', 'mb66', 'gk88', 'pg88', '88clb', 'cwin', 'win88', 'sc88',
      'lu88', 'vu88', 'man88', 'hbet', 'k88', 'tx88', 'taixiu', 'banca', 'game-bai',
      'qq88', 'xx88', 'bet789',
      'bom88', 'gem88', 'uk88', 'net88', 'vsbet', '6789x', 'adqc', 'musicskins', 'rikvipchinhhang', 'uk88chinhhang'
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
      '/static/video/bn/', 'trafficjunky', 'tsyndicate', 'a-ads.com',
      '/preroll', '/midroll', '/postroll', 'streamux.top',
      'adxcontent.com', 'adxcontent', 'vl-top-adx', 'vl-main-adx', 'vl-native-adx',
      'acquirecardedsullen.com', 'acquirecarded', 'xx4999.com',
      'adqc.net', '6789x.site', 'musicskinsheader', 'musicskinscom', 'cm8806.com/motphim'
    ];

    // Compile regexes once for high-performance scanning
    const gamblingRegex = new RegExp(gamblingKeywords.join('|'), 'i');
    const adUrlRegex = new RegExp(adUrlKeywords.join('|'), 'i');

    // Helper to check if a video is actually an ad
    function isAdVideo(video) {
      if (!video) return false;
      try {
        if (video.closest && video.closest('.fxMidWrap, .fxMidGrid, .video-ad-wrap, #catfishPcGuest, .catfish-top-container, .catfish-bottom-container, .banner-preload-container')) return true;
        if (video.classList && (video.classList.contains('fxMid') || video.classList.contains('video-ad'))) return true;

        let src = (video.src || video.getAttribute('src') || '').toLowerCase();
        const sourceEl = video.querySelector('source');
        if (sourceEl) {
          src += ' ' + (sourceEl.src || sourceEl.getAttribute('src') || '').toLowerCase();
        }
        const poster = (video.getAttribute('poster') || '').toLowerCase();
        return ['quangcao', 'adserver', 'popunder', '/static/media/pc-', '/static/media/'].some(kw => src.includes(kw) || poster.includes(kw)) ||
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
        if (window.self !== window.top) return true; // All elements in iframe players

        const tag = el.tagName ? el.tagName.toLowerCase() : '';
        if (['audio', 'canvas', 'source', 'track'].includes(tag)) return true;
        if (tag === 'video' && !isAdVideo(el)) return true;
        
        if (el.querySelector) {
          const videos = el.querySelectorAll('video, iframe[src*="player"], iframe[src*="embed"], iframe[src*="stream"], iframe[src*="video"]');
          if (videos.length > 0) return true;
          if (el.querySelector('audio, canvas')) return true;
        }

        const elId = (el.id || '').toLowerCase();
        const elClass = (typeof el.className === 'string') ? el.className.toLowerCase() : '';
        
        const keywords = [
          'player', 'video', 'control', 'jwplayer', 'plyr', 'artplayer', 'dplayer', 'vjs', 'media', 'vp-', 'ytp-',
          'time', 'progress', 'duration', 'seekbar', 'slider', 'timeline', 'halim', 'elapsed', 'scrubber', 'seek', 'track',
          'thumb', 'volume', 'buffer', 'play', 'pause', 'fullscreen', 'danmaku', 'danmu', 'jw-controls', 'jw-slider', 'jw-knob'
        ];

        if (keywords.some(kw => elId.includes(kw) || elClass.includes(kw))) {
          return true;
        }

        if (el.closest && el.closest(
          '.jwplayer, .plyr, .video-js, .vjs-, .flowplayer, .artplayer, .dplayer, ' +
          '.danmaku, .danmaku-container, [class*="danmaku"], [class*="danmu"], ' +
          '[class*="player"], [id*="player"], [class*="video"], [id*="video"], ' +
          '[class*="control"], [id*="control"], [class*="seekbar"], [id*="seekbar"], ' +
          '[class*="progress"], [id*="progress"], [class*="timeline"], [id*="timeline"], ' +
          '[class*="slider"], [id*="slider"]'
        )) {
          return true;
        }
      } catch(e) {}
      return false;
    }

    // Helper to check and guarantee absolute protection for movie banners, posters, carousels, and thumbs
    function isMovieBannerOrPoster(el) {
      if (!el || el === document || el === document.body || el === document.documentElement) return false;
      try {
        if (el.closest && el.closest(
          '.movie-banner, .film-banner, .hero-banner, .banner-film, .film-poster, .movie-poster, ' +
          '.poster-film, .film-item, .movie-item, .tray-item, .carousel-item, .swiper, .swiper-wrapper, .swiper-slide, ' +
          '.halim-item, .flw-item, .film_info, [class*="banner-slider"], [class*="hero-banner"], ' +
          '[class*="film-banner"], [class*="movie-banner"], [class*="video-slider"], [id*="video-slider"], ' +
          '[class*="film-item"], [class*="movie-item"], [class*="film-poster"], [class*="movie-poster"], ' +
          '[class*="hero-anim"], [class*="backdrop"], ' +
          '.carousel, .slider, .swiper, .slick-slider, .owl-carousel, [class*="poster"], [id*="poster"], ' +
          '.thumb-overlay, [class*="thumb"], [id*="thumb"], .video-js, [class*="video-js"], [class*="vjs-"], ' +
          '[id*="player_one"], .img-responsive, [class*="video-elem"], [class*="video-box"], [class*="video-item"]'
        )) return true;

        const tag = el.tagName ? el.tagName.toUpperCase() : '';
        if (tag === 'IMG') {
          const src = (el.src || '').toLowerCase();
          const alt = (el.getAttribute('alt') || '').toLowerCase();
          const title = (el.getAttribute('title') || '').toLowerCase();
          if (src.includes('animevietsub') || src.includes('phim') || src.includes('film') || src.includes('movie') || src.includes('poster') || src.includes('thumb') || src.includes('cover') || src.includes('cdn77')) return true;
          if (src.includes('tmdb.org') || src.includes('wsrv.nl') || src.includes('nguonc.com') || src.includes('phimimg.com') || src.includes('ophim') || src.includes('vsmov') || src.includes('themoviedb')) return true;
          if (alt.includes('phim') || alt.includes('tập') || alt.includes('season') || alt.includes('episode')) return true;
          if (title.includes('phim') || title.includes('tập') || title.includes('season') || title.includes('episode')) return true;
        }

        if (el.querySelector && el.querySelector(
          'img[src*="animevietsub"], img[src*="phim"], img[src*="film"], img[src*="movie"], img[src*="poster"], img[src*="thumb"], img[src*="cover"], img[src*="cdn77"], ' +
          'img[src*="tmdb.org"], img[src*="wsrv.nl"], img[src*="nguonc.com"], img[src*="phimimg.com"], img[src*="ophim"], img[src*="vsmov"], img[src*="themoviedb"]'
        )) {
          return true;
        }
      } catch(e) {}
      return false;
    }

    // Checks a single element and its inner children to hide it if it's an ad
    function checkAndHideElement(el) {
      if (!el || el.nodeType !== 1) return;
      if (isMovieBannerOrPoster(el)) return;

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
        if (isMovieBannerOrPoster(anchor)) return;
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

          // Check if anchor is a dummy click trap (e.g. #bb0, #bb1 with 1px / opacity 0)
          const anchorId = (anchor.id || '').toLowerCase();
          const anchorStyle = anchor.getAttribute('style') || '';
          if (anchorId.startsWith('bb') || anchorStyle.includes('opacity:0') || anchorStyle.includes('opacity: 0') || (anchorStyle.includes('1px') && anchorStyle.includes('height'))) {
            try { anchor.remove(); } catch (e) {}
            return;
          }

          const hrefLower = href.toLowerCase();
          const matchesGambling = gamblingRegex.test(hrefLower) ||
                                  (/\d{2,}/.test(targetDomain) && (targetDomain.includes('88') || targetDomain.includes('99') || targetDomain.includes('789') || /club|bet/i.test(targetDomain))) ||
                                  targetDomain.includes('adqc') || targetDomain.includes('6789x') || targetDomain.includes('musicskins') || hrefLower.includes('no-ads-under');

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
            if (isMovieBannerOrPoster(img)) return;
            const imgSrc = (img.src || '').toLowerCase();
            const imgAlt = (img.getAttribute('alt') || '').toLowerCase();
            
            if (/\b(ads|ad)\b/i.test(imgAlt) || imgAlt.includes('quảng cáo') || imgAlt.includes('sponsor')) {
              isAd = true;
            } else if (!imgSrc.startsWith('data:') && !imgSrc.startsWith('blob:')) {
              // Explicit ad image keywords only (never rely on width/height ratios)
              const imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => imgSrc.includes(kw)) ||
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
              // STOP parent traversal immediately if we reach a video player or movie banner!
              if (isVideoPlayerOrControls(curr) || isMovieBannerOrPoster(curr)) {
                break;
              }

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              if (currClass.includes('film') || currClass.includes('movie') || currClass.includes('hero') || currClass.includes('slider') || currClass.includes('carousel') || currClass.includes('poster') || currClass.includes('halim') || currClass.includes('tray') || currClass.includes('swiper') || currClass.includes('backdrop') || currClass.includes('banner') || currClass.includes('slide') || currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('card') || currId.includes('thumb') || currId.includes('video')) {
                break;
              }

              const isMediaOrThumb = currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('poster') || currClass.includes('card') || currClass.includes('img-') || currId.includes('thumb') || currId.includes('video');
              if (isMediaOrThumb) break;

              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || (currClass.includes('overlay') && !currClass.includes('thumb-overlay') && !isMediaOrThumb) || currClass.includes('ads-banner') || currClass.includes('ad-banner') || currClass.includes('banner-ad') || currClass.includes('float-banner') || currClass.includes('catfish') || currClass.includes('modal') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || (currId.includes('overlay') && !currId.includes('thumb')) || currId.includes('ads-banner') || currId.includes('ad-banner') || currId.includes('catfish') || currId.includes('modal');

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
        if (isMovieBannerOrPoster(iframe)) return;
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
          if (srcLower.includes('player') || srcLower.includes('embed') || srcLower.includes('stream') || srcLower.includes('video') || srcLower.includes('watch') || srcLower.includes('film') || srcLower.includes('movie') || srcLower.includes('vids') || srcLower.includes('hls') || srcLower.includes('m3u8') || srcLower.includes('mp4') || srcLower.includes('halim') || srcLower.includes('play') || srcLower.includes('hotp') || srcLower.includes('hotphim')) {
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
              // STOP parent traversal immediately if we reach a video player or movie banner!
              if (isVideoPlayerOrControls(curr) || isMovieBannerOrPoster(curr)) {
                break;
              }

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              if (currClass.includes('film') || currClass.includes('movie') || currClass.includes('hero') || currClass.includes('slider') || currClass.includes('carousel') || currClass.includes('poster') || currClass.includes('halim') || currClass.includes('tray') || currClass.includes('swiper') || currClass.includes('backdrop') || currClass.includes('banner') || currClass.includes('slide') || currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('card') || currId.includes('thumb') || currId.includes('video')) {
                break;
              }

              const isMediaOrThumb = currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('poster') || currClass.includes('card') || currClass.includes('img-') || currId.includes('thumb') || currId.includes('video');
              if (isMediaOrThumb) break;

              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || (currClass.includes('overlay') && !currClass.includes('thumb-overlay') && !isMediaOrThumb) || currClass.includes('ads-banner') || currClass.includes('ad-banner') || currClass.includes('banner-ad') || currClass.includes('float-banner') || currClass.includes('catfish') || currClass.includes('modal') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || (currId.includes('overlay') && !currId.includes('thumb')) || currId.includes('ads-banner') || currId.includes('ad-banner') || currId.includes('catfish') || currId.includes('modal');

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
        if (isMovieBannerOrPoster(video)) return;
        try {
          if (isAdVideo(video)) {
            // Immediately neutralize the ad video stream playback
            try {
              video.muted = true;
              video.volume = 0;
              if (isFinite(video.duration) && video.duration > 0) {
                video.currentTime = video.duration;
              }
              video.pause();
              video.dispatchEvent(new Event('ended'));
            } catch (err) { }

            let elementToHide = video;
            let curr = video.parentElement;
            let depth = 0;
            
            while (curr && curr !== document.body && curr !== document.documentElement && depth < 6) {
              depth++;
              if (isVideoPlayerOrControls(curr) || isMovieBannerOrPoster(curr)) break;

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              if (currClass.includes('film') || currClass.includes('movie') || currClass.includes('hero') || currClass.includes('slider') || currClass.includes('carousel') || currClass.includes('poster') || currClass.includes('halim') || currClass.includes('tray') || currClass.includes('swiper') || currClass.includes('backdrop') || currClass.includes('banner') || currClass.includes('slide') || currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('card') || currId.includes('thumb') || currId.includes('video')) {
                break;
              }

              const isMediaOrThumb = currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('poster') || currClass.includes('card') || currClass.includes('img-') || currId.includes('thumb') || currId.includes('video');
              if (isMediaOrThumb) break;

              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor || isFloating ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || (currClass.includes('overlay') && !currClass.includes('thumb-overlay') && !isMediaOrThumb) || currClass.includes('ads-banner') || currClass.includes('ad-banner') || currClass.includes('banner-ad') || currClass.includes('float-banner') || currClass.includes('float') || currClass.includes('catfish') || currClass.includes('modal') || currClass.includes('fixed') || currClass.includes('inset-0') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || (currId.includes('overlay') && !currId.includes('thumb')) || currId.includes('ads-banner') || currId.includes('ad-banner') || currId.includes('float') || currId.includes('catfish') || currId.includes('modal');

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
        if (isMovieBannerOrPoster(img)) return;
        try {
          const src = (img.src || '').toLowerCase();
          const alt = (img.getAttribute('alt') || '').toLowerCase();
          
          let imgMatchesAd = false;
          if (/\b(ads|ad)\b/i.test(alt) || alt.includes('quảng cáo') || alt.includes('sponsor')) {
            imgMatchesAd = true;
          } else if (!src.startsWith('data:') && !src.startsWith('blob:')) {
            imgMatchesAd = ['quangcao', 'adserver', 'popunder'].some(kw => src.includes(kw)) ||
                           gamblingRegex.test(src) || adUrlRegex.test(src);
          }
                               
          if (imgMatchesAd) {
            let elementToHide = img;
            let curr = img.parentElement;
            let depth = 0;
            
            while (curr && curr !== document.body && curr !== document.documentElement && depth < 6) {
              depth++;
              if (isVideoPlayerOrControls(curr) || isMovieBannerOrPoster(curr)) break;

              const currClass = (typeof curr.className === 'string') ? curr.className.toLowerCase() : '';
              const currId = (curr.id || '').toLowerCase();
              if (currClass.includes('film') || currClass.includes('movie') || currClass.includes('hero') || currClass.includes('slider') || currClass.includes('carousel') || currClass.includes('poster') || currClass.includes('halim') || currClass.includes('tray') || currClass.includes('swiper') || currClass.includes('backdrop') || currClass.includes('banner') || currClass.includes('slide') || currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('card') || currId.includes('thumb') || currId.includes('video')) {
                break;
              }

              const isMediaOrThumb = currClass.includes('thumb') || currClass.includes('video') || currClass.includes('preview') || currClass.includes('poster') || currClass.includes('card') || currClass.includes('img-') || currId.includes('thumb') || currId.includes('video');
              if (isMediaOrThumb) break;

              const style = window.getComputedStyle(curr);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const isAnchor = curr.tagName.toLowerCase() === 'a';
              const isAdWrapper = isAnchor ||
                                  currClass.includes('ad-') || currClass.includes('-ad') || currClass.includes('qc') || currClass.includes('popup') || (currClass.includes('overlay') && !currClass.includes('thumb-overlay') && !isMediaOrThumb) || currClass.includes('ads-banner') || currClass.includes('ad-banner') || currClass.includes('banner-ad') || currClass.includes('float-banner') || currClass.includes('catfish') || currClass.includes('modal') ||
                                  currId.includes('ad') || currId.includes('qc') || currId.includes('popup') || (currId.includes('overlay') && !currId.includes('thumb')) || currId.includes('ads-banner') || currId.includes('ad-banner') || currId.includes('catfish') || currId.includes('modal');

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

      // Heuristic Visual Ad Inspector (detects IAB standard banner dimensions with external redirect links)
      const checkHeuristicAdBanner = (el) => {
        if (!el || el.nodeType !== 1 || el.hasAttribute('data-ad-blocked')) return;
        if (isVideoPlayerOrControls(el) || isMovieBannerOrPoster(el)) return;

        try {
          const tag = el.tagName.toLowerCase();
          if (tag !== 'div' && tag !== 'a' && tag !== 'section' && tag !== 'aside') return;

          const w = el.offsetWidth || el.clientWidth;
          const h = el.offsetHeight || el.clientHeight;
          if (w <= 0 || h <= 0) return;

          // Check standard IAB display ad banner dimensions (+/- 8px)
          const isIABDim = (
            (Math.abs(w - 728) <= 8 && Math.abs(h - 90) <= 8) ||   // Leaderboard
            (Math.abs(w - 970) <= 8 && Math.abs(h - 90) <= 8) ||   // Large Leaderboard
            (Math.abs(w - 970) <= 8 && Math.abs(h - 250) <= 8) ||  // Billboard
            (Math.abs(w - 300) <= 8 && Math.abs(h - 250) <= 8) ||  // Medium Rectangle (MPU)
            (Math.abs(w - 336) <= 8 && Math.abs(h - 280) <= 8) ||  // Large Rectangle
            (Math.abs(w - 160) <= 8 && Math.abs(h - 600) <= 8) ||  // Wide Skyscraper
            (Math.abs(w - 300) <= 8 && Math.abs(h - 600) <= 8) ||  // Half Page
            (Math.abs(w - 320) <= 8 && Math.abs(h - 50) <= 8)  ||  // Mobile Leaderboard
            (Math.abs(w - 320) <= 8 && Math.abs(h - 100) <= 8)     // Large Mobile Banner
          );

          if (!isIABDim) return;

          const anchors = el.querySelectorAll('a');
          const cleanDom = (d) => d.replace(/^www\./i, '');
          let hasSuspiciousLink = false;

          for (let i = 0; i < anchors.length; i++) {
            const href = anchors[i].href || '';
            if (!href || href.startsWith('javascript:') || href.startsWith('#')) continue;
            try {
              const aHost = new URL(href, window.location.href).hostname;
              if (aHost && cleanDom(aHost) !== cleanDom(window.location.hostname)) {
                const hrefLower = href.toLowerCase();
                const rel = (anchors[i].getAttribute('rel') || '').toLowerCase();
                if (gamblingRegex.test(hrefLower) || adUrlRegex.test(hrefLower) || 
                    rel.includes('sponsored') || anchors[i].getAttribute('target') === '_blank') {
                  hasSuspiciousLink = true;
                  break;
                }
              }
            } catch(err) {}
          }

          if (hasSuspiciousLink) {
            el.setAttribute('data-ad-blocked', 'true');
            el.setAttribute('style', 'display: none !important; visibility: hidden !important; pointer-events: none !important; opacity: 0 !important;');
            console.log('[Heuristic Inspector] Blocked IAB display banner:', `${w}x${h}`, el);
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
      checkHeuristicAdBanner(el);

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
      if (isTargetPickerActive) return; // Do not intercept clicks when Target Picker is active
      if (!currentEnabledState || isCurrentPageWhitelisted()) return;
      try {
        let target = e.target;
        if (!target || target.nodeType !== 1) return;

        // BẢO VỆ TUYỆT ĐỐI VIDEO PLAYER & BANNER/POSTER:
        if (window.self !== window.top || isVideoPlayerOrControls(target) || isMovieBannerOrPoster(target)) {
          const anchor = target.closest ? target.closest('a') : null;
          if (!anchor) return; // Cho phép tương tác trình phát tự nhiên 100%
          const href = anchor.href || '';
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
          if (gamblingRegex.test(href) || adUrlRegex.test(href)) {
            e.preventDefault();
            e.stopPropagation();
            safeSendMessage({
              type: 'AD_BLOCKED',
              url: href,
              reason: 'Chặn click chuyển hướng quảng cáo'
            });
          }
          return;
        }

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
          // BẢO VỆ TUYỆT ĐỐI BANNER PHIM & POSTER PHIM:
          // Nếu phần tử được click hoặc thẻ <a> là banner phim, poster phim, slider phim, hoặc chứa ảnh/video:
          // TUYỆT ĐỐI KHÔNG XÓA (anchor.remove()) VÀ KHÔNG CHẶN CLICK HỢP LỆ!
          if (isMovieBannerOrPoster(anchor) || isMovieBannerOrPoster(target)) {
            return;
          }

          const href = anchor.href || '';
          if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
          
          try {
            const targetUrl = new URL(href, window.location.href);
            const currentHost = window.location.hostname.replace(/^www\./i, '');
            const targetHost = targetUrl.hostname.replace(/^www\./i, '');
            
            const isExternal = targetHost !== currentHost && !currentHost.endsWith('.' + targetHost) && !targetHost.endsWith('.' + currentHost);
            
            if (isExternal) {
              // Bỏ qua các trang mạng xã hội / dịch vụ hợp lệ
              const safeDomains = ['facebook.com', 'google.com', 'youtube.com', 'twitter.com', 'x.com', 't.me', 'zalo.me'];
              if (safeDomains.some(d => targetHost.includes(d))) return;

              const style = window.getComputedStyle(anchor);
              const isFloating = style.position === 'fixed' || style.position === 'absolute';
              const opacity = parseFloat(style.opacity);
              const isTransparent = opacity < 0.1 || style.visibility === 'hidden' || style.display === 'none';
              
              const text = (anchor.innerText || anchor.textContent || '').trim();
              const mediaCount = anchor.querySelectorAll('img, svg, canvas, video, picture').length;

              // CHỈ xóa khi thực sự là LỚP MÀN TÀNG HÌNH CLICKJACK (phải là floating fixed/absolute, trong suốt, rỗng không có chữ lẫn ảnh)
              if (isFloating && isTransparent && text.length === 0 && mediaCount === 0) {
                e.preventDefault();
                e.stopPropagation();
                anchor.remove();
                console.log('[Anti Pop-Under] Intercepted and destroyed invisible clickjack overlay anchor:', anchor);
                return;
              }

              // Nếu là link cờ bạc/adserver rõ ràng, chỉ cần chặn chuyển hướng (preventDefault), KHÔNG XÓA element
              if (gamblingRegex.test(href) || adUrlRegex.test(href)) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[Anti Pop-Under] Blocked known ad/gambling external link click:', href);
                safeSendMessage({
                  type: 'AD_BLOCKED',
                  url: href,
                  reason: 'Chặn click chuyển hướng quảng cáo'
                });
                return;
              }
            }
          } catch (err) {}
        } else {
          // 2. Detect if click is on an invisible DIV/SECTION overlay
          if (isMovieBannerOrPoster(target)) return;

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
              const mediaCount = target.querySelectorAll('img, svg, canvas, video, picture').length;
              
              if (isTransparent && text.length === 0 && mediaCount === 0) {
                // Before destroying, ensure it's NOT a legitimate video player overlay or movie container
                let c = target;
                let inPlayerOrMovie = false;
                while (c && c !== document.body && c !== document.documentElement) {
                  if (isVideoPlayerOrControls(c) || isMovieBannerOrPoster(c)) {
                    inPlayerOrMovie = true;
                    break;
                  }
                  c = c.parentElement;
                }
                
                if (!inPlayerOrMovie) {
                  e.preventDefault();
                  e.stopPropagation();
                  target.remove();
                  console.log('[Anti Pop-Under] Intercepted and destroyed invisible clickjacking div:', target);
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

      // Inject dedicated target picker styles (Desktop + Mobile Responsive)
      let pickerStyle = document.getElementById('adblock-max-picker-style');
      if (!pickerStyle) {
        pickerStyle = document.createElement('style');
        pickerStyle.id = 'adblock-max-picker-style';
        pickerStyle.textContent = `
          #adblock-max-target-badge {
            position: fixed !important;
            bottom: 14px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            z-index: 2147483647 !important;
            background: rgba(15, 23, 42, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            -webkit-backdrop-filter: blur(12px) !important;
            border: 1px solid rgba(255, 255, 255, 0.22) !important;
            border-radius: 16px !important;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.65), 0 0 16px rgba(99, 102, 241, 0.25) !important;
            padding: 6px 10px !important;
            display: flex !important;
            flex-direction: row !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 6px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 11px !important;
            color: #f3f4f6 !important;
            user-select: none !important;
            box-sizing: border-box !important;
            max-width: calc(100vw - 16px) !important;
            width: max-content !important;
            pointer-events: auto !important;
          }

          #adblock-max-target-badge * {
            box-sizing: border-box !important;
          }

          .abm-badge-row {
            display: flex !important;
            align-items: center !important;
            gap: 5px !important;
            min-width: 0 !important;
          }

          .abm-selector-tag {
            background: rgba(255, 255, 255, 0.12) !important;
            color: #a5b4fc !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-family: monospace !important;
            font-size: 10.5px !important;
            max-width: 140px !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            white-space: nowrap !important;
            display: inline-block !important;
            vertical-align: middle !important;
          }

          .abm-btn {
            background: rgba(255, 255, 255, 0.12) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
            color: #e2e8f0 !important;
            padding: 4px 8px !important;
            border-radius: 12px !important;
            font-size: 10.5px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            white-space: nowrap !important;
            touch-action: manipulation !important;
            line-height: 1.2 !important;
          }

          .abm-btn:active {
            transform: scale(0.95) !important;
          }

          .abm-btn-reselect {
            background: rgba(255, 255, 255, 0.08) !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            color: #cbd5e1 !important;
            font-weight: 500 !important;
          }

          .abm-btn-block {
            background: linear-gradient(135deg, #f43f5e, #e11d48) !important;
            border: none !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            box-shadow: 0 2px 8px rgba(244, 63, 94, 0.4) !important;
            padding: 4px 12px !important;
          }

          .abm-btn-cancel {
            background: none !important;
            border: none !important;
            color: #94a3b8 !important;
            padding: 3px 6px !important;
            font-size: 11px !important;
          }

          /* Mobile Phone Optimization (<= 480px): 2 Neat Rows, No Overflow or Truncation of Buttons */
          @media (max-width: 480px) {
            #adblock-max-target-badge {
              flex-direction: column !important;
              bottom: 10px !important;
              padding: 6px 8px !important;
              gap: 5px !important;
              border-radius: 14px !important;
              width: calc(100vw - 16px) !important;
              max-width: 360px !important;
            }
            .abm-badge-row-header {
              width: 100% !important;
              justify-content: space-between !important;
            }
            .abm-badge-row-header .abm-selector-tag {
              max-width: calc(100vw - 80px) !important;
            }
            .abm-badge-row-actions {
              width: 100% !important;
              justify-content: space-between !important;
              gap: 4px !important;
            }
            .abm-badge-row-actions .abm-btn {
              flex: 1 1 auto !important;
              padding: 6px 4px !important;
              font-size: 11px !important;
              border-radius: 10px !important;
            }
            .abm-badge-row-actions .abm-btn-block {
              flex: 1.4 1 auto !important;
            }
            .abm-badge-row-actions .abm-btn-cancel {
              flex: 0 0 26px !important;
              padding: 6px 2px !important;
            }
          }
        `;
        mount.appendChild(pickerStyle);
      }

      // Create control badge
      if (!pickerBadge) {
        pickerBadge = document.createElement('div');
        pickerBadge.id = 'adblock-max-target-badge';
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

      // Focus page immediately so Esc key works without needing a prior click
      try {
        window.focus();
        if (document.body) document.body.focus();
        else if (document.documentElement) document.documentElement.focus();
      } catch (err) { }

      function renderInstructionBadge() {
        if (!pickerBadge) return;
        pickerBadge.innerHTML = `
          <div class="abm-badge-row abm-badge-row-header" style="justify-content: space-between; width: 100%;">
            <div style="display: flex; align-items: center; gap: 6px; min-width: 0;">
              <span style="font-size: 13px;">🎯</span>
              <span style="font-weight: 600; color: #cbd5e1; font-size: 11px; white-space: nowrap;">Di chuột hoặc bấm phần tử để chặn</span>
            </div>
            <button id="abm-cancel-btn" class="abm-btn abm-btn-cancel" style="background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.22); border-radius: 12px; color: #e2e8f0; padding: 3px 10px; font-size: 11px; font-weight: 600;">✕ Thoát (Esc)</button>
          </div>
        `;
        const cncBtn = document.getElementById('abm-cancel-btn');
        if (cncBtn) cncBtn.onclick = (e) => { e.stopPropagation(); stopTargetPicker(); };
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
        const selDisplay = selector ? (selector.length > 25 ? selector.substring(0, 25) + '...' : selector) : 'phần tử';

        if (!pickerBadge) return;

        // When NOT locked (hovering over element): Show element selector + instant Block button + Escape
        if (!isLocked) {
          pickerBadge.innerHTML = `
            <div class="abm-badge-row abm-badge-row-header">
              <span style="font-size: 13px;">🎯</span>
              <code class="abm-selector-tag" title="${(selector || '').replace(/"/g, '&quot;')}">${selDisplay}</code>
            </div>
            <div class="abm-badge-row abm-badge-row-actions">
              <button id="abm-lock-btn" class="abm-btn abm-btn-reselect" title="Bấm vào để khóa và tinh chỉnh phần tử này">🔒 Chọn</button>
              <button id="abm-block-btn" class="abm-btn abm-btn-block" title="Chặn và ẩn phần tử này ngay (Enter)">🚫 Chặn</button>
              <button id="abm-cancel-btn" class="abm-btn abm-btn-cancel" title="Thoát chế độ chọn (Esc)">✕ Thoát</button>
            </div>
          `;

          const lockBtn = document.getElementById('abm-lock-btn');
          if (lockBtn) {
            lockBtn.onclick = (e) => {
              e.stopPropagation();
              lockElement(el);
            };
          }

          const blkBtn = document.getElementById('abm-block-btn');
          if (blkBtn) {
            blkBtn.onclick = (e) => {
              e.stopPropagation();
              confirmAndBlockElement(el);
            };
          }

          const cncBtn = document.getElementById('abm-cancel-btn');
          if (cncBtn) {
            cncBtn.onclick = (e) => {
              e.stopPropagation();
              stopTargetPicker();
            };
          }
          return;
        }

        // When LOCKED (user has selected/locked element):
        const canShrink = historyIndex > 0;
        pickerBadge.innerHTML = `
          <div class="abm-badge-row abm-badge-row-header">
            <span style="font-size: 13px;">🎯</span>
            <code class="abm-selector-tag" title="${(selector || '').replace(/"/g, '&quot;')}">${selDisplay}</code>
          </div>
          <div class="abm-badge-row abm-badge-row-actions">
            <button id="abm-expand-btn" class="abm-btn" title="Mở rộng vùng chọn ra thẻ cha">🔼</button>
            ${canShrink ? `<button id="abm-shrink-btn" class="abm-btn" title="Thu nhỏ lại phần tử con">🔽</button>` : ''}
            <button id="abm-reselect-btn" class="abm-btn abm-btn-reselect" title="Đổi chọn phần tử khác">Đổi</button>
            <button id="abm-block-btn" class="abm-btn abm-btn-block" title="Xác nhận chặn phần tử này (Enter)">🚫 Chặn</button>
            <button id="abm-cancel-btn" class="abm-btn abm-btn-cancel" title="Thoát (Esc)">✕</button>
          </div>
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
        let target = e.target;
        if (!target || target === pickerOverlay) {
          if (pickerOverlay) pickerOverlay.style.display = 'none';
          target = document.elementFromPoint(e.clientX, e.clientY);
          if (pickerOverlay) pickerOverlay.style.display = 'block';
        }
        if (target && pickerBadge && !pickerBadge.contains(target) && target !== pickerOverlay) {
          updateOverlay(target);
        }
      }

      function lockElement(target) {
        if (!target || target === pickerOverlay || target === pickerBadge || (pickerBadge && pickerBadge.contains(target))) return;
        if (target === document.body || target === document.documentElement) return;
        targetHistory = [target];
        historyIndex = 0;
        isLocked = true;
        currentHoveredTarget = target;
        updateOverlay(target);
      }

      function onClick(e) {
        if (!isTargetPickerActive) return;
        if (pickerBadge && (pickerBadge.contains(e.target) || e.target === pickerBadge)) return;
        
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        let target = e.target;
        if (!target || target === pickerOverlay || target === document.body || target === document.documentElement) {
          if (pickerOverlay) pickerOverlay.style.display = 'none';
          target = document.elementFromPoint(e.clientX, e.clientY);
          if (pickerOverlay) pickerOverlay.style.display = 'block';
        }

        if (target) {
          lockElement(target);
        }
      }

      function onTouchStartPicker(e) {
        if (!isTargetPickerActive) return;
        if (pickerBadge && (pickerBadge.contains(e.target) || e.target === pickerBadge)) return;
        if (e.touches && e.touches[0]) {
          const t = e.touches[0];
          let target = e.target;
          if (!target || target === pickerOverlay || target === document.body || target === document.documentElement) {
            if (pickerOverlay) pickerOverlay.style.display = 'none';
            target = document.elementFromPoint(t.clientX, t.clientY);
            if (pickerOverlay) pickerOverlay.style.display = 'block';
          }
          if (target) {
            e.preventDefault();
            e.stopPropagation();
            lockElement(target);
          }
        }
      }

      function onKeyDown(e) {
        if (!isTargetPickerActive) return;
        const key = e.key || '';
        const code = e.keyCode || e.which;
        if (key === 'Escape' || key === 'Esc' || code === 27) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          stopTargetPicker();
          return;
        }
        if (key === 'Enter' || code === 13) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const toBlock = targetHistory[historyIndex] || currentHoveredTarget;
          if (toBlock) {
            confirmAndBlockElement(toBlock);
          }
          return;
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
      window.addEventListener('touchstart', onTouchStartPicker, { capture: true, passive: false });
      window.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('keydown', onKeyDown, true);
      window.addEventListener('keyup', onKeyDown, true);
      document.addEventListener('keyup', onKeyDown, true);

      pickerCleanup = () => {
        window.removeEventListener('mousemove', onMouseMove, true);
        window.removeEventListener('click', onClick, true);
        window.removeEventListener('touchstart', onTouchStartPicker, true);
        window.removeEventListener('keydown', onKeyDown, true);
        document.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyDown, true);
        document.removeEventListener('keyup', onKeyDown, true);
        const cStyle = document.getElementById('adblock-max-cursor-override');
        if (cStyle && cStyle.parentNode) cStyle.remove();
        const pStyle = document.getElementById('adblock-max-picker-style');
        if (pStyle && pStyle.parentNode) pStyle.remove();
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
      isLocked = false;
      targetHistory = [];
      historyIndex = 0;
      currentHoveredTarget = null;
      if (pickerOverlay) pickerOverlay.style.display = 'none';
      renderInstructionBadge();
    }

    function stopTargetPicker() {
      if (pickerCleanup) {
        pickerCleanup();
        pickerCleanup = null;
      }
    }

    // Listen for background message (Right-Click Context Menu / Popup Target Button)
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
  
    // Mobile Gesture: 3-Finger Tap quickly toggles Target Mode on/off
    document.addEventListener('touchstart', (e) => {
      if (!currentEnabledState) return;
      if (e.touches && e.touches.length === 3) {
        if (isTargetPickerActive) {
          stopTargetPicker();
        } else {
          startTargetPicker(null, null);
        }
      }
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
      const overrideProtection = `
        :is(.movie-banner, .film-banner, .hero-banner, .banner-film, .film-poster, .movie-poster, .poster-film, .film-item, .movie-item, .tray-item, .halim-item, .flw-item, .film_info, [class*="banner-slider"], [class*="hero-banner"], [class*="film-banner"], [class*="movie-banner"], [class*="video-slider"], [id*="video-slider"], [class*="film-item"], [class*="movie-item"], [class*="film-poster"], [class*="movie-poster"], [class*="hero-anim"], [class*="backdrop"]) {
          visibility: visible !important;
          pointer-events: auto !important;
        }
        .swiper, .swiper-wrapper { visibility: visible !important; }
        img:is([src*="animevietsub"], [src*="phim"], [src*="film"], [src*="movie"], [src*="poster"], [src*="thumb"], [src*="cover"], [src*="tmdb.org"], [src*="wsrv.nl"], [src*="nguonc.com"], [src*="phimimg.com"], [src*="ophim"], [src*="vsmov"], [src*="themoviedb"], [alt*="phim" i], [alt*="Phim" i], [alt*="tập" i], [alt*="Tập" i]) {
          visibility: visible !important;
          pointer-events: auto !important;
          min-width: 1px !important;
          min-height: 1px !important;
        }
      `;
      dynamicCosmeticStyle.textContent = selectors.join(',\n') + ' { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }\n' + overrideProtection;
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

    // === motphimc.app PopupAd Guardian ===
    // Radix UI Dialog popup overlay renders after 1500ms delay;
    // CSS alone can't catch it reliably, so we use a MutationObserver.
    (function motphimPopupGuard() {
      if (!window.location.hostname.includes('motphimc')) return;

      const GAMBLING_HREFS = [
        'rikvip', 'rikvipchinhhang', '78win', 'adcenter', 'bom88', 'gem88',
        'net88', 'uk88', 'vsbet', 'musicskins', '789bet', 'fun88', 'kubet'
      ];

      function isPopupOrOverlay(el) {
        if (!el || !el.classList) return false;
        const cls = el.className || '';
        // Radix Dialog overlay uses z-[9998], modal uses z-[9999]
        if (cls.includes('z-[9998]') || cls.includes('z-[9999]')) return true;
        // dialog role with gambling link inside
        if (el.getAttribute('role') === 'dialog' || el.getAttribute('aria-modal') === 'true') {
          const links = el.querySelectorAll('a[href]');
          for (const a of links) {
            if (GAMBLING_HREFS.some(kw => (a.href || '').toLowerCase().includes(kw))) return true;
          }
          const imgs = el.querySelectorAll('img[src]');
          for (const img of imgs) {
            if (GAMBLING_HREFS.some(kw => (img.src || '').toLowerCase().includes(kw))) return true;
          }
        }
        return false;
      }

      function scanAndRemovePopups(root) {
        const candidates = (root || document).querySelectorAll(
          '[class*="z-[9998]"], [class*="z-[9999]"], [role="dialog"], [aria-modal="true"]'
        );
        candidates.forEach(el => {
          if (isPopupOrOverlay(el)) {
            el.remove();
            console.log('[Anti Pop-Under] Removed motphimc popup overlay:', el.className || el.tagName);
          }
        });
        // Also reset body overflow if it was locked by the popup
        if (document.body && document.body.style.overflow === 'hidden') {
          document.body.style.overflow = '';
        }
      }

      const popupObserver = new MutationObserver((mutations) => {
        for (const mut of mutations) {
          for (const node of mut.addedNodes) {
            if (node.nodeType === 1) {
              if (isPopupOrOverlay(node)) {
                node.remove();
                if (document.body && document.body.style.overflow === 'hidden') {
                  document.body.style.overflow = '';
                }
              } else {
                // Check children of added node
                scanAndRemovePopups(node);
              }
            }
          }
        }
      });

      const startObserver = () => {
        if (document.body) {
          popupObserver.observe(document.body, { childList: true, subtree: true });
          // Also scan immediately in case popup already exists
          scanAndRemovePopups(document);
        }
      };

      if (document.body) {
        startObserver();
      } else {
        document.addEventListener('DOMContentLoaded', startObserver, { once: true });
      }
    })();
    // === END motphimc.app PopupAd Guardian ===
