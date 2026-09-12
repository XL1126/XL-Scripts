// ==UserScript==
// @name         黑白素材破解脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  可以免费下载黑白素材网的所有素材
// @author       为人民服务
// @match        https://www.hbsucaiwang.com/*
// @match        https://hbsucaiwang.com/*
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

//---------------------------------------------------------------------------------------------
// 素材网：https://www.hbsucaiwang.com/
// 注意，这个脚本会增加一个下载按钮，很明显，点击后会下载当前素材。
// 特别注意，不要点击其他按钮，如果点击了其他按钮只能刷新网页让脚本重新生效了。
//---------------------------------------------------------------------------------------------
// 脚本基本和小鑫素材网差不多。但是很可惜，我这个脚本是自从1.3破解脚本后很久之后才开始做的，我
// 的巅峰状态已经过了，所以现在有很多BUG，看看以后能不能修吧...
//---------------------------------------------------------------------------------------------

(function() {
    'use strict';

    console.log('黑白素材网破解脚本已加载');

    // 网站特定的配置
    const SITE_CONFIG = {
        tokenKey: 'heibai-app-token',
        usernameKey: 'heibai-app-username',
        passwordKey: 'heibai-app-password',
        baseApiUrl: 'https://www.hbsucaiwang.com/sucai',
        checkDownloadUrl: '/sucai/common/checkDownload',
        downloadApiUrl: '/sucai/common/download/tsf?preName='
    };

    // 假用户数据（根据网站的实际数据结构）
    const fakeUser = {
        token: 'fake_token_' + Date.now(),
        nickName: 'VIP用户',
        id: 888888,
        avatar: '',
        isLoggedIn: true,
        // 网站可能需要额外的字段
        username: 'vip_user_' + Date.now(),
        dialogVisible: false
    };

    // 主初始化
    function init() {
        console.log('开始初始化黑白素材网适配版');

        // 1. 拦截下载检查请求（关键）
        interceptDownloadCheck();

        // 2. 设置假的用户信息和token
        setupFakeUserInfo();

        // 3. 修复用户信息查询
        fixUserInfoQuery();

        // 4. 处理下载按钮
        processDownloadButtons();

        // 5. 监控页面变化
        setupPageMonitor();

        // 6. 伪造localStorage认证
        setupFakeAuth();

        console.log('初始化完成');
    }

    // 核心：拦截下载检查请求
    function interceptDownloadCheck() {
        console.log('设置下载检查拦截');

        const checkUrl = SITE_CONFIG.checkDownloadUrl;

        // 拦截fetch请求
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];

                if (typeof url === 'string' && url.includes(checkUrl)) {
                    console.log('拦截下载检查请求，返回成功响应');

                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            code: 200,  // 网站使用200表示成功
                            data: { canDownload: true, needLogin: false },
                            msg: '可以下载'
                        })
                    });
                }

                return originalFetch.apply(this, args);
            };
        }

        // 拦截XMLHttpRequest
        const OriginalXHR = window.XMLHttpRequest;
        window.XMLHttpRequest = function() {
            const xhr = new OriginalXHR();
            const originalOpen = xhr.open;
            const originalSend = xhr.send;

            xhr.open = function(method, url) {
                this._requestUrl = url;
                return originalOpen.apply(this, arguments);
            };

            xhr.send = function(data) {
                if (this._requestUrl && this._requestUrl.includes(checkUrl)) {
                    console.log('XHR拦截下载检查');

                    setTimeout(() => {
                        if (xhr.onreadystatechange) {
                            xhr.readyState = 4;
                            xhr.status = 200;
                            xhr.responseText = JSON.stringify({
                                code: 200,
                                data: { canDownload: true, needLogin: false },
                                msg: '可以下载'
                            });
                            xhr.onreadystatechange();
                        }
                    }, 50);

                    return;
                }

                return originalSend.apply(this, arguments);
            };

            return xhr;
        };
    }

    // 设置假用户信息
    function setupFakeUserInfo() {
        // 设置localStorage token（关键）
        localStorage.setItem(SITE_CONFIG.tokenKey, fakeUser.token);
        localStorage.setItem(SITE_CONFIG.usernameKey, fakeUser.username);

        console.log('已设置假token:', fakeUser.token);

        // 尝试注入到Vue实例
        setTimeout(() => {
            injectToVueInstances();
        }, 2000);
    }

    // 注入到Vue实例
    function injectToVueInstances() {
        let injectedCount = 0;

        // 查找所有Vue实例
        document.querySelectorAll('*').forEach(el => {
            try {
                const vm = el.__vue__;
                if (vm && !vm._scriptInjected) {
                    // 标记已注入
                    vm._scriptInjected = true;

                    // 注入用户信息
                    if (vm.userInfo) {
                        Object.assign(vm.userInfo, fakeUser);
                        injectedCount++;
                    }

                    // 注入loginParams
                    if (vm.loginParams) {
                        vm.loginParams.token = fakeUser.token;
                        vm.loginParams.dialogVisible = false;
                        injectedCount++;
                    }

                    // 注入showName
                    if (typeof vm.showName === 'string') {
                        vm.showName = fakeUser.nickName;
                        injectedCount++;
                    }

                    // 监听状态变化
                    if (vm.$watch) {
                        vm.$watch('userInfo.token', function(newVal) {
                            if (!newVal || newVal === '') {
                                console.log('检测到token被清空，重新注入');
                                vm.userInfo.token = fakeUser.token;
                                localStorage.setItem(SITE_CONFIG.tokenKey, fakeUser.token);
                            }
                        }, { deep: true });
                    }
                }
            } catch(e) {
                // 静默处理错误
            }
        });

        if (injectedCount > 0) {
            console.log(`已注入 ${injectedCount} 个Vue实例属性`);
        }
    }

    // 修复用户信息查询
    function fixUserInfoQuery() {
        // 拦截getUser API调用
        const getUserUrl = '/getUser';

        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];

                if (typeof url === 'string' && url.includes(getUserUrl)) {
                    console.log('拦截用户信息查询，返回假数据');

                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            code: 200,
                            data: {
                                data: fakeUser
                            },
                            msg: 'success'
                        })
                    });
                }

                return originalFetch.apply(this, args);
            };
        }
    }

    // 处理下载按钮
    function processDownloadButtons() {
        // 移除限制性按钮
        removeRestrictiveButtons();

        // 添加直接下载功能
        addDirectDownloadFeatures();
    }

    // 移除限制性按钮
    function removeRestrictiveButtons() {
        const removeButtons = ['FLA下载', 'PSD下载', 'VIP下载', '登录下载'];

        removeButtons.forEach(buttonText => {
            document.querySelectorAll('button').forEach(button => {
                const text = button.textContent?.trim() || '';
                if (text.includes(buttonText)) {
                    button.style.display = 'none';
                    button.setAttribute('data-hidden-by-script', 'true');
                }
            });
        });
    }

    // 添加直接下载功能
    function addDirectDownloadFeatures() {
        // 监控对话框打开
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // 查找素材预览对话框
                            const dialog = node.querySelector?.('.el-dialog__wrapper.custom-dialog') ||
                                          (node.classList?.contains('el-dialog__wrapper') ? node : null);

                            if (dialog) {
                                setTimeout(() => {
                                    processDownloadDialog(dialog);
                                }, 300);
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 处理下载对话框
    function processDownloadDialog(dialog) {
        try {
            const footer = dialog.querySelector('.dialog-footer');
            if (!footer) return;

            // 检查是否已经添加过按钮
            if (footer.querySelector('.direct-download-btn')) return;

            // 获取素材信息
            const materialInfo = getMaterialInfoFromDialog(dialog);
            if (!materialInfo) return;

            // 创建直接下载按钮
            const directBtn = document.createElement('button');
            directBtn.className = 'el-button el-button--primary el-button--medium direct-download-btn';
            directBtn.innerHTML = '<i class="el-icon-download"></i><span>直接下载</span>';

            directBtn.onclick = async function(e) {
                e.preventDefault();
                e.stopPropagation();

                console.log('开始下载素材:', materialInfo);

                // 获取真实下载链接
                const downloadUrl = await getRealDownloadUrl(materialInfo.id);
                if (downloadUrl) {
                    await downloadMaterial(downloadUrl, materialInfo.name);
                }

                return false;
            };

            footer.appendChild(directBtn);
            console.log('已添加直接下载按钮');

        } catch (error) {
            console.error('处理对话框错误:', error);
        }
    }

    // 从对话框获取素材信息
    function getMaterialInfoFromDialog(dialog) {
        // 尝试从Vue实例获取
        let materialInfo = null;

        dialog.querySelectorAll('*').forEach(el => {
            const vm = el.__vue__;
            if (vm && vm.productList && vm.productList.length > 0) {
                const index = vm.carouselInitIndex || 0;
                materialInfo = vm.productList[index];
            }
        });

        // 如果Vue实例没找到，尝试从DOM获取
        if (!materialInfo) {
            const titleEl = dialog.querySelector('.el-dialog__title');
            if (titleEl) {
                materialInfo = {
                    id: Date.now().toString(),
                    name: titleEl.textContent.trim()
                };
            }
        }

        return materialInfo;
    }

    // 获取真实下载链接
    async function getRealDownloadUrl(productId) {
        // 网站实际的下载API格式
        const downloadUrl = `${SITE_CONFIG.baseApiUrl}/common/download/tsf?preName=&type=0&requestKey=${encodeURIComponent(productId)}`;

        // 由于我们已经拦截了检查请求，这里可以直接返回构造的下载链接
        return downloadUrl;
    }

    // 下载素材
    async function downloadMaterial(url, fileName) {
        try {
            console.log('下载链接:', url);

            // 获取文件扩展名
            const extension = getFileExtension(url) || 'fla';
            const fullFileName = sanitizeFileName(fileName) + '.' + extension;

            console.log('文件名:', fullFileName);

            // 使用GM_xmlhttpRequest下载（需要@grant权限）
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    responseType: 'blob',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem(SITE_CONFIG.tokenKey)}`
                    },
                    onload: function(response) {
                        if (response.status === 200) {
                            const blob = response.response;
                            downloadBlob(blob, fullFileName);
                        } else {
                            console.error('下载失败，状态码:', response.status);
                            fallbackDownload(url, fullFileName);
                        }
                    },
                    onerror: function(error) {
                        console.error('下载错误:', error);
                        fallbackDownload(url, fullFileName);
                    }
                });
            } else {
                // 回退到普通方式
                fallbackDownload(url, fullFileName);
            }
        } catch (error) {
            console.error('下载过程错误:', error);
        }
    }

    // 获取文件扩展名
    function getFileExtension(url) {
        try {
            const pathname = new URL(url).pathname;
            const match = pathname.match(/\.([a-zA-Z0-9]+)(\?|$)/);
            return match ? match[1].toLowerCase() : null;
        } catch(e) {
            // 从URL字符串判断
            if (url.includes('.fla')) return 'fla';
            if (url.includes('.psd')) return 'psd';
            if (url.includes('.zip')) return 'zip';
            if (url.includes('.rar')) return 'rar';
            if (url.includes('.jpg') || url.includes('.jpeg')) return 'jpg';
            if (url.includes('.png')) return 'png';
            return 'fla';
        }
    }

    // 清理文件名
    function sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*]/g, '_')
                   .replace(/\s+/g, ' ')
                   .trim()
                   .substring(0, 100); // 限制长度
    }

    // 下载Blob文件
    function downloadBlob(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

        console.log('下载完成:', fileName);
    }

    // 回退下载方式
    function fallbackDownload(url, fileName) {
        console.log('使用回退方式下载');

        // 创建一个隐藏的iframe来触发下载
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = url;
        document.body.appendChild(iframe);

        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 5000);
    }

    // 伪造认证状态
    function setupFakeAuth() {
        // 定期检查token状态
        setInterval(() => {
            const token = localStorage.getItem(SITE_CONFIG.tokenKey);
            if (!token || token === '') {
                console.log('检测到token为空，重新注入');
                localStorage.setItem(SITE_CONFIG.tokenKey, fakeUser.token);
            }
        }, 3000);
    }

    // 监控页面变化
    function setupPageMonitor() {
        // 监控页面跳转
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                console.log('页面跳转，重新注入');
                setTimeout(() => {
                    setupFakeUserInfo();
                    processDownloadButtons();
                }, 1000);
            }
        }, 1000);

        // 监控DOM变化
        const domObserver = new MutationObserver(() => {
            // 重新处理下载按钮
            setTimeout(() => {
                processDownloadButtons();
            }, 500);
        });

        domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 启动脚本
    function startScript() {
        // 等待页面加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(init, 1500);
            });
        } else {
            setTimeout(init, 1500);
        }
    }

    // 启动
    startScript();

})();