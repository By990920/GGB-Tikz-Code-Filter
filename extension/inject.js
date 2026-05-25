/**
 * inject.js — 页面上下文脚本
 *
 * 由 content.js 动态注入到 GeoGebra 页面中。
 * 可直接访问 window.ggbApplet 和 window.filterTikzCode。
 *
 * 通信方式：window.postMessage
 *   content.js → inject.js:  { source: 'geotiktrim', action: 'exportAndCopy', settings: {...} }
 *   inject.js → content.js:  { source: 'geotiktrim', type: 'tikzResult', success: bool, error?: string }
 */

(function () {
  'use strict';

  var EXTENSION_ID = 'geotiktrim';

  /**
   * 等待 ggbApplet 就绪
   * GeoGebra Classic 加载 ggbApplet 可能需要一些时间
   */
  function waitForGgbApplet(timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (window.ggbApplet && typeof window.ggbApplet.exportPGF === 'function') {
        resolve(window.ggbApplet);
        return;
      }

      var start = Date.now();
      var interval = setInterval(function () {
        if (window.ggbApplet && typeof window.ggbApplet.exportPGF === 'function') {
          clearInterval(interval);
          resolve(window.ggbApplet);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error('未找到 ggbApplet'));
        }
      }, 500);
    });
  }

  /**
   * 从 ggbApplet 获取原始 TikZ 代码
   */
  function exportPGF(ggbApplet) {
    return new Promise(function (resolve, reject) {
      try {
        ggbApplet.exportPGF(function (code) {
          if (code && typeof code === 'string') {
            resolve(code);
          } else {
            reject(new Error('TikZ 导出失败：返回空内容'));
          }
        });
      } catch (err) {
        reject(new Error('TikZ 导出失败：' + (err.message || err)));
      }
    });
  }

  /**
   * 复制文本到剪贴板
   */
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    // 回退方案
    return new Promise(function (resolve, reject) {
      try {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        var success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (success) {
          resolve();
        } else {
          reject(new Error('剪贴板写入失败'));
        }
      } catch (err) {
        reject(new Error('剪贴板写入失败：' + (err.message || err)));
      }
    });
  }

  /**
   * 向 content script 发送结果
   */
  function sendResult(success, errorMessage) {
    window.postMessage({
      source: EXTENSION_ID,
      type: 'tikzResult',
      success: success,
      error: errorMessage || null
    }, '*');
  }

  /**
   * 执行导出 → 过滤 → 复制 流程
   */
  function handleExportAndCopy(settings) {
    waitForGgbApplet(15000)
      .then(function (ggbApplet) {
        return exportPGF(ggbApplet);
      })
      .then(function (rawCode) {
        if (!window.filterTikzCode || typeof window.filterTikzCode !== 'function') {
          throw new Error('filterTikzCode 未加载');
        }
        var filtered = window.filterTikzCode(rawCode, settings);
        return filtered;
      })
      .then(function (filteredCode) {
        return copyToClipboard(filteredCode);
      })
      .then(function () {
        sendResult(true);
      })
      .catch(function (err) {
        console.error('[GeoTikTrim] 导出失败:', err);
        sendResult(false, err.message || '未知错误');
      });
  }

  /**
   * 监听来自 content script 的消息
   */
  window.addEventListener('message', function (event) {
    // 安全检查：只处理来自同一页面的消息
    if (event.source !== window) return;
    if (!event.data || event.data.source !== EXTENSION_ID) return;

    if (event.data.action === 'exportAndCopy') {
      var settings = event.data.settings || {};
      handleExportAndCopy(settings);
    }
  });

  // 通知 content script：inject.js 已加载
  window.postMessage({
    source: EXTENSION_ID,
    type: 'injectReady'
  }, '*');
})();
