const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const injectCode = fs.readFileSync(path.join(ROOT, 'inject.js'), 'utf8');
const contentCode = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
const backgroundCode = fs.readFileSync(path.join(ROOT, 'background.js'), 'utf8');
const rulesJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'rules.json'), 'utf8'));

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}\n   ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

/**
 * Lightweight DOM + Mobile Touch Event Sandbox for testing inject.js & content.js
 */
function createMobileSandbox(options = {}) {
  const urlStr = options.url || 'https://supjav.com/12345.html';
  const parsedUrl = new URL(urlStr);
  const isIframe = Boolean(options.isIframe);

  const openedUrls = [];
  const blockedReports = [];
  const scheduledTimers = [];
  let timerSeq = 1;

  class EventTarget {
    addEventListener(type, fn, opts) {
      if (!this._listeners) this._listeners = {};
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push({
        fn,
        capture: Boolean(typeof opts === 'boolean' ? opts : (opts && opts.capture))
      });
    }
    removeEventListener(type, fn, opts) {
      if (!this._listeners || !this._listeners[type]) return;
      const cap = Boolean(typeof opts === 'boolean' ? opts : (opts && opts.capture));
      this._listeners[type] = this._listeners[type].filter(l => !(l.fn === fn && l.capture === cap));
    }
    dispatchEvent(ev) {
      if (!ev || !ev.type) return true;
      if (!ev.target) ev.target = this;
      ev.currentTarget = this;
      const list = (this._listeners && this._listeners[ev.type]) ? [...this._listeners[ev.type]] : [];
      for (const l of list) {
        try { l.fn.call(this, ev); } catch (e) {}
      }
      const handler = this[`on${ev.type}`];
      if (typeof handler === 'function') {
        try { handler.call(this, ev); } catch (e) {}
      }
      return !ev.defaultPrevented;
    }
  }

  class MockNode extends EventTarget {
    constructor(nodeType, nodeName) {
      super();
      this.nodeType = nodeType;
      this.nodeName = nodeName;
      this.parentNode = null;
      this.parentElement = null;
      this.childNodes = [];
      this._listeners = {};
    }
    appendChild(child) {
      if (!child) return child;
      child.parentNode = this;
      child.parentElement = (this.nodeType === 1) ? this : null;
      this.childNodes.push(child);
      return child;
    }
    insertBefore(newNode, refNode) {
      if (!newNode) return newNode;
      newNode.parentNode = this;
      newNode.parentElement = (this.nodeType === 1) ? this : null;
      const idx = refNode ? this.childNodes.indexOf(refNode) : -1;
      if (idx >= 0) this.childNodes.splice(idx, 0, newNode);
      else this.childNodes.push(newNode);
      return newNode;
    }
    remove() {
      this._removed = true;
      if (this.parentNode && Array.isArray(this.parentNode.childNodes)) {
        const idx = this.parentNode.childNodes.indexOf(this);
        if (idx >= 0) this.parentNode.childNodes.splice(idx, 1);
      }
      this.parentNode = null;
      this.parentElement = null;
    }
    append(...nodes) {
      for (const n of nodes) {
        if (n && typeof n === 'object') this.appendChild(n);
      }
    }
    contains(other) {
      let cur = other;
      while (cur) {
        if (cur === this) return true;
        cur = cur.parentNode;
      }
      return false;
    }
  }

  class MockStyle {
    constructor(owner) {
      this._owner = owner;
      this._props = {};
      this._cssText = '';
    }
    get cssText() {
      if (this._cssText) return this._cssText;
      return Object.entries(this._props).map(([k, v]) => `${k}: ${v}`).join('; ');
    }
    set cssText(val) {
      this._cssText = String(val || '');
      this._props = {};
      for (const part of this._cssText.split(';')) {
        const idx = part.indexOf(':');
        if (idx > 0) {
          const k = part.slice(0, idx).trim().toLowerCase();
          const v = part.slice(idx + 1).trim();
          this._props[k] = v;
        }
      }
    }
    setProperty(k, v) {
      this._props[k.toLowerCase()] = String(v);
      this._cssText = '';
    }
    getPropertyValue(k) {
      return this._props[k.toLowerCase()] || '';
    }
    get display() { return this._props['display'] || ''; }
    set display(v) { this.setProperty('display', v); }
    get visibility() { return this._props['visibility'] || ''; }
    set visibility(v) { this.setProperty('visibility', v); }
    get pointerEvents() { return this._props['pointer-events'] || ''; }
    set pointerEvents(v) { this.setProperty('pointer-events', v); }
    get position() { return this._props['position'] || ''; }
    set position(v) { this.setProperty('position', v); }
    get zIndex() { return this._props['z-index'] || ''; }
    set zIndex(v) { this.setProperty('z-index', v); }
    get opacity() { return this._props['opacity'] || '1'; }
    set opacity(v) { this.setProperty('opacity', v); }
    get overflow() { return this._props['overflow'] || ''; }
    set overflow(v) { this.setProperty('overflow', v); }
    get backgroundColor() { return this._props['background-color'] || this._props['background'] || 'transparent'; }
    set backgroundColor(v) { this.setProperty('background-color', v); }
  }

  class MockClassList {
    constructor(el) { this._el = el; }
    _list() { return (this._el.className || '').split(/\s+/).filter(Boolean); }
    add(...cls) {
      const s = new Set(this._list());
      cls.forEach(c => s.add(c));
      this._el.className = Array.from(s).join(' ');
    }
    remove(...cls) {
      const s = new Set(this._list());
      cls.forEach(c => s.delete(c));
      this._el.className = Array.from(s).join(' ');
    }
    contains(c) { return this._list().includes(c); }
    toggle(c) {
      if (this.contains(c)) { this.remove(c); return false; }
      this.add(c); return true;
    }
  }

  function matchesSimpleSelector(el, sel) {
    if (!el || el.nodeType !== 1 || !sel) return false;
    sel = sel.trim();
    if (!sel) return false;

    // Handle `:not(...)` cleanly for basic attr/class exclusions
    const notMatches = [];
    sel = sel.replace(/:not\(([^)]+)\)/g, (_, inner) => {
      notMatches.push(inner.trim());
      return '';
    });
    for (const nm of notMatches) {
      if (matchesSimpleSelector(el, nm)) return false;
    }
    if (!sel) return true;

    // Handle `[attr*="val"]`, `[attr^="val"]`, `[attr="val"]`, `[attr]`
    let remaining = sel;
    const attrRegex = /\[([^\]=*^$]+)(?:([*^$]?=)"?([^"\]]*)"?)?(?:\s+i)?\]/g;
    let m;
    while ((m = attrRegex.exec(sel)) !== null) {
      const attrName = m[1].trim();
      const op = m[2];
      const expected = m[3] || '';
      const actual = attrName === 'style'
        ? (el.getAttribute('style') || el.style.cssText || '')
        : (el.getAttribute(attrName) || '');
      if (!op) {
        if (!el.hasAttribute(attrName)) return false;
      } else if (op === '=') {
        if (actual !== expected) return false;
      } else if (op === '*=') {
        if (!actual.toLowerCase().includes(expected.toLowerCase())) return false;
      } else if (op === '^=') {
        if (!actual.toLowerCase().startsWith(expected.toLowerCase())) return false;
      } else if (op === '$=') {
        if (!actual.toLowerCase().endsWith(expected.toLowerCase())) return false;
      }
    }
    remaining = remaining.replace(attrRegex, '');

    // Tag, #id, .class tokens
    const idMatches = remaining.match(/#[a-zA-Z0-9_-]+/g) || [];
    for (const im of idMatches) {
      if ((el.id || '') !== im.slice(1)) return false;
    }
    remaining = remaining.replace(/#[a-zA-Z0-9_-]+/g, '');

    const clsMatches = remaining.match(/\.[a-zA-Z0-9_-]+/g) || [];
    const elClasses = (typeof el.className === 'string' ? el.className : '').split(/\s+/);
    for (const cm of clsMatches) {
      if (!elClasses.includes(cm.slice(1))) return false;
    }
    remaining = remaining.replace(/\.[a-zA-Z0-9_-]+/g, '').trim();

    if (remaining && remaining !== '*') {
      if (el.tagName.toLowerCase() !== remaining.toLowerCase()) return false;
    }
    return true;
  }

  function matchesSelector(el, selectorList) {
    if (!el || el.nodeType !== 1 || !selectorList) return false;
    const parts = selectorList.split(',');
    for (let raw of parts) {
      const s = raw.trim();
      if (!s || s.includes(':has(')) continue;
      if (s.includes('>')) {
        const segs = s.split('>').map(x => x.trim());
        if (segs.length === 2 && matchesSimpleSelector(el, segs[1]) && matchesSimpleSelector(el.parentElement, segs[0])) {
          return true;
        }
      } else if (s.includes(' ')) {
        const segs = s.split(/\s+/);
        const last = segs[segs.length - 1];
        if (matchesSimpleSelector(el, last)) {
          let p = el.parentElement;
          let matched = true;
          for (let i = segs.length - 2; i >= 0; i--) {
            while (p && !matchesSimpleSelector(p, segs[i])) p = p.parentElement;
            if (!p) { matched = false; break; }
            p = p.parentElement;
          }
          if (matched) return true;
        }
      } else {
        if (matchesSimpleSelector(el, s)) return true;
      }
    }
    return false;
  }

  class MockElement extends MockNode {
    constructor(tagName) {
      super(1, tagName.toUpperCase());
      this.tagName = tagName.toUpperCase();
      this._attrs = {};
      this.style = new MockStyle(this);
      this.classList = new MockClassList(this);
      this.dataset = {};
      this.innerText = '';
      this.textContent = '';
      this.innerHTML = '';
      this.clickCount = 0;
      this.offsetWidth = 320;
      this.offsetHeight = 200;
    }
    get id() { return this._attrs.id || ''; }
    set id(v) { this._attrs.id = String(v); }
    get className() { return this._attrs.class || ''; }
    set className(v) { this._attrs.class = String(v); }
    setAttribute(k, v) {
      const key = String(k).toLowerCase();
      this._attrs[key] = String(v);
      if (key === 'style') this.style.cssText = String(v);
      if (key.startsWith('data-')) {
        const camel = key.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[camel] = String(v);
      }
    }
    getAttribute(k) {
      const key = String(k).toLowerCase();
      if (key === 'style') return this._attrs.style || this.style.cssText || null;
      return Object.prototype.hasOwnProperty.call(this._attrs, key) ? this._attrs[key] : null;
    }
    hasAttribute(k) {
      return Object.prototype.hasOwnProperty.call(this._attrs, String(k).toLowerCase());
    }
    closest(sel) {
      let cur = this;
      while (cur && cur.nodeType === 1) {
        if (matchesSelector(cur, sel)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    matches(sel) {
      return matchesSelector(this, sel);
    }
    querySelector(sel) {
      for (const ch of this.childNodes) {
        if (ch.nodeType === 1) {
          if (matchesSelector(ch, sel)) return ch;
          const found = ch.querySelector(sel);
          if (found) return found;
        }
      }
      return null;
    }
    querySelectorAll(sel) {
      const out = [];
      for (const ch of this.childNodes) {
        if (ch.nodeType === 1) {
          if (matchesSelector(ch, sel)) out.push(ch);
          out.push(...ch.querySelectorAll(sel));
        }
      }
      return out;
    }
    getBoundingClientRect() {
      return { top: 0, left: 0, width: this.offsetWidth, height: this.offsetHeight, right: this.offsetWidth, bottom: this.offsetHeight };
    }
    click() {
      this.clickCount++;
      if (typeof this.onclick === 'function') this.onclick({ target: this, currentTarget: this, isTrusted: false, preventDefault() { }, stopPropagation() { } });
      dispatchTouchOrClick('click', this, { isTrusted: false });
    }
  }

  class MockScriptElement extends MockElement {
    constructor() { super('script'); }
    get src() { return this._attrs.src || ''; }
    set src(v) { this.setAttribute('src', v); }
  }

  class MockAnchorElement extends MockElement {
    constructor() { super('a'); }
    get href() { return this._attrs.href || ''; }
    set href(v) { this.setAttribute('href', v); }
  }

  class MockVideoElement extends MockElement {
    constructor() {
      super('video');
      this.paused = true;
      this.playCalls = 0;
    }
    get src() { return this._attrs.src || ''; }
    set src(v) { this.setAttribute('src', v); }
    play() {
      this.playCalls++;
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }

  class MockIframeElement extends MockElement {
    constructor() { super('iframe'); }
    get src() { return this._attrs.src || ''; }
    set src(v) { this.setAttribute('src', v); }
  }

  class MockFormElement extends MockElement {
    constructor() { super('form'); this.action = ''; }
    submit() { this._submitted = true; }
  }

  class MockImgElement extends MockElement {
    constructor() { super('img'); }
    get src() { return this._attrs.src || ''; }
    set src(v) { this.setAttribute('src', v); }
  }

  class MockDocument extends MockNode {
    constructor() {
      super(9, '#document');
      this.readyState = 'interactive';
      this.documentElement = new MockElement('html');
      this.head = new MockElement('head');
      this.body = new MockElement('body');
      this.documentElement.appendChild(this.head);
      this.documentElement.appendChild(this.body);
      this.childNodes = [this.documentElement];
      this.cookie = '';
      this.fullscreenElement = null;
    }
    createElement(tag) {
      const t = String(tag).toLowerCase();
      if (t === 'script') return new MockScriptElement();
      if (t === 'a') return new MockAnchorElement();
      if (t === 'video') return new MockVideoElement();
      if (t === 'iframe') return new MockIframeElement();
      if (t === 'form') return new MockFormElement();
      if (t === 'img') return new MockImgElement();
      return new MockElement(t);
    }
    getElementById(id) {
      return this.documentElement.querySelector(`#${id}`);
    }
    querySelector(sel) {
      if (matchesSelector(this.documentElement, sel)) return this.documentElement;
      return this.documentElement.querySelector(sel);
    }
    querySelectorAll(sel) {
      return this.documentElement.querySelectorAll(sel);
    }
    elementFromPoint() {
      return this._pointTarget || null;
    }
  }

  const doc = new MockDocument();

  class MockEvent {
    constructor(type, target, init = {}) {
      this.type = type;
      this.target = target;
      this.currentTarget = null;
      this.isTrusted = init.isTrusted !== undefined ? init.isTrusted : true;
      this.defaultPrevented = false;
      this._stopped = false;
      this._immediateStopped = false;
      this.clientX = init.clientX !== undefined ? init.clientX : 160;
      this.clientY = init.clientY !== undefined ? init.clientY : 120;
      this.touches = init.touches || null;
      this.changedTouches = init.changedTouches || null;
    }
    preventDefault() { this.defaultPrevented = true; }
    stopPropagation() { this._stopped = true; }
    stopImmediatePropagation() { this._stopped = true; this._immediateStopped = true; }
  }

  const locationObj = {
    href: parsedUrl.href,
    origin: parsedUrl.origin,
    protocol: parsedUrl.protocol,
    host: parsedUrl.host,
    hostname: parsedUrl.hostname,
    pathname: parsedUrl.pathname,
    search: parsedUrl.search,
    hash: parsedUrl.hash,
    assign(u) { this._assignedUrl = u; },
    replace(u) { this._replacedUrl = u; },
    toString() { return this.href; }
  };

  class MockLocation { }
  MockLocation.prototype.assign = locationObj.assign;
  MockLocation.prototype.replace = locationObj.replace;

  class MockMutationObserver {
    constructor(cb) { this.cb = cb; }
    observe() { }
    disconnect() { }
  }

  const createStorage = () => {
    const store = {};
    return {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
      clear: () => { for (const k of Object.keys(store)) delete store[k]; }
    };
  };

  const win = {
    document: doc,
    location: locationObj,
    Location: MockLocation,
    URL,
    localStorage: createStorage(),
    sessionStorage: createStorage(),
    Event: MockEvent,
    EventTarget,
    Node: MockNode,
    Element: MockElement,
    HTMLElement: MockElement,
    HTMLScriptElement: MockScriptElement,
    HTMLAnchorElement: MockAnchorElement,
    HTMLIFrameElement: MockIframeElement,
    HTMLVideoElement: MockVideoElement,
    HTMLMediaElement: MockVideoElement,
    HTMLFormElement: MockFormElement,
    HTMLDivElement: MockElement,
    Document: MockDocument,
    window: null,
    history: { pushState() { }, replaceState() { } },
    Response: function () { },
    Window: function () { },
    MutationObserver: MockMutationObserver,
    navigator: {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
    },
    screen: { width: 390, height: 844 },
    innerWidth: 390,
    innerHeight: 844,
    _listeners: {},
    addEventListener(type, fn, opts) {
      return EventTarget.prototype.addEventListener.apply(this, arguments);
    },
    removeEventListener(type, fn, opts) {
      return EventTarget.prototype.removeEventListener.apply(this, arguments);
    },
    getComputedStyle(el) {
      const s = el.style || new MockStyle(el);
      return {
        position: s.position || 'static',
        opacity: s.opacity || '1',
        zIndex: s.zIndex || 'auto',
        backgroundColor: s.backgroundColor || 'transparent',
        display: s.display || 'block',
        visibility: s.visibility || 'visible',
        pointerEvents: s.pointerEvents || 'auto',
        overflow: s.overflow || 'visible',
        getPropertyValue: (k) => s.getPropertyValue(k)
      };
    },
    matchMedia: () => ({ matches: false, addListener() { }, removeListener() { } }),
    open(u, t) {
      openedUrls.push({ url: u, target: t });
      return { closed: false, focus() { }, close() { }, location: { href: u || '' } };
    },
    setTimeout(fn, delay) {
      const id = timerSeq++;
      scheduledTimers.push({ id, type: 'timeout', fn, delay, cleared: false });
      return id;
    },
    clearTimeout(id) {
      const t = scheduledTimers.find(x => x.id === id);
      if (t) t.cleared = true;
    },
    setInterval(fn, delay) {
      const id = timerSeq++;
      scheduledTimers.push({ id, type: 'interval', fn, delay, cleared: false });
      return id;
    },
    clearInterval(id) {
      const t = scheduledTimers.find(x => x.id === id);
      if (t) t.cleared = true;
    },
    postMessage() { },
    requestAnimationFrame: (cb) => win.setTimeout(cb, 16),
    fetch: () => Promise.resolve({ ok: true, text: async () => '', json: async () => ({}) }),
    XMLHttpRequest: function () { this.open = function () { }; this.send = function () { }; },
    console: { log() { }, warn() { }, error() { } },
    chrome: {
      runtime: {
        id: 'webshield-test-ext',
        getURL: (p) => `chrome-extension://webshield-test-ext/${p}`,
        sendMessage: (msg, cb) => {
          if (msg && msg.type === 'REPORT_AD_BLOCKED') blockedReports.push(msg);
          if (typeof cb === 'function') cb({ ok: true });
        },
        onMessage: { addListener() { } }
      },
      storage: {
        local: {
          get: (keys, cb) => {
            if (typeof cb === 'function') cb({ enabled: true, whitelist: [], customBlockedSelectors: {} });
            return Promise.resolve({ enabled: true, whitelist: [], customBlockedSelectors: {} });
          },
          set: () => Promise.resolve()
        },
        onChanged: { addListener() { } }
      }
    }
  };

  win.window = win;
  win.self = win;
  win.top = isIframe ? { location: { href: 'https://supjav.com/12345.html' } } : win;
  win.parent = win.top;
  win.globalThis = win;

  // Dispatch event down from window -> document -> ancestors -> target (capture) and back up (bubble)
  function dispatchTouchOrClick(type, target, extraInit = {}) {
    const ev = new MockEvent(type, target, extraInit);
    const pathNodes = [];
    let cur = target;
    while (cur) {
      pathNodes.unshift(cur);
      cur = cur.parentNode;
    }
    const fullChain = [win, doc, ...pathNodes.filter(n => n !== doc)];

    // Capture phase (from win down to target)
    for (const node of fullChain) {
      if (ev._immediateStopped) break;
      const list = (node._listeners && node._listeners[type]) ? [...node._listeners[type]] : [];
      for (const l of list) {
        if (l.capture) {
          ev.currentTarget = node;
          try { l.fn.call(node, ev); } catch (e) { }
          if (ev._immediateStopped) break;
        }
      }
      if (ev._stopped) break;
    }

    // Bubble phase (from target up to win) unless stopped
    if (!ev._stopped) {
      for (let i = fullChain.length - 1; i >= 0; i--) {
        const node = fullChain[i];
        if (ev._immediateStopped) break;
        const list = (node._listeners && node._listeners[type]) ? [...node._listeners[type]] : [];
        for (const l of list) {
          if (!l.capture) {
            ev.currentTarget = node;
            try { l.fn.call(node, ev); } catch (e) { }
            if (ev._immediateStopped) break;
          }
        }
        if (ev._stopped) break;
      }
    }
    return ev;
  }

  function dispatchMobileTap(target, init = {}) {
    const touchPoint = { clientX: init.clientX || 160, clientY: init.clientY || 120 };
    const ts = dispatchTouchOrClick('touchstart', target, { ...init, touches: [touchPoint], changedTouches: [touchPoint] });
    const te = dispatchTouchOrClick('touchend', target, { ...init, touches: [], changedTouches: [touchPoint] });
    let ck = null;
    if (!te.defaultPrevented && !init.skipClick) {
      ck = dispatchTouchOrClick('click', target, init);
    }
    return { touchstart: ts, touchend: te, click: ck };
  }

  return {
    win,
    doc,
    openedUrls,
    blockedReports,
    scheduledTimers,
    runInject() {
      vm.createContext(win);
      vm.runInContext(injectCode, win);
    },
    runContent() {
      if (!vm.isContext(win)) vm.createContext(win);
      vm.runInContext(contentCode, win);
    },
    runScript(code) {
      return vm.runInContext(code, win);
    },
    runPendingTimers(filterFn) {
      for (const t of [...scheduledTimers]) {
        if (!t.cleared && (!filterFn || filterFn(t))) {
          t.cleared = true;
          if (typeof t.fn === 'function') t.fn();
          else if (typeof t.fn === 'string') vm.runInContext(t.fn, win);
        }
      }
    },
    dispatchTouchOrClick,
    dispatchMobileTap
  };
}

async function run() {
  console.log('======================================================================');
  console.log('📱 QA SUITE: SUPJAV.COM & ALL EMBED HOSTS MOBILE ANTI-POPUNDER');
  console.log('======================================================================\n');

  // --- SECTION 1: DNR RULES, BACKGROUND & IFRAME BOOTSTRAP ---
  await test('1.1 rules.json Rule 201 whitelists supjav player tiers & Rule 342 blocks Streamtape/FC2Stream ad hosts', () => {
    const rule201 = rulesJson.find(r => r.id === 201);
    assert(rule201 && rule201.action.type === 'allow', 'Rule 201 must allow');
    const r201Domains = rule201.condition.requestDomains || [];
    for (const d of ['supremejav.com', 'emturbovid.com', 'turbovidhls.com', 'fc2stream.tv', 'japopav.tv']) {
      assert(r201Domains.includes(d), `Rule 201 missing ${d}`);
    }

    const rule342 = rulesJson.find(r => r.id === 342);
    assert(rule342 && rule342.action.type === 'block' && rule342.priority === 150, 'Rule 342 missing or wrong priority');
    const r342Domains = rule342.condition.requestDomains || [];
    for (const d of ['tapepops.com', 'watchadsontape.com', 'advertape.net', 'highrevenuecpm.com', 'fc2ppv.buzz', '0i0i0i0.com']) {
      assert(r342Domains.includes(d), `Rule 342 missing ${d}`);
    }
  });

  await test('1.2 background.js SAFE_EXCLUDED protects supjav, supremejav, emturbovid, turboviplay, fc2stream, japopav', () => {
    for (const token of ['supjav', 'supremejav', 'emturbovid', 'turboviplay', 'turbovid', 'fc2stream', 'japopav']) {
      assert(backgroundCode.includes(`'${token}'`), `background.js SAFE_EXCLUDED missing '${token}'`);
    }
  });

  await test('1.3 content.js ensureMainWorldLoaded() fallback-injects inject.js inside non-YouTube player iframes', () => {
    const sb = createMobileSandbox({ url: 'https://fc2stream.tv/t/abc123', isIframe: true });
    sb.runContent();
    const scripts = sb.doc.head.querySelectorAll('script');
    assert(scripts.some(s => (s.src || '').includes('inject.js')), 'ensureMainWorldLoaded did not inject inject.js inside player iframe');

    const ytSb = createMobileSandbox({ url: 'https://www.youtube.com/embed/dQw4w9WgXcQ', isIframe: true });
    ytSb.runContent();
    const ytScripts = ytSb.doc.head.querySelectorAll('script');
    assert(!ytScripts.some(s => (s.src || '').includes('inject.js')), 'Must NEVER fallback-inject script tag on YouTube embed');
  });

  // --- SECTION 2: TIER 1 - SUPJAV.COM TOP LEVEL MOBILE ---
  await test('2.1 supjav.com blocks AdSpyglass random .js paths (/ab/<32hex>.js & external 5-8 char mixed .js) cleanly', () => {
    const sb = createMobileSandbox({ url: 'https://supjav.com/12345.html', isIframe: false });
    sb.runInject();

    // 1. HTMLScriptElement.prototype.src setter neutralizes AdSpyglass random external script + 32-hex hash
    const s1 = sb.doc.createElement('script');
    s1.src = 'https://k9x2m7p.top/a1b2c3d.js';
    assert.strictEqual(s1.src, 'data:text/javascript;base64,', 'AdSpyglass random 7-char external script must be neutralized on src setter');

    const s2 = sb.doc.createElement('script');
    s2.src = 'https://cdn.example-ad.com/ab/0123456789abcdef0123456789abcdef.js';
    assert.strictEqual(s2.src, 'data:text/javascript;base64,', 'AdSpyglass 32-char MD5 hex script must be neutralized on src setter');

    // 2. Parser / pre-populated attribute script dropped directly at appendChild via isSuspectOverlayNode
    const sRaw = sb.doc.createElement('script');
    sRaw._attrs.src = 'https://k9x2m7p.top/a1b2c3d.js';
    sb.doc.head.appendChild(sRaw);
    assert(!sb.doc.head.childNodes.includes(sRaw), 'Pre-attributed AdSpyglass script must be dropped from appendChild');

    // 3. Benign local script must NOT be blocked
    const s3 = sb.doc.createElement('script');
    s3.src = 'https://supjav.com/wp-content/themes/supjav/js/player.js';
    sb.doc.head.appendChild(s3);
    assert(sb.doc.head.childNodes.includes(s3) && s3.src.includes('player.js'), 'Legitimate player.js must NOT be blocked');
  });

  await test('2.2 supjav.com traps window.popMagic, window.openNewTab, window.forceunder as inert no-ops', () => {
    const sb = createMobileSandbox({ url: 'https://supjav.com/12345.html', isIframe: false });
    sb.runInject();
    sb.runScript(`
      window.popMagic = { init: function(){ throw new Error('Should not overwrite popMagic'); } };
      window.openNewTab = function(){ window.open('https://0i0i0i0.com/pop'); };
      window.forceunder = function(){ window.open('https://tapepops.com/pop'); };
      window.popMagic.init();
      window.openNewTab();
      window.forceunder();
    `);
    assert.strictEqual(sb.openedUrls.length, 0, 'Trapped popunder functions must never call window.open');
    assert.strictEqual(sb.win.popMagic.shouldShow(), false, 'popMagic.shouldShow() must stay false');
  });

  await test('2.3 supjav.com prevents mobile thumbnail link hijacking on touchstart -> touchend', () => {
    const sb = createMobileSandbox({ url: 'https://supjav.com/', isIframe: false });
    sb.runContent();

    const anchor = sb.doc.createElement('a');
    anchor.className = 'img';
    anchor.setAttribute('href', 'https://supjav.com/55555.html');
    const img = sb.doc.createElement('img');
    img.src = 'https://supjav.com/poster.jpg';
    anchor.appendChild(img);
    sb.doc.body.appendChild(anchor);

    // Capture touchstart records original href
    sb.dispatchTouchOrClick('touchstart', img, { touches: [{ clientX: 100, clientY: 200 }], changedTouches: [{ clientX: 100, clientY: 200 }] });
    // Malicious script tries to swap anchor href right before touchend!
    anchor.setAttribute('href', 'https://bet88.vip/promo');

    const te = sb.dispatchTouchOrClick('touchend', img, { touches: [], changedTouches: [{ clientX: 100, clientY: 200 }] });
    assert.strictEqual(te.defaultPrevented, true, 'Hijacked touchend default must be prevented');
    assert.strictEqual(anchor.getAttribute('href'), 'https://supjav.com/55555.html', 'Anchor href must revert to original supjav URL');
    assert.strictEqual(sb.win.location.href, 'https://supjav.com/55555.html', 'Safe navigation must restore original post URL');
  });

  // --- SECTION 3: FC2STREAM.TV (FST) & JAPOPAV.TV (JPA) ---
  await test('3.1 fc2stream.tv & japopav.tv lock window.isadb = false, trap window.__Y, and keep isEmbeddedPlayerFrame active', () => {
    for (const url of ['https://fc2stream.tv/t/999', 'https://japopav.tv/e/abc']) {
      const sb = createMobileSandbox({ url, isIframe: true });
      sb.runInject();
      sb.runContent();
      sb.runScript(`
        window.isadb = true;
        window.__Y = function(){ window.open('https://fc2ppv.buzz/ad'); };
        window.__Y();
      `);
      assert.strictEqual(sb.win.isadb, false, `window.isadb must remain false on ${url}`);
      assert.strictEqual(sb.openedUrls.length, 0, `window.__Y must not open popups on ${url}`);
      const css = sb.doc.getElementById('anti-popunder-adblock-css');
      assert(css && css.textContent.includes('2147483647') && css.textContent.includes('300000'), `Player CSS missing on ${url}`);
    }
  });

  await test('3.2 fc2stream.tv blocks opacity:0.01 z-index:2147483647 overlay on append AND mobile tap inside iframe', () => {
    const sb = createMobileSandbox({ url: 'https://fc2stream.tv/t/999', isIframe: true });
    sb.runInject();

    // 1. Dynamic append is intercepted
    const dynOverlay = sb.doc.createElement('div');
    dynOverlay.setAttribute('style', 'position:fixed;inset:0px;z-index:2147483647;background:black;opacity:0.01');
    sb.doc.body.appendChild(dynOverlay);
    assert(!sb.doc.body.childNodes.includes(dynOverlay), 'FC2Stream fixed opacity:0.01 clickjack div must be blocked from appendChild');

    // 2. Pre-existing overlay inside iframe must STILL be caught on mobile tap & resume <video>
    const sb2 = createMobileSandbox({ url: 'https://japopav.tv/e/abc', isIframe: true });
    const playerWrap = sb2.doc.createElement('div');
    playerWrap.className = 'player-holder';
    const video = sb2.doc.createElement('video');
    playerWrap.appendChild(video);
    const preOverlay = sb2.doc.createElement('div');
    preOverlay.setAttribute('style', 'position:fixed;inset:0px;z-index:2147483647;background:black;opacity:0.01');
    sb2.doc.body.appendChild(playerWrap);
    sb2.doc.body.appendChild(preOverlay);

    sb2.runInject();
    sb2.runContent();
    const res = sb2.dispatchMobileTap(preOverlay);
    assert.strictEqual(res.touchend.defaultPrevented, true, 'Mobile touchend on opacity:0.01 overlay inside iframe must prevent default');
    assert.strictEqual(preOverlay._removed, true, 'Clickjack overlay inside iframe must be removed on mobile tap');
    assert(video.playCalls >= 1 && video.paused === false, 'Video must auto-resume when clickjack overlay is removed');
  });

  await test('3.3 Native player controls (.plyr__control, video, seekbar) work 100% inside fc2stream.tv iframe', () => {
    const sb = createMobileSandbox({ url: 'https://fc2stream.tv/t/999', isIframe: true });
    const plyr = sb.doc.createElement('div');
    plyr.className = 'plyr';
    const video = sb.doc.createElement('video');
    const controls = sb.doc.createElement('div');
    controls.className = 'plyr__controls';
    const playBtn = sb.doc.createElement('button');
    playBtn.className = 'plyr__control plyr__control--overlaid';
    controls.appendChild(playBtn);
    plyr.appendChild(video);
    plyr.appendChild(controls);
    sb.doc.body.appendChild(plyr);

    sb.runInject();
    sb.runContent();
    const res = sb.dispatchMobileTap(playBtn);
    assert.strictEqual(res.touchend.defaultPrevented, false, 'Native play button touchend must NOT be canceled inside iframe');
    assert.strictEqual(res.click.defaultPrevented, false, 'Native play button click must NOT be canceled inside iframe');
    assert(!playBtn._removed, 'Native play button must NEVER be removed');
  });

  // --- SECTION 4: EMTURBOVID.COM / TURBOVIDHLS.COM (TV) ---
  await test('4.1 emturbovid.com sets window.premium = "1", blocks openNewTab & delayed setTimeout/setInterval popunders', () => {
    const sb = createMobileSandbox({ url: 'https://emturbovid.com/t/67890', isIframe: true });
    sb.runInject();
    let benignRan = false;
    sb.win.__setBenign = () => { benignRan = true; };

    sb.runScript(`
      window.premium = '0';
      window.setTimeout(function() { window.open('https://ad.example/pop', '_blank'); }, 50);
      window.setTimeout(function() { openNewTab(); }, 100);
      window.setInterval(function() { if (popundersPerIP) {} }, 200);
      window.setTimeout(function() { __setBenign(); }, 10);
    `);
    sb.runPendingTimers();

    assert.strictEqual(sb.win.premium, '1', 'window.premium must stay "1" on emturbovid.com');
    assert.strictEqual(sb.openedUrls.length, 0, 'Delayed popup timers must be disarmed');
    assert.strictEqual(benignRan, true, 'Benign UI timers must still execute normally');

    // Confirm window.premium is NOT forced on unrelated sites
    const normalSb = createMobileSandbox({ url: 'https://example.com/article', isIframe: false });
    normalSb.runInject();
    assert.strictEqual(normalSb.win.premium, undefined, 'window.premium must NOT be forced on normal sites');
  });

  await test('4.2 emturbovid.com drops #pop/#pop1/#pop2/.div_pop, hides .movv-ad via CSS, & cleans .jw-wrapper clickjack divs while preserving .jw-controls', () => {
    const sb = createMobileSandbox({ url: 'https://turbovidhls.com/t/111', isIframe: true });
    const jwWrap = sb.doc.createElement('div');
    jwWrap.className = 'jwplayer jw-wrapper';
    const video = sb.doc.createElement('video');
    const jwControls = sb.doc.createElement('div');
    jwControls.className = 'jw-controls';
    const jwPlay = sb.doc.createElement('div');
    jwPlay.className = 'jw-icon jw-icon-playback';
    jwControls.appendChild(jwPlay);

    const anonClickjack = sb.doc.createElement('div');
    anonClickjack.setAttribute('style', 'position:absolute;inset:0;z-index:999999;opacity:0');

    const popDiv = sb.doc.createElement('div');
    popDiv.id = 'pop';

    jwWrap.appendChild(video);
    jwWrap.appendChild(jwControls);
    jwWrap.appendChild(anonClickjack);
    sb.doc.body.appendChild(jwWrap);

    sb.runInject();
    sb.runContent();

    // Dynamic #pop / .div_pop / .movv-ad blocked on append
    sb.doc.body.appendChild(popDiv);
    assert(!sb.doc.body.childNodes.includes(popDiv), '#pop must be dropped on appendChild');

    // Pre-existing anonymous clickjack div inside .jw-wrapper caught on mobile tap
    const tap1 = sb.dispatchMobileTap(anonClickjack);
    assert.strictEqual(tap1.touchend.defaultPrevented, true, 'Clickjack div inside .jw-wrapper must be intercepted');
    assert.strictEqual(anonClickjack._removed, true, 'Clickjack div inside .jw-wrapper must be removed');
    assert(video.playCalls >= 1, 'JWPlayer video must play after removing clickjack div');

    // Legitimate .jw-icon-playback passes through
    const tap2 = sb.dispatchMobileTap(jwPlay);
    assert.strictEqual(tap2.touchend.defaultPrevented, false, 'JWPlayer playback icon tap must pass through natively');
    assert.strictEqual(tap2.click.defaultPrevented, false, 'JWPlayer playback icon click must pass through natively');
  });

  // --- SECTION 5: STREAMTAPE.COM (ST) ---
  await test('5.1 streamtape.com keeps .play-overlay visible & traps googleAd = true, Adcash, and z-index:300000 overlay', () => {
    const sb = createMobileSandbox({ url: 'https://streamtape.com/e/abcdef', isIframe: true });
    sb.win.srclink = '//streamtape.com/get_video?id=abcdef&token=xyz';

    const video = sb.doc.createElement('video');
    video.id = 'mainvideo';
    const playOverlay = sb.doc.createElement('div');
    playOverlay.className = 'play-overlay';
    const stBlocker = sb.doc.createElement('div');
    stBlocker.setAttribute('style', 'position:fixed;inset:0;z-index:300000;');
    const bnContainer = sb.doc.createElement('div');
    bnContainer.className = 'bn-container';

    sb.doc.body.appendChild(video);
    sb.doc.body.appendChild(playOverlay);
    sb.doc.body.appendChild(stBlocker);

    sb.runInject();
    sb.runContent();

    // Check Streamtape globals
    assert.strictEqual(sb.win.googleAd, true, 'window.googleAd must be true on streamtape');
    sb.win.Adcash.open('https://tapepops.com');
    assert.strictEqual(sb.openedUrls.length, 0, 'window.Adcash must be inert');

    // Dynamic bn-container dropped
    sb.doc.body.appendChild(bnContainer);
    assert(!sb.doc.body.childNodes.includes(bnContainer), 'bn-container must be dropped');

    // CSS must NOT hide .play-overlay!
    const css = sb.doc.getElementById('anti-popunder-adblock-css');
    assert(!css.textContent.includes('.play-overlay'), 'CSS must NOT hide .play-overlay on Streamtape');

    // Simulate Streamtape hostile capture-phase touchstart/touchend popunder on document
    sb.runScript(`
      document.addEventListener('touchend', function(){ forceunder(); window.open('https://tapepops.com/pop'); }, true);
    `);

    // Tap hits z-index: 300000 blocker sitting above .play-overlay -> removes blocker, triggers .play-overlay -> sets #mainvideo.src = srclink!
    sb.doc._pointTarget = playOverlay;
    sb.dispatchMobileTap(stBlocker);
    sb.runPendingTimers();

    assert.strictEqual(stBlocker._removed, true, 'Streamtape z-index:300000 overlay must be removed on tap');
    assert.strictEqual(sb.openedUrls.length, 0, 'Capture-phase tapepops listener must be disarmed (0 popups)');
    assert.strictEqual(video.src, 'https://streamtape.com/get_video?id=abcdef&token=xyz', '#mainvideo.src must be populated from window.srclink');
    assert(video.playCalls >= 1 && video.paused === false, '#mainvideo must start playing');
  });

  // --- SECTION 6: VOE.SX (VOE) & MOBILE SCROLL SAFETY ---
  await test('6.1 voe.sx blocks capture-phase touch hijacker & external _blank overlay anchor inside iframe while keeping vjs-big-play-button alive', () => {
    const sb = createMobileSandbox({ url: 'https://voe.sx/e/voetest123', isIframe: true });
    const player = sb.doc.createElement('div');
    player.className = 'video-js';
    const video = sb.doc.createElement('video');
    const bigPlay = sb.doc.createElement('button');
    bigPlay.className = 'vjs-big-play-button';
    const adAnchor = sb.doc.createElement('a');
    adAnchor.setAttribute('target', '_blank');
    adAnchor.setAttribute('href', 'https://unknown-tracker.xyz/promo');
    adAnchor.setAttribute('style', 'position:fixed;inset:0;');

    player.appendChild(video);
    player.appendChild(bigPlay);
    sb.doc.body.appendChild(player);
    sb.doc.body.appendChild(adAnchor);

    sb.runInject();
    sb.runContent();

    sb.runScript(`
      window.addEventListener('touchstart', function(){ window.open('https://highrevenuecpm.com/ad'); }, true);
      document.addEventListener('touchend', function(){ openNewTab(); }, true);
    `);

    // 1. Tapping external _blank overlay anchor removes it and plays video
    const resAd = sb.dispatchMobileTap(adAnchor);
    assert.strictEqual(resAd.touchend.defaultPrevented, true, 'External _blank overlay anchor tap inside iframe must prevent default');
    assert.strictEqual(adAnchor._removed, true, 'External _blank overlay anchor must be removed');
    assert.strictEqual(sb.openedUrls.length, 0, 'Capture touchstart/touchend popups must be disarmed');
    assert(video.playCalls >= 1, 'Video must play when overlay anchor is cleared');

    // 2. Real vjs-big-play-button works natively
    const resPlay = sb.dispatchMobileTap(bigPlay);
    assert.strictEqual(resPlay.touchend.defaultPrevented, false, 'vjs-big-play-button touchend must pass through');
    assert.strictEqual(resPlay.click.defaultPrevented, false, 'vjs-big-play-button click must pass through');
  });

  await test('6.2 Mobile scroll gesture (touchstart -> touchmove > 12px -> touchend) does not hijack scrolling', () => {
    const sb = createMobileSandbox({ url: 'https://supjav.com/12345.html', isIframe: false });
    const link = sb.doc.createElement('a');
    link.setAttribute('href', 'https://supjav.com/next-video.html');
    link.innerText = 'Next';
    sb.doc.body.appendChild(link);

    sb.runInject();
    sb.runContent();

    sb.dispatchTouchOrClick('touchstart', link, { touches: [{ clientX: 100, clientY: 300 }], changedTouches: [{ clientX: 100, clientY: 300 }] });
    sb.dispatchTouchOrClick('touchmove', link, { touches: [{ clientX: 100, clientY: 360 }], changedTouches: [{ clientX: 100, clientY: 360 }] });
    const te = sb.dispatchTouchOrClick('touchend', link, { touches: [], changedTouches: [{ clientX: 100, clientY: 360 }] });

    assert.strictEqual(te.defaultPrevented, false, 'Scroll touchend must never trigger redirect or preventDefault');
  });

  await test('6.3 phimhdcss.com disarms /js/a79ebc5915ab.js tab-under, preserves poster click (.img-film / .icon-play), and allows initNoLink _self timer', () => {
    const sb = createMobileSandbox({ url: 'https://phimhdcss.com/quoc-gia/han-quoc', isIframe: false });

    const listFilms = sb.doc.createElement('div');
    listFilms.className = 'list-films film-new';
    const ul = sb.doc.createElement('ul');
    const li = sb.doc.createElement('li');
    li.className = 'item no-margin-left';
    const posterLink = sb.doc.createElement('a');
    posterLink.setAttribute('href', 'https://phimhdcss.com/100-ngay-lua-doi-36045');
    posterLink.setAttribute('title', '100 Ngày Lừa Dối');
    const posterImg = sb.doc.createElement('img');
    posterImg.className = 'img-film';
    posterImg.src = '/storage/images/100-ngay-lua-doi.jpg';
    const playIcon = sb.doc.createElement('i');
    playIcon.className = 'icon-play';
    posterLink.appendChild(posterImg);
    posterLink.appendChild(playIcon);
    li.appendChild(posterLink);
    ul.appendChild(li);
    listFilms.appendChild(ul);
    sb.doc.body.appendChild(listFilms);

    sb.runInject();
    sb.runContent();

    assert(sb.doc.cookie.includes('popupOpened=true'), 'inject.js should pre-set popupOpened=true cookie on phimhdcss');

    // Even if page clears cookie before running real obfuscated /js/a79ebc5915ab.js:
    sb.doc.cookie = '';
    sb.runScript(`
      var _0x2955f4=_0x1f82;function _0x1f82(_0x44b077,_0x39f972){_0x44b077=_0x44b077-(-0xd*-0x5f+0x14a+0x23e*-0x2);var _0x33f412=_0x4b22();var _0x324419=_0x33f412[_0x44b077];return _0x324419;}(function(_0x338d65,_0x57c7a5){var _0x523ed2=_0x1f82,_0x1f4eed=_0x338d65();while(!![]){try{var _0x4c078b=-parseInt(_0x523ed2(0x1b3))/(-0x1a4c+-0x1*0x181a+0x3267)+parseInt(_0x523ed2(0x1bd))/(0x1*0xf6b+0x2ea+-0x1253*0x1)+-parseInt(_0x523ed2(0x1c4))/(0xfc5+0x1391+-0x2353)*(-parseInt(_0x523ed2(0x1c8))/(0x10*0x197+-0x1ac7+0x15b))+parseInt(_0x523ed2(0x1a9))/(-0x1ffc*-0x1+0x5*0x463+-0x35e6)+parseInt(_0x523ed2(0x1bb))/(-0xad*0x4+-0xbfb+0xeb5)*(parseInt(_0x523ed2(0x1c2))/(-0x1bc+-0x4*-0x3f2+0xe05*-0x1))+-parseInt(_0x523ed2(0x1b9))/(-0x5*0x4b7+0xaff+0xc9c)+parseInt(_0x523ed2(0x1af))/(-0x16b+0x6d*-0x3a+0x1a26)*(parseInt(_0x523ed2(0x1c3))/(0x1ab7+0xede+-0xf*0x2c5));if(_0x4c078b===_0x57c7a5)break;else _0x1f4eed['push'](_0x1f4eed['shift']());}catch(_0x51606c){_0x1f4eed['push'](_0x1f4eed['shift']());}}}(_0x4b22,-0x6*0xb179+0x532a4*0x1+0xbd775));function markPopupAsOpened(){var _0x51ab46=_0x1f82,_0x2e8e4a={'vPUXO':function(_0x43d2d6,_0x24d572){return _0x43d2d6+_0x24d572;},'pjQcx':_0x51ab46(0x1b1)+_0x51ab46(0x1c6)+_0x51ab46(0x1a4),'nzlEg':_0x51ab46(0x1a1)},_0x1e2ebd=new Date();_0x1e2ebd[_0x51ab46(0x1a2)](_0x2e8e4a[_0x51ab46(0x1b5)](_0x1e2ebd[_0x51ab46(0x1a8)](),-0x2fe7ac+0x2bae24+0x1c*0x121be)),document[_0x51ab46(0x1c5)]=_0x2e8e4a[_0x51ab46(0x1b5)](_0x2e8e4a[_0x51ab46(0x1b5)](_0x2e8e4a[_0x51ab46(0x1c9)],_0x1e2ebd[_0x51ab46(0x1ae)+'g']()),_0x2e8e4a[_0x51ab46(0x1a6)]);}function _0x4b22(){var _0x26940f=['includes','4167656Xgvnyc','oLUsj','6nqOTEL','preventDef','301710grOUCV','click','split','MbOgc','bklxU','496083RMPMKJ','917880MflBhJ','858321dxobdw','cookie','d=true; ex','oBcwf','4yqaQPd','pjQcx','href','d=true','_blank','; path=/','setTime','location','pires=','addEventLi','nzlEg','LyArZ','getTime','3782995eRtuPu','nKLSL','stener','imhdc.com/','ault','toUTCStrin','171awPEHb','2|1|4|0|3|','popupOpene','https://ph','1643346CPEpTE','_self','vPUXO','open','hdc.html'];_0x4b22=function(){return _0x26940f;};return _0x4b22();}document[_0x2955f4(0x1a5)+_0x2955f4(0x1ab)](_0x2955f4(0x1be),function(_0x1c9c35){var _0x4f3f25=_0x2955f4,_0x5e4219={'oLUsj':_0x4f3f25(0x1b1)+_0x4f3f25(0x1cb),'LyArZ':_0x4f3f25(0x1b0)+'5','nKLSL':_0x4f3f25(0x1b2)+_0x4f3f25(0x1ac)+_0x4f3f25(0x1b7),'bklxU':_0x4f3f25(0x1b4),'oBcwf':_0x4f3f25(0x1cc),'MbOgc':function(_0x446259){return _0x446259();}};if(!document[_0x4f3f25(0x1c5)][_0x4f3f25(0x1b8)](_0x5e4219[_0x4f3f25(0x1ba)])){var _0x27d6b2=_0x5e4219[_0x4f3f25(0x1a7)][_0x4f3f25(0x1bf)]('|'),_0x3df5c9=-0xad8+0xc2d*0x1+-0xb*0x1f;while(!![]){switch(_0x27d6b2[_0x3df5c9++]){case'0':_0xf810a0[_0x4f3f25(0x1a3)][_0x4f3f25(0x1ca)]=_0x44dc28;continue;case'1':var _0x44dc28=window[_0x4f3f25(0x1a3)][_0x4f3f25(0x1ca)];continue;case'2':_0x1c9c35[_0x4f3f25(0x1bc)+_0x4f3f25(0x1ad)]();continue;case'3':window[_0x4f3f25(0x1b6)](_0x5e4219[_0x4f3f25(0x1aa)],_0x5e4219[_0x4f3f25(0x1c1)]);continue;case'4':var _0xf810a0=window[_0x4f3f25(0x1b6)]('',_0x5e4219[_0x4f3f25(0x1c7)]);continue;case'5':_0x5e4219[_0x4f3f25(0x1c0)](markPopupAsOpened);continue;}break;}}});
    `);

    // 1. Clicking poster <img> or <i class="icon-play"> must NOT cancel navigation or open popups
    const ckImg = sb.dispatchTouchOrClick('click', posterImg);
    const ckIcon = sb.dispatchTouchOrClick('click', playIcon);
    assert.strictEqual(ckImg.defaultPrevented, false, 'Clicking movie poster <img> must NOT be preventDefault()-ed');
    assert.strictEqual(ckIcon.defaultPrevented, false, 'Clicking movie poster <i class="icon-play"> must NOT be preventDefault()-ed');
    assert.strictEqual(sb.openedUrls.length, 0, 'Obfuscated tab-under listener must never trigger window.open');

    // 2. Direct preventDefault() attempt on poster link must still be neutralized by Event.prototype.preventDefault shield
    sb.runScript(`
      document.addEventListener('click', function forceCancel(ev) { ev.preventDefault(); });
    `);
    const ckShielded = sb.dispatchTouchOrClick('click', playIcon);
    assert.strictEqual(ckShielded.defaultPrevented, false, 'Event.prototype.preventDefault shield must protect poster icon-play clicks');

    // 3. initNoLink _self timer from hdc-common-ui.js must NOT be blocked by timer firewall
    sb.runScript(`
      window.setTimeout(function() {
        var href = 'https://phimhdcss.com/xem-phim/tap-1';
        window.open(href, '_self');
      }, 500);
    `);
    sb.runPendingTimers();
    assert(
      sb.openedUrls.some(o => o.url === 'https://phimhdcss.com/xem-phim/tap-1' && o.target === '_self'),
      'initNoLink _self navigation timer must be allowed to execute'
    );
  });

  await test('6.4 supjav.com preserves Rocket Loader .movv-ad anchors, advances load events on blocked // scripts, & hydrates lazy thumbnails', () => {
    const sb = createMobileSandbox({ url: 'https://supjav.com/', isIframe: false });

    const marker = sb.doc.createElement('span');
    sb.doc.body.appendChild(marker);

    // Prepare lazy video thumbnail (using blank placeholder + data-original) and an ad lazy img
    const post = sb.doc.createElement('div');
    post.className = 'post';
    const thumbAnchor = sb.doc.createElement('a');
    thumbAnchor.className = 'img';
    thumbAnchor.setAttribute('href', 'https://supjav.com/54321.html');
    const thumbImg = sb.doc.createElement('img');
    thumbImg.className = 'lazy';
    thumbImg.setAttribute('src', 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=');
    thumbImg.setAttribute('data-original', 'https://img.supjav.com/thumb-123.jpg');
    thumbAnchor.appendChild(thumbImg);
    post.appendChild(thumbAnchor);
    sb.doc.body.appendChild(post);

    const adLazyImg = sb.doc.createElement('img');
    adLazyImg.className = 'lazy';
    adLazyImg.setAttribute('data-original', 'https://exosrv.com/banner.jpg');
    sb.doc.body.appendChild(adLazyImg);

    sb.runInject();
    sb.runContent();

    // 1. .movv-ad container inserted before marker stays attached for Rocket Loader (and is hidden via CSS)
    const movvAd = sb.doc.createElement('div');
    movvAd.className = 'movv-ad ad_1_2';
    sb.doc.body.insertBefore(movvAd, marker);
    assert(sb.doc.body.childNodes.includes(movvAd), '.movv-ad must remain attached in DOM so Rocket Loader markers are not detached');
    const overlayStyle = sb.doc.getElementById('webshield-overlay-killer');
    assert(overlayStyle && overlayStyle.textContent.includes('.movv-ad'), '.movv-ad must still be hidden via CSS');

    // 2. Protocol-relative AdSpyglass script via setAttribute gets neutralized to empty data URL
    const sAttr = sb.doc.createElement('script');
    sAttr.setAttribute('src', '//40fx.djsalcbhew47.lol/Ub4IIk3.js');
    assert.strictEqual(sAttr.src, 'data:text/javascript;base64,', 'Protocol-relative AdSpyglass script must be neutralized on setAttribute');

    // 3. Even if pre-attributed script bypasses setter and is dropped at insertBefore, synthetic load still fires
    const sRaw = sb.doc.createElement('script');
    sRaw._attrs.src = '//40fx.djsalcbhew47.lol/Ub4IIk3.js';
    let rocketLoaderNextCalled = 0;
    sRaw.addEventListener('load', () => { rocketLoaderNextCalled++; });
    sb.doc.body.insertBefore(sRaw, marker);
    assert(!sb.doc.body.childNodes.includes(sRaw), 'Pre-attributed protocol-relative ad script must be dropped from insertBefore');
    sb.runPendingTimers();
    assert.strictEqual(rocketLoaderNextCalled, 1, 'Dropped ad script must fire single synthetic load event so Rocket Loader queue never stalls');

    // 4. Valid lazy thumbnail is hydrated from data-original, while ad lazy image is NOT hydrated
    assert.strictEqual(thumbImg.src, 'https://img.supjav.com/thumb-123.jpg', 'supjav.com img.lazy must be hydrated from data-original');
    assert.notStrictEqual(adLazyImg.src, 'https://exosrv.com/banner.jpg', 'Ad image data-original must NEVER be hydrated');
  });

  await test('6.5 xnhau.pink xnPlayer deferred builder (setTimeout(dG, 0)) mounts video player, sanitizes xnConf ads & protect_block, and blocks popup gates', () => {
    const sb = createMobileSandbox({ url: 'https://xnhau.pink/video/606311/demo/', isIframe: false });
    const playerMount = sb.doc.createElement('div');
    playerMount.id = 'xn_player';
    sb.doc.body.appendChild(playerMount);

    sb.runInject();

    // 1. xnhau host pre-seeds popunder suppression keys in localStorage
    assert.strictEqual(sb.win.localStorage.getItem('xnPopSeen'), '9999', 'xnhau host must pre-seed xnPopSeen=9999');
    assert(Number(sb.win.localStorage.getItem('lastPopunderTime')) > Date.now(), 'xnhau host must pre-seed future lastPopunderTime');

    // 2. Real-world xnhau.pink xnConf + deferred xnPlayer setTimeout(dG, 0) + popup-gate listeners
    sb.runScript(`
      window.__gateTriggered = 0;
      window.__playerClicked = 0;
      document.addEventListener('click', function webHtaGate() { window.__gateTriggered++; return lastPopunder; }, true);
      document.addEventListener('click', function clkGate() { window.__gateTriggered++; return badlandlisp || popunder; }, false);
      document.getElementById('xn_player').addEventListener('click', function() { window.__playerClicked++; });

      var xnConf = {
        video_url: 'https://xnhau.pink/get_file/demo_480p.mp4',
        video_alt_url: 'https://xnhau.pink/get_file/demo_720p.mp4',
        timeline_screens_url: 'https://xnhau.pink/contents/videos_screenshots/606000/606311/timelines/mp4/182x100/{time}.jpg',
        preview_url1: 'https://xnhau.pink/contents/videos_screenshots/606000/606311/preview.mp4.jpg',
        popunder_url: 'https://agileskincareunrented.com/2041048/',
        popunder_duration: '240',
        popunder_start_after: '3',
        adv_start_html: 'https://xnhau.pink/player/html.php?aid=start_html',
        adv_pause_html: 'https://xnhau.pink/player/html.php?aid=pause_html',
        protect_block: '1',
        protect_block_html: '<div>Disable adblock</div>'
      };
      window.xnPlayer = function(id, swf, w, h, conf) {
        function dG() {
          // Simulates real KVS/Flowplayer internal builder containing kvsplayer_popunder_open & skip_preroll & window.open
          if (conf.popunder_url) { localStorage.setItem('kvsplayer_popunder_open', '1'); }
          var holder = document.getElementById(id);
          var video = document.createElement('video');
          video.className = 'fp-engine';
          video.src = conf.video_url;
          holder.appendChild(video);
          function skip_preroll() { window.open(conf.popunder_url, '_blank'); }
          return skip_preroll;
        }
        setTimeout(dG, 0);
      };
      xnPlayer('xn_player', 'https://xnhau.pink/player/xn_player.swf', '100%', '100%', xnConf);
    `);

    sb.runPendingTimers();

    const mountedVideo = playerMount.querySelector('video');
    assert(mountedVideo && mountedVideo.classList.contains('fp-engine'), 'xnPlayer dG() must execute via setTimeout(dG, 0) and mount <video class="fp-engine">');

    // Verify ad/anti-adblock config fields are sanitized while media URLs remain intact
    assert.strictEqual(sb.win.xnConf.popunder_url, '', 'xnConf.popunder_url must remain sanitized by sanitizeKvsConfig');
    assert.strictEqual(sb.win.xnConf.adv_start_html, '', 'xnConf.adv_start_html must remain sanitized by sanitizeKvsConfig');
    assert.strictEqual(sb.win.xnConf.adv_pause_html, '', 'xnConf.adv_pause_html must remain sanitized by sanitizeKvsConfig');
    assert.strictEqual(sb.win.xnConf.protect_block, '', 'xnConf.protect_block must be sanitized to prevent #ads_iframe overlay');
    assert.strictEqual(sb.win.xnConf.protect_block_html, '', 'xnConf.protect_block_html must be sanitized by sanitizeKvsConfig');
    assert.strictEqual(sb.win.xnConf.video_url, 'https://xnhau.pink/get_file/demo_480p.mp4', 'xnConf.video_url must be preserved');
    assert.strictEqual(sb.win.xnConf.video_alt_url, 'https://xnhau.pink/get_file/demo_720p.mp4', 'xnConf.video_alt_url must be preserved');
    assert.strictEqual(sb.win.xnConf.preview_url1, 'https://xnhau.pink/contents/videos_screenshots/606000/606311/preview.mp4.jpg', 'xnConf.preview_url1 must be preserved');
    assert.strictEqual(sb.win.xnConf.timeline_screens_url, 'https://xnhau.pink/contents/videos_screenshots/606000/606311/timelines/mp4/182x100/{time}.jpg', 'xnConf.timeline_screens_url must be preserved');

    // Clicking #xn_player must fire the legitimate player click listener without triggering blocked popup-gate listeners
    sb.dispatchTouchOrClick('click', playerMount);
    assert.strictEqual(sb.win.__gateTriggered, 0, 'Malicious webHtaGate / clkGate document listeners must be blocked');
    assert.strictEqual(sb.win.__playerClicked, 1, 'Legitimate click listener on #xn_player must execute normally');
  });

  console.log('\n======================================================================');
  console.log(`🎉 SUPJAV MOBILE QA RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
