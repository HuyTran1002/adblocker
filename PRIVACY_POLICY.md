# Privacy Policy for WebShield Extension

**Last updated:** September 11, 2026

WebShield ("the Extension", "we", "us", or "our") is committed to protecting your privacy. This Privacy Policy outlines our data handling practices and explains how our extension functions with respect to your information.

---

### 1. No Data Collection or Tracking

WebShield operates under a strict **Zero Data Collection** policy:
- **No Personal Information:** We do not collect, store, transmit, or sell any personally identifiable information (such as your name, email, address, phone number, IP address, or device identifiers).
- **No Browsing History:** We do not record, monitor, or transmit your browsing history, URLs visited, search queries, downloads, or web traffic.
- **No External Analytics:** WebShield does not integrate any third-party analytics SDKs, trackers, or telemetry beacons. No telemetry or network logs are ever sent to external servers.

---

### 2. Permissions and Technical Operation

WebShield processes network requests and web content entirely on your local device. Below is an explanation of the permissions requested by the Extension and why they are necessary:

#### a. `declarativeNetRequest`
- **Purpose:** Used strictly to match and filter unwanted network requests (such as pop-up and pop-under redirect scripts) against a local, static rule list (`rules.json`).
- **Data handling:** Matching occurs locally and privately within the browser's native network engine. WebShield cannot view, inspect, or intercept the content of your encrypted traffic.

#### b. `storage`
- **Purpose:** Used solely on your local device to save your personal preferences (such as enabling/disabling filtering, saving whitelisted websites, or custom domain element rules you have created).
- **Data handling:** All preference data stays strictly in your browser's local storage (`chrome.storage.local`) and is never synchronized to external servers.

#### c. Host Permissions (`*://*/*`) & Content Scripts
- **Purpose:** Required to inject content scripts (`content.js` and `inject.js`) into web pages to prevent automatic clickjacking, unwanted window pop-ups/pop-unders, and to allow the interactive element picker when initiated by the user.
- **Data handling:** Content scripts run locally in your browser to evaluate DOM elements. No page content is exported or sent elsewhere.

#### d. `contextMenus` and `activeTab`
- **Purpose:** Enables the right-click menu action ("Chặn phần tử này...") so you can select and hide an unwanted element on the current active tab.
- **Data handling:** Access is ephemeral and only triggered upon explicit user action.

#### e. `alarms`
- **Purpose:** Used internally to periodically schedule offline cleanups and local cache housekeeping.

---

### 3. Third-Party Sharing and Disclosure

Because WebShield does not collect or store any user data, **we do not sell, trade, rent, or share any information with third parties under any circumstances**.

---

### 4. Changes to This Privacy Policy

If we update this Privacy Policy to reflect future browser requirements or feature updates, the updated policy will be published directly at this URL with a revised "Last updated" date.

---

### 5. Contact Information

If you have questions, feedback, or concerns regarding this Privacy Policy or WebShield, please contact us at:

- **Developer:** HuyTran1002
- **Email:** huytran1002.dev@gmail.com
- **Project Repository:** https://github.com/HuyTran1002/adblocker
