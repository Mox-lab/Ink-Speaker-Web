import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * 受保护路由包装器。
 * 未登录 → 跳转 /login,并记住来源路径。
 *
 * @param {object} props
 * @param {React.ReactNode} props.children 受保护子节点
 * @returns {JSX.Element}
 */
export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-white/60">
        <div className="animate-pulse">加载中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // 管理后台路由:非管理员重定向到 403 页
  if (requireAdmin) {
    const roles = user?.roles || [];
    if (!roles.includes('ROLE_ADMIN')) {
      return <Navigate to="/403" replace />;
    }
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node
};
