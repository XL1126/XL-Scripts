// ==UserScript==
// @name         橙皮素材破解脚本
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  可以免费下载橙皮素材网的所有素材
// @author       为人民服务
// @match        https://www.chengpisc.com/svip
// @grant        none
// @run-at       document-end
// ==/UserScript==

//---------------------------------------------------------------------------------------------
// 素材网：https://www.chengpisc.com/svip
// 这个脚本会在右下角增加一个按钮，很明显，点击后会进入登录状态（也就是假登录）
// 进入假登录状态后随便点一个素材就可以下载了
// 注意：不要点击下载图片按钮，点击下载图片按钮后假登录状态会失效，需要再次点击右下角的按钮
//---------------------------------------------------------------------------------------------
// 这个网页的制作者连复杂一点的都不会，登录状态随便改改就没了，这个素材网的破解脚本是这几个破解
// 脚本里面最小的。伪造一个登录状态就行。
// 原本我以为有多了不起呢
//---------------------------------------------------------------------------------------------

(function() {
    'use strict';

    // 只在这个特定页面执行
    if (!window.location.href.includes('https://www.chengpisc.com/svip')) {
        return;
    }

    console.log('橙皮素材破解脚本已加载');

    // 主函数：查找并修改Vue实例
    function modifyVueInstances() {
        let vueInstances = [];

        console.log('正在查找并修改Vue实例...');

        // 查找所有包含__vue__属性的元素
        document.querySelectorAll('*').forEach(el => {
            if (el.__vue__) {
                vueInstances.push(el.__vue__);

                // 递归查找所有子组件
                const findVueInstances = (instance) => {
                    if (instance.$children) {
                        instance.$children.forEach(child => {
                            vueInstances.push(child);
                            findVueInstances(child);
                        });
                    }
                };
                findVueInstances(el.__vue__);
            }
        });

        // 去重
        vueInstances = [...new Set(vueInstances)];

        let modifiedCount = 0;

        // 修改找到的Vue实例
        vueInstances.forEach(vm => {
            try {
                let modified = false;

                if (vm.userInfo && typeof vm.userInfo === 'object') {
                    vm.userInfo.token = 'fake-token';
                    vm.userInfo.dialogVisible = false;
                    modified = true;
                }

                if (vm.loginParams && typeof vm.loginParams === 'object') {
                    vm.loginParams.token = 'fake-token';
                    vm.loginParams.dialogVisible = false;
                    modified = true;
                }

                if (vm.$set && vm.isLoggedIn === false) {
                    vm.$set(vm, 'isLoggedIn', true);
                    modified = true;
                } else if (vm.isLoggedIn === false) {
                    vm.isLoggedIn = true;
                    modified = true;
                }

                if (modified) {
                    modifiedCount++;
                }
            } catch (error) {
                console.warn('修改Vue实例时出错:', error);
            }
        });

        console.log(`修改完成，影响了 ${modifiedCount} 个实例`);
        return modifiedCount;
    }

    // 创建简洁按钮
    function createButton() {
        // 如果按钮已存在，先移除
        const existingButton = document.getElementById('vue-modify-btn');
        if (existingButton) {
            existingButton.remove();
        }

        // 创建按钮
        const button = document.createElement('button');
        button.id = 'vue-modify-btn';
        button.innerHTML = '🔓';
        button.title = '修改登录状态';

        // 按钮样式
        button.style.cssText = `
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 99999;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #6A11CB 0%, #2575FC 100%);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            box-shadow: 0 4px 20px rgba(106, 17, 203, 0.4);
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            outline: none;
            user-select: none;
        `;

        // 点击效果
        button.addEventListener('click', function() {
            // 点击动画
            button.style.transform = 'scale(0.9)';
            button.style.boxShadow = '0 2px 10px rgba(106, 17, 203, 0.3)';

            // 执行修改
            const count = modifyVueInstances();

            // 成功反馈
            if (count > 0) {
                button.style.background = 'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)';
                button.innerHTML = '✅';

                // 1秒后恢复
                setTimeout(() => {
                    button.style.background = 'linear-gradient(135deg, #6A11CB 0%, #2575FC 100%)';
                    button.innerHTML = '🔓';
                }, 1000);
            } else {
                button.style.background = 'linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)';
                button.innerHTML = '❌';

                // 1秒后恢复
                setTimeout(() => {
                    button.style.background = 'linear-gradient(135deg, #6A11CB 0%, #2575FC 100%)';
                    button.innerHTML = '🔓';
                }, 1000);
            }

            // 恢复按钮状态
            setTimeout(() => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '0 4px 20px rgba(106, 17, 203, 0.4)';
            }, 200);
        });

        // 悬停效果
        button.addEventListener('mouseover', function() {
            button.style.transform = 'scale(1.1)';
            button.style.boxShadow = '0 6px 25px rgba(106, 17, 203, 0.5)';
        });

        button.addEventListener('mouseout', function() {
            if (!button.isAnimating) {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = '0 4px 20px rgba(106, 17, 203, 0.4)';
            }
        });

        // 添加到页面
        document.body.appendChild(button);

        // 初始动画
        setTimeout(() => {
            button.style.opacity = '0';
            button.style.transform = 'translateY(20px) scale(0.8)';

            setTimeout(() => {
                button.style.transition = 'opacity 0.4s ease, transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                button.style.opacity = '1';
                button.style.transform = 'translateY(0) scale(1)';
            }, 100);
        }, 500);

        return button;
    }

    // 等待页面加载完成后添加按钮
    function init() {
        if (document.body) {
            createButton();
        } else {
            setTimeout(init, 100);
        }
    }

    // 页面加载完成后执行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // 监听页面变化（针对SPA）
    let lastUrl = location.href;
    const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl && url.includes('https://www.chengpisc.com/svip')) {
            lastUrl = url;
            setTimeout(createButton, 300);
        }
    });

    observer.observe(document, { subtree: true, childList: true });

    // 添加全局样式
    const style = document.createElement('style');
    style.textContent = `
        #vue-modify-btn:hover::after {
            content: attr(title);
            position: absolute;
            bottom: 70px;
            right: 0;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
        }

        #vue-modify-btn:active {
            transition: transform 0.1s ease;
        }
    `;
    document.head.appendChild(style);

})();