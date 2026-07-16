import { useAuth } from '../context/AuthContext.jsx';

/**
 * 角色判断 hook。
 *
 * <p>从 {@link useAuth} 暴露的 user.roles 解析当前用户角色,
 * 供菜单过滤与管理后台路由鉴权使用。</p>
 *
 * @returns {{ isAdmin: boolean, isUser: boolean, roles: string[] }}
 * @author songshan.li (ID: 17099618)
 */
export function useRole() {
  const { user } = useAuth();
  const roles = user?.roles || [];
  return {
    roles,
    isAdmin: roles.includes('ROLE_ADMIN'),
    isUser: roles.includes('ROLE_USER')
  };
}
