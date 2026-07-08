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
FROM node:22-alpine AS build

# 国内 npm 镜像(必须先配,否则 corepack prepare 拉不到 pnpm 二进制)
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com \
    npm_config_registry=https://registry.npmmirror.com

# 启用 pnpm 10(corepack 走上面配的 npmmirror;pnpm 10 兼容 lockfileVersion 9.0)
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /workspace

# 先拷贝 lock 文件 + package.json,利用 Docker 层缓存加速
COPY package.json pnpm-lock.yaml ./

# 装依赖(镜像已在 ENV 配好)
RUN pnpm install --frozen-lockfile

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
