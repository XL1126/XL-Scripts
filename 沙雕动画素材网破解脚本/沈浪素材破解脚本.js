// ==UserScript==
// @name         沈浪素材破解脚本
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  可以免费下载沈浪素材网的所有素材
// @author       为人民服务
// @match        https://www.slsucai.com/
// @grant        unsafeWindow
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// ==/UserScript==

//---------------------------------------------------------------------------------------------
// 素材网：https://www.slsucai.com/
// 打开沈浪素材网，选择所需素材后，直接点击下载按钮即可完成下载。
// 这里点啥都行，没有啥要注意的。
//---------------------------------------------------------------------------------------------

(function() {
    'use strict';

    console.log('沈浪素材破解脚本已加载');

    // 直接注入forceDownload函数到页面上下文
    function injectForceDownloadFunction() {
        const script = document.createElement('script');
        script.textContent = `
            // ============================================
            // 直接注入的forceDownload函数 - 修复版
            // ============================================
            function tmForceDownload() {
                console.log('执行直接注入的forceDownload');

                // 尝试多种方法获取当前文件数据
                let item = null;

                // 方法1: 从页面的currentItems获取
                if (typeof currentItems !== 'undefined' && typeof currentIndex !== 'undefined') {
                    item = currentItems[currentIndex];
                    console.log('从currentItems获取:', item);
                }

                // 方法2: 从弹窗数据获取
                if (!item) {
                    const modal = document.getElementById('imgModal');
                    if (modal && modal.dataset.originalFile) {
                        // 尝试从dataset获取原始数据
                        try {
                            const originalData = JSON.parse(modal.dataset.originalFile);
                            if (originalData) {
                                item = originalData;
                                console.log('从modal dataset获取:', item);
                            }
                        } catch(e) {
                            console.log('无法解析dataset数据');
                        }
                    }
                }

                // 方法3: 从弹窗内容提取
                if (!item) {
                    const modalImg = document.getElementById('modalImg');
                    const modalTitle = document.getElementById('modalTitle');

                    if (modalImg && modalImg.src) {
                        item = {
                            rwname: modalTitle ? modalTitle.textContent.trim() : '下载文件',
                            rwfile: '',
                            rwimg: modalImg.src
                        };

                        // 从图片URL推导文件URL
                        const imgMatch = modalImg.src.match(/\\/images\\/(.+)/);
                        if (imgMatch) {
                            const baseName = imgMatch[1].replace(/\\.[^.]+$/, '');
                            item.rwfile = 'https://down.slsucai.com/files/' + baseName + '.fla';
                        }
                        console.log('从弹窗内容推导:', item);
                    }
                }

                if (!item || !item.rwfile) {
                    alert("未找到下载文件");
                    console.error('无法获取文件数据');
                    return;
                }

                const fileUrl = item.rwfile;
                const rwname = (item.rwname || "下载文件").trim();

                // 生成文件名
                let filename = rwname;

                // 清理文件名中的不安全字符
                filename = filename.replace(/[<>:"/\\\\|?*]/g, '_');
                filename = filename.replace(/\\s+/g, '_'); // 空格替换为下划线

                // 确保有.fla扩展名
                if (!filename.toLowerCase().endsWith('.fla')) {
                    filename += '.fla';
                }

                console.log('准备下载文件:', {
                    原始名称: rwname,
                    处理后的文件名: filename,
                    文件URL: fileUrl
                });

                // 生成CDN下载链接
                const cdnDomain = "https://down.slsucai.com";
                const secretKey = "JTeV7uX4bvfPYOzA66mOgRfUzUx7G82";
                const timestamp = Math.floor(Date.now() / 1000);
                const rand = Math.random().toString(36).substr(2, 6);
                const uid = 0;

                // 提取URI
                let uri;
                if (fileUrl.includes('/files/')) {
                    uri = "/files/" + fileUrl.split("/files/")[1];
                } else {
                    // 尝试解析URL
                    try {
                        const url = new URL(fileUrl);
                        uri = url.pathname;
                    } catch(e) {
                        uri = fileUrl;
                    }
                }

                console.log('URI:', uri);

                // 清理已存在的参数
                uri = uri.split('?')[0];

                // 生成签名
                const toMd5 = uri + "-" + timestamp + "-" + rand + "-" + uid + "-" + secretKey;

                // 使用CryptoJS生成签名
                if (typeof CryptoJS !== 'undefined') {
                    try {
                        const sign = CryptoJS.MD5(toMd5).toString(CryptoJS.enc.Hex);
                        const cdnUrl = \`\${cdnDomain}\${uri}?UNIX=\${timestamp}-\${rand}-\${uid}-\${sign}\`;

                        console.log('生成的下载链接:', cdnUrl);
                        console.log('期望的文件名:', filename);

                        // 方法1: 使用fetch + Blob方式下载（最可靠）
                        tmDownloadWithBlob(cdnUrl, filename);

                    } catch (error) {
                        console.error('生成签名失败:', error);
                        // 方法2: 使用普通a标签下载（备用）
                        tmDownloadWithAnchor(cdnUrl, filename);
                    }
                } else {
                    console.error('CryptoJS未加载');
                    // 方法2: 使用普通a标签下载（备用）
                    tmDownloadWithAnchor(fileUrl, filename);
                }
            }

            // 方法1: 使用fetch + Blob下载（最可靠的控制文件名）
            function tmDownloadWithBlob(url, filename) {
                console.log('使用Blob方式下载:', filename);

                fetch(url)
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('网络响应错误: ' + response.status);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        // 创建下载链接
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();

                        // 清理
                        setTimeout(() => {
                            window.URL.revokeObjectURL(url);
                            if (a.parentNode) {
                                a.parentNode.removeChild(a);
                            }
                        }, 100);

                        console.log('Blob下载完成:', filename);
                        tmShowToast(\`开始下载: \${filename}\`);
                    })
                    .catch(error => {
                        console.error('Blob下载失败:', error);
                        // 回退到普通方式
                        tmDownloadWithAnchor(url, filename);
                    });
            }

            // 方法2: 使用普通a标签下载（兼容性更好）
            function tmDownloadWithAnchor(url, filename) {
                console.log('使用Anchor方式下载:', filename);

                const a = document.createElement('a');
                a.href = url;
                a.download = filename;  // 设置期望的文件名
                a.target = '_blank';

                // 添加到页面并点击
                document.body.appendChild(a);
                a.click();

                // 清理
                setTimeout(() => {
                    if (a.parentNode) {
                        a.parentNode.removeChild(a);
                    }
                }, 100);

                console.log('Anchor下载触发:', filename);
                tmShowToast(\`开始下载: \${filename}\`);
            }

            // 显示提示
            function tmShowToast(message) {
                const toast = document.createElement('div');
                toast.textContent = message;
                toast.style.cssText = \`
                    position: fixed;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.9);
                    color: white;
                    padding: 15px 25px;
                    border-radius: 10px;
                    z-index: 100002;
                    font-family: sans-serif;
                    font-size: 16px;
                    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
                    animation: tmFadeInOut 2s ease;
                \`;

                const style = document.createElement('style');
                style.textContent = \`
                    @keyframes tmFadeInOut {
                        0% { opacity: 0; transform: translate(-50%, -40%); }
                        20% { opacity: 1; transform: translate(-50%, -50%); }
                        80% { opacity: 1; }
                        100% { opacity: 0; transform: translate(-50%, -60%); }
                    }
                \`;
                document.head.appendChild(style);
                document.body.appendChild(toast);

                setTimeout(() => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                    if (style.parentNode) style.parentNode.removeChild(style);
                }, 2000);
            }

            // 覆盖原下载函数
            if (typeof downloadImage !== 'undefined') {
                const originalDownloadImage = downloadImage;
                downloadImage = function() {
                    console.log('拦截原下载函数，使用直接注入版本');
                    tmForceDownload();
                };
                console.log('原下载函数已覆盖');
            }

            // 添加全局函数
            window.tmDirectDownload = tmForceDownload;
            window.tmDownloadWithBlob = tmDownloadWithBlob;
            window.tmDownloadWithAnchor = tmDownloadWithAnchor;

            console.log('直接注入的forceDownload函数已加载');
        `;

        document.head.appendChild(script);
    }

    // 初始化
    function init() {
        console.log('初始化直接注入下载...');
        injectForceDownloadFunction();

        document.addEventListener('keydown', function(e) {
            if (e.key === 'F4') {
                e.preventDefault();
                console.log('F4 触发直接下载');
                if (unsafeWindow.tmDirectDownload) {
                    unsafeWindow.tmDirectDownload();
                }
            }
        });

        console.log('直接注入下载助手初始化完成');
        console.log('打开图片弹窗后：');
        console.log('1. 按 F4 键');
        console.log('2. 或在控制台执行 tmDirectDownload()');
    }

    // 启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 1000);
    }

})();