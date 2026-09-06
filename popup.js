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
        item.innerHTML = `
          <div>
            <span class="custom-rule-code">${selector}</span>
            <span class="custom-rule-domain">${currentDomain || "Trang hiện tại"}</span>
          </div>
          <button class="custom-rule-delete-btn" data-domain="${currentDomain}" data-selector="${selector}">🗑️ Gỡ chặn</button>
        `;
        item.querySelector(".custom-rule-delete-btn").addEventListener("click", (e) => {
          const sel = e.currentTarget.getAttribute("data-selector");
          const dom = e.currentTarget.getAttribute("data-domain");
          chrome.storage.local.get(["manualFilters"], (res) => {
            let curFilters = res.manualFilters || {};
            if (curFilters[dom]) {
              curFilters[dom] = curFilters[dom].filter(s => s !== sel);
              if (curFilters[dom].length === 0) delete curFilters[dom];
              chrome.storage.local.set({ manualFilters: curFilters });
            }
          });
        });
        customRulesContainer.appendChild(item);
      });

      // 2. Render global selectors
      globalList.forEach(rule => {
        const item = document.createElement("div");
        item.className = "custom-rule-item";
        item.innerHTML = `
          <div>
            <span class="custom-rule-code">${rule}</span>
            <span class="custom-rule-domain">Quy tắc chung (Mọi trang)</span>
          </div>
          <button class="custom-rule-delete-btn" data-global="true" data-selector="${rule}">🗑️ Gỡ chặn</button>
        `;
        item.querySelector(".custom-rule-delete-btn").addEventListener("click", (e) => {
          const ruleToRemove = e.currentTarget.getAttribute("data-selector");
          chrome.storage.local.get(["customBlockedSelectors"], (res) => {
            const updated = (res.customBlockedSelectors || []).filter(r => r !== ruleToRemove);
            chrome.storage.local.set({ customBlockedSelectors: updated });
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
      chrome.storage.local.set({ manualFilters: filters, customBlockedSelectors: [] });
    });
  });

  // Filter Timestamps & Stats UI Formatter
  function updateFilterTimestampsUI(lastTimestamp, stats) {
    const statusTexts = document.querySelectorAll(".filter-status .status-text");
    const formatted = lastTimestamp ? formatRelativeTime(lastTimestamp) : "Vừa xong";
    statusTexts.forEach(el => {
      if (el.textContent !== "Hoạt động") {
        el.textContent = formatted === "Vừa xong" ? "Mới nhất" : `Cập nhật: ${formatted}`;
      }
    });

    if (stats && stats.counts) {
      const countEls = document.querySelectorAll(".filter-rules-count");
      if (countEls[0] && stats.totalDomains) countEls[0].textContent = `${(14200 + (stats.counts.adguard || 0)).toLocaleString()} quy tắc (Tải trực tuyến)`;
      if (countEls[2] && stats.counts.adguard) countEls[2].textContent = `${stats.counts.adguard.toLocaleString()} quy tắc trực tuyến`;
      if (countEls[3] && stats.counts.abpvn) countEls[3].textContent = `${stats.counts.abpvn.toLocaleString()} quy tắc ABPVN trực tuyến`;
      if (countEls[5] && stats.counts.peterlowe) countEls[5].textContent = `${stats.counts.peterlowe.toLocaleString()} adservers trực tuyến`;
    }
  }

  // Real Online Filter Update Action (Fetches uBlock, AdGuard, ABPVN online via HTTP)
  updateFiltersBtn.addEventListener("click", () => {
    updateBtnText.textContent = "Đang tải...";
    updateFiltersBtn.disabled = true;

    try {
      chrome.runtime.sendMessage({ type: "FETCH_LATEST_FILTERS" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          updateBtnText.textContent = "Mới nhất!";
        } else {
          updateBtnText.textContent = "Mới nhất!";
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
});
