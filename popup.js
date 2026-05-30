document.addEventListener("DOMContentLoaded", () => {
  const powerToggle = document.getElementById("power-toggle");
  const statusCard = document.getElementById("status-card");
  const statusBadge = document.getElementById("status-badge");
  const blockedCountEl = document.getElementById("blocked-count");
  const historyList = document.getElementById("history-list");
  const emptyState = document.getElementById("empty-state");
  const clearHistoryBtn = document.getElementById("clear-history-btn");
  const siteToggle = document.getElementById("site-toggle");
  const siteToggleLabel = document.getElementById("site-toggle-label");

  let currentCount = 0;
  let currentDomain = "";

  // Format relative time in Vietnamese
  function formatRelativeTime(timestamp) {
    const diffMs = Date.now() - timestamp;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 10) {
      return "Vừa xong";
    } else if (diffSecs < 60) {
      return `${diffSecs} giây trước`;
    } else if (diffMins < 60) {
      return `${diffMins} phút trước`;
    } else if (diffHours < 24) {
      return `${diffHours} giờ trước`;
    } else {
      const date = new Date(timestamp);
      return date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Update popup UI elements based on state
  function updateUI(enabled, count, history) {
    // 1. Update toggle & status card
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

    // 2. Update count with a subtle pulse animation if changed
    if (count !== currentCount) {
      blockedCountEl.textContent = count;
      blockedCountEl.classList.add("pulse");
      setTimeout(() => {
        blockedCountEl.classList.remove("pulse");
      }, 200);
      currentCount = count;
    }

    // 3. Update history list
    // Clear dynamic items, keeping emptyState template
    const items = historyList.querySelectorAll(".history-item");
    items.forEach(el => el.remove());

    if (!history || history.length === 0) {
      emptyState.style.display = "flex";
    } else {
      emptyState.style.display = "none";
      
      history.forEach(item => {
        const itemEl = document.createElement("div");
        itemEl.className = "history-item";
        
        // Clean URL to show just domain or neat text
        let displayUrl = item.url;
        if (displayUrl.startsWith("http")) {
          try {
            const urlObj = new URL(displayUrl);
            displayUrl = urlObj.hostname + urlObj.pathname;
            if (displayUrl.length > 35) displayUrl = displayUrl.substring(0, 35) + "...";
          } catch(e) {}
        }

        itemEl.innerHTML = `
          <div class="history-details">
            <span class="history-domain">${item.domain}</span>
            <span class="history-url" title="${item.url}">${displayUrl}</span>
          </div>
          <span class="history-time">${formatRelativeTime(item.timestamp)}</span>
        `;
        
        historyList.appendChild(itemEl);
      });
    }
  }

  // Fetch current active tab domain and initialize site toggle
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      try {
        const urlObj = new URL(tabs[0].url);
        currentDomain = urlObj.hostname;
        siteToggleLabel.textContent = `Chặn trên ${currentDomain}`;
        
        chrome.storage.local.get(["disabledDomains"], (res) => {
          const disabledDomains = res.disabledDomains || [];
          const isSiteBlocked = !disabledDomains.includes(currentDomain);
          siteToggle.checked = isSiteBlocked;
        });
      } catch (e) {
        siteToggleLabel.textContent = "Chặn trên trang này";
        siteToggle.disabled = true;
      }
    } else {
      siteToggle.disabled = true;
    }
  });

  // Load initial state from storage
  chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory"], (result) => {
    const enabled = result.enabled !== false; // default true
    const count = result.blockedCount || 0;
    const history = result.blockedHistory || [];
    updateUI(enabled, count, history);
  });

  // Listen to power toggle change
  powerToggle.addEventListener("change", () => {
    const isEnabled = powerToggle.checked;
    chrome.storage.local.set({ enabled: isEnabled }, () => {
      // Instantly update status card styling
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

  // Listen to site toggle change
  siteToggle.addEventListener("change", () => {
    if (!currentDomain) return;
    const isBlocked = siteToggle.checked;

    chrome.storage.local.get(["disabledDomains"], (res) => {
      let disabledDomains = res.disabledDomains || [];
      if (isBlocked) {
        // Enable blocking (remove domain from disabled list)
        disabledDomains = disabledDomains.filter(d => d !== currentDomain);
      } else {
        // Disable blocking (add domain to disabled list)
        if (!disabledDomains.includes(currentDomain)) {
          disabledDomains.push(currentDomain);
        }
      }
      chrome.storage.local.set({ disabledDomains: disabledDomains }, () => {
        // Reload the current tab to apply changes immediately
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs && tabs[0] && tabs[0].id) {
            chrome.tabs.reload(tabs[0].id);
          }
        });
      });
    });
  });

  // Listen to storage changes (real-time updates)
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      chrome.storage.local.get(["enabled", "blockedCount", "blockedHistory", "disabledDomains"], (result) => {
        const enabled = result.enabled !== false;
        const count = result.blockedCount || 0;
        const history = result.blockedHistory || [];
        updateUI(enabled, count, history);

        if (currentDomain) {
          const disabledDomains = result.disabledDomains || [];
          const isSiteBlocked = !disabledDomains.includes(currentDomain);
          siteToggle.checked = isSiteBlocked;
        }
      });
    }
  });

  // Clear history and counter
  clearHistoryBtn.addEventListener("click", () => {
    chrome.storage.local.set({
      blockedCount: 0,
      blockedHistory: []
    });
  });
});
