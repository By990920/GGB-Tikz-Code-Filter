/**
 * background.js — Service Worker
 *
 * 作为 fetch 代理，绕过 CORS 限制调用 AI API。
 * 仅处理来自 content script 的 fetch 请求。
 */

(function () {
  'use strict';

  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action !== 'fetchAI') return;

    fetch(request.url, {
      method: 'POST',
      headers: request.headers,
      body: request.body
    })
      .then(function (res) {
        if (!res.ok) {
          return res.text().then(function (text) {
            throw new Error('HTTP ' + res.status + ': ' + text.slice(0, 300));
          });
        }
        return res.json();
      })
      .then(function (json) {
        sendResponse({ success: true, data: json });
      })
      .catch(function (err) {
        sendResponse({ success: false, error: err.message || 'API请求失败' });
      });

    return true;
  });
})();
