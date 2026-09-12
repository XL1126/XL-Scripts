// ==UserScript==
// @name         优化汽水音乐分享页
// @namespace    http://tampermonkey.net/
// @version      4.2
// @description  优化汽水音乐分享页，防止流氓操作，并且有下载音频功能，拦截弹窗，支持搜索引擎自动跳转（可以关闭）
// @author       小狸 (modified)
// @match        https://music.douyin.com/qishui/share/*
// @match        https://qishui.douyin.com/s/*
// @match        https://cn.bing.com/search*
// @match        https://www.bing.com/search*
// @match        https://www.baidu.com/s*
// @match        https://www.google.com/search*
// @match        https://www.so.com/s*
// @match        https://www.sogou.com/web*
// @grant        none
// @run-at       document-start
// ==/UserScript==

//---------------------------------------------------------------------------------------------
// 作用的网页：汽水音乐分享页面（比如：https://qishui.douyin.com/s/iXm6k8EQ/）
// 这个脚本加载后分享页的顶部推广会会消失，这就说明你已经成功来到纯净版的分享页
// 脚本的功能：删除了推广元素、流氓下载设计和弹窗广告，增加了底部标语，覆写了下载按钮
// 注意，脚本生效的标志是顶部推广会会消失，否则就是没有生效。可以刷新一下网页，或者联系开发者
//---------------------------------------------------------------------------------------------
// 汽水音乐的分享页真是流氓，随便一点就要求下载软件，真是烦死了，还有那个下载按钮，简直就是一个
// 流氓设计，下载的是安装程序，简直气死我了，我直接覆写下载按钮变成真正的下载音乐的按钮，点一下
// 是真的下载指定的音频文件。也不知道是那个SB想的这个分享页
// 但是有一点比较好，有播放功能，也有歌词，简直就是一个网页版播放器，就是加了一些流氓功能。
//---------------------------------------------------------------------------------------------

(function () {
    'use strict';

    // ============================================================
    // 1. 搜索引擎自动跳转
    // ============================================================
    function autoRedirectFromSearch() {
        const href = location.href;
        const isSearch = /(?:bing\.com\/search|baidu\.com\/s|google\.com\/search|so\.com\/s|sogou\.com\/web)/.test(href);
        if (!isSearch) return;

        let decoded = href;
        try { decoded = decodeURIComponent(href); } catch (e) {}

        let m = decoded.match(/https?:\/\/qishui\.douyin\.com\/s\/[A-Za-z0-9]+/);
        if (m) { location.replace(m[0].replace(/[),.;]+$/, '')); return; }
        m = decoded.match(/https?:\/\/music\.douyin\.com\/qishui\/share\/track\?track_id=(\d+)/);
        if (m) { location.replace(`https://music.douyin.com/qishui/share/track?track_id=${m[1]}`); return; }
        m = decoded.match(/https?:\/\/music\.douyin\.com\/qishui\/share\/[^\s"'<>]+/);
        if (m) location.replace(m[0].replace(/[),.;]+$/, ''));
    }

    autoRedirectFromSearch();

    if (!/^https:\/\/music\.douyin\.com\/qishui\/share\//.test(location.href)) {
        return;
    }

    console.log('[汽水优化] 脚本启动');

    // ============================================================
    // 2. 工具
    // ============================================================
    function sanitizeFileName(name) {
        if (!name) return name;
        return name.replace(/[\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    }

    function waitFor(selector, callback, timeout = 20000, interval = 300) {
        const start = Date.now();
        const timer = setInterval(() => {
            const el = document.querySelector(selector);
            if (el) {
                clearInterval(timer);
                try { callback(el); } catch (e) { console.error('[汽水优化] waitFor 出错:', e); }
            } else if (Date.now() - start > timeout) {
                clearInterval(timer);
            }
        }, interval);
    }

    // ============================================================
    // 3. 删除流氓元素
    // ============================================================
    function removeNuisance() {
        document.querySelectorAll('header.top-banner-br').forEach(el => el.remove());
        document.querySelectorAll('.pc-download-btn').forEach(el => el.remove());
        document.querySelectorAll('.track-enter-area').forEach(el => {
            if (el.textContent && el.textContent.includes('下载')) el.remove();
        });
        // 封面上的透明覆盖层会接收点击
        document.querySelectorAll('.cover-player div').forEach(el => {
            const s = el.style;
            if (s && s.position === 'absolute' && s.height === '100%' && s.width === '100%'
                && !el.textContent.trim() && el.children.length === 0) {
                s.pointerEvents = 'none';
            }
        });
    }

    // ============================================================
    // 4. 白名单交互控制（CSS pointer-events + 多事件 JS 拦截）
    // ============================================================
    const ALLOW_SELECTORS = [
        '.custom-download-button',
        '.track-play-button-wrap',
        '.track-progress-row',
        '.track-progress-hit-area',
        '.progress-bar',
        '.progress-bar-container-inner',
        '.progress-value',
        '.progress-dot',
        '.track-lyric-entry',
        '.lyrics-viewer',
        '.track-lyrics-content',
        '.lyric-sentence',
        '.cover-player',
        'audio'
    ];

    function injectCss() {
        if (document.getElementById('qishui-optimize-css')) return;
        const style = document.createElement('style');
        style.id = 'qishui-optimize-css';
        style.textContent = `
            html, body {
                -ms-overflow-style: none !important;
                scrollbar-width: none !important;
            }
            html::-webkit-scrollbar, body::-webkit-scrollbar { display: none !important; }

            /* 默认关掉 track-page 内所有元素的指针事件 */
            .track-page, .track-page * { pointer-events: none !important; }

            /* 白名单：允许交互的元素及其子元素 */
            .custom-download-button,
            .custom-download-button *,
            .track-play-button-wrap,
            .track-play-button-wrap *,
            .track-progress-row,
            .track-progress-row *,
            .track-progress-hit-area,
            .track-progress-hit-area *,
            .track-lyric-entry,
            .track-lyric-entry *,
            .cover-player,
            .cover-player * {
                pointer-events: auto !important;
            }

            /* 需要保留的下部滚动区域（如果有）允许滚动 */
            html, body { pointer-events: auto !important; }
        `;
        (document.head || document.documentElement).appendChild(style);
        console.log('[汽水优化] 已注入交互白名单 CSS');
    }

    function isAllowedTarget(t) {
        if (!t || !t.closest) return true;
        // 不在 track-page 内就不拦
        if (!t.closest('.track-page')) return true;
        for (const sel of ALLOW_SELECTORS) {
            if (t.closest(sel)) return true;
        }
        return false;
    }

    function setupPointerBlocker() {
        // click 类事件：preventDefault + stop
        ['click', 'mousedown', 'mouseup', 'dblclick'].forEach(type => {
            document.addEventListener(type, function (e) {
                if (isAllowedTarget(e.target)) return;
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('[汽水优化] 拦截', type, ':', e.target.tagName, e.target.className || '');
            }, true);
        });

        // 指针 / 触摸：只 stop，不 preventDefault（避免影响滚动）
        ['pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(type => {
            document.addEventListener(type, function (e) {
                if (isAllowedTarget(e.target)) return;
                e.stopPropagation();
                e.stopImmediatePropagation();
                console.log('[汽水优化] 拦截', type, ':', e.target.tagName, e.target.className || '');
            }, true);
        });
    }

    // ============================================================
    // 5. 弹窗拦截
    // ============================================================
    function interceptSeoModal() {
        function removeModal() {
            document.querySelectorAll('.seo-modal-container').forEach(modal => {
                if (modal.textContent && modal.textContent.includes('打开汽水畅听全曲')) modal.remove();
            });
            const lunaToast = document.getElementById('luna-toast');
            if (lunaToast) lunaToast.remove();
        }
        removeModal();
        new MutationObserver(removeModal).observe(document, { childList: true, subtree: true });
    }

    // ============================================================
    // 6. 清理名称 + 获取音乐信息
    // ============================================================
    function cleanMusicName(raw) {
        if (!raw) return '';
        let s = raw.trim();

        // 去掉尾部 @汽水音乐 / -汽水音乐 / — 汽水音乐 等
        s = s.replace(/\s*[@\-—]\s*汽水音乐\s*$/i, '').trim();

        // 去掉《》
        s = s.replace(/^《\s*/, '').replace(/\s*》$/, '').trim();

        // 处理 "歌名-歌手1 _ 歌手2 _ 歌手3" 这种格式：
        // 先找 " _ "（两侧空格），再回退到它前面最近的 - 处截断
        const idx = s.indexOf(' _ ');
        if (idx > 0) {
            const before = s.slice(0, idx);
            const dash = before.lastIndexOf('-');
            if (dash > 0) s = before.slice(0, dash).trim();
            else s = before.trim();
        }

        return sanitizeFileName(s);
    }

    function getMusicInfo() {
        let url = '';
        try {
            const tp = window._ROUTER_DATA
                && window._ROUTER_DATA.loaderData
                && window._ROUTER_DATA.loaderData.track_page;
            if (tp && tp.audioWithLyricsOption && tp.audioWithLyricsOption.url) {
                url = tp.audioWithLyricsOption.url;
            }
        } catch (e) {}

        if (!url) {
            const audioEl = document.getElementById('--luna-view-player--');
            if (audioEl && audioEl.src) url = audioEl.src;
        }

        // 名称优先级：h1.title > document.title
        let name = '';
        const h1 = document.querySelector('h1.title')
            || document.querySelector('.track-info-entry h1')
            || document.querySelector('.track-page h1');
        if (h1) name = h1.textContent.trim();
        if (!name) name = document.title || '';
        name = cleanMusicName(name) || 'audio';

        console.log('[汽水优化] 音乐信息:', {
            name,
            url: url ? url.slice(0, 80) + '...' : '(未获取)'
        });
        return { url, name };
    }

    // ============================================================
    // 7. 下载
    // ============================================================
    function downloadAudio(url, filename) {
        if (!url) {
            alert('未找到音乐文件地址，请稍后再试');
            return;
        }
        let finalName = (filename || 'audio').replace(/\.(mp4|m4a|mp3|wav|flac|aac)$/i, '') + '.mp3';
        console.log('[汽水优化] 开始下载:', finalName);

        fetch(url)
            .then(r => {
                if (!r.ok) throw new Error('网络错误 ' + r.status);
                return r.blob();
            })
            .then(blob => {
                const dlUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = dlUrl;
                a.download = finalName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);
                console.log('[汽水优化] 下载完成');
            })
            .catch(err => {
                console.error('[汽水优化] fetch 下载失败，直接打开:', err);
                const a = document.createElement('a');
                a.href = url;
                a.download = finalName;
                a.target = '_blank';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            });
    }

    // ============================================================
    // 8. 替换下载按钮
    // ============================================================
    function replaceDownloadButton() {
        const container = document.querySelector('.action-container');
        if (!container) return;
        if (container.querySelector('.custom-download-button')) return;

        const oldRight = container.querySelector('img.right');
        if (!oldRight) return;

        const btn = document.createElement('img');
        btn.className = 'right custom-download-button';
        btn.src = oldRight.src || 'https://lf-luna.qishui.com/obj/music-luna-fe/ies/luna-share-h5-edenx/static/image/download-black.36d04760.png';
        btn.style.cssText = 'width:24px;height:24px;cursor:pointer;';
        btn.dataset.customDownload = 'true';
        btn.title = '下载音频';

        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            console.log('[汽水优化] 点击自定义下载按钮');
            const info = getMusicInfo();
            downloadAudio(info.url, info.name);
        }, true);

        // 多事件类型都绑定，避免被其他事件抢先
        ['mousedown', 'pointerdown', 'touchstart'].forEach(type => {
            btn.addEventListener(type, function (e) {
                e.stopPropagation();
                e.stopImmediatePropagation();
            }, true);
        });

        oldRight.replaceWith(btn);
        console.log('[汽水优化] 下载按钮已替换');
    }

    // ============================================================
    // 9. 底部标语
    // ============================================================
    function addFooterSlogan() {
        if (!document.body || document.getElementById('custom-footer-slogan')) return;
        const slogan = document.createElement('div');
        slogan.id = 'custom-footer-slogan';
        slogan.style.cssText = 'width:100%;padding:20px 0;font-size:14px;color:#999;text-align:center;pointer-events:none;';
        slogan.textContent = '让"分享"不再是软件的宣传   ---   让分享成为真正的分享';
        document.body.appendChild(slogan);
    }

    // ============================================================
    // 10. 初始化
    // ============================================================
    let initialized = false;
    function initialize() {
        if (initialized) return;
        initialized = true;
        injectCss();
        removeNuisance();
        replaceDownloadButton();
        setupPointerBlocker();
        interceptSeoModal();
        addFooterSlogan();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    waitFor('.top-part', removeNuisance);
    waitFor('.action-container', replaceDownloadButton);
    waitFor('body', addFooterSlogan);

    // 节流的 MutationObserver
    let rafPending = false;
    new MutationObserver(() => {
        if (rafPending) return;
        rafPending = true;
        requestAnimationFrame(() => {
            rafPending = false;
            removeNuisance();
            replaceDownloadButton();
        });
    }).observe(document, { childList: true, subtree: true });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            setTimeout(() => {
                removeNuisance();
                replaceDownloadButton();
            }, 500);
        }
    });

    console.log('[汽水优化] 脚本加载完成');
})();