/**
 * content.js — GeoTikTrim 插件主入口
 *
 * 负责：
 *   1. 通过 <script src=...> 顺序注入 filter.js 和 inject.js 到页面上下文
 *   2. 创建 UI 面板（通过 ui.js）
 *   3. 监听 inject.js 的消息并显示 toast
 *   4. 超时检测 + 注入失败处理
 *
 * 注入策略：
 *   必须使用 <script src=chrome.runtime.getURL(...)>，
 *   因为 GeoGebra CSP 明确放行 chrome-extension:// 的外部脚本，
 *   但禁止内联脚本（textContent）。
 */

(function () {
  'use strict';

  var EXTENSION_ID = 'geotiktrim';
  var scriptsReady = false;
  var initTimeout = null;

  /**
   * 顺序注入脚本（<script src=...>）
   * 每个脚本加载完成后才加载下一个。
   * 若某个脚本加载失败，终止注入链并提示用户。
   */
  function injectScripts(sources) {
    var i = 0;

    function next() {
      if (i >= sources.length) return;

      var name = sources[i];
      var script = document.createElement('script');
      script.src = chrome.runtime.getURL(name);

      script.onload = function () {
        script.remove();
        i++;
        next();
      };

      script.onerror = function () {
        script.remove();
        console.error('[GeoTikTrim] 脚本加载失败: ' + name);
        GeoTikTrim.showToast(
          '\u2717 ' + name + ' 加载失败，请刷新页面重试',
          'error',
          6000
        );
        updateButtonFailed();
        // 终止注入链：不再加载后续脚本
      };

      (document.head || document.documentElement).appendChild(script);
    }

    next();
  }

  /**
   * 处理用户点击"复制 TikZ"按钮
   */
  function handleCopyClick(settings) {
    if (!scriptsReady) {
      GeoTikTrim.showToast('\u2717 脚本尚未就绪，请稍候再试', 'error', 2500);
      return;
    }
    window.postMessage({
      source: EXTENSION_ID,
      action: 'exportAndCopy',
      settings: settings
    }, '*');
  }

  /**
   * 按钮更新：就绪
   */
  function updateButtonReady() {
    var btn = document.getElementById('geotiktrim-copy-btn');
    if (btn) {
      btn.disabled = false;
        btn.textContent = '复制';
    }
  }

  /**
   * 按钮更新：加载失败
   */
  function updateButtonFailed() {
    if (initTimeout) clearTimeout(initTimeout);
    scriptsReady = false;
    var btn = document.getElementById('geotiktrim-copy-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '加载失败，请刷新';
    }
  }

  /**
   * 监听来自 inject.js 的消息
   */
  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== EXTENSION_ID) return;

    if (event.data.type === 'tikzResult') {
      if (event.data.success) {
        GeoTikTrim.showToast('\u2713 TikZ 代码已复制', 'success');
      } else {
        var errMsg = event.data.error || '未知错误';
        GeoTikTrim.showToast('\u2717 ' + errMsg, 'error', 4000);
      }
    }

    if (event.data.type === 'injectReady') {
      if (initTimeout) clearTimeout(initTimeout);
      scriptsReady = true;
      updateButtonReady();
    }
  });

  /**
   * 初始化
   */
  function init() {
    // 顺序注入：filter.js 先加载，成功后继续 inject.js
    injectScripts(['filter.js', 'inject.js']);

    // UI 面板
    GeoTikTrim.initUI(handleCopyClick);

    // 8 秒超时：若 injectReady 仍未到，提示失败
    initTimeout = setTimeout(function () {
      if (!scriptsReady) {
        console.error('[GeoTikTrim] 脚本就绪超时 (8s)');
        GeoTikTrim.showToast(
          '\u2717 脚本加载超时，请刷新页面重试',
          'error',
          6000
        );
        updateButtonFailed();
      }
    }, 8000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
