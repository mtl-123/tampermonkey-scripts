// ==UserScript==
// @name         搜索结果强制屏蔽 CSDN 与广告
// @namespace    http://tampermonkey.net/
// @version      3.3.0
// @description  持续隐藏命中的 CSDN 结果和推广，分类显示数量
// @match        *://*/*
// @noframes
// @run-at       document-start
// @grant        GM_addStyle
// ==/UserScript==

(() => {
    'use strict';

    // 自建 SearXNG 填主机名，不含协议和端口。
    const searxHosts = [];
    const blockedDomains = ['csdn.net'];
    const hostname = location.hostname.toLowerCase().replace(/\.$/, '');

    const profiles = [
        {
            id: 'google',
            host: /^(?:www\.)?google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/,
            root: '#search, #rso',
            cards: '.g, .MjjYud, [data-snhf]',
            titles: 'h3',
            source: '.VuuXrf, .tjvcx',
            ads: '#tads, #tadsb, #bottomads, #taw [data-text-ad], #rhs [data-text-ad]'
        },
        {
            id: 'bing',
            host: /(?:^|\.)bing\.com$/,
            root: '#b_results',
            cards: 'li.b_algo',
            titles: 'h2',
            source: '.b_attribution',
            ads: '#b_results > li.b_ad, #b_context .b_ad, #b_results > li[data-tag="ads"]'
        },
        {
            id: 'baidu',
            host: /(?:^|\.)baidu\.com$/,
            root: '#content_left',
            cards: '.result, .result-op, .c-container',
            titles: 'h3, a.result-title',
            source: '.c-showurl, [class*="site-name"], [class*="siteName"], [class*="c-source"], [class*="source-name"]',
            ads: '#content_left > [data-tuiguang], #content_left > [data-cmatchid], #content_right [data-tuiguang]'
        },
        {
            id: 'duckduckgo',
            host: /(?:^|\.)duckduckgo\.com$/,
            root: '#links, #react-layout, main',
            cards: 'article[data-testid="result"], li[data-layout="organic"], .result.results_links',
            titles: 'a[data-testid="result-title-a"], h2, a.result__a',
            ads: '[data-layout="ad"], article[data-testid="ad"], .result--ad'
        },
        {
            id: 'brave',
            host: /^search\.brave\.com$/,
            root: '#results',
            cards: '.snippet[data-type="web"], [data-type="webResult"], [data-pos] .snippet',
            titles: 'a.heading-serpresult, h2, h3',
            ads: '#results [data-type="ad"], #results [data-type="adResult"]'
        },
        {
            id: 'startpage',
            host: /(?:^|\.)startpage\.com$/,
            root: 'main, #main',
            cards: '.w-gl__result, .result',
            titles: 'a.w-gl__result-title, h2, h3',
            ads: '.w-gl__ad'
        },
        {
            id: 'yandex',
            host: /(?:^|\.)yandex\.(?:com|ru|by|kz|uz|com\.tr)$/,
            root: '.serp-list, #search-result',
            cards: 'li.serp-item',
            titles: 'a.OrganicTitle-Link, h2, h3',
            ads: 'li.serp-item[data-fast-name="adv"]'
        },
        {
            id: 'so',
            host: /(?:^|\.)so\.com$/,
            root: '#main',
            cards: '.res-list, .res-list-item',
            titles: 'h3',
            source: '.res-linkinfo',
            ads: '#main [data-tuiguang]'
        },
        {
            id: 'sogou',
            host: /(?:^|\.)sogou\.com$/,
            root: '#main',
            cards: '.vrwrap, .rb, .results > div',
            titles: 'h3, a.vr-title',
            source: '.citeurl',
            ads: '#main [data-tuiguang]'
        },
        {
            id: 'kagi',
            host: /(?:^|\.)kagi\.com$/,
            root: 'main, #searchForm ~ div, #search-results',
            cards: '._0_SRI, .search-result',
            titles: 'a.__sri_title_link, h2, h3'
        },
        {
            id: 'ecosia',
            host: /(?:^|\.)ecosia\.org$/,
            root: 'main, #main',
            cards: 'article.result, div.result, [data-test-id="web-result"]',
            titles: 'a.result__link, h2, h3',
            ads: '[data-test-id="ad-result"]'
        },
        {
            id: 'yahoo',
            host: /(?:^|\.)search\.yahoo\.com$/,
            root: '#web',
            cards: '.algo',
            titles: 'h3, a.ac-algo',
            ads: '#web .dd.ad, #web .ads'
        },
        {
            id: 'searx',
            host: /(?:^|[.-])searx(?:ng)?(?:[.-]|$)/,
            root: '#urls',
            cards: 'article.result, .result',
            titles: 'h3, h4'
        }
    ];

    const configuredSearx = searxHosts.includes(hostname);
    const profile = profiles.find(entry => configuredSearx
        ? entry.id === 'searx'
        : entry.host.test(hostname));
    if (!profile) return;

    const hiddenClass = 'tm-search-cleaner-hidden-v33';
    const statusId = 'tm-search-cleaner-status-v33';
    const sourceSelector = ['cite', '[data-testid="result-extras-url-link"]', profile.source]
        .filter(Boolean).join(', ');
    const adMarker = [
        '[data-text-ad]', '[data-tuiguang]', '[data-cmatchid]',
        '[data-testid="ad-label"]', '[data-testid="sponsored-label"]'
    ].join(', ');
    const adLabels = new Set([
        '广告', '推广', '赞助', '赞助商广告', '商业推广', '广告推广', '赞助广告',
        '廣告', '贊助', '贊助商廣告', 'ad', 'ads', 'sponsored', 'promoted',
        'advertisement', 'sponsored result', 'sponsored results',
        'anzeige', 'annonce', 'publicité', 'реклама', '広告'
    ]);
    const watchedAttributes = [
        'class', 'id', 'href', 'aria-label', 'data-url', 'data-landurl', 'mu',
        'data-text-ad', 'data-tuiguang', 'data-cmatchid', 'data-layout', 'data-testid',
        'data-test-id', 'data-type', 'data-tag', 'data-fast-name', 'data-snhf', 'data-pos'
    ];

    GM_addStyle(`
        .${hiddenClass} { display: none !important; }
        #${statusId} {
            position: fixed;
            right: 16px;
            bottom: 16px;
            z-index: 2147483647;
            padding: 8px 12px;
            border: 1px solid #475569;
            border-radius: 8px;
            background: #111827;
            color: #fff;
            font: 13px/1.4 system-ui, sans-serif;
            pointer-events: none;
        }
    `);

    let tracked = new Map();
    let status = null;
    let timer = null;

    function matchesDomain(host, domain) {
        const normalized = host.toLowerCase().replace(/\.$/, '');
        return normalized === domain || normalized.endsWith(`.${domain}`);
    }

    function isBlockedHost(host) {
        return blockedDomains.some(domain => matchesDomain(host, domain));
    }

    function parseHttp(value) {
        if (!value) return null;
        try {
            const url = new URL(value, location.href);
            return /^https?:$/.test(url.protocol) ? url : null;
        } catch {
            return null;
        }
    }

    function resultTargets(link) {
        const url = parseHttp(link.getAttribute('href'));
        const targets = url ? [url] : [];
        const ownHost = url && (url.hostname === hostname || profile.host.test(url.hostname));

        if (ownHost) {
            const params = url.searchParams;
            let target;
            switch (profile.id) {
                case 'google':
                    if (url.pathname === '/url') target = params.get('q') || params.get('url');
                    break;
                case 'bing':
                    if (url.pathname === '/ck/a') {
                        target = params.get('u');
                        if (target?.startsWith('a1')) {
                            try {
                                target = atob(target.slice(2).replace(/-/g, '+').replace(/_/g, '/'));
                            } catch {
                                target = null;
                            }
                        }
                    }
                    break;
                case 'duckduckgo':
                    if (/^\/l\/?$/.test(url.pathname)) target = params.get('uddg');
                    break;
                case 'startpage':
                    if (/^\/(?:do|sp)\//.test(url.pathname)) target = params.get('url');
                    break;
            }
            const resolved = parseHttp(target);
            if (resolved) targets.push(resolved);
        }

        if (url && profile.id === 'yahoo' && matchesDomain(url.hostname, 'search.yahoo.com')) {
            const encoded = url.pathname.match(/(?:^|\/)RU=([^/]+)/)?.[1];
            if (encoded) {
                try {
                    const target = parseHttp(decodeURIComponent(encoded));
                    if (target) targets.push(target);
                } catch {
                    // 跳转参数不完整时继续检查来源栏。
                }
            }
        }

        return targets;
    }

    function blockedSource(card) {
        for (const source of card.querySelectorAll(sourceSelector)) {
            const text = source.textContent.replace(/\s+/g, ' ').trim();
            if (/^CSDN(?:\s*博客)?(?:$|\s*[·|›»>：:\-–—])/.test(text.toUpperCase())) return true;

            // 读取完整域名后再比较，保留 csdn.net.example.org 等其他站点。
            const domain = text.match(
                /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z0-9-]+\.?)(?=$|[\s/:›»>])/i
            )?.[1];
            if (domain && isBlockedHost(domain)) return true;
        }

        return false;
    }

    function blockedCard(card, titleLinks) {
        const mainLink = titleLinks[0];
        if (mainLink && resultTargets(mainLink).some(url => isBlockedHost(url.hostname))) return true;

        // 百度等站点的真实目的地可能存放在卡片或标题链接的属性里。
        for (const element of [card, mainLink].filter(Boolean)) {
            for (const name of ['mu', 'data-landurl', 'data-url']) {
                const target = parseHttp(element.getAttribute(name));
                if (target && isBlockedHost(target.hostname)) return true;
            }
        }

        return blockedSource(card);
    }

    function adCard(card) {
        if (card.matches(adMarker) || card.querySelector(adMarker)) return true;

        for (const node of card.querySelectorAll('span, small, label, em, [aria-label]')) {
            if (node.closest('a, h1, h2, h3, h4, p, button')) continue;
            const label = (node.getAttribute('aria-label') || node.textContent)
                .trim().toLowerCase().replace(/^[【[(（]+|[】\])）]+$/g, '').trim();
            if (adLabels.has(label) && (
                node.parentElement === card || node.parentElement.textContent.trim().length <= 100
            )) return true;
        }

        return false;
    }

    function findTitleLinks(card) {
        const links = new Set();
        for (const title of card.querySelectorAll(profile.titles)) {
            const link = title.closest('a[href]') || title.querySelector('a[href]');
            if (link && card.contains(link)) links.add(link);
        }

        return [...links];
    }

    function updateStatus() {
        if (!document.body) return;
        if (!tracked.size) {
            status?.remove();
            status = null;
            return;
        }

        if (!status?.isConnected) {
            status = document.createElement('div');
            status.id = statusId;
            status.setAttribute('role', 'status');
            document.body.append(status);
        }

        const csdn = [...tracked.values()].filter(type => type === 'csdn').length;
        const label = `已屏蔽 ${csdn} 条 CSDN 结果 · ${tracked.size - csdn} 个广告单元`;
        if (status.textContent !== label) status.textContent = label;
    }

    function scan() {
        const next = new Map();
        if (profile.ads) {
            for (const ad of document.querySelectorAll(profile.ads)) next.set(ad, 'ad');
        }

        const cards = new Map();
        for (const card of document.querySelectorAll(profile.cards)) {
            if (!card.closest(profile.root)) continue;
            const links = findTitleLinks(card);
            if (links.length || !card.querySelector(profile.cards)) cards.set(card, links);
        }

        for (const [card, links] of cards) {
            // 多个嵌套容器可能属于同一条结果，以主标题链接区分。
            const innerLinks = new Set();
            for (const child of card.querySelectorAll(profile.cards)) {
                const primaryLink = cards.get(child)?.[0];
                if (primaryLink) innerLinks.add(primaryLink);
            }
            if (innerLinks.size > 1 || (innerLinks.size === 1 && !innerLinks.has(links[0]))) continue;
            if (next.has(card)) continue;
            if (blockedCard(card, links)) next.set(card, 'csdn');
            else if (adCard(card)) next.set(card, 'ad');
        }

        for (const element of next.keys()) {
            for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                if (next.has(parent)) {
                    next.delete(element);
                    break;
                }
            }
        }

        for (const element of tracked.keys()) {
            if (!next.has(element)) element.classList.remove(hiddenClass);
        }
        for (const element of next.keys()) element.classList.add(hiddenClass);
        tracked = next;
        updateStatus();
    }

    function schedule() {
        if (timer !== null) return;
        timer = setTimeout(() => {
            timer = null;
            scan();
        }, 70);
    }

    function isStatusNode(node) {
        return node === status || node.parentElement?.id === statusId || node.id === statusId;
    }

    function isOwnClassChange(record) {
        if (record.type !== 'attributes' || record.attributeName !== 'class') return false;
        const oldTokens = (record.oldValue || '').split(/\s+/).filter(Boolean);
        if (oldTokens.includes(hiddenClass) || !record.target.classList.contains(hiddenClass)) return false;
        const currentTokens = [...record.target.classList].filter(token => token !== hiddenClass);
        return oldTokens.join(' ') === currentTokens.join(' ');
    }

    new MutationObserver(records => {
        if (records.some(record => {
            if (isStatusNode(record.target) || isOwnClassChange(record)) return false;
            return record.type !== 'childList' ||
                [...record.addedNodes, ...record.removedNodes].some(node => !isStatusNode(node));
        })) schedule();
    }).observe(document, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: watchedAttributes
    });

    window.addEventListener('pageshow', schedule);
    scan();
})();
