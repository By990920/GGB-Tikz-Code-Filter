# GeoTikTrim-AI-Prompt

## ⚠️ 核心逻辑同步提醒

TikZ 过滤核心逻辑存在于**两处**，修改时需**同步更新**：

| 位置 | 文件 | 用途 |
|------|------|------|
| 浏览器插件 | `extension/filter.js` | 纯函数模块，导出 `window.filterTikzCode(code, settings)` |
| 网页版 | `GGB-Tikz-Code-Filter.html` 内 `<script>` 标签 | 内联 JavaScript，`cleanTikZCode()` 函数 |

**修改顺序建议**：先改 `extension/filter.js`（独立模块、易测试），再将逻辑同步到网页版 HTML。

---

## 🚀 浏览器扩展架构

扩展由多个 JS 文件 + CSS 组成：

```
extension/
├── manifest.json    # Manifest V3，声明权限和入口
├── background.js    # Service Worker，代理 AI API 请求
├── content.js       # 入口：注入脚本 + UI 初始化 + AI 识别流程 + 通信桥接
├── inject.js        # 页面上下文：访问 ggbApplet API
├── filter.js        # 核心：TikZ 过滤逻辑（纯函数）
├── prompt.js        # AI 视觉识别提示词模板
├── ui.js            # UI：悬浮面板 + 设置面板 + 粘贴区
├── toast.js         # UI：Toast 通知
├── config.json      # AI 配置（模型、端点、Key、扩展参数）
└── style.css        # 样式：毛玻璃 + 深/浅色自适应
```

**通信流程**：

### TikZ 导出流程
1. `content.js` 顺序注入 `filter.js` → `prompt.js` → `inject.js` 到 GeoGebra 页面
2. 用户点击"复制 TikZ" → `content.js` 通过 `postMessage` 发 `exportAndCopy` 到 `inject.js`
3. `inject.js` 调用 `ggbApplet.exportPGF()` 获取原始代码
4. `inject.js` 调用 `window.filterTikzCode(rawCode, settings)` 过滤
5. 过滤结果复制到剪贴板，`inject.js` 回传 `tikzResult` 给 `content.js`
6. `content.js` 显示 Success/Error Toast

### 截图识别流程（新增）
1. 用户 Ctrl+V 或粘贴/拖拽截图到虚线框
2. `content.js` 读取 `config.json` 获取 AI 配置（model/endpoint/apiKey）
3. `content.js` 通过 `chrome.runtime.sendMessage` 将请求转发给 `background.js`
4. `background.js` 调用 AI API（绕过 CORS）
5. AI 返回 GeoGebra 指令
6. `content.js` 解析指令，通过 `postMessage` 发送 `injectCommands` 到 `inject.js`
7. `inject.js` 调用 `ggbApplet.evalCommand()` 逐条注入指令
8. 图形出现在 GeoGebra 画布，用户可微调后导出 TikZ

---

## 🎯 核心目标

您需要维护和扩展这个 TikZ 代码清理工具，它能：
1. 将 GeoGebra 导出的冗余 TikZ 代码转换为简洁、可读的手写风格代码
2. 通过 AI 视觉识别，将几何图形截图自动转换为 GeoGebra 指令

## 📋 现有功能概览

### 1. TikZ 过滤功能

#### 基本框架
- **插件版入口函数**：`window.filterTikzCode(code, settings)` — `extension/filter.js`
- **网页版入口函数**：`cleanTikzCode(code)` — `GGB-Tikz-Code-Filter.html`
- **处理流程**：
  1. 提取tikzpicture环境内容
  2. 解析各种图形元素
  3. 重新组织代码结构
  4. 输出格式化的简洁代码

#### 已支持的图形元素类型

##### 点相关
- **坐标点**：`\draw[fill=...] (x,y) circle (radius);`
- **点标签**：`\draw[color=...] (x,y) node {$label$};`
- **智能标签位置**：`getSmartLabelPosition()`函数根据点位置自动确定标签放置方向

##### 线相关
- **直线段**：`\draw[...] (x1,y1) -- (x2,y2);`
- **线型转换**：`convertLineStyle()`函数转换线型（实线、虚线、点线、点划线）

##### 函数图像
- **普通函数**：`\draw[...] plot(\x,{expression})`
- **二次函数**：`\draw[...] plot(\x,{(\x)^2/2/denominator})`
- **clip范围**：从`\clip`命令中提取

##### 圆与椭圆
- **几何圆**：`\draw[...] (center) circle (radius);`
- **椭圆**：`\draw[...] (center) ellipse (xRadius and yRadius);`
- **旋转处理**：支持`rotate around`选项

##### 圆弧与扇形
- **圆弧**：使用参数方程绘制的圆弧
- **扇形**：带`-- cycle`的扇形区域
- **角度标记**：带灰色填充的角度标记

##### 文本和角度标签
- **文本标签**：带定位选项的文本节点
- **角度标签**：度数标签（如`α = 64.94°`）

### 2. 截图 AI 识别功能（新增）

- **截图粘贴**：支持 Ctrl+V、拖拽、点击上传
- **AI 视觉识别**：通过兼容 OpenAI API 格式的视觉模型识别几何图形
- **指令注入**：自动将 AI 生成的 GeoGebra 指令注入画布
- **配置灵活**：通过 `config.json` 配置任意平台的模型（千问、智谱、DeepSeek 等）

---

## 🔧 `config.json` 配置

```json
{
  "model": "qwen3.6-plus",
  "endpoint": "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  "apiKey": "",
  "enable_thinking": false
}
```

- `model`、`endpoint`、`apiKey` 为保留字段
- 其余字段（如 `enable_thinking`、`top_p` 等）直接合并进 API 请求体
- 支持任意兼容 OpenAI chat/completions 格式的 API

## 🔧 提示词管理

AI 视觉识别的提示词位于 `extension/prompt.js`，包含：
- **输出规则**：纯文本行格式、先画后改线型
- **线型设置**：SetLineStyle 命令参考
- **指令参考**：基于官方文档的 40+ 条精准 GeoGebra 指令语法
- **特殊规则**：禁 Polygon 用 Segment、三角形四心、等

修改提示词只需编辑 `prompt.js`，重载插件即可生效。

---

## 🔧 现有函数说明

### 关键工具函数
1. **`roundToThreeDecimals(num)`** - 四舍五入到三位小数

```javascript
function roundToThreeDecimals(num) {
    return Math.round(num * 1000) / 1000;
}
```

2. **`formatCoordinate(coordStr, shouldRound)`** - 格式化坐标字符串

```javascript
function formatCoordinate(coordStr, shouldRound) {
    const match = coordStr.match(/\(([^,]+),([^)]+)\)/);
    if (!match) return coordStr;
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    if (shouldRound) {
        x = roundToThreeDecimals(x);
        y = roundToThreeDecimals(y);
    }
    return `(${x},${y})`;
}
```

3. **`convertLineStyle(style)`** - 转换线型描述

```javascript
const convertLineStyle = (style) => {
    if (!style) return '';
    let lineStyle = style.replace(/line width=[^,\]]+,?/g, '');
    lineStyle = lineStyle.replace(/,\s*$/g, '');
    lineStyle = lineStyle.replace(/\[\s*,\s*/g, '[');
    if (lineStyle.includes('dash pattern=on 1pt off 1pt on 1pt off 4pt')) {
        return 'dash dot';
    } else if (lineStyle.includes('dash pattern=on 1pt off 1pt')) {
        return 'dashed';
    } else if (lineStyle.includes('dotted')) {
        return 'dotted';
    } else if (lineStyle.includes('dash')) {
        return 'dashed';
    }
    return '';
};
```

4. **`getSmartLabelPosition(x, y, allPoints)`** - 智能标签位置计算

### 提取函数
1. `extractQuadraticFunctions(code)` - 提取二次函数图像
2. `extractFunctionPlots(code)` - 提取普通函数图像

---

## 🆕 如何添加新的过滤规则

### 步骤1：识别新元素类型

1. **分析原始TikZ代码模式**
2. **确定关键信息**：元素类型、几何参数、样式属性

### 步骤2：创建提取函数

```javascript
function extractNewElement(code) {
    try {
        const regex = /.../g;
        const matches = [...code.matchAll(regex)];
        const elements = [];
        matches.forEach(match => {
            // 解析参数、应用四舍五入
            elements.push({ original: match[0], ... });
        });
        return { hasNewElement: elements.length > 0, elements };
    } catch (error) {
        console.error('提取新元素出错:', error);
        return { hasNewElement: false, elements: [] };
    }
}
```

### 步骤3：集成到主处理流程
1. 先在 `extension/filter.js` 中实现和测试
2. 再同步到 `GGB-Tikz-Code-Filter.html`

### 步骤4：处理注意事项
- 坐标四舍五入：使用`roundToThreeDecimals()`
- 标签映射：在`pointMap`中查找坐标对应的标签
- 样式转换：使用`convertLineStyle()`统一线型
- 代码组织：按逻辑分组输出

---

## 🚨 重要提醒

1. **正则表达式安全性**：确保正则表达式能正确处理边缘情况
2. **错误处理**：每个提取函数都应有try-catch块
3. **性能考虑**：避免在循环中进行复杂的DOM操作或字符串处理
4. **代码可读性**：保持与现有代码风格一致
5. **向后兼容**：新功能不应破坏现有的处理逻辑
6. **双版本同步**：修改过滤逻辑后务必同步更新 `extension/filter.js` 和网页版

---

## 📊 调试建议

1. 使用`console.log()`输出中间结果
2. 测试各种边界情况（空输入、异常格式、特殊字符）
3. 验证输出代码在LaTeX中能正确编译
4. 确保四舍五入不会导致几何关系错误
5. AI 识别问题：查看控制台中 `[GeoTikTrim] AI原始响应:` 日志

---

## 🔍 未来可能扩展方向

1. **更多曲线类型**：贝塞尔曲线、样条曲线
2. **填充模式**：图案填充、渐变填充
3. **箭头和标记**：不同类型的箭头头部
4. **3D图形**：简单的三维投影
5. **动画元素**：时间线标记

---

**使用此提示词时**：当需要添加新的TikZ元素支持时，参考这个指南的结构和模式，确保新功能与现有框架无缝集成。记住先改 `extension/filter.js`，测试通过后再同步到网页版。
