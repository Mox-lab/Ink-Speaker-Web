import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { createNovel, getNovel, listNovels, updateNovel } from '../api/index.js';
import { saveCharactersBatch, saveSetting, saveOutline } from '../api/data.js';
import { useI18n } from '../context/I18nContext.jsx';
import { trackEvent } from '../utils/track.js';
import { FUNNEL_EVENTS } from '../constants/funnelEvents.js';

/**
 * 小说创建 / 编辑表单。
 *
 * <p>第 6 阶段(以小说为主体):</p>
 * <ul>
 *   <li>mode="create" → 调 createNovel,成功后跳 /novels/:id/overview</li>
 *   <li>mode="edit"  → 调 getNovel 预填,保存调 updateNovel,成功后返回上一屏</li>
 *   <li>优化清单 #56:移除作者输入框,后端强制使用当前登录用户的昵称(回退用户名)作为 author</li>
 *   <li>create 模式支持从路由 state.template 读取模板预填(冷启动引导)</li>
 * </ul>
 *
 * @param {{ mode: 'create' | 'edit' }} props
 */
export default function NovelEditor({ mode = 'create' }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { novelId } = useParams();

  const isEdit = mode === 'edit';
  const template = location.state?.template;

  const [form, setForm] = useState(() => {
    if (template?.prefilled) {
      return {
        title: template.prefilled.title || '',
        description: template.prefilled.description || '',
        sharedForReference: !!template.prefilled.sharedForReference
      };
    }
    return { title: '', description: '', sharedForReference: false };
  });
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  // 当前用户已拥有的小说标题集合(用户维度唯一校验;协作小说不算)
  const [ownedTitles, setOwnedTitles] = useState(() => new Set());
  // 编辑模式下本小说的原标题(用于排除自身)
  const [originalTitle, setOriginalTitle] = useState('');

  // 加载当前用户拥有的小说标题,供"小说名不可重复"前端即时校验。
  // 仅取本人拥有的(!collaborator),与后端 findByOwnerAndTitle 口径一致;
  // 加载失败不阻塞,后端 CONFLICT(1003) 仍是最终校验。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await listNovels();
        if (cancelled || !Array.isArray(list)) return;
        const titles = new Set(
          list
            .filter((n) => !n.collaborator)
            .map((n) => (n.title || '').trim())
            .filter(Boolean)
        );
        if (!cancelled) setOwnedTitles(titles);
      } catch {
        /* 忽略:校验降级到后端 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // edit 模式预填
  useEffect(() => {
    if (!isEdit || !novelId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getNovel(novelId);
        if (cancelled) return;
        setOriginalTitle((data?.title || '').trim());
        setForm({
          title: data?.title || '',
          description: data?.description || '',
          sharedForReference: !!data?.sharedForReference
        });
      } catch (err) {
        toast.error(t('novel.overview.fetch.failed') + ':' + (err.message || ''));
        navigate(`/novels/${novelId}/overview`, { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, novelId, navigate, t]);

  // 标题是否重复:精确匹配本人已有小说名(创建模式排除项为 null;编辑模式排除自身原标题)
  const isTitleDuplicate =
    !!form.title.trim() &&
    ownedTitles.has(form.title.trim()) &&
    form.title.trim() !== originalTitle;

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t('novel.editor.validate.title.required'));
      return;
    }
    if (isTitleDuplicate) {
      toast.error(t('novel.editor.validate.title.duplicate'));
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        sharedForReference: !!form.sharedForReference
      };
      if (isEdit) {
        await updateNovel(novelId, payload);
        toast.success(t('novel.editor.edit.success'));
        navigate(`/novels/${novelId}/overview`, { replace: true });
      } else {
        const created = await createNovel(payload);
        const newId = created?.id;
        // UX-11 漏斗:创建小说成功
        trackEvent(FUNNEL_EVENTS.CREATE_NOVEL, { title: payload.title }, newId);

        // 应用模板预填:串行写入人物/设定/大纲,失败不阻塞主流程
        let appliedTemplate = false;
        if (newId && template?.prefilled) {
          const { characters = [], worldSettings = [], outline } = template.prefilled;
          try {
            // 人物:一次批量写入(后端仅提供批量端点)
            if (characters.length) {
              await saveCharactersBatch(characters, newId);
            }
            // 世界观设定:逐条写入
            for (const ws of worldSettings) {
              await saveSetting({ ...ws, novelId: newId });
            }
            // 大纲:写入即自动激活(后端 saveOutline 默认 isActive=true)
            if (outline) {
              await saveOutline({ ...outline, novelId: newId });
            }
            appliedTemplate = true;
          } catch (err) {
            // 部分成功:小说主表已建,预填内容失败给出提示但不阻塞跳转
            toast.warn(t('novel.template.apply.partial'));
          }
        }

        // 提示:应用模板成功用模板文案,否则用通用创建文案
        if (appliedTemplate) {
          toast.success(t('novel.template.apply.success'));
        } else {
          toast.success(t('novel.editor.create.success'));
        }

        if (newId) {
          navigate(`/novels/${newId}/overview`, { replace: true });
        } else {
          navigate('/novels', { replace: true });
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || '');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isEdit && novelId) {
      navigate(`/novels/${novelId}/overview`);
    } else {
      navigate('/novels');
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-cyan-300/60">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="sf-page flex min-h-full flex-col">
      <header className="border-b border-cyan-400/10 px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-start gap-4">
          <button
            onClick={handleBack}
            className="mt-1 rounded border border-cyan-400/30 px-2 py-1 text-cyan-300/70 transition hover:bg-cyan-400/10"
            title={t('nav.back')}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="sf-heading">
              {isEdit ? t('novel.editor.edit.title') : t('novel.editor.create.title')}
            </div>
            <p className="mt-2 pl-4 text-xs tracking-wide text-cyan-300/50">
              {isEdit ? t('novel.editor.edit.title') : t('novel.list.subtitle')}
            </p>
            {template && !isEdit && (
              <div className="mt-2 flex items-center gap-1.5 text-xs tracking-wide text-cyan-300/60">
                <Sparkles className="h-3 w-3" />
                {t('novel.template.apply.success')}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-2xl space-y-5 rounded border border-cyan-400/15 bg-black/40 p-4 sm:p-6"
        >
          {/* 标题 */}
          <div>
            <label className="mb-1 block text-xs tracking-widest text-cyan-300/60">
              {t('novel.editor.field.title')}
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder={t('novel.editor.field.title.placeholder')}
              maxLength={200}
              className={`sf-input w-full ${
                isTitleDuplicate ? 'border-red-400/60 focus:border-red-400' : ''
              }`}
              required
              aria-invalid={isTitleDuplicate}
            />
            {isTitleDuplicate && (
              <div className="mt-1 text-xs text-red-300">
                {t('novel.editor.validate.title.duplicate')}
              </div>
            )}
          </div>

          {/* 简介 */}
          <div>
            <label className="mb-1 block text-xs tracking-widest text-cyan-300/60">
              {t('novel.editor.field.description')}
            </label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder={t('novel.editor.field.description.placeholder')}
              rows={4}
              className="sf-input w-full resize-none"
            />
          </div>

          {/* 公开到参考池 */}
          <label className="flex cursor-pointer items-start gap-3 rounded border border-cyan-400/15 p-3 transition hover:border-cyan-300/40">
            <input
              type="checkbox"
              checked={form.sharedForReference}
              onChange={(e) => handleChange('sharedForReference', e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <div className="text-sm text-white/80">
                {t('novel.editor.field.shared')}
              </div>
              <div className="mt-1 text-xs leading-relaxed text-white/40">
                {t('novel.editor.field.shared.hint')}
              </div>
            </div>
          </label>

          {/* 操作 */}
          <div className="flex flex-col-reverse gap-3 border-t border-cyan-400/10 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="w-full rounded border border-white/20 px-4 py-2 text-sm text-white/60 transition hover:bg-white/5 sm:w-auto"
            >
              {t('nav.back')}
            </button>
            <button
              type="submit"
              disabled={submitting || isTitleDuplicate}
              className="flex w-full items-center justify-center gap-2 rounded border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300 transition hover:bg-cyan-400/20 disabled:opacity-50 sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isEdit
                ? t('novel.editor.action.submit.edit')
                : t('novel.editor.action.submit.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

