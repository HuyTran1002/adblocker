// Adblock Max - Heuristic AI Learning Engine
// Tự động phân tích DOM, nhận diện quảng cáo thông minh bằng điểm số, và tự học quy tắc CSS.

(function() {
    // Không chạy trên YouTube (đã có module chuyên dụng)
    if (window.location.hostname.includes('youtube.com')) return;

    let learnedSelectors = [];
    let aiStyleElement = null;

    // Load các quy tắc đã học từ trước
    chrome.storage.local.get(['learnedRules'], (result) => {
        if (result.learnedRules && Array.isArray(result.learnedRules)) {
            learnedSelectors = result.learnedRules;
            applyLearnedRules();
        }
    });

    function applyLearnedRules() {
        if (!aiStyleElement) {
            aiStyleElement = document.createElement('style');
            aiStyleElement.id = 'adblock-max-ai-rules';
            if (document.head) {
                document.head.appendChild(aiStyleElement);
            } else {
                document.documentElement.appendChild(aiStyleElement);
            }
        }
        if (learnedSelectors.length > 0) {
            aiStyleElement.textContent = learnedSelectors.join(', ') + ' { display: none !important; z-index: -1 !important; height: 0 !important; }';
        }
    }

    function saveLearnedRule(selector) {
        if (!learnedSelectors.includes(selector)) {
            learnedSelectors.push(selector);
            applyLearnedRules();
            chrome.storage.local.set({ learnedRules: learnedSelectors });
            console.log('[Adblock Max AI] Learned new ad pattern:', selector);
        }
    }

    // Heuristic Scoring
    function calculateAdScore(el) {
        let score = 0;
        
        // 1. Phân tích nội dung văn bản (đối với div chứa chữ quảng cáo)
        const text = (el.innerText || '').toLowerCase();
        if (text.includes('sponsored') || text.includes('quảng cáo') || text.includes('ads by')) {
            if (text.length < 50) score += 40; // Rất có thể là nhãn quảng cáo
        }

        // 2. Phân tích thuộc tính (id, class)
        const id = (el.id || '').toLowerCase();
        const className = (typeof el.className === 'string' ? el.className : '').toLowerCase();
        
        const adKeywords = ['banner', 'sponsor', 'advert', 'promo', 'popunder', 'popup', 'taboola', 'outbrain', 'mgid'];
        
        for (const kw of adKeywords) {
            if (id.includes(kw)) score += 30;
            if (className.includes(kw)) score += 30;
        }

        // 3. Phân tích iframe lạ (thường là quảng cáo Google/bên thứ 3)
        if (el.tagName === 'IFRAME') {
            const src = (el.src || '').toLowerCase();
            if (src.includes('doubleclick') || src.includes('googlesyndication') || src.includes('adsystem') || src.includes('adnxs')) {
                score += 80;
            }
            // Iframe không có nguồn rõ ràng, kích thước phổ biến của quảng cáo
            const width = el.offsetWidth;
            const height = el.offsetHeight;
            if ((width === 300 && height === 250) || (width === 728 && height === 90) || (width === 160 && height === 600)) {
                score += 40;
            }
        }

        // 4. Phân tích phong cách hiển thị (Floating ads, overlay)
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'absolute') {
            const zIndex = parseInt(style.zIndex, 10);
            if (!isNaN(zIndex) && zIndex > 9000) {
                score += 40; // Overlay che khuất màn hình
            }
            if (el.tagName === 'A' && el.target === '_blank' && el.offsetWidth > window.innerWidth * 0.8 && el.offsetHeight > window.innerHeight * 0.8) {
                score += 100; // Click-jacking overlay (quảng cáo ẩn toàn màn hình)
            }
        }

        return score;
    }

    // Tạo CSS Selector tổng quát từ một element
    function generateSelector(el) {
        if (el.id && !/\\d/.test(el.id)) { // Bỏ qua id có số (thường là id sinh tự động)
            return '#' + el.id;
        }
        if (el.className && typeof el.className === 'string') {
            const classes = el.className.split('\\\\s+').filter(c => c && !/\\d/.test(c) && c.length > 3);
            if (classes.length > 0) {
                return el.tagName.toLowerCase() + '.' + classes.join('.');
            }
        }
        
        // Fallback: Lấy path theo cấu trúc
        let path = [];
        let currentEl = el;
        while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE && path.length < 3) {
            let selector = currentEl.nodeName.toLowerCase();
            if (currentEl.id && !/\\d/.test(currentEl.id)) {
                selector += '#' + currentEl.id;
                path.unshift(selector);
                break;
            } else {
                let sib = currentEl, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector) nth++;
                }
                if (nth != 1) selector += ":nth-of-type("+nth+")";
            }
            path.unshift(selector);
            currentEl = currentEl.parentNode;
        }
        return path.join(" > ");
    }

    // AI Scanner
    function scanAndLearn(nodes) {
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Bỏ qua các thẻ an toàn
                if (['SCRIPT', 'STYLE', 'LINK', 'META', 'HEAD', 'BODY', 'HTML'].includes(node.tagName)) continue;

                const score = calculateAdScore(node);
                if (score >= 100) {
                    const selector = generateSelector(node);
                    if (selector && selector !== 'body' && selector !== 'html') {
                        node.style.setProperty('display', 'none', 'important');
                        saveLearnedRule(selector);
                    }
                } else if (node.children && node.children.length > 0) {
                    scanAndLearn(node.children); // Đệ quy duyệt con
                }
            }
        }
    }

    // Chạy AI khi trang web thay đổi
    const observer = new MutationObserver((mutations) => {
        let addedNodes = [];
        mutations.forEach(m => {
            if (m.addedNodes.length) {
                m.addedNodes.forEach(n => addedNodes.push(n));
            }
        });
        if (addedNodes.length > 0) {
            // Dùng requestAnimationFrame để không làm lag trình duyệt
            requestAnimationFrame(() => {
                scanAndLearn(addedNodes);
            });
        }
    });

    // Bắt đầu quét khi DOM sẵn sàng
    if (document.body) {
        scanAndLearn([document.body]);
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            scanAndLearn([document.body]);
            observer.observe(document.body, { childList: true, subtree: true });
        });
    }

    console.log('[Adblock Max AI] Heuristic Engine Active.');
})();
