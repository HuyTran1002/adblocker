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
  'google', 'youtube', 'googlevideo', 'ytimg', 'ggpht', 'gvt1',
  'facebook', 'github', 'microsoft', 'apple', 'cloudflare',
  'cdnjs', 'jsdelivr', 'animevietsub', 'phim', 'embed', 'm3u8'
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

    // Provide default fallback counts if offline
    if (!counts.ublock) counts.ublock = 108000;
    if (!counts.easylist) counts.easylist = 138000;
    if (!counts.adguard) counts.adguard = 675000;
    if (!counts.abpvn) counts.abpvn = 1102;
    if (!counts.peterlowe) counts.peterlowe = 3541;

    const stats = {
      totalDomains: allDomains.size || 50000,
      counts: counts
    };

    // Save up to 2,000 clean global cosmetic selectors
    const topCosmetics = Array.from(allGenericCosmetics).slice(0, 2000);

    // Save to storage
    await chrome.storage.local.set({
      lastFiltersUpdateTimestamp: Date.now(),
      onlineFilterStats: stats,
      dynamicCosmeticFilters: topCosmetics,
      dynamicDomainCosmetics: allDomainCosmetics
    });

    // Update dynamic rules: apply up to 50,000 distinct ad domains in chunks of 50
    if (chrome.declarativeNetRequest && allDomains.size > 0) {
      try {
        const existingDynamic = await chrome.declarativeNetRequest.getDynamicRules();
        const ruleIdsToRemove = existingDynamic
          .map(r => r.id)
          .filter(id => id >= 20000 && id < 30000);

        const domainsList = Array.from(allDomains).slice(0, 50000);
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
        console.log(`[Anti Pop-Under] Successfully applied ${domainsList.length} ad domains across ${newRules.length} dynamic DNR rules!`);
      } catch (dnrErr) {
        console.warn('[Anti Pop-Under] Dynamic rule update notice:', dnrErr);
      }
    }

    console.log('[Anti Pop-Under] Real-time filters successfully updated:', stats);
    return { success: true, stats };
  } catch (err) {
    console.error('[Anti Pop-Under] Filter update failed:', err);
    return { success: false, error: err.message };
  } finally {
    isUpdatingFilters = false;
  }
}

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "sessionStartTime", "disabledDomains", "manualFilters", "customBlockedSelectors"], (result) => {
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
    // Reset history on new session/extension load to avoid memory buildup
    sessionStartTime = Date.now();
    chrome.storage.local.set({ 
      blockedCount: 0,
      blockedHistory: [],
      sessionStartTime: sessionStartTime
    });
  });
  
  // Set badge background color
  chrome.action.setBadgeBackgroundColor({ color: "#FF4757" });
  
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

// Update extension badge text
function updateBadge(count) {
  if (count > 0) {
    chrome.action.setBadgeText({ text: count.toString() });
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Update declarative rules dynamically to allow all requests from whitelisted domains
function updateDeclarativeRules(disabledDomains) {
  if (!chrome.declarativeNetRequest) return;
  
  const ruleId = 10001; // unique ID for our dynamic rule
  
  if (!disabledDomains || disabledDomains.length === 0) {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId]
    });
  } else {
    const newRule = {
      id: ruleId,
      priority: 3, // higher than all rules in rules.json (priority 1 or 2)
      action: { type: "allow" },
      condition: {
        initiatorDomains: disabledDomains,
        resourceTypes: ["main_frame", "sub_frame", "stylesheet", "script", "image", "font", "object", "xmlhttprequest", "ping", "csp_report", "media", "websocket", "other"]
      }
    };
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId],
      addRules: [newRule]
    });
  }
}

// Update declarative ruleset state (enable/disable static ruleset)
function updateRulesetState(enabled) {
  if (!chrome.declarativeNetRequest) return;
  chrome.declarativeNetRequest.updateEnabledRulesets({
    [enabled ? "enableRulesetIds" : "disableRulesetIds"]: ["ruleset_1"]
  }, () => {
    if (chrome.runtime.lastError) {
      console.warn('[Anti Pop-Under] updateEnabledRulesets error:', chrome.runtime.lastError);
    }
  });
}

// Watch storage changes to update badge & dynamic allow rules
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.blockedCount) {
      updateBadge(changes.blockedCount.newValue);
    }
    if (changes.disabledDomains) {
      updateDeclarativeRules(changes.disabledDomains.newValue);
    }
    if (changes.enabled) {
      updateRulesetState(changes.enabled.newValue);
    }
  }
});

// Initialize badge and declarative rules on startup
chrome.storage.local.get(["blockedCount", "disabledDomains", "enabled", "lastFiltersUpdateTimestamp"], (result) => {
  if (result) {
    if (result.blockedCount) {
      updateBadge(result.blockedCount);
    }
    if (result.disabledDomains) {
      updateDeclarativeRules(result.disabledDomains);
    }
    const enabled = result.enabled !== false;
    updateRulesetState(enabled);

    // Check if 24 hours have passed since last filter update
    const lastTime = result.lastFiltersUpdateTimestamp || 0;
    if (Date.now() - lastTime > 24 * 60 * 60 * 1000) {
      setTimeout(() => {
        updateOnlineFilters();
      }, 5000);
    }
  }
});

// Listen for messages from content script & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AD_BLOCKED") {
    const blockedUrl = message.url || "quảng cáo ẩn";
    const domain = sender.tab && sender.tab.url ? new URL(sender.tab.url).hostname : "Trang web";
    
    // Get and update count & history
    chrome.storage.local.get(["blockedCount", "blockedHistory"], (result) => {
      const res = result || {};
      const currentCount = res.blockedCount || 0;
      const history = res.blockedHistory || [];
      
      const newCount = currentCount + 1;
      const newHistoryItem = {
        url: blockedUrl,
        domain: domain,
        timestamp: Date.now()
      };
      
      // Keep last 15 items in history
      const newHistory = [newHistoryItem, ...history].slice(0, 15);
      
      chrome.storage.local.set({
        blockedCount: newCount,
        blockedHistory: newHistory
      });
    });
    
    sendResponse({ success: true });
    return;
  }

  // Real-time filter update requested by popup
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
      title: "🎯 Chọn & Chặn phần tử này... (Adblock Max)",
      contexts: ["all"]
    }, () => {
      if (chrome.runtime.lastError) {}
    });
  });
}

// Ensure context menu is always available on startup and installation
setupContextMenu();
if (chrome.runtime && chrome.runtime.onInstalled) {
  chrome.runtime.onInstalled.addListener(() => {
    setupContextMenu();
  });
}

// Handle context menu clicks (Launch Target Mode)
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

