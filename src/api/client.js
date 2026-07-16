import axios from 'axios';
import { toast } from 'sonner';
import { STORAGE_KEYS } from '../constants/storage.js';

export const tokenStore = {
  getAccess: () => localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  getRefresh: () => localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN),
  set(access, refresh) {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
    if (refresh) localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refresh);
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }
};

/**
 * 当前活跃 novelId(供请求拦截器注入 X-Novel-Id 头)。
 * <p>第 6 阶段:默认 null,表示尚未选择小说;业务 API 调用前必须由
 * NovelContextProvider 通过 setActiveNovelId 设置。</p>
 * <p>当值为 null 时,请求拦截器不会注入 X-Novel-Id 头,后端会按"未指定小说"
 * 处理(对全局接口如 /novel CRUD 无影响,对子资源接口会返回 400)。</p>
 */
let activeNovelId = null;

/**
 * 设置当前活跃 novelId(切换小说时调用)。
 * @param {number|null} id 传 null 清空当前选择
 */
export function setActiveNovelId(id) {
  activeNovelId = id || null;
  try {
    if (activeNovelId != null) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_NOVEL_ID, String(activeNovelId));
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_NOVEL_ID);
    }
  } catch {
    // 静默失败
  }
}

/**
 * 获取当前活跃 novelId。
 */
export function getActiveNovelId() {
  return activeNovelId;
}

// 启动时从 localStorage 恢复上次切换的 novelId
try {
  const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_NOVEL_ID);
  if (saved) {
    const n = Number(saved);
    if (Number.isFinite(n) && n > 0) activeNovelId = n;
  }
} catch {
  // 静默失败
}

const api = axios.create({
  baseURL: '/api',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' }
});

// 请求拦截:自动带 Authorization + X-Novel-Id
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // 后端 NovelContextFilter 读取 X-Novel-Id 头解析当前小说
  // 业务 API(data.js)无需每个调用都传 novelId,统一在此注入
  if (activeNovelId && !config.headers['X-Novel-Id']) {
    config.headers['X-Novel-Id'] = String(activeNovelId);
  }
  return config;
});

// 响应拦截:解包后端 Result<T>,401 自动 refresh,失败跳登录
let refreshing = false;
let pendingQueue = [];

api.interceptors.response.use(
  (resp) => {
    // 后端统一返回 Result<T> = { code, message, data }
    // 业务失败(code !== 200)也走 HTTP 200,需在此识别并转 error 流程
    // 注意:后端 Jackson 配置了 default-property-inclusion: non_null,
    // 当 data 为 null 时 JSON 中不会出现 data 字段,因此只检查 'code' 即可
    const body = resp?.data;
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 200) {
        // 解包:把 resp.data 从 Result<T> 替换为 T,保持 axios response 形态
        resp.data = body.data;
        return resp;
      }
      // 业务失败
      const msg = body.message || '业务异常';
      // 请求可通过 config.skipErrorToast=true 关闭全局弹窗,改由调用方自行内联展示错误
      if (!resp.config?.skipErrorToast) {
        if (body.code >= 5000) {
          toast.error(`服务异常:${msg}`);
        } else {
          toast.error(msg);
        }
      }
      // 业务码 2001(未鉴权):token 失效或被后端拒绝,清除并跳登录
      if (body.code === 2001) {
        tokenStore.clear();
        // 避免在登录页自身跳转死循环
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      const bizError = new Error(msg);
      bizError.businessCode = body.code;
      bizError.response = resp;
      throw bizError;
    }
    return resp;
  },
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // 非 401 / 已重试过 / 是登录接口本身 → 直接抛
    if (status !== 401 || original._retry || original.url.includes('/auth/')) {
      // 友好提示:HTTP 4xx/5xx 时尝试从 Result.message 或 error.message 取
      const msg = error.response?.data?.message || error.response?.data?.error || error.message;
      // 同样尊重 skipErrorToast:登录/注册等页面可关闭全局弹窗,自行内联展示
      if (!original?.skipErrorToast) {
        if (status >= 500) toast.error(`服务异常:${msg}`);
        else if (status >= 400 && status !== 401) toast.error(`请求失败 (${status}):${msg}`);
      }
      throw error;
    }

    // 401 → 尝试 refresh
    if (refreshing) {
      // 排队等 refresh 完成
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject, original });
      });
    }

    original._retry = true;
    refreshing = true;

    const refresh = tokenStore.getRefresh();
    if (!refresh) {
      tokenStore.clear();
      refreshing = false;
      window.location.href = '/login';
      throw error;
    }

    try {
      // 注意:这里用原始 axios,响应体是 Result<LoginResponse>,需手动取 .data.data
      const resp = await axios.post('/api/auth/refresh', { refreshToken: refresh });
      const payload = resp.data?.data || resp.data;
      const { accessToken, refreshToken: newRefresh } = payload;
      tokenStore.set(accessToken, newRefresh);
      // 重放排队的请求
      pendingQueue.forEach(({ resolve, original: o }) => {
        o.headers.Authorization = `Bearer ${accessToken}`;
        resolve(api(o));
      });
      pendingQueue = [];
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (e) {
      pendingQueue = [];
      tokenStore.clear();
      window.location.href = '/login';
      throw e;
    } finally {
      refreshing = false;
    }
  }
);

export default api;
