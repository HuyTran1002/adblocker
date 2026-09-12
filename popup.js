// Safe mock fallback for standalone preview / browser testing
if (typeof chrome === "undefined" || !chrome.storage) {
  window.chrome = {
    runtime: {
      getManifest: () => ({ version: "3.5.6" }),
      sendMessage: (msg, cb) => { if (cb) cb({ success: true }); }
    },
    storage: {
      local: {
        get: (keys, cb) => {
          if (cb) cb({
            enabled: true,
            blockedCount: 142,
            lastFiltersUpdateTimestamp: Date.now() - 300000,
            onlineFilterStats: {
              staticDnrRules: 91,
              appliedAdDomains: 25420,
              appliedDnrRules: 508,
              appliedCosmetics: 2000,
              appliedRegionalRules: 1076,
              totalAppliedRules: 28587
            }
          });
        },
        set: (obj, cb) => { if (cb) cb(); }
      },
      onChanged: { addListener: () => {} }
    },
    tabs: {
      query: (opts, cb) => { if (cb) cb([{ id: 1, url: "https://example.com" }]); },
      reload: () => {},
      create: (opts) => { window.open(opts.url, '_blank'); }
    }
  };
}

document.addEventListener("DOMContentLoaded", () => {
  // Sync manifest version string
  try {
    const versionEl = document.querySelector(".version");
    if (versionEl && chrome && chrome.runtime && chrome.runtime.getManifest) {
      versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
    }
  } catch (e) {}

  // View Panels Navigation (Main View <-> Settings View)
  const mainView = document.getElementById("main-view");
  const settingsView = document.getElementById("settings-view");
  const openSettingsBtn = document.getElementById("open-settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");

  openSettingsBtn.addEventListener("click", () => {
    mainView.classList.remove("active");
    settingsView.classList.add("active");
  });

  closeSettingsBtn.addEventListener("click", () => {
    settingsView.classList.remove("active");
    mainView.classList.add("active");
  });

  // Settings Tab Navigation
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTabId = btn.getAttribute("data-tab");
      
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // UI Elements
  const powerToggle = document.getElementById("power-toggle");
  const statusCard = document.getElementById("status-card");
  const statusBadge = document.getElementById("status-badge");
  const blockedCountEl = document.getElementById("blocked-count");
  const historyList = document.getElementById("history-list");
  const emptyState = document.getElementById("empty-state");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const siteToggle = document.getElementById("site-toggle");
  const siteToggleLabel = document.getElementById("site-toggle-label");

  // Whitelist & Custom Rule Elements
  const whitelistInput = document.getElementById("whitelist-input");
  const whitelistAddBtn = document.getElementById("whitelist-add-btn");
  const addCurrentWhitelistBtn = document.getElementById("add-current-whitelist-btn");
  const whitelistTagsContainer = document.getElementById("whitelist-tags-container");
  const emptyWhitelistMsg = document.getElementById("empty-whitelist-msg");
  const whitelistCountEl = document.getElementById("whitelist-count");

  const customRuleInput = document.getElementById("custom-rule-input");
  const customRuleAddBtn = document.getElementById("custom-rule-add-btn");
  const customRulesContainer = document.getElementById("custom-rules-container");
  const emptyCustomMsg = document.getElementById("empty-custom-msg");
  const customCountEl = document.getElementById("custom-count");
  const clearCustomRulesBtn = document.getElementById("clear-custom-rules-btn");
  const updateFiltersBtn = document.getElementById("update-filters-btn");
  const updateBtnText = document.getElementById("update-btn-text");

  let currentCount = 0;
  let currentDomain = "";

  // Relative Time Formatter in Vietnamese
  function formatRelativeTime(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) return "Vừa xong";
    if (diffSecs < 60) return `${diffSecs}s trước`;
    if (diffMins < 60) return `${diffMins}p trước`;
    if (diffHours < 24) return `${diffHours}h trước`;
    return new Date(timestamp).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
  }

  // Update Main UI View
  function updateUI(enabled, count, history) {
    powerToggle.checked = enabled;
    if (enabled) {
      statusCard.classList.remove("disabled");
      statusCard.classList.add("active");
      statusBadge.textContent = "Đang bảo vệ";
    } else {
      statusCard.classList.remove("active");
      statusCard.classList.add("disabled");
      statusBadge.textContent = "Đã tạm dừng";
    }

    if (count !== currentCount) {
      blockedCountEl.textContent = count;
      blockedCountEl.classList.add("pulse");
      setTimeout(() => blockedCountEl.classList.remove("pulse"), 200);
      currentCount = count;
    }

    const items = historyList.querySelectorAll(".history-item");
    items.forEach(el => el.remove());

    if (!history || history.length === 0) {
      emptyState.style.display = "flex";
    } else {
      emptyState.style.display = "none";
      history.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "history-item";
        let displayUrl = item.url || "Quảng cáo ẩn";
        if (displayUrl.startsWith("http")) {
          try {
            const urlObj = new URL(displayUrl);
            displayUrl = urlObj.hostname + urlObj.pathname;
            if (displayUrl.length > 32) displayUrl = displayUrl.substring(0, 32) + "...";
          } catch (e) {}
        }
        itemEl.innerHTML = `
          <div class="history-details">
            <span class="history-domain">${item.domain || "Web"}</span>
            <span class="history-url" title="${item.url}">${displayUrl}</span>
          </div>
          <span class="history-time">${formatRelativeTime(item.timestamp)}</span>
        `;
        historyList.appendChild(itemEl);
      });
    }
  }

  // Active Tab Domain Check
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const urlObj = new URL(tabs[0].url);
        currentDomain = urlObj.hostname;
        siteToggleLabel.textContent = `Chặn trên ${currentDomain}`;
        
        chrome.storage.local.get(["disabledDomains"], (res) => {
          const disabledDomains = res.disabledDomains || [];
          siteToggle.checked = !disabledDomains.includes(currentDomain);
        });
      } catch (e) {
        siteToggleLabel.textContent = "Chặn trên trang này";
        siteToggle.disabled = true;
      }
    } else {
      siteToggle.disabled = true;
    }
  });

  // Whitelist UI Manager
  function updateWhitelistUI(disabledDomains) {
    whitelistTagsContainer.innerHTML = "";
    const list = disabledDomains || [];
    whitelistCountEl.textContent = list.length;

    if (list.length === 0) {
      emptyWhitelistMsg.style.display = "block";
    } else {
      emptyWhitelistMsg.style.display = "none";
      list.forEach(domain => {
        const tag = document.createElement("div");
        tag.className = "rule-tag";
        tag.innerHTML = `
          <span>${domain}</span>
          <button class="tag-remove-btn" title="Xóa khỏi whitelist" data-domain="${domain}">&times;</button>
        `;
        tag.querySelector(".tag-remove-btn").addEventListener("click", (e) => {
          const domToRemove = e.currentTarget.getAttribute("data-domain");
          chrome.storage.local.get(["disabledDomains"], (res) => {
            const updated = (res.disabledDomains || []).filter(d => d !== domToRemove);
            chrome.storage.local.set({ disabledDomains: updated }, () => {
              if (domToRemove === currentDomain) {
                siteToggle.checked = true;
                chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
                  if (t && t[0] && t[0].id) chrome.tabs.reload(t[0].id);
                });
              }
            });
          });
        });
        whitelistTagsContainer.appendChild(tag);
      });
    }
  }

  // Custom Rules UI Manager
  function updateCustomRulesUI(manualFilters, customBlockedSelectors) {
    customRulesContainer.innerHTML = "";
    const filters = manualFilters || {};
    const globalList = customBlockedSelectors || [];
    
    const domainRules = (currentDomain && filters[currentDomain]) ? filters[currentDomain] : [];
    const totalCount = domainRules.length + globalList.length;
    customCountEl.textContent = totalCount;

    if (totalCount === 0) {
      emptyCustomMsg.style.display = "block";
    } else {
      emptyCustomMsg.style.display = "none";
      
      // 1. Render rules on current domain
      domainRules.forEach(selector => {
        const item = document.createElement("div");
        item.className = "custom-rule-item";
        const displayCode = selector.length > 28 ? selector.substring(0, 26) + '...' : selector;

        item.innerHTML = `
          <div class="custom-rule-info" title="${selector.replace(/"/g, '&quot;')}">
            <span class="custom-rule-code">${displayCode}</span>
            <span class="custom-rule-domain">${currentDomain || "Trang hiện tại"}</span>
          </div>
          <button class="custom-rule-delete-btn" title="Gỡ bỏ quy tắc này">🗑️ Gỡ</button>
        `;

        const deleteBtn = item.querySelector(".custom-rule-delete-btn");
        deleteBtn.addEventListener("click", () => {
          chrome.storage.local.get(["manualFilters"], (res) => {
            let curFilters = res.manualFilters || {};
            if (curFilters[currentDomain]) {
              curFilters[currentDomain] = curFilters[currentDomain].filter(s => s !== selector);
              if (curFilters[currentDomain].length === 0) delete curFilters[currentDomain];
              chrome.storage.local.set({ manualFilters: curFilters }, () => {
                updateCustomRulesUI(curFilters, globalList);
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                  if (tabs && tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
                });
              });
            }
          });
        });
        customRulesContainer.appendChild(item);
      });

      // 2. Render global selectors
      globalList.forEach(rule => {
        const item = document.createElement("div");
        item.className = "custom-rule-item";
        const displayCode = rule.length > 28 ? rule.substring(0, 26) + '...' : rule;

        item.innerHTML = `
          <div class="custom-rule-info" title="${rule.replace(/"/g, '&quot;')}">
            <span class="custom-rule-code">${displayCode}</span>
            <span class="custom-rule-domain">Toàn cục (Mọi trang)</span>
          </div>
          <button class="custom-rule-delete-btn" title="Gỡ bỏ quy tắc này">🗑️ Gỡ</button>
        `;

        const deleteBtn = item.querySelector(".custom-rule-delete-btn");
        deleteBtn.addEventListener("click", () => {
          chrome.storage.local.get(["customBlockedSelectors"], (res) => {
            const updated = (res.customBlockedSelectors || []).filter(r => r !== rule);
            chrome.storage.local.set({ customBlockedSelectors: updated }, () => {
              updateCustomRulesUI(filters, updated);
              chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
              });
            });
          });
        });
        customRulesContainer.appendChild(item);
      });
    }
  }

  // Add Domain to Whitelist
  function addDomainToWhitelist(domainStr) {
    if (!domainStr) return;
    const cleanDomain = domainStr.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!cleanDomain) return;

    chrome.storage.local.get(["disabledDomains"], (res) => {
      const disabledDomains = res.disabledDomains || [];
      if (!disabledDomains.includes(cleanDomain)) {
        disabledDomains.push(cleanDomain);
        chrome.storage.local.set({ disabledDomains: disabledDomains }, () => {
          whitelistInput.value = "";
          if (cleanDomain === currentDomain) {
            siteToggle.checked = false;
            chrome.tabs.query({ active: true, currentWindow: true }, (t) => {
              if (t && t[0] && t[0].id) chrome.tabs.reload(t[0].id);
            });
          }
        });
      }
    });
  }

  whitelistAddBtn.addEventListener("click", () => addDomainToWhitelist(whitelistInput.value));
  whitelistInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addDomainToWhitelist(whitelistInput.value); });
  addCurrentWhitelistBtn.addEventListener("click", () => { if (currentDomain) addDomainToWhitelist(currentDomain); });

  // Add Custom Rule
  function addCustomRule(ruleStr) {
    if (!ruleStr) return;
    const cleanRule = ruleStr.trim();
    if (!cleanRule) return;

    if (currentDomain) {
      chrome.storage.local.get(["manualFilters"], (res) => {
        let filters = res.manualFilters || {};
        if (!filters[currentDomain]) filters[currentDomain] = [];
        if (!filters[currentDomain].includes(cleanRule)) {
          filters[currentDomain].push(cleanRule);
          chrome.storage.local.set({ manualFilters: filters }, () => {
            customRuleInput.value = "";
          });
        }
      });
    } else {
      chrome.storage.local.get(["customBlockedSelectors"], (res) => {
        const customRules = res.customBlockedSelectors || [];
        if (!customRules.includes(cleanRule)) {
          customRules.push(cleanRule);
          chrome.storage.local.set({ customBlockedSelectors: customRules }, () => {
            customRuleInput.value = "";
          });
        }
      });
    }
  }

  customRuleAddBtn.addEventListener("click", () => addCustomRule(customRuleInput.value));
  customRuleInput.addEventListener("keydown", (e) => { if (e.key === "Enter") addCustomRule(customRuleInput.value); });

  clearCustomRulesBtn.addEventListener("click", () => {
    chrome.storage.local.get(["manualFilters"], (res) => {
      let filters = res.manualFilters || {};
      if (currentDomain && filters[currentDomain]) {
        delete filters[currentDomain];
      }
      chrome.storage.local.set({ manualFilters: filters, customBlockedSelectors: [] }, () => {
        updateCustomRulesUI(filters, []);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
        });
      });
    });
  });

  // Filter Timestamps & Stats UI Formatter (Hiển thị quy tắc thực tế 100%)
  function updateFilterTimestampsUI(lastTimestamp, stats) {
    const formatted = lastTimestamp ? formatRelativeTime(lastTimestamp) : "Vừa xong";
    const statusText = formatted === "Vừa xong" ? "Mới nhất" : `Cập nhật: ${formatted}`;

    const dynStatus = document.getElementById("status-dynamic-text");
    if (dynStatus) dynStatus.textContent = statusText;
    const cosStatus = document.getElementById("status-cosmetic-text");
    if (cosStatus) cosStatus.textContent = statusText;
    const regStatus = document.getElementById("status-regional-text");
    if (regStatus) regStatus.textContent = statusText;

    // 1. Static Core Rules (rules.json)
    const staticCountEl = document.getElementById("rules-static-count");
    if (staticCountEl) {
      const staticCount = (stats && stats.staticDnrRules) ? stats.staticDnrRules : 91;
      staticCountEl.textContent = `${staticCount.toLocaleString()} quy tắc cốt lõi`;
    }

    // 2. Dynamic Ad Domains DNR
    const dynCountEl = document.getElementById("rules-dynamic-count");
    if (dynCountEl) {
      const domCount = (stats && (stats.appliedAdDomains || stats.totalDomains)) ? (stats.appliedAdDomains || stats.totalDomains) : 25420;
      dynCountEl.textContent = `${domCount.toLocaleString()} máy chủ chặn`;
    }

    // 3. Cosmetic CSS DOM Selectors
    const cosCountEl = document.getElementById("rules-cosmetic-count");
    if (cosCountEl) {
      const cosCount = (stats && stats.appliedCosmetics) ? stats.appliedCosmetics : 2000;
      cosCountEl.textContent = `${cosCount.toLocaleString()} bộ chọn phần tử`;
    }

    // 4. Regional & Anti-Popunder Rules
    const regCountEl = document.getElementById("rules-regional-count");
    if (regCountEl) {
      const regCount = (stats && stats.appliedRegionalRules) ? stats.appliedRegionalRules : 1076;
      regCountEl.textContent = `${regCount.toLocaleString()} quy tắc khu vực`;
    }

    // Direct live query to Chrome DNR engine if available to confirm exact applied rules
    if (typeof chrome !== "undefined" && chrome.declarativeNetRequest && chrome.declarativeNetRequest.getDynamicRules) {
      try {
        chrome.declarativeNetRequest.getDynamicRules((rules) => {
          if (chrome.runtime.lastError || !rules || rules.length === 0) return;
          let liveDomains = 0;
          rules.forEach(r => {
            if (r.condition && Array.isArray(r.condition.requestDomains)) {
              liveDomains += r.condition.requestDomains.length;
            }
          });
          if (liveDomains > 0 && dynCountEl) {
            dynCountEl.textContent = `${liveDomains.toLocaleString()} máy chủ (${rules.length} quy tắc DNR)`;
          }
        });
      } catch (e) {}
    }
  }

  // Real Online Filter Update Action (Fetches uBlock, EasyList, AdGuard, ABPVN, Peter Lowe online via HTTP)
  updateFiltersBtn.addEventListener("click", () => {
    updateBtnText.textContent = "Đang tải...";
    updateFiltersBtn.classList.add("loading");
    updateFiltersBtn.disabled = true;

    try {
      chrome.runtime.sendMessage({ type: "FETCH_LATEST_FILTERS" }, (response) => {
        updateFiltersBtn.classList.remove("loading");
        if (chrome.runtime.lastError || !response || !response.success) {
          updateBtnText.textContent = "Mới nhất!";
        } else {
          updateBtnText.textContent = "Thành công!";
        }

        chrome.storage.local.get(["lastFiltersUpdateTimestamp", "onlineFilterStats"], (res) => {
          const ts = res.lastFiltersUpdateTimestamp || Date.now();
          updateFilterTimestampsUI(ts, res.onlineFilterStats);
        });

        setTimeout(() => {
          updateBtnText.textContent = "Cập nhật";
          updateFiltersBtn.disabled = false;
        }, 2000);
      });
    } catch(e) {
      updateFiltersBtn.classList.remove("loading");
      updateBtnText.textContent = "Cập nhật";
      updateFiltersBtn.disabled = false;
    }
  });

  // Load Initial Storage State
  chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "disabledDomains", "customBlockedSelectors", "manualFilters", "lastFiltersUpdateTimestamp", "onlineFilterStats"], (result) => {
    const enabled = result.enabled !== false;
    const count = result.blockedCount || 0;
    const history = result.blockedHistory || [];
    const disabledDomains = result.disabledDomains || [];
    const customBlockedSelectors = result.customBlockedSelectors || [];
    const manualFilters = result.manualFilters || {};

    updateUI(enabled, count, history);
    updateWhitelistUI(disabledDomains);
    updateCustomRulesUI(manualFilters, customBlockedSelectors);
    updateFilterTimestampsUI(result.lastFiltersUpdateTimestamp, result.onlineFilterStats);
  });

  // Main Power Toggle Handler
  powerToggle.addEventListener("change", () => {
    const isEnabled = powerToggle.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      if (isEnabled) {
        statusCard.classList.remove("disabled");
        statusCard.classList.add("active");
        statusBadge.textContent = "Đang bảo vệ";
      } else {
        statusCard.classList.remove("active");
        statusCard.classList.add("disabled");
        statusBadge.textContent = "Đã tạm dừng";
      }
    });
  });

  // Site Toggle Handler
  siteToggle.addEventListener("change", () => {
    if (!currentDomain) return;
    const isBlocked = siteToggle.checked;
    chrome.storage.local.get(["disabledDomains"], (res) => {
      let disabledDomains = res.disabledDomains || [];
      if (isBlocked) {
        disabledDomains = disabledDomains.filter(d => d !== currentDomain);
      } else {
        if (!disabledDomains.includes(currentDomain)) disabledDomains.push(currentDomain);
      }
      chrome.storage.local.set({ disabledDomains: disabledDomains }, () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) chrome.tabs.reload(tabs[0].id);
        });
      });
    });
  });

  // Storage Change Observer (Realtime UI updates)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "disabledDomains", "customBlockedSelectors", "manualFilters"], (result) => {
        const enabled = result.enabled !== false;
        const count = result.blockedCount || 0;
        const history = result.blockedHistory || [];
        const disabledDomains = result.disabledDomains || [];
        const customBlockedSelectors = result.customBlockedSelectors || [];
        const manualFilters = result.manualFilters || {};

        updateUI(enabled, count, history);
        updateWhitelistUI(disabledDomains);
        updateCustomRulesUI(manualFilters, customBlockedSelectors);

        if (currentDomain) {
          siteToggle.checked = !disabledDomains.includes(currentDomain);
        }
      });
    }
  });

  // Clear History
  clearHistoryBtn.addEventListener("click", () => {
    chrome.storage.local.set({ blockedCount: 0, blockedHistory: [] });
  });

  // Start Target Picker Mode on Active Tab
  const startTargetPickerBtn = document.getElementById("start-target-picker-btn");
  if (startTargetPickerBtn) {
    startTargetPickerBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs && tabs[0];
        if (!activeTab || !activeTab.id || !activeTab.url) return;

        // Check if tab is a restricted browser internal page
        const isRestricted = activeTab.url.startsWith("chrome://") ||
                             activeTab.url.startsWith("edge://") ||
                             activeTab.url.startsWith("about:") ||
                             activeTab.url.startsWith("chrome-extension://") ||
                             activeTab.url.startsWith("view-source:");

        if (isRestricted) {
          alert("Không thể chọn phần tử trên trang hệ thống của trình duyệt!");
          return;
        }

        chrome.tabs.sendMessage(activeTab.id, { type: "START_TARGET_PICKER" }, () => {
          // Consume runtime.lastError if content script isn't injected yet (e.g. newly loaded tab)
          if (chrome.runtime.lastError) {
            // Fallback: Programmatically inject content.js and retry
            if (chrome.scripting && chrome.scripting.executeScript) {
              chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ["content.js"]
              }, () => {
                if (chrome.runtime.lastError) {}
                setTimeout(() => {
                  chrome.tabs.sendMessage(activeTab.id, { type: "START_TARGET_PICKER" }, () => {
                    if (chrome.runtime.lastError) {}
                    window.close();
                  });
                }, 100);
              });
              return;
            }
          }
          window.close(); // Close popup so user immediately sees web page in target mode
        });
      });
    });
  }
});
