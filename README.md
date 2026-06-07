# AI 口语陪练 (DeepTalk)

一个轻量的 **AI 英语口语练习** Web 应用。挑一个角色开口聊，对方会用英文回应、朗读出声，并在你说错时即时给出温和纠错——重点是开口，不是背单词。

## 功能

- **5 个角色场景**，难度递进：
  - ☕ Mia · 咖啡师（Beginner）—— 点单闲聊，语速慢、用词简单
  - 💼 Mr. Chen · 面试官（Intermediate）—— 模拟求职面试，练专业表达
  - 🌍 Lucas · 旅途偶遇（Intermediate）—— 里斯本街头的健谈本地人，口语地道
  - ⚖️ Aria · 辩论搭子（Advanced）—— 永远站你的对立面，逼你为观点辩护
  - 🖥️ Tux · 终端导师（Linux）—— 手把手教 shell 命令，边讲边练
- **实时纠错**：AI 每轮最多挑一个明显错误，以 `错误 → 正确 · 原因` 的卡片形式提示。
- **语音输入**：浏览器 Web Speech API 语音识别（麦克风按钮）。
- **语音朗读**：AI 回复自动用 TTS 念出（终端导师场景除外）。
- **流式输出**：基于 SSE 逐字渲染。
- **Markdown 渲染**：代码块、列表等，经 DOMPurify 净化，适合终端导师场景。
- **本地会话持久化**：每个角色的对话保存在 `localStorage`，刷新后可继续。

## 技术栈

- **前端**：单文件 `index.html`，原生 JS，无构建步骤；通过 CDN 引入 [marked](https://github.com/markedjs/marked) 与 [DOMPurify](https://github.com/cure53/DOMPurify)。
- **后端**：`node-functions/chat.js`，运行在 **腾讯云 EdgeOne** Functions（Pages 函数 `onRequest` 约定），以 SSE 流式返回。
- **模型**：通过 `openai` SDK 调用任意 OpenAI 兼容接口（默认模型 `deepseek-v4-flash`）。

## 项目结构

```
.
├── index.html              # 前端全部（UI + 逻辑 + 样式）
└── node-functions/
    ├── chat.js             # /chat 接口：角色定义、纠错协议、流式转发
    └── getRequestBody.js   # 请求体解析工具
```

## 环境变量

后端函数需要以下环境变量：

| 变量 | 说明 |
| --- | --- |
| `OPENAI_API_URL` | OpenAI 兼容接口的 baseURL |
| `OPENAI_API_KEY` | API 密钥 |
| `OPENAI_MODEL`   | 模型名（可选，默认 `deepseek-v4-flash`） |

## 部署

本项目按 [腾讯云 EdgeOne Pages](https://edgeone.cloud.tencent.com/pages) 的约定组织：

1. 将仓库连接到 EdgeOne Pages。
2. 在控制台配置上面的环境变量。
3. `index.html` 作为静态站点托管，`node-functions/chat.js` 自动暴露为 `/chat` 接口。

> 前端硬编码请求 `/chat`，因此后端函数路径需保持为 `chat`。

## 本地开发

前端是纯静态页面，可用任意静态服务器预览 UI（`/chat` 接口需后端运行时支持）：

```bash
npx serve .
```
