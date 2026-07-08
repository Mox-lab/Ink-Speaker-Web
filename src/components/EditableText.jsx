import { useEffect, useRef, useState } from 'react';
import { Loader2, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 可编辑文本组件:pre ↔ textarea 切换,内置 dirty 检测、保存按钮、loading 态。
 *
 * @param {object} props
 * @param {string} props.value     当前值(受控)
 * @param {(newValue: string) => Promise<void>} [props.onSave] 保存回调;失败 throw
 * @param {number} [props.rows=12] textarea 行数
 * @param {boolean} [props.readOnly=false] 只读模式(纯展示,不显示编辑按钮)
 * @param {boolean} [props.mono=false] 是否用等宽字体(代码/大纲用 true,正文用 false)
 * @param {string} [props.placeholder] 占位文本
 * @returns {JSX.Element}
 */
export default function EditableText({
  value,
  onSave,
  rows = 12,
  readOnly = false,
  mono = false,
  placeholder
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);
  const taRef = useRef(null);

  // 当外部 value 变化(如生成完成、加载历史),同步到 draft
  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [value, editing]);

  const dirty = draft !== (value || '');

  const startEdit = () => {
    setDraft(value || '');
    setEditing(true);
    setTimeout(() => taRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const save = async () => {
    if (!onSave) return;
    if (!dirty) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
      toast.success(t('common.saved'));
    } catch (err) {
      toast.error(t('common.saveFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="relative">
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={rows}
          className={`sf-input w-full resize-y ${mono ? 'font-mono text-xs' : 'text-sm'} leading-relaxed`}
        />
        <div className="mt-2 flex items-center justify-between">
          <div className="font-mono text-[10px] tracking-widest text-cyan-300/40">
            {dirty ? <span className="text-amber-300">* UNSAVED</span> : <span>CLEAN</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} disabled={saving} className="sf-btn-ghost">
              <X className="h-3 w-3" /> {t('common.cancel')}
            </button>
            <button onClick={save} disabled={saving || !dirty} className="sf-btn">
              {saving ? <Loader2 className="h-3 w-4 animate-spin" /> : <Check className="h-3 w-3" />}
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative">
      <pre
        className={`max-h-[60vh] overflow-auto whitespace-pre-wrap ${mono ? 'font-mono text-xs' : 'font-sans text-sm'} leading-relaxed text-white/85`}
      >
        {value || placeholder || t('common.empty')}
      </pre>
      {!readOnly && (
        <button
          onClick={startEdit}
          className="sf-btn-ghost absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
          title={t('common.edit')}
        >
          <Pencil className="h-3 w-3" /> {t('common.edit')}
        </button>
      )}
    </div>
  );
}

EditableText.propTypes = {
  value: PropTypes.string,
  onSave: PropTypes.func,
  rows: PropTypes.number,
  readOnly: PropTypes.bool,
  mono: PropTypes.bool,
  placeholder: PropTypes.string
};
