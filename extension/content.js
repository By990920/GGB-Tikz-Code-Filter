/**
 * content.js — GeoTikTrim 插件主入口
 *
 * 负责：
 *   1. 顺序注入 filter.js, providers.js, prompt.js, inject.js 到页面上下文
 *   2. 创建 UI 面板（通过 ui.js）
 *   3. 处理截图粘贴 → AI识别流程
 *   4. 监听 inject.js 的消息并显示 toast
 *   5. 超时检测 + 注入失败处理
 */

(function () {
  'use strict';

  var EXTENSION_ID = 'geotiktrim';
  var scriptsReady = false;
  var initTimeout = null;
  var recognizing = false;

  var SCRIPT_LIST = ['filter.js', 'prompt.js', 'inject.js'];

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
      };

      (document.head || document.documentElement).appendChild(script);
    }

    next();
  }

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

  function handlePasteImageFromFile(file) {
    if (!file || !file.type.match(/^image\//)) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      var dataUrl = e.target.result;
      var match = dataUrl.match(/^data:(image\/\w+);base64,(.+)/);
      if (!match) return;
      var mimeType = match[1];
      var base64 = match[2];
      handlePasteImage(base64, mimeType);
    };
    reader.readAsDataURL(file);
  }

  function handlePasteImage(base64, mimeType) {
    if (!scriptsReady) {
      GeoTikTrim.showToast('\u2717 脚本尚未就绪，请稍候再试', 'error', 2500);
      return;
    }
    if (recognizing) {
      GeoTikTrim.showToast('\u2717 正在识别中，请稍候', 'error', 2000);
      return;
    }
    recognizing = true;
    GeoTikTrim.updateDropZone('loading');
    GeoTikTrim.updateDropZoneText('\u23F3 \u6B63\u5728\u4E0A\u4F20\u56FE\u7247\u5230 AI...');

    fetch(chrome.runtime.getURL('config.json'))
      .then(function (r) { return r.json(); })
      .then(function (config) {
        var model = config.model || 'qwen3.6-plus';
        var endpoint = config.endpoint || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
        var apiKey = config.apiKey;

        if (!apiKey) {
          throw new Error('\u8BF7\u5728 config.json \u4E2D\u914D\u7F6E API Key');
        }

        if (!endpoint) {
          throw new Error('\u8BF7\u5728 config.json \u4E2D\u914D\u7F6E API\u5730\u5740');
        }

        var prompt = window.GeoTikTrimPrompt || {
          system: '\u8BC6\u522B\u51E0\u4F55\u56FE\u5F62\u5E76\u8F93\u51FAGeoGebra\u6307\u4EE4',
          user: '\u8BF7\u8BC6\u522B\u56FE\u7247\u4E2D\u7684\u51E0\u4F55\u56FE\u5F62\u5E76\u8F93\u51FAGeoGebra\u6307\u4EE4'
        };

        var bodyObj = {
          model: model,
          messages: [
            { role: 'system', content: prompt.system },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } },
                { type: 'text', text: prompt.user }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };

        Object.keys(config).forEach(function (key) {
          if (key !== 'model' && key !== 'endpoint' && key !== 'apiKey') {
            bodyObj[key] = config[key];
          }
        });

        GeoTikTrim.updateDropZoneText('\u23F3 AI \u8BC6\u522B\u4E2D\uFF0C\u8BF7\u7A0D\u5019...');

        return new Promise(function (resolve, reject) {
          chrome.runtime.sendMessage({
            action: 'fetchAI',
            url: endpoint,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + apiKey
            },
            body: JSON.stringify(bodyObj)
          }, function (response) {
            if (!response) {
              reject(new Error('API\u8BF7\u6C42\u5931\u8D25'));
              return;
            }
            if (!response.success) {
              reject(new Error(response.error || '\u8BC6\u522B\u5931\u8D25'));
              return;
            }
            resolve(response.data);
          });
        });
      })
      .then(function (data) {
        recognizing = false;
        GeoTikTrim.updateDropZoneText('\u23F3 \u6B63\u5728\u89E3\u6790\u8BC6\u522B\u7ED3\u679C...');
        var commands = parseCommandsFromResponse(data);
        GeoTikTrim.updateDropZone('success');
        GeoTikTrim.updateDropZoneText('\u23F3 \u6B63\u5728\u6CE8\u5165 ' + commands.length + ' \u6761\u6307\u4EE4\u5230 GeoGebra...');

        window.postMessage({
          source: EXTENSION_ID,
          action: 'injectCommands',
          commands: commands
        }, '*');
      })
      .catch(function (err) {
        recognizing = false;
        GeoTikTrim.showToast('\u2717 ' + err.message, 'error', 5000);
        GeoTikTrim.updateDropZone('error');
        GeoTikTrim.updateDropZoneText('\u2717 \u5931\u8D25');
        console.error('[GeoTikTrim] \u8BC6\u522B\u5931\u8D25:', err);
      });
  }

  function parseCommandsFromResponse(json) {
    if (!json.choices || json.choices.length === 0) {
      throw new Error('AI未返回有效结果');
    }
    var content = json.choices[0].message.content;

    console.log('[GeoTikTrim] AI原始响应:', content);

    // 策略1: 先尝试 JSON 格式 {"commands": [...]}
    var clean = content
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/^\s*json\s*\n/i, '')
      .trim();

    var parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      var jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try { parsed = JSON.parse(jsonMatch[0]); } catch (e2) {}
      }
    }

    if (parsed && parsed.commands && Array.isArray(parsed.commands) && parsed.commands.length > 0) {
      console.log('[GeoTikTrim] JSON解析得到 ' + parsed.commands.length + ' 条指令');
      return parsed.commands;
    }

    // 策略2: 纯文本格式，按行解析
    var lines = content.split('\n');
    var commands = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].replace(/^\d+[\.\、\)]\s*/, '').trim();
      if (!line) continue;
      if (line.length < 3) continue;
      if (/^(以下是|输出|生成|指令|命令|GeoGebra|第一条|第二条|第三步)/i.test(line)) continue;
      if (/^[\/\*#-]/.test(line)) continue;
      commands.push(line);
    }

    if (commands.length === 0) {
      throw new Error('无法解析AI返回的指令格式，查看控制台获取原始内容');
    }

    console.log('[GeoTikTrim] 文本解析得到 ' + commands.length + ' 条指令');
    return commands;
  }

  function updateButtonReady() {
    var btn = document.getElementById('geotiktrim-copy-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '\u590D\u5236 TikZ';
    }
  }

  function updateButtonFailed() {
    if (initTimeout) clearTimeout(initTimeout);
    scriptsReady = false;
    var btn = document.getElementById('geotiktrim-copy-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = '\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u5237\u65B0';
    }
  }

  window.addEventListener('message', function (event) {
    if (event.source !== window) return;
    if (!event.data || event.data.source !== EXTENSION_ID) return;

    if (event.data.type === 'tikzResult') {
      if (event.data.success) {
        GeoTikTrim.showToast('\u2713 TikZ \u4EE3\u7801\u5DF2\u590D\u5236', 'success');
      } else {
        var errMsg = event.data.error || '\u672A\u77E5\u9519\u8BEF';
        GeoTikTrim.showToast('\u2717 ' + errMsg, 'error', 4000);
      }
    }

    if (event.data.type === 'injectReady') {
      if (initTimeout) clearTimeout(initTimeout);
      scriptsReady = true;
      updateButtonReady();
    }

    if (event.data.type === 'commandResult') {
      if (event.data.success) {
        GeoTikTrim.updateDropZoneText('\u8BC6\u522B\u6210\u529F');
        GeoTikTrim.updateDropZone('success');
      } else {
        GeoTikTrim.showToast('\u2717 \u6307\u4EE4\u6CE8\u5165\u5931\u8D25: ' + (event.data.error || ''), 'error', 4000);
        GeoTikTrim.updateDropZone('error');
        GeoTikTrim.updateDropZoneText('\u2717 \u6CE8\u5165\u5931\u8D25');
      }
    }
  });

  function init() {
    injectScripts(SCRIPT_LIST);

    GeoTikTrim.initUI(handleCopyClick, handlePasteImage);

    // 全局粘贴监听：用户在任何地方 Ctrl+V 如果包含图片就触发识别
    document.addEventListener('paste', function (e) {
      if (recognizing) return;
      var target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          e.stopPropagation();
          handlePasteImageFromFile(items[i].getAsFile());
          return;
        }
      }
    }, true);

    initTimeout = setTimeout(function () {
      if (!scriptsReady) {
        console.error('[GeoTikTrim] 脚本就绪超时 (8s)');
        GeoTikTrim.showToast(
          '\u2717 \u811A\u672C\u52A0\u8F7D\u8D85\u65F6\uFF0C\u8BF7\u5237\u65B0\u9875\u9762\u91CD\u8BD5',
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
