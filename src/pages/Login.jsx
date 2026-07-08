import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2, User, Lock, Fingerprint, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import Aurora from '@bits/Backgrounds/Aurora/Aurora.jsx';
import LangSwitcher from '../components/LangSwitcher.jsx';
import ThemeSwitcher from '../components/ThemeSwitcher.jsx';

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t('login.emptyError'));
      return;
    }
    setLoading(true);
    try {
      await login(username, password);
      toast.success(t('login.success'));
      const to = location.state?.from || '/';
      navigate(to, { replace: true });
    } catch (err) {
      toast.error(t('login.failed') + ':' + (err.response?.data?.message || err.message));
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
            INK-SPEAKER · SYS v2.0
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

          {/* 行楷大标题 */}
          <h1 className="sf-ink-title sf-animate-in text-[5.5rem] leading-none">
            {t('login.title')}
          </h1>

          {/* 英文副标题 */}
          <div className="sf-animate-in-delay-1 mt-4 font-mono text-sm tracking-[0.5em] text-cyan-300/40">
            INK · SPEAKER
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
          © 2026 INK-SPEAKER · ALL RIGHTS RESERVED
        </div>
      </div>

      {/* ============ 右侧登录表单区 ============ */}
      <div className="relative flex flex-1 flex-col">
        {/* 顶部栏:移动端标题 + 语言切换 */}
        <div className="flex items-center justify-between px-6 py-5 sm:px-10">
          {/* 移动端显示标题 */}
          <h1 className="sf-ink-title text-3xl lg:hidden">
            {t('login.title')}
          </h1>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeSwitcher variant="minimal" />
            <LangSwitcher variant="ghost" />
          </div>
        </div>

        {/* 居中登录卡片 */}
        <div className="flex flex-1 items-center justify-center px-6 pb-16 sm:px-10">
          <div className="w-full max-w-sm">
            {/* 卡片顶部标识 */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-cyan-300" />
                <span className="font-mono text-xs tracking-[0.3em] text-cyan-300/70">
                  IDENTITY VERIFICATION
                </span>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-cyan-300/50">
                <span className="sf-dot" />
                AUTH
              </span>
            </div>

            {/* 登录表单 */}
            <form onSubmit={handleSubmit} className="sf-panel-hud sf-corners p-8">
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
                    onChange={(e) => setUsername(e.target.value)}
                    className="sf-input w-full"
                    placeholder={t('login.usernamePlaceholder')}
                    autoComplete="username"
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
                    onChange={(e) => setPassword(e.target.value)}
                    className="sf-input w-full"
                    placeholder={t('login.passwordPlaceholder')}
                    autoComplete="current-password"
                  />
                </div>
              </div>

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

              {/* 底部提示 */}
              <div className="mt-5 text-center font-mono text-[10px] tracking-widest text-white/20">
                // {t('login.hint') || '默认账号 admin / admin123'}
              </div>
            </form>

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
