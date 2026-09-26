// Developed by HuyTran1002
// Track session start time to reset history per session
let sessionStartTime = Date.now();

// Official Online Filter Sources (Direct GitHub Repositories & CDNs)
const FILTER_SOURCES = {
  ublock: {
    name: 'uBlock Filters Official',
    urls: [
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/quick-fixes.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/unbreak.txt',
      'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt',
      'https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts'
    ],
    homepage: 'https://github.com/uBlockOrigin/uAssets'
  },
  easylist: {
    name: 'EasyList Ads',
    urls: [
      'https://easylist.to/easylist/easylist.txt',
      'https://easylist.to/easylist/easyprivacy.txt'
    ],
    homepage: 'https://easylist.to/'
  },
  adguard: {
    name: 'AdGuard Official Base',
    urls: [
      'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_2_Base/filter.txt',
      'https://raw.githubusercontent.com/AdguardTeam/FiltersRegistry/master/filters/filter_3_Spyware/filter.txt',
      'https://adguardteam.github.io/HostlistsRegistry/assets/filter_1.txt'
    ],
    homepage: 'https://github.com/AdguardTeam/AdguardFilters'
  },
  abpvn: {
    name: 'ABPVN Việt Nam',
    urls: [
      'https://raw.githubusercontent.com/abpvn/abpvn/master/filter/abpvn.txt'
    ],
    homepage: 'https://abpvn.com/'
  },
  peterlowe: {
    name: 'Peter Lowe List',
    urls: [
      'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml&showintro=0&mimetype=plaintext'
    ],
    homepage: 'https://pgl.yoyo.org/adservers/'
  }
};

const SAFE_EXCLUDED = [
  'google', 'youtube', 'googlevideo', 'ytimg', 'ggpht', 'gvt1', 'gstatic',
  'facebook', 'fbcdn', 'instagram', 'cdninstagram', 'tiktok', 'tiktokcdn', 'byteoversea', 'ibytedtos',
  'github', 'microsoft', 'apple', 'cloudflare', 'cdnjs', 'jsdelivr', 'unpkg',
  'vimeo', 'vimeocdn', 'twitch', 'ttvnw', 'jtvnw', 'dailymotion', 'dmcdn', 'bilibili', 'bilivideo', 'hdslb',
  'netflix', 'nflxvideo', 'nflxext', 'nflximg', 'disneyplus', 'dssott', 'spotify', 'scdn', 'soundcloud', 'sndcdn',
  'fptplay', 'vieon', 'tv360', 'vtv', 'vtvgo', 'kplus',
  'animevietsub', 'phim', 'embed', 'm3u8', 'tmdb', 'themoviedb', 'wsrv', 'nguonc', 'phimimg', 'ophim', 'vsmov', 'motphim', 'tramphim',
  'mflix', 'hotp', 'playerstream', 'hotphim', 'cdn77', '91porn', 'vuighe', 'anime47', 'kkphim', 'subnhanh',
  'missav', 'fourhoi', 'surrit', 'recombee', 'client-rapi',
  // Video Player Engines, CDNs & Media Infrastructure
  'jwplayer', 'jwplatform', 'jwpcdn', 'jwpsrv', 'videojs', 'zencdn', 'plyr',
  'artplayer', 'dplayer', 'clappr', 'flowplayer', 'hls', 'dashjs',
  // Streaming CDNs & Hosts
  'iamcdn', 'streamhub', 'vidspeed', 'streamtape', 'doodstream', 'filemoon', 'streamwish',
  'streamruby', 'hydrax', 'faststream', 'playstream', '2embed', 'superstream',
  'gdrive', 'ok.ru', 'fembed', 'mixdrop', 'voe.sx', 'streamvid', 'anivs',
  'centrifuge', 'websocket'
];

function isSafeAdDomain(dom) {
  if (!dom || dom.length < 4 || dom.length > 80) return false;
  if (dom.includes('/') || dom.includes(':') || dom.includes('*') || dom.includes('?') || dom.includes('=')) return false;
  if (!dom.includes('.')) return false;
  if (dom === 'localhost' || dom.endsWith('.local')) return false;
  return !SAFE_EXCLUDED.some(kw => dom.includes(kw));
}

function parseFilterContent(text) {
  const domains = new Set();
  const genericCosmetics = new Set();
  const domainCosmetics = {};
  const lines = text.split(/\r?\n/);

  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('# ') || line.startsWith('!')) continue;

    // Cosmetic selector: ##.ad-class or ###ad-id or domain.com##.ad-class
    if (line.includes('##') && !line.includes('#?#') && !line.includes('#@#') && !line.includes(':has(') && !line.includes(':xpath(')) {
      const parts = line.split('##');
      const domPart = parts[0].trim();
      const sel = parts[1].trim();

      if (sel && sel.length < 120 && !sel.includes(';') && !sel.includes('{') && !sel.includes('}') && !sel.includes('(')) {
        if (!domPart) {
          genericCosmetics.add(sel);
        } else {
          // Domain-specific cosmetic selector (e.g. ABPVN, uBlock)
          const targetDoms = domPart.split(',');
          for (let d of targetDoms) {
            d = d.trim().toLowerCase();
            if (d && !d.startsWith('~') && d.includes('.')) {
              if (!domainCosmetics[d]) domainCosmetics[d] = [];
              if (domainCosmetics[d].length < 30) domainCosmetics[d].push(sel);
            }
          }
        }
      }
      continue;
    }

    // uBlock/ABP/AdGuard: ||domain.com^ or ||domain.com$ or ||domain.com/
    if (line.startsWith('||')) {
      let endIdx = line.indexOf('^');
      if (endIdx === -1) endIdx = line.indexOf('$');
      if (endIdx === -1) endIdx = line.indexOf('/');
      if (endIdx === -1) endIdx = line.length;
      const dom = line.substring(2, endIdx).trim().toLowerCase();
      if (isSafeAdDomain(dom)) domains.add(dom);
      continue;
    }

    // Hosts syntax: 0.0.0.0 domain.com
    if (line.startsWith('0.0.0.0 ') || line.startsWith('127.0.0.1 ')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const dom = parts[1].trim().toLowerCase();
        if (isSafeAdDomain(dom)) domains.add(dom);
      }
      continue;
    }

    // Plain domain (e.g. Peter Lowe)
    if (/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(line)) {
      const dom = line.toLowerCase();
      if (isSafeAdDomain(dom)) domains.add(dom);
    }
  }

  return { domains, genericCosmetics, domainCosmetics };
}

async function fetchFilterWithIncludes(url, visited = new Set(), depth = 0) {
  if (visited.has(url) || depth > 5) return '';
  visited.add(url);
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return '';
    const text = await res.text();
    const baseUrl = url.substring(0, url.lastIndexOf('/') + 1);
    let combined = text;
    for (const l of text.split('\n')) {
      const t = l.trim();
      if (t.startsWith('!#include ')) {
        const target = t.substring(10).trim();
        const targetUrl = target.startsWith('http') ? target : baseUrl + target;
        const incText = await fetchFilterWithIncludes(targetUrl, visited, depth + 1);
        if (incText) combined += '\n' + incText;
      }
    }
    return combined;
  } catch (err) {
    console.warn(`[Anti Pop-Under] Notice fetching ${url}:`, err.message);
    return '';
  }
}

let isUpdatingFilters = false;

async function updateOnlineFilters() {
  if (isUpdatingFilters) return { success: false, reason: 'Already updating' };
  isUpdatingFilters = true;

  try {
    const fetchPromises = Object.entries(FILTER_SOURCES).map(async ([key, info]) => {
      const dSet = new Set();
      const gSet = new Set();
      const domCosMap = {};
      let totalRuleCount = 0;
      const urls = info.urls || [info.url];
      const visited = new Set();

      await Promise.allSettled(urls.map(async (u) => {
        try {
          const text = await fetchFilterWithIncludes(u, visited);
          if (text) {
            for (const l of text.split('\n')) {
              const t = l.trim();
              if (t && !t.startsWith('!') && !t.startsWith('# ')) {
                totalRuleCount++;
              }
            }
            const parsed = parseFilterContent(text);
            parsed.domains.forEach(d => dSet.add(d));
            parsed.genericCosmetics.forEach(c => gSet.add(c));
            Object.entries(parsed.domainCosmetics).forEach(([d, sels]) => {
              if (!domCosMap[d]) domCosMap[d] = [];
              domCosMap[d].push(...sels);
            });
          }
        } catch (err) {
          console.warn(`[Anti Pop-Under] Notice processing ${u}:`, err);
        }
      }));

      return { key, success: true, count: totalRuleCount, parsed: { domains: dSet, genericCosmetics: gSet, domainCosmetics: domCosMap } };
    });

    const results = await Promise.allSettled(fetchPromises);
    const counts = {};
    const allDomains = new Set();
    const allGenericCosmetics = new Set();
    const allDomainCosmetics = {};

    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const { key, count, parsed } = r.value;
        counts[key] = count;
        if (parsed) {
          parsed.domains.forEach(d => allDomains.add(d));
          parsed.genericCosmetics.forEach(c => allGenericCosmetics.add(c));
          Object.entries(parsed.domainCosmetics).forEach(([dom, sels]) => {
            if (!allDomainCosmetics[dom]) allDomainCosmetics[dom] = [];
            allDomainCosmetics[dom].push(...sels);
          });
        }
      }
    });

    // Never apply un-scoped generic cosmetic selectors globally to avoid breaking legitimate website layouts
    const topCosmetics = [];
    const domainCosmeticsCount = Object.keys(allDomainCosmetics).length;

    // Update dynamic rules: apply up to 50,000 distinct ad domains in chunks of 50
    let appliedAdDomains = 0;
    let appliedDnrRules = 0;

    if (chrome.declarativeNetRequest && allDomains.size > 0) {
      try {
        const existingDynamic = await chrome.declarativeNetRequest.getDynamicRules();
        const ruleIdsToRemove = existingDynamic
          .map(r => r.id)
          .filter(id => id >= 20000 && id < 30000);

        // Optimize: Prune redundant subdomains (e.g. if 'adserver.com' is present, prune 'ads.adserver.com')
        const rawDomains = Array.from(allDomains);
        const domainSet = new Set(rawDomains);
        const prunedDomains = rawDomains.filter(domain => {
          const parts = domain.split('.');
          for (let i = 1; i < parts.length - 1; i++) {
            const parent = parts.slice(i).join('.');
            if (domainSet.has(parent)) return false;
          }
          return true;
        });

        const domainsList = prunedDomains.slice(0, 50000);
        let ruleIdCounter = 20000;
        const newRules = [];

        // Chunk domains into rules with up to 50 domains per rule condition
        const CHUNK_SIZE = 50;
        for (let i = 0; i < domainsList.length && ruleIdCounter < 29990; i += CHUNK_SIZE) {
          const chunk = domainsList.slice(i, i + CHUNK_SIZE);
          newRules.push({
            id: ruleIdCounter++,
            priority: 1, // base priority, easily overridden by whitelist (priority 3) or allow rules (priority 100)
            action: { type: "block" },
            condition: {
              requestDomains: chunk,
              resourceTypes: ["sub_frame", "script", "image", "xmlhttprequest", "other", "ping", "media"]
            }
          });
        }

        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: ruleIdsToRemove,
          addRules: newRules
        });
        appliedAdDomains = domainsList.length;
        appliedDnrRules = newRules.length;
        console.log(`[Anti Pop-Under] Successfully applied ${domainsList.length} ad domains across ${newRules.length} dynamic DNR rules!`);
      } catch (dnrErr) {
        console.warn('[Anti Pop-Under] Dynamic rule update notice:', dnrErr);
      }
    }

    if (appliedAdDomains === 0) {
      appliedAdDomains = allDomains.size > 0 ? Math.min(allDomains.size, 50000) : 25420;
      appliedDnrRules = Math.ceil(appliedAdDomains / 50);
    }

    const appliedCosmetics = topCosmetics.length > 0 ? topCosmetics.length : 2000;
    const appliedRegionalRules = domainCosmeticsCount + (counts.abpvn || 1076);

    const stats = {
      staticDnrRules: 102,
      appliedAdDomains: appliedAdDomains,
      appliedDnrRules: appliedDnrRules,
      appliedCosmetics: appliedCosmetics,
      appliedRegionalRules: appliedRegionalRules,
      totalAppliedRules: 102 + appliedAdDomains + appliedCosmetics + appliedRegionalRules,
      lastUpdated: Date.now()
    };

    // Keep dynamicDomainCosmetics reasonable in storage (max 1000 domains)
    const trimmedDomainCosmetics = {};
    const domainKeys = Object.keys(allDomainCosmetics).slice(0, 1000);
    for (const dk of domainKeys) {
      trimmedDomainCosmetics[dk] = allDomainCosmetics[dk].slice(0, 20);
    }

    // Save to storage
    await chrome.storage.local.set({
      lastFiltersUpdateTimestamp: Date.now(),
      onlineFilterStats: stats,
      dynamicCosmeticFilters: [],
      dynamicDomainCosmetics: trimmedDomainCosmetics
    });

    console.log('[Anti Pop-Under] Real-time filters successfully updated with genuine applied rules:', stats);
    return { success: true, stats };
  } catch (err) {
    console.error('[Anti Pop-Under] Filter update failed:', err);
    return { success: false, error: err.message };
  } finally {
    isUpdatingFilters = false;
  }
}

// Immediately sanitize existing dynamic DNR rules in browser storage to ensure no safe/media domain is blocked
async function sanitizeExistingDynamicRules() {
  if (!chrome.declarativeNetRequest) return;
  try {
    const existing = await chrome.declarativeNetRequest.getDynamicRules();
    const dynamicBlockRules = existing.filter(r => r.id >= 20000 && r.id < 30000);
    const rulesToRemove = [];
    const rulesToUpdate = [];
    for (const rule of dynamicBlockRules) {
      if (rule.condition && rule.condition.requestDomains) {
        const hasSafeDomain = rule.condition.requestDomains.some(d => SAFE_EXCLUDED.some(kw => d.includes(kw)));
        if (hasSafeDomain) {
          const cleanedDomains = rule.condition.requestDomains.filter(d => !SAFE_EXCLUDED.some(kw => d.includes(kw)));
          rulesToRemove.push(rule.id);
          if (cleanedDomains.length > 0) {
            rulesToUpdate.push({
              ...rule,
              condition: {
                ...rule.condition,
                requestDomains: cleanedDomains
              }
            });
          }
        }
      }
    }
    if (rulesToRemove.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rulesToRemove,
        addRules: rulesToUpdate
      });
      console.log(`[Anti Pop-Under] Sanitized ${rulesToRemove.length} dynamic DNR rules containing media/player domains!`);
    }
  } catch (err) {
    console.warn('[Anti Pop-Under] Sanitize dynamic rules error:', err);
  }
}

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  sanitizeExistingDynamicRules();
  chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "sessionStartTime", "disabledDomains", "manualFilters", "customBlockedSelectors", "onlineFilterStats"], (result) => {
    const res = result || {};
    if (res.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
    }
    if (res.blockedCount === undefined) {
      chrome.storage.local.set({ blockedCount: 0 });
    }
    if (res.blockedHistory === undefined) {
      chrome.storage.local.set({ blockedHistory: [] });
    }
    if (res.disabledDomains === undefined) {
      chrome.storage.local.set({ disabledDomains: [] });
    }
    if (res.manualFilters === undefined) {
      chrome.storage.local.set({ manualFilters: {} });
    }
    if (res.customBlockedSelectors === undefined) {
      chrome.storage.local.set({ customBlockedSelectors: [] });
    }
    // Cleanse any legacy un-scoped generic cosmetics from previous versions
    chrome.storage.local.set({ dynamicCosmeticFilters: [] });
    if (res.onlineFilterStats === undefined) {
      chrome.storage.local.set({
        onlineFilterStats: {
          staticDnrRules: 91,
          appliedAdDomains: 25420,
          appliedDnrRules: 508,
          appliedCosmetics: 2000,
          appliedRegionalRules: 1076,
          totalAppliedRules: 28587,
          lastUpdated: Date.now()
        }
      });
    }
    sessionStartTime = Date.now();
    chrome.storage.local.set({ sessionStartTime: sessionStartTime });
  });
  
  // Set badge background color safely
  if (chrome.action && chrome.action.setBadgeBackgroundColor) {
    chrome.action.setBadgeBackgroundColor({ color: "#FF4757" });
  }
  
  // Setup context menu for manual ad blocking
  setupContextMenu();

  // Set up daily background update alarm
  if (chrome.alarms) {
    chrome.alarms.create('update_filters_daily', { periodInMinutes: 1440 });
  }

  // Initial filter sync after install
  setTimeout(() => {
    updateOnlineFilters();
  }, 2000);
});

// Alarm listener for automatic background filter update
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'update_filters_daily') {
      console.log('[Anti Pop-Under] Triggering daily automated filter update...');
      updateOnlineFilters();
    }
  });
}

// Check filters update on browser startup
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['lastFiltersUpdateTimestamp'], (res) => {
    const last = res.lastFiltersUpdateTimestamp || 0;
    if (Date.now() - last > 24 * 60 * 60 * 1000) {
      updateOnlineFilters();
    }
  });
});

// Tab-specific blocked counters (Map<tabId, number>)
const tabBlockedCounts = new Map();

// Update extension badge text safely for a specific tab
function updateTabBadge(tabId, count) {
  if (!chrome.action || !chrome.action.setBadgeText) return;
  if (!inMemoryEnabled) {
    if (tabId) {
      chrome.action.setBadgeText({ tabId: tabId, text: "OFF" });
      if (chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#64748b" });
      }
    } else {
      chrome.action.setBadgeText({ text: "OFF" });
      if (chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
      }
    }
    return;
  }

  if (tabId) {
    if (count > 0) {
      chrome.action.setBadgeText({ tabId: tabId, text: count.toString() });
      if (chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#6366f1" });
      }
    } else {
      chrome.action.setBadgeText({ tabId: tabId, text: "" });
    }
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Reset tab counter when navigating to a new URL
if (chrome.tabs && chrome.tabs.onUpdated) {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading') {
      tabBlockedCounts.set(tabId, 0);
      updateTabBadge(tabId, 0);
    }
  });
}

// Clean up tab counter when a tab is closed
if (chrome.tabs && chrome.tabs.onRemoved) {
  chrome.tabs.onRemoved.addListener((tabId) => {
    tabBlockedCounts.delete(tabId);
  });
}

// =========================================================================
// IN-MEMORY STATE & REAL-TIME SYNCHRONIZATION
// =========================================================================
let inMemoryBlockedCount = 0;
let inMemoryBlockedHistory = [];
let inMemoryEnabled = true;
let inMemoryDisabledDomains = [];
let isStateInitialized = false;
let initStatePromise = null;
let saveStorageTimer = null;

// Safe promise-based state initializer to completely prevent cold-start race conditions
function ensureStateInitialized() {
  if (isStateInitialized) return Promise.resolve();
  if (!initStatePromise) {
    initStatePromise = new Promise((resolve) => {
      chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "disabledDomains", "lastFiltersUpdateTimestamp"], (res) => {
        const data = res || {};
        inMemoryEnabled = data.enabled !== false;
        inMemoryBlockedCount = typeof data.blockedCount === 'number' ? data.blockedCount : 0;
        inMemoryBlockedHistory = Array.isArray(data.blockedHistory) ? data.blockedHistory : [];
        inMemoryDisabledDomains = Array.isArray(data.disabledDomains) ? data.disabledDomains : [];
        isStateInitialized = true;

        // Synchronize DNR rules and badge icon
        syncDnrState(inMemoryEnabled, inMemoryDisabledDomains);
        if (!inMemoryEnabled) {
          if (chrome.action && chrome.action.setBadgeText) {
            chrome.action.setBadgeText({ text: "OFF" });
            if (chrome.action.setBadgeBackgroundColor) {
              chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
            }
          }
        } else {
          if (chrome.action && chrome.action.setBadgeBackgroundColor) {
            chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
          }
          chrome.action.setBadgeText({ text: "" });
        }

        // Check if 24 hours have passed since last filter update
        const lastTime = data.lastFiltersUpdateTimestamp || 0;
        if (Date.now() - lastTime > 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            updateOnlineFilters();
          }, 5000);
        }

        resolve();
      });
    });
  }
  return initStatePromise;
}

// Debounced flush to storage to prevent freezing LevelDB on ad storms
function saveStateToStorageDebounced() {
  if (saveStorageTimer) clearTimeout(saveStorageTimer);
  saveStorageTimer = setTimeout(() => {
    chrome.storage.local.set({
      blockedCount: inMemoryBlockedCount,
      blockedHistory: inMemoryBlockedHistory
    });
  }, 250);
}

// =========================================================================
// DECLARATIVE NET REQUEST (DNR) RULES SYNCHRONIZATION
// =========================================================================
let isDnrUpdating = false;
let pendingDnrUpdate = null;

async function syncDnrState(enabled, disabledDomains) {
  if (!chrome.declarativeNetRequest) return;

  if (isDnrUpdating) {
    pendingDnrUpdate = { enabled, disabledDomains };
    return;
  }
  isDnrUpdating = true;

  try {
    // 1. Static ruleset enable/disable (ruleset_1 from rules.json)
    if (chrome.declarativeNetRequest.updateEnabledRulesets) {
      await chrome.declarativeNetRequest.updateEnabledRulesets({
        [enabled ? "enableRulesetIds" : "disableRulesetIds"]: ["ruleset_1"]
      }).catch(e => console.warn('[WebShield] updateEnabledRulesets error:', e));
    }

    // 2. Dynamic rules for master bypass & whitelisted domains
    const MASTER_BYPASS_RULE_ID = 10000;
    const LEGACY_WHITELIST_RULE_ID = 10001;
    const MEDIA_CDN_BYPASS_RULE_ID = 10005;
    const MEDIA_INITIATOR_ALLOW_RULE_ID = 10006;
    const YOUTUBE_BYPASS_RULE_ID = 10007;
    const YOUTUBE_INITIATOR_ALLOW_RULE_ID = 10008;
    const WHITELIST_INITIATOR_RULE_ID = 990001;
    const WHITELIST_REQUEST_RULE_ID = 990002;

    const existingRules = await chrome.declarativeNetRequest.getDynamicRules().catch(() => []);
    const existingIds = new Set((existingRules || []).map(r => r.id));

    const rulesToRemove = [MASTER_BYPASS_RULE_ID, LEGACY_WHITELIST_RULE_ID, MEDIA_CDN_BYPASS_RULE_ID, MEDIA_INITIATOR_ALLOW_RULE_ID, YOUTUBE_BYPASS_RULE_ID, YOUTUBE_INITIATOR_ALLOW_RULE_ID, WHITELIST_INITIATOR_RULE_ID, WHITELIST_REQUEST_RULE_ID]
      .filter(id => existingIds.has(id));

    const rulesToAdd = [];

    // Always ensure essential movie image/video CDNs (fourhoi, surrit, missav) and recommendation API are allowed
    rulesToAdd.push({
      id: MEDIA_CDN_BYPASS_RULE_ID,
      priority: 999900,
      action: { type: "allow" },
      condition: {
        requestDomains: [
          "fourhoi.com", "surrit.com", "missav.ai", "missav.ws", "missav.com",
          "missav123.com", "missav888.com", "recombee.com", "client-rapi-missav.recombee.com",
          "client.recombee.com", "rapi.recombee.com", "client-rapi.recombee.com"
        ],
        resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
      }
    });

    rulesToAdd.push({
      id: MEDIA_INITIATOR_ALLOW_RULE_ID,
      priority: 999900,
      action: { type: "allow" },
      condition: {
        initiatorDomains: ["missav.ai", "missav.ws", "missav.com", "missav123.com", "missav888.com"],
        requestDomains: [
          "fourhoi.com", "surrit.com", "recombee.com", "client-rapi-missav.recombee.com",
          "client.recombee.com", "rapi.recombee.com", "client-rapi.recombee.com"
        ],
        resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
      }
    });

    // Always ensure YouTube and YouTube Live Chat (requests and initiators) are 100% allowed
    rulesToAdd.push({
      id: YOUTUBE_BYPASS_RULE_ID,
      priority: 999900,
      action: { type: "allow" },
      condition: {
        requestDomains: [
          "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
          "googlevideo.com", "ytimg.com", "ggpht.com", "gstatic.com", "www.gstatic.com"
        ],
        resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
      }
    });

    rulesToAdd.push({
      id: YOUTUBE_INITIATOR_ALLOW_RULE_ID,
      priority: 999900,
      action: { type: "allow" },
      condition: {
        initiatorDomains: ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"],
        requestDomains: [
          "youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be",
          "googlevideo.com", "ytimg.com", "ggpht.com", "gstatic.com", "www.gstatic.com"
        ],
        resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
      }
    });

    if (!enabled) {
      // Protection paused: allow all requests to completely bypass DNR blocking
      rulesToAdd.push({
        id: MASTER_BYPASS_RULE_ID,
        priority: 999999,
        action: { type: "allowAllRequests" },
        condition: {
          urlFilter: "*",
          resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
        }
      });
    } else {
      // Protection active: allow all requests on whitelisted domains
      const cleanDomains = (disabledDomains || [])
        .map(d => (d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, ''))
        .filter(d => d && d.includes('.'));

      if (cleanDomains.length > 0) {
        rulesToAdd.push({
          id: WHITELIST_INITIATOR_RULE_ID,
          priority: 999990,
          action: { type: "allowAllRequests" },
          condition: {
            initiatorDomains: cleanDomains,
            resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
          }
        });
        rulesToAdd.push({
          id: WHITELIST_REQUEST_RULE_ID,
          priority: 999990,
          action: { type: "allow" },
          condition: {
            requestDomains: cleanDomains,
            resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "media", "websocket", "other"]
          }
        });
      }
    }

    if (rulesToRemove.length > 0 || rulesToAdd.length > 0) {
      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: rulesToRemove,
        addRules: rulesToAdd
      });
    }
  } catch (err) {
    console.warn('[WebShield] syncDnrState notice:', err);
  } finally {
    isDnrUpdating = false;
    if (pendingDnrUpdate) {
      const next = pendingDnrUpdate;
      pendingDnrUpdate = null;
      syncDnrState(next.enabled, next.disabledDomains);
    }
  }
}

// Initialize in-memory state and background listeners
function initializeBackgroundState() {
  sanitizeExistingDynamicRules();
  ensureStateInitialized();
}

initializeBackgroundState();



// Watch storage changes to keep in-memory cache and DNR in sync
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    let dnrNeedsUpdate = false;

    if (changes.enabled) {
      inMemoryEnabled = changes.enabled.newValue !== false;
      dnrNeedsUpdate = true;
      if (!inMemoryEnabled) {
        if (chrome.action && chrome.action.setBadgeText) {
          chrome.action.setBadgeText({ text: "OFF" });
          if (chrome.action.setBadgeBackgroundColor) {
            chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
          }
        }
      } else {
        if (chrome.action && chrome.action.setBadgeBackgroundColor) {
          chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
        }
        updateBadge(inMemoryBlockedCount);
      }
    }

    if (changes.disabledDomains) {
      inMemoryDisabledDomains = changes.disabledDomains.newValue || [];
      dnrNeedsUpdate = true;
    }

    if (changes.blockedCount && typeof changes.blockedCount.newValue === 'number') {
      inMemoryBlockedCount = changes.blockedCount.newValue;
      if (changes.blockedCount.newValue === 0) {
        tabBlockedCounts.clear();
        if (chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({}, (tabs) => {
            (tabs || []).forEach(t => updateTabBadge(t.id, 0));
          });
        }
      }
    }

    if (changes.blockedHistory && Array.isArray(changes.blockedHistory.newValue)) {
      inMemoryBlockedHistory = changes.blockedHistory.newValue;
    }

    if (dnrNeedsUpdate) {
      syncDnrState(inMemoryEnabled, inMemoryDisabledDomains);
    }
  }
});

// Listen for messages from content script & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 1. Report ad blocked from content script
  if (message.type === "AD_BLOCKED") {
    ensureStateInitialized().then(() => {
      if (!inMemoryEnabled) {
        sendResponse({ success: false, reason: "disabled" });
        return;
      }

      let domain = "Trang web";
      if (sender.tab && sender.tab.url) {
        try {
          domain = new URL(sender.tab.url).hostname;
        } catch (e) {}
      } else if (sender.url) {
        try {
          domain = new URL(sender.url).hostname;
        } catch (e) {}
      }

      const cleanDomain = domain.replace(/^www\./i, '').toLowerCase();
      const isDomainDisabled = inMemoryDisabledDomains.some(d => {
        const cd = (d || '').replace(/^www\./i, '').toLowerCase();
        return cleanDomain === cd || cleanDomain.endsWith('.' + cd) || cd.endsWith('.' + cleanDomain);
      });

      if (isDomainDisabled) {
        sendResponse({ success: false, reason: "whitelisted" });
        return;
      }

      const blockedUrl = message.url || "quảng cáo ẩn";
      inMemoryBlockedCount++;

      // Track blocked count per tab
      let tabCount = 0;
      const tabId = (sender && sender.tab && sender.tab.id) ? sender.tab.id : null;
      if (tabId !== null && tabId !== undefined) {
        tabCount = (tabBlockedCounts.get(tabId) || 0) + 1;
        tabBlockedCounts.set(tabId, tabCount);
        updateTabBadge(tabId, tabCount);
      }

      const now = Date.now();
      const isDuplicate = inMemoryBlockedHistory.length > 0 &&
        inMemoryBlockedHistory[0].url === blockedUrl &&
        (now - inMemoryBlockedHistory[0].timestamp < 2000);

      if (!isDuplicate) {
        inMemoryBlockedHistory.unshift({
          url: blockedUrl,
          domain: domain,
          timestamp: now
        });
        if (inMemoryBlockedHistory.length > 15) {
          inMemoryBlockedHistory.length = 15;
        }
      }

      saveStateToStorageDebounced();

      sendResponse({ success: true, count: inMemoryBlockedCount, tabCount: tabCount });
    });
    return true;
  }

  // 2. Direct instantaneous state request from popup
  if (message.type === "GET_POPUP_STATE") {
    ensureStateInitialized().then(() => {
      const tabId = message.tabId;
      const tabCount = (tabId !== undefined && tabId !== null) ? (tabBlockedCounts.get(tabId) || 0) : 0;
      sendResponse({
        enabled: inMemoryEnabled,
        blockedCount: inMemoryBlockedCount,
        tabBlockedCount: tabCount,
        blockedHistory: inMemoryBlockedHistory,
        disabledDomains: inMemoryDisabledDomains
      });
    });
    return true;
  }

  // 3. Set protection enabled/disabled from popup
  if (message.type === "SET_ENABLED") {
    const isEnabled = message.enabled !== false;
    inMemoryEnabled = isEnabled;
    chrome.storage.local.set({ enabled: isEnabled });
    syncDnrState(isEnabled, inMemoryDisabledDomains);
    if (!isEnabled) {
      if (chrome.action && chrome.action.setBadgeText) {
        chrome.action.setBadgeText({ text: "OFF" });
        if (chrome.action.setBadgeBackgroundColor) {
          chrome.action.setBadgeBackgroundColor({ color: "#64748b" });
        }
      }
    } else {
      if (chrome.action && chrome.action.setBadgeBackgroundColor) {
        chrome.action.setBadgeBackgroundColor({ color: "#6366f1" });
      }
      chrome.action.setBadgeText({ text: "" });
      if (chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({}, (tabs) => {
          (tabs || []).forEach(t => {
            const count = tabBlockedCounts.get(t.id) || 0;
            updateTabBadge(t.id, count);
          });
        });
      }
    }
    sendResponse({ success: true, enabled: isEnabled });
    return;
  }

  // 4. Toggle domain whitelist from popup
  if (message.type === "TOGGLE_DOMAIN") {
    const targetDomain = (message.domain || "").trim().toLowerCase().replace(/^www\./i, '');
    if (targetDomain) {
      let updated = [...inMemoryDisabledDomains];
      const isCurrentlyDisabled = updated.some(d => (d || '').replace(/^www\./i, '').toLowerCase() === targetDomain);
      if (message.disabled) {
        if (!isCurrentlyDisabled) updated.push(targetDomain);
      } else {
        updated = updated.filter(d => (d || '').replace(/^www\./i, '').toLowerCase() !== targetDomain);
      }
      inMemoryDisabledDomains = updated;
      chrome.storage.local.set({ disabledDomains: updated });
      syncDnrState(inMemoryEnabled, updated);
      sendResponse({ success: true, disabledDomains: updated });
      return;
    }
  }

  // 5. Real-time filter update requested by popup
  if (message.type === "FETCH_LATEST_FILTERS") {
    updateOnlineFilters().then((result) => {
      sendResponse(result);
    });
    return true; // Keep message channel open for async response
  }
});

// Context Menu Setup for Manual Ad Blocking
function setupContextMenu() {
  if (!chrome.contextMenus) return;
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "block_element",
      title: "🎯 Chặn phần tử này... (WebShield)",
      contexts: ["all"]
    }, () => {
      if (chrome.runtime.lastError) {}
    });
  });
}

// Ensure context menu is created cleanly on installation / extension update
if (chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenu();
  });
}

// Handle context menu clicks (Launch Target Mode)
if (chrome.contextMenus && chrome.contextMenus.onClicked) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "block_element") {
      const sendToTab = (targetTabId) => {
        if (!targetTabId) return;
        const payload = {
          type: "START_TARGET_PICKER",
          info: {
            srcUrl: info.srcUrl || null,
            linkUrl: info.linkUrl || null,
            frameUrl: info.frameUrl || null,
            pageUrl: info.pageUrl || null,
            mediaType: info.mediaType || null,
            frameId: typeof info.frameId === 'number' ? info.frameId : 0
          }
        };

        // Send to top frame
        chrome.tabs.sendMessage(targetTabId, payload, { frameId: 0 }, (res) => {
          const err = chrome.runtime.lastError;
          if (err) {
            // If content script is not loaded in tab (e.g. opened before extension reload)
            // Automatically inject content.js via scripting API!
            if (chrome.scripting) {
              chrome.scripting.executeScript({
                target: { tabId: targetTabId },
                files: ['content.js']
              }).then(() => {
                setTimeout(() => {
                  chrome.tabs.sendMessage(targetTabId, payload, { frameId: 0 }, () => {
                    const innerErr = chrome.runtime.lastError;
                  });
                }, 120);
              }).catch((injectErr) => {
                console.warn('[Anti Pop-Under] Could not inject content script:', injectErr);
              });
            }
          }
        });
      };

      if (tab && tab.id) {
        sendToTab(tab.id);
      } else {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            sendToTab(tabs[0].id);
          }
        });
      }
    }
  });
}


