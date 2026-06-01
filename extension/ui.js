/**
 * ui.js — GeoTikTrim 悬浮面板 UI 组件
 *
 * 矩形可拖动漫版，包含：
 *   - 标题 "GeoTikTrim"（拖动把手）
 *   - 虚线粘贴区（截图识别入口）
 *   - 状态指示
 *   - "复制 TikZ" 按钮
 *   - "设置" 按钮（AI提供商 + API Key + 过滤选项）
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
  var onPasteCallback = null;

  // ==================== 存储 ====================

  function storageGet(key, callback) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(key, function (result) {
        callback(result[key] || null);
      });
    } else {
      callback(null);
    }
  }

  function storageSet(key, value) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      var data = {};
      data[key] = value;
      chrome.storage.local.set(data);
    }
  }

  function loadSettings(callback) {
    storageGet(SETTINGS_KEY, function (saved) {
      callback(saved || {});
    });
  }

  ns.saveSettings = function (settings) {
    currentSettings = Object.assign({}, settings);
    storageSet(SETTINGS_KEY, currentSettings);
  };

  ns.getSettings = function () {
    return Object.assign({}, currentSettings);
  };

  function loadPosition(callback) {
    storageGet(POSITION_KEY, function (pos) {
      callback(pos || null);
    });
  }

  function savePosition(top, left) {
    storageSet(POSITION_KEY, { top: top, left: left });
  }

  // ==================== 拖动 ====================

  function makeDraggable(panel, handle) {
    var startX, startY, startLeft, startTop;
    var dragging = false;

    handle.style.cursor = 'move';
    handle.addEventListener('mousedown', function (e) {
      if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' ||
          e.target.tagName === 'INPUT' || e.target.tagName === 'LABEL' ||
          e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
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

    // 标题栏
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

    makeDraggable(panel, header);

    // 主体
    var body = document.createElement('div');
    body.className = 'geotiktrim-body';

    // === 粘贴区 ===
    var dropZone = createDropZone();
    body.appendChild(dropZone);

    // === 按钮行 ===
    var btnRow = document.createElement('div');
    btnRow.className = 'geotiktrim-btn-row';

    var copyBtn = document.createElement('button');
    copyBtn.id = 'geotiktrim-copy-btn';
    copyBtn.className = 'geotiktrim-btn geotiktrim-btn-primary';
    copyBtn.textContent = '\u590D\u5236 TikZ';
    copyBtn.disabled = true;
    copyBtn.addEventListener('click', function () {
      if (onCopyCallback) onCopyCallback(currentSettings);
    });

    var settingsBtn = document.createElement('button');
    settingsBtn.id = 'geotiktrim-settings-btn';
    settingsBtn.className = 'geotiktrim-btn geotiktrim-btn-secondary';
    settingsBtn.textContent = '\u2699';
    settingsBtn.title = '\u8BBE\u7F6E';
    settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      toggleSettingsPanel();
    });

    btnRow.appendChild(copyBtn);
    btnRow.appendChild(settingsBtn);
    body.appendChild(btnRow);

    // === 设置面板 ===
    var settingsPanel = createSettingsPanel();
    body.appendChild(settingsPanel);

    panel.appendChild(header);
    panel.appendChild(body);
    document.body.appendChild(panel);

    // 点击外部关闭设置
    document.addEventListener('click', function (e) {
      if (!panel.contains(e.target)) {
        closeSettingsPanel();
      }
    });
  }

  // ==================== 粘贴区 ====================

  function createDropZone() {
    var zone = document.createElement('div');
    zone.id = 'geotiktrim-dropzone';
    zone.className = 'geotiktrim-dropzone';

    var inner = document.createElement('div');
    inner.className = 'geotiktrim-dropzone-inner';

    var iconEl = document.createElement('span');
    iconEl.className = 'geotiktrim-dropzone-icon';
    iconEl.innerHTML = '\u{1F4F7}';

    var textEl = document.createElement('span');
    textEl.className = 'geotiktrim-dropzone-text';
    textEl.textContent = '\u7C98\u8D34\u622A\u56FE\u2002Ctrl+V';

    var hintEl = document.createElement('span');
    hintEl.className = 'geotiktrim-dropzone-hint';
    hintEl.textContent = '\u652F\u6301\u4E0A\u4F20\u3001\u62D6\u62FD\u6216\u7C98\u8D34';

    inner.appendChild(iconEl);
    inner.appendChild(textEl);
    inner.appendChild(hintEl);
    zone.appendChild(inner);

    // 点击上传
    zone.addEventListener('click', function (e) {
      if (zone.classList.contains('geotiktrim-dropzone--loading')) return;
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) {
          handleImagePaste(input.files[0]);
        }
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    });

    // 拖拽
    zone.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.add('geotiktrim-dropzone--dragover');
    });

    zone.addEventListener('dragleave', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('geotiktrim-dropzone--dragover');
    });

    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      zone.classList.remove('geotiktrim-dropzone--dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleImagePaste(e.dataTransfer.files[0]);
      }
    });

    return zone;
  }

  // ==================== 图像处理 ====================

  function handleImagePaste(file) {
    if (!file.type.match(/^image\/(png|jpeg|jpg|gif|bmp|webp)$/)) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function processImage(dataUrl) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var maxDim = 1280;
      var width = img.width;
      var height = img.height;

      if (width > maxDim || height > maxDim) {
        var scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      var resized;
      try {
        resized = canvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        resized = canvas.toDataURL('image/png');
      }

      // 提取 base64
      var base64 = resized.replace(/^data:image\/\w+;base64,/, '');
      var mimeType = resized.match(/^data:(image\/\w+);base64,/) || ['', 'image/png'];
      mimeType = mimeType[1];

      ns.updateDropZone('loading');
      ns.updateDropZoneText('\u23F3 \u8BC6\u522B\u4E2D...');

      if (typeof onPasteCallback === 'function') {
        onPasteCallback(base64, mimeType);
      }
    };
    img.src = dataUrl;
  }

  // ==================== 设置面板 ====================

  function createSettingsPanel() {
    var panel = document.createElement('div');
    panel.id = 'geotiktrim-settings';
    panel.className = 'geotiktrim-settings';

    // 过滤选项
    var filterLabel = document.createElement('div');
    filterLabel.className = 'geotiktrim-settings-label';
    filterLabel.textContent = '过滤选项';

    var includePoints = createCheckbox('includePoints', '包含点标记', currentSettings.includePoints);
    var includeLabels = createCheckbox('includeLabels', '包含点标签', currentSettings.includeLabels);

    includePoints.querySelector('input').addEventListener('change', function () {
      currentSettings.includePoints = this.checked;
      ns.saveSettings(currentSettings);
    });
    includeLabels.querySelector('input').addEventListener('change', function () {
      currentSettings.includeLabels = this.checked;
      ns.saveSettings(currentSettings);
    });

    panel.appendChild(filterLabel);
    panel.appendChild(includePoints);
    panel.appendChild(includeLabels);

    return panel;
  }

  function createCheckbox(id, labelText, checked) {
    var label = document.createElement('label');
    label.className = 'geotiktrim-dropdown-item';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'geotiktrim-checkbox';
    input.id = 'geotiktrim-cb-' + id;
    input.checked = checked;

    var span = document.createElement('span');
    span.textContent = labelText;

    label.appendChild(input);
    label.appendChild(span);
    return label;
  }

  function toggleSettingsPanel() {
    var settings = document.getElementById('geotiktrim-settings');
    if (!settings) return;

    if (settings.classList.contains('geotiktrim-settings--open')) {
      closeSettingsPanel();
    } else {
      var cbP = document.querySelector('#geotiktrim-cb-includePoints');
      var cbL = document.querySelector('#geotiktrim-cb-includeLabels');
      if (cbP) cbP.checked = currentSettings.includePoints;
      if (cbL) cbL.checked = currentSettings.includeLabels;
      settings.classList.add('geotiktrim-settings--open');
    }
  }

  function closeSettingsPanel() {
    var settings = document.getElementById('geotiktrim-settings');
    if (settings) {
      settings.classList.remove('geotiktrim-settings--open');
    }
  }

  // ==================== 公开API ====================

  ns.updateDropZone = function (state) {
    var zone = document.getElementById('geotiktrim-dropzone');
    if (!zone) return;
    zone.classList.remove('geotiktrim-dropzone--loading', 'geotiktrim-dropzone--success', 'geotiktrim-dropzone--error');
    if (state) {
      zone.classList.add('geotiktrim-dropzone--' + state);
    }
  };

  ns.updateDropZoneText = function (text) {
    var textEl = document.querySelector('.geotiktrim-dropzone-text');
    if (textEl) textEl.textContent = text;
  };

  ns.resetDropZoneText = function () {
    var textEl = document.querySelector('.geotiktrim-dropzone-text');
    if (textEl) textEl.textContent = '\u7C98\u8D34\u622A\u56FE\u2002Ctrl+V';
  };

  ns.setCopyButtonEnabled = function (enabled) {
    var btn = document.getElementById('geotiktrim-copy-btn');
    if (btn) {
      btn.disabled = !enabled;
      if (!enabled) {
        btn.textContent = '加载中...';
      } else {
        btn.textContent = '复制 TikZ';
      }
    }
  };

  ns.initUI = function (onCopy, onPaste) {
    onCopyCallback = onCopy;
    onPasteCallback = onPaste;
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
