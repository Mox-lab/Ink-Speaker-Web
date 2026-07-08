import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { login as apiLogin, logout as apiLogout } from '../api/index.js';
import { tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 从 localStorage 恢复登录状态(仅判断 token 是否存在,真实校验由后端做)
  useEffect(() => {
    const access = tokenStore.getAccess();
    if (access) {
      try {
        // 解析 JWT payload 拿 username 与 roles(无需密钥,base64 decode)
        const payload = JSON.parse(atob(access.split('.')[1]));
        setUser({
          username: payload.sub,
          roles: payload.roles || []
        });
      } catch {
        tokenStore.clear();
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    setUser({ username: data.username || username, roles: data.roles || [] });
    return data;
  }, []);

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 AuthProvider 内使用');
  return ctx;
}
