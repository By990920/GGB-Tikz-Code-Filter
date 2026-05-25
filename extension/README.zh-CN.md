# GeoTikTrim - GeoGebra TikZ 代码过滤浏览器插件

一键从 GeoGebra Classic 导出并过滤冗余 TikZ 代码，直接复制到剪贴板。

## 安装

1. 打开 Edge / Chrome，进入扩展管理页面：
   - Edge: `edge://extensions/`
   - Chrome: `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载解压缩的扩展"
4. 选择 `extension/` 文件夹

## 使用

1. 打开 [GeoGebra Classic](https://www.geogebra.org/classic)
2. 页面右侧会出现悬浮面板
3. 勾选需要的过滤选项：
   - **包含点标记** — 输出 `\draw[fill=black] (X) circle (1pt)`
   - **包含点标签** — 输出 `\node [above] at (X) {$X$}`
   - **坐标保留3位小数** — 四舍五入坐标到 3 位小数
4. 点击"复制 TikZ"按钮
5. 右下角提示"√ TikZ 代码已复制"
6. 粘贴到 `.tex` 文件中即可

## 功能

- 自动提取 tikzpicture 环境
- 坐标点定义 + 标签
- 线段（含去重、线型转换）
- 圆、椭圆、圆弧、扇形
- 角度标记及标签
- 函数图像（含 scope 裁剪）
- 贝塞尔曲线（参数方程）
- 智能标签定位
- 文本标签保留

## 文件结构

```
extension/
├── manifest.json    # Manifest V3 配置
├── content.js       # 主入口，注入脚本 + 通信桥接
├── inject.js        # 页面上下文，访问 ggbApplet
├── filter.js        # TikZ 代码过滤核心逻辑
├── ui.js            # UI 面板组件
├── toast.js         # Toast 通知组件
├── style.css        # 毛玻璃样式 + 深浅色自适应
└── icons/           # 扩展图标
```

## 技术

- Manifest V3
- 原生 JavaScript（无框架/构建工具）
- chrome.storage.local 持久化设置
- postMessage 跨上下文通信
