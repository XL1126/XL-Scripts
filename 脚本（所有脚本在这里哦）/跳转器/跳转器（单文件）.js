// ==UserScript==
// @name         跳转器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  配置多条跳转规则，支持多对一规则配置。当访问的链接匹配源模式（支持 * 通配符）时，自动跳转到对应的目标链接。整个跳转过程在页面渲染前完成，避免原页面闪现，同时彻底禁用页面交互与权限，防止操作或数据泄露
// @author       小狸（XL1126）
// @match        *://*/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 用户配置区域 ====================
    // 多对一规则格式：{ sources: ["模式1", "模式2", ...], target: "目标链接" }
    // 当访问的URL匹配任意一个模式时，跳转到对应的target
    const rules = [
        {
            sources: [
                "*://steam.ffffgame.com/*",
                "https://baoku.360.cn/yxyl/2000003026.html",
                "https://www.pcsoft.com.cn/soft/30237766.html",
                "https://www.gamersky.com/handbook/202407/1782847.shtml",
                "https://baoku.360.cn/sinfo/600001682_9510099.html",
                "https://single-rule.com/*",
                "https://apps.microsoft.com/detail/xpfcs1rgwbmttg?hl=zh-cn&gl=CN",
                "https://soft.360.cn/static/baoku/info_7_0/softinfo_2000003418.html",
                "https://www.crsky.com/soft/562922.html",
                "https://www.downxia.com/downinfo/333829.html",
                "https://soft.china.com/soft/2832221.html",
                "https://pc.qq.com/detail/18/detail_12158.html",
                "https://down.gamersky.com/pc/202504/1912410.shtml",
                "https://xiazai.zol.com.cn/search?wd=steam%D3%CE%CF%B7%BF%CD%BB%A7%B6%CB&type=1&order=1&workType=1"
            ],
            target: "https://store.steampowered.com/"
        },
        {
            sources: [
                "https://盗版链接.cc/",
                "*://*.盗版链接.cc/legacy/*"
            ],
            target: "https://正版链接.com/"
        },
        // 特殊单对单格式
        { source: "*://*.盗版链接.cc/legacy/*", target: "https://正版链接.com/" },
    ];
    // =====================================================
    // 可以看到这个的帅哥美女，我相信你们有一定电脑能力，所以
    // 希望看到这个的大家可以搜集各种盗版网页用于更新这个脚本
    // 让安装这个脚本的电脑小白不会被盗版网页所骗到。
    // 搜集到的网页可以通过下面的邮箱提交（づ￣3￣）づ╭❤️～
    // 邮箱：xiaoli201126@qq.com
    // （如果不提交链接请勿打扰）
    // =====================================================

    /**
     * 将包含通配符 * 的模式转换为正则表达式
     */
    function patternToRegex(pattern) {
        let regexStr = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        regexStr = regexStr.replace(/\*/g, '.*');
        return new RegExp(`^${regexStr}$`);
    }

    /**
     * 检查规则并返回匹配的目标URL
     */
    function getMatchingTarget(currentUrl) {
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            let patterns = [];

            if (rule.sources) {
                patterns = rule.sources;
            } else if (rule.source) {
                patterns = [rule.source];
            } else {
                continue;
            }

            for (let j = 0; j < patterns.length; j++) {
                if (patternToRegex(patterns[j]).test(currentUrl)) {
                    console.log(`[跳转脚本] 规则 ${i+1} 触发，即将冻结页面并跳转`);
                    return rule.target;
                }
            }
        }
        return null;
    }

    const currentUrl = window.location.href;
    const targetUrl = getMatchingTarget(currentUrl);

    if (targetUrl) {
        // ==================== 终极防护：立即冻结页面 ====================

        // 1. 阻止所有后续脚本执行和DOM操作
        document.write = function() { return; };
        document.writeln = function() { return; };
        document.open = function() { return; };
        document.close = function() { return; };

        // 2. 清空并冻结document
        try {
            // 对于已开始加载的页面，尽可能清空
            if (document.documentElement) {
                document.documentElement.innerHTML = ''; // 清空内容
                document.documentElement.style.cssText = 'display:none !important'; // 隐藏
            }
        } catch (e) {}

        // 3. 覆盖所有可能的事件监听器添加方法
        const noop = function() { return; };
        const eventMethods = [
            'addEventListener', 'removeEventListener',
            'attachEvent', 'detachEvent',
            'onabort', 'onblur', 'onchange', 'onclick', 'ondblclick',
            'onerror', 'onfocus', 'oninput', 'onkeydown', 'onkeypress',
            'onkeyup', 'onload', 'onmousedown', 'onmousemove', 'onmouseout',
            'onmouseover', 'onmouseup', 'onresize', 'onscroll', 'onselect',
            'onsubmit', 'onunload', 'ontouchstart', 'ontouchmove', 'ontouchend'
        ];

        // 覆盖window和document上的事件方法
        eventMethods.forEach(method => {
            try {
                window[method] = noop;
                document[method] = noop;
            } catch (e) {}
        });

        // 覆盖添加监听器的方法
        window.addEventListener = noop;
        window.removeEventListener = noop;
        document.addEventListener = noop;
        document.removeEventListener = noop;

        // 4. 禁止所有权限API
        const permissionsAPI = [
            // 文件系统
            'showOpenFilePicker', 'showSaveFilePicker', 'showDirectoryPicker',
            'webkitRequestFileSystem', 'webkitRequestFileSystemSync',
            'requestFileSystem', 'requestFileSystemSync',

            // 硬件访问
            'getUserMedia', 'webkitGetUserMedia', 'mozGetUserMedia', // 摄像头/麦克风
            'enumerateDevices', 'getDisplayMedia',
            'requestMIDIAccess', // MIDI设备
            'bluetooth', 'requestBluetoothDevice', 'requestLEScan', // 蓝牙
            'usb', 'requestDevice', // USB
            'hid', 'requestDevice', // HID设备
            'serial', 'requestPort', // 串口
            'nfc', 'requestAdapter', // NFC

            // 传感器
            'DeviceMotionEvent', 'DeviceOrientationEvent',
            'requestSensorAccess', 'AmbientLightSensor',
            'ProximitySensor', 'Magnetometer',

            // 地理位置
            'geolocation', 'getCurrentPosition', 'watchPosition', 'clearWatch',

            // 剪贴板
            'clipboard', 'read', 'write', 'readText', 'writeText',

            // 存储
            'localStorage', 'sessionStorage', 'indexedDB', 'openDatabase',
            'cache', 'caches',

            // 窗口/弹窗
            'open', 'showModalDialog', 'showModelessDialog', 'alert', 'confirm', 'prompt',
            'print', 'beforeunload',

            // 全屏
            'requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen',
            'msRequestFullscreen', 'exitFullscreen',

            // 网络请求
            'fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource',
            'sendBeacon', 'webkitRTCPeerConnection', 'RTCPeerConnection',

            // 其他
            'requestWakeLock', 'vibrate', 'setAppBadge', 'clearAppBadge',
            'share', 'canShare', 'getInstalledRelatedApps'
        ];

        // 覆盖所有权限API
        permissionsAPI.forEach(api => {
            try {
                window[api] = noop;
                navigator[api] = noop;
                if (api === 'localStorage') {
                    // 特殊处理localStorage
                    Object.defineProperty(window, 'localStorage', {
                        get: function() { return null; },
                        set: function() {}
                    });
                }
            } catch (e) {}
        });

        // 5. 覆盖navigator上的所有属性
        const navigatorProps = [
            'permissions', 'credentials', 'storage', 'serviceWorker',
            'mediaDevices', 'bluetooth', 'usb', 'hid', 'serial',
            'geolocation', 'clipboard', 'locks', 'wakeLock',
            'share', 'canShare', 'getGamepads', 'requestMIDIAccess'
        ];

        navigatorProps.forEach(prop => {
            try {
                navigator[prop] = null;
            } catch (e) {}
        });

        // 6. 禁止鼠标/键盘/触摸事件传播
        const stopEvent = function(e) {
            e.stopPropagation();
            e.preventDefault();
            e.stopImmediatePropagation();
            return false;
        };

        // 捕获所有事件
        const events = [
            'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove', 'mouseover',
            'mouseout', 'mouseenter', 'mouseleave', 'keydown', 'keyup', 'keypress',
            'touchstart', 'touchmove', 'touchend', 'touchcancel', 'wheel',
            'drag', 'dragstart', 'dragend', 'dragover', 'dragenter', 'dragleave',
            'drop', 'scroll', 'resize', 'input', 'change', 'submit', 'reset',
            'focus', 'blur', 'select', 'contextmenu', 'paste', 'copy', 'cut'
        ];

        // 在捕获阶段阻止所有事件
        events.forEach(eventType => {
            try {
                window.addEventListener(eventType, stopEvent, true); // 捕获阶段
                document.addEventListener(eventType, stopEvent, true);
            } catch (e) {}
        });

        // 7. 禁止表单提交
        if (HTMLFormElement) {
            HTMLFormElement.prototype.submit = function() { return; };
            HTMLFormElement.prototype.requestSubmit = function() { return; };
        }

        // 8. 禁止文件选择
        if (HTMLInputElement) {
            HTMLInputElement.prototype.click = function() { return; };
            HTMLInputElement.prototype.select = function() { return; };
        }

        // 9. 禁止滚动
        try {
            window.scrollTo = noop;
            window.scroll = noop;
            window.scrollBy = noop;
            document.documentElement.style.overflow = 'hidden';
            document.body.style.overflow = 'hidden';
        } catch (e) {}

        // 10. 覆盖console以减少可能的错误输出（但保留基本功能）
        console.log = function() {};
        console.info = function() {};
        console.warn = function() {};
        console.error = function() {};

        // 11. 覆盖定时器
        const originalSetTimeout = window.setTimeout;
        const originalSetInterval = window.setInterval;
        const originalRequestAnimationFrame = window.requestAnimationFrame;

        window.setTimeout = function(fn, delay) {
            if (typeof fn === 'function') {
                return 0;
            }
            return 0;
        };

        window.setInterval = function(fn, delay) {
            if (typeof fn === 'function') {
                return 0;
            }
            return 0;
        };

        window.requestAnimationFrame = function(callback) {
            return 0;
        };

        // 清除所有现有的定时器
        try {
            let id = window.setTimeout(function() {}, 0);
            while (id >= 0) {
                window.clearTimeout(id);
                window.clearInterval(id);
                id--;
            }
        } catch (e) {}

        // ==================== 执行跳转 ====================
        console.log('[跳转脚本] 页面已完全冻结，开始跳转到:', targetUrl);
        window.location.replace(targetUrl);
    }
})();