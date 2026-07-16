import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Settings,
  Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { useRole } from '../hooks/useRole.js';
import LangSwitcher from '../components/LangSwitcher.jsx';
import Logo from '../components/Logo.jsx';
import ThemeSwitcher from '../components/ThemeSwitcher.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import UsagePanel from '../components/UsagePanel.jsx';
import NicknameModal from '../components/NicknameModal.jsx';

/** 华为新魏字体栈(LOGO 与标记,全站统一)。 */
const XINWEI_FONT = {
  fontFamily: '"Arial", "STXinwei", "华文新魏", "XinWei", "华为新魏", "KaiTi", "STKaiti", sans-serif'
};

/**
 * 判断当前视口是否达到桌面断点(lg, ≥1024px)。
 * 用于区分"桌面端折叠为图标栏"与"移动端抽屉始终完整展开"。
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

/**
 * 应用主框架:右侧可折叠侧栏 + 两级菜单。
 *
 * <p>菜单分两组:对话(单轮对话)/ 创作。「创作」分组常驻展示其首项"我的小说"
 * (/novels,即小说创作入口);进入某本小说的工作台(URL 形如 /novels/:novelId/...)
 * 后,再追加展示人物·设定·大纲·章节·写作等子模块(链接指向带 novelId 的真实路由,
 * 避免点击落回初始页)。</p>
 *
 * <p>侧栏顶部品牌区下方一行以"绿点 + 昵称"形式展示当前用户名(沿用原在线状态点,
 * 靠右);"管理后台"入口以图标形式置于消息通知铃铛旁;
 * 窄栏(隐藏)态以图标竖排还原展开态各区块,底部用 ||| 标记展开。
 * 展开态底部仅保留 token 用量、主题/语言切换与退出,不再提供"收起侧栏"按钮
 * (桌面端默认窄栏,点击主内容区即自动收回)。</p>
 *
 * @author songshan.li (ID: 17099618)
 */
export default function MainLayout() {
  const { logout, user } = useAuth();
  const { t } = useI18n();
  const { isAdmin } = useRole();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // 当前是否处于某本小说的工作台(URL 形如 /novels/:novelId/...),
  // 用于决定"创作"分组(人物/设定/大纲/章节/写作)是否展示,以及其跳转前缀。
  const workspaceMatch = pathname.match(/^\/novels\/(\d+)/);
  const workspaceNovelId = workspaceMatch ? workspaceMatch[1] : null;
  const inWorkspace = workspaceNovelId != null;
  // 侧栏顶部展示名:优先昵称,回退用户名
  const displayName = user?.nickname || user?.username || '';

  const [drawerOpen, setDrawerOpen] = useState(false);
  // 桌面端侧栏展开态:默认收为窄栏,点击主内容其他区域自动收回
  const [open, setOpen] = useState(false);
  const sidebarRef = useRef(null);
  const mainRef = useRef(null);
  // 仅桌面端区分窄栏/完整;移动端抽屉始终完整展开
  const isDesktop = useIsDesktop();
  const railMode = isDesktop && !open;
  // 是否处于移动端抽屉态(桌面端侧栏在右、手机抽屉在左,需镜像并隐藏顶栏已有的切换器)
  const isMobileDrawer = !isDesktop;

  // 展开态下,仅当点击"主内容区(其他功能)"时才收起;侧栏内部(含菜单项)点击不收起
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e) => {
      if (mainRef.current && mainRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  // 两级菜单分组结构。
  // 「创作」分组始终展示其首项"我的小说"(小说创作入口,链接 /novels);
  // 进入某本小说工作台(URL /novels/:novelId/...)后,再追加展示
  // 人物/设定/大纲/章节/写作等子模块(链接指向带 novelId 的真实路由)。
  const creationBase = inWorkspace ? `/novels/${workspaceNovelId}` : null;
  const navGroups = [
    {
      id: 'chat',
      label: t('nav.group.chat'),
      icon: MessageSquare,
      items: [{ to: '/chat', label: t('nav.chat.single'), icon: MessageSquare }]
    },
    {
      id: 'creation',
      label: t('nav.group.creation'),
      icon: PenLine,
      items: [
        // 小说创作入口:始终展示,指向小说列表(/novels)
        { to: '/novels', label: t('nav.novels'), icon: PenLine },
        // 以下子模块仅在进入某本小说工作台后展示
        ...(creationBase
          ? [
              { to: `${creationBase}/character`, label: t('nav.character'), icon: UserCircle2 },
              { to: `${creationBase}/lore`, label: t('nav.lore'), icon: Compass },
              { to: `${creationBase}/outline`, label: t('nav.outline'), icon: ListTree },
              { to: `${creationBase}/chapter`, label: t('nav.chapter'), icon: BookOpen },
              { to: `${creationBase}/writing`, label: t('nav.writing'), icon: PenLine }
            ]
          : [])
      ]
    }
  ];

  // 移动端底部 Tab 的扁平入口(6 个主模块)
  const tabItems = navGroups.flatMap((g) => g.items);

  const toggleSidebar = () => setOpen((prev) => !prev);

  const handleLogout = () => {
    logout();
    toast.success(t('nav.logoutConfirm'));
    navigate('/login', { replace: true });
  };

  // 个人中心:规划中,点击仅作提示(暂未实现页面路由)
  const openProfile = () => {
    toast(t('nav.profileSoon'));
  };

  const closeDrawer = () => setDrawerOpen(false);

  // 窄栏(railMode)图标统一格式:以「我的小说」导航项收起态为准
  // (无边框、居中、px-0 py-2.5、圆角、hover 淡底、次要字色→主色)
  const railIconClass =
    'flex items-center justify-center rounded px-0 py-2.5 text-[var(--sf-text-dim)] transition hover:bg-[rgb(var(--sf-accent-r),var(--sf-accent-g),var(--sf-accent-b),0.05)] hover:text-[var(--sf-text)]';

  /** 渲染单个两级菜单项;isCollapsed 时仅显示图标并启用原生 tooltip。 */
  const renderNavItem = (item, isCollapsed) => {
    const Icon = item.icon;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={closeDrawer}
        title={isCollapsed ? item.label : undefined}
        className={({ isActive }) =>
          `group relative mb-1 flex items-center rounded transition ${
            isCollapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-base'
          } ${
            isActive
              ? 'bg-[rgb(var(--sf-accent-r),var(--sf-accent-g),var(--sf-accent-b),0.1)] text-[var(--sf-heading-color)]'
              : 'text-[var(--sf-text-dim)] hover:bg-[rgb(var(--sf-accent-r),var(--sf-accent-g),var(--sf-accent-b),0.05)] hover:text-[var(--sf-text)]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className={`absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 transition ${
                isActive
                  ? 'bg-[var(--sf-accent)] shadow-[0_0_8px_var(--sf-accent)]'
                  : 'bg-transparent'
              }`}
            />
            <Icon className={`${isCollapsed ? 'h-5 w-5' : 'h-4 w-4'} ${isActive ? 'text-[var(--sf-accent)]' : ''}`} />
            {!isCollapsed && <span className="font-medium tracking-wide">{item.label}</span>}
          </>
        )}
      </NavLink>
    );
  };

  /* ============ 侧边栏主体(桌面端固定右侧 / 移动端抽屉) ============ */
  const sidebar = (
    <aside
      ref={sidebarRef}
      className={`relative flex h-full flex-col border-l border-[var(--sf-border)] bg-[var(--sf-panel)] backdrop-blur-xl transition-[width] duration-300 ${
        railMode ? 'w-14' : 'w-72 lg:w-64'
      }`}
    >
      {/* 窄栏(隐藏)态:所有图标以「我的小说」导航项格式为准,统一无框/居中/h-5 w-5 */}
      {railMode ? (
        <div className="flex h-full flex-col items-center py-3">
          {/* 顶部品牌标记(纯图标,无底色框) */}
          <div className={railIconClass}>
            <Logo size={20} className="text-[var(--sf-accent)]" />
          </div>

          {/* 通知 + 管理 */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <NotificationBell size="h-5 w-5" btnClass={railIconClass} padding="" />
            {isAdmin && (
              <NavLink
                to="/admin"
                title={t('nav.admin')}
                aria-label={t('nav.admin')}
                className={railIconClass}
              >
                <Settings className="h-5 w-5" />
              </NavLink>
            )}
          </div>

          {/* 菜单图标(与展开态导航一一对应;创作分组仅在进入小说后显示) */}
          <nav className="mt-2 flex flex-1 flex-col items-center gap-1 overflow-y-auto">
            {navGroups.map((group, gi) => (
              <div key={group.id} className="flex flex-col items-center">
                {gi > 0 && <span className="my-1.5 h-px w-5 bg-[var(--sf-border)]" />}
                {group.items.map((item) => renderNavItem(item, true))}
              </div>
            ))}
          </nav>

          {/* 底部:token 用量 + 主题/语言 + 展开(|||) + 退出(统一格式) */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <button
              onClick={toggleSidebar}
              title={t('usage.title')}
              aria-label={t('usage.title')}
              className={railIconClass}
            >
              <Activity className="h-5 w-5" />
            </button>
            <ThemeSwitcher variant="minimal" size="h-5 w-5" btnClass={railIconClass} padding="" />
            <LangSwitcher variant="minimal" size="h-5 w-5" btnClass={railIconClass} padding="" />
            <button
              onClick={toggleSidebar}
              title={t('nav.sidebar.expand')}
              aria-label={t('nav.sidebar.expand')}
              className={railIconClass}
            >
              {/* ||| 展开标记 */}
              <span className="flex items-center gap-[3px] text-[var(--sf-accent)]">
                <span className="h-5 w-[2px] rounded bg-current" />
                <span className="h-5 w-[2px] rounded bg-current" />
                <span className="h-5 w-[2px] rounded bg-current" />
              </span>
            </button>
            <button
              onClick={handleLogout}
              title={t('common.logout')}
              aria-label={t('common.logout')}
              className={`${railIconClass} hover:!text-red-300`}
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 顶部品牌区:border-b 与主内容区 header 横线水平对齐(full-bleed) */}
          <div className="border-b border-[var(--sf-border)]">
            {!isMobileDrawer ? (
              /* 桌面端:Logo+名(左) / 通知+管理(右);昵称独立一行靠右 */
              <>
                <div className="flex items-center justify-between gap-3 px-4 py-6">
                  <div className="flex min-w-0 items-center gap-3">
                    <Logo size={28} className="shrink-0 text-[var(--sf-accent)]" />
                    <div
                      className="truncate text-base font-bold tracking-[0.15em] text-[var(--sf-heading-color)]"
                      style={XINWEI_FONT}
                    >
                      {t('common.appName')}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <NotificationBell />
                    {isAdmin && (
                      <NavLink
                        to="/admin"
                        title={t('nav.admin')}
                        aria-label={t('nav.admin')}
                        className="sf-btn-ghost !px-2 !py-1 flex items-center justify-center text-[var(--sf-text-dim)] transition hover:text-[var(--sf-accent)]"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </NavLink>
                    )}
                  </div>
                </div>
                {/* 昵称:绿点 + 昵称,靠右(沿用之前的绿点状态形式) */}
                {displayName && (
                  <div className="flex justify-end px-4 pb-3">
                    <button
                      type="button"
                      onClick={openProfile}
                      title={t('nav.profile')}
                      className="flex max-w-[180px] items-center gap-1.5 text-[15px] tracking-wide text-[var(--sf-text-dim)] transition hover:text-[var(--sf-text)]"
                    >
                      <span className="sf-dot shrink-0" />
                      <span className="truncate">{displayName}</span>
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* 手机端:图标(Logo)靠左;昵称 + 管理 置于同行最右侧(管理在最右);
                 通知已由顶栏提供,此处不显示 */
              <div className="flex items-center justify-between gap-3 px-4 py-6">
                <div className="flex min-w-0 items-center gap-3">
                  <Logo size={28} className="shrink-0 text-[var(--sf-accent)]" />
                  <div
                    className="truncate text-base font-bold tracking-[0.15em] text-[var(--sf-heading-color)]"
                    style={XINWEI_FONT}
                  >
                    {t('common.appName')}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {displayName && (
                    <button
                      type="button"
                      onClick={openProfile}
                      title={t('nav.profile')}
                      className="flex max-w-[130px] items-center gap-1.5 text-[15px] tracking-wide text-[var(--sf-text-dim)] transition hover:text-[var(--sf-text)]"
                    >
                      <span className="sf-dot shrink-0" />
                      <span className="truncate">{displayName}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 两级导航 */}
          <nav className="flex-1 overflow-y-auto px-3 py-3">
            {navGroups.map((group) => (
              <div key={group.id} className="mb-3">
                <div className="mb-1 flex items-center gap-2 px-2 text-[13px] tracking-[0.2em] text-[var(--sf-text-dim)]">
                  <span className="h-px flex-1 bg-[var(--sf-border)]" />
                  <span>{group.label}</span>
                  <span className="h-px flex-1 bg-[var(--sf-border)]" />
                </div>
                {group.items.map((item) => renderNavItem(item, false))}
              </div>
            ))}
          </nav>

          {/* 底部:token 用量 + (桌面:主题/语言 + 退出) / (手机:退出居中) */}
          <div className="border-t border-[var(--sf-border)] bg-[rgb(var(--sf-accent-r),var(--sf-accent-g),var(--sf-accent-b),0.04)]">
            <UsagePanel variant="sidebar" />
            {/* 亮眼横线:分隔 token 用量与下方操作区 */}
            <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[var(--sf-accent)] to-transparent shadow-[0_0_8px_var(--sf-accent)]" />
            {!isMobileDrawer ? (
              <div className="flex items-center justify-between gap-2 p-3">
                {/* 左下:主题 / 语言切换(桌面端显示) */}
                <div className="flex items-center gap-1.5">
                  <ThemeSwitcher variant="minimal" />
                  <LangSwitcher variant="minimal" />
                </div>
                {/* 右下:退出登录 */}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded px-3 py-2 text-base tracking-wider text-[var(--sf-text-dim)] transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  {t('common.logout').toUpperCase()}
                </button>
              </div>
            ) : (
              /* 手机端:退出登录置于侧栏最下方居中 */
              <div className="flex justify-center p-3">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 rounded px-3 py-2 text-base tracking-wider text-[var(--sf-text-dim)] transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                  {t('common.logout').toUpperCase()}
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </aside>
  );

  return (
    // 应用外壳:固定为动态视口高度(h-dvh 适配移动端浏览器地址栏),
    // 内部用 flex 让主内容区自动填充"视口 - 移动端顶栏/底栏"的剩余空间,
    // 避免全高页面(对话/写作/设定)在移动端溢出、输入框被底栏遮挡。
    <div className="flex h-dvh overflow-hidden">
      {/* 昵称引导弹窗:已登录但昵称为空时强制展示(注册后/登录后进入页面前) */}
      <NicknameModal />
      {/* 主内容区 */}
      <div className="flex h-full min-w-0 flex-1 flex-col">
        {/* 移动端顶栏:左[菜单][Logo][名称] / 右[通知 主题 语言],横线改用主题变量 */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-[var(--sf-border)] bg-[var(--sf-bg)]/80 px-3 py-3 backdrop-blur-md lg:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 rounded border border-[var(--sf-border)] px-2 py-1.5 text-[var(--sf-accent)]"
              aria-label={t('nav.modules')}
            >
              <Menu className="h-4 w-4" />
            </button>
            <Logo size={22} className="shrink-0 text-[var(--sf-accent)]" />
            <div
              className="truncate text-lg font-bold tracking-[0.2em] text-[var(--sf-heading-color)]"
              style={XINWEI_FONT}
            >
              {t('common.appName')}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <NotificationBell />
            <ThemeSwitcher variant="minimal" />
            <LangSwitcher variant="minimal" />
            {isAdmin && (
              <NavLink
                to="/admin"
                title={t('nav.admin')}
                aria-label={t('nav.admin')}
                className="sf-btn-ghost !px-2 !py-1 flex items-center justify-center text-[var(--sf-text-dim)] transition hover:text-[var(--sf-accent)]"
              >
                <Settings className="h-4 w-4" />
              </NavLink>
            )}
          </div>
        </header>

        {/* 移动端底部 Tab 栏 */}
        <nav className="sf-scroll-x sticky bottom-0 z-30 flex shrink-0 items-stretch gap-0.5 overflow-x-auto border-t border-cyan-400/15 bg-black/85 backdrop-blur-md lg:hidden">
          {tabItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex min-w-[64px] flex-1 flex-col items-center gap-0.5 px-2 py-2 text-[13px] tracking-wider transition ${
                    isActive ? 'text-cyan-300' : 'text-white/50'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <main ref={mainRef} className="relative min-h-0 flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* 桌面端侧边栏(右侧) */}
      <div className="hidden lg:block">{sidebar}</div>

      {/* 移动端抽屉(左侧滑出) */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeDrawer}
          />
          <div className="fixed left-0 top-0 z-50 h-full border-r border-[var(--sf-border)] lg:hidden">
            {sidebar}
            <button
              onClick={closeDrawer}
              className="absolute right-[-44px] top-3 rounded border border-[var(--sf-border)] bg-[var(--sf-bg)] p-2 text-[var(--sf-accent)]"
              aria-label={t('common.cancel')}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
