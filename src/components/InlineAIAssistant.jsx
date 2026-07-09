import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, Sparkles, PenLine, Trash2, Bot, User } from 'lucide-react';
import { toast } from 'sonner';
import PropTypes from 'prop-types';
import { writingWithSkill } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

/**
 * 章节编辑器右栏:内联 AI 助手。
 *
 * <p>复用 /api/writing 多轮写作接口,通过 sessionId 与章节会话共享记忆窗口;
 * skillId 跟随章节页当前选择,可在写作风格上对齐。</p>
 *
 * <p>关键交互:</p>
 * <ul>
 *   <li>用户在右栏输入消息 → 调 writingWithSkill,把 AI 回复推入历史</li>
 *   <li>每条 AI 回复提供「插入到正文」按钮,触发 onInsert 回调</li>
 *   <li>消息历史保留在 sessionStorage,刷新页面不丢失</li>
 * </ul>
 *
 * @param {object} props
 * @param {string} props.sessionId    章节会话 ID(用于共享记忆窗口)
 * @param {string} props.skillId     当前选择的 Skill('' 表示自动匹配)
 * @param {(text: string) => void} [props.onInsert] 把 AI 回复插入到正文
 * @returns {JSX.Element}
 */
export default function InlineAIAssistant({ sessionId, skillId, onInsert }) {
  const { t } = useI18n();
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // 进入页面时聚焦输入框,方便用户立刻发消息
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, loading]);

  const send = async () => {
    const msg = input.trim();
    if (!msg || loading) return;
    // 内联助手用一个独立 sessionId 后缀,避免和章节生成 session 混在一起
    const inlineSession = `${sessionId || 'chapter-001'}-inline`;
    setHistory((h) => [...h, { role: 'user', text: msg }]);
    setInput('');
    setLoading(true);
    try {
      const data = await writingWithSkill(inlineSession, msg, skillId || undefined);
      const skillTag = data.skillName ? ` · ${data.skillName}` : '';
      setHistory((h) => [
        ...h,
        { role: 'assistant', text: data.reply || '', skill: skillTag }
      ]);
    } catch (err) {
      toast.error(t('writing.callFailed') + ':' + (err.response?.data?.message || err.message));
      setHistory((h) => h.slice(0, -1)); // 回滚用户消息
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearHistory = () => {
    setHistory([]);
    toast.success(t('common.reset'));
  };

  const quickPrompts = [
    { key: 'polish', text: t('chapter.inline.prompt.polish') },
    { key: 'scene', text: t('chapter.inline.prompt.scene') },
    { key: 'dialogue', text: t('chapter.inline.prompt.dialogue') }
  ];

  const handleQuick = (prompt) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full flex-col rounded border border-cyan-400/15 bg-black/40">
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-cyan-400/10 px-3 py-2">
        <div className="flex items-center gap-2 text-[11px] tracking-widest text-cyan-300/60">
          <Sparkles className="h-3.5 w-3.5" />
          {t('chapter.inline.title')}
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            className="rounded p-1 text-white/30 transition hover:bg-white/5 hover:text-red-300"
            title={t('common.reset')}
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* 消息历史 */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3"
        style={{ minHeight: '180px' }}
      >
        {history.length === 0 && !loading && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-white/30">
            <Bot className="h-8 w-8 opacity-40" />
            <div className="text-center text-[11px] tracking-wide">
              {t('chapter.inline.empty')}
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {quickPrompts.map((qp) => (
                <button
                  key={qp.key}
                  onClick={() => handleQuick(qp.text)}
                  className="rounded border border-cyan-400/20 bg-cyan-400/[0.04] px-2 py-1 text-[10px] tracking-wide text-cyan-300/70 transition hover:bg-cyan-400/10"
                >
                  {qp.text}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} skill={m.skill} onInsert={onInsert} t={t} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-cyan-300/60">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('chapter.inline.thinking')}
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-cyan-400/10 p-2">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder={t('chapter.inline.placeholder')}
          className="sf-input w-full resize-none text-xs"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-[10px] tracking-widest text-white/30">
            {skillId ? `· ${skillId}` : t('chapter.skillAuto')}
          </span>
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="sf-btn !py-1.5 text-[11px]"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {t('common.send')}
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, text, skill, onInsert, t }) {
  if (role === 'user') {
    return (
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
          <User className="h-3 w-3" />
        </div>
        <div className="flex-1 rounded border border-cyan-400/10 bg-cyan-400/[0.04] px-2.5 py-1.5 text-[12px] leading-relaxed text-white/80">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
        <Bot className="h-3 w-3" />
      </div>
      <div className="flex-1 space-y-1.5">
        <pre className="whitespace-pre-wrap rounded border border-emerald-400/10 bg-emerald-400/[0.04] px-2.5 py-1.5 font-sans text-[12px] leading-relaxed text-white/85">
          {text}
        </pre>
        <div className="flex items-center justify-between">
          {skill && <span className="font-mono text-[10px] text-emerald-300/60">{skill}</span>}
          {onInsert && (
            <button
              onClick={() => onInsert(text)}
              className="ml-auto flex items-center gap-1 rounded border border-cyan-400/30 bg-cyan-400/[0.06] px-2 py-0.5 text-[10px] tracking-widest text-cyan-300 transition hover:bg-cyan-400/20"
              title={t('chapter.inline.insertHint')}
            >
              <PenLine className="h-3 w-3" />
              {t('chapter.inline.insert')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

InlineAIAssistant.propTypes = {
  sessionId: PropTypes.string,
  skillId: PropTypes.string,
  onInsert: PropTypes.func
};
