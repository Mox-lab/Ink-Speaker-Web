import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/index.js';
import { tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 解析 JWT payload → 构造 user 对象(含 username / nickname / roles)
  // 注意:JWT payload 是 base64url 编码的 UTF-8 JSON。
  // atob 返回的是 Latin1 二进制串,若直接 JSON.parse 会导致中文等非 ASCII
  // 字符乱码(如 "你" 显示为 "ä½ "),故需先还原为字节再以 UTF-8 解码。
  const parseUser = useCallback((access) => {
    try {
      const b64 = access.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
      const payload = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      return {
        username: payload.sub,
        // nickname 可能缺失(旧 token),统一回退为空串,由弹窗引导补充
        nickname: payload.nickname || '',
        roles: payload.roles || []
      };
    } catch {
      return null;
    }
  }, []);

  // 从 localStorage 恢复登录状态(仅判断 token 是否存在,真实校验由后端做)
  useEffect(() => {
    const access = tokenStore.getAccess();
    if (access) {
      const parsed = parseUser(access);
      if (parsed) {
        setUser(parsed);
      } else {
        tokenStore.clear();
      }
    }
    setLoading(false);
  }, [parseUser]);

  // 写入 token + 同步 user(登录、昵称更新等统一入口)
  const applyAuthData = useCallback((data) => {
    tokenStore.set(data.accessToken, data.refreshToken);
    setUser(parseUser(data.accessToken));
  }, [parseUser]);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    applyAuthData(data);
    return data;
  }, [applyAuthData]);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    applyAuthData
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
