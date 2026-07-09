import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  MessageSquare,
  PenLine,
  ListTree,
  BookOpen,
  UserCircle2,
  Compass,
  LogOut,
  Menu,
  X,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import LangSwitcher from '../components/LangSwitcher.jsx';
import ThemeSwitcher from '../components/ThemeSwitcher.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

export default function MainLayout() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navItems = [
    { to: '/chat', label: t('nav.chat'), icon: MessageSquare, desc: t('nav.chatDesc') },
    { to: '/writing', label: t('nav.writing'), icon: PenLine, desc: t('nav.writingDesc') },
    { to: '/outline', label: t('nav.outline'), icon: ListTree, desc: t('nav.outlineDesc') },
    { to: '/chapter', label: t('nav.chapter'), icon: BookOpen, desc: t('nav.chapterDesc') },
    { to: '/character', label: t('nav.character'), icon: UserCircle2, desc: t('nav.characterDesc') },
    { to: '/lore', label: t('nav.lore'), icon: Compass, desc: t('nav.loreDesc') }
  ];

  const handleLogout = () => {
    logout();
    toast.success(t('nav.logoutConfirm'));
    navigate('/login', { replace: true });
  };

  const closeDrawer = () => setDrawerOpen(false);

  /* ============ 桌面端:固定左侧边栏 ============ */
  const sidebar = (
    <aside className="relative flex h-full w-64 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
      {/* 顶部 LOGO */}
      <div className="border-b border-white/5 px-5 py-5">
        <div
          className="text-lg font-bold tracking-[0.2em] text-white"
          style={{
            fontFamily: '"STXingkai", "华文行楷", "Xingkai SC", "楷体", "KaiTi", "STKaiti", cursive',
            textShadow: '0 0 12px rgba(56, 230, 255, 0.3)'
          }}
        >
          {t('common.appName')}
        </div>
        <div className="mt-0.5 text-[10px] tracking-[0.2em] text-cyan-300/60">
          {t('nav.online')}
        </div>
      </div>

      {/* 状态条 */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-2 text-[10px] tracking-widest text-white/40">
        <span className="flex items-center gap-1.5">
          <span className="sf-dot" />
          {t('nav.system')}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-cyan-300/60">{t('nav.ready')}</span>
          <ThemeSwitcher variant="minimal" />
          <LangSwitcher variant="minimal" />
        </div>
      </div>

      {/* 通知铃铛:在桌面侧边栏右上角浮动 */}
      <div className="absolute right-3 top-2 z-10 hidden lg:block">
        <NotificationBell />
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        <div className="mb-2 flex items-center gap-2 px-2 text-[10px] tracking-[0.2em] text-white/30">
          <span className="h-px flex-1 bg-white/10" />
          <span>{t('nav.modules')}</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `group relative mb-1 flex items-center gap-3 rounded px-3 py-2.5 text-sm transition ${
                  isActive
                    ? 'bg-cyan-400/10 text-white'
                    : 'text-white/50 hover:bg-white/[0.03] hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 transition ${
                      isActive ? 'bg-cyan-300 shadow-[0_0_8px_#38e6ff]' : 'bg-transparent'
                    }`}
                  />
                  <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-300' : ''}`} />
                  <div className="flex-1">
                    <div className="font-medium tracking-wide">{item.label}</div>
                    <div className="text-[10px] text-white/30">{item.desc}</div>
                  </div>
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* 用户区 */}
      <div className="border-t border-cyan-400/15 bg-black/40 p-3">
        <div className="mb-2 rounded border border-cyan-400/15 bg-cyan-400/[0.03] px-3 py-2">
          <div className="flex items-center justify-between text-[10px] tracking-widest text-white/40">
            <span>{t('nav.user')}</span>
            <span className="sf-dot" />
          </div>
          <div className="mt-1 font-mono text-sm text-white">{user?.username || 'guest'}</div>
          <div className="text-[10px] tracking-wider text-cyan-300/60">
            {(user?.roles || []).join(' · ') || t('nav.noRole')}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded px-3 py-2 text-xs tracking-wider text-white/50 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t('common.logout').toUpperCase()}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen">
      {/* 桌面端侧边栏 */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* 移动端抽屉 */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeDrawer}
          />
          <div className="fixed left-0 top-0 z-50 h-full lg:hidden">
            {sidebar}
            <button
              onClick={closeDrawer}
              className="absolute right-[-44px] top-3 rounded border border-cyan-400/30 bg-black/70 p-2 text-cyan-300"
              aria-label={t('common.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* 主内容区 */}
      <div className="flex min-h-screen flex-1 flex-col">
        {/* 移动端顶栏 */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-cyan-400/10 bg-black/70 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded border border-cyan-400/20 px-2.5 py-1.5 text-cyan-300"
            aria-label={t('nav.modules')}
          >
            <Menu className="h-4 w-4" />
          </button>
          <div
            className="text-base font-bold tracking-[0.2em] text-white"
            style={{
              fontFamily: '"STXingkai", "华文行楷", "Xingkai SC", "楷体", "KaiTi", "STKaiti", cursive'
            }}
          >
            {t('common.appName')}
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <ThemeSwitcher variant="minimal" />
            <LangSwitcher variant="minimal" />
          </div>
        </header>

        {/* 移动端底部 Tab 栏(6 个主入口) */}
        <nav className="sf-scroll-x sticky bottom-0 z-30 flex shrink-0 items-stretch gap-0.5 overflow-x-auto border-t border-cyan-400/15 bg-black/85 backdrop-blur-md lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-w-[64px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[10px] tracking-wider transition ${
                    isActive ? 'text-cyan-300' : 'text-white/50'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <main className="relative flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
