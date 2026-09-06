// Developed by HuyTran1002
// Track session start time to reset history per session
let sessionStartTime = Date.now();

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "sessionStartTime", "disabledDomains", "lastFiltersUpdateTimestamp"], (result) => {
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
    if (res.lastFiltersUpdateTimestamp === undefined) {
      chrome.storage.local.set({ lastFiltersUpdateTimestamp: Date.now() });
    }
    sessionStartTime = Date.now();
    chrome.storage.local.set({ 
      blockedCount: 0,
      blockedHistory: [],
      sessionStartTime: sessionStartTime
    });
  });
  
  // Set badge background color
  chrome.action.setBadgeBackgroundColor({ color: "#FF4757" });
  
  // Create context menu for manual ad blocking
  chrome.contextMenus.create({
    id: "block_element",
    title: "🎯 Chọn & Chặn phần tử này... (Adblock Max)",
    contexts: ["all"]
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
  
  const ruleId = 10001; // unique ID for whitelist rule
  
  if (!disabledDomains || disabledDomains.length === 0) {
    chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [ruleId]
    });
  } else {
    const newRule = {
      id: ruleId,
      priority: 10, // higher than all block rules
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

// Real online filter updater (fetches uBlock / AdGuard / ABPVN latest filter lists via HTTP)
async function fetchAndApplyOnlineFilters() {
  const FILTER_SOURCES = [
    { name: 'abpvn', url: 'https://raw.githubusercontent.com/abpvn/abpvn/master/filter/abpvn.txt' },
    { name: 'peterlowe', url: 'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=nohtml&showintro=0&mimetype=plaintext' },
    { name: 'adguard', url: 'https://adguardteam.github.io/HostlistsRegistry/assets/filter_1.txt' }
  ];

  const domains = new Set();
  const listCounts = { abpvn: 0, peterlowe: 0, adguard: 0 };

  // Known top VN & global ad domains
  [
    'eclick.vn', 'adtima.vn', 'admicro.vn', 'ants.vn', 'novanet.vn',
    'blueseed.tv', 'ambientdigital.com.vn', 'cleverads.vn', 'coccoc.com/ad',
    'popads.net', 'popcash.net', 'propellerads.com', 'exoclick.com', 
    'onclickads.net', 'adsterra.com', 'googlesyndication.com', 'doubleclick.net',
    'mgid.com', 'taboola.com', 'outbrain.com', 'criteo.com', 'adnxs.com',
    'juicyads.com', 'jads.co', '9splt.com', 'playhubconnect.com', 'cm8806.com'
  ].forEach(d => domains.add(d));

  for (const src of FILTER_SOURCES) {
    try {
      console.log(`[Adblock Max] Connecting to ${src.name} server (${src.url})...`);
      const res = await fetch(src.url, { cache: 'no-cache' });
      if (res.ok) {
        const text = await res.text();
        const lines = text.split(/\r?\n/);
        let count = 0;
        for (let l of lines) {
          l = l.trim().toLowerCase();
          if (!l || l.startsWith('#') || l.startsWith('!') || l.startsWith('[')) continue;
          if (l.startsWith('||') && l.includes('^')) {
            l = l.substring(2, l.indexOf('^')).trim();
          }
          if (l.length >= 4 && l.includes('.') && !l.includes('/') && !l.includes(':')) {
            if (!l.includes('google') && !l.includes('youtube') && !l.includes('facebook') && !l.includes('github')) {
              domains.add(l);
              count++;
            }
          }
        }
        listCounts[src.name] = count;
        console.log(`[Adblock Max] Successfully fetched ${count} domains from ${src.name}!`);
      }
    } catch(e) {
      console.warn(`[Adblock Max] Could not fetch ${src.name}:`, e.message);
    }
  }

  // Convert up to 4000 domains into dynamic block rules (safe Chrome MV3 dynamic limit)
  if (chrome.declarativeNetRequest) {
    try {
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeIds = existingRules.filter(r => r.id >= 20000 && r.id < 30000).map(r => r.id);
      
      const newRules = [];
      let ruleId = 20000;
      for (const dom of Array.from(domains).slice(0, 4000)) {
        newRules.push({
          id: ruleId++,
          priority: 2,
          action: { type: "block" },
          condition: {
            urlFilter: `||${dom}^`,
            resourceTypes: ["script", "sub_frame", "xmlhttprequest", "image", "media", "websocket", "other"]
          }
        });
      }

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeIds,
        addRules: newRules
      });
      console.log(`[Adblock Max] Applied ${newRules.length} dynamic declarativeNetRequest block rules.`);
    } catch(e) {
      console.warn('[Adblock Max] Dynamic rules update error:', e);
    }
  }

  const now = Date.now();
  const filterStats = {
    lastUpdated: now,
    totalDomains: domains.size,
    counts: listCounts
  };

  chrome.storage.local.set({
    lastFiltersUpdateTimestamp: now,
    onlineFilterStats: filterStats
  });

  return { success: true, timestamp: now, stats: filterStats };
}

// Watch storage changes
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

// Initialize on startup
chrome.storage.local.get(["blockedCount", "disabledDomains", "enabled"], (result) => {
  if (result) {
    if (result.blockedCount) {
      updateBadge(result.blockedCount);
    }
    if (result.disabledDomains) {
      updateDeclarativeRules(result.disabledDomains);
    }
    const enabled = result.enabled !== false;
    updateRulesetState(enabled);
  }
});

// Listen for messages from content script & popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AD_BLOCKED") {
    const blockedUrl = message.url || "quảng cáo ẩn";
    const domain = sender.tab && sender.tab.url ? new URL(sender.tab.url).hostname : "Trang web";
    
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
      
      const newHistory = [newHistoryItem, ...history].slice(0, 15);
      
      chrome.storage.local.set({
        blockedCount: newCount,
        blockedHistory: newHistory
      });
    });
    
    sendResponse({ success: true });
    return true;
  }

  if (message.type === "FETCH_LATEST_FILTERS") {
    fetchAndApplyOnlineFilters().then(res => {
      sendResponse(res);
    }).catch(err => {
      sendResponse({ success: false, error: err.message });
    });
    return true; // Keep channel open for async sendResponse
  }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "block_element" && tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: "START_MANUAL_BLOCK" }, { frameId: info.frameId }, (res) => {
      if (chrome.runtime.lastError) {
        console.warn("Could not send START_MANUAL_BLOCK message to tab:", chrome.runtime.lastError);
      }
    });
  }
});
