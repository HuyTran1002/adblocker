const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

console.log('===============================================================');
console.log('🧪 RIGOROUS QA SUITE: JAVMOST.WS & DOOPLAYER.COM ANTI-POPUNDER');
console.log('===============================================================\n');

const rulesJson = JSON.parse(fs.readFileSync('d:/Program Files/Code/adblocker/rules.json', 'utf8'));
const injectCode = fs.readFileSync('d:/Program Files/Code/adblocker/inject.js', 'utf8');
const contentCode = fs.readFileSync('d:/Program Files/Code/adblocker/content.js', 'utf8');
const bgCode = fs.readFileSync('d:/Program Files/Code/adblocker/background.js', 'utf8');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.stack || err.message);
    failed++;
  }
}

// -------------------------------------------------------------------------
// 1. DNR NETWORK LAYER TESTS (rules.json & background.js)
// -------------------------------------------------------------------------
test('1.1 DNR Rule 201 whitelists dooplayer.com & www.dooplayer.com (priority 100)', () => {
  const rule201 = rulesJson.find(r => r.id === 201);
  assert(rule201, 'Rule 201 must exist');
  assert.strictEqual(rule201.action.type, 'allow');
  assert.strictEqual(rule201.priority, 100);
  assert(rule201.condition.requestDomains.includes('dooplayer.com'), 'Must include dooplayer.com');
  assert(rule201.condition.requestDomains.includes('www.dooplayer.com'), 'Must include www.dooplayer.com');
});

test('1.2 DNR Rules 330-334 block Clickadu OnClick, WPAdMngr, PopAds jpm.js, and ExoClick', () => {
  const rule330 = rulesJson.find(r => r.id === 330);
  const rule331 = rulesJson.find(r => r.id === 331);
  const rule332 = rulesJson.find(r => r.id === 332);
  const rule333 = rulesJson.find(r => r.id === 333);
  const rule334 = rulesJson.find(r => r.id === 334);
  assert(rule330 && rule330.action.type === 'block', 'Rule 330 must block ad domains');
  for (const dom of ['wpadmngr.com', 'astronautlividlyreformer.com', 'realsrv.com', 'exosrv.com', 'zog.link', 'tubecup.net']) {
    assert(rule330.condition.requestDomains.includes(dom), `Rule 330 must block ${dom}`);
  }
  assert(rule331 && rule331.condition.urlFilter === '*src/jpm.js*', 'Rule 331 must block *src/jpm.js*');
  assert(rule333 && rule333.condition.urlFilter === '*/get/*?id=*&dr=49&cuaa=*', 'Rule 333 must block Clickadu JSONP config');
  assert(rule334 && rule334.condition.urlFilter === '*/solid.gif?z=*', 'Rule 334 must block Clickadu solid.gif beacon');
});

test('1.3 background.js SAFE_EXCLUDED protects dooplayer and javmost from online filter false-positives', () => {
  assert(bgCode.includes("'dooplayer'") && bgCode.includes("'javmost'"), 'SAFE_EXCLUDED must include dooplayer and javmost');
});

// -------------------------------------------------------------------------
// 2. HELPER: CREATE REALISTIC BROWSER VM SANDBOX (MAIN FRAME OR PLAYER IFRAME)
// -------------------------------------------------------------------------
function createBrowserEnv({ urlStr, isIframe }) {
  const parsedUrl = new URL(urlStr);
  let currentHref = parsedUrl.href;
  let realWindowOpens = [];
  let realLocationNavigations = [];
  let appendedNodes = [];
  let registeredListeners = [];

  class MockLocation {
    constructor() {
      this.hostname = parsedUrl.hostname;
      this.pathname = parsedUrl.pathname;
      this.search = parsedUrl.search || '';
      this.hash = parsedUrl.hash || '';
      this.origin = parsedUrl.origin;
      this.protocol = parsedUrl.protocol;
    }
    get href() { return currentHref; }
    set href(val) { realLocationNavigations.push(val); currentHref = val; }
    assign(val) { realLocationNavigations.push(val); currentHref = val; }
    replace(val) { realLocationNavigations.push(val); currentHref = val; }
    reload() {}
  }
  const locationObj = new MockLocation();

  class MockDOMEvent {
    constructor(type, opts = {}) {
      this.type = type;
      this.target = opts.target || null;
      this.defaultPrevented = false;
      this.propagationStopped = false;
      this.isTrusted = opts.isTrusted !== false;
    }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this.propagationStopped = true; }
    stopImmediatePropagation() { this.propagationStopped = true; }
  }

  class MockElement {
    constructor(tagName) {
      this.tagName = String(tagName || 'DIV').toUpperCase();
      this.nodeType = 1;
      this.attributes = {};
      this.style = {
        setProperty(k, v) { this[k] = v; },
        getPropertyValue(k) { return this[k] || ''; }
      };
      this.classList = {
        _set: new Set(),
        add(...cls) { cls.forEach(c => this._set.add(c)); },
        remove(...cls) { cls.forEach(c => this._set.delete(c)); },
        contains(c) { return this._set.has(c); }
      };
      this.dataset = {};
      this.children = [];
      this.parentElement = null;
      this.isConnected = true;
      this._listeners = {};
    }
    setAttribute(name, val) {
      this.attributes[name] = String(val);
      if (name === 'id') this.id = String(val);
      if (name === 'class') this.className = String(val);
      if (name === 'src') this.src = String(val);
      if (name === 'href') this.href = String(val);
      if (name.startsWith('data-')) {
        const camel = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[camel] = String(val);
      }
    }
    getAttribute(name) {
      if (name === 'id' && this.id) return this.id;
      if (name === 'class' && this.className) return this.className;
      if (name === 'src' && this.src) return this.src;
      if (name === 'href' && this.href) return this.href;
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    }
    hasAttribute(name) {
      return this.getAttribute(name) !== null;
    }
    removeAttribute(name) {
      delete this.attributes[name];
    }
    appendChild(child) {
      if (child) {
        child.parentElement = this;
        this.children.push(child);
        appendedNodes.push(child);
      }
      return child;
    }
    insertBefore(child, ref) {
      return this.appendChild(child);
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    }
    remove() {
      this.isConnected = false;
      if (this.parentElement) this.parentElement.removeChild(this);
    }
    matches(sel) {
      const s = String(sel).toLowerCase();
      if (s.includes('data-cl-overlay') && this.hasAttribute('data-cl-overlay')) return true;
      if (s.includes('data-clocid') && this.hasAttribute('data-clocid')) return true;
      if (s.includes('data-admpid') && this.hasAttribute('data-admpid')) return true;
      if (s.includes('play-btn') && (this.className || '').includes('play-btn')) return true;
      if (s.includes('plyr') && (this.className || '').includes('plyr')) return true;
      return false;
    }
    closest(sel) {
      let cur = this;
      while (cur) {
        if (cur.matches && cur.matches(sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    querySelector(sel) {
      const s = String(sel);
      if (s === 'video') return this.children.find(c => c.tagName === 'VIDEO') || null;
      return null;
    }
    querySelectorAll() { return []; }
    getBoundingClientRect() { return { top: 0, left: 0, width: 800, height: 450, right: 800, bottom: 450 }; }
    addEventListener(type, fn, opts) {
      registeredListeners.push({ target: this, type, fn, opts });
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push({ fn, opts });
    }
    dispatchEvent(ev) {
      ev.target = ev.target || this;
      const list = this._listeners[ev.type] || [];
      for (const item of list) {
        item.fn.call(this, ev);
      }
      return !ev.defaultPrevented;
    }
    click() {
      const ev = { type: 'click', target: this, isTrusted: true, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
      this.dispatchEvent(ev);
    }
  }

  class HTMLScriptElement extends MockElement {
    constructor() { super('SCRIPT'); this._src = ''; }
    get src() { return this._src; }
    set src(v) { this._src = String(v); this.attributes.src = String(v); }
  }
  class HTMLAnchorElement extends MockElement {
    constructor() { super('A'); }
  }
  class HTMLIFrameElement extends MockElement {
    constructor() { super('IFRAME'); }
  }
  class HTMLFormElement extends MockElement {
    constructor() { super('FORM'); }
    submit() {}
  }

  const docEl = new MockElement('HTML');
  const headEl = new MockElement('HEAD');
  const bodyEl = new MockElement('BODY');
  docEl.appendChild(headEl);
  docEl.appendChild(bodyEl);

  // Add mock script tags with data-clocid="2080742" and data-admpid="17930" to test querySelector trap
  const clScript = new HTMLScriptElement();
  clScript.setAttribute('data-clocid', '2080742');
  clScript.src = 'https://astronautlividlyreformer.com/on.js';
  bodyEl.appendChild(clScript);

  const admScript = new HTMLScriptElement();
  admScript.setAttribute('data-admpid', '17930');
  admScript.src = 'https://js.wpadmngr.com/static/adManager.js';
  bodyEl.appendChild(admScript);

// locationObj already defined above as MockLocation

  class Document {
    constructor() {
      this.documentElement = docEl;
      this.head = headEl;
      this.body = bodyEl;
      this.readyState = 'complete';
      this.currentScript = null;
      this.scripts = [clScript, admScript];
      this._listeners = {};
    }
    createElement(tag) {
      const t = String(tag).toLowerCase();
      if (t === 'script') return new HTMLScriptElement();
      if (t === 'a') return new HTMLAnchorElement();
      if (t === 'iframe') return new HTMLIFrameElement();
      return new MockElement(tag);
    }
    getElementById(id) {
      if (id === 'show_player') return showPlayerDiv;
      return null;
    }
    querySelector(sel) {
      if (sel.includes('data-clocid')) return clScript;
      if (sel.includes('data-admpid')) return admScript;
      return null;
    }
    querySelectorAll(sel) {
      if (sel.includes('data-clocid')) return [clScript];
      if (sel.includes('data-admpid')) return [admScript];
      return [];
    }
    addEventListener(type, fn, opts) {
      registeredListeners.push({ target: this, type, fn, opts });
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push({ fn, opts });
    }
    removeEventListener() {}
    dispatchEvent(ev) {
      const list = this._listeners[ev.type] || [];
      for (const item of list) item.fn.call(this, ev);
    }
    contains() { return true; }
  }

  const showPlayerDiv = new MockElement('DIV');
  showPlayerDiv.id = 'show_player';
  bodyEl.appendChild(showPlayerDiv);

  const doc = new Document();

  const win = {
    location: locationObj,
    document: doc,
    navigator: {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
      platform: 'Win32',
      language: 'en-US',
      languages: ['en-US', 'en'],
      vendor: 'Google Inc.'
    },
    Element: MockElement,
    HTMLElement: MockElement,
    HTMLScriptElement,
    HTMLAnchorElement,
    Location: MockLocation,
    Event: class MockDOMEvent {
      constructor(type, opts = {}) {
        this.type = type;
        this.target = (opts && opts.target) ? opts.target : null;
        this.defaultPrevented = false;
        this.propagationStopped = false;
        this.isTrusted = opts.isTrusted !== false;
      }
      preventDefault() { this.defaultPrevented = true; }
      stopPropagation() { this.propagationStopped = true; }
      stopImmediatePropagation() { this.propagationStopped = true; }
    },
    HTMLIFrameElement,
    HTMLFormElement,
    Node: MockElement,
    Document,
    EventTarget: MockElement,
    MutationObserver: class { observe() {} disconnect() {} },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    PointerEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
    MouseEvent: class { constructor(type, init) { this.type = type; Object.assign(this, init); } },
    URL,
    Proxy,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    Math,
    Date,
    JSON,
    parseInt,
    parseFloat,
    isNaN,
    encodeURIComponent,
    decodeURIComponent,
    btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
    atob: (s) => Buffer.from(s, 'base64').toString('binary'),
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: () => 1,
    clearInterval: () => {},
    requestAnimationFrame: () => 1,
    getComputedStyle: (el) => ({
      position: (el && el.style && el.style.position) || 'static',
      zIndex: (el && el.style && el.style.zIndex) || '0',
      opacity: (el && el.style && el.style.opacity) || '1',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      display: (el && el.style && el.style.display) || 'block',
      visibility: 'visible'
    }),
    postMessage: () => {},
    open: function(url, target, features) {
      realWindowOpens.push({ url, target, features });
      return { location: { href: '' }, focus() {}, blur() {}, close() {} };
    },
    addEventListener(type, fn, opts) {
      registeredListeners.push({ target: win, type, fn, opts });
      if (!win._listeners[type]) win._listeners[type] = [];
      win._listeners[type].push({ fn, opts });
    },
    removeEventListener() {},
    dispatchEvent(ev) {
      const list = win._listeners[ev.type] || [];
      for (const item of list) item.fn.call(win, ev);
    },
    _listeners: {},
    innerWidth: 1280,
    innerHeight: 720,
    console: { log() {}, warn() {}, error() {} }
  };

  win.window = win;
  win.self = win;
  win.globalThis = win;
  win.top = isIframe ? {} : win;
  win.parent = isIframe ? {} : win;
  win.Window = function Window() {};
  win.Window.prototype = win;

  vm.createContext(win);
  vm.runInContext(injectCode, win);

  return {
    win,
    doc,
    bodyEl,
    showPlayerDiv,
    MockElement,
    HTMLScriptElement,
    realWindowOpens,
    realLocationNavigations,
    appendedNodes,
    registeredListeners
  };
}

// -------------------------------------------------------------------------
// 3. MAIN-WORLD JAVMOST.WS TESTS
// -------------------------------------------------------------------------
const javEnv = createBrowserEnv({ urlStr: 'https://www.javmost.ws/CAWB-067/', isIframe: false });

test('2.1 ExoVideoSlider constructor stub prevents ReferenceError on javmost.ws line 1066', () => {
  const sliderInstance = vm.runInContext('new ExoVideoSlider({ container: "#slider" })', javEnv.win);
  assert(sliderInstance && typeof sliderInstance.init === 'function', 'new ExoVideoSlider() must succeed');
});

test('2.2 WPAdMngr script[data-admpid] is hidden from querySelector & real adManager.js is disarmed', () => {
  const foundScript = javEnv.doc.querySelector('script[data-admpid]');
  assert.strictEqual(foundScript, null, 'document.querySelector("script[data-admpid]") must return null');
  assert(Boolean(javEnv.win.a3klsam), 'window.a3klsam must be truthy so adManager.js aborts');
  const realAdManager = fs.readFileSync('C:/Users/HuyBlink/.gemini/antigravity/brain/29a1411f-1136-4c13-9fbb-607e48aa54b6/scratch/adManager_clean.js', 'utf8').replace(/^\uFEFF/, '');
  vm.runInContext(realAdManager, javEnv.win);
  assert.strictEqual(javEnv.realWindowOpens.length, 0, 'Real adManager.js must trigger ZERO window.open calls');
  assert.strictEqual(javEnv.realLocationNavigations.length, 0, 'Real adManager.js must trigger ZERO redirects');
});

test('2.3 PopAds _pop and jpm.js script injection are completely blocked', () => {
  vm.runInContext('window._pop = [["siteId", 12345], ["minBid", 0]]; window._pop.push(["popundersPerIP", 10]);', javEnv.win);
  assert(javEnv.win._pop && javEnv.win._pop.length === 0, 'window._pop must remain length 0');

  const s = javEnv.doc.createElement('script');
  s.src = 'https://www.javmost.ws/src/jpm.js';
  assert(s.src.startsWith('data:text/javascript'), `jpm.js script src must be neutralized, got: ${s.src}`);
});

test('2.4 javmost.ws select_part() / init_start_select() loads dooplayer iframe cleanly', () => {
  vm.runInContext(`
    function select_part(part, button, group, code, code2, code3, value) {
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.dooplayer.com/embed/e/' + value;
      document.getElementById('show_player').appendChild(iframe);
      return iframe;
    }
    var loadedIframe = select_part('1','1','1','CAWB-067','direct','1','ABC123XYZ');
  `, javEnv.win);
  assert.strictEqual(javEnv.win.loadedIframe.src, 'https://www.dooplayer.com/embed/e/ABC123XYZ');
  assert.strictEqual(javEnv.realWindowOpens.length, 0, 'Zero popups during select_part');
});

// -------------------------------------------------------------------------
// 4. EMBEDDED PLAYER IFRAME (DOOPLAYER.COM) & CLICKADU ON.JS TESTS
// -------------------------------------------------------------------------
const dooEnv = createBrowserEnv({ urlStr: 'https://www.dooplayer.com/embed/e/ABC123XYZ', isIframe: true });

test('3.1 Clickadu on.js script[data-clocid] is hidden from querySelector inside dooplayer.com iframe', () => {
  const found = dooEnv.doc.querySelector('script[data-clocid]');
  assert.strictEqual(found, null, 'document.querySelector("script[data-clocid]") must return null in player iframe');
});

test('3.2 Clickadu ProxyListener (UHJveHlMaXN0ZW5lcg==) and onclopen are trapped in player iframe', () => {
  const proxyListener = dooEnv.win['UHJveHlMaXN0ZW5lcg=='];
  assert(proxyListener && typeof proxyListener.init === 'function' && typeof proxyListener.addRealHandler === 'function', 'ProxyListener trap must exist');
  assert.strictEqual(typeof dooEnv.win.onclopen, 'function', 'window.onclopen must be a dummy function');
  assert.strictEqual(dooEnv.win.onclopen('https://ad.example.com'), null, 'window.onclopen() must return null');
});

test('3.3 Executing real Clickadu on.js inside dooplayer.com iframe produces ZERO overlays & ZERO listeners', () => {
  const realOnJs = fs.readFileSync('C:/Users/HuyBlink/.gemini/antigravity/brain/29a1411f-1136-4c13-9fbb-607e48aa54b6/scratch/on_js.js', 'utf8');
  const overlaysBefore = dooEnv.appendedNodes.filter(n => n.hasAttribute && n.hasAttribute('data-cl-overlay')).length;
  vm.runInContext(realOnJs, dooEnv.win);
  const overlaysAfter = dooEnv.appendedNodes.filter(n => n.hasAttribute && n.hasAttribute('data-cl-overlay')).length;
  assert.strictEqual(overlaysAfter - overlaysBefore, 0, 'Real on.js must attach ZERO data-cl-overlay elements');
  assert.strictEqual(dooEnv.realWindowOpens.length, 0, 'Real on.js must trigger ZERO window.open calls');
  assert.strictEqual(dooEnv.realLocationNavigations.length, 0, 'Real on.js must trigger ZERO location redirects');
});

test('3.4 Tab-under protection: window.open() with no args (gr.open()) returns null so F.href = adUrl NEVER executes', () => {
  const res = vm.runInContext(`
    var tabUnderRedirected = false;
    var w = window.open();
    if (w) {
      tabUnderRedirected = true;
    }
    w;
  `, dooEnv.win);
  assert.strictEqual(res, null, 'window.open() with empty/blank URL must return null');
  assert.strictEqual(dooEnv.win.tabUnderRedirected, false, 'Tab-under branch if (this.$i(r)) { F.href = ... } must NOT execute!');
  assert.strictEqual(dooEnv.realWindowOpens.length, 0, 'Underlying originalOpen must NOT be called');
});

test('3.5 DOM Gatekeeper blocks div[data-cl-overlay] insertion even if an ad script tries to append it manually', () => {
  const overlayDiv = dooEnv.doc.createElement('div');
  overlayDiv.setAttribute('data-cl-overlay', '');
  overlayDiv.style.position = 'absolute';
  overlayDiv.style.zIndex = '2147483647';
  dooEnv.bodyEl.appendChild(overlayDiv);
  assert(!dooEnv.bodyEl.children.includes(overlayDiv), 'div[data-cl-overlay] must be rejected by DOM gatekeeper');
});

test('3.6 Clicking Play button (.play-btn & .plyr__control--overlaid) inside dooplayer.com works 100% natively', () => {
  const videoEl = dooEnv.doc.createElement('video');
  videoEl.paused = true;
  let videoPlayed = false;
  videoEl.play = function() {
    this.paused = false;
    videoPlayed = true;
    return Promise.resolve();
  };
  dooEnv.bodyEl.appendChild(videoEl);

  const playBtn = dooEnv.doc.createElement('div');
  playBtn.setAttribute('class', 'play-btn plyr__control--overlaid');
  dooEnv.bodyEl.appendChild(playBtn);

  let playBtnClicked = false;
  playBtn.addEventListener('click', () => {
    playBtnClicked = true;
    videoEl.play();
  });

  // Simulate user clicking Play button
  playBtn.click();
  const winClickEvent = {
    type: 'click',
    target: playBtn,
    isTrusted: true,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; }
  };
  dooEnv.win.dispatchEvent(winClickEvent);

  assert.strictEqual(playBtnClicked, true, 'Play button click handler must fire');
  assert.strictEqual(videoPlayed, true, 'Video playback must start');
  assert.strictEqual( Boolean(winClickEvent.defaultPrevented), false, 'inject.js must NOT preventDefault on legitimate Play button click');
  assert.strictEqual(dooEnv.realWindowOpens.length, 0, 'Zero popups on Play click');
  assert.strictEqual(dooEnv.realLocationNavigations.length, 0, 'Zero redirects on Play click');
});

test('3.7 Player Controls During Playback: Pause, Volume, Seek & Fullscreen work 100% natively without stopPropagation', () => {
  const plyrContainer = dooEnv.doc.createElement('div');
  plyrContainer.setAttribute('class', 'plyr plyr--video plyr--playing');
  dooEnv.bodyEl.appendChild(plyrContainer);

  const videoEl = dooEnv.doc.createElement('video');
  videoEl.paused = false; // Video is currently playing!
  plyrContainer.appendChild(videoEl);

  const controlsBar = dooEnv.doc.createElement('div');
  controlsBar.setAttribute('class', 'plyr__controls');
  plyrContainer.appendChild(controlsBar);

  const pauseBtn = dooEnv.doc.createElement('button');
  pauseBtn.setAttribute('class', 'plyr__controls__item plyr__control');
  pauseBtn.setAttribute('data-plyr', 'play');
  controlsBar.appendChild(pauseBtn);

  let pauseClicked = false;
  pauseBtn.addEventListener('click', () => {
    pauseClicked = true;
    videoEl.paused = true;
  });

  const volumeBtn = dooEnv.doc.createElement('button');
  volumeBtn.setAttribute('class', 'plyr__controls__item plyr__control');
  volumeBtn.setAttribute('data-plyr', 'mute');
  controlsBar.appendChild(volumeBtn);

  let volumeClicked = false;
  volumeBtn.addEventListener('click', () => {
    volumeClicked = true;
  });

  // 1. Simulate clicking the Pause button
  const pauseEvt = {
    type: 'click',
    target: pauseBtn,
    isTrusted: true,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; }
  };
  dooEnv.win.dispatchEvent(pauseEvt);
  pauseBtn.click();

  assert.strictEqual(pauseClicked, true, 'Pause button must receive click event');
  assert.strictEqual(videoEl.paused, true, 'Video must successfully pause when user clicks Pause');
  assert.strictEqual(Boolean(pauseEvt.propagationStopped), false, 'inject.js must NOT stop propagation on pause button click');

  // 2. Simulate clicking the Volume button
  const volumeEvt = {
    type: 'click',
    target: volumeBtn,
    isTrusted: true,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagationStopped = true; }
  };
  dooEnv.win.dispatchEvent(volumeEvt);
  volumeBtn.click();

  assert.strictEqual(volumeClicked, true, 'Volume button must receive click event');
  assert.strictEqual(Boolean(volumeEvt.propagationStopped), false, 'inject.js must NOT stop propagation on volume button click');
});

// -------------------------------------------------------------------------
// 4. ADVANCED PLAY BUTTON & REDIRECTION SHIELD TESTS
// -------------------------------------------------------------------------
test('4.1 Play Button Click Shield ignores ad-script preventDefault() on play button click', () => {
  const playBtn = javEnv.doc.createElement('span');
  playBtn.setAttribute('class', 'play-btn');
  javEnv.showPlayerDiv.appendChild(playBtn);

  const clickEvent = new javEnv.win.Event('click', { target: playBtn });
  clickEvent.preventDefault();
  assert.strictEqual(clickEvent.defaultPrevented, false, 'preventDefault() on .play-btn MUST BE IGNORED');
});

test('4.2 Location Redirection Protection: Location.prototype.assign/replace block external ad URLs', () => {
  let navBlocked = false;
  javEnv.win.location.assign('https://ssp.zog.link/get/12345');
  assert.strictEqual(javEnv.realLocationNavigations.length, 0, 'Ad assign() must be blocked from navigating');

  javEnv.win.location.replace('https://astronautlividlyreformer.com/ad');
  assert.strictEqual(javEnv.realLocationNavigations.length, 0, 'Ad replace() must be blocked from navigating');
});

test('4.3 PopAds Token Immunity: PopAds flag is frozen and cannot be hijacked', () => {
  assert.strictEqual(javEnv.win['fcc61ea9f74fd6326508704617f53191'], true, 'PopAds token must be pre-defined as true');
  assert.strictEqual(javEnv.win['fcc61ea9f74fd632fcc61ea9f74fd632'], true, 'PopAds second token must be pre-defined as true');
});

test('4.4 High Priority DNR Rules 330-336 take precedence at priority 150', () => {
  const r330 = rulesJson.find(r => r.id === 330);
  assert(r330 && r330.priority >= 150, 'Rule 330 must have priority >= 150');
  assert(r330.condition.requestDomains.includes('visariomedia.com'), 'visariomedia.com in rule 330');
  assert(r330.condition.requestDomains.includes('d13k7prax1yi04.cloudfront.net'), 'PopAds cloudfront in rule 330');
  assert(r330.condition.requestDomains.includes('hilltopads.net'), 'hilltopads in rule 330');

  const r335 = rulesJson.find(r => r.id === 335);
  assert(r335 && r335.priority >= 150, 'Rule 335 (video-slider.js) must have priority >= 150');

  const r336 = rulesJson.find(r => r.id === 336);
  assert(r336 && r336.priority >= 150, 'Rule 336 (ad-provider.js) must have priority >= 150');
});

test('4.5 Dynamic Ad Script Neutralization: PopAds, ExoClick, and WPAdMngr CDN scripts are neutralized to empty data URIs', () => {
  const testUrls = [
    'https://www.visariomedia.com/X/DYVST/fjquery.magnific-popup.min.js',
    'https://d13k7prax1yi04.cloudfront.net/xbetween.js',
    'https://a.realsrv.com/video-slider.js',
    'https://a.magsrv.com/ad-provider.js'
  ];

  testUrls.forEach(url => {
    const s = javEnv.doc.createElement('script');
    s.src = url;
    assert(s.src.startsWith('data:text/javascript'), url + ' must be replaced with data URI, got: ' + s.src);
  });
});

console.log(`\n===============================================================`);
console.log(`🎉 RESULT: ${passed} PASSED, ${failed} FAILED`);
console.log(`===============================================================`);
if (failed > 0) process.exit(1);
