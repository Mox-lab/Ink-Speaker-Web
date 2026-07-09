import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { NovelProvider, useNovelContext } from '../context/NovelContext.jsx';
import NovelBreadcrumbBar from '../components/NovelBreadcrumbBar.jsx';

/**
 * 小说工作台布局。
 *
 * <p>第 6 阶段(以小说为主体):</p>
 * <ul>
 *   <li>从 URL :novelId 同步到 NovelContextProvider,使所有子页面通过 useNovelId() 拿到一致的小说 ID</li>
 *   <li>NovelProvider 内部同步到 api/client.js 的 setActiveNovelId,使请求拦截器自动注入 X-Novel-Id 头</li>
 *   <li>卸载时不清空 activeNovelId(由用户在 NovelList 切换时再清),避免页面切换闪烁</li>
 *   <li>顶部渲染面包屑条带(UX-10),各子页共享,无需重复实现</li>
 * </ul>
 */
function NovelLayoutInner() {
  const { novelId } = useParams();
  const { setActiveNovelId } = useNovelContext();

  useEffect(() => {
    const id = Number(novelId);
    if (Number.isFinite(id) && id > 0) {
      setActiveNovelId(id);
    }
  }, [novelId, setActiveNovelId]);

  return (
    <div className="flex min-h-screen flex-col">
      <NovelBreadcrumbBar />
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  );
}

export default function NovelLayout() {
  return (
    <NovelProvider>
      <NovelLayoutInner />
    </NovelProvider>
  );
}
