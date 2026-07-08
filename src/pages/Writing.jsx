import { useEffect, useRef, useState } from 'react';
import { Send, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { writingWithSkill, listSkills } from '../api/index.js';
import { useI18n } from '../context/I18nContext.jsx';

export default function Writing() {
  const { t } = useI18n();
  const [userId, setUserId] = useState('writer-001');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // P1 新增:Skill 系统
  const [skills, setSkills] = useState([]);
  const [skillId, setSkillId] = useState('');

  useEffect(() => {
    listSkills()
      .then((list) => setSkills(list || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, loading]);

  const send = async () => {
    if (!message.trim() || loading) return;
    const userMsg = message.trim();
    setHistory((h) => [...h, { role: 'user', text: userMsg }]);
    setMessage('');
    setLoading(true);
    try {
      const data = await writingWithSkill(userId, userMsg, skillId || undefined);
      const skillTag = data.skillName ? ` · ${data.skillName}` : '';
      setHistory((h) => [
        ...h,
        { role: 'assistant', text: data.reply, userId: data.userId, skill: skillTag }
      ]);
    } catch (err) {
      toast.error(t('writing.callFailed') + ':' + (err.response?.data?.message || err.message));
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

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-cyan-400/10 px-8 py-5">
        <div className="sf-heading">{t('writing.heading')}</div>
        <p className="mt-2 pl-4 font-mono text-[11px] tracking-wider text-cyan-300/50">
          // WRITE · {t('writing.subheading')}
        </p>
      </header>

      <div className="border-b border-cyan-400/10 px-8 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <span className="font-mono text-[10px] tracking-widest text-cyan-300/60">
            {t('writing.session').toUpperCase()}
          </span>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="sf-input flex-1 max-w-[200px]"
          />
          <span className="font-mono text-[10px] tracking-widest text-cyan-300/60">
            {t('writing.skill').toUpperCase()}
          </span>
          <select
            value={skillId}
            onChange={(e) => setSkillId(e.target.value)}
            className="sf-input max-w-[180px]"
          >
            <option value="">{t('writing.skillAuto')}</option>
            {skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="text-[10px] tracking-wider text-white/30">{t('writing.sessionHint')}</span>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto px-8 py-6">
        {history.length === 0 && (
          <div className="flex h-full items-center justify-center text-white/20">
            <div className="text-center">
              <PenLine className="mx-auto mb-3 h-12 w-12 opacity-40" />
              <div className="font-mono text-xs tracking-widest">// {t('writing.awaiting')}</div>
              <div className="mt-1 text-[10px] text-white/30">{t('writing.awaitingHint')}</div>
            </div>
          </div>
        )}
        <div className="mx-auto max-w-3xl space-y-4">
          {history.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded border px-4 py-3 ${
                  m.role === 'user'
                    ? 'border-cyan-300/40 bg-cyan-300/[0.08] text-white shadow-[0_0_16px_rgba(56,230,255,0.15)]'
                    : 'border-cyan-400/15 bg-black/40 text-white/90'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-mono text-[9px] tracking-widest text-cyan-300/50">
                  <span className="sf-dot" />
                  {m.role === 'user' ? t('writing.author') : t('chat.assistant') + (m.skill || '')}
                </div>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{m.text}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded border border-cyan-400/15 bg-black/40 px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-300/60" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-cyan-400/10 px-8 py-4">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          <div className="flex-1">
            <div className="mb-1 text-[10px] tracking-widest text-cyan-300/60">// {t('chat.message').toUpperCase()}</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder={t('writing.placeholder')}
              className="sf-input w-full resize-none"
            />
          </div>
          <button
            onClick={send}
            disabled={loading || !message.trim()}
            className="sf-btn h-[64px] px-4"
            title={t('common.send')}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        {loading && <div className="sf-loader-bar mx-auto mt-3 max-w-3xl" />}
      </div>
    </div>
  );
}
