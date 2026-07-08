# ============================================================
# Ink Speaker Web Dockerfile(多阶段构建)
# ============================================================
# 阶段:
#   1. build:  node:20-alpine + pnpm 编译产出 dist
#   2. runtime: nginx:alpine 托管静态文件
#
# 体积:
#   - build 阶段 ~350MB(临时,不进最终镜像)
#   - runtime 阶段 ~50MB(nginx alpine ~25MB + dist ~10-20MB)
#
# 加速:
#   - npm 镜像走 npmmirror(国内)
#   - pnpm 用 corepack 启用,无需单独安装
# ============================================================

# ---------- 阶段 1:构建 ----------
FROM node:20-alpine AS build

# 启用 pnpm(corepack 是 node 20 自带的)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /workspace

# 先拷贝 lock 文件 + package.json,利用 Docker 层缓存加速
COPY package.json pnpm-lock.yaml ./

# 装依赖(用国内 npm 镜像加速)
RUN pnpm config set registry https://registry.npmmirror.com && \
    pnpm install --frozen-lockfile

# 拷贝源码(.dockerignore 已排除 node_modules / dist / .git)
COPY . .

# 构建生产包
RUN pnpm build

# ---------- 阶段 2:运行 ----------
FROM nginx:alpine

# 时区
ENV TZ=Asia/Shanghai

# 拷贝自定义 nginx 配置(替换默认 default.conf)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物到 nginx 静态目录
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80

# 健康检查:nginx 自身 80 端口
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ || exit 1
