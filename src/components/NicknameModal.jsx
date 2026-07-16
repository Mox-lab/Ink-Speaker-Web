import { useState } from 'react';
import { Loader2, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useI18n } from '../context/I18nContext.jsx';
import { updateNickname } from '../api/index.js';

/**
 * 昵称引导弹窗。
 * <p>在已登录但昵称为空时强制展示(注册后、进入页面前),
 * 用户必须填写昵称方可进入应用;昵称将作为小说作者名展示。
 * 不可通过点击遮罩或关闭按钮跳过。</p>
 */
export default function NicknameModal() {
  const { user, applyAuthData } = useAuth();
  const { t } = useI18n();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 已设置昵称则不展示(必须在所有 hook 之后判断,保证 hook 调用顺序稳定)
  if (!user || user.nickname) {
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nick = value.trim();
    if (!nick) {
      setError(t('nickname.empty'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      // 成功后后端重新签发 token(携带最新昵称),前端同步 user,nickname 非空后弹窗自动消失
      const data = await updateNickname(nick);
      applyAuthData(data);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || t('login.failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="sf-panel-hud sf-corners w-full max-w-sm p-8">
        {/* 标题区 */}
        <div className="mb-6 flex items-center gap-3">
          <UserCircle className="h-5 w-5 text-cyan-300" />
          <span className="font-mono text-xs tracking-[0.3em] text-cyan-300/70">
            SET NICKNAME
          </span>
        </div>

        <h2 className="mb-2 text-lg font-bold text-[var(--sf-heading-color)]">
          {t('nickname.modal.title')}
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-white/50">
          {t('nickname.modal.desc')}
        </p>

        {/* 昵称输入 */}
        <div className="mb-2">
          <label className="mb-2 flex items-center gap-2 font-mono text-[10px] tracking-[0.2em] text-cyan-300/50">
            <span className="h-px w-3 bg-cyan-300/40" />
            {t('common.nickname').toUpperCase()}
          </label>
          <div className="sf-input-group">
            <UserCircle className="h-4 w-4" />
            <input
              type="text"
              value={value}
              autoFocus
              onChange={(e) => { setValue(e.target.value); if (error) setError(''); }}
              className="sf-input w-full"
              placeholder={t('nickname.placeholder')}
              minLength={2}
              maxLength={20}
            />
          </div>
          <div className="mt-1.5 flex justify-end font-mono text-[10px] tracking-widest text-cyan-300/40">
            {value.length}/20
          </div>
        </div>

        {/* 错误内联提示 */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs leading-relaxed text-red-400">
            <span className="mt-[3px] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* 提交按钮 */}
        <button
          type="submit"
          disabled={loading}
          className="sf-btn w-full justify-center py-3 text-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCircle className="h-4 w-4" />}
          {loading ? t('common.loggingIn') : t('nickname.submit')}
        </button>
      </form>
    </div>
  );
}
