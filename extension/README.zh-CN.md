# GeoTikTrim - GeoGebra TikZ 代码过滤浏览器插件

一键从 GeoGebra Classic 导出并过滤冗余 TikZ 代码，直接复制到剪贴板。

**新功能**：粘贴几何图形截图，AI 自动识别并在 GeoGebra 中构建图形。

## 安装

1. 打开 Edge / Chrome，进入扩展管理页面：
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载解压缩的扩展"
4. 选择 `extension/` 文件夹

## 使用

### TikZ 导出

1. 打开 [GeoGebra Classic](https://www.geogebra.org/classic)
2. 页面右侧会出现悬浮面板
3. 点击齿轮图标打开设置，勾选过滤选项
4. 点击"复制 TikZ"
5. 粘贴到 `.tex` 文件中即可

### 截图识别

1. 编辑 `config.json`，填入 `apiKey`、`model`、`endpoint`
2. **重载插件**（扩展管理页点击刷新图标）并**刷新 GeoGebra 网页**
3. 粘贴截图（Ctrl+V）、拖拽到虚线框、或点击虚线框上传
4. AI 识别图形并自动将 GeoGebra 指令注入画布
5. 在 GeoGebra 中微调图形
6. 点击"复制 TikZ"导出

### config.json 配置

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

### 过滤选项

- **包含点标记** — 输出 `\draw[fill=black] (X) circle (1pt)`
- **包含点标签** — 输出 `\node [above] at (X) {$X$}`

## 功能

- 自动提取 tikzpicture 环境
- 坐标点定义 + 标签
- 线段（含去重、线型转换）
- 圆、椭圆、圆弧、扇形、扇形绘制
- 角度标记及标签
- 函数图像（含 scope 裁剪）
- 贝塞尔曲线（参数方程）
- 智能标签定位
- 文本标签保留
- **截图 → AI 识别 → GeoGebra 指令**

## 文件结构

```
extension/
├── manifest.json       # Manifest V3 配置
├── background.js       # Service Worker（AI API 代理）
├── content.js          # 主入口：注入 + 截图粘贴 + AI 识别流程
├── inject.js           # 页面上下文：ggbApplet API + 指令注入
├── filter.js           # TikZ 代码过滤核心逻辑
├── prompt.js           # 视觉模型提示词模板
├── ui.js               # 悬浮面板 + 粘贴区 + 设置面板
├── toast.js            # Toast 通知组件
├── config.json         # AI 配置（模型、端点、Key）
├── style.css           # 毛玻璃样式 + 深浅色自适应
└── icons/              # 扩展图标
```

## 技术

- Manifest V3
- 原生 JavaScript（无框架/构建工具）
- Service Worker 代理 AI API 请求（绕过 CORS）
- `config.json` 跨平台 AI 配置
- `chrome.storage.local` 持久化过滤设置
- `postMessage` 跨上下文通信
