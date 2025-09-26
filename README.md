# VueChatAccessPage

访问 ChatGPT 的简单代理项目，现在包含一个基于 Vue 3 + Vite 的前端界面以及可选的 Node.js 后端服务。

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

* 暴露 `POST /api/message` 接口，接收前端通过 multipart/form-data 发送的文本与图片，并将其转发至目标 GPT 接口（默认 OpenAI Responses API）。
* 基于内存存储的上传处理，仅在需要时将图片转换为 base64 后嵌入请求。
* 提供基础的日志记录与错误处理能力，敏感配置通过环境变量注入。

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
OPENAI_API_KEY=sk-xxx                 # 必填，OpenAI API Key
OPENAI_MODEL=gpt-4.1-mini             # 可选，默认值见示例
PORT=3000                             # 可选，服务监听端口
```

### 本地启动

```bash
npm run start
```

服务默认监听 `http://localhost:3000`，与前端代理配置保持一致。启动后即可通过前端或其他客户端向 `/api/message` 发送 multipart/form-data 请求进行测试。

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
