# GeoTikTrim — GeoGebra TikZ 代码过滤器

在线网址：https://geotiktrim.site/

## 推荐使用方式：浏览器插件

在 GeoGebra Classic 页面内一键导出并过滤冗余 TikZ 代码，直接复制到剪贴板。

**新功能**：粘贴几何图形截图，AI 自动识别并在 GeoGebra 中构建图形。

### 安装

1. 打开 Edge / Chrome，进入扩展管理页面：
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载解压缩的扩展"
4. 选择本项目中的 `extension/` 文件夹

### 使用

#### TikZ 导出

1. 打开 [GeoGebra Classic](https://www.geogebra.org/classic)
2. 页面右侧出现悬浮面板
3. 点击齿轮图标，勾选过滤选项后点击"复制 TikZ"
4. 粘贴到 `.tex` 文件中即可

#### 截图识别

1. 编辑 `extension/config.json`，填入 `apiKey`、`model`、`endpoint`
2. **重载插件**（扩展管理页点击刷新图标）并**刷新 GeoGebra 网页**
3. 粘贴几何图形截图（Ctrl+V）、拖拽或点击虚线框上传
4. AI 识别图形并自动将 GeoGebra 指令注入画布
5. 在 GeoGebra 中微调图形
6. 点击"复制 TikZ"导出

详见 [`extension/README.md`](extension/README.md)

---

## 备选方式：网页版

直接打开 `GGB-Tikz-Code-Filter.html` 或访问 https://geotiktrim.site/，手动粘贴 GeoGebra 导出的 TikZ 代码进行过滤。

---

## 功能概述

- **点**：坐标定义、点标记、智能标签位置
- **线**：线段（去重）、线型转换（实线、虚线、点线、点划线）
- **曲线**：圆、椭圆（含旋转）、圆弧、扇形、贝塞尔曲线
- **函数**：普通函数图像、二次函数、参数方程
- **标记**：角度标记及标签、文本标签
- **截图识别**：粘贴几何图形截图 → AI 自动构建（新功能）

---

## 效果图

![Screenshot](Screenshot.png)

---

## 项目结构

```
ggb-tikz-code-filter/
├── GGB-Tikz-Code-Filter.html   # 网页版
├── Netlify-index/
│   └── index.html              # 网页版（发布版）
├── extension/                  # 浏览器插件
│   ├── manifest.json           # Chrome 扩展配置
│   ├── background.js           # Service Worker（AI API 代理）
│   ├── content.js              # 主入口：注入 + 截图粘贴 + AI 识别流程
│   ├── inject.js               # 页面上下文：ggbApplet API + 指令注入
│   ├── filter.js               # TikZ 过滤核心逻辑
│   ├── prompt.js               # AI 视觉模型提示词
│   ├── ui.js                   # 悬浮面板 + 粘贴区 + 设置面板
│   ├── toast.js                # Toast 通知
│   ├── config.json             # AI 配置（模型、端点、Key）
│   ├── style.css               # 毛玻璃 + 深浅色自适应
│   └── icons/                  # 扩展图标
├── test/                       # 测试 LaTeX 文档
├── AI-Prompt.md                # AI 维护指南
├── README.md
├── README.zh-CN.md
└── LICENSE
```

---

## 技术细节

- 100% 前端实现，无需后端
- 浏览器插件：Manifest V3，原生 JavaScript
- AI API 通过 Service Worker 代理请求（绕过 CORS）
- `config.json` 配置支持任意平台（千问、智谱、DeepSeek 等）
- 视觉模型提示词含 40+ 条基于官方文档的精准 GeoGebra 指令语法
- 网页版：纯 HTML + CSS + JavaScript

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 开源协议

GNU General Public License v2.0，详见 `LICENSE` 文件。
