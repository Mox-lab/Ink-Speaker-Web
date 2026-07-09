import { useMemo, useState } from 'react';
import { Check, Eye, Sparkles } from 'lucide-react';
import { useI18n } from '../context/I18nContext.jsx';
import { NOVEL_TEMPLATES, TEMPLATE_GENRES } from '../constants/novelTemplates.js';

/**
 * 小说模板选择器(冷启动引导用)。
 *
 * <p>第 6 阶段 UX-01:在 NovelList 空状态下展开模板库,选定后调用
 * onPick(template),由父组件把 prefilled 字段透传到 NovelEditor。</p>
 *
 * @param {{ onPick: (template) => void }} props
 */
export default function NovelTemplatePicker({ onPick }) {
  const { t } = useI18n();
  const [genre, setGenre] = useState('all');
  const [previewing, setPreviewing] = useState(null);

  const list = useMemo(() => {
    if (genre === 'all') return NOVEL_TEMPLATES;
    return NOVEL_TEMPLATES.filter((tpl) => tpl.genre === genre);
  }, [genre]);

  return (
    <div className="w-full">
      {/* 分类筛选 */}
      <div className="sf-scroll-x mb-4 flex items-center gap-1.5 overflow-x-auto pb-1">
        {TEMPLATE_GENRES.map((g) => {
          const active = genre === g.key;
          return (
            <button
              key={g.key}
              onClick={() => setGenre(g.key)}
              className={`shrink-0 rounded border px-3 py-1.5 text-[11px] tracking-wider transition ${
                active
                  ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-300'
                  : 'border-white/10 text-white/40 hover:text-white/70'
              }`}
            >
              {t(g.labelKey)}
            </button>
          );
        })}
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((tpl) => {
          const isPreviewing = previewing?.id === tpl.id;
          return (
            <div
              key={tpl.id}
              className="sf-scan group relative flex flex-col rounded border border-cyan-400/15 bg-black/40 p-4 transition hover:border-cyan-300/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded border border-cyan-300/30 bg-cyan-300/10 px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-cyan-300">
                  {t(`novel.template.genre.${tpl.genre}`)}
                </span>
                <button
                  onClick={() => setPreviewing(isPreviewing ? null : tpl)}
                  className="rounded p-1 text-white/30 transition hover:bg-cyan-400/10 hover:text-cyan-300"
                  title={t('novel.template.preview')}
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
              </div>

              <div
                className="mb-2 text-base font-bold leading-tight text-white"
                style={{
                  fontFamily:
                    '"STXingkai", "华文行楷", "Xingkai SC", "楷体", "KaiTi", "STKaiti", cursive'
                }}
              >
                {t(`novel.template.${tpl.id}.title`)}
              </div>

              <div className="mb-3 line-clamp-3 flex-1 text-[11px] leading-relaxed text-white/60">
                {tpl.prefilled.description}
              </div>

              <div className="mb-3 flex flex-wrap gap-1">
                {tpl.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-white/40"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => onPick(tpl)}
                className="flex items-center justify-center gap-1.5 rounded border border-cyan-400/40 bg-cyan-400/10 px-3 py-1.5 text-[11px] tracking-wider text-cyan-300 transition hover:bg-cyan-400/20"
              >
                <Sparkles className="h-3 w-3" />
                {t('novel.template.use')}
              </button>

              {isPreviewing && (
                <div className="mt-3 rounded border border-cyan-400/20 bg-black/60 p-3">
                  <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">
                    {t('novel.template.field.prefilled')}
                  </div>
                  <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-white/70">
                    {JSON.stringify(tpl.prefilled, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-end gap-1 text-[10px] tracking-widest text-cyan-300/40">
        <Check className="h-3 w-3" />
        {NOVEL_TEMPLATES.length} templates
      </div>
    </div>
  );
}
