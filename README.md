# VueChatAccessPage

访问 ChatGPT 的简单代理项目，现在包含一个基于 Vue 3 + Vite 的前端界面以及可选的 Node.js 后端服务。最新版本的界面已经聚焦在“新闻查询”能力：输入关键词即可获取来自主流媒体的新闻摘要列表。

## 前端（frontend/）

### 开发环境准备

1. 确保已安装 [Node.js](https://nodejs.org/)（建议 18+）和 npm。
2. 在 `frontend/` 目录下执行依赖安装：

   ```bash
   cd frontend
   npm install
   ```

### 本地开发

启动开发服务器（默认监听 <http://localhost:5173>）：

```bash
npm run dev
```

开发模式下会自动代理以 `/api` 开头的请求到 `http://localhost:3000`，方便与后端联调。

## 后端（server/）

### 主要功能

* 暴露 `POST /api/message` 接口，基于 `mode` 字段动态调用不同的能力：
  * `news`：通过 RapidAPI 调用 `real-time-news-data` 服务，并返回最多 6 条与关键词相关的新闻结果。
  * `text`：转发到 OpenAI Responses API，进行富文本生成（当前前端已关闭该模式）。
  * `image`：调用 OpenAI 的图片生成功能（当前前端已关闭该模式）。
* 基于内存存储的上传处理，仅在需要时将图片转换为 base64 后嵌入请求。
* 提供基础的日志记录与错误处理能力，敏感配置通过环境变量注入。
* 限制单个文本字段大小不超过 64KB，以避免异常的大字段请求占用内存。

### 开发环境准备

1. 确保已安装 [Node.js](https://nodejs.org/)（建议 18+）和 npm。
2. 在 `server/` 目录下执行依赖安装：

   ```bash
   cd server
   npm install
   ```

### 环境变量

在 `server/` 目录下复制 `.env.example` 生成 `.env`，并根据实际情况填写：

```env
OPENAI_API_KEY=sk-xxx                 # 可选，启用文本/图片生成功能所需的 OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini             # 可选，默认值见示例
RAPIDAPI_KEY=rapidapi-key             # 必填，RapidAPI Real-Time News Data 服务的访问密钥
RAPIDAPI_HOST=real-time-news-data.p.rapidapi.com  # 可选，默认即可
PORT=3000                             # 可选，服务监听端口
```

### 本地启动

```bash
npm run start
```

服务默认监听 `http://localhost:3000`，与前端代理配置保持一致。启动后即可通过前端或其他客户端向 `/api/message` 发送 multipart/form-data 请求进行测试。

### 回归验证：异常 multipart 请求

为避免未来回归导致服务在遇到损坏的 multipart 负载时抛出未处理异常，可使用以下步骤进行手动验证：

1. 确保服务已启动并监听 `http://localhost:3000`。
2. 运行下面的命令向接口发送一个缺失必要字段的损坏 multipart 请求（故意省略 `message` 与 `mode` 字段，并提供不完整的 boundary）：

   ```bash
   curl -i -X POST http://localhost:3000/api/message \
     -H "Content-Type: multipart/form-data; boundary=boundary-test" \
     --data-binary $'--boundary-test\r\nContent-Disposition: form-data; name="foo"\r\n\r\nbar\r\n--boundary-test'
   ```

3. 期望响应状态码为 `400`，并返回 JSON `{ "error": { "message": "invalid or unparsable multipart payload" } }`，表明服务正确处理异常负载而不会崩溃。

### 构建生产包

```bash
npm run build
```

构建完成后，可使用 Vite 预览命令检查产物：

```bash
npm run preview
```

如需部署，请将 `frontend/dist/` 中的静态文件上传到目标静态托管环境。

## 目录结构概览

```
.
├── frontend/             # Vue 3 + Vite 前端项目
│   ├── src/App.vue       # 聊天主页 UI 与交互逻辑
│   └── ...
├── server/               # Express 后端服务
│   ├── index.js          # 服务入口及路由
│   └── package.json      # 依赖与脚本
└── README.md             # 项目说明
```

欢迎根据业务需求继续扩展界面与后端能力。

## 部署指南

部署到 Linux 服务器的详细步骤（包含 Docker Compose 编排、环境变量说明等）请参考 [deploy/README.md](deploy/README.md)。
