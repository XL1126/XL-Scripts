// ==UserScript==
// @name         小鑫素材破解脚本
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  可以免费下载小鑫素材网的所有素材
// @author       为人民服务
// @match        https://www.xiaoxinsc.com/*
// @match        https://xiaoxinsc.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

//---------------------------------------------------------------------------------------------
// 素材网：https://www.xiaoxinsc.com/svip
// 脚本加载后可以直接使用，点击一个素材后有两个按钮，一个是网盘下载另一个是直接下载，网盘下载没
// 法点击，也不知道可不可以用。
// 其他的就没有什么要注意的了。
//---------------------------------------------------------------------------------------------
// 这个破解脚本是这其中最大的一个，当时我可是巅峰时刻，做到了完美，连下载文件的名字都弄上了
// 这个素材网我记得是防护做到了这几个素材网里面的顶尖，但是我严重怀疑这给项目是公开或者是买的，
// 有很多素材网（比如黑白素材网）用的都是这种的网页，连逻辑也差不多...
//---------------------------------------------------------------------------------------------

(function() {
    'use strict';

    console.log('脚本启动 - Blob下载，自定义文件名');

    // 假用户数据
    const fakeUser = {
        token: 'fake_token_' + Date.now(),
        nickName: '已登录用户',
        id: 999999,
        avatar: '',
        dialogVisible: false,
        isLoggedIn: true
    };

    // 主初始化
    function init() {
        console.log('开始初始化');

        // 1. 拦截下载检查请求
        interceptDownloadCheck();

        // 2. 设置假的用户信息
        setupFakeUserInfo();

        // 3. 修复selectUserInfo
        fixSelectUserInfo();

        // 4. 立即删除所有FLA按钮
        removeAllFlaButtons();

        // 5. 监听并处理对话框
        setupDialogHandler();

        // 6. 持续监控防止FLA按钮重新出现
        startFlaButtonMonitor();

        console.log('初始化完成');
    }

    // 核心：拦截下载检查请求
    function interceptDownloadCheck() {
        console.log('设置下载检查请求拦截');

        const checkDownloadUrl = '/sucai/common/checkDownload';

        // 拦截fetch
        if (window.fetch) {
            const originalFetch = window.fetch;
            window.fetch = function(...args) {
                const url = args[0];

                if (typeof url === 'string' && url.includes(checkDownloadUrl)) {
                    console.log('拦截下载检查请求，返回成功');

                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            code: 200,
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
                if (this._requestUrl && this._requestUrl.includes(checkDownloadUrl)) {
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
        const instances = [];

        document.querySelectorAll('*').forEach(el => {
            if (el.__vue__) {
                instances.push(el.__vue__);
                const collect = (vm) => {
                    if (vm.$children) {
                        vm.$children.forEach(child => {
                            instances.push(child);
                            collect(child);
                        });
                    }
                };
                collect(el.__vue__);
            }
        });

        instances.forEach(vm => {
            if (!vm.userInfo) vm.userInfo = {};
            Object.assign(vm.userInfo, fakeUser);

            if (vm.loginParams) {
                vm.loginParams.token = fakeUser.token;
                vm.loginParams.dialogVisible = false;
            }

            if (typeof vm.showName === 'undefined') {
                vm.showName = fakeUser.nickName;
            }
        });

        console.log(`已设置 ${instances.length} 个Vue实例的用户信息`);
    }

    // 修复selectUserInfo
    function fixSelectUserInfo() {
        document.querySelectorAll('*').forEach(el => {
            const vm = el.__vue__;
            if (!vm || !vm.$options || !vm.$options.methods) return;

            for (const methodName in vm.$options.methods) {
                const method = vm.$options.methods[methodName];

                if ((methodName === 'selectUserInfo' ||
                     method.toString().includes('selectUserInfo')) &&
                    method.toString().includes('nickName')) {

                    vm[methodName] = function() {
                        this.showName = fakeUser.nickName;
                        return Promise.resolve({
                            data: { data: fakeUser }
                        });
                    };

                    vm.$options.methods[methodName] = vm[methodName];
                }
            }
        });
    }

    // 立即删除所有FLA按钮
    function removeAllFlaButtons() {
        console.log('开始删除FLA按钮');

        let removedCount = 0;

        const allButtons = document.querySelectorAll('button');
        allButtons.forEach(button => {
            const text = button.textContent?.trim() || '';
            if (text.includes('FLA下载')) {
                button.setAttribute('data-removed-by-script', 'true');
                if (button.parentNode) {
                    button.parentNode.removeChild(button);
                    removedCount++;
                }
            }
        });

        console.log(`已删除 ${removedCount} 个FLA按钮`);

        document.querySelectorAll('*').forEach(element => {
            const text = element.textContent?.trim() || '';
            if (text === 'FLA下载' && element.tagName !== 'BUTTON') {
                element.style.display = 'none';
                element.setAttribute('data-hidden-by-script', 'true');
            }
        });
    }

    // 设置对话框处理
    function setupDialogHandler() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const dialog = node.classList?.contains('el-dialog__wrapper')
                                ? node
                                : node.querySelector?.('.el-dialog__wrapper.custom-dialog');

                            if (dialog) {
                                setTimeout(() => {
                                    processDialog(dialog);
                                }, 150);
                            }

                            checkForNewButtons(node);
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });

        document.querySelectorAll('.el-dialog__wrapper.custom-dialog').forEach(dialog => {
            processDialog(dialog);
        });
    }

    // 处理对话框
    function processDialog(dialog) {
        try {
            const footer = dialog.querySelector('.el-dialog__footer');
            if (!footer) return;

            const buttonContainer = footer.querySelector('.dialog-footer');
            if (!buttonContainer) return;

            removeFlaButtonsFromContainer(buttonContainer);
            addDirectDownloadButton(buttonContainer, dialog);

        } catch (e) {
            console.error('处理对话框错误:', e);
        }
    }

    // 从容器中删除FLA按钮
    function removeFlaButtonsFromContainer(container) {
        const buttons = container.querySelectorAll('button');
        buttons.forEach(button => {
            const text = button.textContent?.trim() || '';
            if (text.includes('FLA下载')) {
                console.log('删除对话框中的FLA按钮');
                button.setAttribute('data-removed-by-script', 'true');
                button.onclick = null;
                if (button.parentNode) {
                    button.parentNode.removeChild(button);
                }
            }
        });
    }

    // 添加直接下载按钮
    function addDirectDownloadButton(container, dialog) {
        if (container.querySelector('.direct-download-btn')) return;

        const templateButton = Array.from(container.querySelectorAll('button:not([data-removed-by-script])'))
            .find(btn => btn.textContent?.includes('下载'));

        if (!templateButton) {
            createNewDownloadButton(container, dialog);
            return;
        }

        const directBtn = templateButton.cloneNode(true);
        directBtn.classList.add('direct-download-btn');

        directBtn.removeAttribute('disabled');
        directBtn.classList.remove('is-disabled');
        directBtn.removeAttribute('_msthidden');
        directBtn.removeAttribute('_mstvisible');

        const textSpan = directBtn.querySelector('span');
        if (textSpan) {
            textSpan.textContent = '直接下载';
            textSpan.removeAttribute('_msttexthash');
            textSpan.removeAttribute('_msthash');
        }

        // 获取对话框标题作为文件名
        const dialogTitle = getDialogTitle(dialog);

        directBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('直接下载按钮点击，文件名:', dialogTitle);
            downloadMaterialWithBlob(dialogTitle);
            return false;
        };

        container.appendChild(directBtn);
        console.log('已添加直接下载按钮');
    }

    // 创建新的下载按钮
    function createNewDownloadButton(container, dialog) {
        const directBtn = document.createElement('button');
        directBtn.type = 'button';
        directBtn.className = 'el-button elemNone el-button--primary el-button--medium is-round direct-download-btn';
        directBtn.innerHTML = '<i class="el-icon-download"></i><span>直接下载</span>';

        const dialogTitle = getDialogTitle(dialog);

        directBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('直接下载按钮点击，文件名:', dialogTitle);
            downloadMaterialWithBlob(dialogTitle);
            return false;
        };

        container.appendChild(directBtn);
        console.log('已创建新的直接下载按钮');
    }

    // 获取对话框标题
    function getDialogTitle(dialog) {
        // 方法1: 从对话框标题元素获取
        const titleElement = dialog.querySelector('.el-dialog__title');
        if (titleElement) {
            const title = titleElement.textContent?.trim();
            if (title) {
                console.log('从标题元素获取文件名:', title);
                return title;
            }
        }

        // 方法2: 从aria-label属性获取
        const dialogEl = dialog.querySelector('.el-dialog');
        if (dialogEl) {
            const ariaLabel = dialogEl.getAttribute('aria-label');
            if (ariaLabel) {
                console.log('从aria-label获取文件名:', ariaLabel);
                return ariaLabel;
            }
        }

        // 方法3: 从Vue实例获取
        const vueInstance = dialog.__vue__;
        if (vueInstance && vueInstance.$props && vueInstance.$props.title) {
            console.log('从Vue实例获取文件名:', vueInstance.$props.title);
            return vueInstance.$props.title;
        }

        // 方法4: 从素材信息获取
        let materialTitle = null;
        document.querySelectorAll('*').forEach(el => {
            const vm = el.__vue__;
            if (!vm) return;

            if (vm.productList?.length) {
                const index = vm.carouselInitIndex || 0;
                const item = vm.productList[index];
                if (item && item.title) {
                    materialTitle = item.title;
                }
            }
        });

        if (materialTitle) {
            console.log('从素材信息获取文件名:', materialTitle);
            return materialTitle;
        }

        console.log('未找到文件名，使用默认名称');
        return '素材下载';
    }

    // 使用Blob方式下载素材
    function downloadMaterialWithBlob(fileName) {
        console.log('开始Blob下载，文件名:', fileName);

        // 先获取素材链接
        const materialUrl = getMaterialUrl();
        if (!materialUrl) {
            console.log('未找到素材链接');
            return;
        }

        console.log('下载链接:', materialUrl);

        // 获取文件扩展名
        const fileExtension = getFileExtension(materialUrl);
        const fullFileName = sanitizeFileName(fileName) + fileExtension;

        console.log('完整文件名:', fullFileName);

        // 使用GM_xmlhttpRequest下载
        if (typeof GM_xmlhttpRequest !== 'undefined') {
            console.log('使用GM_xmlhttpRequest下载');

            GM_xmlhttpRequest({
                method: 'GET',
                url: materialUrl,
                responseType: 'blob',
                onload: function(response) {
                    if (response.status === 200) {
                        const blob = response.response;
                        downloadBlob(blob, fullFileName);
                    } else {
                        console.error('下载失败，状态码:', response.status);
                        fallbackDownload(materialUrl, fullFileName);
                    }
                },
                onerror: function(error) {
                    console.error('GM_xmlhttpRequest下载错误:', error);
                    fallbackDownload(materialUrl, fullFileName);
                }
            });
        } else {
            // 回退到普通fetch
            fallbackDownload(materialUrl, fullFileName);
        }
    }

    // 获取素材链接
    function getMaterialUrl() {
        let material = null;

        document.querySelectorAll('*').forEach(el => {
            const vm = el.__vue__;
            if (!vm) return;

            if (vm.productList?.length) {
                const index = vm.carouselInitIndex || 0;
                if (vm.productList[index]) {
                    material = vm.productList[index];
                }
            }
        });

        if (!material) {
            console.log('未找到素材信息');
            return null;
        }

        return material.sourceUrl || material.url ||
               material.downloadUrl || material.link;
    }

    // 获取文件扩展名
    function getFileExtension(url) {
        try {
            // 从URL路径获取
            const pathname = new URL(url).pathname;
            const lastDotIndex = pathname.lastIndexOf('.');
            if (lastDotIndex !== -1) {
                return pathname.substring(lastDotIndex);
            }

            // 尝试从查询参数判断
            if (url.includes('.fla')) return '.fla';
            if (url.includes('.psd')) return '.psd';
            if (url.includes('.zip')) return '.zip';
            if (url.includes('.rar')) return '.rar';

            return '.fla'; // 默认FLA扩展名
        } catch (e) {
            return '.fla';
        }
    }

    // 清理文件名
    function sanitizeFileName(name) {
        // 移除非法字符
        return name.replace(/[<>:"/\\|?*]/g, '_')
                   .replace(/\s+/g, ' ')
                   .trim();
    }

    // 下载Blob文件
    function downloadBlob(blob, fileName) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();

        // 清理
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);

        console.log('Blob下载完成:', fileName);
    }

    // 回退下载方式
    function fallbackDownload(url, fileName) {
        console.log('使用回退方式下载:', url);

        if (window.fetch) {
            fetch(url)
                .then(response => {
                    if (response.ok) {
                        return response.blob();
                    }
                    throw new Error('网络响应不正常');
                })
                .then(blob => {
                    downloadBlob(blob, fileName);
                })
                .catch(error => {
                    console.error('fetch下载错误:', error);
                    // 最后回退到直接打开
                    window.open(url, '_blank');
                });
        } else {
            // 直接打开链接
            window.open(url, '_blank');
        }
    }

    // 持续监控防止FLA按钮重新出现
    function startFlaButtonMonitor() {
        const monitor = new MutationObserver((mutations) => {
            let foundFlaButton = false;

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            if (node.tagName === 'BUTTON') {
                                const text = node.textContent?.trim() || '';
                                if (text.includes('FLA下载')) {
                                    foundFlaButton = true;
                                }
                            }

                            const buttons = node.querySelectorAll?.('button') || [];
                            buttons.forEach(button => {
                                const text = button.textContent?.trim() || '';
                                if (text.includes('FLA下载')) {
                                    foundFlaButton = true;
                                }
                            });
                        }
                    });
                }
            });

            if (foundFlaButton) {
                console.log('检测到新出现的FLA按钮，立即删除');
                removeAllFlaButtons();
            }
        });

        monitor.observe(document.body, {
            childList: true,
            subtree: true
        });

        setInterval(() => {
            const flaButtons = Array.from(document.querySelectorAll('button'))
                .filter(btn => btn.textContent?.includes('FLA下载'));

            if (flaButtons.length > 0) {
                console.log(`定期检查发现 ${flaButtons.length} 个FLA按钮，正在删除`);
                removeAllFlaButtons();
            }
        }, 3000);

        console.log('FLA按钮监控已启动');
    }

    // 检查新出现的按钮
    function checkForNewButtons(node) {
        const buttons = node.querySelectorAll?.('button') || [];
        buttons.forEach(button => {
            const text = button.textContent?.trim() || '';
            if (text.includes('FLA下载')) {
                console.log('发现新FLA按钮，立即删除');
                button.setAttribute('data-removed-by-script', 'true');
                if (button.parentNode) {
                    button.parentNode.removeChild(button);
                }
            }
        });
    }

    // 阻止登录弹窗
    function blockLoginPopups() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            const text = node.textContent || '';
                            if (text.includes('登录') || text.includes('Login')) {
                                console.log('阻止登录弹窗');
                                const closeBtn = node.querySelector('.el-dialog__headerbtn, .el-icon-close');
                                if (closeBtn) {
                                    closeBtn.click();
                                } else {
                                    node.style.display = 'none';
                                }
                            }
                        }
                    });
                }
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
    }

    // 启动脚本
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                init();
                blockLoginPopups();
            }, 1000);
        });
    } else {
        setTimeout(() => {
            init();
            blockLoginPopups();
        }, 1000);
    }

})();