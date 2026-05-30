// Developed by HuyTran1002
// Track session start time to reset history per session
let sessionStartTime = Date.now();

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "sessionStartTime", "disabledDomains"], (result) => {
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

// Watch storage changes to update badge & dynamic allow rules
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.blockedCount) {
      updateBadge(changes.blockedCount.newValue);
    }
    if (changes.disabledDomains) {
      updateDeclarativeRules(changes.disabledDomains.newValue);
    }
  }
});

// Initialize badge and declarative rules on startup
chrome.storage.local.get(["blockedCount", "disabledDomains"], (result) => {
  if (result) {
    if (result.blockedCount) {
      updateBadge(result.blockedCount);
    }
    if (result.disabledDomains) {
      updateDeclarativeRules(result.disabledDomains);
    }
  }
});

// Listen for messages from content script
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
  }
});
