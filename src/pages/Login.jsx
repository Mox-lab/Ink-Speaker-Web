import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, User, Lock, Fingerprint, Terminal, UserPlus, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import Aurora from '@bits/Backgrounds/Aurora/Aurora.jsx';
import LangSwitcher from '../components/LangSwitcher.jsx';
import ThemeSwitcher from '../components/ThemeSwitcher.jsx';
import Logo from '../components/Logo.jsx';
import { register as apiRegister } from '../api/index.js';
import { trackEvent } from '../utils/track.js';
import { FUNNEL_EVENTS } from '../constants/funnelEvents.js';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // 登录错误内联提示(标红显示在账号密码区旁,替代弹窗)
  const [loginError, setLoginError] = useState('');

  // 注册模式 state
  const [mode, setMode] = useState('login');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  // 注册错误内联提示
  const [regError, setRegError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setLoginError(t('login.emptyError'));
      return;
    }
    setLoginError('');
    setLoading(true);
    try {
      await login(username, password);
      // UX-11 漏斗:登录成功
      trackEvent(FUNNEL_EVENTS.LOGIN, { username });
      const to = location.state?.from || '/';
      navigate(to, { replace: true });
    } catch (err) {
      // 登录失败(密码错误/账号不存在等):内联标红展示后端返回的具体原因,不再弹窗
      setLoginError(err?.response?.data?.message || err?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regConfirm) {
      setRegError(t('login.emptyError'));
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError(t('login.register.passwordMismatch'));
      return;
    }
    setRegError('');
    setLoading(true);
    try {
      await apiRegister(regUsername, regPassword, regConfirm);
      // 注册接口已签发 token,但 AuthContext.user 需同步,这里直接走 login 流程更新
      await login(regUsername, regPassword);
      toast.success(t('login.register.success'));
      trackEvent(FUNNEL_EVENTS.LOGIN, { username: regUsername });
      const to = location.state?.from || '/';
      navigate(to, { replace: true });
    } catch (err) {
      // 注册失败(账号已存在/参数非法等):内联标红展示,不再弹窗
      setRegError(err?.response?.data?.message || err?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* 极光背景(全屏底层) */}
      <div className="absolute inset-0 -z-10">
        <Aurora
          colorStops={['#38e6ff', '#4d7cff', '#a06cff']}
          speed={0.3}
          amplitude={1.2}
        />
      </div>

      {/* ============ 左侧品牌展示区 ============ */}
      <div className="sf-login-brand hidden w-[44%] min-h-screen flex-col justify-between p-10 lg:flex">
        {/* 顶部:LOGO + 系统标识 */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-[0.3em] text-cyan-300/50">
            <Terminal className="h-3.5 w-3.5" />
            INK REALM · SYS v2.0
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-cyan-300/40">
            <span className="sf-dot" />
            ONLINE
          </div>
        </div>

        {/* 中部:主标题 + 副标题 + 装饰 */}
        <div className="relative z-10">
          {/* 装饰竖光带 */}
          <span className="sf-brand-beam" style={{ left: '0' }} />
          <span className="sf-brand-beam sf-flicker" style={{ left: '6px' }} />

          {/* 品牌标题区:系统 Logo 在左,标题文本在右 */}
          <div className="sf-animate-in flex items-center gap-5">
            <Logo size={64} className="text-[var(--sf-accent)]" />
            <div className="flex flex-col">
              <h1 className="sf-ink-title text-[5.5rem] leading-none">
                {t('login.title')}
              </h1>
              {/* 英文副标题 */}
              <div className="font-mono text-sm tracking-[0.5em] text-cyan-300/40">
                INK REALM
              </div>
            </div>
          </div>

          {/* 分割线 */}
          <div className="sf-animate-in-delay-1 mt-6 h-px w-32 bg-gradient-to-r from-cyan-400/40 to-transparent" />

          {/* 描述文案 */}
          <p className="sf-animate-in-delay-2 mt-6 max-w-sm text-sm leading-relaxed text-white/40">
            {t('login.brandDesc') || 'AI 驱动的小说创作引擎 · 让灵感化为墨迹，让故事自动生长'}
          </p>

          {/* HUD 数据装饰条 */}
          <div className="sf-animate-in-delay-2 mt-10 flex flex-col gap-1.5 font-mono text-[10px] tracking-widest text-cyan-300/25">
            <div className="flex items-center gap-3">
              <span className="text-cyan-300/50">[CORE]</span>
              <span>NEURAL WRITING ENGINE ...... READY</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-cyan-300/50">[MEM ]</span>
              <span>LONG-TERM MEMORY ......... ACTIVE</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-cyan-300/50">[NET ]</span>
              <span>SECURE CHANNEL ........... ESTABLISHED</span>
            </div>
          </div>
        </div>

        {/* 底部:版权信息 */}
        <div className="relative z-10 font-mono text-[10px] tracking-widest text-white/20">
          © 2026 INK REALM · ALL RIGHTS RESERVED
        </div>
      </div>

      {/* ============ 右侧登录表单区 ============ */}
      <div className="relative flex flex-1 flex-col">
        {/* 顶部栏:常驻 Logo + 移动端标题 + 主题/语言切换 */}
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          {/* 左侧:品牌标识(Logo + 名称)常驻显示,任意屏幕尺寸清晰可见
              - 图标叠加主题强调色发光光晕,在深色极光背景上更清晰且契合主题
              - 名称强制亮色(!text-white),避免 stripe 主题深色标题在极光背景上看不清 */}
          <div className="flex items-center gap-3">
            <span
              className="flex shrink-0"
              style={{
                filter:
                  'drop-shadow(0 0 12px rgba(var(--sf-accent-r), var(--sf-accent-g), var(--sf-accent-b), 0.55))',
              }}
            >
              <Logo size={38} className="text-[var(--sf-accent)]" />
            </span>
            <h1 className="sf-ink-title text-2xl leading-none !text-white">
              {t('login.title')}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeSwitcher variant="minimal" />
            <LangSwitcher variant="minimal" />
          </div>
        </div>

        {/* 居中登录卡片 */}
        <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="w-full max-w-sm">
            {/* 卡片顶部标识 */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {mode === 'register' ? (
                  <UserPlus className="h-4 w-4 text-cyan-300" />
                ) : (
                  <Fingerprint className="h-4 w-4 text-cyan-300" />
                )}
                <span className="font-mono text-xs tracking-[0.3em] text-cyan-300/70">
                  {mode === 'register' ? 'ACCOUNT REGISTER' : 'IDENTITY VERIFICATION'}
                </span>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-cyan-300/50">
                <span className="sf-dot" />
                {mode === 'register' ? 'REG' : 'AUTH'}
              </span>
            </div>

            {mode === 'login' ? (
              /* 登录表单 */
              <form onSubmit={handleSubmit} className="sf-panel-hud sf-corners p-8" autoComplete="off">
                {/* 账号 */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan-300/50">
                    <span className="h-px w-3 bg-cyan-300/40" />
                    {t('common.account').toUpperCase()}
                  </label>
                  <div className="sf-input-group">
                    <User className="h-4 w-4" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => { setUsername(e.target.value); if (loginError) setLoginError(''); }}
                      className="sf-input w-full"
                      placeholder={t('login.usernamePlaceholder')}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div className="mb-7">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan-300/50">
                    <span className="h-px w-3 bg-cyan-300/40" />
                    {t('common.password').toUpperCase()}
                  </label>
                  <div className="sf-input-group">
                    <Lock className="h-4 w-4" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (loginError) setLoginError(''); }}
                      className="sf-input w-full"
                      placeholder={t('login.passwordPlaceholder')}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                {/* 登录错误内联提示(标红,替代弹窗) */}
                {loginError && (
                  <div className="mb-5 flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-400">
                    <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    <span>{loginError}</span>
                  </div>
                )}

                {/* 登录按钮 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="sf-btn w-full justify-center py-3 text-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                  {loading ? t('common.loggingIn') : t('common.login')}
                </button>
                {loading && <div className="sf-loader-bar mt-4" />}

                {/* 切换到注册 */}
                <div className="mt-5 text-center text-[11px] tracking-wide text-white/40">
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setLoginError(''); setRegError(''); }}
                    className="text-cyan-300/70 underline-offset-2 transition hover:text-cyan-300 hover:underline"
                  >
                    {t('login.toRegister')}
                  </button>
                </div>
              </form>
            ) : (
              /* 注册表单 */
              <form onSubmit={handleRegister} className="sf-panel-hud sf-corners p-8">
                {/* 账号 */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan-300/50">
                    <span className="h-px w-3 bg-cyan-300/40" />
                    {t('common.account').toUpperCase()}
                  </label>
                  <div className="sf-input-group">
                    <User className="h-4 w-4" />
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => { setRegUsername(e.target.value); if (regError) setRegError(''); }}
                      className="sf-input w-full"
                      placeholder={t('login.usernamePlaceholder')}
                      autoComplete="username"
                      minLength={3}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* 密码 */}
                <div className="mb-5">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan-300/50">
                    <span className="h-px w-3 bg-cyan-300/40" />
                    {t('common.password').toUpperCase()}
                  </label>
                  <div className="sf-input-group">
                    <Lock className="h-4 w-4" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => { setRegPassword(e.target.value); if (regError) setRegError(''); }}
                      className="sf-input w-full"
                      placeholder={t('login.passwordPlaceholder')}
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* 确认密码 */}
                <div className="mb-7">
                  <label className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan-300/50">
                    <span className="h-px w-3 bg-cyan-300/40" />
                    {t('login.register.confirmPasswordPlaceholder').toUpperCase()}
                  </label>
                  <div className="sf-input-group">
                    <Lock className="h-4 w-4" />
                    <input
                      type="password"
                      value={regConfirm}
                      onChange={(e) => { setRegConfirm(e.target.value); if (regError) setRegError(''); }}
                      className="sf-input w-full"
                      placeholder={t('login.register.confirmPasswordPlaceholder')}
                      autoComplete="new-password"
                      minLength={6}
                      maxLength={50}
                    />
                  </div>
                </div>

                {/* 注册错误内联提示(标红,替代弹窗) */}
                {regError && (
                  <div className="mb-5 flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-400">
                    <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                    <span>{regError}</span>
                  </div>
                )}

                {/* 注册按钮 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="sf-btn w-full justify-center py-3 text-sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  {loading ? t('common.loggingIn') : t('login.register.submit')}
                </button>
                {loading && <div className="sf-loader-bar mt-4" />}

                {/* 切换回登录 */}
                <div className="mt-5 text-center text-[11px] tracking-wide text-white/40">
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setLoginError(''); setRegError(''); }}
                    className="flex items-center justify-center gap-1 text-cyan-300/70 underline-offset-2 transition hover:text-cyan-300 hover:underline"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    {t('login.toLogin')}
                  </button>
                </div>
              </form>
            )}

            {/* 卡片下方装饰 */}
            <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[10px] tracking-[0.3em] text-cyan-300/20">
              <span className="h-px w-8 bg-cyan-300/20" />
              SECURE CONNECTION
              <span className="h-px w-8 bg-cyan-300/20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
