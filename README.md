# 轻阅 (LogPeep) - Lightweight Log Viewer

[English](#english) | [中文](#chinese)

---

<a name="english"></a>
## English

**LogPeep** (轻阅) is a lightweight, browser-based log viewer designed for quick log inspection, simple visualization, and AI-assisted debugging.

### 🚀 Highlights
- **Nimble & Fast**: Built with virtualization to handle large files (200k+ lines) smoothly in your browser.
- **Smart Peeking**: Integrated with **Gemini AI** for quick log explanations and troubleshooting tips.
- **Field Discovery**: Automatically identifies keys from JSON logs for dynamic table layout.
- **Visual Trends**: Instant traffic histograms to spot spikes or errors.
- **Privacy Centric**: All processing happens on your machine. Your logs never leave the browser.

### 🛠️ Quick Start

Since LogPeep is a pure static web application, you can run it using any static file server.

**Option 1: Node.js (Recommended)**
```bash
# Install 'serve' globally or use npx
npx serve .
```

**Option 2: Python**
```bash
# Python 3.x
python3 -m http.server 8000
```

### 📦 Deployment
You can deploy LogPeep to any static hosting service (GitHub Pages, Vercel, Netlify, etc.) by simply uploading the files in the root directory.

---

<a name="chinese"></a>
## 中文

**轻阅 (LogPeep)** 是一款轻量级的浏览器端日志查看器，旨在提供极速的日志浏览、简易的可视化以及 AI 辅助排错体验。

### 🚀 核心亮点
- **轻灵极速**: 采用虚拟滚动技术，在浏览器内流畅处理大规模日志（支持 20万+ 行）。
- **智能简析**: 集成 **Gemini AI**，提供快速的日志原理解析与排查建议。
- **动态列显**: 自动识别 JSON 日志字段，动态定制表格布局。
- **趋势概览**: 瞬时流量直方图，直观发现错误高峰。
- **隐私无忧**: 所有处理均在本地完成，日志文件不会离开您的浏览器。

### 🛠️ 快速上手

由于“轻阅”是一个纯静态 Web 应用，您可以使用任何静态文件服务器运行它。

**方法 1: Node.js (推荐)**
```bash
# 使用 npx 直接运行 serve
npx serve .
```

**方法 2: Python**
```bash
# 使用 Python 内置服务器
python3 -m http.server 8000
```

### 📦 部署建议
您可以将此项目轻松部署到任何静态托管服务（如 GitHub Pages、Vercel、Netlify 等），只需上传根目录下的所有文件即可。

---

## License
MIT License.