import api, { tokenStore } from './client.js';

/**
 * 登录:用用户名密码换 access + refresh token
 */
export async function login(username, password) {
  const { data } = await api.post('/auth/login', { username, password });
  tokenStore.set(data.accessToken, data.refreshToken);
  return data;
}

/**
 * 登出:清空本地 token
 */
export function logout() {
  tokenStore.clear();
}
