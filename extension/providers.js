/**
 * providers.js — 国内AI视觉模型提供商配置
 *
 * 统一使用 OpenAI-compatible chat completions 格式。
 * 用户只需选择提供商 + 填入 API Key 即可使用。
 */

(function () {
  'use strict';

  var PROVIDERS = {
    qwen: {
      name: '阿里云通义千问',
      model: 'qwen-vl-max',
      endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      headers: function (apiKey) {
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        };
      },
      buildBody: function (base64Image, mimeType, prompt) {
        return {
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64Image } },
                { type: 'text', text: prompt.user }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };
      },
      parseResponse: parseOpenAIResponse
    },

    glm: {
      name: '智谱AI (GLM-4.6V-Flash)',
      model: 'GLM-4.6V-Flash',
      endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      headers: function (apiKey) {
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        };
      },
      buildBody: function (base64Image, mimeType, prompt) {
        return {
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64Image } },
                { type: 'text', text: prompt.user }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };
      },
      parseResponse: parseOpenAIResponse
    },

    deepseek: {
      name: 'DeepSeek',
      model: 'deepseek-chat',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
      headers: function (apiKey) {
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        };
      },
      buildBody: function (base64Image, mimeType, prompt) {
        return {
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64Image } },
                { type: 'text', text: prompt.user }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };
      },
      parseResponse: parseOpenAIResponse
    },

    baidu: {
      name: '百度文心 (ERNIE)',
      model: 'ernie-4.0-turbo-8k',
      endpoint: 'https://qianfan.baidubce.com/v2/chat/completions',
      headers: function (apiKey) {
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        };
      },
      buildBody: function (base64Image, mimeType, prompt) {
        return {
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64Image } },
                { type: 'text', text: prompt.user }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };
      },
      parseResponse: parseOpenAIResponse
    },

    spark: {
      name: '讯飞星火',
      model: 'spark-lite',
      endpoint: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
      headers: function (apiKey) {
        return {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + apiKey
        };
      },
      buildBody: function (base64Image, mimeType, prompt) {
        return {
          model: this.model,
          messages: [
            { role: 'system', content: prompt.system },
            {
              role: 'user',
              content: [
                { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64Image } },
                { type: 'text', text: prompt.user }
              ]
            }
          ],
          max_tokens: 4096,
          temperature: 0.1
        };
      },
      parseResponse: parseOpenAIResponse
    }
  };

  function parseOpenAIResponse(json) {
    if (!json.choices || json.choices.length === 0) {
      throw new Error('AI未返回有效结果');
    }
    var content = json.choices[0].message.content;
    return extractCommands(content);
  }

  function extractCommands(text) {
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    var jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法解析AI返回的指令格式');
    }

    var parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      throw new Error('AI返回的JSON格式无效: ' + e.message);
    }

    if (!parsed.commands || !Array.isArray(parsed.commands) || parsed.commands.length === 0) {
      throw new Error('AI未返回有效的GeoGebra指令');
    }

    return parsed.commands;
  }

  window.GeoTikTrimProviders = {
    PROVIDERS: PROVIDERS,
    getProvider: function (key) {
      return PROVIDERS[key] || null;
    },
    getProviderKeys: function () {
      return Object.keys(PROVIDERS);
    },
    getProviderName: function (key) {
      var p = PROVIDERS[key];
      return p ? p.name : key;
    }
  };
})();
