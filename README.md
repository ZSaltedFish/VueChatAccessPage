# VueChatAccessPage

访问 ChatGPT 的简单代理项目，现在包含一个基于 Vue 3 + Vite 的前端界面。

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
└── README.md             # 项目说明
```

欢迎根据业务需求继续扩展界面与后端能力。
