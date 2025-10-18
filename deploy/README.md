# Docker 部署说明

本文档介绍如何在安装了 Docker 与 Docker Compose 的 Linux 服务器上快速部署 VueChatAccessPage。

## 目录结构

```
deploy/
├── Dockerfile.frontend   # 前端构建与运行镜像定义
├── Dockerfile.server     # Node.js 后端运行镜像定义
├── docker-compose.yml    # 编排前后端的 Compose 文件
├── nginx.conf            # Nginx 静态资源与反向代理配置
└── .env.example          # Compose 所需的环境变量样例
```

## 前置条件

1. 已在服务器上安装 [Docker](https://docs.docker.com/engine/install/) 与 [Docker Compose V2](https://docs.docker.com/compose/install/)。
2. 拥有可用的 [NewsAPI](https://newsapi.org/) Key（用于新闻检索）以及 OpenAI API Key（若需启用文本或图片生成功能）。

## 快速开始

1. **克隆代码并进入项目目录**

   ```bash
   git clone <repo-url>
   cd VueChatAccessPage
   ```

2. **准备环境变量**

   复制示例环境文件并按需修改：

   ```bash
   cp deploy/.env.example deploy/.env
   vi deploy/.env  # 或使用任意编辑器，填入真实的 OPENAI_API_KEY
   ```

   支持的变量如下：

   | 变量名 | 说明 | 默认值 |
   | --- | --- | --- |
   | `OPENAI_API_KEY` | 可选，OpenAI 接口访问凭证 | - |
   | `OPENAI_MODEL` | 可选，后端调用的模型名称 | `gpt-4.1-mini` |
   | `NEWS_API_KEY` | 必填，NewsAPI.org 接口访问凭证 | - |
   | `FRONTEND_PORT` | 可选，映射到宿主机的前端访问端口 | `8080` |
   | `SERVER_PORT` | 可选，映射到宿主机的后端端口 | `3000` |

3. **构建并启动容器**

   ```bash
   docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
   ```

   该命令会：

   - 使用 `deploy/Dockerfile.frontend` 构建前端镜像，产物由 Nginx 提供静态资源并通过 `/api` 反向代理到后端。
   - 使用 `deploy/Dockerfile.server` 构建后端镜像，并通过环境变量注入 OpenAI 相关配置。
   - 以后台模式运行两个服务：`frontend`（默认暴露 8080 端口）与 `server`（默认暴露 3000 端口）。

4. **验证服务**

   浏览器访问 `http://<服务器 IP>:${FRONTEND_PORT}`，即可打开前端界面并通过 `/api/message` 调用后端。

## 常用运维操作

- 查看容器状态：

  ```bash
  docker compose -f deploy/docker-compose.yml ps
  ```

- 查看日志：

  ```bash
  docker compose -f deploy/docker-compose.yml logs -f frontend
  docker compose -f deploy/docker-compose.yml logs -f server
  ```

- 更新代码后重新部署：

  ```bash
  git pull
  docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
  ```

- 停止并移除容器：

  ```bash
  docker compose -f deploy/docker-compose.yml down
  ```

## 说明与自定义

- `deploy/nginx.conf` 会将所有 `/api/` 路径自动转发到 `server` 容器的 3000 端口，若后端路径有调整请同步修改该文件。
- 如需启用 HTTPS，可在服务器前增加反向代理（例如 Caddy、Traefik）或扩展 Nginx 配置。
- 若要将后端运行在其他端口，可同时调整 `deploy/docker-compose.yml` 与 `.env` 中的 `SERVER_PORT`，并确保 `nginx.conf` 中的 `proxy_pass` 指向正确的容器地址。
