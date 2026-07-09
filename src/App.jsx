import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import MainLayout from './pages/MainLayout.jsx';
import NovelLayout from './pages/NovelLayout.jsx';
import Chat from './pages/Chat.jsx';
import Writing from './pages/Writing.jsx';
import Outline from './pages/Outline.jsx';
import Chapter from './pages/Chapter.jsx';
import Character from './pages/Character.jsx';
import Lore from './pages/Lore.jsx';
import NovelList from './pages/NovelList.jsx';
import NovelEditor from './pages/NovelEditor.jsx';
import NovelOverview from './pages/NovelOverview.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';

/**
 * 路由表(第 6 阶段:以小说为主体)。
 *
 * <pre>
 *   /login                                登录页(公开)
 *   /                                     → 重定向到 /novels
 *   /chat                                 顶层独立问答页(与小说上下文解耦)
 *   /novels                               我的小说列表(登录后第一屏)
 *   /novels/new                           创建新小说表单
 *   /novels/:novelId                      → 重定向到 /novels/:novelId/overview
 *   /novels/:novelId/overview             小说总览(进入小说后第一屏)
 *   /novels/:novelId/writing              多轮写作(带小说上下文)
 *   /novels/:novelId/outline              大纲
 *   /novels/:novelId/chapter              章节
 *   /novels/:novelId/character            人物
 *   /novels/:novelId/lore                 世界观
 * </pre>
 *
 * <p>小说工作台子路由通过 {@link NovelLayout} 注入 NovelContextProvider,
 * 并从 URL :novelId 同步到全局 activeNovelId,使 api/client.js 的请求拦截器
 * 自动注入 X-Novel-Id 头。</p>
 */
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/novels" replace />} />
        {/* 顶层独立 /chat:与小说上下文解耦,可在任何场景下单轮问答 */}
        <Route path="chat" element={<Chat />} />

        {/* 小说列表(登录后第一屏) */}
        <Route path="novels" element={<NovelList />} />
        {/* 创建新小说 */}
        <Route path="novels/new" element={<NovelEditor mode="create" />} />
        {/* 编辑小说基础信息(在 NovelLayout 之外,与 NovelEditor 自身的预填/保存流程一致) */}
        <Route path="novels/:novelId/edit" element={<NovelEditor mode="edit" />} />

        {/* 某本小说工作台(嵌套路由,共享 NovelLayout + NovelContextProvider) */}
        <Route path="novels/:novelId" element={<NovelLayout />}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<NovelOverview />} />
          <Route path="writing" element={<Writing />} />
          <Route path="outline" element={<Outline />} />
          <Route path="chapter" element={<Chapter />} />
          <Route path="character" element={<Character />} />
          <Route path="lore" element={<Lore />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
