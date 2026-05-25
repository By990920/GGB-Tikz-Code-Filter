/**
 * toast.js — Toast 通知组件
 *
 * 在页面右下角显示临时通知消息。
 * 用法：showToast(message, type)
 *   type: 'success' | 'error'
 */

var GeoTikTrim = GeoTikTrim || {};

(function (ns) {
  'use strict';

  var TOAST_ID = 'geotiktrim-toast';
  var toastTimer = null;

  /**
   * 获取或创建 toast DOM 元素
   */
  function getToastEl() {
    var el = document.getElementById(TOAST_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = TOAST_ID;
      el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    return el;
  }

  /**
   * 显示 toast 通知
   * @param {string} message 消息文本
   * @param {string} type 'success' | 'error'
   * @param {number} duration 显示时长（毫秒），默认 2500
   */
  function showToast(message, type, duration) {
    type = type || 'success';
    duration = duration || 2500;

    var toast = getToastEl();

    // 清除之前的定时器
    if (toastTimer) {
      clearTimeout(toastTimer);
    }

    // 移除旧状态
    toast.classList.remove('geotiktrim-toast--success', 'geotiktrim-toast--error', 'geotiktrim-toast--visible');

    // 强制回流后添加新状态（确保动画重播）
    void toast.offsetWidth;

    toast.textContent = message;
    toast.classList.add('geotiktrim-toast--' + type);
    toast.classList.add('geotiktrim-toast--visible');

    toastTimer = setTimeout(function () {
      toast.classList.remove('geotiktrim-toast--visible');
    }, duration);
  }

  ns.showToast = showToast;
})(GeoTikTrim);
