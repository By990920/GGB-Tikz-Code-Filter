/**
 * inject.js — 页面上下文脚本
 *
 * 由 content.js 动态注入到 GeoGebra 页面中。
 * 可直接访问 window.ggbApplet 和 window.filterTikzCode。
 *
 * 通信方式：window.postMessage
 *   content.js → inject.js:
 *     { source: 'geotiktrim', action: 'exportAndCopy', settings: {...} }
 *     { source: 'geotiktrim', action: 'injectCommands', commands: [...] }
 *   inject.js → content.js:
 *     { source: 'geotiktrim', type: 'tikzResult', success: bool, error?: string }
 *     { source: 'geotiktrim', type: 'commandResult', success: bool, count?: number, error?: string }
 */

(function () {
  'use strict';

  var EXTENSION_ID = 'geotiktrim';

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

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
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

  function sendResult(success, errorMessage) {
    window.postMessage({
      source: EXTENSION_ID,
      type: 'tikzResult',
      success: success,
      error: errorMessage || null
    }, '*');
  }

  function sendCommandResult(success, count, errorMessage) {
    window.postMessage({
      source: EXTENSION_ID,
      type: 'commandResult',
      success: success,
      count: count || 0,
      error: errorMessage || null
    }, '*');
  }

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

  function handleInjectCommands(commands) {
    waitForGgbApplet(15000)
      .then(function (ggbApplet) {
        if (!Array.isArray(commands) || commands.length === 0) {
          throw new Error('指令列表为空');
        }

        var successCount = 0;
        for (var i = 0; i < commands.length; i++) {
          var cmd = commands[i];
          if (!cmd || !cmd.trim()) continue;
          try {
            ggbApplet.evalCommand(cmd.trim());
            successCount++;
          } catch (cmdErr) {
            console.warn('[GeoTikTrim] 指令执行失败: ' + cmd + ' - ' + (cmdErr.message || cmdErr));
          }
        }

        if (successCount > 0) {
          sendCommandResult(true, successCount);
        } else {
          throw new Error('所有指令执行失败');
        }
      })
      .catch(function (err) {
        console.error('[GeoTikTrim] 指令注入失败:', err);
        sendCommandResult(false, 0, err.message || '未知错误');
      });
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== EXTENSION_ID) return;

    if (event.data.action === 'exportAndCopy') {
      var settings = event.data.settings || {};
      handleExportAndCopy(settings);
    }

    if (event.data.action === 'injectCommands') {
      var commands = event.data.commands || [];
      handleInjectCommands(commands);
    }
  });

  window.postMessage({
    source: EXTENSION_ID,
    type: 'injectReady'
  }, '*');
})();
