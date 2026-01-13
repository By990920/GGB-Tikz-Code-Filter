# GGB-TikZ Code Filter

在线地址：https://ggb-tikz-code-filter.netlify.app/

新的域名：https://geotiktrim.site/

## 项目介绍
`GGB-Tikz-Code-Filter` 是一个用于过滤和处理 HTML 页面中 TikZ 代码的工具。它主要用于对特定输入内容进行筛选、清理和格式化，并将其转换为适合特定用途的 TikZ 图形代码。该项目结合了 HTML 结构和 JavaScript 脚本，提供了一个用户友好的界面来操作和生成 TikZ 图形。

 ## 效果图

![Screenshot](Screenshot.png)

## 功能概述
- **输入区域**：允许用户粘贴或输入原始数据。
- **操作控件**：提供用于触发代码过滤和处理操作的按钮。
- **输出区域**：显示经过处理和格式化的 TikZ 图形代码。
- **通知系统**：用于向用户反馈操作结果或提示信息。

## 使用说明
1. **打开页面**：直接在浏览器中打开 `GGB-Tikz-Code-Filter.html`。
2. **输入数据**：在输入区域粘贴或输入需要处理的原始数据。
3. **执行操作**：使用控制按钮对输入内容进行过滤和处理。
4. **查看结果**：处理结果将显示在输出区域，可以通过复制按钮提取 TikZ 代码。
5. **通知反馈**：操作结果或错误信息会通过通知区域反馈给用户。

## 技术细节
- 项目基于 HTML 和 JavaScript 开发，无需后端支持。
- 使用前端技术实现用户交互和代码处理功能。
- 提供了清晰的界面布局和交互逻辑。

## 项目结构
- **HTML 容器**：
  - `div.container`：主容器，包含所有页面内容。
  - `div.main-content`：主内容区域，包含输入和输出部分。
- **输入部分**：
  - `div.input-section`：用户输入区域，包含操作选项和控制按钮。
- **输出部分**：
  - `div.output-section`：处理结果展示区域，包含输出内容和附加信息链接。
- **通知区域**：
  - `div#notification.notification`：用于显示操作提示或错误信息。

## 贡献指南
欢迎提交 Issue 和 Pull Request！如果您有任何改进建议或发现 Bug，请提交到项目的 Gitee 页面。

## 开源协议
本项目采用 MIT License，请查看仓库中的 LICENSE 文件获取详细信息。