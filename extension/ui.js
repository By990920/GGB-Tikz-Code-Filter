/**
 * ui.js — GeoTikTrim 悬浮面板 UI 组件
 *
 * 可自由拖动的矩形面板，包含：
 *   - 标题 "GeoTikTrim"（拖动把手）
 *   - "复制" 按钮
 *   - 下拉选项按钮（过滤选项 checkbox + 项目链接）
 */

var GeoTikTrim = GeoTikTrim || {};

(function (ns) {
  'use strict';

  var PANEL_ID = 'geotiktrim-panel';
  var SETTINGS_KEY = 'tikzFilterSettings';
  var POSITION_KEY = 'tikzPanelPosition';
  var EXTENSION_ID = 'geotiktrim';

  var DEFAULT_SETTINGS = {
    includePoints: true,
    includeLabels: true,
    roundCoordinates: true
  };

  var currentSettings = Object.assign({}, DEFAULT_SETTINGS);
  var onCopyCallback = null;

  // ==================== 保存 / 加载 ====================

  function loadSettings(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(SETTINGS_KEY, function (result) {
        callback(result[SETTINGS_KEY] || {});
      });
    } else {
      callback({});
    }
  }

  ns.saveSettings = function (settings) {
    currentSettings = Object.assign({}, settings);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var data = {};
      data[SETTINGS_KEY] = currentSettings;
      chrome.storage.local.set(data);
    }
  };

  ns.getSettings = function () {
    return Object.assign({}, currentSettings);
  };

  function loadPosition(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(POSITION_KEY, function (result) {
        callback(result[POSITION_KEY] || null);
      });
    } else {
      callback(null);
    }
  }

  function savePosition(top, left) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var data = {};
      data[POSITION_KEY] = { top: top, left: left };
      chrome.storage.local.set(data);
    }
  }

  // ==================== 拖动 ====================

  function makeDraggable(panel, handle) {
    var startX, startY, startLeft, startTop;
    var dragging = false;

    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', function (e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL') return;
      e.preventDefault();
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = panel.offsetLeft;
      startTop = panel.offsetTop;
      handle.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      panel.style.left = (startLeft + dx) + 'px';
      panel.style.top = (startTop + dy) + 'px';
    });

    document.addEventListener('mouseup', function () {
      if (dragging) {
        dragging = false;
        handle.style.cursor = 'move';
        savePosition(panel.offsetTop, panel.offsetLeft);
      }
    });
  }

  // ==================== 构建 UI ====================

  function createPanel() {
    var panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.className = 'geotiktrim-panel';

    // 标题栏（拖动把手）
    var header = document.createElement('div');
    header.className = 'geotiktrim-header';
    var icon = document.createElement('img');
    icon.className = 'geotiktrim-header-icon';
    icon.src = chrome.runtime.getURL('icons/16.png');
    icon.width = 16;
    icon.height = 16;
    header.appendChild(icon);
    var title = document.createElement('span');
    title.textContent = 'GeoTikTrim';
    header.appendChild(title);

    // 拖动事件
    makeDraggable(panel, header);

    // 主体
    var body = document.createElement('div');
    body.className = 'geotiktrim-body';

    // 按钮行
    var btnRow = document.createElement('div');
    btnRow.className = 'geotiktrim-btn-row';

    // 复制按钮
    var copyBtn = document.createElement('button');
    copyBtn.id = 'geotiktrim-copy-btn';
    copyBtn.className = 'geotiktrim-copy-btn';
    copyBtn.textContent = '复制';
    copyBtn.disabled = true;
    copyBtn.addEventListener('click', function () {
      if (onCopyCallback) onCopyCallback(currentSettings);
    });

    // 选项下拉按钮
    var dropdownBtn = document.createElement('button');
    dropdownBtn.className = 'geotiktrim-dropdown-btn';
      dropdownBtn.textContent = '选项';
    dropdownBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var menu = document.getElementById('geotiktrim-dropdown');
      if (menu) {
        var isOpen = menu.classList.contains('geotiktrim-dropdown--open');
        closeDropdown();
        if (!isOpen) openDropdown();
      }
    });

    btnRow.appendChild(copyBtn);
    btnRow.appendChild(dropdownBtn);
    body.appendChild(btnRow);

    // 下拉菜单
    var dropdown = document.createElement('div');
    dropdown.id = 'geotiktrim-dropdown';
    dropdown.className = 'geotiktrim-dropdown';

    // 选项1
    dropdown.appendChild(createCheckbox('includePoints', '包含点标记', currentSettings.includePoints));
    // 选项2
    dropdown.appendChild(createCheckbox('includeLabels', '包含点标签', currentSettings.includeLabels));

    // 分隔线
    var divider = document.createElement('div');
    divider.className = 'geotiktrim-dropdown-divider';
    dropdown.appendChild(divider);

    // 项目链接
    var linkItem = document.createElement('a');
    linkItem.className = 'geotiktrim-dropdown-link';
    linkItem.href = 'https://gitee.com/Jack0920/ggb-tikz-code-filter';
    linkItem.target = '_blank';
    linkItem.textContent = '访问项目地址';
    dropdown.appendChild(linkItem);

    body.appendChild(dropdown);
    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // 点击外部关闭下拉
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target)) {
        closeDropdown();
      }
    });
  }

  function createCheckbox(id, labelText, checked) {
    var label = document.createElement('label');
    label.className = 'geotiktrim-dropdown-item';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'geotiktrim-checkbox';
    input.checked = checked;
    input.addEventListener('change', function () {
      currentSettings[id] = input.checked;
      ns.saveSettings(currentSettings);
    });

    var span = document.createElement('span');
    span.textContent = labelText;

    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  function openDropdown() {
    var menu = document.getElementById('geotiktrim-dropdown');
    var dropdownBtn = document.querySelector('.geotiktrim-dropdown-btn');
    if (menu) {
      menu.classList.add('geotiktrim-dropdown--open');
    }
    if (dropdownBtn) {
      dropdownBtn.textContent = '选项';
    }
  }

  function closeDropdown() {
    var menu = document.getElementById('geotiktrim-dropdown');
    var dropdownBtn = document.querySelector('.geotiktrim-dropdown-btn');
    if (menu) {
      menu.classList.remove('geotiktrim-dropdown--open');
    }
    if (dropdownBtn) {
    dropdownBtn.textContent = '选项';
    }
  }

  // ==================== 公开：初始化 ====================

  ns.initUI = function (onCopy) {
    onCopyCallback = onCopy;
    if (document.getElementById(PANEL_ID)) return;

    loadSettings(function (settings) {
      currentSettings = Object.assign({}, DEFAULT_SETTINGS, settings);
      createPanel();

      loadPosition(function (pos) {
        var panel = document.getElementById(PANEL_ID);
        if (pos && panel) {
          panel.style.top = pos.top + 'px';
          panel.style.left = pos.left + 'px';
          panel.style.right = 'auto';
        }
      });
    });
  };

})(GeoTikTrim);
