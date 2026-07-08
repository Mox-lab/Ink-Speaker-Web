import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 保存按钮:统一的 loading / disabled / 成功 toast。
 *
 * @param {object} props
 * @param {() => Promise<void>} [props.onClick] 点击保存回调;失败 throw
 * @param {boolean} [props.disabled=false] 禁用
 * @param {string} [props.label] 按钮文案(默认调用方传入或「保存」)
 * @param {'primary'|'ghost'} [props.variant='primary'] 视觉风格
 * @returns {JSX.Element}
 */
export default function SaveButton({
  onClick,
  disabled = false,
  label,
  variant = 'primary'
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const handle = async () => {
    if (saving || disabled) return;
    setSaving(true);
    try {
      await onClick();
      toast.success(t('common.saved'));
    } catch (err) {
      toast.error(t('common.saveFailed') + ':' + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  const cls = variant === 'ghost' ? 'sf-btn-ghost' : 'sf-btn';
  const text = label ?? t('common.save');

  return (
    <button onClick={handle} disabled={saving || disabled} className={cls}>
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
      {saving ? t('common.saving') : text}
    </button>
  );
}

SaveButton.propTypes = {
  onClick: PropTypes.func,
  disabled: PropTypes.bool,
  label: PropTypes.string,
  variant: PropTypes.oneOf(['primary', 'ghost'])
};
